import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plus, Trash2, Pencil, X, ChevronDown, ChevronRight,
    TrendingUp, TrendingDown, Minus, AlertTriangle, Clock,
    MapPin, Users, BookOpen,
} from 'lucide-react';
import { api }          from '@/lib/api';
import type { ProjectEvent, EventSale, Project } from '@/lib/types';
import {
    centsToDisplay, totalCosts, parseDollarsToCents, formatDate,
    daysUntil, getTimeLeft, calcMetrics, buildPayload,
} from '@/lib/eventsUtils';
import type { TimeLeft } from '@/lib/eventsUtils';

// ── Countdown hook ────────────────────────────────────────────────────────────

function useCountdown(dateStr: string | null, timeStr?: string | null): TimeLeft | null {
    const [tl, setTl] = useState<TimeLeft | null>(() =>
        dateStr ? getTimeLeft(dateStr, timeStr) : null
    );
    const tick = useCallback(() => {
        setTl(dateStr ? getTimeLeft(dateStr, timeStr) : null);
    }, [dateStr, timeStr]);

    useEffect(() => {
        if (!dateStr) { setTl(null); return; }
        tick();
        const id = setInterval(tick, 1_000);
        return () => clearInterval(id);
    }, [dateStr, tick]);

    return tl;
}

// ── Form types ────────────────────────────────────────────────────────────────

const blankForm = {
    name: '', date: '', endDate: '', startTime: '', endTime: '',
    location: '', address: '',
    attendanceExpected: '', attendanceActual: '',
    notes: '',
    costTableCents: '', costHotelCents: '', costGasCents: '', costOtherCents: '', costOtherDescription: '',
};
type FormShape = typeof blankForm;

// ── Main page ─────────────────────────────────────────────────────────────────

export function EventsPage() {
    const qc = useQueryClient();

    const [creating,   setCreating]   = useState(false);
    const [createForm, setCreateForm] = useState<FormShape>(blankForm);
    const [editId,     setEditId]     = useState<string | null>(null);
    const [editForm,   setEditForm]   = useState<FormShape>(blankForm);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [deleteId,   setDeleteId]   = useState<string | null>(null);
    const [addingSale, setAddingSale] = useState<string | null>(null);
    const [saleForm,   setSaleForm]   = useState({ projectId: '', quantityBrought: '', quantitySold: '', priceCents: '', notes: '' });
    const [pageError,  setPageError]  = useState<string | null>(null);

    const { data: events = [], isLoading } = useQuery<ProjectEvent[]>({
        queryKey: ['events'],
        queryFn:  () => api.get('/events'),
    });

    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn:  () => api.get('/projects'),
    });

    // queryKey includes event IDs so it re-runs whenever events change
    const eventIds = events.map(e => e.id).sort().join(',');
    const { data: eventSalesMap = {}, isSuccess: salesLoaded } = useQuery<Record<string, EventSale[]>>({
        queryKey: ['event-sales-all', eventIds],
        queryFn:  async () => {
            const result: Record<string, EventSale[]> = {};
            await Promise.all(events.map(async e => {
                result[e.id] = await api.get<EventSale[]>(`/events/${e.id}/sales`);
            }));
            return result;
        },
        enabled: events.length > 0,
    });

    // Derive upcoming events (within 7 days, not past)
    const upcomingEvents = events.filter(e => {
        if (!e.date) return false;
        const d = daysUntil(e.date);
        return d !== null && d >= 0 && d <= 7;
    }).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

    // Aggregate P&L across all events
    const aggregate = events.reduce(
        (acc, e) => {
            const m = calcMetrics(e, eventSalesMap[e.id] ?? []);
            return { revenue: acc.revenue + m.revenue, costs: acc.costs + m.costs, profit: acc.profit + m.profit };
        },
        { revenue: 0, costs: 0, profit: 0 },
    );

    function invalidateSalesMap() {
        qc.invalidateQueries({ queryKey: ['event-sales-all'] });
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    const createMut = useMutation({
        mutationFn: () => api.post<ProjectEvent>('/events', buildPayload(createForm)),
        onSuccess:  (e) => {
            qc.setQueryData<ProjectEvent[]>(['events'], prev => [e, ...(prev ?? [])]);
            invalidateSalesMap();
            setCreating(false);
            setCreateForm(blankForm);
        },
        onError: (e: Error) => setPageError(e.message),
    });

    const patchMut = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: ReturnType<typeof buildPayload> }) =>
            api.patch<ProjectEvent>(`/events/${id}`, payload),
        onSuccess: (e) => {
            qc.setQueryData<ProjectEvent[]>(['events'], prev => prev?.map(x => x.id === e.id ? e : x) ?? []);
            setEditId(null);
        },
        onError: (e: Error) => setPageError(e.message),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => api.delete(`/events/${id}`),
        onSuccess:  (_, id) => {
            qc.setQueryData<ProjectEvent[]>(['events'], prev => prev?.filter(x => x.id !== id) ?? []);
            invalidateSalesMap();
            setDeleteId(null);
        },
        onError: (e: Error) => setPageError(e.message),
    });

    const addSaleMut = useMutation({
        mutationFn: (eventId: string) => api.post<EventSale>(`/events/${eventId}/sales`, {
            projectId:       saleForm.projectId,
            quantityBrought: parseInt(saleForm.quantityBrought) || 0,
            quantitySold:    parseInt(saleForm.quantitySold)    || 0,
            priceCents:      parseDollarsToCents(saleForm.priceCents),
            notes:           saleForm.notes || null,
        }),
        onSuccess: () => {
            invalidateSalesMap();
            setAddingSale(null);
            setSaleForm({ projectId: '', quantityBrought: '', quantitySold: '', priceCents: '', notes: '' });
        },
        onError: (e: Error) => setPageError(e.message),
    });

    const deleteSaleMut = useMutation({
        mutationFn: ({ eventId, saleId }: { eventId: string; saleId: string }) =>
            api.delete(`/events/${eventId}/sales/${saleId}`),
        onSuccess: () => invalidateSalesMap(),
        onError:   (e: Error) => setPageError(e.message),
    });

    function startEdit(e: ProjectEvent) {
        setEditId(e.id);
        setEditForm({
            name:                 e.name,
            date:                 e.date     ?? '',
            endDate:              e.endDate  ?? '',
            startTime:            e.startTime ?? '',
            endTime:              e.endTime   ?? '',
            location:             e.location ?? '',
            address:              e.address  ?? '',
            attendanceExpected:   e.attendanceExpected != null ? String(e.attendanceExpected) : '',
            attendanceActual:     e.attendanceActual   != null ? String(e.attendanceActual)   : '',
            notes:                e.notes ?? '',
            costTableCents:       e.costTableCents ? String(e.costTableCents / 100) : '',
            costHotelCents:       e.costHotelCents ? String(e.costHotelCents / 100) : '',
            costGasCents:         e.costGasCents   ? String(e.costGasCents   / 100) : '',
            costOtherCents:       e.costOtherCents ? String(e.costOtherCents / 100) : '',
            costOtherDescription: e.costOtherDescription ?? '',
        });
    }

    if (isLoading) return <div className="text-ep-muted text-center py-20 animate-pulse">Pulling up your events…</div>;

    const deleteTarget = events.find(e => e.id === deleteId);

    return (
        <div className="max-w-3xl mx-auto space-y-6">

            {/* Page header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-display font-black text-2xl text-ep-text">Events</h1>
                    <p className="text-ep-muted text-sm mt-0.5">Signings, conventions, markets — with full profit tracking.</p>
                </div>
                {!creating && (
                    <button className="btn-primary py-2 px-4 text-sm shrink-0" onClick={() => setCreating(true)}>
                        <Plus size={15} /> New Event
                    </button>
                )}
            </div>

            {/* Global error banner */}
            {pageError && (
                <div className="flex items-start gap-3 p-4 bg-ep-danger/10 border border-ep-danger/30 rounded-xl text-sm">
                    <AlertTriangle size={16} className="text-ep-danger shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-ep-danger font-medium">Something slipped — {pageError}</p>
                    </div>
                    <button className="text-ep-danger/70 hover:text-ep-danger transition-colors" onClick={() => setPageError(null)}>
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Upcoming event alerts */}
            {upcomingEvents.length > 0 && (
                <div className="space-y-2">
                    {upcomingEvents.map(e => (
                        <UpcomingAlert key={e.id} event={e} onClick={() => setExpandedId(e.id)} />
                    ))}
                </div>
            )}

            {/* Create form */}
            {creating && (
                <EventForm
                    title="Book your next moment"
                    form={createForm}
                    setForm={setCreateForm}
                    isPending={createMut.isPending}
                    onSave={() => createMut.mutate()}
                    onCancel={() => { setCreating(false); setCreateForm(blankForm); }}
                    saveLabel="Create Event"
                />
            )}

            {/* Empty state */}
            {events.length === 0 && !creating && (
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">📅</div>
                    <p className="text-ep-text font-display font-bold text-lg mb-1">No events yet</p>
                    <p className="text-ep-muted text-sm mb-6">Every milestone deserves its moment — signings, conventions, markets.</p>
                    <button className="btn-primary py-2 px-5 text-sm" onClick={() => setCreating(true)}>
                        <Plus size={15} /> Add Your First Event
                    </button>
                </div>
            )}

            {/* Aggregate P&L — only once sales data has loaded to avoid misleading $0 revenue flash */}
            {events.length > 0 && salesLoaded && (aggregate.revenue > 0 || aggregate.costs > 0) && (
                <div className="grid grid-cols-3 gap-3">
                    <AggregateTile label="Total Revenue" value={aggregate.revenue} />
                    <AggregateTile label="Total Costs"   value={aggregate.costs}   />
                    <AggregateTile
                        label="Net Profit"
                        value={aggregate.profit}
                        highlight={aggregate.profit > 0 ? 'positive' : aggregate.profit < 0 ? 'negative' : 'neutral'}
                    />
                </div>
            )}

            {/* Event list */}
            <div className="space-y-3">
                {events.map(e => {
                    const sales      = eventSalesMap[e.id] ?? [];
                    const { revenue, costs, profit, unitsSold, breakEven, marginCents } = calcMetrics(e, sales);
                    const isExpanded = expandedId === e.id;
                    const isEditing  = editId === e.id;
                    const days       = daysUntil(e.date);
                    const isUpcoming = days !== null && days >= 0 && days <= 7;
                    const isPast     = days !== null && days < 0;

                    return (
                        <div
                            key={e.id}
                            className={`bg-ep-surface border rounded-2xl overflow-hidden transition-all ${
                                isUpcoming ? 'border-ep-rose/50 shadow-ep-glow' : 'border-ep-border'
                            }`}
                        >
                            {isEditing ? (
                                <div className="p-5">
                                    <EventForm
                                        title={`Edit "${e.name}"`}
                                        form={editForm}
                                        setForm={setEditForm}
                                        isPending={patchMut.isPending}
                                        onSave={() => patchMut.mutate({ id: e.id, payload: buildPayload(editForm) })}
                                        onCancel={() => setEditId(null)}
                                        saveLabel="Save Changes"
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* Card header */}
                                    <div className="p-5">
                                        <div className="flex items-start gap-3">
                                            <button
                                                className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                                onClick={() => setExpandedId(isExpanded ? null : e.id)}
                                                aria-expanded={isExpanded}
                                            >
                                                {isExpanded
                                                    ? <ChevronDown size={15} className="text-ep-muted shrink-0 mt-0.5" />
                                                    : <ChevronRight size={15} className="text-ep-muted shrink-0 mt-0.5" />
                                                }
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h2 className="font-display font-bold text-ep-text text-lg leading-tight">{e.name}</h2>
                                                        {isUpcoming && (
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-ep-rose bg-ep-rose/10 border border-ep-rose/30 rounded-full px-2 py-0.5">
                                                                {days === 0 ? 'Today' : `${days}d away`}
                                                            </span>
                                                        )}
                                                        {isPast && (
                                                            <span className="text-[10px] font-semibold uppercase tracking-widest text-ep-muted bg-ep-bg border border-ep-border rounded-full px-2 py-0.5">
                                                                Past
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ep-muted mt-0.5">
                                                        {e.date && (
                                                            <span className="text-ep-rose font-medium">
                                                                {formatDate(e.date)}{e.endDate && e.endDate !== e.date ? ` – ${formatDate(e.endDate)}` : ''}
                                                            </span>
                                                        )}
                                                        {e.startTime && (
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={10} />
                                                                {e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}
                                                            </span>
                                                        )}
                                                        {(e.location || e.address) && (
                                                            <span className="flex items-center gap-1 truncate">
                                                                <MapPin size={10} />
                                                                {e.location || ''}{e.location && e.address ? ', ' : ''}{e.address || ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                            <div className="flex gap-1 shrink-0">
                                                <button className="btn-ghost p-1.5" title="Edit event" onClick={() => startEdit(e)}>
                                                    <Pencil size={13} />
                                                </button>
                                                <button className="btn-ghost p-1.5 hover:text-ep-danger" title="Delete event" onClick={() => setDeleteId(e.id)}>
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* P&L summary row */}
                                        <div className="flex flex-wrap gap-5 mt-4 pt-4 border-t border-ep-border">
                                            <PnLPill label="Revenue" value={revenue} />
                                            <PnLPill label="Costs"   value={costs}   />
                                            <div>
                                                <p className="text-ep-muted uppercase tracking-widest text-[10px] mb-0.5">Profit</p>
                                                <p className={`font-bold text-sm flex items-center gap-1 ${
                                                    profit > 0 ? 'text-green-400' : profit < 0 ? 'text-ep-rose' : 'text-ep-muted'
                                                }`}>
                                                    {profit > 0 ? <TrendingUp size={13} /> : profit < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
                                                    {centsToDisplay(profit)}
                                                </p>
                                            </div>
                                            {e.attendanceActual != null && (
                                                <div>
                                                    <p className="text-ep-muted uppercase tracking-widest text-[10px] mb-0.5">Attendance</p>
                                                    <p className="text-ep-text text-sm font-semibold flex items-center gap-1">
                                                        <Users size={11} className="text-ep-muted" />
                                                        {e.attendanceActual.toLocaleString()}
                                                        {e.attendanceExpected ? <span className="text-ep-muted font-normal">/ {e.attendanceExpected.toLocaleString()} exp.</span> : ''}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded detail */}
                                    {isExpanded && (
                                        <div className="border-t border-ep-border bg-ep-bg">
                                            <div className="px-5 py-4 space-y-5">
                                                {/* Expenses breakdown */}
                                                {costs > 0 && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-2">Expenses</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {e.costTableCents > 0 && <CostChip label="Table Fee" value={e.costTableCents} />}
                                                            {e.costHotelCents > 0 && <CostChip label="Hotel"     value={e.costHotelCents} />}
                                                            {e.costGasCents   > 0 && <CostChip label="Gas"       value={e.costGasCents}   />}
                                                            {e.costOtherCents > 0 && <CostChip label={e.costOtherDescription || 'Other'} value={e.costOtherCents} />}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Break-even + per-book margin */}
                                                {costs > 0 && (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="bg-ep-surface border border-ep-border rounded-xl px-3 py-2.5">
                                                            <p className="text-ep-muted text-[10px] uppercase tracking-widest mb-0.5">Break-even</p>
                                                            {breakEven !== null ? (
                                                                <>
                                                                    <p className="text-ep-text text-sm font-bold">
                                                                        {breakEven} {breakEven === 1 ? 'book' : 'books'}
                                                                    </p>
                                                                    <p className={`text-[11px] mt-0.5 ${unitsSold >= breakEven ? 'text-green-400' : 'text-ep-muted'}`}>
                                                                        {unitsSold >= breakEven
                                                                            ? `✓ covered — ${unitsSold - breakEven} over`
                                                                            : `${breakEven - unitsSold} more to cover costs`}
                                                                    </p>
                                                                </>
                                                            ) : (
                                                                <p className="text-ep-muted text-xs">Log a sale to calculate</p>
                                                            )}
                                                        </div>
                                                        <div className="bg-ep-surface border border-ep-border rounded-xl px-3 py-2.5">
                                                            <p className="text-ep-muted text-[10px] uppercase tracking-widest mb-0.5">Margin / book</p>
                                                            {marginCents !== null ? (
                                                                <>
                                                                    <p className={`text-sm font-bold ${marginCents >= 0 ? 'text-green-400' : 'text-ep-rose'}`}>
                                                                        {centsToDisplay(marginCents)}
                                                                    </p>
                                                                    <p className="text-ep-muted text-[11px] mt-0.5">avg sale price − event cost / unit</p>
                                                                </>
                                                            ) : (
                                                                <p className="text-ep-muted text-xs">Log a sale to calculate</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {e.notes && (
                                                    <div>
                                                        <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Notes</p>
                                                        <p className="text-ep-muted text-sm leading-relaxed">{e.notes}</p>
                                                    </div>
                                                )}

                                                {/* Books sold at this event */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest">Books Sold</p>
                                                        {addingSale !== e.id && (
                                                            <button
                                                                className="btn-ghost py-0.5 px-2 text-xs"
                                                                onClick={() => {
                                                                    setAddingSale(e.id);
                                                                    setSaleForm({ projectId: '', quantityBrought: '', quantitySold: '', priceCents: '', notes: '' });
                                                                }}
                                                            >
                                                                <Plus size={11} /> Log
                                                            </button>
                                                        )}
                                                    </div>

                                                    {addingSale === e.id && (
                                                        <div className="p-3 bg-ep-surface border border-ep-rose/30 rounded-xl mb-3 space-y-2">
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="col-span-2">
                                                                    <label className="block text-xs text-ep-muted mb-1" htmlFor="sale-project">Book *</label>
                                                                    <select
                                                                        id="sale-project"
                                                                        className="input-base text-sm"
                                                                        value={saleForm.projectId}
                                                                        onChange={ev => setSaleForm(f => ({ ...f, projectId: ev.target.value }))}
                                                                    >
                                                                        <option value="">— select a project —</option>
                                                                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-ep-muted mb-1" htmlFor="sale-brought">Qty Brought</label>
                                                                    <input id="sale-brought" className="input-base text-sm" type="number" min="0"
                                                                        value={saleForm.quantityBrought}
                                                                        onChange={ev => setSaleForm(f => ({ ...f, quantityBrought: ev.target.value }))} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-ep-muted mb-1" htmlFor="sale-sold">Qty Sold</label>
                                                                    <input id="sale-sold" className="input-base text-sm" type="number" min="0"
                                                                        value={saleForm.quantitySold}
                                                                        onChange={ev => setSaleForm(f => ({ ...f, quantitySold: ev.target.value }))} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-ep-muted mb-1" htmlFor="sale-price">Price Each ($)</label>
                                                                    <input id="sale-price" className="input-base text-sm" type="number" min="0" step="0.01"
                                                                        value={saleForm.priceCents}
                                                                        onChange={ev => setSaleForm(f => ({ ...f, priceCents: ev.target.value }))} />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-ep-muted mb-1" htmlFor="sale-notes">Notes</label>
                                                                    <input id="sale-notes" className="input-base text-sm"
                                                                        value={saleForm.notes}
                                                                        placeholder="Signed, bundle, cash…"
                                                                        onChange={ev => setSaleForm(f => ({ ...f, notes: ev.target.value }))} />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button className="btn-ghost flex-1 text-xs py-1" onClick={() => setAddingSale(null)}>Cancel</button>
                                                                <button
                                                                    className="btn-primary flex-1 text-xs py-1"
                                                                    disabled={!saleForm.projectId || addSaleMut.isPending}
                                                                    onClick={() => addSaleMut.mutate(e.id)}
                                                                >
                                                                    {addSaleMut.isPending ? 'Saving…' : 'Log'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {sales.length === 0 && addingSale !== e.id ? (
                                                        <p className="text-ep-muted text-xs py-2">No books logged for this event yet.</p>
                                                    ) : (
                                                        <div className="space-y-1.5">
                                                            {sales.map(s => {
                                                                const proj        = projects.find(pr => pr.id === s.projectId);
                                                                const lineRevenue = s.quantitySold * s.priceCents;
                                                                return (
                                                                    <div key={s.id} className="flex items-center gap-2 p-2.5 bg-ep-surface border border-ep-border rounded-xl">
                                                                        <BookOpen size={12} className="text-ep-muted shrink-0" />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-ep-text text-sm font-medium truncate">{proj?.title ?? 'Unknown Project'}</p>
                                                                            <p className="text-ep-muted text-xs">
                                                                                Brought <strong>{s.quantityBrought}</strong> · Sold <strong>{s.quantitySold}</strong>
                                                                                {' · '}{centsToDisplay(s.priceCents)} ea
                                                                                {' · '}<span className="text-ep-rose font-semibold">{centsToDisplay(lineRevenue)}</span>
                                                                                {s.notes ? ` · ${s.notes}` : ''}
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            className="btn-danger py-0.5 px-1.5 text-xs shrink-0"
                                                                            onClick={() => deleteSaleMut.mutate({ eventId: e.id, saleId: s.id })}
                                                                            title="Remove this sale entry"
                                                                        >
                                                                            <Trash2 size={11} />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Delete confirm modal */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="font-display font-bold text-lg text-ep-text mb-2">Cancel this event?</h3>
                        <p className="text-ep-muted text-sm mb-6">
                            <strong className="text-ep-text">{deleteTarget?.name}</strong> and all its sales data will be permanently erased. There is no coming back from this.
                        </p>
                        <div className="flex gap-3">
                            <button className="btn-ghost flex-1" onClick={() => setDeleteId(null)}>Keep It</button>
                            <button
                                className="btn-danger flex-1"
                                disabled={deleteMut.isPending}
                                onClick={() => deleteMut.mutate(deleteId)}
                            >
                                {deleteMut.isPending ? 'Deleting…' : 'Delete Event'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function UpcomingAlert({ event, onClick }: { event: ProjectEvent; onClick: () => void }) {
    const tl = useCountdown(event.date, event.startTime);
    if (!tl) return null;

    return (
        <button
            className="w-full text-left bg-ep-surface border border-ep-rose/40 rounded-2xl p-4 hover:border-ep-rose/70 transition-all shadow-ep-glow group"
            onClick={onClick}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-ep-rose/15 flex items-center justify-center">
                        <AlertTriangle size={15} className="text-ep-rose animate-pulse" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-ep-rose uppercase tracking-widest mb-0.5">
                            {tl.isPast ? 'Happening now' : tl.days === 0 ? 'Today' : `${tl.days} day${tl.days !== 1 ? 's' : ''} away`}
                        </p>
                        <p className="text-ep-text font-display font-bold truncate">{event.name}</p>
                        {(event.location || event.address) && (
                            <p className="text-ep-muted text-xs mt-0.5 flex items-center gap-1">
                                <MapPin size={10} />
                                {event.location || ''}{event.location && event.address ? ', ' : ''}{event.address || ''}
                            </p>
                        )}
                    </div>
                </div>
                {/* Live countdown */}
                {!tl.isPast && (
                    <div className="shrink-0 text-right">
                        <div className="flex items-end gap-1 justify-end">
                            {tl.days > 0 && <CountUnit value={tl.days}    label="d" />}
                            <CountUnit value={tl.hours}   label="h" />
                            <CountUnit value={tl.minutes} label="m" />
                            <CountUnit value={tl.seconds} label="s" />
                        </div>
                    </div>
                )}
            </div>
        </button>
    );
}

function CountUnit({ value, label }: { value: number; label: string }) {
    return (
        <div className="text-center">
            <p className="font-mono font-bold text-ep-text text-sm tabular-nums leading-none">
                {String(value).padStart(2, '0')}
            </p>
            <p className="text-ep-muted text-[9px] uppercase tracking-widest">{label}</p>
        </div>
    );
}

function AggregateTile({ label, value, highlight }: { label: string; value: number; highlight?: 'positive' | 'negative' | 'neutral' }) {
    const color = highlight === 'positive' ? 'text-green-400'
                : highlight === 'negative' ? 'text-ep-rose'
                : 'text-ep-text';
    return (
        <div className="bg-ep-surface border border-ep-border rounded-2xl px-4 py-3">
            <p className="text-ep-muted uppercase tracking-widest text-[10px] mb-1">{label}</p>
            <p className={`font-display font-bold text-lg ${color}`}>{centsToDisplay(value)}</p>
        </div>
    );
}

function PnLPill({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <p className="text-ep-muted uppercase tracking-widest text-[10px] mb-0.5">{label}</p>
            <p className="text-ep-text text-sm font-semibold">{centsToDisplay(value)}</p>
        </div>
    );
}

function CostChip({ label, value }: { label: string; value: number }) {
    return (
        <div className="bg-ep-surface border border-ep-border rounded-lg px-3 py-1.5">
            <p className="text-ep-muted text-[10px] uppercase tracking-widest">{label}</p>
            <p className="text-ep-text text-sm font-semibold">{centsToDisplay(value)}</p>
        </div>
    );
}

function Field({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs text-ep-muted mb-1" htmlFor={id}>{label}</label>
            {children}
        </div>
    );
}

function EventForm({ title, form, setForm, isPending, onSave, onCancel, saveLabel }: {
    title: string;
    form: FormShape;
    setForm: React.Dispatch<React.SetStateAction<FormShape>>;
    isPending: boolean;
    onSave: () => void;
    onCancel: () => void;
    saveLabel: string;
}) {
    const set = (key: keyof FormShape) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }));

    const hasOtherCost = parseDollarsToCents(form.costOtherCents) > 0;

    return (
        <div className="bg-ep-surface border border-ep-rose/30 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-ep-text">{title}</h2>
                <button className="btn-ghost p-1.5" onClick={onCancel} aria-label="Close"><X size={15} /></button>
            </div>

            {/* Core details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                    <Field label="Event Name *" id="ef-name">
                        <input id="ef-name" className="input-base" autoFocus value={form.name} onChange={set('name')} placeholder="Book signing, convention, market…" />
                    </Field>
                </div>
                <Field label="Start Date" id="ef-date">
                    <input id="ef-date" className="input-base" type="date" value={form.date} onChange={set('date')} />
                </Field>
                <Field label="End Date" id="ef-enddate">
                    <input id="ef-enddate" className="input-base" type="date" value={form.endDate} onChange={set('endDate')} />
                </Field>
                <Field label="Start Time" id="ef-stime">
                    <input id="ef-stime" className="input-base" type="time" value={form.startTime} onChange={set('startTime')} />
                </Field>
                <Field label="End Time" id="ef-etime">
                    <input id="ef-etime" className="input-base" type="time" value={form.endTime} onChange={set('endTime')} />
                </Field>
                <Field label="Venue / Location" id="ef-loc">
                    <input id="ef-loc" className="input-base" value={form.location} onChange={set('location')} placeholder="Con name, bookstore, market…" />
                </Field>
                <Field label="Address" id="ef-addr">
                    <input id="ef-addr" className="input-base" value={form.address} onChange={set('address')} placeholder="City, state or full address" />
                </Field>
                <Field label="Attendance Expected" id="ef-aex">
                    <input id="ef-aex" className="input-base" type="number" min="0" value={form.attendanceExpected} onChange={set('attendanceExpected')} />
                </Field>
                <Field label="Attendance Actual" id="ef-aact">
                    <input id="ef-aact" className="input-base" type="number" min="0" value={form.attendanceActual} onChange={set('attendanceActual')} />
                </Field>
                <div className="sm:col-span-2">
                    <Field label="Notes" id="ef-notes">
                        <textarea id="ef-notes" className="input-base resize-none" rows={2} value={form.notes}
                            onChange={set('notes')} placeholder="Details, contacts, anything worth remembering…" />
                    </Field>
                </div>
            </div>

            {/* Expenses */}
            <div>
                <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-2">Expenses</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="Table Fee ($)" id="ef-table">
                        <input id="ef-table" className="input-base" type="number" min="0" step="0.01" value={form.costTableCents} onChange={set('costTableCents')} />
                    </Field>
                    <Field label="Hotel ($)" id="ef-hotel">
                        <input id="ef-hotel" className="input-base" type="number" min="0" step="0.01" value={form.costHotelCents} onChange={set('costHotelCents')} />
                    </Field>
                    <Field label="Gas ($)" id="ef-gas">
                        <input id="ef-gas" className="input-base" type="number" min="0" step="0.01" value={form.costGasCents} onChange={set('costGasCents')} />
                    </Field>
                    <Field label="Other ($)" id="ef-other">
                        <input id="ef-other" className="input-base" type="number" min="0" step="0.01" value={form.costOtherCents} onChange={set('costOtherCents')} />
                    </Field>
                    {hasOtherCost && (
                        <div className="col-span-2 sm:col-span-4">
                            <Field label="Other expense description" id="ef-otherdesc">
                                <input id="ef-otherdesc" className="input-base" value={form.costOtherDescription}
                                    onChange={set('costOtherDescription')} placeholder="Parking, supplies, shipping…" />
                            </Field>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-2 pt-1">
                <button className="btn-ghost flex-1" onClick={onCancel}>Cancel</button>
                <button
                    className="btn-primary flex-1"
                    disabled={!form.name.trim() || isPending}
                    onClick={onSave}
                >
                    {isPending ? 'Saving…' : saveLabel}
                </button>
            </div>
        </div>
    );
}
