/**
 * @file        TdsDeductionReportPanel.tsx
 * @purpose     TDS deduction register · uses cached bill.tds_breakdown (D-NEW-AI).
 * @who         Finance · TDS compliance
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

function quarterOf(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const fyStart = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const q = Math.floor(((d.getMonth() + 9) % 12) / 3) + 1;
  return `FY${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)} Q${q}`;
}

export function TdsDeductionReportPanel(): JSX.Element {
  const { entityCode } = useEntityCode();

  const rows = useMemo(() => {
    return listBillPassing(entityCode)
      .filter((b) => b.tds_breakdown && b.tds_breakdown.applicable);
  }, [entityCode]);

  const totalTds = round2(dSum(rows, (b) => b.tds_breakdown?.amount ?? 0));
  const vendorCount = new Set(rows.map((b) => b.vendor_id)).size;
  const currentQuarter = quarterOf(new Date().toISOString());
  const qtdTds = round2(dSum(
    rows.filter((b) => quarterOf(b.bill_date) === currentQuarter),
    (b) => b.tds_breakdown?.amount ?? 0,
  ));

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">TDS Deduction</h1>
        <p className="text-sm text-muted-foreground">Section-wise TDS · derived from cached tax breakdown.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total TDS</div>
          <div className="text-2xl font-mono font-bold mt-1">{fmtMoney(totalTds)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Vendors</div>
          <div className="text-2xl font-mono font-bold mt-1">{vendorCount}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">QTD ({currentQuarter})</div>
          <div className="text-2xl font-mono font-bold mt-1">{fmtMoney(qtdTds)}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No TDS-applicable bills (requires GSTINs on bill creation).
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Vendor</th>
                  <th className="text-left p-2">Section</th>
                  <th className="text-left p-2">Bill #</th>
                  <th className="text-right p-2">Bill Value</th>
                  <th className="text-right p-2">Rate %</th>
                  <th className="text-right p-2">TDS Amount</th>
                  <th className="text-left p-2">Quarter</th>
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
                    <td className="p-2 font-mono text-xs">{b.tds_breakdown?.section ?? '—'}</td>
                    <td className="p-2 font-mono">{b.bill_no}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(b.total_invoice_value)}</td>
                    <td className="p-2 text-right font-mono">{(b.tds_breakdown?.rate ?? 0).toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(b.tds_breakdown?.amount ?? 0)}</td>
                    <td className="p-2 text-xs">{quarterOf(b.bill_date)}</td>
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
