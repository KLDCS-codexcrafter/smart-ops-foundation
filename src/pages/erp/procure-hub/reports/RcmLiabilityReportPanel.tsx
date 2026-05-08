/**
 * @file        RcmLiabilityReportPanel.tsx
 * @purpose     RCM (reverse charge) liability register · uses cached bill.rcm_breakdown.
 * @who         Finance · GST compliance
 * @when        Sprint T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring · Block E
 * @sprint      T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring
 * @iso         25010 · Functional Suitability · Compliance
 * @decisions   D-NEW-AK · D-NEW-AL · D-NEW-AI (consumer)
 * @reuses      bill-passing-engine.listBillPassing · useEntityCode · decimal-helpers
 * @[JWT]       GET /api/bill-passing — localStorage-backed in Phase 1
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listBillPassing } from '@/lib/bill-passing-engine';
import { dSum, round2 } from '@/lib/decimal-helpers';
import { Card, CardContent } from '@/components/ui/card';

const fmtMoney = (n: number): string => `₹${n.toLocaleString('en-IN')}`;
const fmtPeriod = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';

export function RcmLiabilityReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();

  const rows = useMemo(() => {
    return listBillPassing(entityCode)
      .filter((b) => b.rcm_breakdown && b.rcm_breakdown.is_rcm_applicable);
  }, [entityCode]);

  const totalLiableValue = round2(dSum(rows, (b) => b.total_invoice_value));
  const totalRcm = round2(dSum(rows, (b) => b.rcm_breakdown?.rcm_amount ?? 0));

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">RCM Liability</h1>
        <p className="text-sm text-muted-foreground">Reverse charge mechanism · self-assessed GST liability.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">RCM Bills</div>
          <div className="text-2xl font-mono font-bold mt-1">{rows.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Liable Value</div>
          <div className="text-2xl font-mono font-bold mt-1">{fmtMoney(totalLiableValue)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">RCM Tax Liability</div>
          <div className="text-2xl font-mono font-bold mt-1 text-warning">{fmtMoney(totalRcm)}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No RCM-liable bills.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Vendor</th>
                  <th className="text-left p-2">Bill #</th>
                  <th className="text-right p-2">Basic</th>
                  <th className="text-right p-2">RCM Amount</th>
                  <th className="text-left p-2">Period</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t hover:bg-accent cursor-pointer"
                    onClick={() => { window.location.href = `/erp/bill-passing?bill_id=${b.id}`; }}
                  >
                    <td className="p-2">{b.vendor_name}</td>
                    <td className="p-2 font-mono">{b.bill_no}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(b.gst_breakdown?.basic ?? b.total_invoice_value)}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(b.rcm_breakdown?.rcm_amount ?? 0)}</td>
                    <td className="p-2 text-xs">{fmtPeriod(b.bill_date)}</td>
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
