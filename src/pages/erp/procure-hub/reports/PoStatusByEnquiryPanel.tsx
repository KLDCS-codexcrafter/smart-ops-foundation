/**
 * @file        PoStatusByEnquiryPanel.tsx
 * @purpose     Enquiry-to-PO conversion register · traverse PEQ → RFQ → quotation → PO with timing analytics.
 * @sprint      T-Phase-1.A.3.d-Procure360-Variance-Trident-Polish
 * @decisions   D-NEW-AS
 * @reuses      procurement-enquiry-engine.listEnquiries · po-management-engine.listPurchaseOrders · useEntityCode
 * @[JWT]       GET /api/procure360/reports/po-status-by-enquiry — localStorage in Phase 1
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { listEnquiries } from '@/lib/procurement-enquiry-engine';
import { listPurchaseOrders } from '@/lib/po-management-engine';
import { round2 } from '@/lib/decimal-helpers';

const fmtMoney = (n: number): string => `₹${n.toLocaleString('en-IN')}`;

export function PoStatusByEnquiryPanel(): JSX.Element {
  const { entityCode } = useEntityCode();

  const rows = useMemo(() => {
    const enquiries = listEnquiries(entityCode);
    const pos = listPurchaseOrders(entityCode);

    return enquiries.map((peq) => {
      const matchedPos = pos.filter(
        (po) => po.source_enquiry_id === peq.id ||
                peq.awarded_quotation_ids.includes(po.source_quotation_id),
      );
      const totalPoValue = matchedPos.reduce((s, p) => s + p.total_after_tax, 0);
      const peqDate = new Date(peq.enquiry_date).getTime();
      const dayLags = matchedPos
        .map((po) => (new Date(po.po_date).getTime() - peqDate) / 86_400_000)
        .filter((d) => d >= 0);
      const avgPeqToPoDays = dayLags.length > 0
        ? round2(dayLags.reduce((s, d) => s + d, 0) / dayLags.length)
        : null;
      return {
        enquiry_id: peq.id,
        enquiry_no: peq.enquiry_no,
        status: peq.status,
        rfq_count: peq.rfq_ids.length,
        quotation_count: peq.awarded_quotation_ids.length,
        po_count: matchedPos.length,
        total_po_value: round2(totalPoValue),
        avg_peq_to_po_days: avgPeqToPoDays,
      };
    }).sort((a, b) => b.po_count - a.po_count);
  }, [entityCode]);

  const kpis = useMemo(() => {
    const openAwaitingPo = rows.filter((r) => r.po_count === 0 && r.status !== 'cancelled' && r.status !== 'closed').length;
    const withPo = rows.filter((r) => r.po_count > 0);
    const avgLag = withPo.length > 0 && withPo.some((r) => r.avg_peq_to_po_days !== null)
      ? round2(
          withPo.reduce((s, r) => s + (r.avg_peq_to_po_days ?? 0), 0) /
          withPo.filter((r) => r.avg_peq_to_po_days !== null).length,
        )
      : 0;
    const conversionRate = rows.length > 0 ? round2((withPo.length / rows.length) * 100) : 0;
    return { openAwaitingPo, avgLag, conversionRate };
  }, [rows]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">PO Status by Enquiry</h1>
        <p className="text-sm text-muted-foreground">PEQ → RFQ → Quotation → PO conversion · timing and value rollup.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Open Enquiries Awaiting PO</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-warning">{kpis.openAwaitingPo}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg PEQ → PO Days</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.avgLag}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{kpis.conversionRate}%</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No procurement enquiries yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Enquiry #</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-right p-2">RFQs</th>
                  <th className="text-right p-2">Quotations</th>
                  <th className="text-right p-2">POs</th>
                  <th className="text-right p-2">PO Value</th>
                  <th className="text-right p-2">Avg PEQ→PO Days</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.enquiry_id} className="border-t">
                    <td className="p-2 font-mono">{r.enquiry_no}</td>
                    <td className="p-2"><Badge variant="outline">{r.status}</Badge></td>
                    <td className="p-2 text-right font-mono">{r.rfq_count}</td>
                    <td className="p-2 text-right font-mono">{r.quotation_count}</td>
                    <td className="p-2 text-right font-mono">{r.po_count}</td>
                    <td className="p-2 text-right font-mono">{fmtMoney(r.total_po_value)}</td>
                    <td className="p-2 text-right font-mono">
                      {r.avg_peq_to_po_days === null ? '—' : r.avg_peq_to_po_days}
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
