# Anonymail — Cloudflare Worker

Serverless, on-demand backend for Anonymail.  
Starts automatically when someone visits `mail.zyxwonderland.xyz` — no persistent server needed.

## How it works

| Component | Role |
|---|---|
| **Cloudflare Worker** | HTTP router, email handler, rate limiter |
| **Durable Object — MailboxDO** | One instance per address; holds inbox/drafts/sent in memory |
| **Durable Object — RegistryDO** | Singleton; maps bearer token → address |
| **Cloudflare Email Routing** | Catches `*@mail.zyxwonderland.xyz` and calls the Worker's `email()` handler |

Everything is AES-256-GCM encrypted in the DO's memory.  
Nothing is written to disk. When a mailbox expires its alarm fires, all data is cleared, and all WebSocket clients are disconnected.

## Prerequisites

- A Cloudflare account with `mail.zyxwonderland.xyz` added as a zone
- `npm install -g wrangler` (or `npx wrangler`)

## First-time setup

```bash
cd anonymail/worker
npm install
wrangler login
```

### 1 — Create the Durable Object namespaces

```bash
wrangler deploy   # first deploy creates the DO classes
```

Wrangler will print the migration IDs. Accept them.

### 2 — Configure Email Routing in the Cloudflare dashboard

1. Go to **Email → Email Routing** for the `zyxwonderland.xyz` zone
2. Enable Email Routing
3. Add a **catch-all** rule:  
   Action: **Send to Worker** → select `anonymail`
4. Add an **MX record** for `mail.zyxwonderland.xyz` (Cloudflare does this automatically when Email Routing is enabled on a subdomain)

### 3 — (Optional) Enable outbound sending

1. Go to **Email → Email Routing → Send** and verify a sender address
2. Uncomment the `[[send_email]]` block in `wrangler.toml`
3. Re-deploy

## Deploy

```bash
wrangler deploy
```

## Local dev

```bash
wrangler dev
```

The Worker serves the frontend from `../public` and the API at `localhost:8787`.  
Email routing does not work locally — use the `/deliver` internal endpoint for testing.

## Environment variables

All set in `wrangler.toml` `[vars]`:

| Var | Default | Description |
|---|---|---|
| `DOMAIN` | `mail.zyxwonderland.xyz` | The mail domain |
| `TTL_MS` | `3600000` | Mailbox lifetime in ms (max 24 h) |
| `MAX_MAILBOXES` | `500` | Soft capacity limit (best-effort) |
