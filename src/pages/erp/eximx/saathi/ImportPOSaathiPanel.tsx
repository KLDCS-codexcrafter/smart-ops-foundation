/**
 * @file        src/pages/erp/eximx/saathi/ImportPOSaathiPanel.tsx
 * @purpose     Saathi 4th surface · educational panel for Import PO entry
 * @sprint      T-Phase-1.EX-3-ImportPO-ForeignVendor-DualRate
 * @decisions   EX-3-Q9=b Saathi on Import PO
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot } from 'lucide-react';

export function ImportPOSaathiPanel(): JSX.Element {
  return (
    <Card className="border-l-4 border-l-primary sticky top-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" /> Saathi
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <div>
          <Badge className="mb-1">Why this Incoterm?</Badge>
          <p>11 ICC Incoterms 2020 govern delivery, insurance, and risk transfer. FOB = vendor handles to port. CIF = vendor includes insurance + freight. DDP = vendor handles ALL.</p>
        </div>
        <div>
          <Badge className="mb-1">Why two Exchange Rates?</Badge>
          <p><strong>Moat #16:</strong> Booking rate (Purchase dept) for PO commit. Customs valuation rate (Import dept) for BoE filing. These can differ; variance is captured and reconciled.</p>
        </div>
        <div>
          <Badge className="mb-1">Why CTH × Country × Date?</Badge>
          <p>3-bucket duty structure resolves from EX-2 master. Choose CTH and Country and the 3 buckets (Customs, Other, GST) render live — no posting (preview only).</p>
        </div>
      </CardContent>
    </Card>
  );
}
