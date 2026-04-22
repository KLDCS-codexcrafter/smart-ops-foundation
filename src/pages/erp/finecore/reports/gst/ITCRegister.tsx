/**
 * ITCRegister.tsx — ITC Register Panel
 * Category tabs, running ITC balance, Mark ITC Reversed action.
 * [JWT] All data from useGSTRegister
 */
import { useState, useMemo, useCallback } from 'react';
import { Calculator, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useGSTRegister } from '@/hooks/useGSTRegister';
import { gstRegisterKey } from '@/lib/finecore-engine';
import { inr, fmtDate, exportCSV } from '../reportUtils';
import { onEnterNext } from '@/lib/keyboard';
import type { GSTEntry } from '@/types/voucher';

interface ITCRegisterPanelProps { entityCode: string; }

export function ITCRegisterPanel({ entityCode }: ITCRegisterPanelProps) {
  const now = new Date();
  const currentFY = now.getMonth() >= 3 ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}` : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`;
  const [fy, setFy] = useState(currentFY);
  const fyOptions = ['2023-24', '2024-25', '2025-26', '2026-27'];

  const { entries } = useGSTRegister(entityCode);

  const [startYear] = fy.split('-').map(s => parseInt(s.length === 2 ? `20${s}` : s));
  const fyStart = `${startYear}-04-01`;
  const fyEnd = `${startYear + 1}-03-31`;

  const itcEntries = useMemo(() =>
    entries.filter(e => !e.is_cancelled && e.date >= fyStart && e.date <= fyEnd && e.base_voucher_type === 'Purchase')
      .sort((a, b) => a.date.localeCompare(b.date))
  , [entries, fyStart, fyEnd]);

  const allITC = itcEntries.filter(e => e.itc_eligible);
  const otherITC = allITC.filter(e => !e.is_rcm);
  const rcmITC = allITC.filter(e => e.is_rcm);
  const blockedEntries = itcEntries.filter(e => !e.itc_eligible);

  const totalAvailable = allITC.reduce((s, e) => s + e.cgst_amount + e.sgst_amount + e.igst_amount, 0);
  const totalReversed = itcEntries.reduce((s, e) => s + (e.itc_reversal ?? 0), 0);
  const netITC = totalAvailable - totalReversed;

  // Mark ITC Reversed dialog
  const [reversalDialog, setReversalDialog] = useState<GSTEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalAmount, setReversalAmount] = useState(0);

  const handleReverse = useCallback(() => {
    if (!reversalDialog) return;
    try {
      // [JWT] PATCH /api/accounting/gst-register/:id
      const raw = localStorage.getItem(gstRegisterKey(entityCode));
      if (raw) {
        const all: GSTEntry[] = JSON.parse(raw);
        const idx = all.findIndex(e => e.id === reversalDialog.id);
        if (idx >= 0) {
          all[idx] = { ...all[idx], itc_reversal: reversalAmount };
          // [JWT] PATCH /api/accounting/gst-register/:id
          localStorage.setItem(gstRegisterKey(entityCode), JSON.stringify(all));
          toast.success(`ITC reversed: ${inr(reversalAmount)} — ${reversalReason}`);
        }
      }
    } catch { /* ignore */ }
    setReversalDialog(null);
    setReversalReason('');
    setReversalAmount(0);
  }, [reversalDialog, reversalAmount, reversalReason, entityCode]);

  const getEligibilityBadge = (e: GSTEntry) => {
    if ((e.itc_reversal ?? 0) > 0) return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[10px]">Reversed</Badge>;
    if (!e.itc_eligible) return <Badge className="bg-red-500/15 text-red-700 border-red-500/30 text-[10px]">Sec 17(5)</Badge>;
    if (e.is_rcm) return <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30 text-[10px]">RCM</Badge>;
    return <Badge className="bg-green-500/15 text-green-700 border-green-500/30 text-[10px]">Eligible</Badge>;
  };

  let runningBalance = 0;
  const renderTable = (rows: GSTEntry[]) => {
    runningBalance = 0;
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead><TableHead>Voucher No</TableHead><TableHead>Vendor</TableHead>
            <TableHead>GSTIN</TableHead><TableHead>HSN</TableHead>
            <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">IGST</TableHead>
            <TableHead className="text-right">CGST</TableHead><TableHead className="text-right">SGST</TableHead>
            <TableHead className="text-right">ITC Claimed</TableHead><TableHead className="text-right">Reversed</TableHead>
            <TableHead className="text-right">Net ITC</TableHead><TableHead className="text-right">Running</TableHead>
            <TableHead>Status</TableHead><TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={15} className="text-center text-muted-foreground py-8">No entries</TableCell></TableRow>
          ) : rows.map(e => {
            const claimed = e.itc_eligible ? e.cgst_amount + e.sgst_amount + e.igst_amount : 0;
            const reversed = e.itc_reversal ?? 0;
            const net = claimed - reversed;
            runningBalance += net;
            return (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{fmtDate(e.date)}</TableCell>
                <TableCell className="font-mono text-xs">{e.voucher_no}</TableCell>
                <TableCell className="text-xs">{e.party_name}</TableCell>
                <TableCell className="font-mono text-xs">{e.party_gstin || '-'}</TableCell>
                <TableCell className="font-mono text-xs">{e.hsn_code || '-'}</TableCell>
                <TableCell className="text-right font-mono text-xs">{inr(e.taxable_value)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{inr(e.igst_amount)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{inr(e.cgst_amount)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{inr(e.sgst_amount)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{inr(claimed)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{inr(reversed)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{inr(net)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{inr(runningBalance)}</TableCell>
                <TableCell>{getEligibilityBadge(e)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]" data-primary
                    onClick={() => { setReversalDialog(e); setReversalAmount(claimed); }}>
                    Reverse
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div data-keyboard-form className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Calculator className="h-5 w-5 text-teal-500" /> ITC Register</h2>
          <p className="text-xs text-muted-foreground">Input Tax Credit tracking with reversal management</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={fy} onValueChange={setFy}>
            <SelectTrigger className="w-28 h-8 text-xs" ><SelectValue /></SelectTrigger>
            <SelectContent>{fyOptions.map(f => <SelectItem key={f} value={f}>FY {f}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => exportCSV(`ITC_Register_${fy}.csv`,
            ['Date', 'Voucher', 'Vendor', 'GSTIN', 'Taxable', 'ITC', 'Reversed', 'Net'],
            itcEntries.map(e => [fmtDate(e.date), e.voucher_no, e.party_name, e.party_gstin,
              String(e.taxable_value), String(e.cgst_amount + e.sgst_amount + e.igst_amount), String(e.itc_reversal ?? 0),
              String(e.cgst_amount + e.sgst_amount + e.igst_amount - (e.itc_reversal ?? 0))]))}>
            <Download className="h-3.5 w-3.5 mr-1" />Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Total ITC Available</p><p className="text-lg font-bold font-mono">{inr(totalAvailable)}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Total Reversed</p><p className="text-lg font-bold font-mono">{inr(totalReversed)}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Net ITC</p><p className="text-lg font-bold font-mono">{inr(netITC)}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Entries</p><p className="text-lg font-bold">{itcEntries.length}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="all" className="space-y-3">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">All ITC ({allITC.length})</TabsTrigger>
          <TabsTrigger value="other" className="text-xs">Other ITC ({otherITC.length})</TabsTrigger>
          <TabsTrigger value="rcm" className="text-xs">RCM ITC ({rcmITC.length})</TabsTrigger>
          <TabsTrigger value="blocked" className="text-xs">Blocked ({blockedEntries.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderTable(allITC)}</TabsContent>
        <TabsContent value="other">{renderTable(otherITC)}</TabsContent>
        <TabsContent value="rcm">{renderTable(rcmITC)}</TabsContent>
        <TabsContent value="blocked">{renderTable(blockedEntries)}</TabsContent>
      </Tabs>

      {/* Reversal dialog */}
      <Dialog open={!!reversalDialog} onOpenChange={() => setReversalDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Mark ITC Reversed</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Reason</Label>
              <Select value={reversalReason} onValueChange={setReversalReason}>
                <SelectTrigger className="h-8 text-xs" ><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sec_17_5">Section 17(5) — Blocked Credit</SelectItem>
                  <SelectItem value="rule_42">Rule 42 — Common Credit Reversal</SelectItem>
                  <SelectItem value="rule_43">Rule 43 — Capital Goods Reversal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Amount to Reverse</Label>
              <Input type="number" className="h-8 text-xs font-mono" value={reversalAmount}
                onChange={e => setReversalAmount(parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReversalDialog(null)}>Cancel</Button>
            <Button size="sm" data-primary onClick={handleReverse} disabled={!reversalReason}>Confirm Reversal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

export default function ITCRegister() {
  const { entityCode } = useEntityCode();
  if (!entityCode) return <SelectCompanyGate title="Select a company to view ITC Register" />;
  return <ITCRegisterPanel entityCode={entityCode} />;
}
