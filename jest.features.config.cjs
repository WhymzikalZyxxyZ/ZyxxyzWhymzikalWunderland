'use strict';
module.exports = {
    testMatch: ['**/tests/worker-*.test.mjs'],
    testEnvironment: 'node',
    transform: {},
    coverageProvider: 'v8',
    collectCoverageFrom: [
        'gateway/worker/src/*.js',
        'collab/worker/src/*.js',
        'status/worker/src/*.js',
    ],
    coverageThreshold: {
        global: {
            lines:      90,
            functions:  90,
            branches:   85,
            statements: 90,
        },
    },
};
