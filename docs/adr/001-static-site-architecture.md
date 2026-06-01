# ADR-001: Static Site + Edge Worker Architecture

**Date:** 2026-06-01  
**Status:** Accepted  
**Deciders:** Zyxxyz  

---

## Context

The site needs to serve a personal portfolio with interactive tools, games, community features, and a temporary email service. Hosting options range from a traditional server to fully serverless edge deployments. The operator has no dedicated server budget beyond free/low-cost tiers.

## Decision Drivers

- Zero or near-zero hosting cost for the portfolio itself
- No ongoing server maintenance burden
- Dynamic features required: real-time email delivery, community persistence, live games
- Global availability with low latency
- CI/CD must be automatable from GitHub

## Options Considered

### Option A — Traditional VPS (DigitalOcean / Linode)
A Node.js server handles all routing, serves static files, proxies Firebase, and hosts the email service.

**Pros:** Full control, single deployment target, WebSockets trivial  
**Cons:** $5–$12/month minimum, requires uptime monitoring, patching, SSL renewal, no free tier for email

### Option B — Static site (GitHub Pages) + edge functions per feature
Core site is pure HTML/CSS/JS deployed to GitHub Pages via Actions. Dynamic features use purpose-built edge services: Cloudflare Workers for Anonymail, Firebase for community persistence.

**Pros:** Free for the static layer, Cloudflare free tier covers Workers, CI/CD is first-class with Actions, global CDN for static assets, no server to maintain  
**Cons:** Split deployment targets, feature constraints per service (DO needs paid plan for Durable Objects), no single runtime to debug

### Option C — Next.js / Vercel
React-based SSR site on Vercel free tier.

**Pros:** Modern stack, rich ecosystem, good DX  
**Cons:** Framework overhead for a mostly static site, Vercel free tier has function invocation limits, introduces build complexity, React is unnecessary for simple DOM pages

## Decision

**Chosen option: Option B** — static site on GitHub Pages with edge workers per dynamic feature. The static layer is free indefinitely and requires no maintenance; dynamic needs are small enough to fit purpose-built edge services without a general-purpose server.

## Consequences

**Positive:**
- Zero hosting cost for the primary site
- GitHub Actions provides full CI (lint, test, deploy) on every push to `main`
- Cloudflare edge network serves Anonymail with sub-50ms cold starts globally
- No server patching, SSL management, or uptime monitoring required

**Negative / accepted tradeoffs:**
- Durable Objects (required by Anonymail) are behind a $5/month Workers Paid plan — accepted cost for production, deferred during development
- Split deployment surface means a deploy can partially succeed (Pages up, Worker down)
- No shared runtime: debugging requires separate tooling for the browser, Worker, and Firebase

**Risks:**
- GitHub Pages and Cloudflare are both third-party platforms; SLA depends on them
- Firebase free tier (Spark) has limits on simultaneous connections and storage

## Notes

- See `ADR-002` for the Anonymail storage decision
- See `ADR-003` for the Firebase community features decision
- CI/CD pipeline: `.github/workflows/deploy.yml`
- DESIGN.md documents the full infrastructure topology
