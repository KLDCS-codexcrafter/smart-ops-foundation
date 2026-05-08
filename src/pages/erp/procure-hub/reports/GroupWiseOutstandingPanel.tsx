/**
 * @file        GroupWiseOutstandingPanel.tsx
 * @purpose     Group-wise outstanding (Trident SKGroup parity) · pivots open bills by vendor group.
 *              TODO(D-NEW-AL · vendor group dimension · enrich in α-c) — no vendor master group field
 *              exists yet; falls back to alphabetical bucket from vendor name initial.
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

// TODO(D-NEW-AL): replace with real vendor.group_id when vendor-master gains group dimension.
function groupKey(vendorName: string): string {
  const c = (vendorName || '#').charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

interface GroupAging {
  group: string;
  vendor_count: number;
  open_bills: number;
  total: number;
  b0_30: number;
  b31_60: number;
  b61_90: number;
  b90p: number;
}

export function GroupWiseOutstandingPanel(): JSX.Element {
  const { entityCode } = useEntityCode();

  const aggregates: GroupAging[] = useMemo(() => {
    const open = listBillPassing(entityCode).filter((b) => !CLOSED.has(b.status));
    const map = new Map<string, GroupAging & { vendors: Set<string> }>();
    const now = Date.now();
    for (const b of open) {
      const k = groupKey(b.vendor_name);
      const a = map.get(k) ?? {
        group: k, vendor_count: 0, open_bills: 0, total: 0,
        b0_30: 0, b31_60: 0, b61_90: 0, b90p: 0, vendors: new Set<string>(),
      };
      a.vendors.add(b.vendor_id);
      a.open_bills += 1;
      a.total = round2(dAdd(a.total, b.total_invoice_value));
      const days = Math.floor((now - new Date(b.created_at).getTime()) / MS_PER_DAY);
      if (days <= 30) a.b0_30 = round2(dAdd(a.b0_30, b.total_invoice_value));
      else if (days <= 60) a.b31_60 = round2(dAdd(a.b31_60, b.total_invoice_value));
      else if (days <= 90) a.b61_90 = round2(dAdd(a.b61_90, b.total_invoice_value));
      else a.b90p = round2(dAdd(a.b90p, b.total_invoice_value));
      map.set(k, a);
    }
    return Array.from(map.values()).map((g) => ({ ...g, vendor_count: g.vendors.size }))
      .sort((x, y) => y.total - x.total);
  }, [entityCode]);

  const totalOutstanding = aggregates.reduce((s, a) => round2(dAdd(s, a.total)), 0);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Group-Wise Outstanding</h1>
        <p className="text-sm text-muted-foreground">
          Outstanding pivoted by vendor group · alphabetical fallback until vendor groups land.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Groups</div>
          <div className="text-2xl font-mono font-bold mt-1">{aggregates.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Total Outstanding</div>
          <div className="text-2xl font-mono font-bold mt-1">{fmtMoney(totalOutstanding)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Vendors</div>
          <div className="text-2xl font-mono font-bold mt-1">
            {aggregates.reduce((s, g) => s + g.vendor_count, 0)}
          </div>
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
                  <th className="text-left p-2">Group</th>
                  <th className="text-right p-2">Vendors</th>
                  <th className="text-right p-2">Open Bills</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-right p-2">0–30</th>
                  <th className="text-right p-2">31–60</th>
                  <th className="text-right p-2">61–90</th>
                  <th className="text-right p-2">90+</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.map((g) => (
                  <tr key={g.group} className="border-t hover:bg-accent">
                    <td className="p-2 font-mono font-bold">{g.group}</td>
                    <td className="p-2 text-right font-mono">{g.vendor_count}</td>
                    <td className="p-2 text-right font-mono">{g.open_bills}</td>
                    <td className="p-2 text-right font-mono font-bold">{fmtMoney(g.total)}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(g.b0_30)}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(g.b31_60)}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(g.b61_90)}</td>
                    <td className="p-2 text-right font-mono text-destructive">{fmtMoney(g.b90p)}</td>
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
