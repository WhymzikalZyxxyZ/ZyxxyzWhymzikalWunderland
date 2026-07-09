import { defineConfig } from 'vitest/config';
import react            from '@vitejs/plugin-react';
import path             from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment:  'jsdom',
        globals:      true,
        setupFiles:   ['./src/__tests__/setup.ts'],
        coverage: {
            provider:   'v8',
            reporter:   ['text', 'lcov'],
            thresholds: { lines: 90, functions: 85, branches: 80, statements: 90 },
            include:    ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/__tests__/**',
                'src/main.tsx',
                // Pages are integration-heavy — covered via component tests
                'src/pages/**',
                // Context tested implicitly via mocks in component tests
                'src/contexts/**',
                // Route config
                'src/App.tsx',
                // Types only
                'src/lib/types.ts',
            ],
        },
    },
    resolve: {
        alias: { '@': path.resolve(__dirname, './src') },
    },
});
