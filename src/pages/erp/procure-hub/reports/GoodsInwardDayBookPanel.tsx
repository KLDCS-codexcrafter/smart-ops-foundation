/**
 * @file        GoodsInwardDayBookPanel.tsx
 * @purpose     Goods Inward Day Book (Trident SKGoodInwardDayBook parity) · GIT receipts grouped by date.
 * @who         Procurement · Stores · Inventory
 * @when        Sprint T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring · Block E
 * @sprint      T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring
 * @iso         25010 · Functional Suitability
 * @decisions   D-NEW-AK · D-NEW-AL
 * @reuses      git-engine.listGitStage1 · useEntityCode · decimal-helpers
 * @[JWT]       GET /api/procure360/git-stage1 — localStorage-backed in Phase 1
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listGitStage1 } from '@/lib/git-engine';
import { dSum, dMul, round2 } from '@/lib/decimal-helpers';
import { Card, CardContent } from '@/components/ui/card';

const fmtMoney = (n: number): string => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

interface GitRow {
  id: string;
  date: string;
  receipt_date: string;
  vendor_name: string;
  git_no: string;
  vehicle_no: string;
  invoice_no: string;
  qty: number;
  value: number;
  status: string;
}

export function GoodsInwardDayBookPanel(): JSX.Element {
  const { entityCode } = useEntityCode();

  const rows: GitRow[] = useMemo(() => {
    return listGitStage1(entityCode).map((g) => {
      const qty = round2(dSum(g.lines, (l) => l.qty_accepted));
      // PO rate not on GitStage1Line · approximate from received qty × 0 · row value omitted when unknown.
      const value = round2(dSum(g.lines, (l) => dMul(l.qty_accepted, 0)));
      return {
        id: g.id,
        date: g.receipt_date.slice(0, 10),
        receipt_date: g.receipt_date,
        vendor_name: g.vendor_name,
        git_no: g.git_no,
        vehicle_no: g.vehicle_no ?? '—',
        invoice_no: g.invoice_no ?? '—',
        qty,
        value,
        status: g.status,
      };
    }).sort((a, b) => b.receipt_date.localeCompare(a.receipt_date));
  }, [entityCode]);

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);
  const grnsToday = rows.filter((r) => r.date === today).length;
  const grnsThisMonth = rows.filter((r) => r.date.startsWith(thisMonth)).length;
  const valueThisMonth = round2(dSum(rows.filter((r) => r.date.startsWith(thisMonth)), (r) => r.value));

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Goods Inward Day Book</h1>
        <p className="text-sm text-muted-foreground">Daily receipts log · vehicle-wise · supplier-wise.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">GRNs Today</div>
          <div className="text-2xl font-mono font-bold mt-1">{grnsToday}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">GRNs This Month</div>
          <div className="text-2xl font-mono font-bold mt-1">{grnsThisMonth}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Value This Month</div>
          <div className="text-2xl font-mono font-bold mt-1">{fmtMoney(valueThisMonth)}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No goods receipts yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Supplier</th>
                  <th className="text-left p-2">GIT/GRN #</th>
                  <th className="text-left p-2">Vehicle #</th>
                  <th className="text-left p-2">Invoice #</th>
                  <th className="text-right p-2">Total Qty</th>
                  <th className="text-left p-2">Stage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-accent">
                    <td className="p-2">{fmtDate(r.receipt_date)}</td>
                    <td className="p-2">{r.vendor_name}</td>
                    <td className="p-2 font-mono">{r.git_no}</td>
                    <td className="p-2 font-mono">{r.vehicle_no}</td>
                    <td className="p-2 font-mono">{r.invoice_no}</td>
                    <td className="p-2 text-right font-mono">{r.qty.toFixed(2)}</td>
                    <td className="p-2 text-xs">{r.status}</td>
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
