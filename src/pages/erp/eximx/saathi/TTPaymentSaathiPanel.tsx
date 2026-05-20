/**
 * @file        src/pages/erp/eximx/saathi/TTPaymentSaathiPanel.tsx
 * @purpose     11th Saathi surface · TT + Form 15CA + voucher runtime + RBI Purpose + Hedge + Reval explainer
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { FORM_15CA_PART_DESCRIPTIONS } from '@/types/form-15ca-15cb';
import type { TTPayment } from '@/types/tt-payment';
import type { Form15CASubmission } from '@/types/form-15ca-15cb';

export function TTPaymentSaathiPanel({ tt, form15CA }: { tt: TTPayment; form15CA: Form15CASubmission | null }): JSX.Element {
  return (
    <Card className="border-primary/40">
      <CardHeader><CardTitle className="text-sm"><Sparkles className="w-4 h-4 inline mr-2 text-primary" />Saathi · TT Insights · 11th Surface · Superpowers 19/20 (95%)</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-3">
        <div><strong>TT Payment ({tt.status.replace(/_/g, ' ')})</strong>: Outward telegraphic transfer · 4-way integration (ImportPO + ForeignVendor + Form15CA + AutoPostedVoucher via runtime).</div>
        <div><strong>RBI Purpose Code ({tt.rbi_purpose_code})</strong>: {tt.rbi_purpose_description}. Required for all outward remittances · classifies transaction category for RBI reporting.</div>
        {form15CA && <div><strong>Form 15CA {form15CA.part}</strong>: {FORM_15CA_PART_DESCRIPTIONS[form15CA.part]}. Status: {form15CA.status.replace(/_/g, ' ')}.</div>}
        <div><strong>D-NEW-FG Voucher Runtime</strong>: TT generates AutoPostedVoucher via voucher-runtime-engine.ts · orchestrates 5 FinCore voucher engines READ-ONLY (hash · org-tag · type-registry · version · use-last). All 5 engines + auto-posted-voucher.ts STAY 0-diff. Architectural keystone resolution.</div>
        <div><strong>Hedge Linkage</strong>: TT in import direction can be hedged via forward_buy contract. Open hedge contracts visible in Hedge tab. Settlement variance computed at maturity.</div>
        <div><strong>Month-End Reval</strong>: If TT linked to Export Realisation (downstream), month-end reval engine recomputes forex variance · posts AutoPostedVoucher via runtime · updates EX-7c seed fields.</div>
        <div className="pt-2 border-t text-xs text-muted-foreground">Future: Real RBI/CA digital signature API · LC + Packing Credit (Phase 2 EX-12) · Drawback voucher posting extension EX-10 · PDF Form 15CA EX-11 · Sanctions Watchlist EX-9. D-NEW-FF (per-item valuation override) deferred to EX-10.</div>
      </CardContent>
    </Card>
  );
}
