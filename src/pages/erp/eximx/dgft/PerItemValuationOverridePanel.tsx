/**
 * @file        src/pages/erp/eximx/dgft/PerItemValuationOverridePanel.tsx
 * @purpose     D-NEW-FF user surface · per-BoE-line valuation override management
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileWarning, TrendingUp, TrendingDown } from 'lucide-react';
import { loadBoELineOverrides } from '@/lib/per-item-valuation-engine';
import { OVERRIDE_REASON_DESCRIPTIONS } from '@/types/bill-of-entry-item-valuation-override';
import type { BoELineValuationOverride } from '@/types/bill-of-entry-item-valuation-override';

export function PerItemValuationOverridePanel(): JSX.Element {
  const entityCode = 'sinha-steel';
  const [overrides, setOverrides] = useState<BoELineValuationOverride[]>([]);
  useEffect(() => { setOverrides(loadBoELineOverrides(entityCode)); }, []);

  const totalDelta = overrides.reduce((s, o) => s + o.delta_total_duty_inr, 0);
  const totalOverrides = overrides.length;
  const totalUplift = overrides.filter((o) => o.delta_total_duty_inr > 0).length;
  const totalReduction = overrides.filter((o) => o.delta_total_duty_inr < 0).length;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold"><FileWarning className="w-5 h-5 inline mr-2" />Per-Item Valuation Override Panel (D-NEW-FF)</h1>
        <p className="text-sm text-muted-foreground">Customs revaluation per BoE line · BoELine + CILine + ImportPOLine STAY 0-DIFF · sibling discipline (5th application)</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold font-mono">{totalOverrides}</div><div className="text-xs text-muted-foreground">Total Overrides</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-destructive font-mono"><TrendingUp className="w-4 h-4 inline" /> {totalUplift}</div><div className="text-xs text-muted-foreground">Upward (Customs Revaluation)</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-success font-mono"><TrendingDown className="w-4 h-4 inline" /> {totalReduction}</div><div className="text-xs text-muted-foreground">Downward (Discount Allowance)</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Net Duty Delta</div><div className={`text-2xl font-bold font-mono ${totalDelta > 0 ? 'text-destructive' : 'text-success'}`}>₹{Math.abs(totalDelta).toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Override Register</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Override No</TableHead><TableHead>BoE</TableHead><TableHead>Line</TableHead><TableHead>Reason</TableHead><TableHead>Original Duty (₹)</TableHead><TableHead>Overridden Duty (₹)</TableHead><TableHead>Delta (₹)</TableHead><TableHead>Approver</TableHead></TableRow></TableHeader>
            <TableBody>
              {overrides.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.override_no}</TableCell>
                  <TableCell className="font-mono text-xs">{o.related_boe_no}</TableCell>
                  <TableCell className="font-mono">{o.line_no}</TableCell>
                  <TableCell><Badge variant="outline" title={OVERRIDE_REASON_DESCRIPTIONS[o.reason]}>{o.reason.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{o.original_total_duty_inr.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono">{o.overridden_total_duty_inr.toLocaleString()}</TableCell>
                  <TableCell className={`text-right font-bold font-mono ${o.delta_total_duty_inr > 0 ? 'text-destructive' : 'text-success'}`}>{o.delta_total_duty_inr > 0 ? '+' : ''}{o.delta_total_duty_inr.toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{o.approver_user}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-4">
            <strong>D-NEW-FF Resolution</strong>: Overrides apply via applyOverridesToBoE() pure helper · BoELine + CILine + ImportPOLine + duty-waterfall-engine.ts stay 0-DIFF.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
