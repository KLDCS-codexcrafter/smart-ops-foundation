/**
 * BeatRouteMaster.tsx — Beat / route CRUD with reorderable stops
 * Sprint 7. Move-up/down buttons used for reorder (no DnD library dependency).
 * [JWT] GET/POST/PUT/DELETE /api/salesx/beat-routes
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Plus, Save, Trash2, X, ArrowUp, ArrowDown, Route, GripVertical,
} from 'lucide-react';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import {
  type BeatRoute, type BeatCustomerStop, type BeatFrequency, type DayOfWeek,
  beatRoutesKey, FREQUENCY_LABELS, DAY_LABELS,
} from '@/types/beat-route';
import { type Territory, territoriesKey } from '@/types/territory';
import { type SAMPerson, samPersonsKey } from '@/types/sam-person';

interface Props { entityCode: string }

interface CustomerLite {
  id: string;
  partyCode: string;
  partyName: string;
  territory_id?: string | null;
}

interface FormState {
  beat_code: string;
  beat_name: string;
  territory_id: string;
  salesman_id: string;
  frequency: BeatFrequency;
  day_of_week: DayOfWeek | '';
  is_active: boolean;
  notes: string;
  stops: BeatCustomerStop[];
  editingId: string | null;
}

const BLANK: FormState = {
  beat_code: '',
  beat_name: '',
  territory_id: '',
  salesman_id: '',
  frequency: 'weekly',
  day_of_week: 'monday',
  is_active: true,
  notes: '',
  stops: [],
  editingId: null,
};

const NOW = () => new Date().toISOString();

const ALL_DAYS: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday',
  'friday', 'saturday', 'sunday',
];

function loadBeats(entityCode: string): BeatRoute[] {
  try {
    // [JWT] GET /api/salesx/beat-routes
    const raw = localStorage.getItem(beatRoutesKey(entityCode));
    return raw ? (JSON.parse(raw) as BeatRoute[]) : [];
  } catch { return []; }
}

function saveBeats(entityCode: string, list: BeatRoute[]): void {
  try {
    // [JWT] PUT /api/salesx/beat-routes
    localStorage.setItem(beatRoutesKey(entityCode), JSON.stringify(list));
  } catch { /* noop */ }
}

function loadTerritories(entityCode: string): Territory[] {
  try {
    // [JWT] GET /api/salesx/territories
    const raw = localStorage.getItem(territoriesKey(entityCode));
    return raw ? (JSON.parse(raw) as Territory[]) : [];
  } catch { return []; }
}

function loadSalesmen(entityCode: string): SAMPerson[] {
  try {
    // [JWT] GET /api/salesx/sam/persons
    const raw = localStorage.getItem(samPersonsKey(entityCode));
    const all = raw ? (JSON.parse(raw) as SAMPerson[]) : [];
    return all.filter(p => (p.person_type === 'salesman' || p.treat_as_salesman) && p.is_active);
  } catch { return []; }
}

function loadCustomers(): CustomerLite[] {
  try {
    // [JWT] GET /api/masters/customers
    const raw = localStorage.getItem('erp_group_customer_master');
    return raw ? (JSON.parse(raw) as CustomerLite[]) : [];
  } catch { return []; }
}

export function BeatRouteMasterPanel({ entityCode }: Props) {
  const [beats, setBeats] = useState<BeatRoute[]>(() => loadBeats(entityCode));
  const [form, setForm] = useState<FormState>(BLANK);
  const territories = useMemo(() => loadTerritories(entityCode), [entityCode]);
  const salesmen = useMemo(() => loadSalesmen(entityCode), [entityCode]);
  const customers = useMemo(() => loadCustomers(), []);

  useEffect(() => {
    setBeats(loadBeats(entityCode));
  }, [entityCode]);

  // Salesmen filtered to those assigned to chosen territory
  const territorySalesmen = useMemo(() => {
    if (!form.territory_id) return salesmen;
    const t = territories.find(x => x.id === form.territory_id);
    if (!t) return salesmen;
    return salesmen.filter(s => t.assigned_salesman_ids.includes(s.id));
  }, [form.territory_id, salesmen, territories]);

  // Customers in chosen territory (for stop add)
  const territoryCustomers = useMemo(() => {
    if (!form.territory_id) return customers;
    return customers.filter(c => c.territory_id === form.territory_id);
  }, [form.territory_id, customers]);

  const handleSave = useCallback(() => {
    if (!form.beat_name.trim()) { toast.error('Beat name required'); return; }
    if (!form.territory_id) { toast.error('Territory required'); return; }
    if (!form.salesman_id) { toast.error('Salesman required'); return; }
    if (form.frequency !== 'daily' && !form.day_of_week) {
      toast.error('Day of week required'); return;
    }
    const code = form.beat_code.trim()
      || `BEAT/${String(beats.length + 1).padStart(4, '0')}`;
    const now = NOW();
    const stops = form.stops.map((s, i) => ({ ...s, sequence: i + 1 }));
    const next: BeatRoute = {
      id: form.editingId ?? `beat-${Date.now()}`,
      entity_id: entityCode,
      beat_code: code.toUpperCase(),
      beat_name: form.beat_name.trim(),
      territory_id: form.territory_id,
      salesman_id: form.salesman_id,
      frequency: form.frequency,
      day_of_week: form.frequency === 'daily' ? null : (form.day_of_week as DayOfWeek),
      stops,
      is_active: form.is_active,
      notes: form.notes.trim() || null,
      created_at: form.editingId
        ? (beats.find(b => b.id === form.editingId)?.created_at ?? now)
        : now,
      updated_at: now,
    };
    const updated = form.editingId
      ? beats.map(b => b.id === form.editingId ? next : b)
      : [...beats, next];
    setBeats(updated);
    saveBeats(entityCode, updated);
    toast.success(form.editingId ? 'Beat updated' : 'Beat added');
    setForm(BLANK);
  }, [form, beats, entityCode]);

  const isFormActive = !!(form.beat_name.trim() || form.editingId);
  useCtrlS(isFormActive ? handleSave : () => { /* noop */ });

  const handleEdit = (b: BeatRoute) => {
    setForm({
      beat_code: b.beat_code,
      beat_name: b.beat_name,
      territory_id: b.territory_id,
      salesman_id: b.salesman_id,
      frequency: b.frequency,
      day_of_week: b.day_of_week ?? '',
      is_active: b.is_active,
      notes: b.notes ?? '',
      stops: b.stops,
      editingId: b.id,
    });
  };

  const handleDelete = (id: string) => {
    const updated = beats.filter(b => b.id !== id);
    setBeats(updated);
    saveBeats(entityCode, updated);
    toast.success('Beat removed');
    if (form.editingId === id) setForm(BLANK);
  };

  const addStop = (cust: CustomerLite) => {
    if (form.stops.find(s => s.customer_id === cust.id)) {
      toast.error('Customer already on this beat'); return;
    }
    const stop: BeatCustomerStop = {
      id: `stop-${Date.now()}-${cust.id}`,
      customer_id: cust.id,
      sequence: form.stops.length + 1,
      planned_duration_minutes: 20,
      notes: null,
    };
    setForm(p => ({ ...p, stops: [...p.stops, stop] }));
  };

  const removeStop = (id: string) => {
    setForm(p => ({ ...p, stops: p.stops.filter(s => s.id !== id) }));
  };

  const moveStop = (id: string, dir: -1 | 1) => {
    setForm(p => {
      const idx = p.stops.findIndex(s => s.id === id);
      if (idx < 0) return p;
      const target = idx + dir;
      if (target < 0 || target >= p.stops.length) return p;
      const next = [...p.stops];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...p, stops: next };
    });
  };

  const updateStop = (id: string, patch: Partial<BeatCustomerStop>) => {
    setForm(p => ({
      ...p,
      stops: p.stops.map(s => s.id === id ? { ...s, ...patch } : s),
    }));
  };

  const customerName = (id: string): string =>
    customers.find(c => c.id === id)?.partyName ?? id;

  return (
    <div data-keyboard-form className="space-y-4">
      {/* List */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Route className="h-4 w-4 text-orange-500" /> Beats / Routes
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setForm(BLANK)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        </CardHeader>
        <CardContent>
          {beats.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No beats defined yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Territory</TableHead>
                  <TableHead className="text-xs">Salesman</TableHead>
                  <TableHead className="text-xs">Frequency</TableHead>
                  <TableHead className="text-xs">Day</TableHead>
                  <TableHead className="text-xs text-right">Stops</TableHead>
                  <TableHead className="text-xs w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {beats.map(b => {
                  const t = territories.find(x => x.id === b.territory_id);
                  const s = salesmen.find(x => x.id === b.salesman_id);
                  return (
                    <TableRow key={b.id} className="cursor-pointer" onClick={() => handleEdit(b)}>
                      <TableCell className="text-xs font-mono">{b.beat_code}</TableCell>
                      <TableCell className="text-xs">{b.beat_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{t?.territory_name ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s?.display_name ?? '—'}</TableCell>
                      <TableCell className="text-xs capitalize">{FREQUENCY_LABELS[b.frequency]}</TableCell>
                      <TableCell className="text-xs">{b.day_of_week ? DAY_LABELS[b.day_of_week] : '—'}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{b.stops.length}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-6 w-6"
                          onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {form.editingId ? 'Edit Beat' : 'New Beat'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Code</Label>
              <Input
                value={form.beat_code}
                onChange={e => setForm(p => ({ ...p, beat_code: e.target.value.toUpperCase().slice(0, 24) }))}
                onKeyDown={onEnterNext}
                placeholder="Auto"
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Beat Name *</Label>
              <Input
                value={form.beat_name}
                onChange={e => setForm(p => ({ ...p, beat_name: e.target.value }))}
                onKeyDown={onEnterNext}
                placeholder="Mumbai West Monday Beat"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Territory *</Label>
              <Select value={form.territory_id || '__none__'}
                onValueChange={v => setForm(p => ({
                  ...p,
                  territory_id: v === '__none__' ? '' : v,
                  salesman_id: '',
                }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select territory" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Select —</SelectItem>
                  {territories.filter(t => t.is_active).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.territory_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Salesman *</Label>
              <Select value={form.salesman_id || '__none__'}
                onValueChange={v => setForm(p => ({ ...p, salesman_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select salesman" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Select —</SelectItem>
                  {territorySalesmen.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Frequency *</Label>
              <Select value={form.frequency}
                onValueChange={v => setForm(p => ({ ...p, frequency: v as BeatFrequency }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(FREQUENCY_LABELS) as BeatFrequency[]).map(f => (
                    <SelectItem key={f} value={f}>{FREQUENCY_LABELS[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Day of Week</Label>
              <Select
                value={form.day_of_week || '__none__'}
                onValueChange={v => setForm(p => ({ ...p, day_of_week: v === '__none__' ? '' : (v as DayOfWeek) }))}
                disabled={form.frequency === 'daily'}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {ALL_DAYS.map(d => (
                    <SelectItem key={d} value={d}>{DAY_LABELS[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-between">
              <Label className="text-xs">Active</Label>
              <Switch checked={form.is_active}
                onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
            </div>
          </div>

          {/* Stops */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Customer Stops ({form.stops.length})</Label>
              <Select
                value=""
                onValueChange={(custId) => {
                  const c = customers.find(x => x.id === custId);
                  if (c) addStop(c);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-56">
                  <SelectValue placeholder="Add stop…" />
                </SelectTrigger>
                <SelectContent>
                  {territoryCustomers.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No customers in territory
                    </SelectItem>
                  ) : (
                    territoryCustomers.slice(0, 100).map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.partyName} <span className="text-muted-foreground font-mono">({c.partyCode})</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            {form.stops.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3 border rounded">
                No stops yet. Pick customers from the dropdown above.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8">#</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs w-28 text-right">Minutes</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                    <TableHead className="text-xs w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.stops.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-mono">
                        <span className="flex items-center gap-1">
                          <GripVertical className="h-3 w-3 text-muted-foreground" />
                          {i + 1}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{customerName(s.customer_id)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={s.planned_duration_minutes}
                          onChange={e => updateStop(s.id, { planned_duration_minutes: Number(e.target.value) || 0 })}
                          onKeyDown={onEnterNext}
                          className="h-7 text-xs font-mono text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={s.notes ?? ''}
                          onChange={e => updateStop(s.id, { notes: e.target.value || null })}
                          onKeyDown={onEnterNext}
                          placeholder="Optional"
                          className="h-7 text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6"
                            onClick={() => moveStop(s.id, -1)} disabled={i === 0}>
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6"
                            onClick={() => moveStop(s.id, 1)} disabled={i === form.stops.length - 1}>
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6"
                            onClick={() => removeStop(s.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              className="text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button data-primary size="sm" onClick={handleSave}
              className="bg-orange-500 hover:bg-orange-600">
              <Save className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setForm(BLANK)}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
            {form.editingId && (
              <Badge variant="outline" className="text-[10px]">
                Editing {form.beat_code}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BeatRouteMaster(props: Props) {
  return <BeatRouteMasterPanel {...props} />;
}
