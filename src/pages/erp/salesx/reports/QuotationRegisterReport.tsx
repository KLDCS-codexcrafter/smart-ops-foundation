/**
 * QuotationRegisterReport.tsx — read-only quotations report
 * Sprint 3 SalesX.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Search, Download } from 'lucide-react';
import { useQuotations } from '@/hooks/useQuotations';
import type { QuotationStage } from '@/types/quotation';
import { onEnterNext } from '@/lib/keyboard';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;

const STAGE_COLOR: Record<QuotationStage, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  on_hold: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  negotiation: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  confirmed: 'bg-green-500/15 text-green-700 border-green-500/30',
  lost: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

export function QuotationRegisterReportPanel({ entityCode }: Props) {
  const { quotations } = useQuotations(entityCode);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | QuotationStage>('all');

  const filtered = useMemo(() => {
    let list = quotations;
    if (from) list = list.filter(q => q.quotation_date >= from);
    if (to) list = list.filter(q => q.quotation_date <= to);
    if (stageFilter !== 'all') list = list.filter(q => q.quotation_stage === stageFilter);
    if (search) {
      const x = search.toLowerCase();
      list = list.filter(q =>
        (q.quotation_no ?? '').toLowerCase().includes(x) ||
        (q.customer_name ?? '').toLowerCase().includes(x),
      );
    }
    return list.slice().sort((a, b) => b.quotation_date.localeCompare(a.quotation_date));
  }, [quotations, from, to, stageFilter, search]);

  const totals = useMemo(() => {
    return filtered.reduce((acc, q) => {
      acc.count += 1;
      acc.value += q.total_amount ?? 0;
      if (q.quotation_stage === 'confirmed') {
        acc.confirmedCount += 1;
        acc.confirmedValue += q.total_amount ?? 0;
      }
      return acc;
    }, { count: 0, value: 0, confirmedCount: 0, confirmedValue: 0 });
  }, [filtered]);

  const exportCSV = () => {
    const headers = ['Quotation No', 'Date', 'Customer', 'Stage', 'Valid Until', 'Total ₹'];
    const rows = filtered.map(q => [
      q.quotation_no ?? '', q.quotation_date,
      q.customer_name ?? '', q.quotation_stage,
      q.valid_until_date ?? '', String(q.total_amount ?? 0),
    ]);
    const csv = [headers, ...rows].map(r =>
      r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `quotation-register-${entityCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotation Register Report</h1>
          <p className="text-sm text-muted-foreground">All quotations with totals &amp; CSV export</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Quotations</p>
            <p className="text-2xl font-bold font-mono mt-1">{totals.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Value</p>
            <p className="text-2xl font-bold font-mono mt-1">{formatINR(totals.value)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Confirmed</p>
            <p className="text-2xl font-bold font-mono mt-1">{totals.confirmedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Confirmed Value</p>
            <p className="text-2xl font-bold font-mono mt-1">{formatINR(totals.confirmedValue)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={onEnterNext}
                placeholder="Search quotation no / customer"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">From</span>
              <div className="w-36"><SmartDateInput value={from} onChange={setFrom} /></div>
              <span className="text-xs text-muted-foreground">To</span>
              <div className="w-36"><SmartDateInput value={to} onChange={setTo} /></div>
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['all', 'draft', 'negotiation', 'confirmed', 'lost'] as const).map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant={stageFilter === s ? 'default' : 'outline'}
                  onClick={() => setStageFilter(s)}
                  className={cn(
                    'h-7 text-xs capitalize',
                    stageFilter === s && 'bg-orange-500 hover:bg-orange-600',
                  )}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No quotations match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Quotation No</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Stage</TableHead>
                  <TableHead className="text-xs">Valid Until</TableHead>
                  <TableHead className="text-xs text-right">Total ₹</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(q => (
                  <TableRow key={q.id}>
                    <TableCell className="text-xs font-mono">{q.quotation_no ?? '—'}</TableCell>
                    <TableCell className="text-xs">{q.quotation_date}</TableCell>
                    <TableCell className="text-xs">{q.customer_name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px] capitalize', STAGE_COLOR[q.quotation_stage])}>
                        {q.quotation_stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{q.valid_until_date ?? '—'}</TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {formatINR(q.total_amount ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function QuotationRegisterReport(props: Props) {
  return <QuotationRegisterReportPanel {...props} />;
}
