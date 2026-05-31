'use strict';

// ── Search index ──────────────────────────────────────────────────────────────
const INDEX = [
    // Gamer
    { section:'Gamer', title:'All Games',       href:'/gamer/games',       desc:'Browse all twelve games including Tetris, Snake, Daedalus, chess, poker, and more.' },
    { section:'Gamer', title:'Daedalus',         href:'/gamer/daedalus',    desc:'Ten-level maze game. Escape every level before the Minotaur finds you. Global leaderboard.' },
    { section:'Gamer', title:'Tetris',           href:'/gamer/tetris',      desc:'Classic Tetris. Stack tetrominoes, clear lines, beat your high score.' },
    { section:'Gamer', title:'Snake',            href:'/gamer/snake',       desc:'Classic Snake game. Eat, grow, survive.' },
    { section:'Gamer', title:'Chess',            href:'/gamer/chess',       desc:'Play chess against an AI opponent.' },
    { section:'Gamer', title:'Checkers',         href:'/gamer/checkers',    desc:'Classic draughts/checkers game.' },
    { section:'Gamer', title:'Blackjack',        href:'/gamer/blackjack',   desc:'Beat the dealer in blackjack. Hit, stand, double down.' },
    { section:'Gamer', title:'Poker',            href:'/gamer/poker',       desc:'Texas Hold\'em poker.' },
    { section:'Gamer', title:'Five Card Draw',   href:'/gamer/five-card-draw', desc:'Five card draw poker game.' },
    { section:'Gamer', title:'Solitaire',        href:'/gamer/solitaire',   desc:'Klondike Solitaire card game.' },
    { section:'Gamer', title:'Pong',             href:'/gamer/pong',        desc:'Classic Pong — two paddles, one ball.' },
    { section:'Gamer', title:'Jigsaw Puzzle',    href:'/gamer/puzzle',      desc:'Jigsaw puzzle with interlocking bezier-shaped pieces. Choose your piece count.' },
    { section:'Gamer', title:'Rock Paper Scissors', href:'/gamer/rps',     desc:'Rock Paper Scissors against the computer.' },

    // Virtuoso
    { section:'Virtuoso', title:'Virtuoso Hub',    href:'/virtuoso/virtuoso',  desc:'Art, animations, comics, music, doodles, crafts, and stories.' },
    { section:'Virtuoso', title:'Motion Pictures', href:'/virtuoso/animations/motionpictures', desc:'Animations and motion art by ZYXXYZ.' },
    { section:'Virtuoso', title:'Webcomic',        href:'/virtuoso/comics/webcomic', desc:'Original webcomic panels by ZYXXYZ.' },
    { section:'Virtuoso', title:'Handmade',        href:'/virtuoso/crafts/handmade', desc:'Handmade crafts and physical creations.' },
    { section:'Virtuoso', title:'Doodle Pad',      href:'/virtuoso/drawings/doodles', desc:'Browser-based drawing app — Paint.NET style with layers, tools, and history.' },
    { section:'Virtuoso', title:'Stories',         href:'/virtuoso/writings/stories', desc:'Original short stories and writing by ZYXXYZ.' },
    { section:'Virtuoso', title:'Adagio',          href:'/virtuoso/audio/adagio', desc:'Audio and music compositions.' },
    { section:'Virtuoso', title:'Melody',          href:'/virtuoso/audio/melody', desc:'More original music and melodies.' },

    // Technologist
    { section:'Technologist', title:'Apps Hub',      href:'/technologist/apps', desc:'All tools and tech demos by ZYXXYZ.' },
    { section:'Technologist', title:'Calculator',    href:'/technologist/calculator', desc:'Advanced calculator app.' },
    { section:'Technologist', title:'The Editor',    href:'/technologist/editor', desc:'In-browser text/code editor.' },
    { section:'Technologist', title:'Sorting Hat',   href:'/technologist/sortinghat', desc:'Interactive sorting hat experience.' },
    { section:'Technologist', title:'Architect',     href:'/technologist/architect', desc:'Software architecture diagram tool.' },
    { section:'Technologist', title:'Prism',         href:'/technologist/prism', desc:'Prism colour and light tool.' },
    { section:'Technologist', title:'The Investor',  href:'/technologist/investor', desc:'Investment and finance simulator.' },
    { section:'Technologist', title:'The Hacker',    href:'/technologist/hacker', desc:'Hacker simulation and terminal.' },
    { section:'Technologist', title:'The Medic',     href:'/technologist/medic', desc:'Medical information and tools.' },
    { section:'Technologist', title:'Rate Limiter',  href:'/technologist/rate-limiter', desc:'Interactive rate limiter demo.' },
    { section:'Technologist', title:'Query Plan',    href:'/technologist/query-plan', desc:'SQL query plan visualiser.' },
    { section:'Technologist', title:'State Machine', href:'/technologist/state-machine', desc:'Visual state machine builder.' },
    { section:'Technologist', title:'Pipeline',      href:'/technologist/pipeline', desc:'Data pipeline visualiser.' },
    { section:'Technologist', title:'CodeCollab',    href:'/technologist/code-collab', desc:'Collaborative code editor.' },
    { section:'Technologist', title:'Schema Diff',   href:'/technologist/schema-diff', desc:'Database schema diff tool.' },
    { section:'Technologist', title:'Computer Vision', href:'/technologist/computervision', desc:'Computer vision demos and explanations.' },
    { section:'Technologist', title:'BIOS / UEFI',   href:'/technologist/biosuefi', desc:'BIOS and UEFI explainer and simulator.' },
    { section:'Technologist', title:'The Lawyer',    href:'/technologist/lawyer', desc:'Legal document and terms explainer.' },

    // Community
    { section:'Community', title:'Forum',      href:'/community/forum',     desc:'Live chat forum — say hello, leave a suggestion, or just lurk.' },
    { section:'Community', title:'Guestbook',  href:'/community/guestbook', desc:'Sign the guestbook and leave your mark on the wunderland.' },
    { section:'Community', title:'Wellness',   href:'/community/wellness',  desc:'Wellness resources and mindfulness tools.' },

    // Meta
    { section:'Site', title:'Home',   href:'/',       desc:'ZYXXYZ\'s Whymzykal Wunderland — games, art, tech, and more.' },
    { section:'Site', title:'About',  href:'/about',  desc:'Who is ZYXXYZ? Goggles, a suit, a banana cane. The answer is in here.' },
    { section:'Site', title:'Blog',   href:'/blog',   desc:'Updates and behind-the-scenes from ZYXXYZ.' },
    { section:'Site', title:'Search', href:'/search', desc:'Search across all games, tools, and content.' },
];

// ── Search logic ──────────────────────────────────────────────────────────────
function highlight(text, query) {
    if (!query) return esc(text);
    const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
    return esc(text).replace(re, '<mark>$1</mark>');
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function search(q) {
    if (!q) return [];
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return INDEX.filter(item => {
        const hay = (item.title + ' ' + item.desc + ' ' + item.section).toLowerCase();
        return terms.every(t => hay.includes(t));
    }).sort((a, b) => {
        // Boost title matches
        const aTitleMatch = terms.some(t => a.title.toLowerCase().includes(t));
        const bTitleMatch = terms.some(t => b.title.toLowerCase().includes(t));
        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;
        return 0;
    });
}

function renderResults(results, q) {
    const container = document.getElementById('search-results');
    const stats     = document.getElementById('search-stats');

    if (!results.length) {
        container.innerHTML = `<div class="search-empty">No results for "${esc(q)}".</div>`;
        stats.textContent = '';
        return;
    }

    stats.textContent = results.length + ' result' + (results.length !== 1 ? 's' : '') + ' for "' + q + '"';
    container.innerHTML = results.map(r => `
        <a class="result-item" href="${r.href}">
            <div class="result-section">${esc(r.section)}</div>
            <div class="result-title">${highlight(r.title, q)}</div>
            <div class="result-desc">${highlight(r.desc, q)}</div>
        </a>
    `).join('');
}

// ── Wire up ───────────────────────────────────────────────────────────────────
const input = document.getElementById('search-input');
const btn   = document.getElementById('search-btn');

function doSearch() {
    const q = input.value.trim();
    document.getElementById('search-hint').style.display = q ? 'none' : '';
    if (!q) { document.getElementById('search-results').innerHTML = ''; document.getElementById('search-stats').textContent = ''; return; }
    renderResults(search(q), q);
}

btn.addEventListener('click', doSearch);
input.addEventListener('input', doSearch);
input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

// Hint links
document.querySelectorAll('#search-hint a[data-q]').forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault();
        input.value = a.dataset.q;
        doSearch();
    });
});

// Pre-fill from URL ?q=
const urlQ = new URLSearchParams(window.location.search).get('q');
if (urlQ) { input.value = urlQ; doSearch(); }
