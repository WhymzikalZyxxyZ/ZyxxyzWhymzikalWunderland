import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, X, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { api }          from '@/lib/api';
import type { ProjectEvent, EventSale, Project } from '@/lib/types';

function centsToDisplay(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

function totalCosts(e: ProjectEvent): number {
    return e.costTableCents + e.costHotelCents + e.costGasCents + e.costOtherCents;
}

const blankForm = {
    name: '', date: '', endDate: '', startTime: '', endTime: '',
    location: '', address: '',
    attendanceExpected: '', attendanceActual: '',
    notes: '',
    costTableCents: '', costHotelCents: '', costGasCents: '', costOtherCents: '', costOtherDescription: '',
};

type FormShape = typeof blankForm;

function parseDollarsToCents(val: string): number {
    return Math.round(parseFloat(val || '0') * 100) || 0;
}

function formatDate(d: string | null) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y}`;
}

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

    const { data: events = [], isLoading } = useQuery<ProjectEvent[]>({
        queryKey: ['events'],
        queryFn:  () => api.get('/events'),
    });

    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ['projects'],
        queryFn:  () => api.get('/projects'),
    });

    const { data: eventSalesMap } = useQuery<Record<string, EventSale[]>>({
        queryKey: ['event-sales-all'],
        queryFn:  async () => {
            const result: Record<string, EventSale[]> = {};
            await Promise.all(events.map(async e => {
                result[e.id] = await api.get(`/events/${e.id}/sales`);
            }));
            return result;
        },
        enabled: events.length > 0,
    });

    function eventRevenue(eventId: string): number {
        const sales = eventSalesMap?.[eventId] ?? [];
        return sales.reduce((s, r) => s + r.quantitySold * r.priceCents, 0);
    }

    function buildPayload(f: FormShape) {
        return {
            name:                 f.name,
            date:                 f.date || null,
            endDate:              f.endDate || null,
            startTime:            f.startTime || null,
            endTime:              f.endTime || null,
            location:             f.location || null,
            address:              f.address || null,
            attendanceExpected:   f.attendanceExpected ? parseInt(f.attendanceExpected) : null,
            attendanceActual:     f.attendanceActual   ? parseInt(f.attendanceActual)   : null,
            notes:                f.notes || null,
            costTableCents:       parseDollarsToCents(f.costTableCents),
            costHotelCents:       parseDollarsToCents(f.costHotelCents),
            costGasCents:         parseDollarsToCents(f.costGasCents),
            costOtherCents:       parseDollarsToCents(f.costOtherCents),
            costOtherDescription: f.costOtherDescription || null,
        };
    }

    const createMut = useMutation({
        mutationFn: () => api.post<ProjectEvent>('/events', buildPayload(createForm)),
        onSuccess:  (e) => {
            qc.setQueryData<ProjectEvent[]>(['events'], prev => [e, ...(prev ?? [])]);
            setCreating(false);
            setCreateForm(blankForm);
        },
    });

    const patchMut = useMutation({
        mutationFn: ({ id, ...body }: { id: string } & ReturnType<typeof buildPayload>) =>
            api.patch<ProjectEvent>(`/events/${id}`, body),
        onSuccess:  (e) => {
            qc.setQueryData<ProjectEvent[]>(['events'], prev => prev?.map(x => x.id === e.id ? e : x) ?? []);
            setEditId(null);
        },
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => api.delete(`/events/${id}`),
        onSuccess:  (_, id) => {
            qc.setQueryData<ProjectEvent[]>(['events'], prev => prev?.filter(x => x.id !== id) ?? []);
            setDeleteId(null);
        },
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
            qc.invalidateQueries({ queryKey: ['event-sales-all'] });
            setAddingSale(null);
            setSaleForm({ projectId: '', quantityBrought: '', quantitySold: '', priceCents: '', notes: '' });
        },
    });

    const deleteSaleMut = useMutation({
        mutationFn: ({ eventId, saleId }: { eventId: string; saleId: string }) =>
            api.delete(`/events/${eventId}/sales/${saleId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['event-sales-all'] }),
    });

    function startEdit(e: ProjectEvent) {
        setEditId(e.id);
        setEditForm({
            name:                 e.name,
            date:                 e.date ?? '',
            endDate:              e.endDate ?? '',
            startTime:            e.startTime ?? '',
            endTime:              e.endTime ?? '',
            location:             e.location ?? '',
            address:              e.address ?? '',
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

    if (isLoading) return <div className="text-ep-muted text-center py-20">Gathering your events…</div>;

    const deleteTarget = events.find(e => e.id === deleteId);

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display font-black text-2xl text-ep-text">Events</h1>
                    <p className="text-ep-muted text-sm mt-0.5">Signings, conventions, markets — with full profit tracking.</p>
                </div>
                {!creating && (
                    <button className="btn-primary py-2 px-4 text-sm" onClick={() => setCreating(true)}>
                        <Plus size={15} /> New Event
                    </button>
                )}
            </div>

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
                <div className="text-center py-16">
                    <div className="text-5xl mb-4">📅</div>
                    <p className="text-ep-muted">No events yet — every milestone deserves its moment.</p>
                    <button className="btn-primary mt-5 py-2 px-5 text-sm" onClick={() => setCreating(true)}>
                        <Plus size={15} /> Add Your First Event
                    </button>
                </div>
            )}

            {/* Event list */}
            <div className="space-y-4">
                {events.map(e => {
                    const costs   = totalCosts(e);
                    const revenue = eventRevenue(e.id);
                    const profit  = revenue - costs;
                    const sales   = eventSalesMap?.[e.id] ?? [];
                    const isExpanded = expandedId === e.id;
                    const isEditing  = editId === e.id;

                    return (
                        <div key={e.id} className="bg-ep-surface border border-ep-border rounded-2xl overflow-hidden">
                            {isEditing ? (
                                <div className="p-5">
                                    <EventForm
                                        title={`Edit "${e.name}"`}
                                        form={editForm}
                                        setForm={setEditForm}
                                        isPending={patchMut.isPending}
                                        onSave={() => patchMut.mutate({ id: e.id, ...buildPayload(editForm) })}
                                        onCancel={() => setEditId(null)}
                                        saveLabel="Save Changes"
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* Card header */}
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <button
                                                className="flex items-center gap-2 flex-1 min-w-0 text-left"
                                                onClick={() => setExpandedId(isExpanded ? null : e.id)}
                                            >
                                                {isExpanded ? <ChevronDown size={15} className="text-ep-muted shrink-0" /> : <ChevronRight size={15} className="text-ep-muted shrink-0" />}
                                                <div className="min-w-0">
                                                    <h2 className="font-display font-bold text-ep-text text-lg leading-tight">{e.name}</h2>
                                                    <div className="flex flex-wrap gap-x-3 text-xs text-ep-muted mt-0.5">
                                                        {e.date && <span className="text-ep-rose">{formatDate(e.date)}{e.endDate && e.endDate !== e.date ? ` – ${formatDate(e.endDate)}` : ''}</span>}
                                                        {e.startTime && <span>{e.startTime}{e.endTime ? ` – ${e.endTime}` : ''}</span>}
                                                        {e.location && <span>{e.location}</span>}
                                                        {e.address && <span className="truncate">{e.address}</span>}
                                                    </div>
                                                </div>
                                            </button>
                                            <div className="flex gap-1 shrink-0">
                                                <button className="btn-ghost p-1.5" onClick={() => startEdit(e)}><Pencil size={13} /></button>
                                                <button className="btn-ghost p-1.5 hover:text-ep-danger" onClick={() => setDeleteId(e.id)}><Trash2 size={13} /></button>
                                            </div>
                                        </div>

                                        {/* P&L summary row */}
                                        <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-ep-border text-xs">
                                            <div>
                                                <p className="text-ep-muted uppercase tracking-widest text-[10px] mb-0.5">Revenue</p>
                                                <p className="text-ep-text font-semibold">{centsToDisplay(revenue)}</p>
                                            </div>
                                            <div>
                                                <p className="text-ep-muted uppercase tracking-widest text-[10px] mb-0.5">Costs</p>
                                                <p className="text-ep-text font-semibold">{centsToDisplay(costs)}</p>
                                            </div>
                                            <div>
                                                <p className="text-ep-muted uppercase tracking-widest text-[10px] mb-0.5">Profit</p>
                                                <p className={`font-bold flex items-center gap-1 ${profit > 0 ? 'text-green-400' : profit < 0 ? 'text-ep-rose' : 'text-ep-muted'}`}>
                                                    {profit > 0 ? <TrendingUp size={12} /> : profit < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                                                    {centsToDisplay(profit)}
                                                </p>
                                            </div>
                                            {e.attendanceActual != null && (
                                                <div>
                                                    <p className="text-ep-muted uppercase tracking-widest text-[10px] mb-0.5">Attendance</p>
                                                    <p className="text-ep-text font-semibold">{e.attendanceActual}{e.attendanceExpected ? ` / ${e.attendanceExpected} expected` : ''}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded detail */}
                                    {isExpanded && (
                                        <div className="border-t border-ep-border bg-ep-bg px-5 py-4 space-y-4">
                                            {/* Costs breakdown */}
                                            <div>
                                                <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-2">Expenses</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {e.costTableCents > 0 && <CostChip label="Table Fee" value={e.costTableCents} />}
                                                    {e.costHotelCents > 0 && <CostChip label="Hotel"     value={e.costHotelCents} />}
                                                    {e.costGasCents   > 0 && <CostChip label="Gas"       value={e.costGasCents}   />}
                                                    {e.costOtherCents > 0 && <CostChip label={e.costOtherDescription || 'Other'} value={e.costOtherCents} />}
                                                    {costs === 0 && <p className="text-ep-muted text-xs col-span-4">No expenses recorded.</p>}
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            {e.notes && (
                                                <div>
                                                    <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-1">Notes</p>
                                                    <p className="text-ep-muted text-sm">{e.notes}</p>
                                                </div>
                                            )}

                                            {/* Sales items */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest">Books Sold</p>
                                                    {addingSale !== e.id && (
                                                        <button className="btn-ghost py-0.5 px-2 text-xs" onClick={() => { setAddingSale(e.id); setSaleForm({ projectId: '', quantityBrought: '', quantitySold: '', priceCents: '', notes: '' }); }}>
                                                            <Plus size={11} /> Add
                                                        </button>
                                                    )}
                                                </div>

                                                {addingSale === e.id && (
                                                    <div className="p-3 bg-ep-surface border border-ep-rose/30 rounded-xl mb-3 space-y-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div className="col-span-2">
                                                                <label className="block text-xs text-ep-muted mb-1">Book *</label>
                                                                <select className="input-base text-sm" value={saleForm.projectId} onChange={ev => setSaleForm(f => ({ ...f, projectId: ev.target.value }))}>
                                                                    <option value="">— select a project —</option>
                                                                    {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-ep-muted mb-1">Qty Brought</label>
                                                                <input className="input-base text-sm" type="number" min="0" value={saleForm.quantityBrought} onChange={ev => setSaleForm(f => ({ ...f, quantityBrought: ev.target.value }))} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-ep-muted mb-1">Qty Sold</label>
                                                                <input className="input-base text-sm" type="number" min="0" value={saleForm.quantitySold} onChange={ev => setSaleForm(f => ({ ...f, quantitySold: ev.target.value }))} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-ep-muted mb-1">Price Each ($)</label>
                                                                <input className="input-base text-sm" type="number" min="0" step="0.01" value={saleForm.priceCents} onChange={ev => setSaleForm(f => ({ ...f, priceCents: ev.target.value }))} />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs text-ep-muted mb-1">Notes</label>
                                                                <input className="input-base text-sm" value={saleForm.notes} onChange={ev => setSaleForm(f => ({ ...f, notes: ev.target.value }))} placeholder="Signed, bundle…" />
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button className="btn-ghost flex-1 text-xs py-1" onClick={() => setAddingSale(null)}>Cancel</button>
                                                            <button
                                                                className="btn-primary flex-1 text-xs py-1"
                                                                disabled={!saleForm.projectId || addSaleMut.isPending}
                                                                onClick={() => addSaleMut.mutate(e.id)}
                                                            >
                                                                {addSaleMut.isPending ? 'Saving…' : 'Add'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {sales.length === 0 && addingSale !== e.id ? (
                                                    <p className="text-ep-muted text-xs">No books logged for this event yet.</p>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        {sales.map(s => {
                                                            const p = projects.find(pr => pr.id === s.projectId);
                                                            const lineRevenue = s.quantitySold * s.priceCents;
                                                            return (
                                                                <div key={s.id} className="flex items-center gap-2 p-2.5 bg-ep-surface border border-ep-border rounded-lg">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-ep-text text-sm font-medium truncate">{p?.title ?? 'Unknown Project'}</p>
                                                                        <p className="text-ep-muted text-xs">
                                                                            Brought {s.quantityBrought} · Sold {s.quantitySold} · {centsToDisplay(s.priceCents)} ea · <span className="text-ep-rose">{centsToDisplay(lineRevenue)}</span>
                                                                            {s.notes ? ` · ${s.notes}` : ''}
                                                                        </p>
                                                                    </div>
                                                                    <button
                                                                        className="btn-danger py-0.5 px-1.5 text-xs shrink-0"
                                                                        onClick={() => deleteSaleMut.mutate({ eventId: e.id, saleId: s.id })}
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
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Delete confirm */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-ep-surface border border-ep-border rounded-2xl p-6 w-full max-w-sm">
                        <h3 className="font-display font-bold text-lg text-ep-text mb-2">Cancel this event?</h3>
                        <p className="text-ep-muted text-sm mb-6">
                            <strong className="text-ep-text">{deleteTarget?.name}</strong> and all its sales data will be permanently erased.
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

// ── Sub-components ────────────────────────────────────────────────────────────

function CostChip({ label, value }: { label: string; value: number }) {
    return (
        <div className="bg-ep-surface border border-ep-border rounded-lg px-3 py-2">
            <p className="text-ep-muted text-[10px] uppercase tracking-widest">{label}</p>
            <p className="text-ep-text text-sm font-semibold">{centsToDisplay(value)}</p>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs text-ep-muted mb-1">{label}</label>
            {children}
        </div>
    );
}

function EventForm({ title, form, setForm, isPending, onSave, onCancel, saveLabel }: {
    title: string;
    form: typeof blankForm;
    setForm: React.Dispatch<React.SetStateAction<typeof blankForm>>;
    isPending: boolean;
    onSave: () => void;
    onCancel: () => void;
    saveLabel: string;
}) {
    const set = (key: keyof typeof blankForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value }));

    return (
        <div className="bg-ep-surface border border-ep-rose/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-ep-text">{title}</h2>
                <button className="btn-ghost p-1.5" onClick={onCancel}><X size={15} /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                    <Field label="Event Name *">
                        <input className="input-base" autoFocus value={form.name} onChange={set('name')} placeholder="Book signing, convention, market…" />
                    </Field>
                </div>
                <Field label="Start Date">
                    <input className="input-base" type="date" value={form.date} onChange={set('date')} />
                </Field>
                <Field label="End Date">
                    <input className="input-base" type="date" value={form.endDate} onChange={set('endDate')} />
                </Field>
                <Field label="Start Time">
                    <input className="input-base" type="time" value={form.startTime} onChange={set('startTime')} />
                </Field>
                <Field label="End Time">
                    <input className="input-base" type="time" value={form.endTime} onChange={set('endTime')} />
                </Field>
                <Field label="Venue / Location">
                    <input className="input-base" value={form.location} onChange={set('location')} placeholder="Con name, store, market…" />
                </Field>
                <Field label="Address">
                    <input className="input-base" value={form.address} onChange={set('address')} placeholder="City, state or full address" />
                </Field>
                <Field label="Attendance Expected">
                    <input className="input-base" type="number" min="0" value={form.attendanceExpected} onChange={set('attendanceExpected')} />
                </Field>
                <Field label="Attendance Actual">
                    <input className="input-base" type="number" min="0" value={form.attendanceActual} onChange={set('attendanceActual')} />
                </Field>
                <div className="sm:col-span-2">
                    <Field label="Notes">
                        <textarea className="input-base resize-none" rows={2} value={form.notes} onChange={set('notes')} placeholder="Details, contacts, anything worth remembering…" />
                    </Field>
                </div>
            </div>

            <div>
                <p className="text-xs font-semibold text-ep-text-dim uppercase tracking-widest mb-2">Expenses</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Field label="Table Fee ($)">
                        <input className="input-base" type="number" min="0" step="0.01" value={form.costTableCents} onChange={set('costTableCents')} />
                    </Field>
                    <Field label="Hotel ($)">
                        <input className="input-base" type="number" min="0" step="0.01" value={form.costHotelCents} onChange={set('costHotelCents')} />
                    </Field>
                    <Field label="Gas ($)">
                        <input className="input-base" type="number" min="0" step="0.01" value={form.costGasCents} onChange={set('costGasCents')} />
                    </Field>
                    <Field label="Other ($)">
                        <input className="input-base" type="number" min="0" step="0.01" value={form.costOtherCents} onChange={set('costOtherCents')} />
                    </Field>
                    {(parseFloat(form.costOtherCents) > 0) && (
                        <div className="col-span-2 sm:col-span-4">
                            <Field label="Other expense description">
                                <input className="input-base" value={form.costOtherDescription} onChange={set('costOtherDescription')} placeholder="Parking, supplies, shipping…" />
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
