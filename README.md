# ZYXXYZ's Whymzykal Wunderland

A personal website by Whymzikal Zyxxyz — a self-described novice always willing to learn.
Live at **[zyxwonderland.xyz](https://zyxwonderland.xyz)**, deployed via GitHub Actions and hosted on Porkbun FTP.

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
Demos, tools, and educational material exploring software engineering topics.

| Page | Description |
|---|---|
| The Calculator | Interactive math curriculum covering Arithmetic → Differential Equations, with inline SVG illustrations for all 35 lessons |
| Software | Overview of software projects and interests |
| Architect | System design and architecture concepts |
| Sorting Hat | Sorting algorithm visualiser |
| Lapis Lazuli | Data and database explorations |
| Hacker | Security and CTF topics |
| Computer Engineering | Hardware and low-level computing |
| Computer Vision | Image processing and CV concepts |
| Investor | Finance and investment tools |
| Medic | Health-tech explorations |
| + more | Pipeline, Prism, Rate Limiter, Schema Diff, State Machine, System Operator, Query Plan, Code Collab, BIOS/UEFI, Apps |

### Community
| Page | Description |
|---|---|
| Forum | Community discussion board with username generator |
| Wellness | Health and wellbeing resources |

---

## Tech stack

- **Pure HTML / CSS / JavaScript** — no frameworks, no build step
- **Shared navbar** built dynamically by `js/script.js` (`buildNavbar()`) — one change propagates to every page
- **Shared stylesheet** at `css/styles.css` — `wunderBody` dark gradient theme site-wide
- **Jest** — 466 unit tests across all game engines and utilities (`npm test`)
- **ESLint + stylelint + HTMLHint** — linting for JS, CSS, and HTML (`npm run lint`)
- **GitHub Actions** — CI runs lint and tests on every push; passing builds deploy to Porkbun FTP

---

## Local development

```bash
npm install       # install dev dependencies (Jest, ESLint, stylelint, HTMLHint)
npm run lint      # lint JS, CSS, and HTML
npm test          # run all 466 Jest tests with coverage
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

Pushes to `main` that pass CI are automatically FTP-deployed to `zyxwonderland.xyz` via the GitHub Actions workflow in `.github/workflows/deploy.yml`.
