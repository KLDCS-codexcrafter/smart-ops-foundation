/**
 * Form24Q.tsx — Form 24Q (Salary TDS, Section 192 only)
 * [JWT] All data via localStorage
 */
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Info } from 'lucide-react';
import { toast } from 'sonner';
import { inr, exportCSV } from './reportUtils';
import type { TDSDeductionEntry } from '@/types/compliance';
import { tdsDeductionsKey } from '@/types/compliance';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

function ls<T>(key: string): T[] { try {
  // [JWT] GET /api/compliance/storage/:key
  const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch { return []; } }

interface Props { entityCode: string; }

export function Form24QPanel({ entityCode }: Props) {
  const [quarter, setQuarter] = useState<'Q1'|'Q2'|'Q3'|'Q4'>('Q1');
  const [ay, setAY] = useState('2026-27');

  // [JWT] GET /api/accounting/gst-entity-config
  const gstConfig = useMemo(() => { try { return JSON.parse(localStorage.getItem('erp_gst_entity_config') || '{}'); } catch { return {}; } }, []);

  // [JWT] GET /api/compliance/tds-deductions
  const entries = useMemo(() =>
    ls<TDSDeductionEntry>(tdsDeductionsKey(entityCode))
      .filter(e => e.tds_section === '192' && e.quarter === quarter && e.assessment_year === ay && e.status !== 'cancelled'),
  [entityCode, quarter, ay]);

  const totalSalaries = entries.reduce((s, e) => s + e.gross_amount, 0);
  const totalTDS = entries.reduce((s, e) => s + e.net_tds_amount, 0);

  const handleExport = () => {
    exportCSV('form-24q.csv',
      ['Name', 'PAN', 'Gross Salary', 'TDS Amount', 'Date', 'Challan'],
      entries.map(e => [e.party_name, e.party_pan, String(e.gross_amount), String(e.net_tds_amount), e.date, e.challan_id ?? '']));
    toast.success('Exported');
  };

  return (
    <div data-keyboard-form className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold">Form 24Q (Salary)</h2><p className="text-xs text-muted-foreground">Quarterly TDS Return — Section 192</p></div>
        <Button data-primary variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>

      <Alert className="border-blue-500/30 bg-blue-500/5">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-xs text-blue-700">Full Annexure II (salary break-up) requires Pay Hub integration.</AlertDescription>
      </Alert>

      {/* Part A — Deductor */}
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

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4"><p className="text-[10px] text-muted-foreground">Total Salaries</p><p className="text-lg font-bold">{inr(totalSalaries)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-[10px] text-muted-foreground">Total TDS Deducted</p><p className="text-lg font-bold">{inr(totalTDS)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-[10px] text-muted-foreground">Deductees</p><p className="text-lg font-bold">{entries.length}</p></CardContent></Card>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">Name</TableHead><TableHead className="text-xs">PAN</TableHead>
            <TableHead className="text-xs text-right">Gross Amount</TableHead><TableHead className="text-xs text-right">TDS Amount</TableHead>
            <TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Challan</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {entries.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">No Section 192 deductions for {quarter} {ay}</TableCell></TableRow>}
            {entries.map(e => (
              <TableRow key={e.id}>
                <TableCell className="text-xs">{e.party_name}</TableCell>
                <TableCell className="text-xs font-mono">{e.party_pan}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(e.gross_amount)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(e.net_tds_amount)}</TableCell>
                <TableCell className="text-xs">{e.date}</TableCell>
                <TableCell className="text-xs font-mono">{e.challan_id ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
export default function Form24Q() {
  const { entityCode } = useEntityCode();
  return entityCode
    ? <Form24QPanel entityCode={entityCode} />
    : <SelectCompanyGate title="Select a company to view Form 24Q" />;
}
