/**
 * @file        PiPendingPanel.tsx
 * @purpose     PI Pending report · drafts awaiting FineCore review · KPIs + drill-down.
 * @who         Procurement · Finance liaison
 * @when        Sprint T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring · Block E
 * @sprint      T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring
 * @iso         25010 · Functional Suitability · Reliability
 * @decisions   D-NEW-AK · D-NEW-AL
 * @reuses      finance-pi-bridge.listFcpiDrafts · useEntityCode · decimal-helpers
 * @[JWT]       GET /api/finance-pi/drafts?status=draft — localStorage-backed in Phase 1
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listFcpiDrafts } from '@/lib/finance-pi-bridge';
import { dSum, round2 } from '@/lib/decimal-helpers';
import { Card, CardContent } from '@/components/ui/card';

const MS_PER_DAY = 86_400_000;
const fmtMoney = (n: number): string => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function PiPendingPanel(): JSX.Element {
  const { entityCode } = useEntityCode();

  const drafts = useMemo(
    () => listFcpiDrafts(entityCode).filter((d) => d.status === 'draft'),
    [entityCode],
  );

  const now = Date.now();
  const rows = useMemo(
    () => drafts.map((d) => {
      const days = Math.floor((now - new Date(d.pi_draft_date || d.created_at).getTime()) / MS_PER_DAY);
      return { d, days };
    }),
    [drafts, now],
  );

  const totalPending = round2(dSum(drafts, (d) => d.gross_total));
  const oldestDays = rows.reduce((m, r) => Math.max(m, r.days), 0);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">PI Pending</h1>
        <p className="text-sm text-muted-foreground">
          Purchase Invoice drafts awaiting FineCore review.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Pending PIs</div>
          <div className="text-2xl font-mono font-bold mt-1">{drafts.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Pending Value</div>
          <div className="text-2xl font-mono font-bold mt-1">{fmtMoney(totalPending)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">Oldest (days)</div>
          <div className="text-2xl font-mono font-bold mt-1 text-warning">{oldestDays}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No PIs pending review.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">PI #</th>
                  <th className="text-left p-2">PO #</th>
                  <th className="text-left p-2">Vendor</th>
                  <th className="text-left p-2">Bill #</th>
                  <th className="text-left p-2">Bill Date</th>
                  <th className="text-right p-2">Bill Total</th>
                  <th className="text-right p-2">Days Pending</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.d.id} className="border-t hover:bg-accent">
                    <td className="p-2 font-mono">{r.d.pi_no}</td>
                    <td className="p-2 font-mono">{r.d.source_po_no}</td>
                    <td className="p-2">{r.d.vendor_name}</td>
                    <td className="p-2 font-mono">{r.d.source_bill_no}</td>
                    <td className="p-2">{fmtDate(r.d.bill_date)}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(r.d.gross_total)}</td>
                    <td className="p-2 text-right font-mono">{r.days}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        className="text-xs px-2 py-0.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25"
                        onClick={() => { window.location.href = `/erp/bill-passing?bill_id=${r.d.source_bill_id}`; }}
                      >
                        Open Bill
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
