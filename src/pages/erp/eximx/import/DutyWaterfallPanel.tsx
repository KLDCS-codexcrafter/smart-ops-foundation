/**
 * @file        src/pages/erp/eximx/import/DutyWaterfallPanel.tsx
 * @purpose     10-row duty waterfall · 4 TDL Gap Chips inline below
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { computeDutyWaterfall, TDL_GAP_CHIPS_DEFAULT } from '@/lib/duty-waterfall-engine';
import type { TDLGapChip } from '@/types/ci-item-allocation';

interface Props {
  entityCode: string;
  cifValueInr: number;
  cthCode: string;
  countryCode: string;
  effectiveDate: string;
  roundoffBeforeCustom?: number;
  roundoffBeforeNet?: number;
}

const SEV_CLASS: Record<TDLGapChip['severity'], string> = {
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
  high: 'bg-warning/15 text-warning border-warning/30',
  medium: 'bg-primary/15 text-primary border-primary/30',
  low: 'bg-muted text-muted-foreground',
};

export function DutyWaterfallPanel({
  entityCode, cifValueInr, cthCode, countryCode, effectiveDate,
  roundoffBeforeCustom = 0, roundoffBeforeNet = 0,
}: Props): JSX.Element {
  const result = useMemo(
    () => computeDutyWaterfall(entityCode, cifValueInr, cthCode, countryCode, effectiveDate, roundoffBeforeCustom, roundoffBeforeNet),
    [entityCode, cifValueInr, cthCode, countryCode, effectiveDate, roundoffBeforeCustom, roundoffBeforeNet],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <span>Part D · 10-Row Duty Waterfall</span>
          <Badge variant="outline">CTH {cthCode} · {countryCode} · {effectiveDate}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Sl</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead>UDF Chip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.map((r) => (
              <TableRow key={r.kind} className={r.is_subtotal ? 'bg-muted/40 font-semibold' : ''}>
                <TableCell className="font-mono text-xs">{r.sl}</TableCell>
                <TableCell className="text-xs">{r.description}{r.is_editable && <Badge variant="outline" className="ml-2 text-[10px]">editable</Badge>}</TableCell>
                <TableCell className="font-mono text-xs text-right">{r.rate_pct !== null ? `${r.rate_pct}%` : '—'}</TableCell>
                <TableCell className="font-mono text-xs text-right">₹{r.amount_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                <TableCell className="font-mono text-[10px] text-muted-foreground">{r.udf_chip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 pt-3 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold">TDL Gap Chips · Moat #13 consumer</span>
            <Link to="/erp/eximx/saathi/tdl-gaps-atlas" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Open Atlas
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {TDL_GAP_CHIPS_DEFAULT.map((chip) => (
              <Badge key={chip.id} variant="outline" className={`${SEV_CLASS[chip.severity]} text-[10px]`} title={chip.description}>
                {chip.label}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
