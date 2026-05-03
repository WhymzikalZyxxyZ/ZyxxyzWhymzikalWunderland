'use strict';

const NAV_STRUCTURE = [
    { label: 'Home',  href: '/index.html' },
    { label: 'About', href: '/about.html' },
    {
        label: 'Virtuoso', href: '/virtuoso/virtuoso.html',
        children: [
            { label: 'Motion Pictures', href: '/virtuoso/animations/motionpictures.html' },
            { label: 'Webcomic',        href: '/virtuoso/comics/webcomic.html' },
            { label: 'Handmade',        href: '/virtuoso/crafts/handmade.html' },
            { label: 'Doodles',         href: '/virtuoso/drawings/doodles.html' },
            { label: 'Stories',         href: '/virtuoso/writings/stories.html' },
        ],
    },
    {
        label: 'Gamer', href: '/gamer/games.html',
        children: [
            { label: 'All Games',           href: '/gamer/games.html' },
            { label: 'Blackjack',           href: '/gamer/blackjack.html' },
            { label: 'Chess',               href: '/gamer/chess.html' },
            { label: 'Checkers',            href: '/gamer/checkers.html' },
            { label: 'Poker',               href: '/gamer/poker.html' },
            { label: 'Five Card Draw',      href: '/gamer/five-card-draw.html' },
            { label: 'Solitaire',           href: '/gamer/solitaire.html' },
            { label: 'Snake',               href: '/gamer/snake.html' },
            { label: 'Tetris',              href: '/gamer/tetris.html' },
            { label: 'Pong',                href: '/gamer/pong.html' },
            { label: 'Puzzle',              href: '/gamer/puzzle.html' },
            { label: 'Rock Paper Scissors', href: '/gamer/rps.html' },
        ],
    },
    {
        label: 'Technologist', href: '/technologist/apps.html',
        children: [
            { label: 'Apps',                 href: '/technologist/apps.html' },
            { label: 'BIOS / UEFI',          href: '/technologist/biosuefi.html' },
            { label: 'Computer Engineering', href: '/technologist/computerengineering.html' },
            { label: 'Computer Vision',      href: '/technologist/computervision.html' },
            { label: 'Software',             href: '/technologist/software.html' },
            { label: 'System Operator',      href: '/technologist/systemoperator.html' },
            { label: 'Sorting Hat',          href: '/technologist/sortinghat.html' },
            { label: 'Architect',            href: '/technologist/architect.html' },
        ],
    },
    {
        label: 'Community', href: '/community/forum.html',
        children: [
            { label: 'Forum',    href: '/community/forum.html' },
            { label: 'Wellness', href: '/community/wellness.html' },
        ],
    },
];

function buildNavbar() {
    const el = document.querySelector('.navbar, .indexNavbar');
    if (!el) return;

    el.className = 'navbar';
    el.innerHTML = '';

    const burger = document.createElement('button');
    burger.className = 'nav-burger';
    burger.setAttribute('aria-label', 'Toggle navigation');
    burger.setAttribute('type', 'button');
    burger.innerHTML = '<span></span><span></span><span></span>';
    burger.addEventListener('click', () => el.classList.toggle('nav-open'));
    el.appendChild(burger);

    const linksWrap = document.createElement('div');
    linksWrap.className = 'nav-links';
    const path = window.location.pathname;

    NAV_STRUCTURE.forEach(item => {
        if (!item.children) {
            const a = document.createElement('a');
            a.className = 'nav-link';
            a.href = item.href;
            a.textContent = item.label;
            if (path === item.href || path.endsWith(item.href)) a.classList.add('nav-active');
            linksWrap.appendChild(a);
            return;
        }

        const wrap = document.createElement('div');
        const sectionActive = item.children.some(c => path === c.href || path.endsWith(c.href));
        wrap.className = 'nav-item nav-dropdown' + (sectionActive ? ' nav-active' : '');

        const toggle = document.createElement('a');
        toggle.className = 'nav-link nav-dropdown-toggle';
        toggle.href = item.href;
        toggle.textContent = item.label;
        wrap.appendChild(toggle);

        const menu = document.createElement('div');
        menu.className = 'nav-dropdown-menu' + (item.children.length > 6 ? ' nav-dropdown-menu--wide' : '');
        item.children.forEach(child => {
            const a = document.createElement('a');
            a.href = child.href;
            a.textContent = child.label;
            if (path === child.href || path.endsWith(child.href)) a.classList.add('nav-active');
            menu.appendChild(a);
        });
        wrap.appendChild(menu);
        linksWrap.appendChild(wrap);
    });

    el.appendChild(linksWrap);
    linksWrap.addEventListener('click', e => {
        if (e.target.tagName === 'A') el.classList.remove('nav-open');
    });
}

function navigateToPage(url) {
    if (!url || typeof url !== 'string') return;
    if (/^[\s ]*(?:javascript|data|vbscript):/i.test(url)) return;
    if (/^\/\//.test(url.trimStart())) return;
    if (typeof document !== 'undefined' && document.body) {
        document.body.classList.add('page-fade-out');
        setTimeout(() => { window.location.href = url; }, 220);
    } else {
        window.location.href = url;
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        buildNavbar();
        document.body.classList.add('page-ready');

        document.addEventListener('click', e => {
            const a = e.target.closest('a[href]');
            if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
            const href = a.getAttribute('href');
            if (!href || href.startsWith('#') || /^(https?:|mailto:|tel:|\/\/)/.test(href)) return;
            e.preventDefault();
            navigateToPage(href);
        });
    });
}

if (typeof module !== 'undefined' && module.exports)
    module.exports = { navigateToPage };
