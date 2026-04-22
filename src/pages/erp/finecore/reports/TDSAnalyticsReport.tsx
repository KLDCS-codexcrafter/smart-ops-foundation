/**
 * TDSAnalyticsReport.tsx — TDS Analytics Report (fc-tds-analytics)
 * Central TDS management panel — Post TDS Journal lifecycle
 * [JWT] All data via localStorage
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Send } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { inr, fyStart, today, exportCSV } from './reportUtils';
import type { TDSDeductionEntry } from '@/types/compliance';
import { tdsDeductionsKey } from '@/types/compliance';
import { postVoucher, generateVoucherNo } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/compliance/tds-analytics/:key
    const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch { return []; }
}

interface Props { entityCode: string; }

export function TDSAnalyticsPanel({ entityCode }: Props) {
  const [dateFrom, setDateFrom] = useState(fyStart());
  const [dateTo, setDateTo] = useState(today());
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'posted'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const entries = useMemo(() => {
    // [JWT] GET /api/compliance/tds-deductions
    const all = ls<TDSDeductionEntry>(tdsDeductionsKey(entityCode));
    return all.filter(e => e.date >= dateFrom && e.date <= dateTo && e.status !== 'cancelled'
      && (statusFilter === 'all' || e.status === statusFilter));
  }, [entityCode, dateFrom, dateTo, statusFilter]);

  const openEntries = entries.filter(e => e.status === 'open');
  const totals = useMemo(() => ({
    payable: entries.reduce((s, e) => s + (e.gross_amount * e.tds_rate / 100), 0),
    advanceTDS: entries.reduce((s, e) => s + e.advance_tds_already, 0),
    netToPost: entries.filter(e => e.status === 'open').reduce((s, e) => s + e.net_tds_amount, 0),
    posted: entries.filter(e => e.status === 'posted').reduce((s, e) => s + e.net_tds_amount, 0),
    pending: entries.filter(e => e.status === 'open').length,
  }), [entries]);

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handlePostJournal = useCallback(() => {
    if (selected.size === 0) { toast.error('Select entries to post'); return; }
    const now = new Date().toISOString();
    const jvNo = generateVoucherNo('JV', entityCode);
    const totalTDS = openEntries.filter(e => selected.has(e.id)).reduce((s, e) => s + e.net_tds_amount, 0);
    const jv: Voucher = {
      id: `v-${Date.now()}`, voucher_no: jvNo, voucher_type_id: '', voucher_type_name: 'Journal',
      base_voucher_type: 'Journal', entity_id: entityCode, date: today(),
      ledger_lines: [], gross_amount: totalTDS, total_discount: 0, total_taxable: 0,
      total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0, total_tax: 0, round_off: 0,
      net_amount: totalTDS, tds_applicable: false, narration: `TDS Journal for ${selected.size} deductions`,
      terms_conditions: '', payment_enforcement: '', payment_instrument: '',
      status: 'draft', created_by: 'current-user', created_at: now, updated_at: now,
    };
    try {
      postVoucher(jv, entityCode);
      // [JWT] PATCH /api/compliance/tds-deductions
      const store = ls<TDSDeductionEntry>(tdsDeductionsKey(entityCode));
      store.forEach(t => {
        if (selected.has(t.id) && t.status === 'open') {
          t.status = 'posted'; t.tds_jv_id = jv.id; t.tds_jv_no = jvNo;
        }
      });
      // [JWT] PATCH /api/compliance/tds-deductions
      localStorage.setItem(tdsDeductionsKey(entityCode), JSON.stringify(store));
      setSelected(new Set());
      toast.success(`TDS Journal ${jvNo} posted for ${selected.size} entries`);
    } catch { toast.error('Failed to post journal'); }
  }, [selected, openEntries, entityCode]);

  const handleExport = () => {
    exportCSV('tds-analytics.csv',
      ['Type', 'Voucher No', 'Date', 'Vendor', 'PAN', 'Section', 'Rate', 'Gross', 'Advance TDS', 'Net TDS', 'Status'],
      entries.map(e => [e.source_voucher_type, e.source_voucher_no, e.date, e.party_name, e.party_pan, e.tds_section,
        String(e.tds_rate), String(e.gross_amount), String(e.advance_tds_already), String(e.net_tds_amount), e.status]));
    toast.success('Exported');
  };

  return (
    <div data-keyboard-form className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">TDS Analytics Report</h2>
          <p className="text-xs text-muted-foreground">Central TDS deduction tracking and journal posting</p></div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button data-primary onClick={handlePostJournal}><Send className="h-4 w-4 mr-2" />Post TDS Journal ({selected.size})</Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Payable TDS', value: inr(totals.payable) },
          { label: 'Advance TDS', value: inr(totals.advanceTDS) },
          { label: 'Net TDS to Post', value: inr(totals.netToPost) },
          { label: 'Already Posted', value: inr(totals.posted) },
          { label: 'Pending', value: String(totals.pending) },
        ].map(c => (
          <Card key={c.label}><CardContent className="pt-4"><p className="text-[10px] text-muted-foreground">{c.label}</p>
            <p className="text-lg font-bold">{c.value}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-3 items-end">
        <div><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} onKeyDown={onEnterNext} className="h-8 text-xs" /></div>
        <div><Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} onKeyDown={onEnterNext} className="h-8 text-xs" /></div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Pending</SelectItem>
            <SelectItem value="posted">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead className="text-xs">Type</TableHead><TableHead className="text-xs">Voucher No</TableHead>
            <TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Vendor</TableHead>
            <TableHead className="text-xs">PAN</TableHead><TableHead className="text-xs">Section</TableHead>
            <TableHead className="text-xs text-right">Rate</TableHead><TableHead className="text-xs text-right">Gross</TableHead>
            <TableHead className="text-xs text-right">Adv TDS</TableHead><TableHead className="text-xs text-right font-bold">Net TDS</TableHead>
            <TableHead className="text-xs">JV No</TableHead><TableHead className="text-xs">Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {entries.length === 0 && <TableRow><TableCell colSpan={13} className="text-center text-xs text-muted-foreground py-8">No TDS deductions in selected period</TableCell></TableRow>}
            {entries.map(e => (
              <TableRow key={e.id}>
                <TableCell>{e.status === 'open' && <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggleSelect(e.id)} />}</TableCell>
                <TableCell className="text-xs">{e.source_voucher_type}</TableCell>
                <TableCell className="text-xs font-mono">{e.source_voucher_no}</TableCell>
                <TableCell className="text-xs">{e.date}</TableCell>
                <TableCell className="text-xs">{e.party_name}</TableCell>
                <TableCell className="text-xs font-mono">{e.party_pan}</TableCell>
                <TableCell className="text-xs">{e.tds_section}</TableCell>
                <TableCell className="text-xs text-right font-mono">{e.tds_rate}%</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(e.gross_amount)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(e.advance_tds_already)}</TableCell>
                <TableCell className="text-xs text-right font-mono font-bold text-amber-600">{inr(e.net_tds_amount)}</TableCell>
                <TableCell className="text-xs font-mono">{e.tds_jv_no ?? ''}</TableCell>
                <TableCell><Badge variant="outline" className={e.status === 'posted' ? 'bg-green-500/10 text-green-700 border-green-500/30 text-[10px]' : 'bg-amber-500/10 text-amber-700 border-amber-500/30 text-[10px]'}>{e.status === 'posted' ? 'Done' : 'Open'}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

export default function TDSAnalyticsReport() {
  const { entityCode } = useEntityCode();
  if (!entityCode) return <SelectCompanyGate title="Select a company to view TDS Analytics" />;
  return <TDSAnalyticsPanel entityCode={entityCode} />;
}
