/**
 * @file        src/pages/erp/eximx/dgft/VendorScorecardDashboard.tsx
 * @purpose     Vendor Reliability Scorecard · Moat #21 PRIMARY · 7-factor scoring
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, TrendingUp, AlertTriangle } from 'lucide-react';
import { loadVendorScores, summarizeVendorScores } from '@/lib/vendor-reliability-engine';
import type { VendorReliabilityScore, VendorReliabilityClass } from '@/types/vendor-reliability-score';

export function VendorScorecardDashboard(): JSX.Element {
  const entityCode = 'sinha-trading';
  const [scores, setScores] = useState<VendorReliabilityScore[]>([]);
  useEffect(() => { setScores(loadVendorScores(entityCode)); }, []);
  const summary = summarizeVendorScores(scores);

  const classBadge = (c: VendorReliabilityClass): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (c === 'preferred' || c === 'strategic') return 'default';
    if (c === 'standard') return 'secondary';
    if (c === 'probationary') return 'outline';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold"><Building2 className="w-5 h-5 inline mr-2" />Vendor Reliability Scorecard (Moat #21 PRIMARY)</h2>
        <p className="text-sm text-muted-foreground">7-factor MIRROR of EX-7a Buyer Reliability · OTD · Quality · Price · CAROTAR · DGTR · Sanctions · Payment terms</p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {(['preferred', 'strategic', 'standard', 'probationary', 'blocked'] as const).map((c) => (
          <Card key={c}><CardContent className="pt-6"><Badge variant={classBadge(c)}>{c}</Badge><div className="text-2xl font-bold mt-2 font-mono">{summary.by_class[c]}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle><TrendingUp className="w-4 h-4 inline mr-2" />Average Composite Score · <span className="font-mono">{summary.avg_composite_score}/100</span></CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Country</TableHead><TableHead>OTD</TableHead><TableHead>Quality</TableHead><TableHead>Price</TableHead><TableHead>CAROTAR</TableHead><TableHead>DGTR</TableHead><TableHead>Sanctions</TableHead><TableHead>Payment</TableHead><TableHead>Composite</TableHead><TableHead>Class</TableHead></TableRow></TableHeader>
            <TableBody>
              {scores.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="text-xs">{v.vendor_name}</TableCell>
                  <TableCell className="font-mono">{v.country_code}</TableCell>
                  <TableCell className="font-mono">{v.components.on_time_delivery_score}</TableCell>
                  <TableCell className="font-mono">{v.components.quality_acceptance_score}</TableCell>
                  <TableCell className="font-mono">{v.components.price_stability_score}</TableCell>
                  <TableCell className="font-mono">{v.components.carotar_compliance_score}</TableCell>
                  <TableCell className="font-mono">{v.components.dgtr_exposure_score}{v.active_dgtr_case_count > 0 && <AlertTriangle className="w-3 h-3 inline ml-1 text-warning" />}</TableCell>
                  <TableCell className="font-mono">{v.components.sanctions_clearance_score}</TableCell>
                  <TableCell className="font-mono">{v.components.payment_terms_adherence_score}</TableCell>
                  <TableCell className="font-bold font-mono">{v.components.composite_score}</TableCell>
                  <TableCell><Badge variant={classBadge(v.components.classification)}>{v.components.classification}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
