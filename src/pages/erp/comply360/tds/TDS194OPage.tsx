/**
 * @file        src/pages/erp/comply360/tds/TDS194OPage.tsx
 * @purpose     NATIVE Comply360 TDS 194-O (e-commerce operator) return builder surface
 * @sprint      Sprint 72 · T-Phase-5.A.1.4 · Block 7 · DP-S72-3
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCcw, ShoppingCart, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { build194OReturn, type TDS194OPayeeRow } from '@/lib/comply360-tds-194q-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

const QUARTERS: Array<'Q1' | 'Q2' | 'Q3' | 'Q4'> = ['Q1', 'Q2', 'Q3', 'Q4'];

export default function TDS194OPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [quarter, setQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q4');
  const [refreshTick, setRefreshTick] = useState(0);

  const result = useMemo(() => {
    if (!entityCode) return null;
    return build194OReturn({ entity_code: entityCode, fy: 'FY25-26', quarter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, quarter, refreshTick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity to view 194-O return.</p>
        </Card>
      </div>
    );
  }

  const rows = (result?.payload.rows ?? []) as TDS194OPayeeRow[];
  const totals = result?.payload.totals;
  const warnCount = result?.warnings.length ?? 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">TDS 194-O · E-commerce Operator</h1>
          <p className="text-muted-foreground text-sm">1% on gross sale value credited to participants</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={quarter} onValueChange={(v) => setQuarter(v as 'Q1' | 'Q2' | 'Q3' | 'Q4')}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUARTERS.map((q) => <SelectItem key={q} value={q}>{q} FY25-26</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setRefreshTick((t) => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Participants</div>
          <div className="text-xl font-mono font-semibold mt-1">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Gross Sale</div>
          <div className="text-xl font-mono font-semibold mt-1">{inr(totals?.gross_amount ?? 0)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">TDS Amount</div>
          <div className="text-xl font-mono font-semibold mt-1 text-amber-500">{inr(totals?.tds_amount ?? 0)}</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Participants · {quarter} FY25-26</h2>
          {warnCount > 0
            ? <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />{warnCount} warnings</Badge>
            : <Badge className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Clean</Badge>}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Participant</TableHead>
              <TableHead>PAN</TableHead>
              <TableHead className="text-right">Gross Sale</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">TDS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No 194-O deductions in {quarter}</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.party_id}>
                <TableCell>{r.party_name}</TableCell>
                <TableCell className="font-mono">{r.pan ?? '—'}</TableCell>
                <TableCell className="text-right font-mono">{inr(r.gross_sale)}</TableCell>
                <TableCell className="text-right font-mono">{r.rate}%</TableCell>
                <TableCell className="text-right font-mono text-amber-500">{inr(r.tds_amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
