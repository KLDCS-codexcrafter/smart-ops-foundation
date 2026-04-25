/**
 * RecoPanel.tsx — 2A/2B Reconciliation Panel
 * Upload portal JSON, fuzzy matching, 4 match states.
 * [JWT] Book data from useGSTRegister. Portal data from uploaded file.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowLeftRight, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useGSTRegister } from '@/hooks/useGSTRegister';
import { parse2AFile } from '@/lib/gstPortalService';
import { inr, fmtDate } from '../reportUtils';
import type { GSTEntry } from '@/types/voucher';

interface RecoPanelGSTProps { entityCode: string; }

type MatchStatus = 'matched' | 'not_in_tally' | 'not_in_portal' | 'partial';

interface PortalInvoice {
  gstin: string; inum: string; idt: string; val: number;
  txval: number; igst: number; cgst: number; sgst: number; cess: number;
}

interface RecoRow {
  bookEntry?: GSTEntry;
  portalEntry?: PortalInvoice;
  status: MatchStatus;
  amountDiff: number;
  taxDiff: number;
}

function normalize(s: string): string { return s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(); }

export function RecoPanelGST({ entityCode }: RecoPanelGSTProps) {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const period = `${year}-${month}`;

  const [mode2B, setMode2B] = useState(false);
  const [fuzzyMatch, setFuzzyMatch] = useState(true);
  const [portalData, setPortalData] = useState<PortalInvoice[]>([]);
  const [filters, setFilters] = useState({ matched: true, not_in_tally: true, not_in_portal: true, partial: true });

  const { entries } = useGSTRegister(entityCode);
  const bookPurchases = useMemo(() =>
    entries.filter(e => !e.is_cancelled && e.date.startsWith(period) && e.base_voucher_type === 'Purchase')
  , [entries, period]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      if (e.key === '1') { e.preventDefault(); setFilters(f => ({ ...f, matched: !f.matched })); }
      if (e.key === '2') { e.preventDefault(); setFilters(f => ({ ...f, not_in_tally: !f.not_in_tally })); }
      if (e.key === '3') { e.preventDefault(); setFilters(f => ({ ...f, not_in_portal: !f.not_in_portal })); }
      if (e.key === '4') { e.preventDefault(); setFilters(f => ({ ...f, partial: !f.partial })); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parse2AFile(file);
      const invoices: PortalInvoice[] = [];
      // Parse b2b section
      if (data.b2b) {
        for (const party of data.b2b) {
          for (const inv of (party.inv || [])) {
            const itm = inv.itms?.[0]?.itm_det || {};
            invoices.push({
              gstin: party.ctin, inum: inv.inum, idt: inv.idt, val: inv.val,
              txval: itm.txval || 0, igst: itm.igst || 0, cgst: itm.cgst || 0, sgst: itm.sgst || 0, cess: itm.cess || 0,
            });
          }
        }
      }
      // Parse cdnr
      if (data.cdnr) {
        for (const party of data.cdnr) {
          for (const nt of (party.nt || [])) {
            const itm = nt.itms?.[0]?.itm_det || {};
            invoices.push({
              gstin: party.ctin, inum: nt.nt_num, idt: nt.nt_dt, val: nt.val,
              txval: itm.txval || 0, igst: itm.igst || 0, cgst: itm.cgst || 0, sgst: itm.sgst || 0, cess: itm.cess || 0,
            });
          }
        }
      }
      setPortalData(invoices);
      toast.success(`${invoices.length} portal invoices loaded`);
    } catch {
      toast.error('Failed to parse file — ensure valid GSTN JSON format');
    }
  }, []);

  // Reconciliation
  const recoRows = useMemo((): RecoRow[] => {
    const rows: RecoRow[] = [];
    const matchedPortal = new Set<number>();

    for (const book of bookPurchases) {
      const bookNo = fuzzyMatch ? normalize(book.voucher_no) : book.voucher_no;
      let matched = false;
      for (let i = 0; i < portalData.length; i++) {
        if (matchedPortal.has(i)) continue;
        const portal = portalData[i];
        const portalNo = fuzzyMatch ? normalize(portal.inum) : portal.inum;
        if (bookNo === portalNo || (book.party_gstin === portal.gstin && Math.abs(book.taxable_value - portal.txval) < 1)) {
          const amountDiff = book.taxable_value - portal.txval;
          const taxDiff = (book.cgst_amount + book.sgst_amount + book.igst_amount) - (portal.cgst + portal.sgst + portal.igst);
          const isExact = Math.abs(amountDiff) < 1 && Math.abs(taxDiff) < 1;
          rows.push({ bookEntry: book, portalEntry: portal, status: isExact ? 'matched' : 'partial', amountDiff, taxDiff });
          matchedPortal.add(i);
          matched = true;
          break;
        }
      }
      if (!matched) rows.push({ bookEntry: book, status: 'not_in_portal', amountDiff: 0, taxDiff: 0 });
    }

    portalData.forEach((p, i) => {
      if (!matchedPortal.has(i)) rows.push({ portalEntry: p, status: 'not_in_tally', amountDiff: 0, taxDiff: 0 });
    });

    return rows;
  }, [bookPurchases, portalData, fuzzyMatch]);

  const filteredRows = recoRows.filter(r => filters[r.status]);
  const matchedITC = recoRows.filter(r => r.status === 'matched').reduce((s, r) => s + (r.bookEntry?.cgst_amount || 0) + (r.bookEntry?.sgst_amount || 0) + (r.bookEntry?.igst_amount || 0), 0);
  const portalITC = portalData.reduce((s, p) => s + p.cgst + p.sgst + p.igst, 0);
  const unmatchedITC = recoRows.filter(r => r.status === 'not_in_tally').reduce((s, r) => s + (r.portalEntry?.cgst || 0) + (r.portalEntry?.sgst || 0) + (r.portalEntry?.igst || 0), 0);

  const statusBadge = (status: MatchStatus) => {
    const styles: Record<MatchStatus, string> = {
      matched: 'bg-green-500/15 text-green-700 border-green-500/30',
      not_in_tally: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
      not_in_portal: 'bg-red-500/15 text-red-700 border-red-500/30',
      partial: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
    };
    const labels: Record<MatchStatus, string> = { matched: 'Matched', not_in_tally: 'Not In Tally', not_in_portal: 'Not In Portal', partial: 'Partial' };
    return <Badge className={`${styles[status]} text-[10px]`}>{labels[status]}</Badge>;
  };

  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div data-keyboard-form className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><ArrowLeftRight className="h-5 w-5 text-teal-500" /> {mode2B ? '2B' : '2A'} Reconciliation</h2>
          <p className="text-xs text-muted-foreground">Reconcile purchase invoices against GSTN portal data</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">2A</Label>
            <Switch checked={mode2B} onCheckedChange={setMode2B} />
            <Label className="text-xs">2B</Label>
          </div>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-24 h-8 text-xs" ><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m, i) => <SelectItem key={m} value={m}>{monthNames[i]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-20 h-8 text-xs" ><SelectValue /></SelectTrigger>
            <SelectContent>{['2024', '2025', '2026', '2027'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* Upload */}
      <div className="flex items-center gap-4 p-3 border rounded-md bg-muted/20">
        <Upload className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1">
          <Label className="text-xs font-semibold">Upload {mode2B ? '2B' : '2A'} JSON from GSTN portal</Label>
          <Input type="file" accept=".json,.zip" className="h-8 text-xs mt-1" onChange={handleFileUpload} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={fuzzyMatch} onCheckedChange={setFuzzyMatch} />
          <Label className="text-xs">Fuzzy Match</Label>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Portal ITC</p><p className="text-lg font-bold font-mono">{inr(portalITC)}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Matched ITC</p><p className="text-lg font-bold font-mono">{inr(matchedITC)}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Unmatched (Not In Tally)</p><p className="text-lg font-bold font-mono">{inr(unmatchedITC)}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Book Entries</p><p className="text-lg font-bold">{bookPurchases.length}</p></CardContent></Card>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {(['matched', 'not_in_tally', 'not_in_portal', 'partial'] as MatchStatus[]).map(s => (
          <Button key={s} variant={filters[s] ? 'default' : 'outline'} size="sm" className="text-xs h-7"
            onClick={() => setFilters(f => ({ ...f, [s]: !f[s] }))}>
            {s === 'matched' ? 'Matched (Ctrl+1)' : s === 'not_in_tally' ? 'Not In Tally (Ctrl+2)' :
              s === 'not_in_portal' ? 'Not In Portal (Ctrl+3)' : 'Partial (Ctrl+4)'}
          </Button>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead><TableHead>GSTIN</TableHead>
            <TableHead>Invoice (Books)</TableHead><TableHead>Invoice (Portal)</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Taxable (Books)</TableHead><TableHead className="text-right">Taxable (Portal)</TableHead>
            <TableHead className="text-right">Tax (Books)</TableHead><TableHead className="text-right">Tax (Portal)</TableHead>
            <TableHead className="text-right">Amt Diff</TableHead><TableHead className="text-right">Tax Diff</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.length === 0 ? (
            <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">
              {portalData.length === 0 ? 'Upload portal JSON to begin reconciliation' : 'No entries match filters'}
            </TableCell></TableRow>
          ) : filteredRows.map((r, i) => (
            <TableRow key={`reco-${i}`} className={r.status === 'matched' ? 'bg-green-500/5' : ''}>
              <TableCell className="text-xs">{r.bookEntry?.party_name || '-'}</TableCell>
              <TableCell className="font-mono text-xs">{r.bookEntry?.party_gstin || r.portalEntry?.gstin || '-'}</TableCell>
              <TableCell className="font-mono text-xs">{r.bookEntry?.voucher_no || '-'}</TableCell>
              <TableCell className="font-mono text-xs">{r.portalEntry?.inum || '-'}</TableCell>
              <TableCell className="font-mono text-xs">{r.bookEntry ? fmtDate(r.bookEntry.date) : r.portalEntry?.idt || '-'}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.bookEntry ? inr(r.bookEntry.taxable_value) : '-'}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.portalEntry ? inr(r.portalEntry.txval) : '-'}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.bookEntry ? inr(r.bookEntry.cgst_amount + r.bookEntry.sgst_amount + r.bookEntry.igst_amount) : '-'}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.portalEntry ? inr(r.portalEntry.cgst + r.portalEntry.sgst + r.portalEntry.igst) : '-'}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.amountDiff !== 0 ? inr(r.amountDiff) : '-'}</TableCell>
              <TableCell className="text-right font-mono text-xs">{r.taxDiff !== 0 ? inr(r.taxDiff) : '-'}</TableCell>
              <TableCell>{statusBadge(r.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

export default function RecoPanel() {
  const { entityCode } = useEntityCode();
  if (!entityCode) return <SelectCompanyGate title="Select a company to view GST Reconciliation" />;
  return <RecoPanelGST entityCode={entityCode} />;
}
