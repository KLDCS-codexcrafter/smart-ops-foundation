/**
 * DayBook.tsx — Day Book report panel (fc-rpt-daybook)
 * All vouchers in date range, chronological. Reads from useVouchers.
 * [JWT] All data via hooks
 */
import { useState, useMemo } from 'react';
import { BookOpen, Download, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useVouchers } from '@/hooks/useVouchers';
import { onEnterNext } from '@/lib/keyboard';
import { inr, fmtDate, today, exportCSV } from './reportUtils';

interface DayBookPanelProps {
  entityCode: string;
  onNavigate?: (module: string) => void;
  /** [T10-pre.2d-B] Optional pre-filter when arriving via register drill-down. */
  initialFilters?: {
    dateFrom?: string;
    dateTo?: string;
    typeFilter?: string;
    search?: string;
  };
}

const VOUCHER_TYPES = ['All', 'Sales', 'Purchase', 'Receipt', 'Payment', 'Journal', 'Contra', 'Credit Note', 'Debit Note', 'Delivery Note', 'Receipt Note', 'Stock Journal'];

const typeToModule: Record<string, string> = {
  'Sales': 'fc-txn-sales-invoice',
  'Purchase': 'fc-txn-purchase-invoice',
  'Receipt': 'fc-txn-receipt',
  'Payment': 'fc-txn-payment',
  'Journal': 'fc-txn-journal',
  'Contra': 'fc-txn-contra',
  'Credit Note': 'fc-txn-credit-note',
  'Debit Note': 'fc-txn-debit-note',
  'Delivery Note': 'fc-txn-delivery-note',
  'Receipt Note': 'fc-txn-receipt-note',
  'Stock Journal': 'fc-inv-stock-journal',
};

export function DayBookPanel({ entityCode, onNavigate, initialFilters }: DayBookPanelProps) {
  const { vouchers } = useVouchers(entityCode);
  const t = today();
  const monthStart = t.slice(0, 8) + '01';
  const [dateFrom, setDateFrom] = useState(initialFilters?.dateFrom ?? monthStart);
  const [dateTo, setDateTo] = useState(initialFilters?.dateTo ?? t);
  const [typeFilter, setTypeFilter] = useState(initialFilters?.typeFilter ?? 'All');
  const [search, setSearch] = useState(initialFilters?.search ?? '');

  const filtered = useMemo(() => {
    let result = vouchers.filter(v => v.date >= dateFrom && v.date <= dateTo);
    if (typeFilter !== 'All') result = result.filter(v => v.base_voucher_type === typeFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(v => v.party_name?.toLowerCase().includes(s) || v.voucher_no.toLowerCase().includes(s));
    }
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }, [vouchers, dateFrom, dateTo, typeFilter, search]);

  const salesTot = filtered.filter(v => v.base_voucher_type === 'Sales').reduce((s, v) => s + v.net_amount, 0);
  const purchTot = filtered.filter(v => v.base_voucher_type === 'Purchase').reduce((s, v) => s + v.net_amount, 0);
  const recTot = filtered.filter(v => v.base_voucher_type === 'Receipt').reduce((s, v) => s + v.net_amount, 0);
  const payTot = filtered.filter(v => v.base_voucher_type === 'Payment').reduce((s, v) => s + v.net_amount, 0);

  const handleExport = () => {
    exportCSV('daybook.csv',
      ['Date', 'Voucher No', 'Type', 'Party', 'Dr', 'Cr', 'Status'],
      filtered.map(v => [v.date, v.voucher_no, v.base_voucher_type, v.party_name ?? '', String(v.net_amount), '', v.status])
    );
  };

  const statusBadge = (s: string) => {
    if (s === 'posted') return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">Posted</Badge>;
    if (s === 'cancelled') return <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>;
    if (s === 'in_transit') return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">In Transit</Badge>;
    if (s === 'received') return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">Received</Badge>;
    return <Badge variant="outline" className="text-[10px]">Draft</Badge>;
  };

  return (
    <div data-keyboard-form className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-teal-500" />
          <h2 className="text-lg font-bold">Day Book</h2>
        </div>
        <Button data-primary variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Filter bar */}
      <Card><CardContent className="p-3 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">From</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">To</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Voucher Type</label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{VOUCHER_TYPES.map(t => <SelectItem key={t} value={t}><span className="text-xs">{t}</span></SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[160px]">
          <label className="text-[10px] text-muted-foreground">Search</label>
          <Input placeholder="Party name or voucher no..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-xs" onKeyDown={onEnterNext} />
        </div>
      </CardContent></Card>

      {/* Summary strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Vouchers', value: String(filtered.length) },
          { label: 'Sales', value: inr(salesTot) },
          { label: 'Purchases', value: inr(purchTot) },
          { label: 'Receipts', value: inr(recTot) },
          { label: 'Payments', value: inr(payTot) },
        ].map(c => (
          <Card key={c.label}><CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{c.label}</p>
            <p className="text-sm font-bold">{c.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No transactions in this period</p>
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Voucher No</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Party / Narration</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(v => (
                <TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { if (onNavigate) onNavigate(typeToModule[v.base_voucher_type] ?? 'fc-hub'); }}>
                  <TableCell className="text-xs">{fmtDate(v.date)}</TableCell>
                  <TableCell className="text-xs font-mono">{v.voucher_no}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{v.base_voucher_type}</Badge></TableCell>
                  <TableCell className="text-xs">{v.party_name || v.narration || '—'}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{inr(v.net_amount)}</TableCell>
                  <TableCell className="text-center">{statusBadge(v.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
    </div>
  );
}

export default function DayBook() {
  const { entityCode } = useEntityCode();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Day Book' }]} showDatePicker={false} />
        <main>
          {entityCode
            ? <DayBookPanel entityCode={entityCode} />
            : <SelectCompanyGate title="Select a company to view Day Book" />
          }
        </main>
      </div>
    </SidebarProvider>
  );
}
