import type { Config } from 'tailwindcss';

export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                ep: {
                    bg:          '#120818',
                    surface:     '#1f1028',
                    'surface-2': '#2a1540',
                    border:      '#3d2050',
                    'border-hi': '#5a3070',
                    rose:        '#e8a0b4',
                    'rose-dim':  '#c47890',
                    champagne:   '#f5c97a',
                    plum:        '#9b59b6',
                    danger:      '#ff6b8a',
                    muted:       '#8a6a9a',
                    text:        '#fdf0f5',
                    'text-dim':  '#c4a8c8',
                    paper:       '#fffdf8',
                    'paper-dim': '#f5f0e8',
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
