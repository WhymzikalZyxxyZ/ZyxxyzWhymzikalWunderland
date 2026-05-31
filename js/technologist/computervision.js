// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.cv-tab').forEach(t => {
    t.addEventListener('click', () => {
        document.querySelectorAll('.cv-tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.cv-panel').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        document.getElementById('cvtab-' + t.dataset.tab).classList.add('active');
        if (t.dataset.tab === 'practice' && !origLoaded) loadSample('geometric');
    });
});

// ── Accordion ─────────────────────────────────────────────────────────────────
document.querySelectorAll('.cv-q').forEach(q => {
    q.addEventListener('click', () => {
        q.classList.toggle('open');
        q.nextElementSibling.classList.toggle('open');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  PRACTICE LAB
// ═══════════════════════════════════════════════════════════════════════════════
const origCanvas = document.getElementById('cv-orig');
const procCanvas = document.getElementById('cv-proc');
const histCanvas = document.getElementById('cv-hist');
const origCtx    = origCanvas.getContext('2d', {willReadFrequently: true});
const procCtx    = procCanvas.getContext('2d');
const histCtx    = histCanvas.getContext('2d');
const W = origCanvas.width, H = origCanvas.height;
let origLoaded = false;

// ── Sample image generators ───────────────────────────────────────────────────
function genGeometric(ctx) {
    ctx.fillStyle = '#0d0d14'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(100, 90, 60, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(300, 160, 80, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#10b981'; ctx.fillRect(30, 210, 130, 90);
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(350, 40, 90, 130);
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath(); ctx.moveTo(220, 260); ctx.lineTo(160, 310); ctx.lineTo(280, 310); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ec4899'; ctx.beginPath(); ctx.arc(410, 230, 40, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(160, 40); ctx.lineTo(380, 200); ctx.stroke();
}

function genGradient(ctx) {
    const g1 = ctx.createLinearGradient(0, 0, W, H);
    g1.addColorStop(0, '#1e1b4b'); g1.addColorStop(0.5, '#7c3aed'); g1.addColorStop(1, '#f59e0b');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createRadialGradient(W*0.3, H*0.4, 10, W*0.3, H*0.4, 160);
    g2.addColorStop(0, 'rgba(255,255,255,0.7)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
    const g3 = ctx.createRadialGradient(W*0.75, H*0.65, 5, W*0.75, H*0.65, 120);
    g3.addColorStop(0, 'rgba(16,185,129,0.8)'); g3.addColorStop(1, 'rgba(16,185,129,0)');
    ctx.fillStyle = g3; ctx.fillRect(0, 0, W, H);
}

function genChecker(ctx) {
    const sz = 40;
    for (let y = 0; y < H; y += sz) for (let x = 0; x < W; x += sz) {
        ctx.fillStyle = ((x/sz + y/sz) % 2 === 0) ? '#e2e8f0' : '#1e293b';
        ctx.fillRect(x, y, sz, sz);
    }
    ctx.fillStyle = 'rgba(239,68,68,0.7)';
    ctx.beginPath(); ctx.arc(W/2, H/2, 70, 0, Math.PI*2); ctx.fill();
}

function genNoise(ctx) {
    const id = ctx.createImageData(W, H);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
        // Structured noise: smooth base + random grain
        const x = (i/4) % W, y = Math.floor((i/4) / W);
        const base = (Math.sin(x*0.05) * Math.cos(y*0.05) + 1) * 100;
        const noise = Math.random() * 80;
        const v = Math.min(255, base + noise);
        d[i] = v * 0.8; d[i+1] = v * 0.5; d[i+2] = v * 1.1; d[i+3] = 255;
    }
    ctx.putImageData(id, 0, 0);
}

function loadSample(name) {
    switch (name) {
        case 'geometric': genGeometric(origCtx); break;
        case 'gradient':  genGradient(origCtx);  break;
        case 'checker':   genChecker(origCtx);   break;
        case 'noise':     genNoise(origCtx);     break;
    }
    origLoaded = true;
    applyOp();
}

// ── Convolution helper ────────────────────────────────────────────────────────
function convolve(src, w, h, kernel, kSize, scale) {
    const dst = new Uint8ClampedArray(src.length);
    const half = kSize >> 1;
    const sc = scale || 1;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let r = 0, g = 0, b = 0;
            for (let ky = 0; ky < kSize; ky++) for (let kx = 0; kx < kSize; kx++) {
                const py = Math.min(Math.max(y + ky - half, 0), h-1);
                const px = Math.min(Math.max(x + kx - half, 0), w-1);
                const pi = (py * w + px) * 4;
                const kv = kernel[ky * kSize + kx];
                r += src[pi]   * kv;
                g += src[pi+1] * kv;
                b += src[pi+2] * kv;
            }
            const di = (y * w + x) * 4;
            dst[di]   = Math.min(Math.max(r * sc, 0), 255);
            dst[di+1] = Math.min(Math.max(g * sc, 0), 255);
            dst[di+2] = Math.min(Math.max(b * sc, 0), 255);
            dst[di+3] = 255;
        }
    }
    return dst;
}

// ── Gaussian kernel builder ───────────────────────────────────────────────────
function gaussianKernel(sigma) {
    const r = Math.ceil(sigma * 2);
    const kSize = r * 2 + 1;
    const k = new Array(kSize * kSize);
    let sum = 0;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const v = Math.exp(-(x*x + y*y) / (2 * sigma * sigma));
        k[(y+r)*kSize + (x+r)] = v;
        sum += v;
    }
    return {kernel: k.map(v => v/sum), kSize};
}

// ── CV operations ─────────────────────────────────────────────────────────────
function opGrayscale(d) {
    for (let i = 0; i < d.length; i += 4) {
        const v = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
        d[i] = d[i+1] = d[i+2] = v;
    }
}

function opInvert(d) {
    for (let i = 0; i < d.length; i += 4) { d[i] = 255-d[i]; d[i+1] = 255-d[i+1]; d[i+2] = 255-d[i+2]; }
}

function opChannel(d, ch) { // ch: 0=R, 1=G, 2=B
    for (let i = 0; i < d.length; i += 4) {
        const v = d[i + ch];
        d[i] = ch===0?v:0; d[i+1] = ch===1?v:0; d[i+2] = ch===2?v:0;
    }
}

function opThreshold(d, T) {
    for (let i = 0; i < d.length; i += 4) {
        const v = (0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]) > T ? 255 : 0;
        d[i] = d[i+1] = d[i+2] = v;
    }
}

function opHistEq(d, w, h) {
    const hist = new Array(256).fill(0);
    for (let i = 0; i < d.length; i += 4) hist[Math.round(0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2])]++;
    const total = w * h, cdf = new Array(256);
    let acc = 0;
    for (let i = 0; i < 256; i++) { acc += hist[i]; cdf[i] = Math.round((acc / total) * 255); }
    for (let i = 0; i < d.length; i += 4) {
        const gray = Math.round(0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]);
        const eq = cdf[gray];
        d[i] = d[i+1] = d[i+2] = eq;
    }
}

function opBlur(d, w, h, sigma) {
    const {kernel, kSize} = gaussianKernel(sigma);
    const out = convolve(d, w, h, kernel, kSize);
    d.set(out);
}

function opSobel(d, w, h) {
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w*h; i++) gray[i] = 0.299*d[i*4]+0.587*d[i*4+1]+0.114*d[i*4+2];
    const Kx = [-1,0,1,-2,0,2,-1,0,1], Ky = [-1,-2,-1,0,0,0,1,2,1];
    for (let y = 1; y < h-1; y++) for (let x = 1; x < w-1; x++) {
        let gx = 0, gy = 0;
        for (let ky = 0; ky < 3; ky++) for (let kx = 0; kx < 3; kx++) {
            const g = gray[(y+ky-1)*w+(x+kx-1)];
            gx += g * Kx[ky*3+kx]; gy += g * Ky[ky*3+kx];
        }
        const mag = Math.min(Math.sqrt(gx*gx+gy*gy), 255);
        const di = (y*w+x)*4;
        d[di] = d[di+1] = d[di+2] = mag; d[di+3] = 255;
    }
}

function opLaplacian(d, w, h) {
    const K = [0,1,0, 1,-4,1, 0,1,0];
    const gray = new Uint8ClampedArray(d.length);
    for (let i = 0; i < d.length; i += 4) {
        const v = 0.299*d[i]+0.587*d[i+1]+0.114*d[i+2];
        gray[i] = gray[i+1] = gray[i+2] = v; gray[i+3] = 255;
    }
    const out = convolve(gray, w, h, K, 3, 4);
    d.set(out);
}

function opSharpen(d, w, h) {
    const K = [0,-1,0, -1,5,-1, 0,-1,0];
    const out = convolve(d, w, h, K, 3);
    d.set(out);
}

function opEmboss(d, w, h) {
    const K = [-2,-1,0, -1,1,1, 0,1,2];
    const out = convolve(d, w, h, K, 3);
    // shift output to mid-grey for better visibility
    for (let i = 0; i < out.length; i += 4) {
        out[i]   = Math.min(255, out[i]   + 64);
        out[i+1] = Math.min(255, out[i+1] + 64);
        out[i+2] = Math.min(255, out[i+2] + 64);
    }
    d.set(out);
}

function opBrightness(d, brightness, contrast) {
    const f = (259*(contrast+255))/(255*(259-contrast));
    for (let i = 0; i < d.length; i += 4) {
        d[i]   = Math.min(255, Math.max(0, f*(d[i]   - 128) + 128 + brightness));
        d[i+1] = Math.min(255, Math.max(0, f*(d[i+1] - 128) + 128 + brightness));
        d[i+2] = Math.min(255, Math.max(0, f*(d[i+2] - 128) + 128 + brightness));
    }
}

// ── Apply current operation ───────────────────────────────────────────────────
function applyOp() {
    if (!origLoaded) return;
    const op = document.getElementById('cv-op').value;
    const id = origCtx.getImageData(0, 0, W, H);
    const d  = id.data;

    if (op === 'grayscale')   opGrayscale(d);
    else if (op === 'invert') opInvert(d);
    else if (op === 'channel-r') opChannel(d, 0);
    else if (op === 'channel-g') opChannel(d, 1);
    else if (op === 'channel-b') opChannel(d, 2);
    else if (op === 'threshold') opThreshold(d, +document.getElementById('p-thresh').value);
    else if (op === 'histeq')    opHistEq(d, W, H);
    else if (op === 'blur')      opBlur(d, W, H, +document.getElementById('p-blur').value);
    else if (op === 'sobel')     opSobel(d, W, H);
    else if (op === 'laplacian') opLaplacian(d, W, H);
    else if (op === 'sharpen')   opSharpen(d, W, H);
    else if (op === 'emboss')    opEmboss(d, W, H);
    else if (op === 'brightness') opBrightness(d,
        +document.getElementById('p-bright').value,
        +document.getElementById('p-contrast').value);

    procCtx.putImageData(id, 0, 0);
    drawHistogram(id);
}

// ── Histogram ─────────────────────────────────────────────────────────────────
function drawHistogram(imageData) {
    const hw = histCanvas.width, hh = histCanvas.height;
    histCtx.fillStyle = '#0a0a0f'; histCtx.fillRect(0, 0, hw, hh);
    const hist = new Array(256).fill(0);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
        hist[Math.round(0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2])]++;
    }
    const max = Math.max(...hist);
    const bw = hw / 256;
    for (let i = 0; i < 256; i++) {
        const bh = (hist[i] / max) * (hh - 6);
        histCtx.fillStyle = `rgb(${i},${i},${i})`;
        histCtx.fillRect(i * bw, hh - bh, bw + 0.5, bh);
    }
    // axis line
    histCtx.strokeStyle = '#333'; histCtx.lineWidth = 1;
    histCtx.beginPath(); histCtx.moveTo(0, hh-1); histCtx.lineTo(hw, hh-1); histCtx.stroke();
}

// ── Operation descriptions ────────────────────────────────────────────────────
const OP_DESC = {
    none:       'Select an operation above to see a description of what it does and how it works.',
    grayscale:  'Converts colour to a single luminance channel using the perceptual weights Y = 0.299R + 0.587G + 0.114B. These weights reflect that the human eye is most sensitive to green light.',
    invert:     'Subtracts each channel from 255 — turning light pixels dark and vice versa. Equivalent to a photographic negative. Useful for viewing X-rays and certain edge responses.',
    'channel-r': 'Isolates the Red channel: other channels are zeroed out. Shows where red energy is present in the scene — strong in warm-toned areas and skin tones.',
    'channel-g': 'Isolates the Green channel. Green typically contains the most luminance information (why camera sensors use twice as many green pixels — the Bayer pattern).',
    'channel-b': 'Isolates the Blue channel. Blue energy appears in sky, shadows, and cool-toned regions. Weakest contributor to perceived brightness.',
    threshold:   'Binary thresholding classifies each pixel as foreground (white) or background (black) based on its luminance compared to the threshold T. Move the slider to find the natural separation in the histogram.',
    histeq:      'Histogram equalisation redistributes pixel intensities so that the output histogram is flat across 0–255. This stretches low-contrast regions, revealing hidden detail — especially useful in medical and satellite imagery.',
    blur:        'Gaussian blur convolves the image with a Gaussian-weighted kernel. The σ (sigma) parameter controls blur radius. Blurring suppresses high-frequency noise before edge detection — the first step of the Canny algorithm.',
    sobel:       'The Sobel operator estimates the image gradient magnitude √(Gx²+Gy²) using 3×3 derivative kernels. Bright pixels in the output indicate rapid intensity change — i.e., edges. Works on the grayscale version of the image.',
    laplacian:   'The Laplacian operator computes the second derivative of the image, responding strongly to rapid changes in gradient. It detects edges in all directions simultaneously but is sensitive to noise. Here amplified ×4 for visibility.',
    sharpen:     'The sharpening kernel enhances high-frequency detail by subtracting a blurred version from the original: output = original + (original - blurred). Edges and fine textures become more pronounced.',
    emboss:      'The emboss kernel produces a relief-like 3D appearance by computing directional differences across the image. Output is shifted to mid-grey (128) so that flat regions appear grey and edges appear bright or dark.',
    brightness:  'Brightness shifts all pixel values uniformly. Contrast applies a linear stretch/squeeze around the midpoint (128) — positive contrast amplifies the distance from mid-grey, negative contrast compresses it.',
};

// ── UI wiring ─────────────────────────────────────────────────────────────────
document.querySelectorAll('[data-sample]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('[data-sample]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadSample(btn.dataset.sample);
    });
});

document.getElementById('cv-upload').addEventListener('change', function() {
    if (!this.files[0]) return;
    const img = new Image();
    const url = URL.createObjectURL(this.files[0]);
    img.onload = () => {
        origCtx.clearRect(0, 0, W, H);
        // Fit image into canvas maintaining aspect ratio
        const scale = Math.min(W/img.width, H/img.height);
        const dw = img.width*scale, dh = img.height*scale;
        origCtx.fillStyle = '#0d0d14'; origCtx.fillRect(0,0,W,H);
        origCtx.drawImage(img, (W-dw)/2, (H-dh)/2, dw, dh);
        URL.revokeObjectURL(url);
        origLoaded = true;
        document.querySelectorAll('[data-sample]').forEach(b => b.classList.remove('active'));
        applyOp();
    };
    img.src = url;
});

document.getElementById('cv-op').addEventListener('change', function() {
    // Show/hide param panels
    document.querySelectorAll('.cv-param').forEach(p => p.classList.remove('show'));
    if (this.value === 'threshold')  document.getElementById('param-threshold').classList.add('show');
    if (this.value === 'blur')       document.getElementById('param-blur').classList.add('show');
    if (this.value === 'brightness') document.getElementById('param-brightness').classList.add('show');
    document.getElementById('cv-op-desc').textContent = OP_DESC[this.value] || '';
    applyOp();
});

// Slider live-update
['p-thresh','p-blur','p-bright','p-contrast'].forEach(id => {
    const el = document.getElementById(id);
    const val = document.getElementById(id + '-val');
    el.addEventListener('input', () => { val.textContent = el.value; applyOp(); });
});

document.getElementById('cv-reset-op').addEventListener('click', () => {
    document.getElementById('cv-op').value = 'none';
    document.querySelectorAll('.cv-param').forEach(p => p.classList.remove('show'));
    document.getElementById('cv-op-desc').textContent = OP_DESC['none'];
    applyOp();
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadSample('geometric');
