/**
 * Form26AS.tsx — Form 26AS TDS Receivable Reconciliation
 * Sprint 3C: TRACES 26AS text import, 5-state reconciliation, auto-JV, merge bills, letter generator
 * [JWT] All data via localStorage
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, ChevronDown, ChevronUp, Download, Link, Mail, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { inr, exportCSV } from './reportUtils';
import { parse26ASTextFile, type TRACES26ASRow } from '@/lib/gstPortalService';
import type { TDSReceivableEntry } from '@/types/compliance';
import { tdsReceivableKey } from '@/types/compliance';
import { postVoucher, generateVoucherNo } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';

function ls<T>(key: string): T[] { try {
  // [JWT] GET /api/compliance/tds-receivable/:key
  const r = localStorage.getItem(key); return r ? JSON.parse(r) : []; } catch { return []; } }

function ss<T>(key: string, d: T[]): void {
  // [JWT] POST /api/compliance/tds-receivable/:key
  localStorage.setItem(key, JSON.stringify(d));
}

type MatchStatus = TDSReceivableEntry['match_status'];

const MATCH_LABELS: Record<MatchStatus, string> = {
  matched: 'Matched', partially_matched: 'Partially Matched',
  not_in_portal: 'Not In 26AS', not_in_tally: 'Not In Tally',
  unmatched: 'Unmatched',
};

const MATCH_BADGE_CLASS: Record<MatchStatus, string> = {
  matched: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  partially_matched: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  not_in_portal: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  not_in_tally: 'bg-red-500/15 text-red-700 border-red-500/30',
  unmatched: 'bg-muted text-muted-foreground border-border',
};

interface PartySummary {
  tan: string; name: string;
  tallyAmount: number; tallyTds: number;
  portalAmount: number; portalTds: number;
  tallyEntries: TDSReceivableEntry[];
  portalEntries: TRACES26ASRow[];
}

interface Props { entityCode: string; }

export function Form26ASPanel({ entityCode }: Props) {
  const [periodFrom, setPeriodFrom] = useState(() => {
    const now = new Date(); const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${fy}-04-01`;
  });
  const [periodTo, setPeriodTo] = useState(new Date().toISOString().split('T')[0]);
  const [portalRows, setPortalRows] = useState<TRACES26ASRow[]>([]);
  const [expandedTAN, setExpandedTAN] = useState<string | null>(null);
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [filterStatus, setFilterStatus] = useState<MatchStatus | 'all'>('all');
  const [selectedNIT, setSelectedNIT] = useState<Set<string>>(new Set());
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeTally, setMergeTally] = useState<string | null>(null);
  const [mergePortal, setMergePortal] = useState<string | null>(null);
  const [letterOpen, setLetterOpen] = useState(false);
  const [letterType, setLetterType] = useState<'A' | 'B'>('A');

  // [JWT] GET /api/accounting/gst-entity-config
  const gstConfig = useMemo(() => { try { return JSON.parse(localStorage.getItem('erp_gst_entity_config') || '{}'); } catch { return {}; } }, []);
  // [JWT] GET /api/compliance/comply360/tds-receivable
  const tdsrConfig = useMemo(() => { try { return JSON.parse(localStorage.getItem(`erp_comply360_tdsr_${entityCode}`) || '{}'); } catch { return {}; } }, [entityCode]);

  const tallyEntries = useMemo(() =>
    ls<TDSReceivableEntry>(tdsReceivableKey(entityCode))
      .filter(e => e.status !== 'cancelled' && e.date >= periodFrom && e.date <= periodTo),
  [entityCode, periodFrom, periodTo]);

  const ay = useMemo(() => {
    const y = new Date(periodFrom); const yr = y.getMonth() >= 3 ? y.getFullYear() : y.getFullYear() - 1;
    return `${yr + 1}-${String(yr + 2).slice(2)}`;
  }, [periodFrom]);

  // File upload handler
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parse26ASTextFile(text);
      setPortalRows(rows);
      toast.success(`Parsed ${rows.length} TDS rows from ${new Set(rows.map(r => r.deductor_tan)).size} deductors.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  // Run reconciliation
  const runReconciliation = useCallback(() => {
    if (portalRows.length === 0) { toast.error('Upload 26AS file first'); return; }
    const store = ls<TDSReceivableEntry>(tdsReceivableKey(entityCode));
    const periodEntries = store.filter(e => e.status !== 'cancelled' && e.date >= periodFrom && e.date <= periodTo);

    const normalize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    for (const entry of periodEntries) {
      const match = portalRows.find(p =>
        p.deductor_tan === entry.customer_tan &&
        normalize(p.sr_no).includes(normalize(entry.invoice_ref))
      );
      if (match) {
        entry.portal_sr_no = match.sr_no;
        entry.portal_tds_amount = match.tax_deducted;
        entry.portal_status = match.status as TDSReceivableEntry['portal_status'];
        entry.portal_booking_date = match.booking_date;
        entry.portal_deductor_name = match.deductor_name;
        if (Math.abs(entry.tds_amount - match.tax_deducted) <= 1) {
          entry.match_status = 'matched';
        } else {
          entry.match_status = 'partially_matched';
        }
      } else {
        entry.match_status = 'not_in_portal';
      }
    }
    ss(tdsReceivableKey(entityCode), store);
    toast.success('Reconciliation complete');
  }, [portalRows, entityCode, periodFrom, periodTo]);

  // Build party summary
  const partySummary = useMemo((): PartySummary[] => {
    const map = new Map<string, PartySummary>();
    for (const e of tallyEntries) {
      const tan = e.customer_tan || 'NO-TAN';
      if (!map.has(tan)) map.set(tan, { tan, name: e.customer_name, tallyAmount: 0, tallyTds: 0, portalAmount: 0, portalTds: 0, tallyEntries: [], portalEntries: [] });
      const s = map.get(tan)!;
      s.tallyAmount += e.amount_received; s.tallyTds += e.tds_amount;
      s.tallyEntries.push(e);
    }
    for (const p of portalRows) {
      const tan = p.deductor_tan || 'NO-TAN';
      if (!map.has(tan)) map.set(tan, { tan, name: p.deductor_name, tallyAmount: 0, tallyTds: 0, portalAmount: 0, portalTds: 0, tallyEntries: [], portalEntries: [] });
      const s = map.get(tan)!;
      s.portalAmount += p.amount_paid; s.portalTds += p.tax_deducted;
      s.portalEntries.push(p);
      if (!s.name) s.name = p.deductor_name;
    }
    let result = Array.from(map.values()).filter(s => s.tallyAmount > 0 || s.portalAmount > 0);
    if (showDiffOnly) result = result.filter(s => Math.abs(s.tallyTds - s.portalTds) > 1);
    return result;
  }, [tallyEntries, portalRows, showDiffOnly]);

  const totals = useMemo(() => partySummary.reduce((a, s) => ({
    tallyAmount: a.tallyAmount + s.tallyAmount, tallyTds: a.tallyTds + s.tallyTds,
    portalAmount: a.portalAmount + s.portalAmount, portalTds: a.portalTds + s.portalTds,
  }), { tallyAmount: 0, tallyTds: 0, portalAmount: 0, portalTds: 0 }), [partySummary]);

  // Post TDS Receivable JV for "Not In Tally" rows
  const handlePostJV = useCallback(() => {
    if (selectedNIT.size === 0) { toast.error('Select portal rows first'); return; }
    const ledger = tdsrConfig.tdsReceivableLedger || 'TDS Receivable';
    const store = ls<TDSReceivableEntry>(tdsReceivableKey(entityCode));
    let posted = 0;
    for (const srNo of selectedNIT) {
      const portalRow = portalRows.find(p => p.sr_no === srNo);
      if (!portalRow) continue;
      const vNo = generateVoucherNo('JV', entityCode);
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}-${posted}`, voucher_no: vNo, voucher_type_id: '',
        voucher_type_name: 'Journal', base_voucher_type: 'Journal',
        entity_id: entityCode, date: periodTo,
        party_name: portalRow.deductor_name,
        ledger_lines: [
          { id: `ll1-${posted}`, ledger_id: '', ledger_code: '', ledger_name: ledger, ledger_group_code: '', dr_amount: portalRow.tax_deducted, cr_amount: 0, narration: '' },
          { id: `ll2-${posted}`, ledger_id: '', ledger_code: '', ledger_name: portalRow.deductor_name, ledger_group_code: '', dr_amount: 0, cr_amount: portalRow.tax_deducted, narration: '' },
        ],
        gross_amount: portalRow.tax_deducted, total_discount: 0, total_taxable: 0,
        total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0, total_tax: 0,
        round_off: 0, net_amount: portalRow.tax_deducted, tds_applicable: false,
        narration: `Being TDS of Rs.${portalRow.tax_deducted} deducted by ${portalRow.deductor_name} — 26AS SR No: ${portalRow.sr_no}`,
        terms_conditions: '', payment_enforcement: '', payment_instrument: '',
        status: 'draft', created_by: 'current-user', created_at: now, updated_at: now,
      };
      postVoucher(voucher, entityCode);
      // Create TDSReceivableEntry
      store.push({
        id: `tdsrcv-${Date.now()}-${posted}`, entity_id: entityCode,
        voucher_id: voucher.id, voucher_no: vNo,
        customer_id: '', customer_name: portalRow.deductor_name,
        customer_pan: '', customer_tan: portalRow.deductor_tan,
        tds_section: portalRow.section_code, invoice_ref: portalRow.sr_no,
        invoice_date: portalRow.payment_date, amount_received: portalRow.amount_paid,
        tds_amount: portalRow.tax_deducted, net_received: portalRow.amount_paid - portalRow.tax_deducted,
        date: periodTo, quarter: (() => { const m = new Date(periodTo).getMonth() + 1; if (m >= 4 && m <= 6) return 'Q1'; if (m >= 7 && m <= 9) return 'Q2'; if (m >= 10 && m <= 12) return 'Q3'; return 'Q4'; })() as TDSReceivableEntry['quarter'],
        assessment_year: ay,
        portal_sr_no: portalRow.sr_no, portal_tds_amount: portalRow.tax_deducted,
        portal_status: portalRow.status as TDSReceivableEntry['portal_status'],
        portal_booking_date: portalRow.booking_date, portal_deductor_name: portalRow.deductor_name,
        match_status: 'matched', jv_id: voucher.id, jv_no: vNo,
        status: 'posted', created_at: new Date().toISOString(),
      });
      posted++;
    }
    ss(tdsReceivableKey(entityCode), store);
    setSelectedNIT(new Set());
    toast.success(`Posted ${posted} TDS Receivable JV(s)`);
  }, [selectedNIT, portalRows, entityCode, periodTo, ay, tdsrConfig]);

  // Merge bills
  const handleMerge = useCallback(() => {
    if (!mergeTally || !mergePortal) { toast.error('Select one Tally row and one portal row'); return; }
    const store = ls<TDSReceivableEntry>(tdsReceivableKey(entityCode));
    const entry = store.find(e => e.id === mergeTally);
    const portalRow = portalRows.find(p => p.sr_no === mergePortal);
    if (!entry || !portalRow) return;
    entry.portal_sr_no = portalRow.sr_no;
    entry.portal_tds_amount = portalRow.tax_deducted;
    entry.portal_status = portalRow.status as TDSReceivableEntry['portal_status'];
    entry.portal_booking_date = portalRow.booking_date;
    entry.portal_deductor_name = portalRow.deductor_name;
    entry.match_status = Math.abs(entry.tds_amount - portalRow.tax_deducted) <= 1 ? 'matched' : 'partially_matched';
    ss(tdsReceivableKey(entityCode), store);
    setMergeTally(null); setMergePortal(null); setMergeMode(false);
    toast.success('Bills merged');
  }, [mergeTally, mergePortal, entityCode, portalRows]);

  // Letter data
  const letterEntries = useMemo(() => {
    if (letterType === 'A') return tallyEntries.filter(e => e.match_status === 'not_in_portal');
    return portalRows.filter(p => p.status === 'P' || p.status === 'U');
  }, [letterType, tallyEntries, portalRows]);

  const handleExportCSV = useCallback(() => {
    exportCSV('form-26as-reconciliation.csv',
      ['TAN', 'Party', 'Tally Amount', 'Tally TDS', '26AS Amount', '26AS TDS', 'Amount Diff', 'TDS Diff'],
      partySummary.map(s => [s.tan, s.name, String(s.tallyAmount), String(s.tallyTds),
        String(s.portalAmount), String(s.portalTds),
        String(s.tallyAmount - s.portalAmount), String(s.tallyTds - s.portalTds)]));
    toast.success('Exported');
  }, [partySummary]);

  return (
    <div data-keyboard-form className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Form 26AS — TDS Receivable Reconciliation</h2>
          <p className="text-xs text-muted-foreground">TRACES 26AS import and 5-state reconciliation — AY {ay}</p>
        </div>
        <Button data-primary variant="outline" size="sm" onClick={handleExportCSV}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>

      {/* Section A: Import */}
      <Card><CardContent className="pt-4 space-y-3">
        <p className="text-xs font-semibold">Section A — Import TRACES 26AS File</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Period From</Label>
            <Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Period To</Label>
            <Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex items-end gap-2">
            <label className="cursor-pointer">
              <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
              <div className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-input bg-background text-xs hover:bg-accent cursor-pointer">
                <Upload className="h-3.5 w-3.5" /> Upload .txt
              </div>
            </label>
            <Button size="sm" className="h-8 text-xs" onClick={runReconciliation} disabled={portalRows.length === 0}>Reconcile</Button>
          </div>
        </div>
        {portalRows.length > 0 && (
          <Badge variant="outline" className="text-xs">Parsed {portalRows.length} TDS rows from {new Set(portalRows.map(r => r.deductor_tan)).size} deductors</Badge>
        )}

        {/* Preview first 10 */}
        {portalRows.length > 0 && (
          <div className="border rounded-lg overflow-auto max-h-48">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-[10px]">SR</TableHead><TableHead className="text-[10px]">Deductor</TableHead>
                <TableHead className="text-[10px]">TAN</TableHead><TableHead className="text-[10px]">Section</TableHead>
                <TableHead className="text-[10px] text-right">Amount</TableHead><TableHead className="text-[10px] text-right">TDS</TableHead>
                <TableHead className="text-[10px]">Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {portalRows.slice(0, 10).map((r, i) => (
                  <TableRow key={`preview-${r.sr_no}-${i}`}>
                    <TableCell className="text-[10px] font-mono">{r.sr_no}</TableCell>
                    <TableCell className="text-[10px]">{r.deductor_name}</TableCell>
                    <TableCell className="text-[10px] font-mono">{r.deductor_tan}</TableCell>
                    <TableCell className="text-[10px]">{r.section_code}</TableCell>
                    <TableCell className="text-[10px] text-right font-mono">{inr(r.amount_paid)}</TableCell>
                    <TableCell className="text-[10px] text-right font-mono">{inr(r.tax_deducted)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[8px]">{r.status || '-'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent></Card>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Switch checked={showDiffOnly} onCheckedChange={setShowDiffOnly} />
          <Label className="text-xs">Show Diff Only</Label>
        </div>
        <div className="flex gap-1">
          {(['all', 'matched', 'partially_matched', 'not_in_portal', 'not_in_tally', 'unmatched'] as const).map(s => (
            <Badge key={s} variant={filterStatus === s ? 'default' : 'outline'}
              className="text-[10px] cursor-pointer" onClick={() => setFilterStatus(s)}>
              {s === 'all' ? 'All' : MATCH_LABELS[s as MatchStatus]}
            </Badge>
          ))}
        </div>
      </div>

      {/* Section B: Summary table */}
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs w-6"></TableHead>
            <TableHead className="text-xs">TAN No</TableHead>
            <TableHead className="text-xs">Party</TableHead>
            <TableHead className="text-xs text-right">Tally Amount</TableHead>
            <TableHead className="text-xs text-right">Tally TDS</TableHead>
            <TableHead className="text-xs text-right">26AS Amount</TableHead>
            <TableHead className="text-xs text-right">26AS TDS</TableHead>
            <TableHead className="text-xs text-right">Amt Diff</TableHead>
            <TableHead className="text-xs text-right">TDS Diff</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {partySummary.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">No data for selected period. Upload 26AS file and/or create Receipt vouchers with TDS.</TableCell></TableRow>
            )}
            {partySummary.map(s => {
              const isExpanded = expandedTAN === s.tan;
              const amtDiff = s.tallyAmount - s.portalAmount;
              const tdsDiff = s.tallyTds - s.portalTds;
              return (
                <>{/* eslint-disable-next-line react/jsx-key */}
                  <TableRow key={`summary-${s.tan}`} className="cursor-pointer hover:bg-muted/30" onClick={() => setExpandedTAN(isExpanded ? null : s.tan)}>
                    <TableCell>{isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</TableCell>
                    <TableCell className="text-xs font-mono">{s.tan}</TableCell>
                    <TableCell className="text-xs">{s.name}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{inr(s.tallyAmount)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{inr(s.tallyTds)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{inr(s.portalAmount)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{inr(s.portalTds)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">{amtDiff === 0 ? '-' : inr(amtDiff)}</TableCell>
                    <TableCell className={`text-xs text-right font-mono font-bold ${tdsDiff !== 0 ? 'text-destructive' : 'text-success'}`}>{tdsDiff === 0 ? '-' : inr(tdsDiff)}</TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`detail-${s.tan}`}>
                      <TableCell colSpan={9} className="p-0">
                        <div className="bg-muted/20 p-3 space-y-2">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Bill-level Detail</p>
                          <Table>
                            <TableHeader><TableRow>
                              <TableHead className="text-[10px]">Source</TableHead>
                              <TableHead className="text-[10px]">SR/Bill Ref</TableHead>
                              <TableHead className="text-[10px]">Bill Details</TableHead>
                              <TableHead className="text-[10px] text-right">Amount Paid</TableHead>
                              <TableHead className="text-[10px] text-right">Tax Deducted</TableHead>
                              <TableHead className="text-[10px] text-right">TDS Diff</TableHead>
                              <TableHead className="text-[10px]">Match</TableHead>
                              <TableHead className="text-[10px]">Portal Status</TableHead>
                              {mergeMode && <TableHead className="text-[10px] w-6">Sel</TableHead>}
                            </TableRow></TableHeader>
                            <TableBody>
                              {s.tallyEntries
                                .filter(e => filterStatus === 'all' || e.match_status === filterStatus)
                                .map(e => (
                                <TableRow key={`t-${e.id}`}>
                                  <TableCell><Badge className="text-[8px] bg-blue-500/15 text-blue-700 border-blue-500/30">Tally</Badge></TableCell>
                                  <TableCell className="text-[10px] font-mono">{e.invoice_ref}</TableCell>
                                  <TableCell className="text-[10px]">Ref. No.:- {e.invoice_ref} / Trn. Date:- {e.invoice_date}</TableCell>
                                  <TableCell className="text-[10px] text-right font-mono">{inr(e.amount_received)}</TableCell>
                                  <TableCell className="text-[10px] text-right font-mono">{inr(e.tds_amount)}</TableCell>
                                  <TableCell className={`text-[10px] text-right font-mono ${e.portal_tds_amount != null && Math.abs(e.tds_amount - e.portal_tds_amount) > 1 ? 'text-destructive font-bold' : ''}`}>
                                    {e.portal_tds_amount != null ? inr(e.tds_amount - e.portal_tds_amount) : '-'}
                                  </TableCell>
                                  <TableCell><Badge variant="outline" className={`text-[8px] ${MATCH_BADGE_CLASS[e.match_status]}`}>{MATCH_LABELS[e.match_status]}</Badge></TableCell>
                                  <TableCell>{e.portal_status ? <Badge variant="outline" className={`text-[8px] ${e.portal_status === 'F' ? 'border-emerald-500/30 text-emerald-700' : 'border-amber-500/30 text-amber-700'}`}>{e.portal_status}</Badge> : '-'}</TableCell>
                                  {mergeMode && <TableCell><Checkbox checked={mergeTally === e.id} onCheckedChange={() => setMergeTally(mergeTally === e.id ? null : e.id)} /></TableCell>}
                                </TableRow>
                              ))}
                              {s.portalEntries
                                .filter(() => filterStatus === 'all' || filterStatus === 'not_in_tally')
                                .filter(p => !tallyEntries.some(e => e.portal_sr_no === p.sr_no))
                                .map((p, idx) => (
                                <TableRow key={`p-${p.sr_no}-${idx}`}>
                                  <TableCell><Badge className="text-[8px] bg-red-500/15 text-red-700 border-red-500/30">26AS Portal</Badge></TableCell>
                                  <TableCell className="text-[10px] font-mono">{p.sr_no}</TableCell>
                                  <TableCell className="text-[10px]">{p.deductor_name} / {p.payment_date}</TableCell>
                                  <TableCell className="text-[10px] text-right font-mono">{inr(p.amount_paid)}</TableCell>
                                  <TableCell className="text-[10px] text-right font-mono">{inr(p.tax_deducted)}</TableCell>
                                  <TableCell className="text-[10px] text-right">-</TableCell>
                                  <TableCell><Badge variant="outline" className={`text-[8px] ${MATCH_BADGE_CLASS.not_in_tally}`}>Not In Tally</Badge></TableCell>
                                  <TableCell><Badge variant="outline" className={`text-[8px] ${p.status === 'F' ? 'border-emerald-500/30 text-emerald-700' : 'border-amber-500/30 text-amber-700'}`}>{p.status || '-'}</Badge></TableCell>
                                  {mergeMode && <TableCell><Checkbox checked={mergePortal === p.sr_no} onCheckedChange={() => setMergePortal(mergePortal === p.sr_no ? null : p.sr_no)} /></TableCell>}
                                  {!mergeMode && (
                                    <TableCell>
                                      <Checkbox checked={selectedNIT.has(p.sr_no)}
                                        onCheckedChange={v => {
                                          const next = new Set(selectedNIT);
                                          v ? next.add(p.sr_no) : next.delete(p.sr_no);
                                          setSelectedNIT(next);
                                        }} />
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
            {/* Totals */}
            {partySummary.length > 0 && (
              <TableRow className="font-bold border-t-2">
                <TableCell></TableCell><TableCell className="text-xs" colSpan={2}>Total</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(totals.tallyAmount)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(totals.tallyTds)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(totals.portalAmount)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(totals.portalTds)}</TableCell>
                <TableCell className="text-xs text-right font-mono">{inr(totals.tallyAmount - totals.portalAmount)}</TableCell>
                <TableCell className={`text-xs text-right font-mono ${Math.abs(totals.tallyTds - totals.portalTds) > 1 ? 'text-destructive' : 'text-success'}`}>{inr(totals.tallyTds - totals.portalTds)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button data-primary size="sm" onClick={handlePostJV} disabled={selectedNIT.size === 0}>
          <FileText className="h-4 w-4 mr-1" />Post TDS Receivable JV ({selectedNIT.size} selected)
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setMergeMode(!mergeMode); setMergeTally(null); setMergePortal(null); }}>
          <Link className="h-4 w-4 mr-1" />{mergeMode ? 'Cancel Merge' : 'Merge Bills'}
        </Button>
        {mergeMode && mergeTally && mergePortal && (
          <Button data-primary size="sm" onClick={handleMerge}><Check className="h-4 w-4 mr-1" />Confirm Merge</Button>
        )}
        <Button variant="outline" size="sm" onClick={() => { setLetterType('A'); setLetterOpen(true); }}>
          <Mail className="h-4 w-4 mr-1" />Generate Letter
        </Button>
      </div>

      {/* Letter Dialog */}
      <Dialog open={letterOpen} onOpenChange={setLetterOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Generate Letter — {letterType === 'A' ? 'TDS Not Reflected in 26AS' : 'Issue in 26AS (P/U Status)'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant={letterType === 'A' ? 'default' : 'outline'} size="sm" onClick={() => setLetterType('A')}>Type A — Not in 26AS</Button>
              <Button variant={letterType === 'B' ? 'default' : 'outline'} size="sm" onClick={() => setLetterType('B')}>Type B — P/U Status</Button>
            </div>
            <div className="border rounded-lg p-4 text-xs space-y-2 bg-muted/20">
              <p className="font-bold">{gstConfig.entityName || '4DSmartOps Pvt Ltd'}</p>
              {letterType === 'A' ? (
                <>
                  <p className="font-semibold">Sub: TDS deducted by you but not reflected in our Form 26AS — Assessment Year {ay}</p>
                  <p>Given below are details of TDS deducted by you which is not reflected in our Form 26AS. The reason could be: (1) your quarterly TDS return has not been submitted, or (2) our PAN number was incorrectly provided. Our PAN: {gstConfig.pan || '(not set)'}.</p>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-[10px]">Sr.No</TableHead><TableHead className="text-[10px]">Date</TableHead>
                      <TableHead className="text-[10px]">Voucher No</TableHead><TableHead className="text-[10px]">Bill Ref</TableHead>
                      <TableHead className="text-[10px] text-right">Amount</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(letterEntries as TDSReceivableEntry[]).map((e, i) => (
                        <TableRow key={`la-${e.id}-${i}`}>
                          <TableCell className="text-[10px]">{i + 1}</TableCell>
                          <TableCell className="text-[10px]">{e.date}</TableCell>
                          <TableCell className="text-[10px] font-mono">{e.voucher_no}</TableCell>
                          <TableCell className="text-[10px]">{e.invoice_ref}</TableCell>
                          <TableCell className="text-[10px] text-right font-mono">{inr(e.tds_amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p>We request you to revise your quarterly return to resolve this at the earliest.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">Sub: Issue in Form 26AS of Income Tax Department — Assessment Year {ay}</p>
                  <p>TDS deducted by you is reflected in our Form 26AS but with Pending/Under Processing status. Reason could be: TDS return contains incorrect details or payment to Income Tax does not match. Please resolve at earliest.</p>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="text-[10px]">Sr.No</TableHead><TableHead className="text-[10px]">TAN No</TableHead>
                      <TableHead className="text-[10px]">Section</TableHead><TableHead className="text-[10px]">Date</TableHead>
                      <TableHead className="text-[10px] text-right">TDS Deposited</TableHead><TableHead className="text-[10px]">Status</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {(letterEntries as TRACES26ASRow[]).map((p, i) => (
                        <TableRow key={`lb-${p.sr_no}-${i}`}>
                          <TableCell className="text-[10px]">{i + 1}</TableCell>
                          <TableCell className="text-[10px] font-mono">{p.deductor_tan}</TableCell>
                          <TableCell className="text-[10px]">{p.section_code}</TableCell>
                          <TableCell className="text-[10px]">{p.payment_date}</TableCell>
                          <TableCell className="text-[10px] text-right font-mono">{inr(p.tds_deposited)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[8px]">{p.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => {
              const text = document.querySelector('.bg-muted\\/20')?.textContent || '';
              navigator.clipboard.writeText(text);
              toast.success('Letter copied to clipboard');
            }}>Copy Text</Button>
            <Button variant="outline" size="sm" onClick={() => setLetterOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Form26AS() { return <Form26ASPanel entityCode="SMRT" />; }
