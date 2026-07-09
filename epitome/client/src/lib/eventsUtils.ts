import type { ProjectEvent, EventSale } from './types';

export function centsToDisplay(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

export function totalCosts(e: ProjectEvent): number {
    return e.costTableCents + e.costHotelCents + e.costGasCents + e.costOtherCents;
}

export function parseDollarsToCents(val: string): number {
    const n = parseFloat(val || '0');
    return isNaN(n) ? 0 : Math.round(n * 100);
}

export function formatDate(d: string | null): string {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y}`;
}

export function daysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const now    = new Date();
    const target = new Date(`${dateStr}T00:00:00`);
    return Math.ceil((target.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
}

export interface TimeLeft {
    days: number; hours: number; minutes: number; seconds: number; isPast: boolean;
}

export function getTimeLeft(dateStr: string, timeStr?: string | null): TimeLeft {
    const dateTime = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00:00`;
    const target   = new Date(dateTime).getTime();
    const diff     = target - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
    return {
        days:    Math.floor(diff / 86_400_000),
        hours:   Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000)  / 60_000),
        seconds: Math.floor((diff % 60_000)      / 1_000),
        isPast:  false,
    };
}

export interface EventMetrics {
    revenue:       number;
    costs:         number;
    profit:        number;
    unitsSold:     number;
    avgPriceCents: number | null;
    breakEven:     number | null;
    marginCents:   number | null;
}

export function calcMetrics(e: ProjectEvent, sales: EventSale[]): EventMetrics {
    const costs     = totalCosts(e);
    const revenue   = sales.reduce((s, r) => s + r.quantitySold * r.priceCents, 0);
    const profit    = revenue - costs;
    const unitsSold = sales.reduce((s, r) => s + r.quantitySold, 0);
    const avgPrice  = unitsSold > 0 ? Math.round(revenue / unitsSold) : null;
    const breakEven = costs > 0 && avgPrice !== null && avgPrice > 0 ? Math.ceil(costs / avgPrice) : null;
    const margin    = avgPrice !== null && unitsSold > 0
        ? avgPrice - Math.round(costs / unitsSold)
        : null;
    return { revenue, costs, profit, unitsSold, avgPriceCents: avgPrice, breakEven, marginCents: margin };
}

export function buildPayload(f: {
    name: string; date: string; endDate: string; startTime: string; endTime: string;
    location: string; address: string; attendanceExpected: string; attendanceActual: string;
    notes: string; costTableCents: string; costHotelCents: string; costGasCents: string;
    costOtherCents: string; costOtherDescription: string;
}) {
    return {
        name:                 f.name,
        date:                 f.date      || null,
        endDate:              f.endDate   || null,
        startTime:            f.startTime || null,
        endTime:              f.endTime   || null,
        location:             f.location  || null,
        address:              f.address   || null,
        attendanceExpected:   f.attendanceExpected ? parseInt(f.attendanceExpected, 10) : null,
        attendanceActual:     f.attendanceActual   ? parseInt(f.attendanceActual,   10) : null,
        notes:                f.notes     || null,
        costTableCents:       parseDollarsToCents(f.costTableCents),
        costHotelCents:       parseDollarsToCents(f.costHotelCents),
        costGasCents:         parseDollarsToCents(f.costGasCents),
        costOtherCents:       parseDollarsToCents(f.costOtherCents),
        costOtherDescription: f.costOtherDescription || null,
    };
}
