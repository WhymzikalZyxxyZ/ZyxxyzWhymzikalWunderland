'use strict';

const NAV_STRUCTURE = [
    { label: 'Home',  href: '/' },
    { label: 'About', href: '/about' },
    {
        label: 'Virtuoso', href: '/virtuoso/virtuoso',
        children: [
            { label: 'Motion Pictures', href: '/virtuoso/animations/motionpictures' },
            { label: 'Webcomic',        href: '/virtuoso/comics/webcomic' },
            { label: 'Handmade',        href: '/virtuoso/crafts/handmade' },
            { label: 'Doodles',         href: '/virtuoso/drawings/doodles' },
            { label: 'Stories',         href: '/virtuoso/writings/stories' },
            { label: 'Adagio',          href: '/virtuoso/audio/adagio' },
            { label: 'Melody',          href: '/virtuoso/audio/melody' },
        ],
    },
    {
        label: 'Gamer', href: '/gamer/games',
        children: [
            { label: 'All Games',           href: '/gamer/games' },
            { label: 'Blackjack',           href: '/gamer/blackjack' },
            { label: 'Chess',               href: '/gamer/chess' },
            { label: 'Checkers',            href: '/gamer/checkers' },
            { label: 'Poker',               href: '/gamer/poker' },
            { label: 'Five Card Draw',      href: '/gamer/five-card-draw' },
            { label: 'Solitaire',           href: '/gamer/solitaire' },
            { label: 'Snake',               href: '/gamer/snake' },
            { label: 'Tetris',              href: '/gamer/tetris' },
            { label: 'Pong',                href: '/gamer/pong' },
            { label: 'Puzzle',              href: '/gamer/puzzle' },
            { label: 'Rock Paper Scissors', href: '/gamer/rps' },
            { label: 'Daedalus',            href: '/gamer/daedalus' },
        ],
    },
    {
        label: 'Technologist', href: '/technologist/apps',
        children: [
            { label: 'Apps',                 href: '/technologist/apps' },
            { label: 'BIOS / UEFI',          href: '/technologist/biosuefi' },
            { label: 'Computer Engineering', href: '/technologist/computerengineering' },
            { label: 'Computer Vision',      href: '/technologist/computervision' },
            { label: 'Software',             href: '/technologist/software' },
            { label: 'System Operator',      href: '/technologist/systemoperator' },
            { label: 'Sorting Hat',          href: '/technologist/sortinghat' },
            { label: 'Architect',            href: '/technologist/architect' },
            { label: 'Prism',                href: '/technologist/prism' },
            { label: 'The Investor',         href: '/technologist/investor' },
            { label: 'The Hacker',           href: '/technologist/hacker' },
            { label: 'The Medic',            href: '/technologist/medic' },
            { label: 'Rate Limiter',         href: '/technologist/rate-limiter' },
            { label: 'Query Plan',           href: '/technologist/query-plan' },
            { label: 'State Machine',        href: '/technologist/state-machine' },
            { label: 'Pipeline',             href: '/technologist/pipeline' },
            { label: 'CodeCollab',           href: '/technologist/code-collab' },
            { label: 'Schema Diff',          href: '/technologist/schema-diff' },
            { label: 'The Calculator',       href: '/technologist/calculator' },
            { label: 'The Editor',           href: '/technologist/editor' },
        ],
    },
    { label: 'The Lawyer', href: '/technologist/lawyer' },
    {
        label: 'Community', href: '/community/forum',
        children: [
            { label: 'Forum',    href: '/community/forum' },
            { label: 'Wellness', href: '/community/wellness' },
        ],
    },
];

function buildNavbar() {
    const el = document.querySelector('.navbar, .indexNavbar');
    if (!el) return;

    el.className = 'navbar';
    el.innerHTML = '';

    // Always place the navbar as the very first child of body
    if (el !== document.body.firstElementChild) {
        document.body.insertBefore(el, document.body.firstChild);
    }

    const brand = document.createElement('a');
    brand.className = 'nav-brand';
    brand.href = '/';
    brand.textContent = 'ZYXXYZ';
    el.appendChild(brand);

    const burger = document.createElement('button');
    burger.className = 'nav-burger';
    burger.setAttribute('aria-label', 'Toggle navigation');
    burger.setAttribute('type', 'button');
    burger.innerHTML = '<span></span><span></span><span></span>';
    burger.addEventListener('click', () => {
        el.classList.toggle('nav-open');
        if (!el.classList.contains('nav-open')) {
            el.querySelectorAll('.nav-dropdown-open').forEach(d => d.classList.remove('nav-dropdown-open'));
        }
    });
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
        toggle.addEventListener('click', e => {
            const burger = el.querySelector('.nav-burger');
            if (burger && getComputedStyle(burger).display !== 'none') {
                e.preventDefault();
                const isOpen = wrap.classList.toggle('nav-dropdown-open');
                // Close other open dropdowns
                if (isOpen) {
                    linksWrap.querySelectorAll('.nav-dropdown-open').forEach(d => {
                        if (d !== wrap) d.classList.remove('nav-dropdown-open');
                    });
                }
            }
        });
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

function buildBackLink() {
    const path = window.location.pathname;
    const map = [
        { match: p => p.includes('/gamer/')        && !p.endsWith('/games'),    href: '/gamer/games',         label: '← Games' },
        { match: p => p.includes('/technologist/') && !p.endsWith('/apps'),     href: '/technologist/apps',   label: '← Technologist' },
        { match: p => p.includes('/virtuoso/')     && !p.endsWith('/virtuoso'), href: '/virtuoso/virtuoso',   label: '← Virtuoso' },
        { match: p => p.includes('/community/')    && !p.endsWith('/forum'),    href: '/community/forum',     label: '← Community' },
    ];
    const entry = map.find(m => m.match(path));
    if (!entry) return;
    const bar = document.createElement('div');
    bar.className = 'back-bar';
    const link = document.createElement('a');
    link.className = 'back-bar-link';
    link.href = entry.href;
    link.textContent = entry.label;
    bar.appendChild(link);
    const navbar = document.querySelector('.navbar');
    if (navbar && navbar.nextSibling) {
        document.body.insertBefore(bar, navbar.nextSibling);
    } else {
        document.body.appendChild(bar);
    }
}

function navigateToPage(url) {
    if (!url || typeof url !== 'string') return;
    if (/^[\s ]*(?:javascript|data|vbscript):/i.test(url)) return;
    if (/^\/\//.test(url.trimStart())) return;
    if (typeof document !== 'undefined' && document.body) {
        document.body.classList.add('page-fade-out');
        setTimeout(() => { window.location.href = url; }, 160);
    } else {
        window.location.href = url;
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        buildNavbar();
        buildBackLink();

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
