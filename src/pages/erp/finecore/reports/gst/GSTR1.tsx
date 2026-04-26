/**
 * GSTR1.tsx — GSTR-1 Return Panel
 * 9 sections as tabs. Month selector. JSON download.
 * [JWT] All data from useGSTRegister hook
 */
import { useState, useMemo } from 'react';
import { FileText, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useGSTRegister } from '@/hooks/useGSTRegister';
import { inr, fmtDate } from '../reportUtils';
import { buildGSTR1Payload, submitGSTR1 } from '@/lib/gst-portal-service';

interface GSTR1PanelProps { entityCode: string; }

export function GSTR1Panel({ entityCode }: GSTR1PanelProps) {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const period = `${year}-${month}`;

  const { entries, getGSTR1Data } = useGSTRegister(entityCode);
  const data = useMemo(() => getGSTR1Data(period), [getGSTR1Data, period]);

  // [JWT] GET /api/accounting/gst-entity-config
  const gstin = (() => { try { const c = JSON.parse(localStorage.getItem('erp_gst_entity_config') || '{}'); return c.gstin || ''; } catch { return ''; } })();

  const b2b = data.filter(e => e.supply_type === 'B2B' && e.base_voucher_type === 'Sales');
  const b2cl = data.filter(e => e.supply_type === 'B2C' && e.is_inter_state && e.invoice_value > 250000);
  const b2cs = data.filter(e => e.supply_type === 'B2C' && !(e.is_inter_state && e.invoice_value > 250000));
  const exp = data.filter(e => ['EXP_WP', 'EXP_WOP'].includes(e.supply_type));
  const sez = data.filter(e => ['SEZWP', 'SEZWOP'].includes(e.supply_type));
  const cdnr = data.filter(e => ['Credit Note', 'Debit Note'].includes(e.base_voucher_type) && e.supply_type === 'B2B');
  const cdnur = data.filter(e => ['Credit Note', 'Debit Note'].includes(e.base_voucher_type) && e.supply_type !== 'B2B');

  // HSN summary
  const hsnSummary = useMemo(() => {
    const map = new Map<string, { hsn: string; uqc: string; qty: number; txval: number; igst: number; cgst: number; sgst: number; cess: number }>();
    data.forEach(e => {
      if (!e.hsn_code) return;
      const key = `${e.hsn_code}-${e.uqc || 'NOS'}`;
      const ex = map.get(key) || { hsn: e.hsn_code, uqc: e.uqc || 'NOS', qty: 0, txval: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
      ex.qty += e.qty || 0; ex.txval += e.taxable_value;
      ex.igst += e.igst_amount; ex.cgst += e.cgst_amount; ex.sgst += e.sgst_amount; ex.cess += e.cess_amount;
      map.set(key, ex);
    });
    return Array.from(map.values());
  }, [data]);

  // B2B grouped by GSTIN
  const b2bGrouped = useMemo(() => {
    const map = new Map<string, typeof b2b>();
    b2b.forEach(e => {
      if (!map.has(e.party_gstin)) map.set(e.party_gstin, []);
      map.get(e.party_gstin)!.push(e);
    });
    return Array.from(map.entries());
  }, [b2b]);

  const totalTaxable = data.reduce((s, e) => s + e.taxable_value, 0);
  const totalTax = data.reduce((s, e) => s + e.total_tax, 0);

  // Validation
  const validate = () => {
    const issues: string[] = [];
    b2b.forEach(e => { if (!e.party_gstin) issues.push(`Missing GSTIN: ${e.voucher_no}`); });
    data.forEach(e => { if (!e.hsn_code) issues.push(`Missing HSN: ${e.voucher_no}`); });
    if (issues.length === 0) toast.success('Validation passed — no issues found');
    else toast.warning(`${issues.length} issue(s) found`, { description: issues.slice(0, 3).join(', ') });
  };

  const handleDownload = () => {
    if (!gstin) { toast.error('GSTIN not configured — set in GST Entity Config'); return; }
    const payload = buildGSTR1Payload(gstin, period, entries);
    submitGSTR1(payload, 'manual');
    toast.success('GSTR-1 JSON downloaded');
  };

  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const renderTable = (rows: typeof data) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead><TableHead>Voucher No</TableHead><TableHead>Party</TableHead>
          <TableHead>GSTIN</TableHead><TableHead>Place of Supply</TableHead>
          <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">IGST</TableHead>
          <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead>
          <TableHead className="text-right">Cess</TableHead><TableHead>RCM</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">No entries for this period</TableCell></TableRow>
        ) : rows.map(e => (
          <TableRow key={e.id}>
            <TableCell className="font-mono text-xs">{fmtDate(e.date)}</TableCell>
            <TableCell className="font-mono text-xs">{e.voucher_no}</TableCell>
            <TableCell className="text-xs">{e.party_name}</TableCell>
            <TableCell className="font-mono text-xs">{e.party_gstin || '-'}</TableCell>
            <TableCell className="text-xs">{e.place_of_supply}</TableCell>
            <TableCell className="text-right font-mono text-xs">{inr(e.taxable_value)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{inr(e.igst_amount)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{inr(e.cgst_amount)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{inr(e.sgst_amount)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{inr(e.cess_amount)}</TableCell>
            <TableCell>{e.is_rcm ? <Badge variant="outline" className="text-[10px]">RCM</Badge> : '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div data-keyboard-form className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-teal-500" /> GSTR-1 Return</h2>
          <p className="text-xs text-muted-foreground">Outward supplies — all sections</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-24 h-8 text-xs" ><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m, i) => <SelectItem key={m} value={m}>{monthNames[i]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-20 h-8 text-xs" ><SelectValue /></SelectTrigger>
            <SelectContent>{['2024', '2025', '2026', '2027'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={validate}><AlertTriangle className="h-3.5 w-3.5 mr-1" />Validate</Button>
          <Button size="sm" data-primary onClick={handleDownload}><Download className="h-3.5 w-3.5 mr-1" />Download JSON</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Invoices</p><p className="text-2xl font-bold">{data.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Taxable</p><p className="text-2xl font-bold font-mono">{inr(totalTaxable)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Tax</p><p className="text-2xl font-bold font-mono">{inr(totalTax)}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">GSTIN</p><p className="text-sm font-mono">{gstin || 'Not set'}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="b2b" className="space-y-3">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="b2b" className="text-xs">B2B ({b2b.length})</TabsTrigger>
          <TabsTrigger value="b2cl" className="text-xs">B2CL ({b2cl.length})</TabsTrigger>
          <TabsTrigger value="b2cs" className="text-xs">B2CS ({b2cs.length})</TabsTrigger>
          <TabsTrigger value="exp" className="text-xs">Exports ({exp.length})</TabsTrigger>
          <TabsTrigger value="sez" className="text-xs">SEZ ({sez.length})</TabsTrigger>
          <TabsTrigger value="cdnr" className="text-xs">CDNR ({cdnr.length})</TabsTrigger>
          <TabsTrigger value="cdnur" className="text-xs">CDNUR ({cdnur.length})</TabsTrigger>
          <TabsTrigger value="hsn" className="text-xs">HSN ({hsnSummary.length})</TabsTrigger>
          <TabsTrigger value="doc" className="text-xs">Doc Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="b2b">
          {b2bGrouped.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No B2B invoices</p>
          ) : b2bGrouped.map(([gstin, invoices]) => (
            <Collapsible key={gstin} className="border rounded-md mb-2">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-xs hover:bg-muted/50">
                <span className="font-mono font-semibold">{gstin}</span>
                <span className="text-muted-foreground">{invoices.length} invoice(s) — {inr(invoices.reduce((s, e) => s + e.taxable_value, 0))}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>{renderTable(invoices)}</CollapsibleContent>
            </Collapsible>
          ))}
        </TabsContent>
        <TabsContent value="b2cl">{renderTable(b2cl)}</TabsContent>
        <TabsContent value="b2cs">{renderTable(b2cs)}</TabsContent>
        <TabsContent value="exp">{renderTable(exp)}</TabsContent>
        <TabsContent value="sez">{renderTable(sez)}</TabsContent>
        <TabsContent value="cdnr">{renderTable(cdnr)}</TabsContent>
        <TabsContent value="cdnur">{renderTable(cdnur)}</TabsContent>

        <TabsContent value="hsn">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HSN/SAC</TableHead><TableHead>UQC</TableHead><TableHead className="text-right">Total Qty</TableHead>
                <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">IGST</TableHead>
                <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead><TableHead className="text-right">Cess</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hsnSummary.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No HSN data</TableCell></TableRow>
              ) : hsnSummary.map(h => (
                <TableRow key={`${h.hsn}-${h.uqc}`}>
                  <TableCell className="font-mono text-xs">{h.hsn}</TableCell>
                  <TableCell className="text-xs">{h.uqc}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{h.qty}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(h.txval)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(h.igst)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(h.cgst)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(h.sgst)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(h.cess)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="doc">
          <Card>
            <CardHeader><CardTitle className="text-sm">Document Issued Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Total Invoices Issued</span><span className="font-mono">{data.filter(e => e.base_voucher_type === 'Sales').length}</span></div>
              <div className="flex justify-between"><span>Cancelled</span><span className="font-mono">{entries.filter(e => e.is_cancelled && e.date.startsWith(period)).length}</span></div>
              <div className="flex justify-between"><span>Credit Notes</span><span className="font-mono">{data.filter(e => e.base_voucher_type === 'Credit Note').length}</span></div>
              <div className="flex justify-between"><span>Debit Notes</span><span className="font-mono">{data.filter(e => e.base_voucher_type === 'Debit Note').length}</span></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload guidance banner */}
      <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-teal-500" />
        After downloading, upload the JSON file at <span className="font-mono underline">https://return.gst.gov.in</span> → GSTR-1 → Upload.
      </div>
    </div>
  );
}

import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

export default function GSTR1() {
  const { entityCode } = useEntityCode();
  if (!entityCode) return <SelectCompanyGate title="Select a company to view GSTR-1" />;
  return <GSTR1Panel entityCode={entityCode} />;
}
