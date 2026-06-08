import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals:     true,
        coverage: {
            provider:  'v8',
            reporter:  ['text', 'lcov'],
            thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
            include:   ['src/**/*.js'],
            exclude:   ['src/__tests__/**'],
        },
    },
});
