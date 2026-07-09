import type { Config } from 'tailwindcss';

export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                ep: {
                    // Reference CSS variables so theme-switching repaints Tailwind utilities
                    bg:          'var(--ep-bg)',
                    surface:     'var(--ep-surface)',
                    'surface-2': 'var(--ep-surface-2)',
                    border:      'var(--ep-border)',
                    'border-hi': 'var(--ep-border-hi)',
                    rose:        'var(--ep-rose)',
                    'rose-dim':  'var(--ep-rose-dim)',
                    champagne:   'var(--ep-champagne)',
                    plum:        'var(--ep-plum)',
                    danger:      'var(--ep-danger)',
                    muted:       'var(--ep-muted)',
                    text:        'var(--ep-text)',
                    'text-dim':  'var(--ep-text-dim)',
                    paper:       'var(--ep-paper)',
                    'paper-dim': 'var(--ep-paper-dim)',
                },
            },
            fontFamily: {
                display: ['"Playfair Display"', 'Georgia', 'serif'],
                body:    ['Inter', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'ep-card': '0 4px 24px rgba(232,160,180,0.08)',
                'ep-glow': '0 0 40px rgba(232,160,180,0.15)',
            },
        },
    },
    plugins: [],
} satisfies Config;
