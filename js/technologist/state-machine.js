// ── Data model ───────────────────────────────────────────────────────────────
    let states = [], transitions = [], selectedItem = null;
    let mode = 'addState', transFrom = null, currentState = null;
    let dragging = null, dragOffX = 0, dragOffY = 0;
    const canvas = document.getElementById('fsm-canvas');
    const ctx    = canvas.getContext('2d');

    const R = 34; // state circle radius

    const PRESETS = [
        {
            label: 'Traffic Light',
            states: [{id:0,name:'Red',x:200,y:240,initial:true,final:false},{id:1,name:'Green',x:500,y:240,initial:false,final:false},{id:2,name:'Yellow',x:350,y:100,initial:false,final:false}],
            trans:  [{from:0,to:1,event:'TIMER',guard:''},{from:1,to:2,event:'TIMER',guard:''},{from:2,to:0,event:'TIMER',guard:''}],
        },
        {
            label: 'Auth Flow',
            states: [{id:0,name:'LoggedOut',x:120,y:240,initial:true,final:false},{id:1,name:'Authenticating',x:320,y:120,initial:false,final:false},{id:2,name:'LoggedIn',x:540,y:240,initial:false,final:false},{id:3,name:'Error',x:320,y:360,initial:false,final:false}],
            trans:  [{from:0,to:1,event:'LOGIN',guard:''},{from:1,to:2,event:'SUCCESS',guard:'validToken'},{from:1,to:3,event:'FAIL',guard:''},{from:3,to:0,event:'RETRY',guard:''},{from:2,to:0,event:'LOGOUT',guard:''}],
        },
        {
            label: 'Order Lifecycle',
            states: [{id:0,name:'Pending',x:100,y:240,initial:true,final:false},{id:1,name:'Paid',x:280,y:120,initial:false,final:false},{id:2,name:'Shipped',x:460,y:240,initial:false,final:false},{id:3,name:'Delivered',x:620,y:120,initial:false,final:true},{id:4,name:'Cancelled',x:280,y:360,initial:false,final:true}],
            trans:  [{from:0,to:1,event:'PAY',guard:''},{from:1,to:2,event:'SHIP',guard:'inStock'},{from:2,to:3,event:'DELIVER',guard:''},{from:0,to:4,event:'CANCEL',guard:''},{from:1,to:4,event:'CANCEL',guard:'refundable'}],
        },
    ];

    function buildPresets() {
        const row = document.getElementById('presets-row');
        PRESETS.forEach(p => {
            const btn = document.createElement('button');
            btn.className = 'preset-btn';
            btn.textContent = p.label;
            btn.onclick = () => loadPreset(p);
            row.appendChild(btn);
        });
    }

    function loadPreset(p) {
        states = p.states.map(s => ({...s}));
        transitions = p.trans.map(t => ({...t}));
        selectedItem = null; transFrom = null;
        resetRun();
        draw();
    }

    // ── Mode ─────────────────────────────────────────────────────────────────────
    function setMode(m) {
        mode = m; transFrom = null;
        document.querySelectorAll('.btn[id^="mode-"]').forEach(b => b.classList.remove('active'));
        document.getElementById('mode-' + m.replace('add','add-').replace(/([A-Z])/g,c=>'-'+c.toLowerCase()).replace('--','-')).classList.add('active');
        document.getElementById('mode-lbl').textContent = 'Mode: ' + {addState:'Add State',addTrans:'Add Transition',select:'Select',run:'Run'}[m];
        document.getElementById('panel-state').style.display  = m === 'addState' ? '' : 'none';
        document.getElementById('panel-trans').style.display  = m === 'addTrans' ? '' : 'none';
        document.getElementById('panel-run').style.display    = m === 'run'      ? '' : 'none';
        document.getElementById('canvas-hint').textContent =
            m==='addState' ? 'Click canvas to add a state' :
            m==='addTrans' ? 'Click source state, then target state' :
            m==='select'   ? 'Click to select · Drag to move' : 'Fire events to run the machine';
        if (m === 'run') { buildEventList(); if (!currentState) resetRun(); }
        draw();
    }

    // ── Canvas interaction ───────────────────────────────────────────────────────
    function getPos(e) {
        const r = canvas.getBoundingClientRect();
        const scaleX = canvas.width  / r.width;
        const scaleY = canvas.height / r.height;
        return { x:(e.clientX-r.left)*scaleX, y:(e.clientY-r.top)*scaleY };
    }

    function hitState(x, y) { return states.find(s => Math.hypot(s.x-x,s.y-y) < R); }

    canvas.addEventListener('mousedown', e => {
        const {x,y} = getPos(e);
        if (mode === 'addState') {
            // handled in click
        } else if (mode === 'select') {
            const s = hitState(x,y);
            if (s) { dragging = s; dragOffX = x-s.x; dragOffY = y-s.y; selectItem(s,'state'); }
            else   { selectedItem = null; document.getElementById('panel-selected').style.display='none'; }
        } else if (mode === 'addTrans') {
            const s = hitState(x,y);
            if (!s) return;
            if (!transFrom) { transFrom = s; draw(); }
            else if (transFrom !== s) {
                const ev = document.getElementById('trans-event').value.trim() || 'EVENT';
                const gd = document.getElementById('trans-guard').value.trim();
                transitions.push({ from:transFrom.id, to:s.id, event:ev.toUpperCase(), guard:gd });
                transFrom = null;
                buildEventList();
                draw();
            } else { transFrom = null; draw(); }
        } else if (mode === 'run') {
            // handled by event buttons
        }
    });

    canvas.addEventListener('mousemove', e => {
        if (!dragging) return;
        const {x,y} = getPos(e);
        dragging.x = Math.max(R, Math.min(canvas.width-R, x - dragOffX));
        dragging.y = Math.max(R, Math.min(canvas.height-R, y - dragOffY));
        draw();
    });

    canvas.addEventListener('mouseup', () => { dragging = null; });

    canvas.addEventListener('click', e => {
        if (mode !== 'addState') return;
        const {x,y} = getPos(e);
        if (hitState(x,y)) return;
        const name = document.getElementById('state-name').value.trim() || 'State' + states.length;
        const initial = document.getElementById('is-initial').checked;
        const final_  = document.getElementById('is-final').checked;
        states.push({ id: states.length ? Math.max(...states.map(s=>s.id))+1 : 0, name, x, y, initial, final: final_ });
        document.getElementById('state-name').value = '';
        draw();
    });

    function selectItem(item, type) {
        selectedItem = { item, type };
        const p = document.getElementById('panel-selected');
        p.style.display = '';
        const info = document.getElementById('selected-info');
        if (type === 'state') {
            info.innerHTML = `<strong style="color:#f4d0aa">${item.name}</strong><br>Initial: ${item.initial} · Final: ${item.final}`;
        }
    }

    function deleteSelected() {
        if (!selectedItem) return;
        if (selectedItem.type === 'state') {
            const id = selectedItem.item.id;
            states = states.filter(s => s.id !== id);
            transitions = transitions.filter(t => t.from !== id && t.to !== id);
        }
        selectedItem = null;
        document.getElementById('panel-selected').style.display = 'none';
        draw();
    }

    function addState() {
        const name = document.getElementById('state-name').value.trim() || 'State' + states.length;
        const initial = document.getElementById('is-initial').checked;
        const final_  = document.getElementById('is-final').checked;
        const cx = 100 + Math.random() * 500;
        const cy = 100 + Math.random() * 300;
        states.push({ id: states.length ? Math.max(...states.map(s=>s.id))+1 : 0, name, x:cx, y:cy, initial, final: final_ });
        document.getElementById('state-name').value = '';
        buildEventList();
        draw();
    }

    function clearMachine() { states=[]; transitions=[]; selectedItem=null; transFrom=null; currentState=null; draw(); }

    // ── Run ──────────────────────────────────────────────────────────────────────
    function resetRun() {
        const init = states.find(s => s.initial);
        currentState = init || states[0] || null;
        document.getElementById('cur-state').textContent = currentState ? currentState.name : '—';
        buildEventList();
        draw();
    }

    function buildEventList() {
        const list = document.getElementById('event-list');
        list.innerHTML = '';
        const events = [...new Set(transitions.map(t => t.event))];
        events.forEach(ev => {
            const row = document.createElement('div');
            row.className = 'event-item';
            row.innerHTML = `<input type="text" value="${ev}" readonly style="flex:1;">
                <button class="event-fire" onclick="fireEvent('${ev}')">Fire</button>`;
            list.appendChild(row);
        });
        if (!events.length) list.innerHTML = '<div style="font-family:Courier New,monospace;font-size:11px;color:#333;">No transitions defined</div>';
    }

    function fireEvent(ev) {
        if (!currentState) { log('No initial state set', 'err'); return; }
        const t = transitions.find(t => t.from === currentState.id && t.event === ev);
        if (!t) { log(`✗  ${currentState.name}  --[${ev}]-->  no valid transition`, 'err'); return; }
        if (t.guard) log(`  guard [${t.guard}] assumed true`, 'info');
        const next = states.find(s => s.id === t.to);
        log(`✓  ${currentState.name}  --[${ev}]-->  ${next.name}`, 'ok');
        currentState = next;
        document.getElementById('cur-state').textContent = currentState.name;
        if (currentState.final) log(`  ★ Reached final state: ${currentState.name}`, 'info');
        draw();
    }

    function log(msg, cls='info') {
        const l = document.getElementById('fsm-log');
        const d = document.createElement('div');
        d.className = 'log-' + cls;
        d.textContent = msg;
        l.appendChild(d);
        l.scrollTop = l.scrollHeight;
    }

    // ── Drawing ──────────────────────────────────────────────────────────────────
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
        for (let y = 0; y < canvas.height; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }

        // Transitions
        transitions.forEach(t => {
            const from = states.find(s => s.id === t.from);
            const to   = states.find(s => s.id === t.to);
            if (!from || !to) return;
            drawArrow(from, to, t.event + (t.guard ? ` [${t.guard}]` : ''));
        });

        // Drag-target highlight
        if (mode === 'addTrans' && transFrom) {
            ctx.strokeStyle = 'rgba(244,162,97,0.5)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6,4]);
            ctx.beginPath(); ctx.arc(transFrom.x, transFrom.y, R+6, 0, Math.PI*2); ctx.stroke();
            ctx.setLineDash([]);
        }

        // States
        states.forEach(s => {
            const isActive  = mode==='run' && currentState && currentState.id === s.id;
            const isFromSel = mode==='addTrans' && transFrom && transFrom.id === s.id;

            // Initial arrow
            if (s.initial) {
                ctx.strokeStyle = '#f4a261';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(s.x-R-25, s.y); ctx.lineTo(s.x-R-5, s.y); ctx.stroke();
                ctx.fillStyle = '#f4a261';
                ctx.beginPath(); ctx.moveTo(s.x-R-2,s.y); ctx.lineTo(s.x-R-10,s.y-5); ctx.lineTo(s.x-R-10,s.y+5); ctx.closePath(); ctx.fill();
            }

            // Circle
            const grad = ctx.createRadialGradient(s.x,s.y,2,s.x,s.y,R);
            grad.addColorStop(0, isActive ? 'rgba(76,175,80,0.3)' : isFromSel ? 'rgba(244,162,97,0.3)' : 'rgba(244,162,97,0.1)');
            grad.addColorStop(1, 'rgba(0,0,0,0.5)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, Math.PI*2); ctx.fill();

            ctx.strokeStyle = isActive ? '#4caf50' : isFromSel ? '#f4a261' : selectedItem?.item?.id===s.id ? '#fff' : 'rgba(244,162,97,0.4)';
            ctx.lineWidth   = isActive || isFromSel ? 2.5 : 1.5;
            ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, Math.PI*2); ctx.stroke();

            if (s.final) { ctx.strokeStyle = ctx.strokeStyle; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(s.x,s.y,R-5,0,Math.PI*2); ctx.stroke(); }

            ctx.fillStyle  = isActive ? '#a5d6a7' : '#f4d0aa';
            ctx.font       = `bold ${Math.min(12,26/s.name.length*2)}px Courier New`;
            ctx.textAlign  = 'center';
            ctx.textBaseline='middle';
            ctx.fillText(s.name.length > 9 ? s.name.substring(0,9)+'…' : s.name, s.x, s.y);
        });

        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    function drawArrow(from, to, label) {
        const isSelf = from.id === to.id;
        if (isSelf) {
            ctx.strokeStyle='rgba(244,162,97,0.35)'; ctx.lineWidth=1.5;
            ctx.beginPath(); ctx.arc(from.x, from.y-R-16, 16, Math.PI*0.2, Math.PI*1.8); ctx.stroke();
            ctx.fillStyle='#888'; ctx.font='10px Courier New'; ctx.textAlign='center';
            ctx.fillText(label, from.x, from.y-R-36);
            ctx.textAlign='left';
            return;
        }

        const dx = to.x-from.x, dy = to.y-from.y;
        const len = Math.hypot(dx,dy);
        const ux = dx/len, uy = dy/len;
        const sx = from.x + ux*R, sy = from.y + uy*R;
        const ex = to.x   - ux*R, ey = to.y   - uy*R;

        // Offset for parallel transitions
        const hasReturn = transitions.some(t => t.from===to.id && t.to===from.id);
        const off = hasReturn ? 14 : 0;
        const nx = -uy*off, ny = ux*off;

        ctx.strokeStyle = 'rgba(244,162,97,0.35)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sx+nx,sy+ny); ctx.lineTo(ex+nx,ey+ny); ctx.stroke();

        // Arrowhead
        const ang = Math.atan2(ey-sy, ex-sx);
        ctx.fillStyle='rgba(244,162,97,0.5)';
        ctx.beginPath();
        ctx.moveTo(ex+nx, ey+ny);
        ctx.lineTo(ex+nx - 10*Math.cos(ang-0.4), ey+ny - 10*Math.sin(ang-0.4));
        ctx.lineTo(ex+nx - 10*Math.cos(ang+0.4), ey+ny - 10*Math.sin(ang+0.4));
        ctx.closePath(); ctx.fill();

        // Label
        const mx = (sx+ex)/2 + nx - uy*14;
        const my = (sy+ey)/2 + ny + ux*14;
        ctx.fillStyle='#888'; ctx.font='10px Courier New'; ctx.textAlign='center';
        ctx.fillText(label, mx, my);
        ctx.textAlign='left';
    }

    // ── Mode btn id mapping ───────────────────────────────────────────────────────
    document.getElementById('mode-add-state').id = 'mode-addState';
    document.getElementById('mode-add-trans').id = 'mode-addTrans';
    document.getElementById('mode-select').id    = 'mode-select';
    document.getElementById('mode-run').id       = 'mode-run';

    function setMode(m) {
        mode = m; transFrom = null;
        ['addState','addTrans','select','run'].forEach(k => {
            const el = document.getElementById('mode-'+k);
            if (el) el.classList.toggle('active', k===m);
        });
        document.getElementById('mode-lbl').textContent = 'Mode: ' + {addState:'Add State',addTrans:'Add Transition',select:'Select',run:'Run'}[m];
        document.getElementById('panel-state').style.display  = m==='addState'?'':'none';
        document.getElementById('panel-trans').style.display  = m==='addTrans'?'':'none';
        document.getElementById('panel-run').style.display    = m==='run'?'':'none';
        document.getElementById('canvas-hint').textContent =
            m==='addState'?'Click canvas to place a state':
            m==='addTrans'?'Click source → target state':
            m==='select'  ?'Click to select · Drag to move':'Fire events to run';
        if (m==='run') { buildEventList(); if (!currentState) resetRun(); }
        draw();
    }

    document.addEventListener('DOMContentLoaded', () => {
        buildPresets();
        loadPreset(PRESETS[1]);
        setMode('addState');
    });
