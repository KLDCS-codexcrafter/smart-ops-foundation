/**
 * @file        src/pages/erp/servicedesk/amc-pipeline/AMCExpiringList.tsx
 * @purpose     Q-LOCK-3 · Expiring window · cascade fire entry point
 * @sprint      T-Phase-1.C.1b · Block D.5
 * @iso        Functional Suitability + Usability
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  getAMCsExpiringInDays,
  getCascadeStageForAMC,
  fireRenewalCascadeStage,
  listCascadeFiresForAMC,
} from '@/lib/servicedesk-engine';
import {
  emitRenewalEmailToTemplateEngine,
  emitTellicallerWorkItem,
} from '@/lib/servicedesk-bridges';
import type { AMCRecord } from '@/types/servicedesk';

type Stage = 'first' | 'second' | 'third' | 'final';

export function AMCExpiringList(): JSX.Element {
  const [list, setList] = useState<AMCRecord[]>([]);
  const [open, setOpen] = useState<AMCRecord | null>(null);
  const [history, setHistory] = useState<AMCRecord | null>(null);
  const [stage, setStage] = useState<Stage>('first');
  const [templateId, setTemplateId] = useState('default');

  const refresh = (): void => setList(getAMCsExpiringInDays(90));
  useEffect(refresh, []);

  const sorted = useMemo(
    () =>
      [...list].sort((a, b) => {
        const aD = a.contract_end ? new Date(a.contract_end).getTime() : Infinity;
        const bD = b.contract_end ? new Date(b.contract_end).getTime() : Infinity;
        return aD - bD;
      }),
    [list],
  );

  const onFire = (): void => {
    if (!open) return;
    fireRenewalCascadeStage(open.id, stage, 'current_user', templateId);
    emitRenewalEmailToTemplateEngine({
      amc_record_id: open.id,
      customer_id: open.customer_id,
      template_id: templateId,
      cascade_stage: stage,
      language: 'en-IN',
    });
    if (stage === 'second' || stage === 'third' || stage === 'final') {
      emitTellicallerWorkItem({
        work_item_id: `wi_${Date.now()}`,
        customer_id: open.customer_id,
        amc_record_id: open.id,
        trigger_reason: `cascade_${stage}`,
        priority: stage === 'final' ? 'high' : 'medium',
        script_id: 'script-renewal-1',
        language_pref: 'hi',
        assigned_telecaller_id: null,
      });
    }
    toast.success(`Cascade ${stage} fired`);
    setOpen(null);
    refresh();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Expiring Soon (90-day window)</h1>
      <Card className="p-0 overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No AMCs expiring within 90 days.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2">AMC</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">End</th>
                <th className="px-4 py-2">Cascade</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const s = getCascadeStageForAMC(r.id);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 font-mono text-xs">{r.amc_code || r.id.slice(0, 12)}</td>
                    <td className="px-4 py-2">{r.customer_id}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.contract_end ?? '—'}</td>
                    <td className="px-4 py-2">
                      {(['first', 'second', 'third', 'final'] as Stage[]).map((x) => (
                        <Badge key={x} variant={x === s ? 'default' : 'outline'} className="mr-1">{x}</Badge>
                      ))}
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setHistory(r)}>History</Button>
                      <Button size="sm" onClick={() => { setOpen(r); setStage(s ?? 'first'); }}>Fire</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fire renewal cascade</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Stage</Label>
              <div className="flex gap-2 mt-1">
                {(['first', 'second', 'third', 'final'] as Stage[]).map((x) => (
                  <Button key={x} size="sm" variant={stage === x ? 'default' : 'outline'} onClick={() => setStage(x)}>
                    {x}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="tpl">Email template</Label>
              <Input id="tpl" value={templateId} onChange={(e) => setTemplateId(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={onFire}>Fire</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!history} onOpenChange={(v) => !v && setHistory(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cascade history</DialogTitle></DialogHeader>
          <ul className="text-xs space-y-1 font-mono max-h-80 overflow-auto">
            {history && listCascadeFiresForAMC(history.id).map((f) => (
              <li key={f.id}>{f.fired_at} · {f.stage} · {f.fired_by}</li>
            ))}
            {history && listCascadeFiresForAMC(history.id).length === 0 && (
              <li className="text-muted-foreground">No cascades fired yet.</li>
            )}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
