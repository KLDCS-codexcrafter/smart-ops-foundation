/**
 * @file        src/pages/erp/eximx/saathi/BoESaathiPanel.tsx
 * @purpose     7th Saathi surface · BoE detail companion · explains 5 vouchers · RMS · AEO · demurrage · Project Imports
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import type { BillOfEntry } from '@/types/bill-of-entry';

export function BoESaathiPanel({ boe }: { boe: BillOfEntry }): JSX.Element {
  return (
    <Card className="border-primary/40">
      <CardHeader><CardTitle className="text-sm"><Sparkles className="w-4 h-4 inline mr-2 text-primary" />Saathi · BoE Insights</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-3">
        <div><strong>5 Auto-Posted Vouchers</strong>: Customs Duty + IGST Import + Comp Cess + Landing + Demurrage. Each posts to its own GL ledger · consumes existing FinCore voucher engines READ-ONLY (D-127 preserved).</div>
        <div><strong>RMS Lane ({boe.icegate_simulated_lane ?? 'pending'})</strong>: ICEGATE simulator assigned this lane. Moat #2 captures variance between predicted and actual · AEO tier may pre-bias to green.</div>
        <div><strong>AEO ({boe.importer_aeo_tier})</strong>: {boe.aeo_fast_track_eligible ? 'Fast-track eligible · faster clearance + bonus free demurrage days' : 'Standard workflow · no AEO override'}.</div>
        <div><strong>Demurrage</strong>: Consumes MLGIT Leg 4 dwell time ({boe.dwell_days_used} days used) vs free window ({boe.demurrage_free_days_available} days). {boe.demurrage_chargeable_days > 0 ? `${boe.demurrage_chargeable_days} chargeable day(s).` : 'Within free window · no demurrage.'}</div>
        {boe.is_project_import && <div><strong>Project Import (Sec 25 · v7 Gap #9)</strong>: Concessional duty per CBIC notification {boe.project_import_notification_ref}.</div>}
        <div className="pt-2 border-t text-xs text-muted-foreground">Phase 2: real ICEGATE API · per-item valuation override (D-NEW-FF · EX-10) · CAROTAR full (EX-9).</div>
      </CardContent>
    </Card>
  );
}
