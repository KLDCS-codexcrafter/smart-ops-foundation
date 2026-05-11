/**
 * @file        src/pages/erp/sitex/closeout/DemobilizationWorkflow.tsx
 * @purpose     Site Demobilization Workflow UI (OOB #20) · orchestrates 5 closeout tasks · Compliance Lock gate
 * @sprint      T-Phase-1.A.15a · Block G.2
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send } from 'lucide-react';
import {
  initiateDemobilization, listDemobilizationTasks, completeDemobilizationTask, closeSite,
  type DemobilizationTask,
} from '@/lib/sitex-demobilization-engine';
import { listSites, checkCloseoutGuards } from '@/lib/sitex-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface Props { onNavigate: (m: string) => void }

export function DemobilizationWorkflow({ onNavigate: _onNavigate }: Props): JSX.Element {
  const entity = DEFAULT_ENTITY_SHORTCODE;
  const sites = useMemo(() => listSites(entity), [entity]);
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? '');
  const [tasks, setTasks] = useState<DemobilizationTask[]>([]);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!siteId) return;
    setTasks(listDemobilizationTasks(entity, siteId));
  }, [siteId, refresh, entity]);

  const start = (): void => {
    const r = initiateDemobilization(entity, siteId);
    if (r.allowed) setTasks(r.tasks);
  };

  const complete = (id: string): void => {
    completeDemobilizationTask(entity, siteId, id);
    setRefresh((x) => x + 1);
  };

  const guards = siteId ? checkCloseoutGuards(entity, siteId) : null;
  const finalize = (): void => {
    const r = closeSite(entity, siteId);
    setRefresh((x) => x + 1);
    if (!r.allowed) {
      alert(`Cannot close: ${r.failed_guards.join(', ')}`);
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Send className="h-6 w-6 text-amber-600" />
        <h1 className="text-2xl font-bold">Demobilization Workflow</h1>
      </div>

      <Card className="p-4">
        <select className="w-full border rounded-lg px-3 py-2 bg-background"
          value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">Select site...</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.site_code} · {s.site_name} · {s.status}</option>)}
        </select>
      </Card>

      {tasks.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm mb-3">No demobilization in progress.</p>
          <Button onClick={start} disabled={!siteId}>Initiate Demobilization</Button>
        </Card>
      ) : (
        <Card className="p-6 space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b">
              <div>
                <Badge variant="outline" className="mr-2">{t.category}</Badge>
                <span className={t.status === 'done' ? 'line-through text-muted-foreground' : ''}>{t.description}</span>
              </div>
              <Button size="sm" variant="outline" disabled={t.status === 'done'} onClick={() => complete(t.id)}>
                {t.status === 'done' ? 'Done' : 'Mark Done'}
              </Button>
            </div>
          ))}
        </Card>
      )}

      {guards && (
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Compliance Lock at Closeout · 8 Guards</h3>
          {guards.results.map((g) => (
            <div key={g.guard_name} className="flex justify-between py-1 text-sm">
              <span>{g.guard_name}</span>
              <Badge variant="outline" className={
                g.status === 'pass' ? 'border-success text-success'
                  : g.status === 'fail' ? 'border-destructive text-destructive'
                  : 'border-muted text-muted-foreground'
              }>{g.status}</Badge>
            </div>
          ))}
          <Button className="mt-4" onClick={finalize} disabled={!guards.all_passed}>
            Close Site (final transition)
          </Button>
        </Card>
      )}
    </div>
  );
}
