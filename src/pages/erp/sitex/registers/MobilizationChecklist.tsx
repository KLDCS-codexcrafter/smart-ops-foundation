/**
 * @file        src/pages/erp/sitex/registers/MobilizationChecklist.tsx
 * @purpose     Mobilization Checklist UI (OOB #13) · mode-aware items · gates 'mobilizing' → 'active'
 * @sprint      T-Phase-1.A.15a · OOB #13 · Block C.2
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ListChecks } from 'lucide-react';
import {
  listSites, generateMobilizationChecklist, isReadyToTransitionFromMobilizing,
  type MobilizationChecklistItem,
} from '@/lib/sitex-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface Props { onNavigate: (m: string) => void }

export function MobilizationChecklist({ onNavigate: _onNavigate }: Props): JSX.Element {
  const entity = DEFAULT_ENTITY_SHORTCODE;
  const sites = useMemo(() => listSites(entity), [entity]);
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? '');
  const [items, setItems] = useState<MobilizationChecklistItem[]>([]);

  useEffect(() => {
    const site = sites.find((s) => s.id === siteId);
    if (site) setItems(generateMobilizationChecklist(site));
  }, [siteId, sites]);

  const toggle = (id: string): void => {
    setItems((arr) => arr.map((i) => i.id === id ? {
      ...i, is_complete: !i.is_complete,
      completed_by: !i.is_complete ? 'demo-user' : null,
      completed_at: !i.is_complete ? new Date().toISOString() : null,
    } : i));
  };

  const site = sites.find((s) => s.id === siteId);
  const ready = site ? isReadyToTransitionFromMobilizing(site, items) : { allowed: false, pending_items: [] };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ListChecks className="h-6 w-6 text-amber-600" />
        <h1 className="text-2xl font-bold">Site Mobilization Checklist</h1>
      </div>

      <Card className="p-4">
        <label className="text-sm font-medium block mb-2">Site</label>
        <select className="w-full border rounded-lg px-3 py-2 bg-background"
          value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">Select site...</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.site_code} · {s.site_name} · {s.site_mode}</option>)}
        </select>
      </Card>

      <Card className="p-6 space-y-2">
        {items.map((it) => (
          <label key={it.id} className="flex items-center gap-3 py-1 cursor-pointer">
            <Checkbox checked={it.is_complete} onCheckedChange={() => toggle(it.id)} />
            <span className={it.is_complete ? 'line-through text-muted-foreground' : ''}>
              <span className="text-xs uppercase mr-2 text-amber-600">{it.category}</span>
              {it.description}
            </span>
          </label>
        ))}
        <div className="pt-4 border-t mt-4">
          {ready.allowed ? (
            <div className="text-sm text-success">All required items complete · ready to transition to 'active'</div>
          ) : (
            <div className="text-sm text-warning">{ready.pending_items.length} pending items</div>
          )}
          <Button className="mt-3" disabled={!ready.allowed}>Transition to Active</Button>
        </div>
      </Card>
    </div>
  );
}
