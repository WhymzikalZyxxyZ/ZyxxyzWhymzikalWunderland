/** TypeScript Express API — mirrors python/api and dotnet/api. */
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

const app  = express();
const PORT = Number(process.env.PORT ?? 5060);

const _rawSecret = process.env.JWT_SECRET;
if (!_rawSecret) throw new Error('JWT_SECRET environment variable is required');
const SECRET: string = _rawSecret;

app.use(express.json());

// ── In-memory store ────────────────────────────────────────────────────────
const users  = new Map<string, string>();   // username → scrypt(password)
const scores: {username:string; game:string; value:number; ts:number}[] = [];
const MAX_SCORES = 10_000;
const startTime = Date.now();

// ── Minimal JWT (no deps) ──────────────────────────────────────────────────
function b64url(buf: Buffer) { return buf.toString('base64url'); }

function makeToken(username: string): string {
    const header  = b64url(Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})));
    const payload = b64url(Buffer.from(JSON.stringify({sub:username,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})));
    const sig = b64url(crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest());
    return `${header}.${payload}.${sig}`;
}

function verifyToken(token: string): string | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const [header, payload, sig] = parts;
        const expected = b64url(crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest());
        if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (data.exp < Math.floor(Date.now() / 1000)) return null;
        return data.sub as string;
    } catch { return null; }
}

// ── Password hashing (scrypt) ──────────────────────────────────────────────
function hashPw(pw: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPw(pw: string, stored: string): boolean {
    try {
        const [salt, hash] = stored.split(':');
        if (!salt || !hash) return false;
        const candidate = crypto.scryptSync(pw, salt, 64).toString('hex');
        return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
    } catch { return false; }
}

// ── Auth middleware ────────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
    const auth = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({error:'Unauthorized'}); return; }
    const user = verifyToken(auth.slice(7));
    if (!user) { res.status(401).json({error:'Invalid or expired token'}); return; }
    (req as Request & {username:string}).username = user;
    next();
}

// ── Auth endpoints ─────────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
    const {username='', password=''} = req.body ?? {};
    if (!/^[A-Za-z0-9_-]{2,32}$/.test(username)) { res.status(400).json({error:'Invalid username.'}); return; }
    if (password.length < 8 || password.length > 128) { res.status(400).json({error:'Password must be 8-128 chars.'}); return; }
    if (users.has(username)) { res.status(409).json({error:'Username taken.'}); return; }
    users.set(username, hashPw(password));
    res.status(201).json({token: makeToken(username)});
});

app.post('/api/auth/login', (req, res) => {
    const {username='', password=''} = req.body ?? {};
    const stored = users.get(username);
    if (!stored || !verifyPw(password, stored)) { res.status(401).json({error:'Invalid credentials.'}); return; }
    res.json({token: makeToken(username)});
});

// ── Scores endpoints ───────────────────────────────────────────────────────
app.get('/api/scores', (req, res) => {
    const game  = req.query.game as string | undefined;
    const limit = Math.min(Number(req.query.limit ?? 20), 100);
    const rows  = scores
        .filter(s => !game || s.game === game)
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
    res.json(rows);
});

app.post('/api/scores', requireAuth, (req, res) => {
    const {game='', value} = req.body ?? {};
    if (!game || typeof value !== 'number' || value < 0) { res.status(400).json({error:'game and value (≥0) required.'}); return; }
    const entry = {username: (req as Request & {username:string}).username, game: String(game).slice(0,64), value, ts: Date.now()};
    if (scores.length >= MAX_SCORES) scores.shift();
    scores.push(entry);
    res.status(201).json(entry);
});

// ── Status + health ────────────────────────────────────────────────────────
app.get('/api/status', (_req, res) => {
    res.json([{id:'ts-api',label:'TypeScript Express API',ok:true,latency:0,ts:Date.now(),uptime:Math.min((Date.now()-startTime)/86400000,1)}]);
});

app.get('/health', (_req, res) => res.json({status:'ok'}));

app.listen(PORT, () => console.log(`TypeScript API running on :${PORT}`));
