/**
 * SchemeMaster.tsx — Promotional scheme CRUD
 * Sprint 12. Panel export for Command Center.
 * [JWT] GET/POST/PUT/DELETE /api/schemes
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Plus, Save, Trash2, Search, Sparkles, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  schemesKey, type Scheme, type SchemeType, type SchemeStatus,
  type SchemeAudience, type BuyNGetMPayload, type SlabDiscountPayload,
  type FlatPercentPayload, type FlatAmountPayload, type QPSTargetPayload,
  type BundlePayload, type FreeSamplePayload,
} from '@/types/scheme';
import { seedDemoSchemes } from '@/lib/scheme-seed';

const ENTITY = 'SMRT';

const SCHEME_TYPES: { value: SchemeType; label: string }[] = [
  { value: 'buy_n_get_m',   label: 'Buy N Get M Free' },
  { value: 'slab_discount', label: 'Slab Discount' },
  { value: 'flat_percent',  label: 'Flat % Off' },
  { value: 'flat_amount',   label: 'Flat ₹ Off' },
  { value: 'qps_target',    label: 'QPS Target' },
  { value: 'bundle',        label: 'Bundle' },
  { value: 'free_sample',   label: 'Free Sample' },
];

const STATUSES: SchemeStatus[] = ['draft', 'active', 'paused', 'expired'];
const AUDIENCES: SchemeAudience[] = ['distributor', 'customer', 'both'];
const TIERS: Array<'gold' | 'silver' | 'bronze'> = ['gold', 'silver', 'bronze'];

function readSchemes(): Scheme[] {
  try {
    // [JWT] GET /api/schemes
    const raw = localStorage.getItem(schemesKey(ENTITY));
    if (raw) return JSON.parse(raw) as Scheme[];
  } catch { /* ignore */ }
  return [];
}

function writeSchemes(list: Scheme[]): void {
  try {
    // [JWT] POST/PUT/DELETE /api/schemes
    localStorage.setItem(schemesKey(ENTITY), JSON.stringify(list));
  } catch { toast.error('Failed to save schemes'); }
}

function emptyPayload(t: SchemeType): Scheme['payload'] {
  switch (t) {
    case 'buy_n_get_m':   return { trigger_item_id: '', trigger_qty: 10, reward_item_id: '', reward_qty: 1 };
    case 'slab_discount': return { slabs: [{ min_qty: 50, discount_percent: 5 }] };
    case 'flat_percent':  return { discount_percent: 5 };
    case 'flat_amount':   return { discount_paise: 50_000 };
    case 'qps_target':    return { period_start: new Date().toISOString().slice(0, 10),
                                   period_end: new Date().toISOString().slice(0, 10),
                                   target_qty: 500, rebate_percent: 5 };
    case 'bundle':        return { components: [{ item_id: '', qty: 1 }], bundle_price_paise: 10_000 };
    case 'free_sample':   return { sample_item_id: '', sample_qty: 1, min_purchase_value_paise: 100_000 };
  }
}

function blankScheme(): Scheme {
  const now = new Date().toISOString();
  return {
    id: `scm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: ENTITY,
    code: '', name: '', description: '',
    type: 'flat_percent', status: 'draft',
    valid_from: now.slice(0, 10), valid_until: null,
    scope: { audience: 'distributor' },
    payload: emptyPayload('flat_percent'),
    priority: 5, stackable: false,
    max_uses_per_customer: null,
    created_at: now, updated_at: now, created_by: 'admin',
  };
}

export function SchemeMasterPanel() {
  const [list, setList] = useState<Scheme[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | SchemeType>('all');

  // First-run seed
  useEffect(() => {
    const existing = readSchemes();
    if (existing.length === 0) {
      const seeded = seedDemoSchemes(ENTITY);
      writeSchemes(seeded);
      setList(seeded);
      setSelectedId(seeded[0]?.id ?? null);
    } else {
      setList(existing);
      setSelectedId(existing[0]?.id ?? null);
    }
  }, []);

  const filtered = useMemo(() => {
    return list.filter(s => {
      if (typeFilter !== 'all' && s.type !== typeFilter) return false;
      if (search && !`${s.code} ${s.name}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [list, search, typeFilter]);

  const selected = list.find(s => s.id === selectedId) ?? null;

  const update = useCallback((patch: Partial<Scheme>) => {
    if (!selected) return;
    setList(prev => prev.map(s => s.id === selected.id ? { ...s, ...patch } : s));
  }, [selected]);

  const handleSave = () => {
    if (!selected) return;
    if (!selected.code || !selected.name) { toast.error('Code & Name required'); return; }
    const next = list.map(s => s.id === selected.id
      ? { ...selected, updated_at: new Date().toISOString() } : s);
    writeSchemes(next);
    setList(next);
    toast.success(`Scheme ${selected.code} saved`);
  };

  const handleNew = () => {
    const fresh = blankScheme();
    const next = [...list, fresh];
    setList(next);
    writeSchemes(next);
    setSelectedId(fresh.id);
  };

  const handleDelete = () => {
    if (!selected) return;
    if (!window.confirm(`Delete scheme "${selected.code}"?`)) return;
    const next = list.filter(s => s.id !== selected.id);
    setList(next);
    writeSchemes(next);
    setSelectedId(next[0]?.id ?? null);
    toast.success('Scheme deleted');
  };

  const handleDuplicate = () => {
    if (!selected) return;
    const dup: Scheme = {
      ...selected,
      id: `scm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: `${selected.code}-COPY`,
      name: `${selected.name} (Copy)`,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const next = [...list, dup];
    setList(next);
    writeSchemes(next);
    setSelectedId(dup.id);
    toast.success('Scheme duplicated');
  };

  const onTypeChange = (t: SchemeType) => {
    if (!selected) return;
    update({ type: t, payload: emptyPayload(t) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <h1 className="text-2xl font-bold">Sales Schemes</h1>
          <Badge className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20">Sprint 12</Badge>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleNew} variant="outline" size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" /> New Scheme
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* LEFT — list */}
        <Card className="col-span-12 md:col-span-4">
          <CardContent className="p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search schemes" className="pl-7 text-xs h-8"
              />
            </div>
            <Select value={typeFilter} onValueChange={v => setTypeFilter(v as 'all' | SchemeType)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {SCHEME_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No schemes</p>
              ) : filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left p-2 rounded-md text-xs transition-colors ${
                    selectedId === s.id
                      ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30'
                      : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono font-semibold truncate">{s.code}</p>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">{s.status}</Badge>
                  </div>
                  <p className="text-muted-foreground truncate mt-0.5">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {SCHEME_TYPES.find(t => t.value === s.type)?.label}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — editor */}
        <Card className="col-span-12 md:col-span-8">
          <CardContent className="p-4">
            {!selected ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                Select a scheme or create a new one.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button onClick={handleSave} size="sm" className="bg-violet-500 hover:bg-violet-600 text-white">
                    <Save className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                  <Button onClick={handleDuplicate} size="sm" variant="outline">
                    <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
                  </Button>
                  <Button onClick={handleDelete} size="sm" variant="outline" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>

                {/* Basic */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">Basic</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Code</Label>
                      <Input value={selected.code} onChange={e => update({ code: e.target.value.toUpperCase() })} className="text-xs h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input value={selected.name} onChange={e => update({ name: e.target.value })} className="text-xs h-8" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Description</Label>
                      <Textarea rows={2} value={selected.description} onChange={e => update({ description: e.target.value })} className="text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={selected.status} onValueChange={v => update({ status: v as SchemeStatus })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Priority</Label>
                      <Input type="number" value={selected.priority} onChange={e => update({ priority: Number(e.target.value) || 0 })} className="text-xs h-8" />
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Switch checked={selected.stackable} onCheckedChange={v => update({ stackable: v })} />
                      <Label className="text-xs">Stackable with other schemes</Label>
                    </div>
                  </div>
                </section>

                {/* Validity */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">Validity</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Valid From</Label>
                      <Input type="date" value={selected.valid_from.slice(0, 10)} onChange={e => update({ valid_from: e.target.value })} className="text-xs h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">Valid Until</Label>
                      <Input type="date" value={selected.valid_until?.slice(0, 10) ?? ''} onChange={e => update({ valid_until: e.target.value || null })} className="text-xs h-8" />
                    </div>
                  </div>
                </section>

                {/* Type */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">Scheme Type</h3>
                  <Select value={selected.type} onValueChange={v => onTypeChange(v as SchemeType)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCHEME_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <PayloadEditor scheme={selected} onChange={p => update({ payload: p })} />
                </section>

                {/* Scope */}
                <section className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">Scope</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Audience</Label>
                      <Select value={selected.scope.audience} onValueChange={v => update({ scope: { ...selected.scope, audience: v as SchemeAudience } })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Min Order Value (₹)</Label>
                      <Input
                        type="number"
                        value={(selected.scope.min_order_value_paise ?? 0) / 100}
                        onChange={e => update({ scope: { ...selected.scope, min_order_value_paise: Math.round((Number(e.target.value) || 0) * 100) } })}
                        className="text-xs h-8"
                      />
                    </div>
                    {(selected.scope.audience === 'distributor' || selected.scope.audience === 'both') && (
                      <div className="col-span-2">
                        <Label className="text-xs">Distributor Tiers (comma-separated, leave empty for all)</Label>
                        <div className="flex gap-2 mt-1">
                          {TIERS.map(tier => (
                            <button
                              key={tier}
                              onClick={() => {
                                const cur = selected.scope.distributor_tiers ?? [];
                                const next = cur.includes(tier) ? cur.filter(t => t !== tier) : [...cur, tier];
                                update({ scope: { ...selected.scope, distributor_tiers: next.length === 0 ? undefined : next } });
                              }}
                              className={`px-2 py-1 text-xs rounded border capitalize ${
                                selected.scope.distributor_tiers?.includes(tier)
                                  ? 'bg-violet-500/15 border-violet-500/30 text-violet-700'
                                  : 'border-border text-muted-foreground'
                              }`}
                            >
                              {tier}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="col-span-2">
                      <Label className="text-xs">Item IDs (comma-separated, empty = all)</Label>
                      <Input
                        value={(selected.scope.item_ids ?? []).join(', ')}
                        onChange={e => {
                          const ids = e.target.value.split(',').map(x => x.trim()).filter(Boolean);
                          update({ scope: { ...selected.scope, item_ids: ids.length === 0 ? undefined : ids } });
                        }}
                        className="text-xs h-8 font-mono"
                      />
                    </div>
                  </div>
                </section>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Dynamic payload editor by scheme type. */
function PayloadEditor({ scheme, onChange }: { scheme: Scheme; onChange: (p: Scheme['payload']) => void }) {
  switch (scheme.type) {
    case 'buy_n_get_m': {
      const p = scheme.payload as BuyNGetMPayload;
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Trigger Item ID</Label>
            <Input value={p.trigger_item_id} onChange={e => onChange({ ...p, trigger_item_id: e.target.value })} className="text-xs h-8 font-mono" />
          </div>
          <div>
            <Label className="text-xs">Trigger Qty</Label>
            <Input type="number" value={p.trigger_qty} onChange={e => onChange({ ...p, trigger_qty: Number(e.target.value) || 0 })} className="text-xs h-8" />
          </div>
          <div>
            <Label className="text-xs">Reward Item ID</Label>
            <Input value={p.reward_item_id} onChange={e => onChange({ ...p, reward_item_id: e.target.value })} className="text-xs h-8 font-mono" />
          </div>
          <div>
            <Label className="text-xs">Reward Qty</Label>
            <Input type="number" value={p.reward_qty} onChange={e => onChange({ ...p, reward_qty: Number(e.target.value) || 0 })} className="text-xs h-8" />
          </div>
        </div>
      );
    }
    case 'slab_discount': {
      const p = scheme.payload as SlabDiscountPayload;
      return (
        <div className="space-y-2">
          {p.slabs.map((slab, i) => (
            <div key={`slab-${i}`} className="flex items-center gap-2">
              <Label className="text-xs">Min Qty</Label>
              <Input type="number" value={slab.min_qty}
                onChange={e => onChange({ slabs: p.slabs.map((s, si) => si === i ? { ...s, min_qty: Number(e.target.value) || 0 } : s) })}
                className="text-xs h-8 w-24" />
              <Label className="text-xs">Discount %</Label>
              <Input type="number" step="0.1" value={slab.discount_percent}
                onChange={e => onChange({ slabs: p.slabs.map((s, si) => si === i ? { ...s, discount_percent: Number(e.target.value) || 0 } : s) })}
                className="text-xs h-8 w-24" />
              <Button variant="ghost" size="sm" onClick={() => onChange({ slabs: p.slabs.filter((_, si) => si !== i) })}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChange({ slabs: [...p.slabs, { min_qty: 100, discount_percent: 5 }] })}>
            <Plus className="h-3 w-3 mr-1" /> Add Slab
          </Button>
        </div>
      );
    }
    case 'flat_percent': {
      const p = scheme.payload as FlatPercentPayload;
      return (
        <div>
          <Label className="text-xs">Discount %</Label>
          <Input type="number" step="0.1" value={p.discount_percent}
            onChange={e => onChange({ discount_percent: Number(e.target.value) || 0 })} className="text-xs h-8 w-32" />
        </div>
      );
    }
    case 'flat_amount': {
      const p = scheme.payload as FlatAmountPayload;
      return (
        <div>
          <Label className="text-xs">Discount (₹)</Label>
          <Input type="number" value={p.discount_paise / 100}
            onChange={e => onChange({ discount_paise: Math.round((Number(e.target.value) || 0) * 100) })}
            className="text-xs h-8 w-32" />
        </div>
      );
    }
    case 'qps_target': {
      const p = scheme.payload as QPSTargetPayload;
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Period Start</Label>
            <Input type="date" value={p.period_start.slice(0, 10)} onChange={e => onChange({ ...p, period_start: e.target.value })} className="text-xs h-8" />
          </div>
          <div>
            <Label className="text-xs">Period End</Label>
            <Input type="date" value={p.period_end.slice(0, 10)} onChange={e => onChange({ ...p, period_end: e.target.value })} className="text-xs h-8" />
          </div>
          <div>
            <Label className="text-xs">Target Qty</Label>
            <Input type="number" value={p.target_qty} onChange={e => onChange({ ...p, target_qty: Number(e.target.value) || 0 })} className="text-xs h-8" />
          </div>
          <div>
            <Label className="text-xs">Rebate %</Label>
            <Input type="number" step="0.1" value={p.rebate_percent} onChange={e => onChange({ ...p, rebate_percent: Number(e.target.value) || 0 })} className="text-xs h-8" />
          </div>
        </div>
      );
    }
    case 'bundle': {
      const p = scheme.payload as BundlePayload;
      return (
        <div className="space-y-2">
          {p.components.map((c, i) => (
            <div key={`bundle-${i}`} className="flex items-center gap-2">
              <Label className="text-xs">Item ID</Label>
              <Input value={c.item_id}
                onChange={e => onChange({ ...p, components: p.components.map((x, xi) => xi === i ? { ...x, item_id: e.target.value } : x) })}
                className="text-xs h-8 font-mono w-40" />
              <Label className="text-xs">Qty</Label>
              <Input type="number" value={c.qty}
                onChange={e => onChange({ ...p, components: p.components.map((x, xi) => xi === i ? { ...x, qty: Number(e.target.value) || 0 } : x) })}
                className="text-xs h-8 w-20" />
              <Button variant="ghost" size="sm" onClick={() => onChange({ ...p, components: p.components.filter((_, xi) => xi !== i) })}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => onChange({ ...p, components: [...p.components, { item_id: '', qty: 1 }] })}>
            <Plus className="h-3 w-3 mr-1" /> Add Component
          </Button>
          <div>
            <Label className="text-xs">Bundle Price (₹)</Label>
            <Input type="number" value={p.bundle_price_paise / 100}
              onChange={e => onChange({ ...p, bundle_price_paise: Math.round((Number(e.target.value) || 0) * 100) })}
              className="text-xs h-8 w-32" />
          </div>
        </div>
      );
    }
    case 'free_sample': {
      const p = scheme.payload as FreeSamplePayload;
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Sample Item ID</Label>
            <Input value={p.sample_item_id} onChange={e => onChange({ ...p, sample_item_id: e.target.value })} className="text-xs h-8 font-mono" />
          </div>
          <div>
            <Label className="text-xs">Sample Qty</Label>
            <Input type="number" value={p.sample_qty} onChange={e => onChange({ ...p, sample_qty: Number(e.target.value) || 0 })} className="text-xs h-8" />
          </div>
          <div>
            <Label className="text-xs">Min Purchase (₹)</Label>
            <Input type="number" value={p.min_purchase_value_paise / 100}
              onChange={e => onChange({ ...p, min_purchase_value_paise: Math.round((Number(e.target.value) || 0) * 100) })}
              className="text-xs h-8" />
          </div>
        </div>
      );
    }
  }
}

export default SchemeMasterPanel;
