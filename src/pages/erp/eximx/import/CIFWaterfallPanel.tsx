/**
 * @file        src/pages/erp/eximx/import/CIFWaterfallPanel.tsx
 * @purpose     9-column CIF body · 6-option basis picker (founder caveat)
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { computeCIFWaterfall } from '@/lib/cif-pro-rata-engine';
import type { CIFProRataBasis, CIFWaterfallInputLine, CIFWaterfallVoucherTotals } from '@/types/cif-waterfall';
import { CIF_PRO_RATA_DESCRIPTIONS } from '@/types/cif-waterfall';

interface Props {
  inputLines: CIFWaterfallInputLine[];
  voucherTotals: CIFWaterfallVoucherTotals;
  customExchangeRate: number;
  initialBasis?: CIFProRataBasis;
}

const BASES: CIFProRataBasis[] = ['value', 'weight', 'volume', 'quantity', 'equal', 'specific_assignment'];

export function CIFWaterfallPanel({ inputLines, voucherTotals, customExchangeRate, initialBasis = 'value' }: Props): JSX.Element {
  const [basis, setBasis] = useState<CIFProRataBasis>(initialBasis);

  const rows = useMemo(
    () => computeCIFWaterfall(inputLines, voucherTotals, basis, customExchangeRate),
    [inputLines, voucherTotals, basis, customExchangeRate],
  );

  const totalCIF = rows.reduce((s, r) => s + r.cif_total_inr, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <span>Part B · 9-Column CIF Body (Pro-Rata)</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">6 bases · founder caveat</Badge>
            <Select value={basis} onValueChange={(v) => setBasis(v as CIFProRataBasis)}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BASES.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">{CIF_PRO_RATA_DESCRIPTIONS[basis]}</p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Line</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Cost (Fx)</TableHead>
              <TableHead className="text-right">Cost Base (₹)</TableHead>
              <TableHead className="text-right">Insurance</TableHead>
              <TableHead className="text-right">Freight</TableHead>
              <TableHead className="text-right">ExWorks</TableHead>
              <TableHead className="text-right">Packing</TableHead>
              <TableHead className="text-right">CIF Total (₹)</TableHead>
              <TableHead className="text-right">Ratio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.line_id}>
                <TableCell className="font-mono text-xs">{r.line_id}</TableCell>
                <TableCell className="font-mono text-xs text-right">{r.qty}</TableCell>
                <TableCell className="font-mono text-xs text-right">{r.rate_forex}</TableCell>
                <TableCell className="font-mono text-xs text-right">{r.cost_forex.toLocaleString('en-IN')}</TableCell>
                <TableCell className="font-mono text-xs text-right">₹{r.cost_base_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                <TableCell className="font-mono text-xs text-right">₹{r.insurance_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                <TableCell className="font-mono text-xs text-right">₹{r.freight_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                <TableCell className="font-mono text-xs text-right">₹{r.exworks_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                <TableCell className="font-mono text-xs text-right">₹{r.packing_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                <TableCell className="font-mono text-xs text-right font-semibold">₹{r.cif_total_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
                <TableCell className="font-mono text-xs text-right">{(r.allocation_ratio * 100).toFixed(2)}%</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={9} className="text-right font-semibold">Total CIF (₹)</TableCell>
              <TableCell className="font-mono text-sm text-right font-bold">₹{totalCIF.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
