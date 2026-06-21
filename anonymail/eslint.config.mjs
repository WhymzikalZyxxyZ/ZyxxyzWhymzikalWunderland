import js      from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        files: ['worker/public/js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType:  'module',
            globals: {
                ...globals.browser,
                firebase:       'readonly',
                FIREBASE_READY: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { vars: 'local', argsIgnorePattern: '^_' }],
        },
    },
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType:  'commonjs',
            globals:     globals.node,
        },
        rules: {
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-console':     'off',
            'radix':          'error',
        },
    },
];
