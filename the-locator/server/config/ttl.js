'use strict';

// Redis TTL in seconds per data source.
// Census/EPA data changes infrequently — cache aggressively.
export const TTL = {
    geocoding:    3_600,       // 1 hour  — city names resolve the same way
    neighborhoods: 86_400,    // 24 hours — Census boundaries change annually
    schools:       86_400,    // 24 hours
    superfund:     21_600,    // 6 hours  — EPA updates as sites are remediated
    population:    86_400,    // 24 hours — ACS estimates released annually
};
