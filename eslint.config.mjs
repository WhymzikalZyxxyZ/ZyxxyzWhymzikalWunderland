import js from '@eslint/js';
import globals from 'globals';

const ENGINE_FILES = [
    'js/engines/tetris-engine.js',
    'js/engines/snake-engine.js',
    'js/engines/rps-engine.js',
    'js/engines/pong-engine.js',
    'js/engines/puzzle-engine.js',
    'js/engines/chess-engine.js',
    'js/engines/checkers-engine.js',
    'js/engines/card-engine.js',
    'js/engines/blackjack-engine.js',
    'js/engines/solitaire-engine.js',
    'js/engines/poker-engine.js',
    'js/engines/five-card-draw-engine.js',
    'js/community/forum-utils.js',
];

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2021,
            globals: {
                ...globals.browser,
                firebase: 'readonly',
                FIREBASE_READY: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { vars: 'local', argsIgnorePattern: '^_' }],
        },
    },
    {
        files: ENGINE_FILES,
        languageOptions: { globals: globals.node },
    },
    {
        files: ['js/script.js', 'js/username-gen.js'],
        languageOptions: { globals: globals.node },
    },
    {
        files: ['tests/**/*.js'],
        languageOptions: { globals: globals.node },
        rules: { 'no-undef': 'off' },
    },
];
