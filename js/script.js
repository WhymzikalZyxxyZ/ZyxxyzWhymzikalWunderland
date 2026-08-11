'use strict';

// ── PWA & SEO head injection ──────────────────────────────────────────────────
(function injectHead() {
    const head = document.head;

    // Favicon
    if (!document.querySelector('link[rel="icon"]')) {
        const fav = document.createElement('link');
        fav.rel = 'icon'; fav.href = '/favicon.svg'; fav.type = 'image/svg+xml';
        head.appendChild(fav);
    }

    // PWA manifest
    if (!document.querySelector('link[rel="manifest"]')) {
        const mf = document.createElement('link');
        mf.rel = 'manifest'; mf.href = '/manifest.json';
        head.appendChild(mf);
    }

    // Theme-color meta
    if (!document.querySelector('meta[name="theme-color"]')) {
        const tc = document.createElement('meta');
        tc.name = 'theme-color'; tc.content = '#f4a261';
        head.appendChild(tc);
    }

    // Open Graph tags (per-page descriptions)
    const PAGE_META = {
        '/':                                   { desc: 'Games, art, tech projects, and more — ZYXXYZ\'s personal corner of the internet.' },
        '/about':                              { desc: 'Goggles, a suit, a banana cane. Who is ZYXXYZ? The answer is in here somewhere.' },
        '/highlights':                         { desc: 'Five pieces worth ninety seconds — the decisions behind them, and proof they\'re real.' },
        '/resume':                             { desc: 'The person behind ZYXXYZ, on paper — download the résumé or say hello.' },
        '/gamer/games':                        { desc: 'Twelve games, eleven leaderboards. Tetris, Snake, Daedalus, chess, poker, and more.' },
        '/gamer/daedalus':                     { desc: 'Ten mazes. One unbroken run. Escape every level before the Minotaur finds you.' },
        '/virtuoso/virtuoso':                  { desc: 'Art, animations, comics, doodles, crafts, and stories — made by hand and pixel.' },
        '/virtuoso/drawings/doodles':          { desc: 'Browser-based drawing app inspired by Paint.NET — layers, tools, and history.' },
        '/technologist/apps':                  { desc: 'Apps, tools, and deep dives into computers, software, and the way things work.' },
        '/technologist/locator':               { desc: 'Interactive geospatial explorer — search any U.S. city and overlay counties, schools, Superfund sites, and more.' },
        '/technologist/elinal':               { desc: 'Supreme Court opinions decoded — ELINAL explains landmark decisions with clarity, depth, and a voice that makes constitutional law irresistible. Educational only. Not legal advice.' },
        '/community/forum':                    { desc: 'Drop in, say hello, leave a suggestion, or just lurk. All welcome.' },
        '/community/guestbook':                { desc: 'Sign the guestbook and leave your mark on ZYXXYZ\'s Whymzykal Wunderland.' },
        '/blog':                               { desc: 'Updates and behind-the-scenes from ZYXXYZ\'s Whymzykal Wunderland.' },
    };

    const path  = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    const meta  = PAGE_META[path] || { desc: 'ZYXXYZ\'s Whymzykal Wunderland — games, art, tech, and more.' };
    const title = document.title;

    const ogTags = [
        ['og:title',       title],
        ['og:description', meta.desc],
        ['og:url',         window.location.href],
        ['og:type',        'website'],
        ['og:image',       'https://zyxwonderland.xyz/images/logo.png'],
        ['og:site_name',   "ZYXXYZ's Whymzykal Wunderland"],
    ];

    ogTags.forEach(([prop, content]) => {
        if (document.querySelector(`meta[property="${prop}"]`)) return;
        const el = document.createElement('meta');
        el.setAttribute('property', prop); el.setAttribute('content', content);
        head.appendChild(el);
    });

    if (!document.querySelector('meta[name="description"]')) {
        const d = document.createElement('meta');
        d.name = 'description'; d.content = meta.desc;
        head.appendChild(d);
    }
})();

// ── Service worker registration ───────────────────────────────────────────────
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
}

// ── Theme (dark / light) ──────────────────────────────────────────────────────
(function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
})();

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next    = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.textContent = next === 'light' ? '🌙' : '☀️';
        btn.title = next === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    });
}

const NAV_STRUCTURE = [
    { label: 'Home',       href: '/' },
    { label: 'About',      href: '/about' },
    { label: 'Highlights', href: '/highlights' },
    { label: 'Résumé',     href: '/resume' },
    { label: 'Blog',       href: '/blog' },
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
        // Games are naturally choose-one items rather than a browse-a-category
        // list, so only a light 3-way grouping is applied — enough to break
        // up 13 flat entries without over-categorizing.
        label: 'Gamer', href: '/gamer/games',
        children: [
            { label: 'All Games', href: '/gamer/games' },
            {
                group: 'Card Games',
                items: [
                    { label: 'Blackjack',      href: '/gamer/blackjack' },
                    { label: 'Poker',          href: '/gamer/poker' },
                    { label: 'Five Card Draw', href: '/gamer/five-card-draw' },
                    { label: 'Solitaire',      href: '/gamer/solitaire' },
                ],
            },
            {
                group: 'Arcade',
                items: [
                    { label: 'Snake',               href: '/gamer/snake' },
                    { label: 'Tetris',              href: '/gamer/tetris' },
                    { label: 'Pong',                href: '/gamer/pong' },
                    { label: 'Puzzle',              href: '/gamer/puzzle' },
                    { label: 'Rock Paper Scissors', href: '/gamer/rps' },
                ],
            },
            {
                group: 'Strategy & Adventure',
                items: [
                    { label: 'Chess',    href: '/gamer/chess' },
                    { label: 'Checkers', href: '/gamer/checkers' },
                    { label: 'Daedalus', href: '/gamer/daedalus' },
                ],
            },
        ],
    },
    {
        // Mirrors the same categories already used on /technologist/apps so
        // the nav and the hub page read consistently. Also absorbs the site's
        // formerly-flat top-level tool links (Lawyer, Locator, MEND, CHART,
        // Anonymail) instead of leaving them competing for top-bar space, and
        // drops the ELINAL entry that used to be duplicated at both levels.
        label: 'Technologist', href: '/technologist/apps',
        children: [
            { label: 'Apps', href: '/technologist/apps' },
            {
                group: 'Diagnostics & Systems',
                items: [
                    { label: 'BIOS / UEFI',          href: '/technologist/biosuefi' },
                    { label: 'Computer Engineering', href: '/technologist/computerengineering' },
                    { label: 'System Operator',      href: '/technologist/systemoperator' },
                    { label: 'State Machine',        href: '/technologist/state-machine' },
                    { label: 'The Warden',           href: 'https://github.com/WhymzikalZyxxyZ/the-warden/releases', target: '_blank' },
                ],
            },
            {
                group: 'Dev Tools',
                items: [
                    { label: 'Software',     href: '/technologist/software' },
                    { label: 'CodeCollab',   href: '/technologist/code-collab' },
                    { label: 'Schema Diff',  href: '/technologist/schema-diff' },
                    { label: 'Query Plan',   href: '/technologist/query-plan' },
                    { label: 'Rate Limiter', href: '/technologist/rate-limiter' },
                    { label: 'Pipeline',     href: '/technologist/pipeline' },
                    { label: 'The Editor',   href: '/technologist/editor' },
                ],
            },
            {
                group: 'Reference & Learning',
                items: [
                    { label: 'The Calculator',  href: '/technologist/calculator' },
                    { label: 'Sorting Hat',     href: '/technologist/sortinghat' },
                    { label: 'Architect',       href: '/technologist/architect' },
                    { label: 'Prism',           href: '/technologist/prism' },
                    { label: 'Computer Vision', href: '/technologist/computervision' },
                    { label: 'The Investor',    href: '/technologist/investor' },
                    { label: 'The Hacker',      href: '/technologist/hacker' },
                    { label: 'The Medic',       href: '/technologist/medic' },
                ],
            },
            {
                group: 'Privacy & Security',
                items: [
                    { label: 'Anonymail',   href: 'https://mail.zyxwonderland.xyz', target: '_blank' },
                    { label: 'The Locator', href: '/technologist/locator' },
                ],
            },
            {
                group: 'Law & Civic',
                items: [
                    { label: 'ELINAL',     href: '/technologist/elinal' },
                    { label: 'The Lawyer', href: '/technologist/lawyer' },
                ],
            },
            {
                group: 'Health & Wellness',
                items: [
                    { label: 'MEND',  href: 'https://github.com/WhymzikalZyxxyZ/mend/releases', target: '_blank' },
                    { label: 'CHART', href: 'https://github.com/WhymzikalZyxxyZ/chart/releases', target: '_blank' },
                ],
            },
        ],
    },
    {
        label: 'Community', href: '/community/forum',
        children: [
            { label: 'Forum',     href: '/community/forum' },
            { label: 'Guestbook', href: '/community/guestbook' },
            { label: 'Wellness',  href: '/community/wellness' },
        ],
    },
    { label: 'Search', href: '/search' },
];

function buildNavbar() {
    const el = document.querySelector('.navbar, .indexNavbar');
    if (!el) return;

    el.className = 'navbar';
    el.innerHTML = '';

    // Skip-to-content link — inject once at the very top of body
    if (!document.querySelector('.skip-to-content')) {
        const skip = document.createElement('a');
        skip.className = 'skip-to-content';
        skip.href = '#main-content';
        skip.textContent = 'Skip to content';
        document.body.insertBefore(skip, document.body.firstChild);
    }

    // Always place the navbar as the very first child of body (after skip link)
    const skipLink = document.querySelector('.skip-to-content');
    const afterSkip = skipLink ? skipLink.nextSibling : document.body.firstChild;
    if (el !== afterSkip) {
        document.body.insertBefore(el, afterSkip);
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
            if (item.target) { a.target = item.target; a.rel = 'noopener noreferrer'; }
            if (path === item.href || path.endsWith(item.href)) a.classList.add('nav-active');
            linksWrap.appendChild(a);
            return;
        }

        // Children may be plain link items or { group, items } sub-groups
        // (used by the Technologist/Gamer dropdowns to chunk long lists) —
        // flatten to a plain list of links wherever we just need to check
        // hrefs, without needing two parallel code paths for that.
        const flatChildren = item.children.flatMap(c => c.items || [c]);

        const wrap = document.createElement('div');
        const sectionActive = flatChildren.some(c => path === c.href || path.endsWith(c.href));
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
        menu.className = 'nav-dropdown-menu' + (flatChildren.length > 6 ? ' nav-dropdown-menu--wide' : '');

        const appendLink = child => {
            const a = document.createElement('a');
            a.href = child.href;
            a.textContent = child.label;
            if (child.target) { a.target = child.target; a.rel = 'noopener noreferrer'; }
            if (path === child.href || path.endsWith(child.href)) a.classList.add('nav-active');
            menu.appendChild(a);
        };

        item.children.forEach(child => {
            if (child.items) {
                const label = document.createElement('span');
                label.className = 'nav-dropdown-group-label';
                label.textContent = child.group;
                menu.appendChild(label);
                child.items.forEach(appendLink);
                return;
            }
            appendLink(child);
        });
        wrap.appendChild(menu);
        linksWrap.appendChild(wrap);
    });

    el.appendChild(linksWrap);
    linksWrap.addEventListener('click', e => {
        if (e.target.tagName === 'A') el.classList.remove('nav-open');
    });

    const themeBtn = document.createElement('button');
    themeBtn.className = 'theme-toggle';
    const curTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    themeBtn.textContent = curTheme === 'light' ? '🌙' : '☀️';
    themeBtn.title = curTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    themeBtn.addEventListener('click', toggleTheme);
    el.appendChild(themeBtn);

    // Scroll-aware navbar: a touch denser/more opaque once scrolled, so the
    // sticky bar reads as responsive rather than just sitting there.
    // rAF-throttled since scroll fires far more often than a class toggle needs.
    let scrollTicking = false;
    const updateScrolledClass = () => {
        el.classList.toggle('navbar--scrolled', window.scrollY > 40);
        scrollTicking = false;
    };
    window.addEventListener('scroll', () => {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(updateScrolledClass);
    }, { passive: true });
    updateScrolledClass();
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

        // Ensure skip-to-content target exists on every page
        if (!document.getElementById('main-content')) {
            const anchor = document.querySelector('.back-bar') || document.querySelector('.navbar');
            const first  = anchor && anchor.nextElementSibling;
            if (first && !first.id) first.id = 'main-content';
        }

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
