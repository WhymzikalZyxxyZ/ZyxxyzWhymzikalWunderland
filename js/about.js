/* global navigateToPage */
(function () {
    'use strict';

    var cvs = document.getElementById('aboutCanvas');
    var ctx = cvs.getContext('2d');

    function resize() { cvs.width = cvs.clientWidth; cvs.height = cvs.clientHeight; }
    resize();
    window.addEventListener('resize', resize);

    // ── palette ──────────────────────────────────────────────────────────────
    var GOLD     = '#ffd700';
    var MAGENTA  = '#ff69b4';
    var LAVENDER = '#c084fc';
    var TEAL     = '#5eead4';
    var LIGHT_COLS = [GOLD, MAGENTA, LAVENDER, TEAL, '#ff6b6b', '#74b9ff', '#a8ff78'];
    var SUIT_COLS  = { '♠': '#c8d6ff', '♥': '#ff4d6d', '♦': '#ff9f43', '♣': '#5eead4' };
    var SUIT_SYMS  = ['♠', '♥', '♦', '♣'];

    // Light direction for gradient shading — unit vector from upper-left
    var LX = -0.6, LY = -0.8;

    // ── seeded scene data ─────────────────────────────────────────────────────
    var stars = [];
    for (var i = 0; i < 80; i++) {
        stars.push({ x: Math.random(), y: Math.random() * 0.52, r: Math.random() * 1.8 + 0.3,
            phase: Math.random() * Math.PI * 2, spd: Math.random() * 0.9 + 0.3, diamond: i % 3 === 0 });
    }

    var N_LIGHTS = 24;

    var floaters = [];
    for (i = 0; i < 28; i++) {
        var sym = SUIT_SYMS[i % 4];
        floaters.push({ sym: sym, x: Math.random(), y: 0.08 + Math.random() * 0.85,
            vx: (Math.random() - 0.5) * 0.0014, vy: -(Math.random() * 0.0045 + 0.001),
            rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.011,
            size: Math.random() * 14 + 7, alpha: Math.random() * 0.28 + 0.08,
            phase: Math.random() * Math.PI * 2, col: SUIT_COLS[sym] });
    }

    // Constellation groups — fixed normalised coords so they scale with canvas
    var CONSTELLATIONS = [
        { pts: [[0.10,0.06],[0.14,0.03],[0.19,0.06],[0.16,0.10],[0.11,0.09]] },
        { pts: [[0.72,0.04],[0.76,0.02],[0.81,0.05],[0.78,0.09],[0.73,0.07],[0.76,0.02]] },
        { pts: [[0.40,0.02],[0.44,0.06],[0.48,0.03],[0.51,0.07],[0.45,0.10]] }
    ];

    // Left/right tree clusters — normalised x, fractional height span
    var TREES = [
        { x: 0.04, h: 0.30, sway: 0.9 }, { x: 0.11, h: 0.26, sway: 1.1 },
        { x: 0.18, h: 0.22, sway: 0.7 }, { x: 0.78, h: 0.28, sway: 1.0 },
        { x: 0.86, h: 0.24, sway: 0.8 }, { x: 0.93, h: 0.32, sway: 1.2 }
    ];

    var flies = [], flyClock = 0;

    var idle = {
        blinkNext:  3.2,
        blinkPhase: 0,
        tiltAngle:  0,
        tiltTarget: 0,
        tiltNext:   5.5,
        tapPhase:   0,
        tapNext:    7.0,
        tapDust:    0
    };

    var t0 = null, prevT = 0;

    // ── helpers ───────────────────────────────────────────────────────────────

    // Shade #rrggbb by multiplicative factor
    function shadeHex(hex, f) {
        var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        return 'rgb('+Math.round(Math.min(255,r*f))+','+Math.round(Math.min(255,g*f))+','+Math.round(Math.min(255,b*f))+')';
    }

    // Fill ellipse as N horizontal Riemann strips; colorFn(i,n) → css color
    function riemannEllipse(cx, cy, rx, ry, n, colorFn) {
        var dy = (2 * ry) / n;
        for (var i = 0; i < n; i++) {
            var yTop = cy - ry + i * dy;
            var yMid = yTop + dy * 0.5;
            var t    = (yMid - cy) / ry;
            var hw   = rx * Math.sqrt(Math.max(0, 1 - t * t));
            ctx.fillStyle = colorFn(i, n);
            ctx.fillRect(Math.ceil(cx - hw), yTop, Math.max(1, Math.floor(hw * 2) + 1), dy + 0.5);
        }
    }

    // Build N-gon path approximating ellipse (does not stroke/fill)
    function polygonPath(cx, cy, rx, ry, n, rotation) {
        rotation = rotation || 0;
        ctx.beginPath();
        for (var i = 0; i <= n; i++) {
            var a = rotation + (i / n) * Math.PI * 2;
            var px = cx + rx * Math.cos(a), py = cy + ry * Math.sin(a);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    // Rounded-corner N-gon path
    function roundedPolygon(cx, cy, rx, ry, n, cornerR, rotation) {
        rotation = rotation || 0;
        var pts = [];
        for (var i = 0; i < n; i++) {
            var a = rotation + (i / n) * Math.PI * 2;
            pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
        }
        ctx.beginPath();
        for (var j = 0; j < n; j++) {
            var prev = pts[(j - 1 + n) % n], cur = pts[j], next = pts[(j + 1) % n];
            var d1x = prev.x - cur.x, d1y = prev.y - cur.y;
            var d2x = next.x - cur.x, d2y = next.y - cur.y;
            var len1 = Math.sqrt(d1x*d1x + d1y*d1y) || 1;
            var len2 = Math.sqrt(d2x*d2x + d2y*d2y) || 1;
            var r  = Math.min(cornerR, len1 * 0.45, len2 * 0.45);
            var p1x = cur.x + (d1x/len1)*r, p1y = cur.y + (d1y/len1)*r;
            var p2x = cur.x + (d2x/len2)*r, p2y = cur.y + (d2y/len2)*r;
            if (j === 0) ctx.moveTo(p1x, p1y); else ctx.lineTo(p1x, p1y);
            ctx.arcTo(cur.x, cur.y, p2x, p2y, r);
        }
        ctx.closePath();
    }

    // Alternating-shade color factory for Riemann strips
    function altFn(hexA, hexB) {
        return function(i) { return (i % 2 === 0) ? hexA : hexB; };
    }

    // 2D Riemann sum fill of an ellipse with ∇f gradient shading.
    // Each cell of size `cell` is tested: is its centre inside the ellipse?
    // Shade = dot(normalised ∇f, light direction), mapped to [0.30, 1.0].
    function riemannGrid2D(cx, cy, rx, ry, cell, hexBase, lx, ly) {
        var br = parseInt(hexBase.slice(1,3),16);
        var bg = parseInt(hexBase.slice(3,5),16);
        var bb = parseInt(hexBase.slice(5,7),16);
        var rxSq = rx * rx, rySq = ry * ry;
        var x0 = Math.floor(cx - rx), x1 = cx + rx;
        var y0 = Math.floor(cy - ry), y1 = cy + ry;
        for (var xi = x0; xi < x1; xi += cell) {
            for (var yi = y0; yi < y1; yi += cell) {
                var xm = xi + cell * 0.5, ym = yi + cell * 0.5;
                var dx = xm - cx, dy = ym - cy;
                if ((dx*dx)/rxSq + (dy*dy)/rySq > 1) continue;
                var gx = dx / rxSq, gy = dy / rySq;
                var gLen = Math.sqrt(gx*gx + gy*gy) || 1e-6;
                var dot  = (gx*lx + gy*ly) / gLen;
                var bright = Math.max(0.30, Math.min(1.0, 0.68 + dot * 0.38));
                ctx.fillStyle = 'rgb('+Math.round(br*bright)+','+Math.round(bg*bright)+','+Math.round(bb*bright)+')';
                ctx.fillRect(xi, yi, cell, cell);
            }
        }
    }

    // 2D Riemann sum fill of a rectangle with gradient shading from its centre.
    function riemannRect2D(x, y, w, h, cell, hexBase, lx, ly) {
        var br = parseInt(hexBase.slice(1,3),16);
        var bg = parseInt(hexBase.slice(3,5),16);
        var bb = parseInt(hexBase.slice(5,7),16);
        var hcx = x + w*0.5, hcy = y + h*0.5;
        var hwSq = (w*0.5)*(w*0.5), hhSq = (h*0.5)*(h*0.5);
        for (var xi = x; xi < x + w; xi += cell) {
            for (var yi = y; yi < y + h; yi += cell) {
                var xm = xi + cell*0.5, ym = yi + cell*0.5;
                var dx = xm - hcx, dy = ym - hcy;
                var gx = dx / hwSq, gy = dy / hhSq;
                var gLen = Math.sqrt(gx*gx + gy*gy) || 1e-6;
                var dot  = (gx*lx + gy*ly) / gLen;
                var bright = Math.max(0.30, Math.min(1.0, 0.68 + dot * 0.38));
                ctx.fillStyle = 'rgb('+Math.round(br*bright)+','+Math.round(bg*bright)+','+Math.round(bb*bright)+')';
                ctx.fillRect(xi, yi, cell, cell);
            }
        }
    }

    // Smooth gradient color factory (top→bottom)
    function gradFn(topHex, botHex, n) {
        var tr = parseInt(topHex.slice(1,3),16), tg = parseInt(topHex.slice(3,5),16), tb = parseInt(topHex.slice(5,7),16);
        var br = parseInt(botHex.slice(1,3),16), bg = parseInt(botHex.slice(3,5),16), bb = parseInt(botHex.slice(5,7),16);
        return function(i) {
            var f = i / Math.max(1, n - 1);
            var r = Math.round(tr + (br-tr)*f), g = Math.round(tg + (bg-tg)*f), b = Math.round(tb + (bb-tb)*f);
            return 'rgb('+r+','+g+','+b+')';
        };
    }

    // ── animation frame ───────────────────────────────────────────────────────
    function frame(ts) {
        if (t0 === null) { t0 = ts; }
        var t  = (ts - t0) / 1000;
        var dt = Math.min(t - prevT, 0.05);
        prevT  = t;
        var W = cvs.width, H = cvs.height;
        var sc    = Math.min(W / 640, H / 460, 1.5);
        var cx    = W / 2;
        var baseY = H * 0.82;

        floaters.forEach(function (f) {
            f.x += f.vx; f.y += f.vy; f.rot += f.rotV;
            if (f.y < -0.06) { f.y = 1.06; f.x = Math.random(); }
            if (f.x < -0.06) f.x = 1.06;
            if (f.x >  1.06) f.x = -0.06;
        });

        flyClock += dt;
        if (flyClock > 0.10) {
            flyClock = 0;
            flies.push({ x: Math.random() * W, y: H * 0.55 + Math.random() * H * 0.35,
                vx: (Math.random() - 0.5) * 0.55, vy: -(Math.random() * 0.9 + 0.25),
                r: Math.random() * 2.0 + 0.7, life: 1,
                col: LIGHT_COLS[Math.floor(Math.random() * LIGHT_COLS.length)] });
        }
        for (var fi = flies.length - 1; fi >= 0; fi--) {
            var ff = flies[fi];
            ff.x += ff.vx + Math.sin(t * 2.2 + fi * 0.9) * 0.45;
            ff.y += ff.vy;
            ff.life -= dt * 0.13;
            if (ff.life <= 0 || ff.y < H * 0.12) flies.splice(fi, 1);
        }

        // Idle personality animation state updates
        if (t >= idle.blinkNext && idle.blinkPhase === 0) {
            idle.blinkPhase = dt;
            idle.blinkNext  = t + 3.0 + Math.random() * 4.5;
        } else if (idle.blinkPhase > 0) {
            idle.blinkPhase += dt;
            if (idle.blinkPhase >= 0.18) idle.blinkPhase = 0;
        }
        if (t >= idle.tiltNext) {
            idle.tiltTarget = (Math.random() - 0.5) * 0.18;
            idle.tiltNext   = t + 4.0 + Math.random() * 5.5;
        }
        idle.tiltAngle += (idle.tiltTarget - idle.tiltAngle) * 0.055;
        if (t >= idle.tapNext && idle.tapPhase === 0) {
            idle.tapPhase = dt;
            idle.tapNext  = t + 5.0 + Math.random() * 6.0;
            idle.tapDust  = 1;
        } else if (idle.tapPhase > 0) {
            idle.tapPhase += dt;
            idle.tapDust   = Math.max(0, idle.tapDust - dt * 3.5);
            if (idle.tapPhase >= 0.35) { idle.tapPhase = 0; idle.tapDust = 0; }
        }

        drawBackground(W, H, t);
        drawConstellations(W, H, t);
        drawFairyLights(W, H, t);
        drawStars(W, H, t);
        drawTrees(W, H, t);
        drawFloaters(W, H, t);
        drawFireflies();
        drawZyxxyz(cx, baseY, sc, t, idle);
        drawWelcome(W, H, t);
        requestAnimationFrame(frame);
    }

    // ── background — Riemann sum hill silhouettes ─────────────────────────────
    function drawBackground(W, H, t) {
        // Sky gradient
        var sky = ctx.createLinearGradient(0, 0, 0, H * 0.68);
        sky.addColorStop(0,    '#180530');
        sky.addColorStop(0.28, '#2e0a55');
        sky.addColorStop(0.55, '#6b1848');
        sky.addColorStop(0.78, '#b84020');
        sky.addColorStop(1,    '#e8710a');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * 0.68);

        // Ground base
        ctx.fillStyle = '#0c1e0a'; ctx.fillRect(0, H * 0.63, W, H * 0.37);

        // Horizon glow
        var hg = ctx.createRadialGradient(W*0.5, H*0.65, 0, W*0.5, H*0.65, W*0.65);
        hg.addColorStop(0, 'rgba(255,160,40,0.22)');
        hg.addColorStop(0.5, 'rgba(200,70,20,0.09)');
        hg.addColorStop(1, 'transparent');
        ctx.fillStyle = hg; ctx.fillRect(0, H*0.40, W, H*0.38);

        // Far hill — Riemann sum of sin-wave profile (N=32)
        var N_FAR = 32;
        var farBase = H * 0.72;
        var farTop  = H * 0.48;
        var farSpan = farBase - farTop;
        var dw = W / N_FAR;
        for (var k = 0; k < N_FAR; k++) {
            var xMid = (k + 0.5) * dw;
            var frac = xMid / W;
            var silh = farTop + farSpan * (0.18 + 0.55 * (1 - Math.sin(frac * Math.PI)));
            var shade = (k % 2 === 0) ? '#1a3d1a' : '#1c4020';
            ctx.fillStyle = shade;
            ctx.fillRect(k * dw, silh, dw + 1, farBase - silh);
        }

        // Mid hill — N=40, animated gentle sway
        var N_MID = 40;
        var midBase = H * 0.80;
        var midTop  = H * 0.59;
        var midSpan = midBase - midTop;
        dw = W / N_MID;
        for (k = 0; k < N_MID; k++) {
            xMid = (k + 0.5) * dw;
            frac = xMid / W;
            var wave = 0.20 + 0.52 * (1 - Math.sin(frac * Math.PI)) + Math.sin(frac * Math.PI * 2.3 + t * 0.18) * 0.06;
            silh = midTop + midSpan * wave;
            shade = (k % 2 === 0) ? '#235220' : '#275824';
            ctx.fillStyle = shade;
            ctx.fillRect(k * dw, silh, dw + 1, midBase - silh);
        }

        // Foreground ground — N=48 alternating dark strips
        var N_FG  = 48;
        var fgBase = H;
        var fgTop  = H * 0.87;
        dw = W / N_FG;
        for (k = 0; k < N_FG; k++) {
            xMid = (k + 0.5) * dw;
            frac = xMid / W;
            var profile = fgTop + (H * 0.05) * (0.3 + 0.7 * Math.sin(frac * Math.PI));
            shade = (k % 2 === 0) ? '#164514' : '#184d16';
            ctx.fillStyle = shade;
            ctx.fillRect(k * dw, profile, dw + 1, fgBase - profile);
        }

        // Mist overlay
        var mist = ctx.createLinearGradient(0, H*0.80, 0, H);
        mist.addColorStop(0, 'rgba(80,200,100,0.06)');
        mist.addColorStop(0.6, 'rgba(60,160,80,0.04)');
        mist.addColorStop(1, 'transparent');
        ctx.fillStyle = mist; ctx.fillRect(0, H*0.80, W, H*0.20);
    }

    // ── constellation line art in the sky ────────────────────────────────────
    function drawConstellations(W, H, t) {
        CONSTELLATIONS.forEach(function (c, ci) {
            var pulse = 0.45 + Math.sin(t * 0.6 + ci * 1.4) * 0.20;
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = 'rgba(210,200,255,0.55)';
            ctx.lineWidth   = 0.8;
            ctx.beginPath();
            c.pts.forEach(function (p, pi) {
                var px = p[0] * W, py = p[1] * H;
                if (pi === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            });
            ctx.stroke();
            // Diamond dot at each vertex
            c.pts.forEach(function (p) {
                var px = p[0] * W, py = p[1] * H;
                ctx.fillStyle = '#e8e4ff';
                ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 4);
                ctx.fillRect(-2, -2, 4, 4);
                ctx.restore();
            });
        });
        ctx.globalAlpha = 1;
    }

    // ── polygon trees ─────────────────────────────────────────────────────────
    function drawTrees(W, H, t) {
        TREES.forEach(function (tr) {
            var tx    = tr.x * W;
            var treeH = tr.h * H;
            var baseY = H * 0.87;
            var sway  = Math.sin(t * tr.sway * 0.9) * 2.5;

            // Trunk — 2 Riemann strips wide
            var trunkW = treeH * 0.08;
            var trunkH = treeH * 0.32;
            ctx.fillStyle = '#2e1a0a';
            ctx.fillRect(tx - trunkW * 0.5, baseY - trunkH, trunkW, trunkH);

            // Three canopy layers (hexagon, heptagon, octagon) stacked upward
            var layers = [
                { sides: 6, rx: treeH*0.22, ry: treeH*0.16, yOff: -trunkH*0.80, col: '#194d12' },
                { sides: 7, rx: treeH*0.18, ry: treeH*0.14, yOff: -trunkH*1.20, col: '#1e5a16' },
                { sides: 8, rx: treeH*0.13, ry: treeH*0.12, yOff: -trunkH*1.55, col: '#256620' }
            ];
            layers.forEach(function (l) {
                var ly = baseY + l.yOff;
                var lx = tx + sway * (l.yOff / (-trunkH));
                // Riemann fill inside canopy bounding rect, clipped to polygon shape
                ctx.save();
                roundedPolygon(lx, ly, l.rx, l.ry, l.sides, 3, -Math.PI / 2);
                ctx.clip();
                riemannEllipse(lx, ly, l.rx, l.ry, 10, altFn(l.col, shadeHex(l.col, 0.80)));
                ctx.restore();
                // Polygon outline
                ctx.strokeStyle = shadeHex(l.col, 0.60);
                ctx.lineWidth   = 0.8;
                roundedPolygon(lx, ly, l.rx, l.ry, l.sides, 3, -Math.PI / 2);
                ctx.stroke();
            });
        });
    }

    // ── fairy lights ──────────────────────────────────────────────────────────
    function drawFairyLights(W, H, t) {
        var wireY = H * 0.07, droop = H * 0.04;
        ctx.strokeStyle = 'rgba(60,40,20,0.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, wireY);
        for (var x = 0; x <= W; x += 4) {
            var frac = x / W;
            ctx.lineTo(x, wireY + Math.sin(frac * Math.PI) * droop);
        }
        ctx.stroke();
        for (var li = 0; li < N_LIGHTS; li++) {
            frac = (li + 0.5) / N_LIGHTS;
            var wx = frac * W, wy = wireY + Math.sin(frac * Math.PI) * droop + 7;
            var col = LIGHT_COLS[li % LIGHT_COLS.length];
            var pulse = 0.55 + Math.sin(t * 2.4 + li * 0.95) * 0.42;
            var g = ctx.createRadialGradient(wx, wy, 0, wx, wy, 16);
            g.addColorStop(0, col); g.addColorStop(1, 'transparent');
            ctx.globalAlpha = pulse * 0.40; ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(wx, wy, 16, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = pulse * 0.92; ctx.fillStyle = col;
            ctx.beginPath(); ctx.arc(wx, wy, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = pulse; ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(wx, wy, 1.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ── stars — diamonds every 3rd ────────────────────────────────────────────
    function drawStars(W, H, t) {
        stars.forEach(function (s) {
            var a = Math.max(0.04, Math.min(0.95, 0.28 + Math.sin(t * s.spd + s.phase) * 0.55));
            ctx.globalAlpha = a;
            ctx.fillStyle = '#fff6e8';
            if (s.diamond) {
                // 4-gon diamond
                ctx.save();
                ctx.translate(s.x * W, s.y * H);
                ctx.rotate(Math.PI / 4);
                ctx.fillRect(-s.r, -s.r, s.r * 2, s.r * 2);
                ctx.restore();
            } else {
                ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill();
            }
        });
        ctx.globalAlpha = 1;
    }

    // ── floating suit symbols ─────────────────────────────────────────────────
    function drawFloaters(W, H, t) {
        floaters.forEach(function (f) {
            var a = f.alpha * (0.6 + Math.sin(t * 1.1 + f.phase) * 0.4);
            ctx.globalAlpha = a;
            ctx.save(); ctx.translate(f.x * W, f.y * H); ctx.rotate(f.rot);
            ctx.fillStyle = f.col; ctx.font = f.size + 'px serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowColor = f.col; ctx.shadowBlur = 9;
            ctx.fillText(f.sym, 0, 0);
            ctx.shadowBlur = 0; ctx.restore();
        });
        ctx.globalAlpha = 1;
    }

    // ── fireflies — hexagonal bulbs ───────────────────────────────────────────
    function drawFireflies() {
        flies.forEach(function (f) {
            ctx.globalAlpha = f.life * 0.45;
            // Glow halo
            ctx.fillStyle = f.col;
            ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 5, 0, Math.PI * 2); ctx.fill();
            // Hexagonal bulb
            ctx.globalAlpha = f.life * 0.88;
            ctx.fillStyle = '#fffde8';
            roundedPolygon(f.x, f.y, f.r * 0.9, f.r * 0.9, 6, f.r * 0.2, 0);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    // ── ZYXXYZ character — Riemann fills + polygon/rounded outlines ───────────
    function drawZyxxyz(cx, baseY, sc, t, idle) {
        var bob = Math.sin(t * 1.4) * 2.8 * sc;

        // Core geometry
        var bRX = 50 * sc, bRY = 46 * sc;
        var bY  = baseY + bob - 46 * sc;
        var hR  = 40 * sc;
        var hY  = bY - bRY * 0.72;
        var neckY = hY + hR * 0.88;

        var furLight = '#ede0cc';
        var furMid   = '#d0b890';
        var furDark  = '#9a7850';
        var faceCol  = '#c87060';
        var shirtCol = '#4a7fc0';

        var caneX    = cx;
        var handY    = bY - bRY * 0.12;
        var tapBounce = idle.tapPhase > 0 ? Math.sin(idle.tapPhase / 0.35 * Math.PI) * 10 * sc : 0;
        var caneBot  = baseY + bob + 9 * sc + tapBounce;
        var shlY    = bY - bRY * 0.58;

        // Cell sizes for 2D Riemann grids — scale with canvas
        var cell   = Math.max(3, Math.round(4 * sc));
        var cellSm = Math.max(2, Math.round(3 * sc));

        // Ground shadow
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.ellipse(cx, baseY + bob + 4*sc, bRX*1.12, 9*sc, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;

        // ── legs — Riemann ellipse fills, 16-gon outlines ─────────────────────
        [-1, 1].forEach(function (side) {
            var lx = cx + side * bRX * 0.40;
            var ly = bY + bRY * 0.58;
            riemannGrid2D(lx, ly, 20*sc, 28*sc, cell, '#ede0cc', LX, LY);
            ctx.strokeStyle = furDark; ctx.lineWidth = 0.7*sc;
            polygonPath(lx, ly, 20*sc, 28*sc, 16);
            ctx.stroke();
            // Foot pads — rounded hexagons
            var fx = cx + side * bRX * 0.46, fy = baseY + bob - 2*sc;
            riemannGrid2D(fx, fy, 22*sc, 10*sc, cellSm, '#ede0cc', LX, LY);
            roundedPolygon(fx, fy, 22*sc, 10*sc, 10, 3*sc);
            ctx.strokeStyle = furDark; ctx.lineWidth = 0.7*sc; ctx.stroke();
            // Toe bumps as small rounded triangles
            ctx.fillStyle = furMid;
            [-7*sc, 0, 7*sc].forEach(function (ox) {
                roundedPolygon(fx + ox * side * 0.65, fy - 7*sc, 4*sc, 4*sc, 6, 1.5*sc);
                ctx.fill();
            });
            // Leg fur strokes
            ctx.strokeStyle = furDark; ctx.lineWidth = 0.9*sc; ctx.lineCap = 'round';
            for (var li = 0; li < 5; li++) {
                var sy = ly - 28*sc*0.5 + li * 9*sc;
                ctx.beginPath();
                ctx.moveTo(lx - 8*sc, sy);
                ctx.quadraticCurveTo(lx, sy + 4*sc, lx + 8*sc, sy);
                ctx.stroke();
            }
            ctx.lineCap = 'butt';
        });

        // ── jacket body — 2D Riemann grid, 14-gon outline ────────────────────
        riemannGrid2D(cx, bY, bRX, bRY, cell, '#cc9ab0', LX, LY);
        ctx.strokeStyle = '#6a4060'; ctx.lineWidth = 1.2*sc;
        polygonPath(cx, bY, bRX, bRY, 14);
        ctx.stroke();

        // ── blue shirt V ───────────────────────────────────────────────────────
        ctx.fillStyle = shirtCol;
        ctx.beginPath();
        ctx.moveTo(cx - 14*sc, bY - bRY*0.56);
        ctx.lineTo(cx + 14*sc, bY - bRY*0.56);
        ctx.bezierCurveTo(cx + bRX*0.28, bY + bRY*0.04, cx + bRX*0.12, bY + bRY*0.58, cx, bY + bRY*0.65);
        ctx.bezierCurveTo(cx - bRX*0.12, bY + bRY*0.58, cx - bRX*0.28, bY + bRY*0.04, cx - 14*sc, bY - bRY*0.56);
        ctx.closePath(); ctx.fill();

        // ── checkered tie ──────────────────────────────────────────────────────
        var tTop = bY - bRY*0.50, tBot = bY + bRY*0.32;
        var tWTop = 9*sc, tWBot = 5*sc;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - tWTop, tTop); ctx.lineTo(cx + tWTop, tTop);
        ctx.lineTo(cx + tWBot, tBot); ctx.lineTo(cx, tBot + 9*sc);
        ctx.lineTo(cx - tWBot, tBot); ctx.closePath(); ctx.clip();
        var csz = 5.5 * sc;
        var tH2  = tBot + 9*sc - tTop + csz;
        var tW2  = tWTop * 2 + 4*sc;
        for (var cr = 0; cr * csz < tH2; cr++) {
            for (var cc = 0; cc * csz < tW2 + csz; cc++) {
                ctx.fillStyle = (cr + cc) % 2 === 0 ? '#0c1e4a' : '#c8d8f0';
                ctx.fillRect(cx - tWTop - 2*sc + cc * csz, tTop + cr * csz, csz + 1, csz + 1);
            }
        }
        ctx.restore();
        ctx.strokeStyle = '#08101e'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - tWTop, tTop); ctx.lineTo(cx + tWTop, tTop);
        ctx.lineTo(cx + tWBot, tBot); ctx.lineTo(cx, tBot + 9*sc);
        ctx.lineTo(cx - tWBot, tBot); ctx.closePath(); ctx.stroke();

        // ── lapels ────────────────────────────────────────────────────────────
        ctx.fillStyle = '#b888a0';
        ctx.beginPath();
        ctx.moveTo(cx - 3*sc, bY - bRY*0.54);
        ctx.bezierCurveTo(cx - 8*sc, bY - bRY*0.36, cx - bRX*0.72, bY - bRY*0.06, cx - bRX*0.82, bY - bRY*0.40);
        ctx.bezierCurveTo(cx - bRX*0.52, bY - bRY*0.72, cx - bRX*0.18, bY - bRY*0.76, cx - 3*sc, bY - bRY*0.54);
        ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 3*sc, bY - bRY*0.54);
        ctx.bezierCurveTo(cx + 8*sc, bY - bRY*0.36, cx + bRX*0.72, bY - bRY*0.06, cx + bRX*0.82, bY - bRY*0.40);
        ctx.bezierCurveTo(cx + bRX*0.52, bY - bRY*0.72, cx + bRX*0.18, bY - bRY*0.76, cx + 3*sc, bY - bRY*0.54);
        ctx.closePath(); ctx.fill();

        // ── arms — jacket sleeves as thick stroked beziers ────────────────────
        var armCols = ['#c898b8','#a878a0','#8a6080'];
        [{ shX: cx - bRX*0.84, shY: shlY + 5*sc, hX: caneX - 10*sc, hY: handY,
           cp1x: cx - bRX*1.18, cp1y: bY - bRY*0.10, cp2x: cx - 36*sc, cp2y: handY + 8*sc },
         { shX: cx + bRX*0.84, shY: shlY + 5*sc, hX: caneX + 10*sc, hY: handY,
           cp1x: cx + bRX*1.18, cp1y: bY - bRY*0.10, cp2x: cx + 36*sc, cp2y: handY + 8*sc }
        ].forEach(function (arm) {
            var slG = ctx.createLinearGradient(arm.shX, arm.shY, arm.hX, arm.hY);
            armCols.forEach(function(c,ci){ slG.addColorStop(ci/2, c); });
            ctx.strokeStyle = slG; ctx.lineWidth = 27*sc; ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(arm.shX, arm.shY);
            ctx.bezierCurveTo(arm.cp1x, arm.cp1y, arm.cp2x, arm.cp2y, arm.hX, arm.hY);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(60,30,50,0.30)'; ctx.lineWidth = 1.5; ctx.lineCap = 'butt';
            ctx.beginPath();
            ctx.moveTo(arm.shX, arm.shY);
            ctx.bezierCurveTo(arm.cp1x, arm.cp1y, arm.cp2x, arm.cp2y, arm.hX, arm.hY);
            ctx.stroke();
            // Cuff
            ctx.strokeStyle = '#e8eef8'; ctx.lineWidth = 8*sc; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(arm.hX + 8*sc, arm.hY + 2*sc); ctx.lineTo(arm.hX - 2*sc, arm.hY + 6*sc); ctx.stroke();
            ctx.strokeStyle = furLight; ctx.lineWidth = 10*sc;
            ctx.beginPath(); ctx.moveTo(arm.hX + 4*sc, arm.hY + 4*sc); ctx.lineTo(arm.hX - 4*sc, arm.hY + 8*sc); ctx.stroke();
            ctx.lineCap = 'butt';
        });

        // ── cane stick ────────────────────────────────────────────────────────
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 9*sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(caneX + 2*sc, handY + 18*sc); ctx.lineTo(caneX + 6*sc, caneBot + 2*sc); ctx.stroke();
        ctx.strokeStyle = '#8b5a24'; ctx.lineWidth = 7*sc;
        ctx.beginPath(); ctx.moveTo(caneX, handY + 16*sc); ctx.lineTo(caneX + 3*sc, caneBot); ctx.stroke();
        ctx.strokeStyle = 'rgba(220,180,130,0.55)'; ctx.lineWidth = 2*sc;
        ctx.beginPath(); ctx.moveTo(caneX - 1*sc, handY + 18*sc); ctx.lineTo(caneX + 1*sc, caneBot - 4*sc); ctx.stroke();
        ctx.lineCap = 'butt';

        // Dust puff on cane tap
        if (idle.tapDust > 0) {
            ctx.globalAlpha = idle.tapDust * 0.60;
            var dustR = 8 * sc * idle.tapDust;
            ctx.fillStyle = '#c8b890';
            for (var di = 0; di < 5; di++) {
                var da = (di / 5) * Math.PI * 2;
                var dpx = caneX + 3*sc + Math.cos(da) * dustR * 0.8;
                var dpy = caneBot + Math.sin(da) * dustR * 0.3;
                ctx.beginPath(); ctx.arc(dpx, dpy, dustR * 0.38, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        // ── banana handle — polygon arc ───────────────────────────────────────
        // Sample N=16 points along the arc curve as polygon
        var bLen = 22*sc, bH = 9*sc;
        var bGrad = ctx.createLinearGradient(caneX - bLen, handY, caneX + bLen, handY);
        bGrad.addColorStop(0, '#b87a08'); bGrad.addColorStop(0.12, '#f5c800');
        bGrad.addColorStop(0.50, '#ffe84e'); bGrad.addColorStop(0.88, '#f5c800'); bGrad.addColorStop(1, '#b87a08');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        var NB = 16;
        for (var bi = 0; bi <= NB; bi++) {
            var bf = bi / NB;
            var bpx = (caneX - bLen) + bf * bLen * 2;
            // Top arc
            var bpy = handY - bH * 0.95 * Math.sin(bf * Math.PI) + bH * 0.35 * (1 - Math.sin(bf * Math.PI));
            if (bi === 0) ctx.moveTo(bpx, bpy); else ctx.lineTo(bpx, bpy);
        }
        for (bi = NB; bi >= 0; bi--) {
            bf = bi / NB;
            bpx = (caneX - bLen) + bf * bLen * 2;
            // Bottom arc
            bpy = handY + bH * 1.05 * Math.sin(bf * Math.PI) + bH * 0.35 * (1 - Math.sin(bf * Math.PI));
            ctx.lineTo(bpx, bpy);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4a1f06';
        [caneX - bLen, caneX + bLen].forEach(function (tx) {
            ctx.beginPath(); ctx.arc(tx, handY + bH*0.35, 4.5*sc, 0, Math.PI*2); ctx.fill();
        });
        ctx.strokeStyle = 'rgba(150,90,8,0.32)'; ctx.lineWidth = 1.5*sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(caneX - bLen*0.72, handY + 1*sc);
        ctx.quadraticCurveTo(caneX, handY - bH*0.55, caneX + bLen*0.72, handY + 1*sc); ctx.stroke();
        ctx.lineCap = 'butt';

        // ── hands — rounded octagons, Riemann fill ────────────────────────────
        var pR = 14*sc;
        [{ x: caneX - 10*sc, rot: -0.22 }, { x: caneX + 10*sc, rot: 0.22 }].forEach(function (h) {
            var hx = h.x, hy = handY + 6*sc;
            ctx.save(); ctx.translate(hx, hy); ctx.rotate(h.rot); ctx.translate(-hx, -hy);
            ctx.save();
            roundedPolygon(hx, hy, pR, pR * 0.80, 8, 3*sc, 0);
            ctx.clip();
            riemannGrid2D(hx, hy, pR, pR * 0.80, cellSm, '#c03838', LX, LY);
            ctx.restore();
            ctx.strokeStyle = '#7a1f1f'; ctx.lineWidth = 1;
            roundedPolygon(hx, hy, pR, pR * 0.80, 8, 3*sc, 0);
            ctx.stroke();
            // Knuckle lines
            ctx.strokeStyle = 'rgba(180,60,60,0.6)'; ctx.lineWidth = 1*sc; ctx.lineCap = 'round';
            [-4*sc, 0, 4*sc].forEach(function (ox) {
                ctx.beginPath(); ctx.moveTo(hx + ox, hy - pR*0.5); ctx.lineTo(hx + ox, hy + pR*0.5); ctx.stroke();
            });
            ctx.lineCap = 'butt'; ctx.restore();
        });

        // ── head + hat — wrapped in idle head tilt rotation ─────────────────
        ctx.save();
        ctx.translate(cx, neckY);
        ctx.rotate(idle.tiltAngle);
        ctx.translate(-cx, -neckY);

        // ── head — Riemann fill, 16-gon outline, fluffy hexagon halo ─────────
        // Fluffy halo — 16 rounded hexagons ringing the head
        var NF = 16;
        for (var ffi = 0; ffi < NF; ffi++) {
            var ffa = (ffi / NF) * Math.PI * 2;
            var ffx = cx + Math.cos(ffa) * hR * 0.93, ffy = hY + Math.sin(ffa) * hR * 0.93;
            ctx.fillStyle = furLight;
            roundedPolygon(ffx, ffy, hR * 0.15, hR * 0.15, 6, hR * 0.04, ffa);
            ctx.fill();
        }
        // Head body
        ctx.save();
        polygonPath(cx, hY, hR, hR, 16);
        ctx.clip();
        riemannGrid2D(cx, hY, hR, hR, cellSm, '#ede0cc', LX, LY);
        ctx.restore();
        ctx.strokeStyle = furDark; ctx.lineWidth = 1.0*sc;
        polygonPath(cx, hY, hR, hR, 16);
        ctx.stroke();
        // Fur strokes radiating outward
        ctx.strokeStyle = furDark; ctx.lineWidth = 0.8*sc; ctx.lineCap = 'round';
        for (var fri = 0; fri < 22; fri++) {
            var fra = (fri / 22) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(fra)*hR*0.74, hY + Math.sin(fra)*hR*0.74);
            ctx.lineTo(cx + Math.cos(fra)*hR*0.89, hY + Math.sin(fra)*hR*0.89);
            ctx.stroke();
        }
        ctx.lineCap = 'butt';

        // ── ears — rounded hexagons ────────────────────────────────────────────
        [-1, 1].forEach(function (side) {
            var eX = cx + side * hR * 0.96, eY = hY - hR * 0.08;
            ctx.save();
            roundedPolygon(eX, eY, 12*sc, 14*sc, 6, 3*sc, side * 0.22);
            ctx.clip();
            riemannGrid2D(eX, eY, 12*sc, 14*sc, cellSm, '#ede0cc', LX, LY);
            ctx.restore();
            ctx.fillStyle = faceCol;
            roundedPolygon(eX, eY, 7*sc, 9*sc, 6, 2*sc, side * 0.22);
            ctx.fill();
        });

        // ── face — 2D Riemann grid, 14-gon outline ───────────────────────────
        ctx.save();
        polygonPath(cx, hY + hR*0.06, hR*0.72, hR*0.80, 14);
        ctx.clip();
        riemannGrid2D(cx, hY + hR*0.06, hR*0.72, hR*0.80, cellSm, '#d07878', LX, LY);
        ctx.restore();
        ctx.strokeStyle = '#904030'; ctx.lineWidth = 0.8*sc;
        polygonPath(cx, hY + hR*0.06, hR*0.72, hR*0.80, 14);
        ctx.stroke();

        // ── muzzle — rounded octagon ──────────────────────────────────────────
        ctx.save();
        roundedPolygon(cx, hY + hR*0.46, hR*0.36, hR*0.24, 8, 4*sc);
        ctx.clip();
        riemannGrid2D(cx, hY + hR*0.46, hR*0.36, hR*0.24, cellSm, '#d07070', LX, LY);
        ctx.restore();
        ctx.strokeStyle = '#903030'; ctx.lineWidth = 0.7*sc;
        roundedPolygon(cx, hY + hR*0.46, hR*0.36, hR*0.24, 8, 4*sc);
        ctx.stroke();
        // Nostrils
        ctx.fillStyle = '#7a2828';
        [-1, 1].forEach(function (side) {
            roundedPolygon(cx + side*hR*0.11, hY + hR*0.42, 3.2*sc, 2.2*sc, 6, 1*sc);
            ctx.fill();
        });

        // Brow ridge
        ctx.strokeStyle = furDark; ctx.lineWidth = 5*sc; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - hR*0.60, hY - hR*0.15);
        ctx.quadraticCurveTo(cx, hY - hR*0.36, cx + hR*0.60, hY - hR*0.15);
        ctx.stroke();
        ctx.lineCap = 'butt';

        // ── goggles — octagonal lenses ────────────────────────────────────────
        var gR = hR * 0.29, gY = hY - hR * 0.04;
        var gLX = cx - hR * 0.40, gRX = cx + hR * 0.40;
        // Strap lines
        ctx.strokeStyle = '#3a2028'; ctx.lineWidth = 2.5*sc;
        ctx.beginPath(); ctx.moveTo(gLX - gR*0.88, gY - 1*sc); ctx.lineTo(cx - hR*0.86, gY - hR*0.30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gRX + gR*0.88, gY - 1*sc); ctx.lineTo(cx + hR*0.86, gY - hR*0.30); ctx.stroke();
        ctx.lineWidth = 2.8*sc;
        ctx.beginPath(); ctx.moveTo(gLX + gR, gY); ctx.lineTo(gRX - gR, gY); ctx.stroke();
        // Lenses
        [gLX, gRX].forEach(function (gx) {
            // Outer frame — filled octagon
            ctx.fillStyle = '#3a2028';
            roundedPolygon(gx, gY, gR + 3*sc, gR + 3*sc, 8, 2*sc, Math.PI/8);
            ctx.fill();
            // Lens 2D Riemann grid
            ctx.save();
            roundedPolygon(gx, gY, gR, gR, 8, 2*sc, Math.PI/8);
            ctx.clip();
            riemannGrid2D(gx, gY, gR, gR, cellSm, '#120a14', LX, LY);
            ctx.restore();
            ctx.strokeStyle = '#5a3048'; ctx.lineWidth = 1*sc;
            roundedPolygon(gx, gY, gR, gR, 8, 2*sc, Math.PI/8);
            ctx.stroke();
            // Glare
            ctx.globalAlpha = 0.20; ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(gx - gR*0.30, gY - gR*0.30, gR*0.28, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
        });

        // Smirk
        ctx.strokeStyle = 'rgba(80,28,28,0.72)'; ctx.lineWidth = 2.2*sc; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - hR*0.17, hY + hR*0.63);
        ctx.quadraticCurveTo(cx + hR*0.04, hY + hR*0.74, cx + hR*0.26, hY + hR*0.62);
        ctx.stroke();
        ctx.lineCap = 'butt';

        // Blink eyelid — fur-coloured rect sweeps down over each goggle lens
        if (idle.blinkPhase > 0) {
            var blinkP = Math.sin(idle.blinkPhase / 0.18 * Math.PI);
            var lidH   = (gR + 4*sc) * 2 * blinkP;
            [gLX, gRX].forEach(function (gx) {
                ctx.save();
                roundedPolygon(gx, gY, gR + 3*sc, gR + 3*sc, 8, 2*sc, Math.PI/8);
                ctx.clip();
                ctx.fillStyle = furLight;
                ctx.fillRect(gx - (gR + 4*sc), gY - (gR + 4*sc), (gR + 4*sc)*2, lidH);
                ctx.restore();
            });
        }

        // ── bucket hat ────────────────────────────────────────────────────────
        var htY    = hY - hR * 0.60;
        var crWd   = hR * 0.86;
        var crH    = 32 * sc;
        var crTopY = htY - crH;

        // Crown — 2D Riemann grid
        riemannRect2D(cx - crWd, crTopY, crWd*2, crH, cell, '#d0a0be', LX, LY);
        // Crown outline as rect with thin polygon-style corners
        ctx.strokeStyle = '#7a5070'; ctx.lineWidth = 1*sc;
        ctx.strokeRect(cx - crWd, crTopY, crWd*2, crH);
        // Crown top cap — rounded 10-gon
        ctx.save();
        roundedPolygon(cx, crTopY, crWd, 7*sc, 10, 3*sc);
        ctx.clip();
        riemannGrid2D(cx, crTopY, crWd, 7*sc, cell, '#e0c2d2', LX, LY);
        ctx.restore();
        ctx.strokeStyle = '#9a7090'; ctx.lineWidth = 0.8*sc;
        roundedPolygon(cx, crTopY, crWd, 7*sc, 10, 3*sc);
        ctx.stroke();

        // Hat band — 8 alternating strips
        var bandH = 7 * sc;
        for (hi = 0; hi < 8; hi++) {
            ctx.fillStyle = (hi % 2 === 0) ? '#7a4860' : '#5a3448';
            ctx.fillRect(cx - crWd, htY - bandH + hi*(bandH/8), crWd*2, (bandH/8) + 0.5);
        }

        // Flower on band — pentagon petals, hexagon center (rounded polygons)
        var flx = cx - crWd * 0.52, fly2 = htY - bandH * 0.52;
        for (var pi = 0; pi < 5; pi++) {
            var pa = (pi / 5) * Math.PI * 2;
            ctx.fillStyle = '#ff9ec8';
            ctx.save();
            ctx.translate(flx + Math.cos(pa)*4.5*sc, fly2 + Math.sin(pa)*4.5*sc);
            ctx.rotate(pa);
            roundedPolygon(0, 0, 4*sc, 2.5*sc, 5, 1.2*sc);
            ctx.fill();
            ctx.restore();
        }
        ctx.fillStyle = '#ffe878';
        roundedPolygon(flx, fly2, 3.5*sc, 3.5*sc, 6, 1*sc);
        ctx.fill();

        // Brim — Riemann fill, 12-gon outline
        var brimW = crWd + 11*sc;
        var brimH2 = 8*sc;
        ctx.save();
        polygonPath(cx, htY, brimW, brimH2, 12);
        ctx.clip();
        riemannGrid2D(cx, htY, brimW, brimH2, cell, '#c0809a', LX, LY);
        ctx.restore();
        ctx.strokeStyle = 'rgba(100,50,70,0.22)'; ctx.lineWidth = 1;
        polygonPath(cx, htY, brimW, brimH2, 12);
        ctx.stroke();
        // Brim highlight
        ctx.fillStyle = 'rgba(235,185,210,0.22)';
        ctx.beginPath(); ctx.ellipse(cx - brimW*0.22, htY - brimH2*0.12, brimW*0.42, brimH2*0.35, 0, 0, Math.PI*2); ctx.fill();

        ctx.restore(); // end head tilt rotation
    }

    // ── typewriter welcome text ────────────────────────────────────────────────
    function drawWelcome(W, H, t) {
        var msgs = [
            '✨ Welcome to ZYXXYZ’s Whymzykal Wunderland ✨',
            '♥  Games, Art & Magic await within  ♥',
            '♠  Explore at your own wonderful pace  ♠',
            '♦  Something was made here just for you  ♦'
        ];
        var CYCLE = 4.8;
        var idx   = Math.floor(t / CYCLE) % msgs.length;
        var msg   = msgs[idx];
        var prog  = Math.min(1, ((t % CYCLE) / CYCLE) * 2.5);
        var show  = Math.min(msg.length, Math.ceil(msg.length * prog));
        var caret = (show < msg.length && Math.floor(t * 2) % 2) ? '|' : '';
        var fs    = Math.max(11, Math.min(15, W / 46));
        var y     = H - 16;
        ctx.fillStyle = 'rgba(5,0,14,0.64)';
        ctx.fillRect(0, y - fs - 6, W, fs + 22);
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = 'italic ' + fs + 'px \'Comic Sans MS\', cursive';
        ctx.shadowColor = GOLD; ctx.shadowBlur = 14; ctx.fillStyle = GOLD;
        ctx.fillText(msg.substring(0, show) + caret, W / 2, y);
        ctx.shadowBlur = 0;
    }

    requestAnimationFrame(frame);

    var homeBtn = document.getElementById('home-btn');
    if (homeBtn) homeBtn.addEventListener('click', function () { navigateToPage('/'); });
}());
