/**
 * IncentiveSchemeMaster.tsx — Cash discount scheme master
 */
import { useState, useCallback } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { receivxSchemesKey, type IncentiveScheme } from '@/types/receivx';

interface Props { entityCode: string }

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/receivx/schemes
    return JSON.parse(localStorage.getItem(k) || '[]');
  } catch { return []; }
}

export function IncentiveSchemeMasterPanel({ entityCode }: Props) {
  const [list, setList] = useState<IncentiveScheme[]>(() => ls<IncentiveScheme>(receivxSchemesKey(entityCode)));
  const [selectedId, setSelectedId] = useState<string | null>(list[0]?.id ?? null);
  const selected = list.find(s => s.id === selectedId) ?? null;

  const persist = useCallback((next: IncentiveScheme[]) => {
    setList(next);
    try {
      // [JWT] POST /api/receivx/schemes
      localStorage.setItem(receivxSchemesKey(entityCode), JSON.stringify(next));
    } catch { toast.error('Save failed'); }
  }, [entityCode]);

  const handleSave = useCallback(() => {
    if (!selected) return;
    persist(list.map(s => s.id === selected.id ? { ...selected, updated_at: new Date().toISOString() } : s));
    toast.success('Scheme saved');
  }, [selected, list, persist]);

  useCtrlS(selected ? handleSave : () => {});

  const addScheme = () => {
    const now = new Date().toISOString();
    const s: IncentiveScheme = {
      id: `is-${Date.now()}`, entity_id: entityCode,
      scheme_code: `IS-${list.length + 1}`, scheme_name: 'New Scheme',
      applicable_to: 'all_customers', customer_category_ids: [], specific_customer_ids: [],
      tiers: [{ pay_within_days: 5, discount_pct: 2 }, { pay_within_days: 10, discount_pct: 1 }],
      valid_from: now.slice(0, 10), valid_until: null,
      is_active: true, created_at: now, updated_at: now,
    };
    persist([...list, s]);
    setSelectedId(s.id);
  };

  const update = (patch: Partial<IncentiveScheme>) => {
    if (!selected) return;
    setList(list.map(s => s.id === selected.id ? { ...selected, ...patch } : s));
  };

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Incentive Schemes</h1>
          <p className="text-xs text-muted-foreground">Cash discount tiers for early payment</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addScheme}><Plus className="h-3.5 w-3.5 mr-1" />New</Button>
          <Button data-primary size="sm" onClick={handleSave} className="bg-amber-500 hover:bg-amber-600">
            <Save className="h-3.5 w-3.5 mr-1" />Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <Card className="col-span-4 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Schemes ({list.length})</p>
          <div className="space-y-1">
            {list.map(s => (
              <button key={s.id} onClick={() => setSelectedId(s.id)}
                className={`w-full text-left p-2 rounded text-xs ${selectedId === s.id ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'hover:bg-muted'}`}>
                <p className="font-medium">{s.scheme_name}</p>
                <p className="text-muted-foreground text-[10px]">{s.scheme_code}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="col-span-8 p-4">
          {!selected ? (
            <p className="text-xs text-muted-foreground text-center py-8">Select or create a scheme</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Code</Label><Input className="text-xs mt-1" value={selected.scheme_code} onKeyDown={onEnterNext} onChange={e => update({ scheme_code: e.target.value })} /></div>
                <div><Label className="text-xs">Name</Label><Input className="text-xs mt-1" value={selected.scheme_name} onKeyDown={onEnterNext} onChange={e => update({ scheme_name: e.target.value })} /></div>
                <div><Label className="text-xs">Valid From</Label><Input type="date" className="text-xs mt-1" value={selected.valid_from} onKeyDown={onEnterNext} onChange={e => update({ valid_from: e.target.value })} /></div>
                <div><Label className="text-xs">Valid Until</Label><Input type="date" className="text-xs mt-1" value={selected.valid_until ?? ''} onKeyDown={onEnterNext} onChange={e => update({ valid_until: e.target.value || null })} /></div>
                <div className="flex items-center gap-2 mt-5"><Switch checked={selected.is_active} onCheckedChange={v => update({ is_active: v })} /><Label className="text-xs">Active</Label></div>
              </div>

              <div>
                <Label className="text-xs">Discount Tiers</Label>
                <div className="space-y-2 mt-2">
                  {selected.tiers.map((t, i) => (
                    <div key={`tier-${i}`} className="flex items-center gap-2">
                      <span className="text-xs">Pay within</span>
                      <Input type="number" className="text-xs w-20" value={t.pay_within_days} onKeyDown={onEnterNext}
                        onChange={e => update({ tiers: selected.tiers.map((x, xi) => xi === i ? { ...x, pay_within_days: +e.target.value } : x) })} />
                      <span className="text-xs">days = </span>
                      <Input type="number" step="0.1" className="text-xs w-20" value={t.discount_pct} onKeyDown={onEnterNext}
                        onChange={e => update({ tiers: selected.tiers.map((x, xi) => xi === i ? { ...x, discount_pct: +e.target.value } : x) })} />
                      <span className="text-xs">%</span>
                      <Button variant="ghost" size="sm" onClick={() => update({ tiers: selected.tiers.filter((_, xi) => xi !== i) })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => update({ tiers: [...selected.tiers, { pay_within_days: 15, discount_pct: 0.5 }] })}>
                    <Plus className="h-3 w-3 mr-1" />Add Tier
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function IncentiveSchemeMaster() {
  return <IncentiveSchemeMasterPanel entityCode="SMRT" />;
}
