import { defineConfig } from 'vitest/config';
import react           from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        environment:  'jsdom',
        globals:      true,
        setupFiles:   ['./src/__tests__/setup.ts'],
        coverage: {
            provider:   'v8',
            reporter:   ['text', 'lcov'],
            thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
            include:    ['src/**/*.{ts,tsx}'],
            // Map.tsx wraps maplibre-gl (WebGL) — untestable in jsdom; excluded from threshold
            exclude:    ['src/__tests__/**', 'src/main.tsx', 'src/types/**', 'src/components/Map.tsx'],
        },
    },
});
