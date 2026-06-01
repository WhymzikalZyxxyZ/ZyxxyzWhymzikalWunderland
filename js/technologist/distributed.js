// ── Constants ─────────────────────────────────────────────────────────────────
var CANVAS_W         = 700;
var CANVAS_H         = 460;
var NODE_R           = 28;
var MSG_SPEED        = 160;    // px/sec at 1× speed
var HEARTBEAT_MS     = 1400;
var ELECTION_MIN_MS  = 2800;
var ELECTION_MAX_MS  = 5600;

// ── Simulation state ──────────────────────────────────────────────────────────
var nodes       = [];
var msgs        = [];
var partX       = null;   // x-coordinate of partition line (null = no partition)
var simSpeed    = 1;
var nodeSeq     = 0;
var rafId       = null;
var lastTs      = null;
var dragging    = false;

var canvas  = document.getElementById('ds-canvas');
var ctx     = canvas.getContext('2d');
var logEl   = document.getElementById('ds-log');

// ── Helpers ───────────────────────────────────────────────────────────────────
function randRange(lo, hi) { return lo + Math.random() * (hi - lo); }
function randTimeout()     { return randRange(ELECTION_MIN_MS, ELECTION_MAX_MS); }

function addLog(text, cls) {
    var div = document.createElement('div');
    div.className = cls || 'log-msg';
    div.textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
}

function liveNodes() { return nodes.filter(function(n) { return n.state !== 'dead'; }); }

function canTalk(a, b) {
    if (a.state === 'dead' || b.state === 'dead') return false;
    if (partX === null) return true;
    return (a.x < partX) === (b.x < partX);
}

// ── Node factory ──────────────────────────────────────────────────────────────
function makeNode(x, y) {
    var id = nodeSeq++;
    return {
        id:             id,
        x:              x,
        y:              y,
        state:          'follower',
        term:           0,
        votedFor:       null,
        votes:          0,
        lamport:        0,
        electionTimer:  randTimeout(),
        heartbeatTimer: 0,
        label:          'N' + id,
    };
}

// ── Message helpers ───────────────────────────────────────────────────────────
var MSG_COLORS = {
    heartbeat:   '#f4a261',
    'vote-req':  '#ffe066',
    'vote-grant':'#4caf50',
};

function sendMsg(fromId, toId, type) {
    var from = nodes[fromId];
    var to   = nodes[toId];
    if (!from || !to) return;
    if (!canTalk(from, to)) return;
    from.lamport++;
    msgs.push({ from: fromId, to: toId, type: type, term: from.term, lamport: from.lamport, t: 0 });
}

// ── Raft logic ────────────────────────────────────────────────────────────────
function startElection(node) {
    node.state         = 'candidate';
    node.term++;
    node.votes         = 1;
    node.votedFor      = node.id;
    node.electionTimer = randTimeout();
    addLog(node.label + ' starts election  term=' + node.term, 'log-election');
    nodes.forEach(function(other) {
        if (other.id !== node.id) sendMsg(node.id, other.id, 'vote-req');
    });
}

function becomeLeader(node) {
    node.state         = 'leader';
    node.heartbeatTimer = 0;
    addLog(node.label + ' elected leader  term=' + node.term, 'log-leader');
    nodes.forEach(function(other) {
        if (other.id !== node.id) sendMsg(node.id, other.id, 'heartbeat');
    });
    // Demote any stale leaders in same partition
    nodes.forEach(function(other) {
        if (other.id !== node.id && other.state === 'leader' && canTalk(node, other)) {
            other.state = 'follower';
        }
    });
}

function deliverMsg(msg) {
    var sender   = nodes[msg.from];
    var receiver = nodes[msg.to];
    if (!sender || !receiver || receiver.state === 'dead') return;

    // Lamport clock on receive
    receiver.lamport = Math.max(receiver.lamport, msg.lamport) + 1;

    if (msg.type === 'heartbeat') {
        if (msg.term >= receiver.term) {
            receiver.term          = msg.term;
            receiver.state         = 'follower';
            receiver.votes         = 0;
            receiver.electionTimer = randTimeout();
        }
    } else if (msg.type === 'vote-req') {
        var grant = false;
        if (msg.term > receiver.term) {
            receiver.term    = msg.term;
            receiver.state   = 'follower';
            receiver.votes   = 0;
            grant = true;
        } else if (msg.term === receiver.term && receiver.votedFor === null) {
            grant = true;
        }
        if (grant) {
            receiver.votedFor = msg.from;
            sendMsg(msg.to, msg.from, 'vote-grant');
            addLog(receiver.label + ' grants vote to ' + sender.label, 'log-msg');
        }
    } else if (msg.type === 'vote-grant') {
        if (receiver.state === 'candidate' && msg.term === receiver.term) {
            receiver.votes++;
            var live      = liveNodes().length;
            var majority  = Math.floor(live / 2) + 1;
            if (receiver.votes >= majority) becomeLeader(receiver);
        }
    }
}

// ── Simulation tick ───────────────────────────────────────────────────────────
function tick(dt) {
    var scaled = dt * simSpeed;

    nodes.forEach(function(node) {
        if (node.state === 'dead') return;

        if (node.state === 'leader') {
            node.heartbeatTimer -= scaled;
            if (node.heartbeatTimer <= 0) {
                node.heartbeatTimer = HEARTBEAT_MS;
                nodes.forEach(function(other) {
                    if (other.id !== node.id) sendMsg(node.id, other.id, 'heartbeat');
                });
            }
        } else {
            node.electionTimer -= scaled;
            if (node.electionTimer <= 0) startElection(node);
        }
    });

    var speed = MSG_SPEED * simSpeed;
    var alive  = [];
    msgs.forEach(function(m) {
        var from = nodes[m.from];
        var to   = nodes[m.to];
        if (!from || !to) return;
        var dx   = to.x - from.x;
        var dy   = to.y - from.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        m.t += (speed * dt) / Math.max(dist, 1);
        if (m.t >= 1) {
            deliverMsg(m);
        } else {
            alive.push(m);
        }
    });
    msgs = alive;
}

// ── Drawing ───────────────────────────────────────────────────────────────────
var NODE_COLORS = {
    leader:    '#ffd700',
    candidate: '#ffe066',
    follower:  '#64a0ff',
    dead:      '#444',
};

function drawArrow(x1, y1, x2, y2, color) {
    var dx  = x2 - x1;
    var dy  = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    var ux  = dx / len;
    var uy  = dy / len;
    var ex  = x2 - ux * NODE_R;
    var ey  = y2 - uy * NODE_R;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(x1 + ux * NODE_R, y1 + uy * NODE_R);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
}

function draw() {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth   = 1;
    for (var gx = 0; gx < CANVAS_W; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, CANVAS_H); ctx.stroke();
    }
    for (var gy = 0; gy < CANVAS_H; gy += 40) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(CANVAS_W, gy); ctx.stroke();
    }

    // Connection lines between nodes
    nodes.forEach(function(a) {
        nodes.forEach(function(b) {
            if (b.id <= a.id) return;
            drawArrow(a.x, a.y, b.x, b.y, '#f4a261');
        });
    });

    // Partition line
    if (partX !== null) {
        ctx.strokeStyle = 'rgba(239,83,80,0.7)';
        ctx.lineWidth   = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(partX, 0);
        ctx.lineTo(partX, CANVAS_H);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(239,83,80,0.8)';
        ctx.font      = '10px "Courier New"';
        ctx.textAlign = 'center';
        ctx.fillText('PARTITION', partX, 14);
    }

    // Messages in flight
    msgs.forEach(function(m) {
        var from = nodes[m.from];
        var to   = nodes[m.to];
        if (!from || !to) return;
        var px = from.x + (to.x - from.x) * m.t;
        var py = from.y + (to.y - from.y) * m.t;
        var color = MSG_COLORS[m.type] || '#888';
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle   = color;
        ctx.shadowColor = color;
        ctx.shadowBlur  = 8;
        ctx.fill();
        ctx.shadowBlur  = 0;
    });

    // Nodes
    nodes.forEach(function(node) {
        var color  = NODE_COLORS[node.state] || '#888';
        var isLeader = node.state === 'leader';

        // Glow for leader
        if (isLeader) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_R + 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,215,0,0.12)';
            ctx.fill();
        }

        // Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_R, 0, Math.PI * 2);
        ctx.fillStyle   = node.state === 'dead' ? 'rgba(40,40,40,0.9)' : 'rgba(0,0,0,0.75)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth   = node.state === 'dead' ? 1 : isLeader ? 3 : 2;
        ctx.stroke();

        // Election timer arc for follower/candidate
        if (node.state === 'follower' || node.state === 'candidate') {
            var frac = Math.max(0, Math.min(1, node.electionTimer / ELECTION_MAX_MS));
            ctx.beginPath();
            ctx.arc(node.x, node.y, NODE_R + 4, -Math.PI / 2, -Math.PI / 2 + (1 - frac) * Math.PI * 2);
            ctx.strokeStyle = node.state === 'candidate' ? 'rgba(255,224,102,0.6)' : 'rgba(100,160,255,0.4)';
            ctx.lineWidth   = 2;
            ctx.stroke();
        }

        // Label
        ctx.fillStyle   = node.state === 'dead' ? '#555' : '#f4d0aa';
        ctx.font        = 'bold 12px "Courier New"';
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.x, node.y - 4);

        // Term
        ctx.fillStyle   = node.state === 'dead' ? '#333' : '#666';
        ctx.font        = '10px "Courier New"';
        ctx.fillText('t' + node.term, node.x, node.y + 9);

        // Crown for leader
        if (isLeader) {
            ctx.fillStyle = '#ffd700';
            ctx.font      = '13px serif';
            ctx.fillText('♛', node.x, node.y - NODE_R - 10);
        }

        // X for dead
        if (node.state === 'dead') {
            ctx.strokeStyle = '#ef5350';
            ctx.lineWidth   = 1.5;
            var d = 7;
            ctx.beginPath();
            ctx.moveTo(node.x - d, node.y - d); ctx.lineTo(node.x + d, node.y + d);
            ctx.moveTo(node.x + d, node.y - d); ctx.lineTo(node.x - d, node.y + d);
            ctx.stroke();
        }
    });

    ctx.textBaseline = 'alphabetic';
    updateSidebar();
}

// ── Sidebar UI ────────────────────────────────────────────────────────────────
function updateSidebar() {
    var tbody = document.getElementById('node-table-body');
    var bars  = document.getElementById('clock-bars');
    var maxL  = 1;
    nodes.forEach(function(n) { if (n.lamport > maxL) maxL = n.lamport; });

    tbody.innerHTML = '';
    bars.innerHTML  = '';
    nodes.forEach(function(node) {
        var color = NODE_COLORS[node.state] || '#888';
        var tr    = document.createElement('tr');
        tr.innerHTML =
            '<td>' + node.label + '</td>' +
            '<td><span class="state-dot" style="background:' + color + '"></span>' + node.state + '</td>' +
            '<td>' + node.term + '</td>' +
            '<td>' + node.lamport + '</td>';
        tbody.appendChild(tr);

        var barPct = Math.min(100, Math.round((node.lamport / maxL) * 100));
        var row    = document.createElement('div');
        row.className = 'clock-row';
        row.innerHTML =
            '<span class="clock-label">' + node.label + '</span>' +
            '<div class="clock-bar-bg"><div class="clock-bar-fill" style="width:' + barPct + '%"></div></div>' +
            '<span class="clock-val">' + node.lamport + '</span>';
        bars.appendChild(row);
    });
}

// ── Animation loop ────────────────────────────────────────────────────────────
function loop(ts) {
    if (lastTs === null) lastTs = ts;
    var dt  = Math.min((ts - lastTs) / 1000, 0.1);
    lastTs  = ts;
    tick(dt);
    draw();
    rafId = requestAnimationFrame(loop);
}

// ── Canvas interaction ────────────────────────────────────────────────────────
function canvasPos(e) {
    var r     = canvas.getBoundingClientRect();
    var scaleX = CANVAS_W / r.width;
    var scaleY = CANVAS_H / r.height;
    return { x: (e.clientX - r.left) * scaleX, y: (e.clientY - r.top) * scaleY };
}

function hitNode(x, y) {
    return nodes.find(function(n) { return Math.hypot(n.x - x, n.y - y) < NODE_R; });
}

canvas.addEventListener('mousedown', function(e) {
    var pos  = canvasPos(e);
    // Dragging partition line?
    if (partX !== null && Math.abs(pos.x - partX) < 12) {
        dragging = true;
        return;
    }
    var node = hitNode(pos.x, pos.y);
    if (node) {
        if (node.state === 'dead') {
            node.state         = 'follower';
            node.electionTimer = randTimeout();
            node.term          = 0;
            node.votedFor      = null;
            addLog(node.label + ' revived', 'log-msg');
        } else {
            node.state = 'dead';
            addLog(node.label + ' killed', 'log-partition');
        }
    }
});

canvas.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    var pos = canvasPos(e);
    partX   = Math.max(60, Math.min(CANVAS_W - 60, pos.x));
});

canvas.addEventListener('mouseup', function() { dragging = false; });

// ── Controls ──────────────────────────────────────────────────────────────────
function addNodeRandom() {
    if (nodes.length >= 9) return;
    var margin = 60, attempts = 0;
    var x, y, ok;
    do {
        x  = randRange(margin, CANVAS_W - margin);
        y  = randRange(margin, CANVAS_H - margin);
        ok = nodes.every(function(n) { return Math.hypot(n.x - x, n.y - y) > NODE_R * 3; });
        attempts++;
    } while (!ok && attempts < 200);
    nodes.push(makeNode(x, y));
    addLog('Added ' + nodes[nodes.length - 1].label, 'log-msg');
}

function removeNode() {
    if (nodes.length <= 1) return;
    var removed = nodes.pop();
    nodeSeq = nodes.length;   // realign sequence
    addLog('Removed ' + removed.label, 'log-msg');
    msgs = msgs.filter(function(m) { return m.from !== removed.id && m.to !== removed.id; });
}

function triggerElection() {
    var leader = nodes.find(function(n) { return n.state === 'leader'; });
    if (leader) {
        leader.state = 'dead';
        addLog(leader.label + ' crashed — election triggered', 'log-partition');
        setTimeout(function() {
            if (leader.state === 'dead') {
                leader.state         = 'follower';
                leader.electionTimer = randTimeout();
                addLog(leader.label + ' recovered as follower', 'log-msg');
            }
        }, 4000 / simSpeed);
    } else {
        var follower = liveNodes().find(function(n) { return n.state !== 'dead'; });
        if (follower) startElection(follower);
    }
}

function togglePartition() {
    if (partX !== null) {
        healPartition();
        return;
    }
    partX = CANVAS_W / 2;
    addLog('Network partitioned at x=' + Math.round(partX), 'log-partition');
    document.getElementById('part-btn').textContent = '✂ Partitioned';
}

function healPartition() {
    partX = null;
    addLog('Partition healed — network restored', 'log-election');
    document.getElementById('part-btn').textContent = '✂ Partition';
}

function setSpeed(s) {
    simSpeed = s;
    document.querySelectorAll('.speed-btn').forEach(function(btn) {
        btn.classList.toggle('active', parseFloat(btn.dataset.speed) === s);
    });
}

function resetSim() {
    cancelAnimationFrame(rafId);
    msgs  = [];
    partX = null;
    document.getElementById('part-btn').textContent = '✂ Partition';
    loadPreset(PRESETS[0]);
    lastTs = null;
    rafId  = requestAnimationFrame(loop);
}

// ── Presets ───────────────────────────────────────────────────────────────────
var PRESETS = [
    {
        label: '3-Node Cluster',
        setup: function() {
            var cx = CANVAS_W / 2, cy = CANVAS_H / 2, r = 140;
            nodes = [
                makeNode(cx + r * Math.cos(-Math.PI/2),           cy + r * Math.sin(-Math.PI/2)),
                makeNode(cx + r * Math.cos(-Math.PI/2 + 2*Math.PI/3), cy + r * Math.sin(-Math.PI/2 + 2*Math.PI/3)),
                makeNode(cx + r * Math.cos(-Math.PI/2 + 4*Math.PI/3), cy + r * Math.sin(-Math.PI/2 + 4*Math.PI/3)),
            ];
        },
    },
    {
        label: '5-Node Cluster',
        setup: function() {
            var cx = CANVAS_W / 2, cy = CANVAS_H / 2, r = 160;
            nodes = [];
            for (var i = 0; i < 5; i++) {
                var angle = -Math.PI/2 + i * 2 * Math.PI / 5;
                nodes.push(makeNode(cx + r * Math.cos(angle), cy + r * Math.sin(angle)));
            }
        },
    },
    {
        label: 'Split Brain',
        setup: function() {
            // Pre-positioned across a partition line
            nodes = [
                makeNode(160, 160), makeNode(160, 300),
                makeNode(540, 160), makeNode(540, 300), makeNode(540, 230),
            ];
            // Kick off — leaders will form on each side
            nodes[0].state = 'leader'; nodes[0].term = 1;
            nodes[2].state = 'leader'; nodes[2].term = 1;
            partX = CANVAS_W / 2;
            addLog('Split brain: two leaders on isolated partitions', 'log-partition');
        },
    },
    {
        label: 'Byzantine (7-Node)',
        setup: function() {
            var cx = CANVAS_W / 2, cy = CANVAS_H / 2, r = 170;
            nodes = [];
            for (var i = 0; i < 7; i++) {
                var angle = -Math.PI/2 + i * 2 * Math.PI / 7;
                nodes.push(makeNode(cx + r * Math.cos(angle), cy + r * Math.sin(angle)));
            }
            // Kill two nodes to simulate faulty nodes
            nodes[2].state = 'dead';
            nodes[5].state = 'dead';
            addLog('2 of 7 nodes faulty — majority (4) still available', 'log-partition');
        },
    },
];

function loadPreset(preset) {
    nodeSeq = 0;
    nodes   = [];
    msgs    = [];
    partX   = null;
    document.getElementById('part-btn').textContent = '✂ Partition';
    logEl.innerHTML = '';
    preset.setup();
    addLog('Loaded: ' + preset.label, 'log-election');
}

function buildPresets() {
    var row = document.getElementById('presets-row');
    PRESETS.forEach(function(p) {
        var btn       = document.createElement('button');
        btn.className = 'preset-btn';
        btn.textContent = p.label;
        btn.onclick   = function() { loadPreset(p); };
        row.appendChild(btn);
    });
}

// ── Init ──────────────────────────────────────────────────────────────────────
buildPresets();
loadPreset(PRESETS[0]);
rafId = requestAnimationFrame(loop);
