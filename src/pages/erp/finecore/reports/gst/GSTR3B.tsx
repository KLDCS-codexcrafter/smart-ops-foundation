/**
 * GSTR3B.tsx — GSTR-3B Monthly Summary Return
 * Tables 3.1 through 6.3. TaxDiff validation.
 * [JWT] All data from useGSTRegister
 */
import { useState, useMemo } from 'react';
import { FileText, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useGSTRegister } from '@/hooks/useGSTRegister';
import { inr } from '../reportUtils';
import { buildGSTR3BPayload, submitGSTR3B } from '@/lib/gstPortalService';
import { onEnterNext } from '@/lib/keyboard';

interface GSTR3BPanelProps { entityCode: string; }

export function GSTR3BPanel({ entityCode }: GSTR3BPanelProps) {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const period = `${year}-${month}`;

  const { entries } = useGSTRegister(entityCode);
  const active = useMemo(() => entries.filter(e => !e.is_cancelled && e.date.startsWith(period)), [entries, period]);

  // [JWT] GET /api/accounting/gst-entity-config
  const gstin = (() => { try { const c = JSON.parse(localStorage.getItem('erp_gst_entity_config') || '{}'); return c.gstin || ''; } catch { return ''; } })();
  const qrmpEnrolled = (() => { try { const c = JSON.parse(localStorage.getItem('erp_gst_entity_config') || '{}'); return c.qrmpEnrolled || false; } catch { return false; } })();

  // 3.1 computations
  const outTaxable = active.filter(e => ['Sales', 'Credit Note', 'Debit Note'].includes(e.base_voucher_type) && ['B2B', 'B2C'].includes(e.supply_type));
  const zeroRated = active.filter(e => ['EXP_WP', 'EXP_WOP', 'SEZWP', 'SEZWOP'].includes(e.supply_type));
  const rcmEntries = active.filter(e => e.is_rcm && e.base_voucher_type === 'Purchase');
  const exemptEntries = active.filter(e => ['Sales', 'Credit Note', 'Debit Note'].includes(e.base_voucher_type) && !['B2B', 'B2C'].includes(e.supply_type) && !['EXP_WP', 'EXP_WOP', 'SEZWP', 'SEZWOP'].includes(e.supply_type));

  // 4A computations
  const itcDomestic = active.filter(e => e.base_voucher_type === 'Purchase' && e.itc_eligible && !e.is_rcm);
  const itcRCM = active.filter(e => e.is_rcm && e.itc_eligible);
  const itcReversed = active.filter(e => (e.itc_reversal ?? 0) > 0);

  const sum = (arr: typeof active) => ({
    txval: arr.reduce((s, e) => s + e.taxable_value, 0),
    igst: arr.reduce((s, e) => s + e.igst_amount, 0),
    cgst: arr.reduce((s, e) => s + e.cgst_amount, 0),
    sgst: arr.reduce((s, e) => s + e.sgst_amount, 0),
    cess: arr.reduce((s, e) => s + e.cess_amount, 0),
  });

  const s31a = sum(outTaxable);
  const s31b = sum(zeroRated);
  const s31c = sum(rcmEntries);
  const s31d = sum(exemptEntries);
  const s4a5 = sum(itcDomestic);
  const s4a3 = sum(itcRCM);
  const s4b = { igst: itcReversed.reduce((s, e) => s + (e.itc_reversal ?? 0), 0), cgst: 0, sgst: 0, cess: 0 };

  const totalITC = { igst: s4a5.igst + s4a3.igst, cgst: s4a5.cgst + s4a3.cgst, sgst: s4a5.sgst + s4a3.sgst, cess: s4a5.cess + s4a3.cess };
  const netITC = { igst: totalITC.igst - s4b.igst, cgst: totalITC.cgst - s4b.cgst, sgst: totalITC.sgst - s4b.sgst, cess: totalITC.cess - s4b.cess };

  // 6.1-6.3
  const taxPayable = { igst: s31a.igst + s31c.igst, cgst: s31a.cgst + s31c.cgst, sgst: s31a.sgst + s31c.sgst, cess: s31a.cess + s31c.cess };
  const paidITC = { igst: Math.min(netITC.igst, taxPayable.igst), cgst: Math.min(netITC.cgst, taxPayable.cgst), sgst: Math.min(netITC.sgst, taxPayable.sgst), cess: Math.min(netITC.cess, taxPayable.cess) };
  const cashPay = { igst: taxPayable.igst - paidITC.igst, cgst: taxPayable.cgst - paidITC.cgst, sgst: taxPayable.sgst - paidITC.sgst, cess: taxPayable.cess - paidITC.cess };

  // TaxDiff — compare books vs return
  const booksTax = s31a.igst + s31a.cgst + s31a.sgst + s31a.cess;
  const returnTax = taxPayable.igst + taxPayable.cgst + taxPayable.sgst + taxPayable.cess;
  const diff = Math.abs(booksTax - returnTax);
  const balanced = diff <= 1;

  const handleDownload = () => {
    if (!gstin) { toast.error('GSTIN not configured'); return; }
    const payload = buildGSTR3BPayload(gstin, period, entries);
    submitGSTR3B(payload, 'manual');
    toast.success('GSTR-3B JSON downloaded');
  };

  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const renderRow = (label: string, section: string, vals: { txval?: number; igst: number; cgst: number; sgst: number; cess: number }, highlight?: boolean) => (
    <TableRow key={section} className={highlight ? 'bg-muted/30 font-semibold' : ''}>
      <TableCell className="text-xs">{section}</TableCell>
      <TableCell className="text-xs">{label}</TableCell>
      {vals.txval !== undefined && <TableCell className="text-right font-mono text-xs">{inr(vals.txval)}</TableCell>}
      {vals.txval === undefined && <TableCell />}
      <TableCell className="text-right font-mono text-xs">{inr(vals.igst)}</TableCell>
      <TableCell className="text-right font-mono text-xs">{inr(vals.cgst)}</TableCell>
      <TableCell className="text-right font-mono text-xs">{inr(vals.sgst)}</TableCell>
      <TableCell className="text-right font-mono text-xs">{inr(vals.cess)}</TableCell>
    </TableRow>
  );

  return (
    <div data-keyboard-form className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-teal-500" /> GSTR-3B</h2>
          <p className="text-xs text-muted-foreground">Monthly summary return</p>
        </div>
        <div className="flex items-center gap-2">
          {qrmpEnrolled && <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30 text-[10px]">QRMP Scheme</Badge>}
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-24 h-8 text-xs" onKeyDown={onEnterNext}><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m, i) => <SelectItem key={m} value={m}>{monthNames[i]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-20 h-8 text-xs" onKeyDown={onEnterNext}><SelectValue /></SelectTrigger>
            <SelectContent>{['2024', '2025', '2026', '2027'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" data-primary onClick={handleDownload}><Download className="h-3.5 w-3.5 mr-1" />Download JSON</Button>
        </div>
      </div>

      {/* Outward + ITC tables */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold mb-2">Table 3.1 — Outward Supplies</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Section</TableHead><TableHead>Description</TableHead>
                  <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">IGST</TableHead>
                  <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">Cess</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderRow('Outward taxable supplies', '3.1(a)', s31a)}
                {renderRow('Zero-rated (exports/SEZ)', '3.1(b)', s31b)}
                {renderRow('Supplies attracting RCM', '3.1(c)', s31c)}
                {renderRow('Exempt + nil-rated + non-GST', '3.1(d)', s31d)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold mb-2">Table 4 — ITC</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Section</TableHead><TableHead>Description</TableHead>
                  <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">IGST</TableHead>
                  <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">Cess</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderRow('All other ITC (domestic)', '4A(5)', s4a5)}
                {renderRow('ITC on inward RCM', '4A(3)', s4a3)}
                {renderRow('ITC reversed', '4B', { txval: 0, ...s4b })}
                {renderRow('Net ITC available', '4C', { txval: 0, ...netITC }, true)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold mb-2">Table 6 — Payment</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Section</TableHead><TableHead>Description</TableHead>
                  <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">IGST</TableHead>
                  <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">Cess</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderRow('Tax payable', '6.1', { txval: 0, ...taxPayable }, true)}
                {renderRow('Paid through ITC', '6.2', { txval: 0, ...paidITC })}
                {renderRow('Paid in cash', '6.3', { txval: 0, ...cashPay })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* TaxDiff validation */}
      <div className={`flex items-center gap-2 p-3 rounded-md text-xs ${balanced ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700'}`}>
        {balanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        {balanced ? 'Balanced — books and return match within ₹1 tolerance' : `${inr(diff)} difference — check tax ledger postings`}
      </div>
    </div>
  );
}

export default function GSTR3B() { return <GSTR3BPanel entityCode="SMRT" />; }
