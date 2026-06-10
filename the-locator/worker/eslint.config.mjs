import js      from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        ignores: ['src/__tests__/**'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType:  'module',
            globals:     globals.browser,   // Cloudflare Workers shares the Web API surface
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-console':     'off',
        },
    },
    {
        files: ['src/__tests__/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType:  'module',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
];
