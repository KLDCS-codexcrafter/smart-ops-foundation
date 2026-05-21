/**
 * @file        src/pages/erp/eximx/saathi/ComplianceSaathiPanel.tsx
 * @purpose     12th Saathi surface · COMPLIANCE COMPLETION · Superpowers 19→20 (100% MILESTONE)
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ComplianceSaathiPanel({ activeTab }: { activeTab: string }): JSX.Element {
  const explainers: Record<string, { title: string; body: string }> = {
    ews: { title: 'EWS Aggregator (Q10=b)', body: '7-signal aggregator · pure composition (NO new transactional primitive). Aggregates FEMA + PCA + STPI + TP + CAROTAR + Sanctions + AEO Review signals. Institutional capstone for proactive compliance.' },
    aeo: { title: 'AEO FULL (Moat #4 PRIMARY)', body: 'Tier benefits engine via SIBLING extension. aeo-tier-mapping.ts + aeo-tier-engine.ts STAY 0-DIFF. Adds BCD reduction (T1=25% · T2=50% · T3=75%) + clearance time-savings + annual review + upgrade pathway.' },
    carotar: { title: 'CAROTAR FULL (Moat #11 PRIMARY · v7 Gap #11)', body: 'Rules of Origin verification matrix · Form II supplier declarations · 30-day Customs response tracker. 4 RoO classifications: wholly_obtained · cth_change · value_add (35% threshold) · specific_process.' },
    'coo-embassy': { title: 'CoO Embassy FULL (Moat #10 PRIMARY)', body: '5-state legalization workflow via SIBLING extension. coo-legalization-engine.ts STAYS 0-DIFF. Apostille for 16 Hague countries · Embassy chain for non-Hague (UAE/Qatar/Saudi/Oman). Fee + TAT register.' },
    'stpi-softex': { title: 'STPI Softex FULL (v7 Gap #11)', body: 'Form A/B classification · 30-day filing deadline · Positive NFE computation (inflows - outflows). Consumes EX-7c is_stpi_export seed fields · export-realisation.ts STAYS 0-DIFF.' },
    pca: { title: 'PCA Post-Clearance Audit (v7 Gap #5)', body: '7-state audit workflow · auto-triggered on BoE Yellow/Red RMS lanes. Consumes EX-6 bill-of-entry-engine READ-ONLY. Demand + interest + penalty tracker · appeal flag.' },
    tp: { title: 'Transfer Pricing (v7 Gap #6)', body: 'ALP 5-method classifier (CUP · RPM · CPM · PSM · TNMM). ₹20Cr threshold triggers Form 3CEB. Master File + Local File + CbCR + Form 3CEB tracker. Deadline: 31-Oct of following FY.' },
    edpms: { title: 'EDPMS UI (v7 Gap #7)', body: 'UI elevation only · EDPMS Declaration list with bank reconciliation. EX-7c ebrc-edpms.ts type STAYS 0-DIFF. Age buckets · BRC matching · RBI reporting export (Phase 2).' },
    sanctions: { title: 'Sanctions Watchlist (v7 Gap #8)', body: '4-source comprehensive screening · OFAC SDN + UN Consolidated + EU CFSP + RBI EXIM Negative List. Screens ForeignCustomer + ForeignVendor + Beneficiary Bank. Fuzzy match + exact match + false positive · override approval workflow.' },
    dgtr: { title: 'DGTR Trade Remedies', body: 'Anti-dumping + safeguard + countervailing duty case register. By CTH × exporting country. BoE alert when imported CTH matches active investigation. Duty rate × validity period tracker.' },
  };
  const exp = explainers[activeTab] ?? explainers.ews;

  return (
    <Card className="border-primary/40">
      <CardHeader><CardTitle className="text-sm"><Sparkles className="w-4 h-4 inline mr-2 text-primary" />Saathi · 12th Surface · Superpowers 20/20 (100%)</CardTitle></CardHeader>
      <CardContent className="text-sm space-y-3">
        <div><strong>{exp.title}</strong></div>
        <div>{exp.body}</div>
        <div className="pt-2 border-t text-xs text-muted-foreground"><strong>EX-9 Compliance Completion Sprint</strong>: 4 PRIMARY/FULL moats (AEO + CAROTAR + CoO Embassy + STPI Softex) + 6 NEW modules (PCA + TP + EDPMS + Sanctions + DGTR + EWS) + 5 v7 Compliance Gaps closed in one sprint. 100% Saathi visibility milestone achieved. Next: EX-10 DGFT Schemes + Drawback + D-NEW-FF · EX-11 TDL Atlas FULL + Board Pack PDF.</div>
      </CardContent>
    </Card>
  );
}
