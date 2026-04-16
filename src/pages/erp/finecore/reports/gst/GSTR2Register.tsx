/**
 * GSTR2Register.tsx — GSTR-2 Purchase Register Panel
 * Inward supply register with Invoice-wise and HSN-wise views.
 * [JWT] All data from useGSTRegister
 */
import { useState, useMemo, useEffect } from 'react';
import { ShoppingCart, Download, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGSTRegister } from '@/hooks/useGSTRegister';
import { inr, fmtDate, exportCSV } from '../reportUtils';
import { onEnterNext } from '@/lib/keyboard';

interface GSTR2RegisterPanelProps { entityCode: string; }

export function GSTR2RegisterPanel({ entityCode }: GSTR2RegisterPanelProps) {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [partyFilter, setPartyFilter] = useState('');
  const period = `${year}-${month}`;

  const { entries } = useGSTRegister(entityCode);
  const purchases = useMemo(() =>
    entries.filter(e => !e.is_cancelled && e.date.startsWith(period) && e.base_voucher_type === 'Purchase')
      .filter(e => !partyFilter || e.party_name.toLowerCase().includes(partyFilter.toLowerCase()))
  , [entries, period, partyFilter]);

  // Alt+L shortcut for party filter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'l') {
        e.preventDefault();
        document.getElementById('gstr2-party-filter')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const eligible = purchases.filter(e => e.itc_eligible && !e.is_rcm);
  const blocked = purchases.filter(e => !e.itc_eligible);
  const rcm = purchases.filter(e => e.is_rcm);

  // HSN summary
  const hsnSummary = useMemo(() => {
    const map = new Map<string, { hsn: string; uqc: string; qty: number; txval: number; igst: number; cgst: number; sgst: number; cess: number }>();
    purchases.forEach(e => {
      if (!e.hsn_code) return;
      const key = `${e.hsn_code}-${e.uqc || 'NOS'}`;
      const ex = map.get(key) || { hsn: e.hsn_code, uqc: e.uqc || 'NOS', qty: 0, txval: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
      ex.qty += e.qty || 0; ex.txval += e.taxable_value;
      ex.igst += e.igst_amount; ex.cgst += e.cgst_amount; ex.sgst += e.sgst_amount; ex.cess += e.cess_amount;
      map.set(key, ex);
    });
    return Array.from(map.values());
  }, [purchases]);

  const totalTaxable = purchases.reduce((s, e) => s + e.taxable_value, 0);
  const totalIGST = purchases.reduce((s, e) => s + e.igst_amount, 0);
  const totalCGST = purchases.reduce((s, e) => s + e.cgst_amount, 0);
  const totalSGST = purchases.reduce((s, e) => s + e.sgst_amount, 0);
  const totalITC = eligible.reduce((s, e) => s + e.cgst_amount + e.sgst_amount + e.igst_amount, 0);
  const blockedITC = blocked.reduce((s, e) => s + e.cgst_amount + e.sgst_amount + e.igst_amount, 0);
  const rcmTotal = rcm.reduce((s, e) => s + e.taxable_value, 0);

  const handleExport = () => {
    exportCSV(`GSTR2_${period}.csv`,
      ['Date', 'Voucher No', 'Vendor', 'GSTIN', 'HSN', 'Taxable', 'IGST', 'CGST', 'SGST', 'Cess', 'ITC', 'RCM'],
      purchases.map(e => [fmtDate(e.date), e.voucher_no, e.party_name, e.party_gstin, e.hsn_code,
        String(e.taxable_value), String(e.igst_amount), String(e.cgst_amount), String(e.sgst_amount), String(e.cess_amount),
        e.itc_eligible ? 'Y' : 'N', e.is_rcm ? 'Y' : 'N'])
    );
  };

  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const renderInvoiceTable = (rows: typeof purchases) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead><TableHead>Voucher No</TableHead><TableHead>Vendor</TableHead>
          <TableHead>GSTIN</TableHead><TableHead>HSN</TableHead><TableHead>Place of Supply</TableHead>
          <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">IGST</TableHead>
          <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead>
          <TableHead className="text-right">Cess</TableHead><TableHead>ITC</TableHead><TableHead>RCM</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">No entries</TableCell></TableRow>
        ) : rows.map(e => (
          <TableRow key={e.id}>
            <TableCell className="font-mono text-xs">{fmtDate(e.date)}</TableCell>
            <TableCell className="font-mono text-xs">{e.voucher_no}</TableCell>
            <TableCell className="text-xs">{e.party_name}</TableCell>
            <TableCell className="font-mono text-xs">{e.party_gstin || '-'}</TableCell>
            <TableCell className="font-mono text-xs">{e.hsn_code || '-'}</TableCell>
            <TableCell className="text-xs">{e.place_of_supply}</TableCell>
            <TableCell className="text-right font-mono text-xs">{inr(e.taxable_value)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{inr(e.igst_amount)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{inr(e.cgst_amount)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{inr(e.sgst_amount)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{inr(e.cess_amount)}</TableCell>
            <TableCell>{e.itc_eligible ? <Badge className="bg-green-500/15 text-green-700 border-green-500/30 text-[10px]">Eligible</Badge> : <Badge variant="outline" className="text-[10px]">No</Badge>}</TableCell>
            <TableCell>{e.is_rcm ? <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30 text-[10px]">RCM</Badge> : '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div data-keyboard-form className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-teal-500" /> GSTR-2 Purchase Register</h2>
          <p className="text-xs text-muted-foreground">Inward supply register — invoice-wise and HSN-wise</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2 top-2 text-muted-foreground" />
            <Input id="gstr2-party-filter" placeholder="Party (Alt+L)" className="pl-7 h-8 w-40 text-xs"
              value={partyFilter} onChange={e => setPartyFilter(e.target.value)} onKeyDown={onEnterNext} />
          </div>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-24 h-8 text-xs" ><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m, i) => <SelectItem key={m} value={m}>{monthNames[i]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-20 h-8 text-xs" ><SelectValue /></SelectTrigger>
            <SelectContent>{['2024', '2025', '2026', '2027'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-3.5 w-3.5 mr-1" />Export CSV</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 text-xs">
        <Card><CardContent className="pt-3"><p className="text-muted-foreground">Total Taxable</p><p className="text-lg font-bold font-mono">{inr(totalTaxable)}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-muted-foreground">Total ITC</p><p className="text-lg font-bold font-mono">{inr(totalITC)}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-muted-foreground">Blocked ITC</p><p className="text-lg font-bold font-mono">{inr(blockedITC)}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-muted-foreground">RCM</p><p className="text-lg font-bold font-mono">{inr(rcmTotal)}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="all" className="space-y-3">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">All Purchases ({purchases.length})</TabsTrigger>
          <TabsTrigger value="eligible" className="text-xs">Eligible ITC ({eligible.length})</TabsTrigger>
          <TabsTrigger value="blocked" className="text-xs">Blocked 17(5) ({blocked.length})</TabsTrigger>
          <TabsTrigger value="rcm" className="text-xs">RCM ({rcm.length})</TabsTrigger>
          <TabsTrigger value="hsn" className="text-xs">HSN-wise ({hsnSummary.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderInvoiceTable(purchases)}</TabsContent>
        <TabsContent value="eligible">{renderInvoiceTable(eligible)}</TabsContent>
        <TabsContent value="blocked">{renderInvoiceTable(blocked)}</TabsContent>
        <TabsContent value="rcm">{renderInvoiceTable(rcm)}</TabsContent>
        <TabsContent value="hsn">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>HSN/SAC</TableHead><TableHead>UQC</TableHead><TableHead className="text-right">Qty</TableHead>
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
      </Tabs>

      {/* Footer totals */}
      <div className="flex gap-4 text-xs p-3 bg-muted/30 rounded-md font-mono">
        <span>Taxable: {inr(totalTaxable)}</span>
        <span>IGST: {inr(totalIGST)}</span>
        <span>CGST: {inr(totalCGST)}</span>
        <span>SGST: {inr(totalSGST)}</span>
        <span>ITC: {inr(totalITC)}</span>
        <span>Blocked: {inr(blockedITC)}</span>
        <span>RCM: {inr(rcmTotal)}</span>
      </div>
    </div>
  );
}

export default function GSTR2Register() { return <GSTR2RegisterPanel entityCode="SMRT" />; }
