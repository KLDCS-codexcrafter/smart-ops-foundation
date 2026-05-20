/**
 * @file        src/pages/erp/eximx/saathi/ExportRealisationSaathiPanel.tsx
 * @purpose     10th Saathi surface · FEMA + Forex + Buyer Reliability + STPI explainer
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import type { ExportRealisation } from '@/types/export-realisation';

export function ExportRealisationSaathiPanel({ realisation: r }: { realisation: ExportRealisation }): JSX.Element {
  return (
    <Card className="bg-purple-50/30 border-purple-200">
      <CardHeader><CardTitle className="text-sm"><Sparkles className="w-4 h-4 inline mr-2 text-purple-600" />Saathi · Realisation Insights · 10th Surface · Superpowers 18/20 (90%)</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-3">
        <div><strong>FEMA 270-day Mandate (Moat #19 PRIMARY)</strong>: RBI requires export proceeds repatriated within 270 days. Current state: <strong>{r.fema_state}</strong> at {r.days_since_dispatch}/270 days · {270 - r.days_since_dispatch} days remaining.</div>
        <div><strong>e-BRC vs FIRC (v7 Gap #2)</strong>: EBRC = Bank Realisation Certificate · single per Shipping Bill · enables drawback/RoDTEP. FIRC = per-remittance certificate · one SB may have multiple FIRCs. EDPMSDeclaration = RBI master state.</div>
        <div><strong>Forex Triangulation (3-way · Q6=a)</strong>: booking_rate (PO commitment) → selling_rate_at_pol (SB dispatch) → realised_rate (FIRC). Variance = ₹{r.forex_triangulation.variance_total_inr.toFixed(2)}. Month-End Reval engine wires in EX-8.</div>
        <div><strong>Buyer Reliability FULL Feedback (Moat #18 closure)</strong>: This realisation's days-to-realise + FEMA state feed back into Buyer Reliability score via sibling extension. buyer-reliability-engine.ts stays 0-diff (EX-7a invariant preserved).</div>
        {r.is_stpi_export && <div><strong>STPI (v7 Gap #11)</strong>: Software export · Softex Form {r.stpi_softex_form_no} required for STPI unit {r.stpi_unit_id} · full Softex management in EX-9.</div>}
        {r.related_ecgc_policy_id && <div><strong>ECGC FOUNDATION (Moat #6)</strong>: Covered by policy {r.related_ecgc_policy_id}. Phase 1 plants policy register + claim shell · full claim filing API in Phase 2.</div>}
        <div className="pt-2 border-t text-xs text-muted-foreground">Forward: drawback/RoDTEP claim via EBRC (EX-10) · Month-End Reval engine (EX-8) · STPI Softex full (EX-9) · ECGC claim API (Phase 2) · D-NEW-FF + D-NEW-FG carry forward.</div>
      </CardContent>
    </Card>
  );
}
