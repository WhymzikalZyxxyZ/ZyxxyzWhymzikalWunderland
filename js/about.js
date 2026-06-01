(function () {
    'use strict';

    var cvs = document.getElementById('aboutCanvas');
    var ctx = cvs.getContext('2d');

    function resize() { cvs.width = cvs.clientWidth; cvs.height = cvs.clientHeight; }
    resize();
    window.addEventListener('resize', resize);

    var GOLD     = '#ffd700';
    var MAGENTA  = '#ff69b4';
    var LAVENDER = '#c084fc';
    var TEAL     = '#5eead4';

    var LIGHT_COLS = [GOLD, MAGENTA, LAVENDER, TEAL, '#ff6b6b', '#74b9ff', '#a8ff78'];
    var SUIT_HEART = '#ff4d6d';
    var SUIT_DIAM  = '#ff9f43';
    var SUIT_SPADE = '#c8d6ff';
    var SUIT_CLUB  = '#5eead4';
    var SUIT_COLS  = { '♠': SUIT_SPADE, '♥': SUIT_HEART, '♦': SUIT_DIAM, '♣': SUIT_CLUB };

    var stars = [];
    for (var i = 0; i < 75; i++) {
        stars.push({ x: Math.random(), y: Math.random() * 0.52, r: Math.random() * 1.6 + 0.3, phase: Math.random() * Math.PI * 2, spd: Math.random() * 0.9 + 0.3 });
    }

    var N_LIGHTS = 24;

    var SUIT_SYMS = ['♠', '♥', '♦', '♣'];
    var floaters = [];
    for (var i = 0; i < 28; i++) {
        var sym = SUIT_SYMS[i % 4];
        floaters.push({ sym: sym, x: Math.random(), y: 0.08 + Math.random() * 0.85, vx: (Math.random() - 0.5) * 0.0014, vy: -(Math.random() * 0.0045 + 0.001), rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.011, size: Math.random() * 14 + 7, alpha: Math.random() * 0.28 + 0.08, phase: Math.random() * Math.PI * 2, col: SUIT_COLS[sym] });
    }

    var flies = [], flyClock = 0;
    var t0 = null, prevT = 0;

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
            if (f.x < -0.06) { f.x = 1.06; }
            if (f.x >  1.06) { f.x = -0.06; }
        });

        flyClock += dt;
        if (flyClock > 0.10) {
            flyClock = 0;
            flies.push({ x: Math.random() * W, y: H * 0.55 + Math.random() * H * 0.35, vx: (Math.random() - 0.5) * 0.55, vy: -(Math.random() * 0.9 + 0.25), r: Math.random() * 2.0 + 0.7, life: 1, col: LIGHT_COLS[Math.floor(Math.random() * LIGHT_COLS.length)] });
        }
        for (var fi = flies.length - 1; fi >= 0; fi--) {
            var ff = flies[fi];
            ff.x += ff.vx + Math.sin(t * 2.2 + fi * 0.9) * 0.45;
            ff.y += ff.vy;
            ff.life -= dt * 0.13;
            if (ff.life <= 0 || ff.y < H * 0.12) { flies.splice(fi, 1); }
        }

        drawBackground(W, H, t);
        drawFairyLights(W, H, t);
        drawStars(W, H, t);
        drawFloaters(W, H, t);
        drawFireflies();
        drawZyxxyz(cx, baseY, sc, t);
        drawWelcome(W, H, t);
        requestAnimationFrame(frame);
    }

    function drawBackground(W, H, t) {
        var sky = ctx.createLinearGradient(0, 0, 0, H * 0.68);
        sky.addColorStop(0, '#180530'); sky.addColorStop(0.28, '#2e0a55');
        sky.addColorStop(0.55, '#6b1848'); sky.addColorStop(0.78, '#b84020'); sky.addColorStop(1, '#e8710a');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * 0.68);
        ctx.fillStyle = '#0c1e0a'; ctx.fillRect(0, H * 0.63, W, H * 0.37);
        var hg = ctx.createRadialGradient(W*0.5, H*0.65, 0, W*0.5, H*0.65, W*0.65);
        hg.addColorStop(0, 'rgba(255,160,40,0.22)'); hg.addColorStop(0.5, 'rgba(200,70,20,0.09)'); hg.addColorStop(1, 'transparent');
        ctx.fillStyle = hg; ctx.fillRect(0, H*0.40, W, H*0.38);
        ctx.fillStyle = '#1a3d1a'; ctx.beginPath(); ctx.moveTo(0, H*0.72);
        ctx.bezierCurveTo(W*0.12, H*0.52, W*0.28, H*0.48, W*0.38, H*0.56);
        ctx.bezierCurveTo(W*0.50, H*0.64, W*0.60, H*0.47, W*0.74, H*0.52);
        ctx.bezierCurveTo(W*0.86, H*0.57, W*0.94, H*0.62, W, H*0.70);
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#235220'; ctx.beginPath(); ctx.moveTo(0, H*0.80);
        ctx.bezierCurveTo(W*0.09, H*0.63, W*0.20, H*0.59, W*0.33, H*0.65);
        ctx.bezierCurveTo(W*0.45, H*0.71, W*0.54, H*0.62, W*0.64, H*0.65);
        ctx.bezierCurveTo(W*0.77, H*0.68, W*0.88, H*0.65, W, H*0.74);
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#164514'; ctx.beginPath(); ctx.moveTo(0, H);
        ctx.lineTo(0, H*0.87);
        ctx.bezierCurveTo(W*0.07, H*0.76, W*0.17, H*0.74, W*0.28, H*0.79);
        ctx.bezierCurveTo(W*0.38, H*0.84, W*0.43, H*0.88, W*0.50, H*0.90);
        ctx.bezierCurveTo(W*0.57, H*0.88, W*0.62, H*0.84, W*0.72, H*0.80);
        ctx.bezierCurveTo(W*0.82, H*0.76, W*0.92, H*0.80, W, H*0.86);
        ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        var hl = ctx.createLinearGradient(0, H*0.58, 0, H*0.82);
        hl.addColorStop(0, 'rgba(255,130,40,0.14)'); hl.addColorStop(1, 'transparent');
        ctx.fillStyle = hl; ctx.fillRect(0, H*0.55, W, H*0.30);
        var mist = ctx.createLinearGradient(0, H*0.80, 0, H);
        mist.addColorStop(0, 'rgba(80,200,100,0.06)'); mist.addColorStop(0.6, 'rgba(60,160,80,0.04)'); mist.addColorStop(1, 'transparent');
        ctx.fillStyle = mist; ctx.fillRect(0, H*0.80, W, H*0.20);
    }

    function drawFairyLights(W, H, t) {
        var wireY = H * 0.07, droop = H * 0.04;
        ctx.strokeStyle = 'rgba(60,40,20,0.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(0, wireY);
        for (var x = 0; x <= W; x += 4) { var frac = x / W; ctx.lineTo(x, wireY + Math.sin(frac * Math.PI) * droop); }
        ctx.stroke();
        for (var li = 0; li < N_LIGHTS; li++) {
            var frac = (li + 0.5) / N_LIGHTS;
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

    function drawStars(W, H, t) {
        stars.forEach(function (s) {
            var a = Math.max(0.04, Math.min(0.95, 0.28 + Math.sin(t * s.spd + s.phase) * 0.55));
            ctx.globalAlpha = a; ctx.fillStyle = '#fff6e8';
            ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    function drawFloaters(W, H, t) {
        floaters.forEach(function (f) {
            var a = f.alpha * (0.6 + Math.sin(t * 1.1 + f.phase) * 0.4);
            ctx.globalAlpha = a; ctx.save(); ctx.translate(f.x * W, f.y * H); ctx.rotate(f.rot);
            ctx.fillStyle = f.col; ctx.font = f.size + 'px serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowColor = f.col; ctx.shadowBlur = 9;
            ctx.fillText(f.sym, 0, 0); ctx.shadowBlur = 0; ctx.restore();
        });
        ctx.globalAlpha = 1;
    }

    function drawFireflies() {
        flies.forEach(function (f) {
            ctx.globalAlpha = f.life * 0.55; ctx.fillStyle = f.col;
            ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = f.life * 0.88; ctx.fillStyle = '#fffde8';
            ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.65, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    // ── ZYXXYZ: macaque in suit, bucket hat, blue shirt, checkered tie, banana cane
    function drawZyxxyz(cx, baseY, sc, t) {
        var bob = Math.sin(t * 1.4) * 2.8 * sc;

        // Core geometry
        var bRX = 50 * sc, bRY = 46 * sc;
        var bY  = baseY + bob - 46 * sc;
        var hR  = 40 * sc;
        var hY  = bY - bRY * 0.72;

        // Colours
        var furLight = '#ede0cc';
        var furMid   = '#d0b890';
        var furDark  = '#9a7850';
        var faceCol  = '#c87060';
        var shirtCol = '#4a7fc0';

        // Cane / hand positions
        var caneX   = cx;
        var handY   = bY - bRY * 0.12;
        var caneBot = baseY + bob + 9 * sc;

        // Shoulder level
        var shlY = bY - bRY * 0.58;

        // ── ground shadow ────────────────────────────────────────────────────
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath(); ctx.ellipse(cx, baseY + bob + 4*sc, bRX*1.12, 9*sc, 0, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;

        // ── furry monkey legs (no pants / no shoes) ──────────────────────────
        ctx.fillStyle = furLight;
        ctx.beginPath(); ctx.ellipse(cx - bRX*0.40, bY + bRY*0.58, 20*sc, 28*sc,  0.10, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + bRX*0.40, bY + bRY*0.58, 20*sc, 28*sc, -0.10, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx - bRX*0.46, baseY + bob - 2*sc, 22*sc, 10*sc, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(cx + bRX*0.46, baseY + bob - 2*sc, 22*sc, 10*sc, 0, 0, Math.PI*2); ctx.fill();
        // Toe bumps
        ctx.fillStyle = furMid;
        [-1, 1].forEach(function (side) {
            var fx = cx + side * bRX * 0.46, fy = baseY + bob - 2*sc;
            [-7*sc, 0, 7*sc].forEach(function (ox) {
                ctx.beginPath(); ctx.arc(fx + ox * side * 0.65, fy - 7*sc, 4*sc, 0, Math.PI*2); ctx.fill();
            });
        });
        // Leg fur strokes
        ctx.strokeStyle = furDark; ctx.lineWidth = 0.9*sc; ctx.lineCap = 'round';
        [-1, 1].forEach(function (side) {
            var lx = cx + side * bRX * 0.40;
            for (var li = 0; li < 5; li++) {
                var ly = bY + bRY * 0.40 + li * 9*sc;
                ctx.beginPath(); ctx.moveTo(lx - 8*sc, ly); ctx.quadraticCurveTo(lx, ly + 4*sc, lx + 8*sc, ly); ctx.stroke();
            }
        });
        ctx.lineCap = 'butt';

        // ── jacket body ──────────────────────────────────────────────────────
        var jacG = ctx.createRadialGradient(cx - bRX*0.28, bY - bRY*0.28, 0, cx, bY, bRX*1.5);
        jacG.addColorStop(0, '#ddb8cc'); jacG.addColorStop(0.5, '#b888a0'); jacG.addColorStop(1, '#7a5070');
        ctx.fillStyle = jacG;
        ctx.beginPath(); ctx.ellipse(cx, bY, bRX, bRY, 0, 0, Math.PI*2); ctx.fill();

        // ── blue dress shirt (V-area between lapels) ─────────────────────────
        ctx.fillStyle = shirtCol;
        ctx.beginPath();
        ctx.moveTo(cx - 14*sc, bY - bRY*0.56);
        ctx.lineTo(cx + 14*sc, bY - bRY*0.56);
        ctx.bezierCurveTo(cx + bRX*0.28, bY + bRY*0.04, cx + bRX*0.12, bY + bRY*0.58, cx, bY + bRY*0.65);
        ctx.bezierCurveTo(cx - bRX*0.12, bY + bRY*0.58, cx - bRX*0.28, bY + bRY*0.04, cx - 14*sc, bY - bRY*0.56);
        ctx.closePath(); ctx.fill();

        // ── checkered tie ────────────────────────────────────────────────────
        var tTop = bY - bRY * 0.50, tBot = bY + bRY * 0.32;
        var tWTop = 9*sc, tWBot = 5*sc;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx - tWTop, tTop);
        ctx.lineTo(cx + tWTop, tTop);
        ctx.lineTo(cx + tWBot, tBot);
        ctx.lineTo(cx, tBot + 9*sc);
        ctx.lineTo(cx - tWBot, tBot);
        ctx.closePath(); ctx.clip();
        var csz = 5.5 * sc;
        var tH  = tBot + 9*sc - tTop + csz;
        var tW2 = tWTop * 2 + 4*sc;
        for (var cr = 0; cr * csz < tH; cr++) {
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

        // ── jacket lapels (drawn over shirt and tie) ──────────────────────────
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

        // ── left arm — JACKET SLEEVE (mauve), fur only at wrist/paw ─────────
        // Drawn after jacket body so sleeve is visually on top of it
        var lShX = cx - bRX * 0.84, lShY = shlY + 5*sc;
        var lHX  = caneX - 10*sc,   lHY  = handY;
        // Sleeve (jacket colour — wide tube)
        var sleeveG = ctx.createLinearGradient(lShX, lShY, lHX, lHY);
        sleeveG.addColorStop(0, '#c898b8');
        sleeveG.addColorStop(0.5, '#a878a0');
        sleeveG.addColorStop(1, '#8a6080');
        ctx.strokeStyle = sleeveG;
        ctx.lineWidth = 27*sc; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(lShX, lShY);
        ctx.bezierCurveTo(cx - bRX*1.18, bY - bRY*0.10, cx - 36*sc, lHY + 8*sc, lHX, lHY);
        ctx.stroke();
        // Sleeve edge shading
        ctx.strokeStyle = 'rgba(60,30,50,0.30)'; ctx.lineWidth = 1.5; ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(lShX, lShY);
        ctx.bezierCurveTo(cx - bRX*1.18, bY - bRY*0.10, cx - 36*sc, lHY + 8*sc, lHX, lHY);
        ctx.stroke();
        // Shirt cuff peek (white strip at wrist end)
        ctx.strokeStyle = '#e8eef8'; ctx.lineWidth = 8*sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(lHX + 8*sc, lHY + 2*sc); ctx.lineTo(lHX - 2*sc, lHY + 6*sc); ctx.stroke();
        // Fur poking out at wrist (small cream arc)
        ctx.strokeStyle = furLight; ctx.lineWidth = 10*sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(lHX + 4*sc, lHY + 4*sc); ctx.lineTo(lHX - 4*sc, lHY + 8*sc); ctx.stroke();
        ctx.lineCap = 'butt';

        // ── right arm — JACKET SLEEVE (mauve) ────────────────────────────────
        var rShX = cx + bRX * 0.84, rShY = shlY + 5*sc;
        var rHX  = caneX + 10*sc,   rHY  = handY;
        var sleeveGR = ctx.createLinearGradient(rShX, rShY, rHX, rHY);
        sleeveGR.addColorStop(0, '#c898b8');
        sleeveGR.addColorStop(0.5, '#a878a0');
        sleeveGR.addColorStop(1, '#8a6080');
        ctx.strokeStyle = sleeveGR;
        ctx.lineWidth = 27*sc; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(rShX, rShY);
        ctx.bezierCurveTo(cx + bRX*1.18, bY - bRY*0.10, cx + 36*sc, rHY + 8*sc, rHX, rHY);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(60,30,50,0.30)'; ctx.lineWidth = 1.5; ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(rShX, rShY);
        ctx.bezierCurveTo(cx + bRX*1.18, bY - bRY*0.10, cx + 36*sc, rHY + 8*sc, rHX, rHY);
        ctx.stroke();
        // Shirt cuff peek
        ctx.strokeStyle = '#e8eef8'; ctx.lineWidth = 8*sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(rHX - 8*sc, rHY + 2*sc); ctx.lineTo(rHX + 2*sc, rHY + 6*sc); ctx.stroke();
        // Fur at wrist
        ctx.strokeStyle = furLight; ctx.lineWidth = 10*sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(rHX - 4*sc, rHY + 4*sc); ctx.lineTo(rHX + 4*sc, rHY + 8*sc); ctx.stroke();
        ctx.lineCap = 'butt';

        // ── cane stick — full length to floor, drawn after arms ───────────────
        // Draw a thicker shadow first so it stands out against the jacket
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 9*sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(caneX + 2*sc, handY + 18*sc); ctx.lineTo(caneX + 6*sc, caneBot + 2*sc); ctx.stroke();
        // Main cane stick
        ctx.strokeStyle = '#8b5a24';
        ctx.lineWidth = 7*sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(caneX, handY + 16*sc); ctx.lineTo(caneX + 3*sc, caneBot); ctx.stroke();
        // Highlight stripe
        ctx.strokeStyle = 'rgba(220,180,130,0.55)';
        ctx.lineWidth = 2*sc;
        ctx.beginPath(); ctx.moveTo(caneX - 1*sc, handY + 18*sc); ctx.lineTo(caneX + 1*sc, caneBot - 4*sc); ctx.stroke();
        ctx.lineCap = 'butt';

        // ── banana handle ─────────────────────────────────────────────────────
        var bLen = 22*sc, bH = 9*sc;
        var bGrad = ctx.createLinearGradient(caneX - bLen, handY, caneX + bLen, handY);
        bGrad.addColorStop(0, '#b87a08'); bGrad.addColorStop(0.12, '#f5c800');
        bGrad.addColorStop(0.50, '#ffe84e'); bGrad.addColorStop(0.88, '#f5c800'); bGrad.addColorStop(1, '#b87a08');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.moveTo(caneX - bLen, handY + bH*0.35);
        ctx.bezierCurveTo(caneX - bLen*0.55, handY - bH*0.95, caneX + bLen*0.55, handY - bH*0.95, caneX + bLen, handY + bH*0.35);
        ctx.bezierCurveTo(caneX + bLen*0.50, handY + bH*1.05, caneX - bLen*0.50, handY + bH*1.05, caneX - bLen, handY + bH*0.35);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,210,0.30)';
        ctx.beginPath(); ctx.ellipse(caneX, handY - bH*0.15, bLen*0.52, bH*0.28, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#4a1f06';
        [caneX - bLen, caneX + bLen].forEach(function (tx) { ctx.beginPath(); ctx.arc(tx, handY + bH*0.35, 4.5*sc, 0, Math.PI*2); ctx.fill(); });
        ctx.strokeStyle = 'rgba(150,90,8,0.32)'; ctx.lineWidth = 1.5*sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(caneX - bLen*0.72, handY + 1*sc); ctx.quadraticCurveTo(caneX, handY - bH*0.55, caneX + bLen*0.72, handY + 1*sc); ctx.stroke();
        ctx.lineCap = 'butt';

        // ── hands / paws (both gripping the banana handle) ────────────────────
        var pR = 14*sc;
        var handCol = '#c03838';
        var handDark = '#7a1f1f';
        ctx.fillStyle = handCol;
        ctx.beginPath(); ctx.ellipse(lHX, handY + 6*sc, pR, pR*0.80, -0.22, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = handDark; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(lHX, handY + 6*sc, pR, pR*0.80, -0.22, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = 'rgba(180,60,60,0.6)'; ctx.lineWidth = 1*sc; ctx.lineCap = 'round';
        [-4*sc, 0, 4*sc].forEach(function (ox) { ctx.beginPath(); ctx.moveTo(lHX + ox, handY + 1*sc); ctx.lineTo(lHX + ox, handY + 11*sc); ctx.stroke(); });

        ctx.fillStyle = handCol;
        ctx.beginPath(); ctx.ellipse(rHX, handY + 6*sc, pR, pR*0.80, 0.22, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = handDark; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(rHX, handY + 6*sc, pR, pR*0.80, 0.22, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = 'rgba(180,60,60,0.6)'; ctx.lineWidth = 1*sc; ctx.lineCap = 'round';
        [-4*sc, 0, 4*sc].forEach(function (ox) { ctx.beginPath(); ctx.moveTo(rHX + ox, handY + 1*sc); ctx.lineTo(rHX + ox, handY + 11*sc); ctx.stroke(); });
        ctx.lineCap = 'butt';

        // ── head — fluffy rounded border using overlapping circles ────────────
        ctx.fillStyle = furLight;
        for (var ffi = 0; ffi < 14; ffi++) {
            var ffa = (ffi / 14) * Math.PI * 2;
            ctx.beginPath(); ctx.arc(cx + Math.cos(ffa)*hR*0.93, hY + Math.sin(ffa)*hR*0.93, hR*0.15, 0, Math.PI*2); ctx.fill();
        }
        ctx.beginPath(); ctx.arc(cx, hY, hR, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = furDark; ctx.lineWidth = 1.0*sc; ctx.lineCap = 'round';
        for (var fi = 0; fi < 22; fi++) {
            var fa = (fi / 22) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(fa)*hR*0.74, hY + Math.sin(fa)*hR*0.74);
            ctx.lineTo(cx + Math.cos(fa)*hR*0.89, hY + Math.sin(fa)*hR*0.89);
            ctx.stroke();
        }
        ctx.lineCap = 'butt';

        // ── ears ──────────────────────────────────────────────────────────────
        [-1, 1].forEach(function (side) {
            var eX = cx + side * hR * 0.96, eY = hY - hR * 0.08;
            ctx.fillStyle = furLight; ctx.beginPath(); ctx.ellipse(eX, eY, 12*sc, 14*sc, side*0.22, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = faceCol;  ctx.beginPath(); ctx.ellipse(eX, eY,  7*sc,  9*sc, side*0.22, 0, Math.PI*2); ctx.fill();
        });

        // ── macaque face ──────────────────────────────────────────────────────
        var faceG = ctx.createRadialGradient(cx, hY + hR*0.04, 0, cx, hY + hR*0.08, hR*0.78);
        faceG.addColorStop(0, '#e08878'); faceG.addColorStop(0.55, faceCol); faceG.addColorStop(1, '#a04040');
        ctx.fillStyle = faceG;
        ctx.beginPath(); ctx.ellipse(cx, hY + hR*0.06, hR*0.72, hR*0.80, 0, 0, Math.PI*2); ctx.fill();

        // Muzzle
        ctx.fillStyle = '#d07070';
        ctx.beginPath(); ctx.ellipse(cx, hY + hR*0.46, hR*0.36, hR*0.24, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#7a2828';
        [-1, 1].forEach(function (side) { ctx.beginPath(); ctx.ellipse(cx + side*hR*0.11, hY + hR*0.42, 3.2*sc, 2.2*sc, 0, 0, Math.PI*2); ctx.fill(); });

        // Brow ridge
        ctx.strokeStyle = furDark; ctx.lineWidth = 5*sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - hR*0.60, hY - hR*0.15); ctx.quadraticCurveTo(cx, hY - hR*0.36, cx + hR*0.60, hY - hR*0.15); ctx.stroke();
        ctx.lineCap = 'butt';

        // ── goggles ───────────────────────────────────────────────────────────
        var gR = hR * 0.29, gY = hY - hR * 0.04;
        var gLX = cx - hR * 0.40, gRX = cx + hR * 0.40;
        ctx.strokeStyle = '#3a2028'; ctx.lineWidth = 2.5*sc;
        ctx.beginPath(); ctx.moveTo(gLX - gR*0.88, gY - 1*sc); ctx.lineTo(cx - hR*0.86, gY - hR*0.30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gRX + gR*0.88, gY - 1*sc); ctx.lineTo(cx + hR*0.86, gY - hR*0.30); ctx.stroke();
        ctx.lineWidth = 2.8*sc;
        ctx.beginPath(); ctx.moveTo(gLX + gR, gY); ctx.lineTo(gRX - gR, gY); ctx.stroke();
        [gLX, gRX].forEach(function (gx) {
            ctx.fillStyle = '#3a2028'; ctx.beginPath(); ctx.arc(gx, gY, gR + 3.0*sc, 0, Math.PI*2); ctx.fill();
            var lG = ctx.createRadialGradient(gx - gR*0.28, gY - gR*0.28, 0, gx, gY, gR);
            lG.addColorStop(0, '#1a0e18'); lG.addColorStop(1, '#080408');
            ctx.fillStyle = lG; ctx.beginPath(); ctx.arc(gx, gY, gR, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 0.20; ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(gx - gR*0.30, gY - gR*0.30, gR*0.28, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
        });

        // Smirk
        ctx.strokeStyle = 'rgba(80,28,28,0.72)'; ctx.lineWidth = 2.2*sc; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cx - hR*0.17, hY + hR*0.63); ctx.quadraticCurveTo(cx + hR*0.04, hY + hR*0.74, cx + hR*0.26, hY + hR*0.62); ctx.stroke();
        ctx.lineCap = 'butt';

        // ── bucket hat — cylindrical crown, short tight brim ─────────────────
        var htY    = hY - hR * 0.60;
        var crWd   = hR * 0.86;
        var crH    = 32 * sc;
        var crTopY = htY - crH;

        // Crown (straight vertical sides = cylindrical bucket hat)
        var hatG = ctx.createLinearGradient(cx, crTopY, cx, htY);
        hatG.addColorStop(0, '#e0c0d0'); hatG.addColorStop(0.40, '#c8849a');
        hatG.addColorStop(0.75, '#b47090'); hatG.addColorStop(1, '#8a5068');
        ctx.fillStyle = hatG;
        ctx.beginPath();
        ctx.moveTo(cx - crWd, htY);
        ctx.lineTo(cx + crWd, htY);
        ctx.lineTo(cx + crWd, crTopY);
        ctx.lineTo(cx - crWd, crTopY);
        ctx.closePath(); ctx.fill();
        // Crown top cap
        ctx.fillStyle = '#e0c2d2';
        ctx.beginPath(); ctx.ellipse(cx, crTopY, crWd, 7*sc, 0, 0, Math.PI*2); ctx.fill();

        // Hat band
        var bandH = 7 * sc;
        ctx.fillStyle = '#7a4860';
        ctx.fillRect(cx - crWd, htY - bandH, crWd * 2, bandH);

        // Flower on band
        var flx = cx - crWd * 0.52, fly2 = htY - bandH * 0.52;
        ctx.fillStyle = '#ff9ec8';
        for (var pi = 0; pi < 5; pi++) {
            var pa = (pi / 5) * Math.PI * 2;
            ctx.beginPath(); ctx.ellipse(flx + Math.cos(pa)*4.5*sc, fly2 + Math.sin(pa)*4.5*sc, 4*sc, 2.5*sc, pa, 0, Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = '#ffe878'; ctx.beginPath(); ctx.arc(flx, fly2, 3.5*sc, 0, Math.PI*2); ctx.fill();

        // Short tight brim (bucket hat — only slightly wider than crown)
        var brimW = crWd + 11*sc;
        var brimH2 = 8*sc;
        ctx.fillStyle = '#c0809a';
        ctx.beginPath(); ctx.ellipse(cx, htY, brimW, brimH2, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'rgba(235,185,210,0.22)';
        ctx.beginPath(); ctx.ellipse(cx - brimW*0.22, htY - brimH2*0.12, brimW*0.42, brimH2*0.35, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'rgba(100,50,70,0.22)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, htY, brimW, brimH2, 0, 0, Math.PI*2); ctx.stroke();
    }

    function drawWelcome(W, H, t) {
        var msgs = [
            '✨ Welcome to ZYXXYZ’s Whymzykal Wunderland ✨',
            '♥  Games, Art & Magic await within  ♥',
            '♠  Explore at your own wonderful pace  ♠',
            '♦  Something was made here just for you  ♦'
        ];
        var CYCLE = 4.8;
        var idx  = Math.floor(t / CYCLE) % msgs.length;
        var msg  = msgs[idx];
        var prog = Math.min(1, ((t % CYCLE) / CYCLE) * 2.5);
        var show = Math.min(msg.length, Math.ceil(msg.length * prog));
        var caret = (show < msg.length && Math.floor(t * 2) % 2) ? '|' : '';
        var fs = Math.max(11, Math.min(15, W / 46));
        var y  = H - 16;
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
