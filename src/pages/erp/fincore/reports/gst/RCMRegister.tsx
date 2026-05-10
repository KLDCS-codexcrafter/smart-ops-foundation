/**
 * RCMRegister.tsx — RCM Register Panel
 * Shows RCM liability entries. Post RCM Journal button. Lifecycle tracking.
 * [JWT] Data from erp_rcm_entries_{e}
 */
import { useState, useMemo, useCallback } from 'react';
import { Shield, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import type { RCMEntry } from '@/types/compliance';
import { rcmEntriesKey } from '@/types/compliance';
import { comply360RCMKey } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { RCMLedgerConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation';
import { postVoucher, generateVoucherNo } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';
import { inr, fmtDate } from '../reportUtils';

interface RCMRegisterPanelProps { entityCode: string; }

function loadRCMEntries(entityCode: string): RCMEntry[] {
  try {
    // [JWT] GET /api/compliance/rcm-entries
    const raw = localStorage.getItem(rcmEntriesKey(entityCode));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadRCMConfig(entityCode: string): RCMLedgerConfig | null {
  try {
    // [JWT] GET /api/compliance/comply360/rcm/:entityId
    const raw = localStorage.getItem(comply360RCMKey(entityCode));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function RCMRegisterPanel({ entityCode }: RCMRegisterPanelProps) {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const period = `${year}-${month}`;

  const [allEntries, setAllEntries] = useState<RCMEntry[]>(() => loadRCMEntries(entityCode));
  const [sectionFilter, setSectionFilter] = useState<'all' | 'section_9_3' | 'section_9_4'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'posted' | 'cancelled'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return allEntries.filter(e => {
      if (!e.date.startsWith(period)) return false;
      if (sectionFilter !== 'all' && e.rcm_section !== sectionFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      return true;
    });
  }, [allEntries, period, sectionFilter, statusFilter]);

  const openEntries = filtered.filter(e => e.status === 'open');
  const postedEntries = filtered.filter(e => e.status === 'posted');
  const totalLiability = filtered.reduce((s, e) => s + e.cgst_amount + e.sgst_amount + e.igst_amount + e.cess_amount, 0);
  const postedTotal = postedEntries.reduce((s, e) => s + e.cgst_amount + e.sgst_amount + e.igst_amount + e.cess_amount, 0);
  const pendingTotal = openEntries.reduce((s, e) => s + e.cgst_amount + e.sgst_amount + e.igst_amount + e.cess_amount, 0);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handlePostRCMJV = useCallback(() => {
    const rcmConfig = loadRCMConfig(entityCode);
    if (!rcmConfig || (!rcmConfig.rcmCGSTLedger && !rcmConfig.rcmIGSTLedger)) {
      toast.error('RCM ledger configuration missing — configure in Comply360');
      return;
    }

    const selectedEntries = openEntries.filter(e => selected.has(e.id));
    if (selectedEntries.length === 0) { toast.warning('Select at least one open entry'); return; }

    const nowStr = new Date().toISOString();
    const updated = [...allEntries];

    for (const entry of selectedEntries) {
      const isInterState = entry.igst_amount > 0;
      const voucherNo = generateVoucherNo('JV-RCM', entityCode);

      const ledgerLines = isInterState ? [
        { id: `ll-${Date.now()}-dr`, ledger_id: 'input-rcm-igst', ledger_code: 'INPUT-RCM-IGST', ledger_name: rcmConfig.inputIGSTLedger || 'Input IGST (RCM)', ledger_group_code: 'DUTIES_TAXES', dr_amount: entry.igst_amount, cr_amount: 0, narration: '' },
        { id: `ll-${Date.now()}-cr`, ledger_id: 'rcm-igst-payable', ledger_code: 'RCM-IGST-PAY', ledger_name: rcmConfig.rcmIGSTLedger || 'RCM IGST Payable', ledger_group_code: 'DUTIES_TAXES', dr_amount: 0, cr_amount: entry.igst_amount, narration: '' },
      ] : [
        { id: `ll-${Date.now()}-dr1`, ledger_id: 'input-rcm-cgst', ledger_code: 'INPUT-RCM-CGST', ledger_name: rcmConfig.inputCGSTLedger || 'Input CGST (RCM)', ledger_group_code: 'DUTIES_TAXES', dr_amount: entry.cgst_amount, cr_amount: 0, narration: '' },
        { id: `ll-${Date.now()}-dr2`, ledger_id: 'input-rcm-sgst', ledger_code: 'INPUT-RCM-SGST', ledger_name: rcmConfig.inputSGSTLedger || 'Input SGST (RCM)', ledger_group_code: 'DUTIES_TAXES', dr_amount: entry.sgst_amount, cr_amount: 0, narration: '' },
        { id: `ll-${Date.now()}-cr1`, ledger_id: 'rcm-cgst-payable', ledger_code: 'RCM-CGST-PAY', ledger_name: rcmConfig.rcmCGSTLedger || 'RCM CGST Payable', ledger_group_code: 'DUTIES_TAXES', dr_amount: 0, cr_amount: entry.cgst_amount, narration: '' },
        { id: `ll-${Date.now()}-cr2`, ledger_id: 'rcm-sgst-payable', ledger_code: 'RCM-SGST-PAY', ledger_name: rcmConfig.rcmSGSTLedger || 'RCM SGST Payable', ledger_group_code: 'DUTIES_TAXES', dr_amount: 0, cr_amount: entry.sgst_amount, narration: '' },
      ];

      const totalTax = isInterState ? entry.igst_amount : entry.cgst_amount + entry.sgst_amount;
      const sectionLabel = entry.rcm_section === 'section_9_3' ? 'Sec 9(3)' : 'Sec 9(4)';

      const voucher: Voucher = {
        id: `rcm-jv-${Date.now()}-${entry.id}`,
        voucher_no: voucherNo,
        voucher_type_id: 'vt-journal',
        voucher_type_name: 'Journal',
        base_voucher_type: 'Journal',
        entity_id: entityCode,
        date: entry.date,
        ledger_lines: ledgerLines,
        gross_amount: totalTax,
        total_discount: 0, total_taxable: entry.taxable_value,
        total_cgst: entry.cgst_amount, total_sgst: entry.sgst_amount,
        total_igst: entry.igst_amount, total_cess: entry.cess_amount,
        total_tax: totalTax, round_off: 0, net_amount: totalTax,
        tds_applicable: false,
        narration: `RCM JV - ${sectionLabel} - ${entry.party_name} - ${entry.voucher_no}`,
        terms_conditions: '', payment_enforcement: '', payment_instrument: '',
        status: 'draft',
        created_by: 'system',
        created_at: nowStr, updated_at: nowStr,
      };

      postVoucher(voucher, entityCode);

      // Update RCM entry
      const idx = updated.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        updated[idx] = {
          ...updated[idx],
          status: 'posted',
          rcm_jv_id: voucher.id,
          rcm_jv_no: voucherNo,
          posted_at: nowStr,
        };
      }

      toast.success(`RCM Journal Entry ${voucherNo} posted`);
    }

    // [JWT] PATCH /api/compliance/rcm-entries
    localStorage.setItem(rcmEntriesKey(entityCode), JSON.stringify(updated));
    setAllEntries(updated);
    setSelected(new Set());
  }, [openEntries, selected, entityCode, allEntries]);

  const statusBadge = (status: RCMEntry['status']) => {
    if (status === 'open') return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 text-[10px]">Pending</Badge>;
    if (status === 'posted') return <Badge className="bg-green-500/15 text-green-700 border-green-500/30 text-[10px]">Posted</Badge>;
    return <Badge className="bg-red-500/15 text-red-700 border-red-500/30 text-[10px]">Cancelled</Badge>;
  };

  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div data-keyboard-form className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Shield className="h-5 w-5 text-teal-500" /> RCM Register</h2>
          <p className="text-xs text-muted-foreground">Reverse Charge Mechanism liability and JV posting</p>
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
          <Button size="sm" data-primary onClick={handlePostRCMJV} disabled={selected.size === 0}>
            <FileText className="h-3.5 w-3.5 mr-1" />Post RCM Journal ({selected.size})
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'section_9_3', 'section_9_4'] as const).map(s => (
          <Button key={s} variant={sectionFilter === s ? 'default' : 'outline'} size="sm" className="text-xs h-7"
            onClick={() => setSectionFilter(s)}>
            {s === 'all' ? 'All Sections' : s === 'section_9_3' ? 'Section 9(3)' : 'Section 9(4)'}
          </Button>
        ))}
        <div className="w-px bg-border" />
        {(['all', 'open', 'posted', 'cancelled'] as const).map(s => (
          <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" className="text-xs h-7"
            onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All Status' : s === 'open' ? 'Open' : s === 'posted' ? 'Posted' : 'Cancelled'}
          </Button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Total RCM Liability</p><p className="text-lg font-bold font-mono">{inr(totalLiability)}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Posted</p><p className="text-lg font-bold font-mono">{inr(postedTotal)}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Pending</p><p className="text-lg font-bold font-mono">{inr(pendingTotal)}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-muted-foreground">Net Unposted</p><p className={`text-lg font-bold font-mono ${pendingTotal > 0 ? 'text-red-600' : ''}`}>{inr(pendingTotal)}</p></CardContent></Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" /><TableHead>Date</TableHead><TableHead>Source Voucher</TableHead>
            <TableHead>Vendor</TableHead><TableHead>GSTIN</TableHead><TableHead>Section</TableHead>
            <TableHead className="text-right">Taxable</TableHead><TableHead className="text-right">CGST</TableHead>
            <TableHead className="text-right">SGST</TableHead><TableHead className="text-right">IGST</TableHead>
            <TableHead className="text-right">Cess</TableHead><TableHead className="text-right">Total Tax</TableHead>
            <TableHead>JV No</TableHead><TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-8">No RCM entries for this period</TableCell></TableRow>
          ) : filtered.map(e => (
            <TableRow key={e.id}>
              <TableCell>
                {e.status === 'open' && (
                  <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggleSelect(e.id)} />
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">{fmtDate(e.date)}</TableCell>
              <TableCell className="font-mono text-xs">{e.voucher_no}</TableCell>
              <TableCell className="text-xs">{e.party_name}</TableCell>
              <TableCell className="font-mono text-xs">{e.party_gstin || '-'}</TableCell>
              <TableCell className="text-xs">{e.rcm_section === 'section_9_3' ? '9(3)' : '9(4)'}</TableCell>
              <TableCell className="text-right font-mono text-xs">{inr(e.taxable_value)}</TableCell>
              <TableCell className="text-right font-mono text-xs">{inr(e.cgst_amount)}</TableCell>
              <TableCell className="text-right font-mono text-xs">{inr(e.sgst_amount)}</TableCell>
              <TableCell className="text-right font-mono text-xs">{inr(e.igst_amount)}</TableCell>
              <TableCell className="text-right font-mono text-xs">{inr(e.cess_amount)}</TableCell>
              <TableCell className="text-right font-mono text-xs">{inr(e.cgst_amount + e.sgst_amount + e.igst_amount + e.cess_amount)}</TableCell>
              <TableCell className="font-mono text-xs">{e.rcm_jv_no || '-'}</TableCell>
              <TableCell>{statusBadge(e.status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

export default function RCMRegister() {
  const { entityCode } = useEntityCode();
  if (!entityCode) return <SelectCompanyGate title="Select a company to view RCM Register" />;
  return <RCMRegisterPanel entityCode={entityCode} />;
}
