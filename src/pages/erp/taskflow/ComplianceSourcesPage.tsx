/**
 * @file        src/pages/erp/taskflow/ComplianceSourcesPage.tsx
 * @purpose     S138 Governance · Comply360 read-only bridge (TF-11)
 * @sprint      Sprint 138 · T-TaskFlow-A641.2 · Block 4
 * @decisions   READ-ONLY consumption of Comply360 obligations + audit observations.
 *              ComplianceModule.tsx remains 0-diff per §H.
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Search, ListPlus } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listComplianceSources, buildTaskDraftFromSource,
  type ComplianceSource,
} from '@/lib/taskflow-governance-engine';
import { createTask } from '@/lib/taskflow-engine';

export default function ComplianceSourcesPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [q, setQ] = useState('');
  const sources = useMemo(() => listComplianceSources(entityCode), [entityCode]);
  const [active, setActive] = useState<ComplianceSource | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return sources;
    return sources.filter((s) =>
      s.label.toLowerCase().includes(needle) || s.id.toLowerCase().includes(needle));
  }, [sources, q]);

  const createFromSource = (s: ComplianceSource): void => {
    setCreating(true);
    try {
      const draft = buildTaskDraftFromSource(s, { creatorId: 'me', entityId });
      const t = createTask(entityCode, draft);
      toast.success(`Task ${t.code} created from ${s.type}`);
      setActive(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compliance Bridge</h1>
        <p className="text-sm text-muted-foreground">
          One-click creation of TaskFlow tasks from Comply360 obligations and internal-audit observations.
          Source engines are read-only.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Sources ({filtered.length}/{sources.length})</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search…" value={q}
              onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No Comply360 sources available.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((s) => (
                <li key={`${s.type}-${s.id}`} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{s.type}</Badge>
                      <p className="font-medium truncate">{s.label}</p>
                    </div>
                    <p className="font-mono text-xs text-muted-foreground">{s.id}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setActive(s)} className="gap-2">
                    <ListPlus className="h-4 w-4" /> Create task
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create task from compliance source</DialogTitle></DialogHeader>
          {active && (
            <div className="text-sm space-y-2 py-2">
              <p><span className="text-muted-foreground">Source:</span> <Badge variant="outline">{active.type}</Badge></p>
              <p><span className="text-muted-foreground">ID:</span> <span className="font-mono">{active.id}</span></p>
              <p><span className="text-muted-foreground">Label:</span> {active.label}</p>
              <p className="text-xs text-muted-foreground">
                Category will be auto-set to {active.type === 'obligation' ? 'compliance' : 'internal_audit'}.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setActive(null)}>Cancel</Button>
            <Button disabled={creating} onClick={() => active && createFromSource(active)}>
              {creating ? 'Creating…' : 'Create task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
