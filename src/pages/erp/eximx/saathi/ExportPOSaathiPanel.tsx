/**
 * @file        src/pages/erp/eximx/saathi/ExportPOSaathiPanel.tsx
 * @purpose     8th Saathi surface · Export PO companion · explains LUT gate + Buyer Reliability + Doc Pack + Shipping Bill handoff
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import type { ExportPurchaseOrder } from '@/types/export-purchase-order';

export function ExportPOSaathiPanel({ po }: { po: ExportPurchaseOrder }): JSX.Element {
  return (
    <Card className="bg-primary/5 border-primary/30">
      <CardHeader><CardTitle className="text-sm"><Sparkles className="w-4 h-4 inline mr-2 text-primary" />Saathi · Export PO Insights</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-3">
        <div><strong>LUT Hard Gate (Q3=a)</strong>: Operix enforces Indian export regulation · IGST-exempt exports require valid LUT (Letter of Undertaking). Status: <strong>{po.lut_status_at_validation}</strong> · {po.lut_validation_notes}</div>
        <div><strong>Buyer Reliability ({po.buyer_reliability_score_at_commit}/100)</strong>: Moat #18 FOUNDATION · score = 70 base + country risk delta + credit utilization. Country risk for {po.country_code}: <strong>{po.buyer_country_risk}</strong>. Feedback loop completes EX-7c when e-BRC realization data flows back.</div>
        <div><strong>Doc Pack Country Rule</strong>: <code>{po.doc_pack_country_rule}</code> · Operix resolves 6 country-specific paths (UAE legalized · EU EUR.1 · ASEAN Form AI · CEPA · GSP · standard). Embassy legalization auto-flagged for UAE/CEPA destinations.</div>
        <div><strong>Forward to EX-7b</strong>: When status transitions to <code>ready_for_shipping</code>, the Shipping Bill workflow takes over. Expected SB: <code>{po.expected_shipping_bill_no ?? 'pending'}</code></div>
        <div className="pt-2 border-t text-xs text-muted-foreground">Phase 2: PDF generation (EX-11) · embassy legalization workflow (EX-9 · Moat #10) · sanctions check (EX-9) · FEMA 270-day realization tracking (EX-7c · Moat #19 PRIMARY). D-NEW-FF (per-item valuation override · EX-10) and D-NEW-FG (voucher runtime wiring · EX-8) reserved for future sprints.</div>
        <div className="pt-2 border-t">
          <Badge className="mb-1">D-NEW-FJ · LC backed</Badge>
          <Link to="/erp/eximx/finance/lc" className="block">
            <Button size="sm" variant="outline">View LCs →</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
