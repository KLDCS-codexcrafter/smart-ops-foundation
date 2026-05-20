/**
 * @file        src/pages/erp/eximx/saathi/MultiLegGITSaathiPanel.tsx
 * @purpose     Saathi educational panel for MLGIT · 5th Saathi surface · Superpowers 12→13
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 * @decisions   EX-4-Q8=b Saathi on MLGIT detail
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot } from 'lucide-react';
import type { MultiLegGoodsInTransit } from '@/types/multi-leg-git';
import { countActiveLegs } from '@/types/multi-leg-git';

export function MultiLegGITSaathiPanel({ mlgit }: { mlgit: MultiLegGoodsInTransit }): JSX.Element {
  return (
    <Card className="border-l-4 border-l-primary sticky top-4">
      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bot className="w-4 h-4 text-primary" /> Saathi</CardTitle></CardHeader>
      <CardContent className="text-xs space-y-3">
        <div>
          <Badge className="mb-1">Why 5 legs?</Badge>
          <p>India import journey has 5 canonical legs: Origin Port → Vessel → Destination Port → CFS/ICD → Customer Warehouse. {countActiveLegs(mlgit)} of 5 legs active here (skipped legs marked).</p>
        </div>
        <div>
          <Badge className="mb-1">Why 3 buckets?</Badge>
          <p><strong>Moat #1:</strong> (1) Booked at PO commit using buying_rate. (2) Custom Revalued at BoE using customs_valuation_rate (Moat #16). (3) Actual Landed after all duties + freight + insurance + CFS dwell.</p>
        </div>
        <div>
          <Badge className="mb-1">Why 4 allocation methods?</Badge>
          <p>by_value (default for mixed-value shipments) · by_weight (heavy cargo) · by_quantity (uniform unit cargo) · equal (rare · simple split). Method picks from LandedCostConfig · operator override OK.</p>
        </div>
        <div>
          <Badge className="mb-1">CCSP/CFS/ICD at Leg 4?</Badge>
          <p>v7 Compliance Gap #12 · CCSP-licensed facility tracked at Leg 4. License number + expiry captured. Dwell time = demurrage risk indicator.</p>
        </div>
      </CardContent>
    </Card>
  );
}
