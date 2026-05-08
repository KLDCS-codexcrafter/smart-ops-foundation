/**
 * @file        SupplierWiseOutstandingPanel.tsx
 * @purpose     Supplier-wise outstanding (Trident SKLedger parity) · open bills aging buckets.
 * @who         Finance · Procurement
 * @when        Sprint T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring · Block E
 * @sprint      T-Phase-1.A.3.b-T1-Bill-Passing-Reports-Wiring
 * @iso         25010 · Functional Suitability
 * @decisions   D-NEW-AK · D-NEW-AL
 * @reuses      bill-passing-engine.listBillPassing · useEntityCode · decimal-helpers
 * @[JWT]       GET /api/bill-passing?status=open — localStorage-backed in Phase 1
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listBillPassing } from '@/lib/bill-passing-engine';
import { dAdd, round2 } from '@/lib/decimal-helpers';
import { Card, CardContent } from '@/components/ui/card';

const fmtMoney = (n: number): string => `₹${n.toLocaleString('en-IN')}`;
const MS_PER_DAY = 86_400_000;
const CLOSED = new Set(['approved_for_fcpi', 'fcpi_drafted', 'cancelled', 'rejected']);

interface Aging {
  vendor_id: string;
  vendor_name: string;
  open_bills: number;
  total: number;
  b0_30: number;
  b31_60: number;
  b61_90: number;
  b90p: number;
  oldest_days: number;
}

export function SupplierWiseOutstandingPanel(): JSX.Element {
  const { entityCode } = useEntityCode();

  const aggregates: Aging[] = useMemo(() => {
    const open = listBillPassing(entityCode).filter((b) => !CLOSED.has(b.status));
    const map = new Map<string, Aging>();
    const now = Date.now();
    for (const b of open) {
      const a = map.get(b.vendor_id) ?? {
        vendor_id: b.vendor_id, vendor_name: b.vendor_name,
        open_bills: 0, total: 0, b0_30: 0, b31_60: 0, b61_90: 0, b90p: 0, oldest_days: 0,
      };
      const days = Math.floor((now - new Date(b.created_at).getTime()) / MS_PER_DAY);
      a.open_bills += 1;
      a.total = round2(dAdd(a.total, b.total_invoice_value));
      if (days <= 30) a.b0_30 = round2(dAdd(a.b0_30, b.total_invoice_value));
      else if (days <= 60) a.b31_60 = round2(dAdd(a.b31_60, b.total_invoice_value));
      else if (days <= 90) a.b61_90 = round2(dAdd(a.b61_90, b.total_invoice_value));
      else a.b90p = round2(dAdd(a.b90p, b.total_invoice_value));
      a.oldest_days = Math.max(a.oldest_days, days);
      map.set(b.vendor_id, a);
    }
    return Array.from(map.values()).sort((x, y) => y.total - x.total);
  }, [entityCode]);

  const totalOutstanding = aggregates.reduce((s, a) => round2(dAdd(s, a.total)), 0);
  const oldestAging = aggregates.reduce((m, a) => Math.max(m, a.oldest_days), 0);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Supplier-Wise Outstanding</h1>
        <p className="text-sm text-muted-foreground">Open bills · aged 0–30 / 31–60 / 61–90 / 90+ days.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Outstanding</div>
          <div className="text-2xl font-mono font-bold mt-1">{fmtMoney(totalOutstanding)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Vendors</div>
          <div className="text-2xl font-mono font-bold mt-1">{aggregates.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Oldest Aging (days)</div>
          <div className="text-2xl font-mono font-bold mt-1 text-warning">{oldestAging}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {aggregates.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No outstanding amounts.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Vendor</th>
                  <th className="text-right p-2">Open Bills</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-right p-2">0–30</th>
                  <th className="text-right p-2">31–60</th>
                  <th className="text-right p-2">61–90</th>
                  <th className="text-right p-2">90+</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.map((a) => (
                  <tr key={a.vendor_id} className="border-t hover:bg-accent">
                    <td className="p-2">{a.vendor_name}</td>
                    <td className="p-2 text-right font-mono">{a.open_bills}</td>
                    <td className="p-2 text-right font-mono font-bold">{fmtMoney(a.total)}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(a.b0_30)}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(a.b31_60)}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(a.b61_90)}</td>
                    <td className="p-2 text-right font-mono text-destructive">{fmtMoney(a.b90p)}</td>
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
