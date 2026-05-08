/**
 * @file        ThreeWayMatchStatusPanel.tsx
 * @purpose     3-way / 4-way match status pivot · clean / variance / awaiting-qa / qa-failed.
 * @who         Procurement · Bill Passing operator
 * @when        Sprint T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring · Block E
 * @sprint      T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring
 * @iso         25010 · Functional Suitability
 * @decisions   D-NEW-AK · D-NEW-AL
 * @reuses      bill-passing-engine.listBillPassing · runMatch · useEntityCode · useCurrentUser
 * @[JWT]       GET /api/bill-passing — localStorage-backed in Phase 1
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { listBillPassing, runMatch } from '@/lib/bill-passing-engine';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const STATUS_LABEL: Record<string, string> = {
  matched_clean: 'Clean',
  matched_with_variance: 'Variance',
  awaiting_qa: 'Awaiting QA',
  qa_failed: 'QA Failed',
  pending_match: 'Pending',
  approved_for_fcpi: 'Approved',
  fcpi_drafted: 'PI Drafted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

const STATUS_TONE: Record<string, string> = {
  matched_clean: 'bg-success/15 text-success',
  matched_with_variance: 'bg-warning/15 text-warning',
  awaiting_qa: 'bg-warning/15 text-warning',
  qa_failed: 'bg-destructive/15 text-destructive',
};

export function ThreeWayMatchStatusPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [tick, setTick] = useState(0);

  const bills = useMemo(() => {
    void tick;
    return listBillPassing(entityCode);
  }, [entityCode, tick]);

  const kpiClean = bills.filter((b) => b.status === 'matched_clean').length;
  const kpiVariance = bills.filter((b) => b.status === 'matched_with_variance').length;
  const kpiAwaitingQa = bills.filter((b) => b.status === 'awaiting_qa').length;
  const kpiQaFailed = bills.filter((b) => b.status === 'qa_failed').length;

  async function handleRunMatch(billId: string): Promise<void> {
    try {
      await runMatch(billId, entityCode, user?.id ?? 'system');
      setTick((n) => n + 1);
      toast.success('Match recomputed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Run match failed');
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">3-Way Match Status</h1>
        <p className="text-sm text-muted-foreground">PO · GRN · Invoice (+ QC) match across all bills.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Clean</div>
          <div className="text-2xl font-mono font-bold mt-1 text-success">{kpiClean}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">With Variance</div>
          <div className="text-2xl font-mono font-bold mt-1 text-warning">{kpiVariance}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Awaiting QA</div>
          <div className="text-2xl font-mono font-bold mt-1 text-warning">{kpiAwaitingQa}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">QA Failed</div>
          <div className="text-2xl font-mono font-bold mt-1 text-destructive">{kpiQaFailed}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {bills.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No bills yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Bill #</th>
                  <th className="text-left p-2">PO #</th>
                  <th className="text-left p-2">GRN #</th>
                  <th className="text-left p-2">Invoice #</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">Variance %</th>
                  <th className="text-left p-2">QC</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => {
                  const tone = STATUS_TONE[b.status] ?? 'bg-muted text-muted-foreground';
                  const qcLine = b.lines.find((l) => l.requires_inspection);
                  const qcLabel = !qcLine ? '—'
                    : qcLine.qa_passed === true ? 'Pass'
                    : qcLine.qa_passed === false ? 'Fail'
                    : 'Pending';
                  return (
                    <tr key={b.id} className="border-t hover:bg-accent">
                      <td className="p-2 font-mono">{b.bill_no}</td>
                      <td className="p-2 font-mono">{b.po_no}</td>
                      <td className="p-2 font-mono">{b.git_id ?? '—'}</td>
                      <td className="p-2 font-mono">{b.vendor_invoice_no}</td>
                      <td className="p-2">
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${tone}`}>
                          {STATUS_LABEL[b.status] ?? b.status}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono">{b.variance_pct.toFixed(2)}%</td>
                      <td className="p-2 text-xs">{qcLabel}</td>
                      <td className="p-2">
                        <button
                          type="button"
                          className="text-xs px-2 py-0.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25"
                          onClick={() => { void handleRunMatch(b.id); }}
                        >
                          Run Match
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
