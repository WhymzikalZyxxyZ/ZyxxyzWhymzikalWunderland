import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    centsToDisplay,
    totalCosts,
    parseDollarsToCents,
    formatDate,
    daysUntil,
    getTimeLeft,
    calcMetrics,
    buildPayload,
} from '../lib/eventsUtils';
import type { ProjectEvent, EventSale } from '../lib/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<ProjectEvent> = {}): ProjectEvent {
    return {
        id: 'evt-1',
        userId: 'user-1',
        projectId: null,
        name: 'Test Convention',
        date: null,
        endDate: null,
        startTime: null,
        endTime: null,
        location: null,
        address: null,
        attendanceExpected: null,
        attendanceActual: null,
        notes: null,
        costTableCents: 0,
        costHotelCents: 0,
        costGasCents: 0,
        costOtherCents: 0,
        costOtherDescription: null,
        ...overrides,
    };
}

function makeSale(overrides: Partial<EventSale> = {}): EventSale {
    return {
        id: 'sale-1',
        eventId: 'evt-1',
        projectId: 'proj-1',
        userId: 'user-1',
        quantityBrought: 10,
        quantitySold: 5,
        priceCents: 1500,
        notes: null,
        ...overrides,
    };
}

const blankForm = {
    name: '', date: '', endDate: '', startTime: '', endTime: '',
    location: '', address: '',
    attendanceExpected: '', attendanceActual: '',
    notes: '',
    costTableCents: '', costHotelCents: '', costGasCents: '', costOtherCents: '',
    costOtherDescription: '',
};

// ── centsToDisplay ────────────────────────────────────────────────────────────

describe('centsToDisplay()', () => {
    it('formats zero as $0.00', () => {
        expect(centsToDisplay(0)).toBe('$0.00');
    });

    it('formats whole dollars correctly', () => {
        expect(centsToDisplay(500)).toBe('$5.00');
    });

    it('formats cents correctly', () => {
        expect(centsToDisplay(150)).toBe('$1.50');
    });

    it('formats large amounts', () => {
        expect(centsToDisplay(100000)).toBe('$1000.00');
    });

    it('formats negative values (losses)', () => {
        expect(centsToDisplay(-250)).toBe('$-2.50');
    });
});

// ── totalCosts ────────────────────────────────────────────────────────────────

describe('totalCosts()', () => {
    it('returns 0 when all cost fields are 0', () => {
        expect(totalCosts(makeEvent())).toBe(0);
    });

    it('sums all four cost fields', () => {
        const e = makeEvent({
            costTableCents: 5000,
            costHotelCents: 12000,
            costGasCents:   3000,
            costOtherCents: 2500,
        });
        expect(totalCosts(e)).toBe(22500);
    });

    it('handles partial costs', () => {
        expect(totalCosts(makeEvent({ costTableCents: 7500 }))).toBe(7500);
    });
});

// ── parseDollarsToCents ───────────────────────────────────────────────────────

describe('parseDollarsToCents()', () => {
    it('converts a dollar string to cents', () => {
        expect(parseDollarsToCents('5.00')).toBe(500);
    });

    it('handles cents-only values', () => {
        expect(parseDollarsToCents('0.99')).toBe(99);
    });

    it('rounds to nearest cent', () => {
        // 1.555 * 100 = 155.5 → rounds to 156
        expect(parseDollarsToCents('1.555')).toBe(156);
    });

    it('returns 0 for empty string', () => {
        expect(parseDollarsToCents('')).toBe(0);
    });

    it('returns 0 for non-numeric string', () => {
        expect(parseDollarsToCents('abc')).toBe(0);
    });

    it('returns 0 for "0"', () => {
        expect(parseDollarsToCents('0')).toBe(0);
    });

    it('handles integer dollar amounts', () => {
        expect(parseDollarsToCents('25')).toBe(2500);
    });
});

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate()', () => {
    it('returns empty string for null', () => {
        expect(formatDate(null)).toBe('');
    });

    it('formats YYYY-MM-DD as MM/DD/YYYY', () => {
        expect(formatDate('2026-06-21')).toBe('06/21/2026');
    });

    it('preserves leading zeros on month and day', () => {
        expect(formatDate('2026-01-05')).toBe('01/05/2026');
    });

    it('handles December correctly', () => {
        expect(formatDate('2026-12-31')).toBe('12/31/2026');
    });
});

// ── daysUntil ─────────────────────────────────────────────────────────────────

describe('daysUntil()', () => {
    beforeEach(() => {
        // Pin "today" to 2026-06-21 midnight UTC
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-21T12:00:00'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns null for null input', () => {
        expect(daysUntil(null)).toBeNull();
    });

    it('returns 0 for today', () => {
        expect(daysUntil('2026-06-21')).toBe(0);
    });

    it('returns 1 for tomorrow', () => {
        expect(daysUntil('2026-06-22')).toBe(1);
    });

    it('returns 7 for one week away', () => {
        expect(daysUntil('2026-06-28')).toBe(7);
    });

    it('returns a negative number for a past date', () => {
        const days = daysUntil('2026-06-20');
        expect(days).not.toBeNull();
        expect(days!).toBeLessThan(0);
    });
});

// ── getTimeLeft ───────────────────────────────────────────────────────────────

// Helper: format a Date as 'YYYY-MM-DD' in local time
function localDateStr(d: Date) {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
}
// Helper: format a Date as 'HH:MM' in local time
function localTimeStr(d: Date) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

describe('getTimeLeft()', () => {
    // Pin to a local 10:00 AM so all relative offsets are unambiguous regardless of timezone
    const now = new Date(2026, 5, 21, 10, 0, 0); // June 21 2026, 10:00:00 LOCAL

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(now);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns isPast=true when the target is in the past', () => {
        const past = new Date(now.getTime() - 3_600_000); // 1 hour ago
        const result = getTimeLeft(localDateStr(past), localTimeStr(past));
        expect(result.isPast).toBe(true);
        expect(result.days).toBe(0);
        expect(result.hours).toBe(0);
    });

    it('returns isPast=true when diff <= 0', () => {
        // Exactly at now
        const result = getTimeLeft(localDateStr(now), localTimeStr(now));
        expect(result.isPast).toBe(true);
    });

    it('calculates days=1, hours=0, minutes=0 for a target exactly 24h from now', () => {
        const target = new Date(now.getTime() + 86_400_000); // exactly 1 day later
        const result = getTimeLeft(localDateStr(target), localTimeStr(target));
        expect(result.isPast).toBe(false);
        expect(result.days).toBe(1);
        expect(result.hours).toBe(0);
        expect(result.minutes).toBe(0);
        expect(result.seconds).toBe(0);
    });

    it('calculates hours and minutes for a sub-day future event', () => {
        // 2h 30m from now
        const target = new Date(now.getTime() + 2 * 3_600_000 + 30 * 60_000);
        const result = getTimeLeft(localDateStr(target), localTimeStr(target));
        expect(result.isPast).toBe(false);
        expect(result.days).toBe(0);
        expect(result.hours).toBe(2);
        expect(result.minutes).toBe(30);
    });

    it('defaults to midnight local time when no time string is given', () => {
        // midnight tomorrow local = (24 - 10) = 14 hours from local 10:00
        const tomorrow     = new Date(2026, 5, 22, 0, 0, 0);
        const expectedMs   = tomorrow.getTime() - now.getTime();
        const expectedHrs  = Math.floor(expectedMs / 3_600_000);
        const result       = getTimeLeft(localDateStr(tomorrow));
        expect(result.isPast).toBe(false);
        expect(result.days).toBe(0);
        expect(result.hours).toBe(expectedHrs);
    });
});

// ── calcMetrics ───────────────────────────────────────────────────────────────

describe('calcMetrics()', () => {
    it('returns all zeros and nulls for an event with no costs and no sales', () => {
        const m = calcMetrics(makeEvent(), []);
        expect(m.revenue).toBe(0);
        expect(m.costs).toBe(0);
        expect(m.profit).toBe(0);
        expect(m.unitsSold).toBe(0);
        expect(m.avgPriceCents).toBeNull();
        expect(m.breakEven).toBeNull();
        expect(m.marginCents).toBeNull();
    });

    it('calculates revenue correctly from sales', () => {
        const sales = [makeSale({ quantitySold: 5, priceCents: 1000 })];
        const m     = calcMetrics(makeEvent(), sales);
        expect(m.revenue).toBe(5000);
    });

    it('sums revenue across multiple sale entries', () => {
        const sales = [
            makeSale({ id: 's1', quantitySold: 3, priceCents: 1500 }),
            makeSale({ id: 's2', quantitySold: 2, priceCents: 2000 }),
        ];
        const m = calcMetrics(makeEvent(), sales);
        expect(m.revenue).toBe(3 * 1500 + 2 * 2000); // 4500 + 4000 = 8500
    });

    it('calculates profit as revenue minus costs', () => {
        const e     = makeEvent({ costTableCents: 5000 });
        const sales = [makeSale({ quantitySold: 10, priceCents: 1000 })];
        const m     = calcMetrics(e, sales);
        expect(m.costs).toBe(5000);
        expect(m.revenue).toBe(10000);
        expect(m.profit).toBe(5000);
    });

    it('calculates negative profit when costs exceed revenue', () => {
        const e     = makeEvent({ costTableCents: 20000 });
        const sales = [makeSale({ quantitySold: 2, priceCents: 1500 })];
        const m     = calcMetrics(e, sales);
        expect(m.profit).toBe(3000 - 20000); // -17000
    });

    it('returns breakEven=null when there are no sales (avgPriceCents unknown)', () => {
        const e = makeEvent({ costTableCents: 5000 });
        const m = calcMetrics(e, []);
        expect(m.breakEven).toBeNull();
        expect(m.marginCents).toBeNull();
    });

    it('returns breakEven=null when costs are 0 even with sales (metric is meaningless)', () => {
        const sales = [makeSale({ quantitySold: 5, priceCents: 1000 })];
        const m     = calcMetrics(makeEvent(), sales); // no costs
        expect(m.breakEven).toBeNull();
    });

    it('calculates break-even correctly', () => {
        // $50 table fee, books sell for $10 each → need 5 books to break even
        const e     = makeEvent({ costTableCents: 5000 });
        const sales = [makeSale({ quantitySold: 10, priceCents: 1000 })];
        const m     = calcMetrics(e, sales);
        expect(m.breakEven).toBe(5);
    });

    it('rounds break-even up (Math.ceil) when not a whole number', () => {
        // $55 cost, $10/book → ceil(5.5) = 6
        const e     = makeEvent({ costTableCents: 5500 });
        const sales = [makeSale({ quantitySold: 10, priceCents: 1000 })];
        const m     = calcMetrics(e, sales);
        expect(m.breakEven).toBe(6);
    });

    it('calculates per-book margin correctly', () => {
        // 10 books @ $10, $50 cost → cost/book = $5, margin = $10 - $5 = $5 (500 cents)
        const e     = makeEvent({ costTableCents: 5000 });
        const sales = [makeSale({ quantitySold: 10, priceCents: 1000 })];
        const m     = calcMetrics(e, sales);
        expect(m.marginCents).toBe(500);
    });

    it('calculates negative margin when event cost per unit exceeds sale price', () => {
        // 2 books @ $5, $50 cost → cost/book = $25, margin = $5 - $25 = -$20 (-2000 cents)
        const e     = makeEvent({ costTableCents: 5000 });
        const sales = [makeSale({ quantitySold: 2, priceCents: 500 })];
        const m     = calcMetrics(e, sales);
        expect(m.marginCents).toBe(500 - Math.round(5000 / 2)); // 500 - 2500 = -2000
    });

    it('uses quantityBrought from sales, not quantitySold, in units-sold count', () => {
        // Only quantitySold should count toward revenue and unit count
        const sales = [makeSale({ quantityBrought: 20, quantitySold: 8, priceCents: 1000 })];
        const m     = calcMetrics(makeEvent(), sales);
        expect(m.unitsSold).toBe(8);
        expect(m.revenue).toBe(8000);
    });
});

// ── buildPayload ──────────────────────────────────────────────────────────────

describe('buildPayload()', () => {
    it('converts empty form strings to nulls for optional fields', () => {
        const p = buildPayload(blankForm);
        expect(p.date).toBeNull();
        expect(p.endDate).toBeNull();
        expect(p.startTime).toBeNull();
        expect(p.endTime).toBeNull();
        expect(p.location).toBeNull();
        expect(p.address).toBeNull();
        expect(p.notes).toBeNull();
        expect(p.attendanceExpected).toBeNull();
        expect(p.attendanceActual).toBeNull();
        expect(p.costOtherDescription).toBeNull();
    });

    it('preserves the event name', () => {
        const p = buildPayload({ ...blankForm, name: 'Dragon Con' });
        expect(p.name).toBe('Dragon Con');
    });

    it('converts dollar string costs to cents', () => {
        const p = buildPayload({ ...blankForm, costTableCents: '75.00', costHotelCents: '120.50' });
        expect(p.costTableCents).toBe(7500);
        expect(p.costHotelCents).toBe(12050);
    });

    it('parses attendance as integers with radix 10', () => {
        const p = buildPayload({ ...blankForm, attendanceExpected: '1500', attendanceActual: '1200' });
        expect(p.attendanceExpected).toBe(1500);
        expect(p.attendanceActual).toBe(1200);
    });

    it('sets attendance to null when blank', () => {
        const p = buildPayload({ ...blankForm, attendanceExpected: '', attendanceActual: '' });
        expect(p.attendanceExpected).toBeNull();
        expect(p.attendanceActual).toBeNull();
    });

    it('passes through date and time strings unchanged', () => {
        const p = buildPayload({ ...blankForm, date: '2026-09-01', startTime: '09:00', endTime: '17:00' });
        expect(p.date).toBe('2026-09-01');
        expect(p.startTime).toBe('09:00');
        expect(p.endTime).toBe('17:00');
    });

    it('sets zero-cost fields to 0 (not null)', () => {
        const p = buildPayload(blankForm);
        expect(p.costTableCents).toBe(0);
        expect(p.costGasCents).toBe(0);
    });
});
