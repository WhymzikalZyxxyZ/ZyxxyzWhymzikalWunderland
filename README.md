# ZYXXYZ's Whymzykal Wunderland

A personal website by Whymzikal Zyxxyz — a self-described novice always willing to learn, built as both a playground and a portfolio.
Live at **[zyxwonderland.xyz](https://zyxwonderland.xyz)**, deployed via GitHub Actions to GitHub Pages.

---

## What's inside

The site is divided into four main sections, each with its own sub-pages.

### Gamer
Fully playable in-browser games, each with a custom JavaScript engine and a Jest test suite.

| Game | Description |
|---|---|
| Blackjack | Classic card game vs. the dealer |
| Checkers | Two-player draught board |
| Chess | Full chess with legal-move enforcement |
| Five-Card Draw | Poker variant with hand evaluation |
| Poker | Texas Hold'em-style card play |
| Pong | Retro two-paddle ball game |
| Puzzle | Sliding tile puzzle |
| Rock Paper Scissors | Instant-result hand game |
| Snake | Growing-snake arcade game |
| Solitaire | Klondike patience card game |
| Tetris | Falling-block puzzle |
| Daedalus | Labyrinth exploration game |

### Virtuoso
Creative tools and galleries for original art, animation, comics, music, crafts, and writing.

| Section | Description |
|---|---|
| Doodle Pad | Freehand drawing canvas with pen, eraser, shapes, colour palette, and PNG export |
| Motion Pictures | Frame-by-frame animation editor with playback, drawing tools, and palette |
| Webcomic | Scrollable webcomic reader backed by a `COMICS` data array |
| Handmade Crafts | Gallery for handmade and crafted works |
| Stories | Original writing and short fiction |
| Adagio / Melody | Music and audio pages |

### Technologist
Demos, tools, and educational material exploring software engineering topics — the largest section, ~29 sub-pages.

| Page | Description |
|---|---|
| Apps | Hub page cataloguing every Technologist tool by category |
| The Calculator | Interactive math curriculum covering Arithmetic → Differential Equations, with inline SVG illustrations for all 35 lessons |
| ELINAL | Supreme Court opinions decoded, built on Claude AI and Cloudflare Workers |
| The Locator | Interactive geospatial explorer — U.S. cities, counties, schools, Superfund sites |
| The Lawyer | Complete LSAT prep — logical reasoning, analytical reasoning, reading comprehension |
| The Editor | In-memory PDF/file editor — merge, split, rotate, compress, nothing stored |
| Anonymail | Disposable AES-256-GCM encrypted inbox, backed by a Cloudflare Worker |
| EPITOME | An author's command center — manuscripts, chapters, characters, commissions |
| The Warden *(external)* | Native Windows diagnostics tool — [its own repo](https://github.com/WhymzikalZyxxyZ/the-warden), downloadable from the site |
| MEND *(external)* | Android app for dietary-restriction-aware meal planning — [its own repo](https://github.com/WhymzikalZyxxyZ/mend) |
| CHART *(external)* | Android SMART on FHIR clinical viewer, demonstrating the OAuth2/PKCE app-launch pattern real EHR systems require — [its own repo](https://github.com/WhymzikalZyxxyZ/chart) |
| + more | Software, Architect, Sorting Hat, Lapis Lazuli, Hacker, Computer Engineering, Computer Vision, Investor, Medic, Pipeline, Prism, Rate Limiter, Schema Diff, State Machine, System Operator, Query Plan, CodeCollab, BIOS/UEFI |

### Community
| Page | Description |
|---|---|
| Forum | Community discussion board with username generator |
| Guestbook | Sign-and-browse guestbook |
| Wellness | Health and wellbeing resources |

---

## Also in this repo

Beyond the four site sections, the repo hosts a **multi-language engine portfolio**: the same chess engine, independently implemented in nine languages (Kotlin, Rust, Go, Python, Swift, C++, Dart, Java, JS/WASM) against a shared test oracle, benchmarked and compared — see [`docs/adr/009-cross-language-engine-strategy.md`](docs/adr/009-cross-language-engine-strategy.md) and the in-site [Language Dashboard](/technologist/lang-compare). It also contains standalone backend services (Anonymail, The Locator, ELINAL) deployed to Cloudflare Workers/Fly.io independently of the static site.

---

## Tech stack

- **Pure HTML / CSS / JavaScript** — no frameworks, no build step
- **Shared navbar** built dynamically by `js/script.js` (`buildNavbar()`) — one change propagates to every page
- **Shared stylesheet** at `css/styles.css` — `wunderBody` dark gradient theme site-wide, with a small design-token system (`:root` in `css/styles.css`) for fonts, spacing, and color
- **Jest** — 490 unit tests across all game engines and utilities (`npm test`)
- **ESLint + stylelint + HTMLHint** — linting for JS, CSS, and HTML (`npm run lint`)
- **GitHub Actions** — CI runs lint and tests on every push; passing builds on `main` deploy to GitHub Pages

---

## Local development

```bash
npm install       # install dev dependencies (Jest, ESLint, stylelint, HTMLHint)
npm run lint      # lint JS, CSS, and HTML
npm test          # run all 490 Jest tests with coverage
```

Open any `.html` file directly in a browser — no server required.

---

## Project structure

```
/
├── index.html              # Homepage
├── about.html
├── css/styles.css          # Global stylesheet
├── js/script.js            # Shared navbar, page transitions, utilities
├── images/                 # Site images and artwork
├── gamer/                  # Game pages + engines
├── virtuoso/               # Creative tools and galleries
│   ├── animations/         # Motion Pictures frame editor
│   ├── audio/
│   ├── comics/
│   ├── crafts/
│   ├── drawings/           # Doodle Pad
│   └── writings/
├── technologist/           # Tech demos and tools
├── community/              # Forum and wellness
└── tests/                  # Jest test suites for all engines
```

---

## Deployment

Pushes to `main` that pass CI are automatically deployed to GitHub Pages at `zyxwonderland.xyz` via the GitHub Actions workflow in `.github/workflows/deploy.yml`. The same workflow also deploys the repo's standalone Cloudflare Workers (Anonymail, The Locator, ELINAL) and the Fly.io-hosted editor service independently of the static site.
