/**
 * @file        src/pages/erp/servicedesk/amc-pipeline/AMCApplicabilityDecision.tsx
 * @purpose     Q-LOCK-1 · MANUAL applicability decision UI · audit trail capture
 * @sprint      T-Phase-1.C.1b · Block D.1
 * @iso        Functional Suitability + Maintainability
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import {
  getAMCsAwaitingApplicabilityDecision,
  decideAMCApplicability,
} from '@/lib/servicedesk-engine';
import type { AMCRecord } from '@/types/servicedesk';

export function AMCApplicabilityDecision(): JSX.Element {
  const [list, setList] = useState<AMCRecord[]>([]);
  const [open, setOpen] = useState<AMCRecord | null>(null);
  const [applicable, setApplicable] = useState<'yes' | 'no'>('yes');
  const [reason, setReason] = useState('');

  const refresh = (): void => setList(getAMCsAwaitingApplicabilityDecision());
  useEffect(refresh, []);

  const onSave = (): void => {
    if (!open) return;
    try {
      decideAMCApplicability(open.id, applicable === 'yes', 'current_user', reason);
      toast.success(`AMC ${applicable === 'yes' ? 'applicable' : 'not applicable'} · saved`);
      setOpen(null);
      setReason('');
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const empty = useMemo(() => list.length === 0, [list]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">AMC Applicability Decision</h1>
      <p className="text-sm text-muted-foreground">
        MANUAL discipline · founder Q1-Q4 lock · every applicability call captures decided_by + reason.
      </p>
      <Card className="p-0 overflow-hidden">
        {empty ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No AMC records awaiting decision.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">OEM</th>
                <th className="px-4 py-2">Sales Invoice</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-2">{r.customer_id}</td>
                  <td className="px-4 py-2">{r.oem_name || '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.sales_invoice_id ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{r.created_at.slice(0, 10)}</td>
                  <td className="px-4 py-2 text-right">
                    <Button size="sm" onClick={() => { setOpen(r); setApplicable('yes'); setReason(''); }}>
                      Decide
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AMC Applicability · {open?.customer_id}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={applicable} onValueChange={(v) => setApplicable(v as 'yes' | 'no')}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="apply-y" />
                <Label htmlFor="apply-y">Yes · AMC applicable</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="apply-n" />
                <Label htmlFor="apply-n">No · not applicable</Label>
              </div>
            </RadioGroup>
            <div>
              <Label htmlFor="reason">Reason {applicable === 'no' ? '(required)' : '(optional)'}</Label>
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={onSave} disabled={applicable === 'no' && !reason.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
