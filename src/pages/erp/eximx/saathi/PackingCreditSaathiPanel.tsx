/**
 * @file src/pages/erp/eximx/saathi/PackingCreditSaathiPanel.tsx
 * @purpose D-NEW-FK · PC Saathi · contextual decisions
 * @sprint T-Phase-2.A-EX-12-LC-PackingCredit · Block D
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export default function PackingCreditSaathiPanel(): JSX.Element {
  return (
    <Card className="bg-primary/5 border-primary/30">
      <CardHeader><CardTitle className="text-sm"><Sparkles className="w-4 h-4 inline mr-2 text-primary" />Saathi · Packing Credit Insights</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-3">
        <div><strong>When to draw down</strong>: Draw PCFC/EPC immediately after sanction · interest accrues from drawdown · liquidation deadline = drawdown + 270 days RBI tenor.</div>
        <div><strong>When to liquidate</strong>: Liquidate via Export Realisation receipt to avoid penal interest · PC-as-Realisation-precursor pattern automates voucher generation (D-NEW-FG 9th consumer).</div>
        <div><strong>PCFC vs EPC</strong>: PCFC is USD/EUR foreign-currency loan (LIBOR+ rate). EPC is INR rupee loan (~7-8%). PCFC carries forex risk during loan period.</div>
        <div className="pt-2 border-t text-xs text-muted-foreground">D-NEW-FK · 11th SIBLING · ExportPO + ExportRealisation stay 0-DIFF.</div>
      </CardContent>
    </Card>
  );
}
