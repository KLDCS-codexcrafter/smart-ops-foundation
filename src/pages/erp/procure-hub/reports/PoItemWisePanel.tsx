/**
 * @file        PoItemWisePanel.tsx
 * @purpose     PO Item-Wise register · flatten PO lines · group by item_id with vendor / qty / value summary.
 * @sprint      T-Phase-1.A.3.d-Procure360-Variance-Trident-Polish
 * @decisions   D-NEW-AS
 * @reuses      po-management-engine.listPurchaseOrders · useEntityCode · decimal-helpers
 * @[JWT]       GET /api/procure360/reports/po-item-wise — localStorage in Phase 1
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listPurchaseOrders } from '@/lib/po-management-engine';
import { round2 } from '@/lib/decimal-helpers';

const fmtMoney = (n: number): string => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (iso: string): string =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

interface ItemRow {
  item_id: string;
  item_name: string;
  po_count: number;
  total_qty: number;
  total_value: number;
  vendor_set: Set<string>;
  vendor_value: Map<string, { name: string; value: number }>;
  rate_sum: number;
  latest_po_date: string;
}

export function PoItemWisePanel(): JSX.Element {
  const { entityCode } = useEntityCode();

  const rows = useMemo(() => {
    const map = new Map<string, ItemRow>();
    for (const po of listPurchaseOrders(entityCode)) {
      for (const line of po.lines) {
        let r = map.get(line.item_id);
        if (!r) {
          r = {
            item_id: line.item_id,
            item_name: line.item_name,
            po_count: 0,
            total_qty: 0,
            total_value: 0,
            vendor_set: new Set(),
            vendor_value: new Map(),
            rate_sum: 0,
            latest_po_date: '',
          };
          map.set(line.item_id, r);
        }
        r.po_count += 1;
        r.total_qty += line.qty;
        r.total_value += line.amount_after_tax;
        r.rate_sum += line.rate;
        r.vendor_set.add(po.vendor_id);
        const v = r.vendor_value.get(po.vendor_id) ?? { name: po.vendor_name, value: 0 };
        v.value += line.amount_after_tax;
        r.vendor_value.set(po.vendor_id, v);
        if (po.po_date > r.latest_po_date) r.latest_po_date = po.po_date;
      }
    }
    return Array.from(map.values())
      .map((r) => {
        let topVendor = '—';
        let topValue = 0;
        for (const v of r.vendor_value.values()) {
          if (v.value > topValue) { topValue = v.value; topVendor = v.name; }
        }
        return {
          item_id: r.item_id,
          item_name: r.item_name,
          po_count: r.po_count,
          total_qty: r.total_qty,
          total_value: round2(r.total_value),
          vendor_count: r.vendor_set.size,
          top_vendor: topVendor,
          avg_rate: r.po_count > 0 ? round2(r.rate_sum / r.po_count) : 0,
          latest_po_date: r.latest_po_date,
        };
      })
      .sort((a, b) => b.total_value - a.total_value);
  }, [entityCode]);

  const kpis = useMemo(() => {
    const totalPos = new Set<string>();
    const allPos = listPurchaseOrders(entityCode);
    allPos.forEach((p) => totalPos.add(p.id));
    const totalValue = rows.reduce((s, r) => s + r.total_value, 0);
    return {
      itemsProcured: rows.length,
      totalPos: allPos.length,
      totalValue: round2(totalValue),
      topItem: rows[0]?.item_name ?? '—',
    };
  }, [rows, entityCode]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">PO Item-Wise</h1>
        <p className="text-sm text-muted-foreground">Aggregated PO lines per item · vendor concentration · spend ranking.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Items Procured</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.itemsProcured}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total POs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.totalPos}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold font-mono">{fmtMoney(kpis.totalValue)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Top Item</CardTitle></CardHeader>
          <CardContent><div className="text-sm font-medium truncate">{kpis.topItem}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No PO history yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Item</th>
                  <th className="text-right p-2"># POs</th>
                  <th className="text-right p-2">Total Qty</th>
                  <th className="text-right p-2">Total Value</th>
                  <th className="text-right p-2"># Vendors</th>
                  <th className="text-left p-2">Top Vendor</th>
                  <th className="text-right p-2">Avg Rate</th>
                  <th className="text-left p-2">Latest PO</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.item_id} className="border-t">
                    <td className="p-2 font-medium">{r.item_name}</td>
                    <td className="p-2 text-right font-mono">{r.po_count}</td>
                    <td className="p-2 text-right font-mono">{r.total_qty}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(r.total_value)}</td>
                    <td className="p-2 text-right font-mono">{r.vendor_count}</td>
                    <td className="p-2 text-xs">{r.top_vendor}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(r.avg_rate)}</td>
                    <td className="p-2 text-xs">{fmtDate(r.latest_po_date)}</td>
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
