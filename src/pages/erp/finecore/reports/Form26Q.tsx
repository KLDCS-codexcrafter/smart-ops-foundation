/**
 * Form26Q.tsx — Form 26Q (Non-salary domestic TDS)
 * [JWT] All data via localStorage
 */
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { inr, exportCSV } from './reportUtils';
import type { TDSDeductionEntry } from '@/types/compliance';
import { tdsDeductionsKey } from '@/types/compliance';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

function ls<T>(key: string): T[] { try {
  // [JWT] GET /api/compliance/storage/:key
  const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch { return []; } }

const DUE_DATES: Record<string, string> = { Q1: '31 Jul', Q2: '31 Oct', Q3: '31 Jan', Q4: '31 May' };

interface Props { entityCode: string; }

export function Form26QPanel({ entityCode }: Props) {
  const [quarter, setQuarter] = useState<'Q1'|'Q2'|'Q3'|'Q4'>('Q1');
  const [ay, setAY] = useState('2026-27');

  // [JWT] GET /api/accounting/gst-entity-config
  const gstConfig = useMemo(() => { try { return JSON.parse(localStorage.getItem('erp_gst_entity_config') || '{}'); } catch { return {}; } }, []);

  // [JWT] GET /api/compliance/tds-deductions — non-salary, domestic
  const entries = useMemo(() =>
    ls<TDSDeductionEntry>(tdsDeductionsKey(entityCode))
      .filter(e => e.tds_section !== '192' && !['195','196A','196B','196C','196D'].includes(e.tds_section)
        && e.quarter === quarter && e.assessment_year === ay && e.status !== 'cancelled'),
  [entityCode, quarter, ay]);

  // Section summary
  const sectionSummary = useMemo(() => {
    const map = new Map<string, { section: string; nature: string; count: number; tds: number; deposited: number }>();
    entries.forEach(e => {
      const ex = map.get(e.tds_section) || { section: e.tds_section, nature: e.nature_of_payment, count: 0, tds: 0, deposited: 0 };
      ex.count++; ex.tds += e.net_tds_amount;
      if (e.challan_id) ex.deposited += e.net_tds_amount;
      map.set(e.tds_section, ex);
    });
    return Array.from(map.values());
  }, [entries]);

  const totalTDS = entries.reduce((s, e) => s + e.net_tds_amount, 0);
  const tanMissing = !gstConfig.tan_number;

  const handleExport = () => {
    exportCSV('form-26q.csv',
      ['PAN', 'Name', 'Section', 'Nature', 'Amount Paid', 'TDS Amount', 'Date Deducted', 'Date Deposited'],
      entries.map(e => [e.party_pan, e.party_name, e.tds_section, e.nature_of_payment,
        String(e.gross_amount), String(e.net_tds_amount), e.date, e.challan_id ?? '']));
    toast.success('Exported');
  };

  return (
    <div data-keyboard-form className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Form 26Q (Non-salary)</h2><p className="text-xs text-muted-foreground">Quarterly TDS Return — Non-salary domestic deductions</p></div>
        <Button data-primary variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>

      {tanMissing && (
        <Alert className="border-red-500/30 bg-red-500/5">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-xs text-red-700">TAN not configured. Set TAN in GST Entity Configuration before filing.</AlertDescription>
        </Alert>
      )}

      <Alert className="border-amber-500/30 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs text-amber-700">Due date for {quarter}: {DUE_DATES[quarter]}</AlertDescription>
      </Alert>

      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-xs font-semibold">Part A — Deductor Details</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div><span className="text-muted-foreground">TAN:</span> <span className="font-mono">{gstConfig.tan_number || 'Not set'}</span></div>
          <div><span className="text-muted-foreground">Name:</span> {gstConfig.entityName || '4DSmartOps Pvt Ltd'}</div>
          <div className="flex gap-2">
            <Select value={quarter} onValueChange={v => setQuarter(v as 'Q1' | 'Q2' | 'Q3' | 'Q4')}>
              <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
              <SelectContent>{['Q1','Q2','Q3','Q4'].map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={ay} onValueChange={setAY}>
              <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="2026-27">2026-27</SelectItem><SelectItem value="2025-26">2025-26</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </CardContent></Card>

      {/* Part B — Deductee details */}
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">PAN</TableHead><TableHead className="text-xs">Name</TableHead>
            <TableHead className="text-xs">Section</TableHead><TableHead className="text-xs">Nature</TableHead>
            <TableHead className="text-xs text-right">Amount Paid</TableHead><TableHead className="text-xs text-right">TDS</TableHead>
            <TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Challan</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {entries.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">No non-salary deductions for {quarter} {ay}</TableCell></TableRow>}
            {entries.map(e => (
              <TableRow key={e.id}>
                <TableCell className="text-xs font-mono">{e.party_pan}</TableCell>
                <TableCell className="text-xs">{e.party_name}</TableCell>
                <TableCell className="text-xs">{e.tds_section}</TableCell>
                <TableCell className="text-xs">{e.nature_of_payment}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(e.gross_amount)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(e.net_tds_amount)}</TableCell>
                <TableCell className="text-xs">{e.date}</TableCell>
                <TableCell className="text-xs font-mono">{e.challan_id ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Section summary */}
      {sectionSummary.length > 0 && (
        <Card><CardContent className="pt-4">
          <p className="text-xs font-semibold mb-2">Section Summary</p>
          <Table><TableHeader><TableRow>
            <TableHead className="text-xs">Section</TableHead><TableHead className="text-xs">Nature</TableHead>
            <TableHead className="text-xs text-right">Deductees</TableHead><TableHead className="text-xs text-right">Total TDS</TableHead>
            <TableHead className="text-xs text-right">Deposited</TableHead><TableHead className="text-xs text-right">Balance</TableHead>
          </TableRow></TableHeader>
          <TableBody>{sectionSummary.map(s => (
            <TableRow key={s.section}>
              <TableCell className="text-xs">{s.section}</TableCell><TableCell className="text-xs">{s.nature}</TableCell>
              <TableCell className="text-xs text-right">{s.count}</TableCell><TableCell className="text-xs text-right font-mono">{inr(s.tds)}</TableCell>
              <TableCell className="text-xs text-right font-mono">{inr(s.deposited)}</TableCell>
              <TableCell className="text-xs text-right font-mono font-bold">{inr(s.tds - s.deposited)}</TableCell>
            </TableRow>
          ))}</TableBody></Table>
        </CardContent></Card>
      )}

      <Card><CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">Total TDS for {quarter}: <span className="font-bold text-foreground">{inr(totalTDS)}</span></p>
      </CardContent></Card>
    </div>
  );
}
export default function Form26Q() {
  const { entityCode } = useEntityCode();
  return entityCode
    ? <Form26QPanel entityCode={entityCode} />
    : <SelectCompanyGate title="Select a company to view Form 26Q" />;
}
