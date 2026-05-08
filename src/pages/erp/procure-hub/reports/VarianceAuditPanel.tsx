/**
 * @file        VarianceAuditPanel.tsx
 * @purpose     Variance audit register · matched_with_variance ∪ qa_failed · approval trail.
 * @who         Audit · Procurement controller
 * @when        Sprint T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring · Block E
 * @sprint      T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring
 * @iso         25010 · Functional Suitability · Auditability
 * @decisions   D-NEW-AK · D-NEW-AL
 * @reuses      bill-passing-engine.listMatchedWithVariance · listBillPassing · useEntityCode
 * @[JWT]       GET /api/bill-passing?status=variance|qa_failed — localStorage-backed in Phase 1
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listBillPassing, listMatchedWithVariance } from '@/lib/bill-passing-engine';
import { dSum, round2 } from '@/lib/decimal-helpers';
import { Card, CardContent } from '@/components/ui/card';

const fmtMoney = (n: number): string => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function variancePrimaryReason(b: { lines: Array<{ match_status: string; variance_reason: string }> }): string {
  const v = b.lines.find((l) => l.match_status !== 'clean');
  return v ? v.variance_reason || v.match_status : '—';
}

export function VarianceAuditPanel(): JSX.Element {
  const { entityCode } = useEntityCode();

  const bills = useMemo(() => {
    const variance = listMatchedWithVariance(entityCode);
    const qaFailed = listBillPassing(entityCode).filter((b) => b.status === 'qa_failed');
    return [...variance, ...qaFailed];
  }, [entityCode]);

  const totalVariance = round2(dSum(bills, (b) => Math.abs(b.total_variance)));
  const avgVariancePct = bills.length === 0 ? 0
    : round2(dSum(bills, (b) => Math.abs(b.variance_pct)) / bills.length);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Variance Audit</h1>
        <p className="text-sm text-muted-foreground">Bills with variance or QA failure · approval trail visible.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Bills</div>
          <div className="text-2xl font-mono font-bold mt-1">{bills.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Variance</div>
          <div className="text-2xl font-mono font-bold mt-1 text-destructive">{fmtMoney(totalVariance)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Avg Variance %</div>
          <div className="text-2xl font-mono font-bold mt-1 text-warning">{avgVariancePct.toFixed(2)}%</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {bills.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No variance bills.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Bill #</th>
                  <th className="text-left p-2">Vendor</th>
                  <th className="text-left p-2">Variance Type</th>
                  <th className="text-right p-2">Variance ₹</th>
                  <th className="text-right p-2">Variance %</th>
                  <th className="text-left p-2">Approved On</th>
                  <th className="text-left p-2">Approval Notes</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id} className="border-t hover:bg-accent">
                    <td className="p-2 font-mono">{b.bill_no}</td>
                    <td className="p-2">{b.vendor_name}</td>
                    <td className="p-2 text-xs">{variancePrimaryReason(b)}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(b.total_variance)}</td>
                    <td className="p-2 text-right font-mono">{b.variance_pct.toFixed(2)}%</td>
                    <td className="p-2 text-xs">{fmtDate(b.approved_at ?? '')}</td>
                    <td className="p-2 text-xs text-muted-foreground truncate max-w-xs">
                      {b.approval_notes || '—'}
                    </td>
                    <td className="p-2">
                      <button
                        type="button"
                        className="text-xs px-2 py-0.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25"
                        onClick={() => { window.location.href = `/erp/bill-passing?bill_id=${b.id}`; }}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
