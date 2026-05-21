/**
 * @file src/pages/erp/eximx/saathi/LCSaathiPanel.tsx
 * @purpose D-NEW-FJ · LC Saathi · contextual decisions
 * @sprint T-Phase-2.A-EX-12-LC-PackingCredit · Block C
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

export default function LCSaathiPanel(): JSX.Element {
  return (
    <Card className="bg-primary/5 border-primary/30">
      <CardHeader><CardTitle className="text-sm"><Sparkles className="w-4 h-4 inline mr-2 text-primary" />Saathi · LC Insights</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-3">
        <div><strong>When to confirm</strong>: Add confirming bank when issuing bank country risk is elevated · adds Indian AD bank guarantee on top of foreign issuance.</div>
        <div><strong>When to amend</strong>: Buyer-side scope/spec changes require formal LC amendment + buyer consent before document presentation.</div>
        <div><strong>When to negotiate</strong>: Present compliant docs within presentation period (typically 21 days post-shipment) for negotiating bank to discount.</div>
        <div className="pt-2 border-t text-xs text-muted-foreground">D-NEW-FJ · 10th SIBLING · ExportPO stays 0-DIFF · D-NEW-FL (LC discrepancy checker) carried to Sprint 41+.</div>
      </CardContent>
    </Card>
  );
}
