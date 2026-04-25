/**
 * OutstandingAging.tsx — Outstanding Aging report (fc-out-receivables / fc-out-payables / fc-rpt-outstanding)
 * Open bills grouped by party with age buckets
 * [JWT] All data via hooks
 */
import { useState, useMemo } from 'react';
import { TrendingUp, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useOutstanding } from '@/hooks/useOutstanding';
import { onEnterNext } from '@/lib/keyboard';
import { inr, fmtDate, today, exportCSV } from './reportUtils';

interface OutstandingAgingPanelProps { entityCode: string; type?: 'debtor' | 'creditor'; }

const BUCKETS = [30, 60, 90, 180, 999];
const BUCKET_LABELS = ['0-30', '31-60', '61-90', '91-180', '180+'];

export function OutstandingAgingPanel({ entityCode, type: initialType }: OutstandingAgingPanelProps) {
  const { getAging } = useOutstanding(entityCode);
  const [asOfDate, setAsOfDate] = useState(today());
  const [viewType, setViewType] = useState<'debtor' | 'creditor' | 'both'>(initialType ?? 'both');
  const [expandedParty, setExpandedParty] = useState<string | null>(null);

  const aging = useMemo(() => getAging(asOfDate), [asOfDate, getAging]);

  const filtered = useMemo(() => {
    if (viewType === 'both') return aging;
    return aging.filter(a => a.party_type === viewType);
  }, [aging, viewType]);

  // Group by party
  type AgingBill = (typeof filtered)[number];
  const partyGroups = useMemo(() => {
    const map = new Map<string, { partyName: string; partyType: string; bills: AgingBill[]; buckets: number[]; total: number }>();
    for (const bill of filtered) {
      const ex = map.get(bill.party_id) || { partyName: bill.party_name, partyType: bill.party_type, bills: [] as AgingBill[], buckets: new Array(BUCKETS.length).fill(0), total: 0 };
      ex.bills.push(bill);
      ex.buckets[bill.bucket] += bill.pending_amount;
      ex.total += bill.pending_amount;
      map.set(bill.party_id, ex);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [filtered]);

  const totals = useMemo(() => {
    const b = new Array(BUCKETS.length).fill(0);
    let total = 0;
    for (const [, g] of partyGroups) {
      g.buckets.forEach((v, i) => { b[i] += v; });
      total += g.total;
    }
    return { buckets: b, total };
  }, [partyGroups]);

  const handleExport = () => {
    const rows: string[][] = [];
    for (const [, g] of partyGroups) {
      for (const bill of g.bills) {
        rows.push([g.partyName, bill.voucher_no, bill.voucher_date, bill.due_date, String(bill.original_amount), String(bill.pending_amount), String(bill.ageDays), BUCKET_LABELS[bill.bucket]]);
      }
    }
    exportCSV('outstanding-aging.csv', ['Party', 'Bill No', 'Bill Date', 'Due Date', 'Amount', 'Pending', 'Age', 'Bucket'], rows);
  };

  return (
    <div data-keyboard-form className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-teal-500" />
          <h2 className="text-lg font-bold">Outstanding Aging</h2>
        </div>
        <Button data-primary variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      <Card><CardContent className="p-3 flex flex-wrap gap-4 items-end">
        {!initialType && (
          <Tabs value={viewType} onValueChange={v => setViewType(v as typeof viewType)}>
            <TabsList className="h-8">
              <TabsTrigger value="debtor" className="text-xs h-7">Receivables</TabsTrigger>
              <TabsTrigger value="creditor" className="text-xs h-7">Payables</TabsTrigger>
              <TabsTrigger value="both" className="text-xs h-7">Both</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">As On</label>
          <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="h-8 text-xs w-40" onKeyDown={onEnterNext} />
        </div>
      </CardContent></Card>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Total Outstanding</p>
          <p className="text-sm font-bold">{inr(totals.total)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Current (0-30)</p>
          <p className="text-sm font-bold">{inr(totals.buckets[0])}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Overdue (31-90)</p>
          <p className="text-sm font-bold text-amber-600">{inr(totals.buckets[1] + totals.buckets[2])}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Severely Overdue (90+)</p>
          <p className="text-sm font-bold text-red-600">{inr(totals.buckets[3] + totals.buckets[4])}</p>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-8"></TableHead>
              <TableHead className="text-xs">Party Name</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              {BUCKET_LABELS.map(b => <TableHead key={b} className="text-xs text-right">{b}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {partyGroups.map(([partyId, g]) => (
              <>
                <TableRow key={partyId} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedParty(expandedParty === partyId ? null : partyId)}>
                  <TableCell className="text-xs">{expandedParty === partyId ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}</TableCell>
                  <TableCell className="text-xs font-medium">
                    {g.partyName}
                    <Badge variant="outline" className="ml-2 text-[8px]">{g.partyType === 'debtor' ? 'Debtor' : 'Creditor'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-medium">{inr(g.total)}</TableCell>
                  {g.buckets.map((v, i) => <TableCell key={`${partyId}-b-${BUCKET_LABELS[i]}`} className="text-xs text-right font-mono">{v > 0 ? inr(v) : ''}</TableCell>)}
                </TableRow>
                {expandedParty === partyId && g.bills.map(bill => (
                  <TableRow key={bill.id} className="bg-muted/20">
                    <TableCell></TableCell>
                    <TableCell className="text-xs pl-8">
                      {bill.voucher_no} — {fmtDate(bill.voucher_date)} — Due: {fmtDate(bill.due_date)} — Age: {bill.ageDays}d
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">{inr(bill.pending_amount)}</TableCell>
                    <TableCell colSpan={BUCKETS.length}></TableCell>
                  </TableRow>
                ))}
              </>
            ))}
            <TableRow className="bg-muted/30 font-bold">
              <TableCell></TableCell>
              <TableCell className="text-xs font-bold">Grand Total</TableCell>
              <TableCell className="text-xs text-right font-mono font-bold">{inr(totals.total)}</TableCell>
              {totals.buckets.map((v, i) => <TableCell key={`tot-${BUCKET_LABELS[i]}`} className="text-xs text-right font-mono font-bold">{inr(v)}</TableCell>)}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

export default function OutstandingAging() {
  const { entityCode } = useEntityCode();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Outstanding Aging' }]} showDatePicker={false} />
        <main>
          {entityCode
            ? <OutstandingAgingPanel entityCode={entityCode} />
            : <SelectCompanyGate title="Select a company to view Outstanding Aging" />
          }
        </main>
      </div>
    </SidebarProvider>
  );
}
