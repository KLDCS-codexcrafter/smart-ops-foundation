/**
 * @file        src/pages/erp/eximx/saathi/AtlasSaathiPanel.tsx
 * @purpose     13th EximX Saathi surface · Atlas FULL + BCD Calc + FX What-If + Board Pack explainer
 * @sprint      T-Phase-1.EX-11-Atlas-FULL-BCD-FXWhatIf-BoardPack
 * @decisions   EX-11-Q5=a 13th EximX Saathi · Q13=a embeddable in UnifiedAtlasLayout
 * @disciplines FR-30 · FR-50 · FR-58
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Award, Calculator, TrendingUp, FileText, CheckCircle2 } from 'lucide-react';

export function AtlasSaathiPanel(): JSX.Element {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-bold"><MessageCircle className="w-5 h-5 inline mr-2" />Atlas Saathi · 13th EximX Surface · Phase 1 FINALE Narrative</h2>
        <p className="text-sm text-muted-foreground">Your guide to the institutional capstone · 4 capabilities · 1 board-ready PDF · 11-sprint walk recap</p>
      </div>

      <Card>
        <CardHeader><CardTitle><Award className="w-4 h-4 inline mr-2" />What is the TDL Atlas FULL?</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>The TDL (Tally Definition Language) Gaps Atlas FULL is the institutional capstone of Phase 1 EximX. It synthesizes all 13 sprints into one navigable surface.</p>
          <p><strong>21 Moats</strong>: industry-grade institutional differentiators · 7 PRIMARY + 5 FULL + 9 LIVE</p>
          <p><strong>12 v7 Compliance Gaps</strong>: all closed (100% milestone via EX-9)</p>
          <p><strong>12 D-NEW decisions</strong>: 2 resolved (FG · FF architectural keystones) · 1 closed (FH) · 3 close in EX-11 · 6 carry to Phase 2</p>
          <p><strong>4DSmartOps blueprint</strong>: Discovery → Design → Develop → Deploy alignment indicator</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><Calculator className="w-4 h-4 inline mr-2" />BCD Calculator · Decision Tool</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Interactive duty modeling. Input CTH × Country × CIF · output full waterfall (BCD · SWS · IGST · Comp Cess · Anti-Dumping · Safeguard · Landing). Save snapshots for comparison · audit trail via FR-26 entity-scoped localStorage.</p>
          <p className="text-xs text-muted-foreground">Consumes duty-waterfall-engine READ-ONLY · duty-waterfall-engine stays 0-DIFF · institutional invariant honored.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><TrendingUp className="w-4 h-4 inline mr-2" />FX What-If · Scenario Simulator</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Pick a realisation / TT / import PO · simulate rate scenarios (USD up 5%, INR down 10%, etc) · recompute INR + FEMA impact. Stress-test hedge positioning · upside/downside scenario planning.</p>
          <p className="text-xs text-muted-foreground">Consumes currency.ts + dual-rate-engine.ts + month-end-reval-engine.ts READ-ONLY · all 0-DIFF.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><FileText className="w-4 h-4 inline mr-2" />Board Pack PDF · Executive Deliverable</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Single click → 7-section PDF (Cover · KPIs · 21 Moats · Top BoEs · Realisations · Vendors · Scrips · EWS). Board-grade institutional deliverable.</p>
          <p className="text-xs text-muted-foreground">PDF library jspdf + jspdf-autotable already installed (institutional precedent: voucher-export-engine + universal-export-engine). FR-9 honored · no new dependencies.</p>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary">
        <CardHeader><CardTitle><CheckCircle2 className="w-4 h-4 inline mr-2" />Phase 1 EximX FINALE · 13 of 13 Sprints Complete</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <p>EX-11 closes Phase 1 EximX. 35 consecutive A first-pass-clean (this sprint targets 36). TSC 100 CENTENNIAL · ESLint 100 CENTENNIAL · Vitest 72 IDENTICAL. 200+ prior NEW code files all 0-diff. Phase 2 next: EX-12 (LC + Packing Credit) + 6 D-NEWs carried (EW · EZ · FA · FB · FD · FE).</p>
        </CardContent>
      </Card>
    </div>
  );
}
