/**
 * @file        src/pages/erp/eximx/saathi/TDLGapsAtlasPreview.tsx
 * @purpose     Static educational page · TDL Gaps Atlas preview · 3-bucket Duty Structure
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   EX-1-Q6=b static educational · Moat #13 TDL Gaps Atlas · full Atlas in EX-11
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Shield, FileText, Banknote, Info, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TDLGapsAtlasPreview(): JSX.Element {
  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Saathi · TDL Gaps Atlas Preview</h1>
          <p className="text-sm text-muted-foreground">Educational walkthrough · full Atlas ships in EX-11</p>
        </div>
      </div>

      <Card className="border-l-4 border-l-primary">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Info className="w-4 h-4" /> What is the TDL Gaps Atlas?</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            Tally Definition Language (TDL) is the institutional Tally extension language that ~80% of Indian SMBs use today
            for their accounting and inventory. Tally&apos;s stock TDL has well-documented gaps — fields it stores but never surfaces,
            workflows it tracks but never explains, and 35 specific architectural blanks we&apos;ve cataloged.
          </p>
          <p>
            Operix&apos;s <strong>TDL Gaps Atlas</strong> is the moat catalog: every Tally TDL field Operix EximX fills, against
            the gap Tally itself leaves open. This is Moat #13 in the EximX scope.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3-Bucket Duty Structure · CTH × Country × Date</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            When you import an item with a Customs Tariff Head (CTH), the applicable duty depends on three dimensions: the CTH itself,
            the country of origin, and the applicable date. The total landed-cost duty then resolves into THREE buckets:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="bg-secondary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Bucket 1 · Customs Duties</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div><Badge variant="outline">BCD</Badge> Basic Customs Duty</div>
                <div><Badge variant="outline">SWS</Badge> Social Welfare Surcharge</div>
                <div><Badge variant="outline">Anti-Dumping</Badge> if applicable</div>
                <div><Badge variant="outline">Safeguard</Badge> if notified</div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Bucket 2 · Other Duties</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div><Badge variant="outline">CVD</Badge> Countervailing Duty</div>
                <div><Badge variant="outline">Health Cess</Badge> per CTH</div>
                <div><Badge variant="outline">Compensation Cess</Badge> per item</div>
                <div><Badge variant="outline">NCCD</Badge> National Calamity Contingency</div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Banknote className="w-4 h-4" /> Bucket 3 · GST Duties</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1">
                <div><Badge variant="outline">IGST</Badge> Integrated GST on imports</div>
                <div><Badge variant="outline">CGST</Badge> intra-state if applicable</div>
                <div><Badge variant="outline">SGST</Badge> intra-state if applicable</div>
                <div><Badge variant="outline">Compensation Cess</Badge> GST-side</div>
              </CardContent>
            </Card>
          </div>

          <p className="text-sm text-muted-foreground italic">
            Most Indian ERPs (including Tally Prime) flatten these into one list. Operix EximX preserves the 3-bucket
            structure end-to-end so PCA audits, customs revaluation traces, and finance reconciliation are pixel-perfect.
            This is part of Moat #8 (CTH-Country-Date × 3-Bucket) and Moat #14 (Dynamic Duty Labels).
          </p>
          <div className="pt-3 border-t mt-3 space-y-2">
            <Link to="/erp/eximx/import" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Drill into CTH × Country × Date master (live 3-bucket)
            </Link>
            <Link to="/erp/eximx/import/shipments" className="text-sm text-primary hover:underline inline-flex items-center gap-1 block">
              <ExternalLink className="w-3 h-3" /> Drill into Multi-Leg GIT (5-leg journey · 3-bucket reconciliation · live)
            </Link>
            <Link to="/erp/eximx/import" className="text-sm text-primary hover:underline inline-flex items-center gap-1 block">
              <ExternalLink className="w-3 h-3" /> Drill into Commercial Invoice 6-Part Allocation (10-row Duty Waterfall · 6-basis CIF Pro-Rata · live)
            </Link>
            <Link to="/erp/eximx/import" className="text-sm text-primary hover:underline inline-flex items-center gap-1 block">
              <ExternalLink className="w-3 h-3" /> Drill into Bill of Entry (EX-6 · GL Commit · 5 auto-posted vouchers · RMS + AEO + Project Imports Sec 25 · demurrage · live)
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader><CardTitle className="text-base">What ships in EX-11 (Full Atlas)</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>The full TDL Gaps Atlas in EX-11 will catalog:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>35 cataloged gaps</strong> with severity rating and how each is filled</li>
            <li><strong>17 voucher types</strong> with field-by-field mapping (TDL UDF → Operix field)</li>
            <li><strong>Interactive 3-step demo</strong>: Tariff Head selector → Country picker → Date picker → live duty resolution</li>
            <li><strong>1 known TDL bug</strong> (template vs formula mismatch) surfaced in v4 of EximX discussion</li>
            <li><strong>4 Tally TDL screenshots</strong> pixel-verified (CIF waterfall · trading toggle · 4 CTH drill screens)</li>
            <li><strong>Saathi conversational explainer</strong>: &quot;Saathi · why is this duty 20% but label says 10%?&quot; → opens Moat #14</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
