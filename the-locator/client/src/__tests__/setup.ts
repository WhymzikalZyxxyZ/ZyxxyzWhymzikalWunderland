import '@testing-library/jest-dom';
import { vi } from 'vitest';

// MapLibre GL JS requires a WebGL context which jsdom can't provide.
// Mock the entire module so component tests can render without errors.
vi.mock('maplibre-gl', () => {
    const MapMock = vi.fn().mockImplementation(() => ({
        addControl:    vi.fn(),
        remove:        vi.fn(),
        fitBounds:     vi.fn(),
        isStyleLoaded: vi.fn(() => true),
        once:          vi.fn(),
        getBounds:     vi.fn(() => ({
            getWest:  () => -105.1,
            getSouth: () => 39.6,
            getEast:  () => -104.7,
            getNorth: () => 39.9,
        })),
        getSource:  vi.fn(() => null),
        addSource:  vi.fn(),
        getLayer:   vi.fn(() => null),
        addLayer:   vi.fn(),
        on:         vi.fn(),
        removeLayer: vi.fn(),
        removeSource: vi.fn(),
        getCanvas:  vi.fn(() => ({ style: {} })),
    }));

    return {
        default: {
            Map:               MapMock,
            NavigationControl: vi.fn(),
            ScaleControl:      vi.fn(),
        },
        Map:               MapMock,
        NavigationControl: vi.fn(),
        ScaleControl:      vi.fn(),
    };
});
