/**
 * @file        src/pages/erp/eximx/saathi/CIAllocationSaathiPanel.tsx
 * @purpose     Saathi 6th surface · explains 6 Parts + 6 bases + 10-row waterfall
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 * @decisions   EX-5-Q9=b Saathi on CI Detail · Superpowers 13→14 (70%)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot } from 'lucide-react';
import type { CommercialInvoice } from '@/types/commercial-invoice';

export function CIAllocationSaathiPanel({ ci }: { ci: CommercialInvoice }): JSX.Element {
  const revalCount = ci.lines.reduce((s, l) => s + l.allocation.part_c.customs_revaluation_history.length, 0);
  return (
    <Card className="border-l-4 border-l-primary sticky top-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" /> Saathi · CI Allocation
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <div>
          <Badge className="mb-1">Why 6 Parts?</Badge>
          <p>TDL mother-of-all template splits each CI line into 6 parts:
            <strong> A</strong> Valuation Method, <strong>B</strong> 9-Column CIF Body,
            <strong> C</strong> Rule 10 Loadings + CICustomeVal, <strong>D</strong> 10-Row Duty Waterfall,
            <strong> E</strong> Duty Summary, <strong>F</strong> Per-Batch Expense Band.</p>
        </div>
        <div>
          <Badge className="mb-1">Why 6 pro-rata bases?</Badge>
          <p>Founder caveat May 19: <em>Value · Weight · Volume · Quantity · Equal · Specific Assignment</em>.
            TDL ships only Value default. Operix surfaces all 6 so heavy cargo (weight), bulky LCL (volume),
            per-NOS air (quantity), mixed cargo (equal), Rule 10 royalty (specific) all settle correctly.</p>
        </div>
        <div>
          <Badge className="mb-1">Why 10-row Duty Waterfall?</Badge>
          <p>A: CIF → B: +1% Landing → +BCD → +SWS → +AD → +SG → Total Custom → GST Assessable → +IGST → +Comp Cess → TOTAL LANDED VALUE.
            All 16 UDF chips visible. 4 TDL Gap Chips inline below.</p>
        </div>
        <div>
          <Badge className="mb-1">CICustomeVal · Moat #15</Badge>
          <p>{revalCount} revaluation event{revalCount === 1 ? '' : 's'} captured on this CI. Each edit cross-writes a ReconciliationEvent
            on the linked MLGIT with justification + gazette ref. Audit trail tamper-evident.</p>
        </div>
        <div>
          <Badge className="mb-1">Q15 · default_costing_method READ-ONLY</Badge>
          <p>Part F displays the applicable costing method (FIFO/FEFO/Weighted) consumed from <code>inventory-item.default_costing_method</code>.
            Per-item operator override deferred to EX-10 (D-NEW-FF).</p>
        </div>
      </CardContent>
    </Card>
  );
}
