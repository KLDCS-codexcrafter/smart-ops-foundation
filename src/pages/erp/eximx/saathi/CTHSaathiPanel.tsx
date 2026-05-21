/**
 * @file        src/pages/erp/eximx/saathi/CTHSaathiPanel.tsx
 * @purpose     Saathi side-panel inside CTH master · 3rd Saathi surface
 * @sprint      T-Phase-1.EX-2-CTH-Country-Date-Master
 * @decisions   EX-2-Q8=b Saathi panel inside CTH master
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bot, ExternalLink, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CTHTimelineView } from '@/pages/erp/eximx/masters/CTHTimelineView';

export function CTHSaathiPanel({ selectedCTH }: { selectedCTH: string | null }): JSX.Element {
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <Card className="border-l-4 border-l-primary sticky top-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" /> Saathi
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <div>
          <Badge className="mb-1">Why this CTH?</Badge>
          <p>India uses 8-digit ITC(HS) classification on every Bill of Entry. The first 6 digits map to international HSN; the last 2 are India-specific tariff-item granularity required by ICEGATE.</p>
        </div>
        <div>
          <Badge className="mb-1">Why this Country?</Badge>
          <p>Country of Origin determines (a) which FTA preference applies (b) whether CAROTAR Rule 6 self-certification is allowed (c) anti-dumping or safeguard duties.</p>
        </div>
        <div>
          <Badge className="mb-1">Why this Date?</Badge>
          <p>Duty rates are stored as effective-date-range bands per (CTH x Country). When you file a BoE, the rate applicable is the one whose band covers the BoE date.</p>
        </div>
        {selectedCTH && (
          <div className="pt-2 border-t">
            <Badge variant="outline" className="mb-1 font-mono">Selected: {selectedCTH}</Badge>
            <p className="text-muted-foreground">Click 3-bucket card above to see dynamic duty labels resolved at render time (Moat #14).</p>
          </div>
        )}
        <Link to="/erp/eximx/saathi-tdl-gaps-atlas" className="flex items-center gap-1 text-primary hover:underline pt-2 border-t">
          <ExternalLink className="w-3 h-3" /> Open full TDL Gaps Atlas Preview
        </Link>
      </CardContent>
    </Card>
  );
}
