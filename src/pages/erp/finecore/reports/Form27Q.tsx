/**
 * Form27Q.tsx — Form 27Q (NRI TDS Payments)
 * [JWT] All data via localStorage
 */
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { inr, exportCSV } from './reportUtils';
import { onEnterNext } from '@/lib/keyboard';
import type { TDSDeductionEntry } from '@/types/compliance';
import { tdsDeductionsKey } from '@/types/compliance';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

function ls<T>(key: string): T[] { try {
  // [JWT] GET /api/compliance/storage/:key
  const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch { return []; } }

const NRI_SECTIONS = ['195', '196A', '196B', '196C', '196D'];

interface Props { entityCode: string; }

export function Form27QPanel({ entityCode }: Props) {
  const [quarter, setQuarter] = useState<'Q1'|'Q2'|'Q3'|'Q4'>('Q1');
  const [ay, setAY] = useState('2026-27');

  // [JWT] GET /api/accounting/gst-entity-config
  const gstConfig = useMemo(() => { try { return JSON.parse(localStorage.getItem('erp_gst_entity_config') || '{}'); } catch { return {}; } }, []);

  // [JWT] GET /api/compliance/tds-deductions — NRI deductions
  const entries = useMemo(() =>
    ls<TDSDeductionEntry>(tdsDeductionsKey(entityCode))
      .filter(e => NRI_SECTIONS.includes(e.tds_section)
        && e.quarter === quarter && e.assessment_year === ay && e.status !== 'cancelled'),
  [entityCode, quarter, ay]);

  const totalTDS = entries.reduce((s, e) => s + e.net_tds_amount, 0);

  const handleExport = () => {
    exportCSV('form-27q.csv',
      ['PAN', 'Name', 'Section', 'Nature', 'Amount Paid', 'TDS Amount', 'DTAA Rate', 'Date'],
      entries.map(e => [e.party_pan, e.party_name, e.tds_section, e.nature_of_payment,
        String(e.gross_amount), String(e.net_tds_amount), '', e.date]));
    toast.success('Exported');
  };

  return (
    <div data-keyboard-form className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <div><h2 className="text-xl font-bold">Form 27Q (NRI)</h2><p className="text-xs text-muted-foreground">TDS on payments to non-residents</p></div>
        </div>
        <Button data-primary variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>

      <Card><CardContent className="pt-4 space-y-2">
        <p className="text-xs font-semibold">Part A — Deductor Details</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div><span className="text-muted-foreground">TAN:</span> <span className="font-mono">{gstConfig.tan_number || 'Not set'}</span></div>
          <div><span className="text-muted-foreground">Name:</span> {gstConfig.entityName || '4DSmartOps Pvt Ltd'}</div>
          <div className="flex gap-2">
            <Select value={quarter} onValueChange={v => setQuarter(v as any)}>
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

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">PAN</TableHead><TableHead className="text-xs">Name</TableHead>
            <TableHead className="text-xs">Section</TableHead><TableHead className="text-xs">Nature of Remittance</TableHead>
            <TableHead className="text-xs text-right">Amount Paid</TableHead>
            <TableHead className="text-xs text-right">TDS Rate</TableHead>
            <TableHead className="text-xs text-right">TDS Amount</TableHead>
            <TableHead className="text-xs">DTAA Rate</TableHead>
            <TableHead className="text-xs">Date</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {entries.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">No NRI deductions for {quarter} {ay}</TableCell></TableRow>}
            {entries.map(e => (
              <TableRow key={e.id}>
                <TableCell className="text-xs font-mono">{e.party_pan}</TableCell>
                <TableCell className="text-xs">{e.party_name}</TableCell>
                <TableCell className="text-xs">{e.tds_section}</TableCell>
                <TableCell className="text-xs">{e.nature_of_payment}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(e.gross_amount)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{e.tds_rate}%</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(e.net_tds_amount)}</TableCell>
                <TableCell>
                  <Input className="h-6 text-xs w-16" placeholder="%" onKeyDown={onEnterNext} />
                </TableCell>
                <TableCell className="text-xs">{e.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card><CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">Total NRI TDS for {quarter}: <span className="font-bold text-foreground">{inr(totalTDS)}</span> across {entries.length} deductee(s)</p>
      </CardContent></Card>
    </div>
  );
}
export default function Form27Q() {
  const { entityCode } = useEntityCode();
  return entityCode
    ? <Form27QPanel entityCode={entityCode} />
    : <SelectCompanyGate title="Select a company to view Form 27Q" />;
}
