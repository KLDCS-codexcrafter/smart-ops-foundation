/**
 * CommissionRegister.tsx — SAM commission payable register
 * Allows logging a receipt-based commission payment with TDS write-back.
 * [JWT] GET /api/salesx/commission-register
 * [JWT] POST /api/salesx/commission-register/:id/payments
 */
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Wallet, Search, Receipt, FileCheck, ChevronDown, ChevronRight, AlertTriangle, Banknote } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import {
  commissionRegisterKey,
} from '@/types/commission-register';
import type { CommissionEntry, CommissionPayment } from '@/types/commission-register';
import { getQuarter, getAssessmentYear, generateVoucherNo, postVoucher } from '@/lib/finecore-engine';
import type { TDSDeductionEntry } from '@/types/compliance';
import { tdsDeductionsKey } from '@/types/compliance';
import { dAdd, dSub, dMul, dPct, dSum, round2 } from '@/lib/decimal-helpers';
import { computeCommissionGL } from '@/lib/commission-engine';
import { comply360SAMKey } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { SAMConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { Voucher } from '@/types/voucher';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;
const todayISO = () => new Date().toISOString().split('T')[0];

const STATUS_COLOR: Record<CommissionEntry['status'], string> = {
  pending: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  partial: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  paid: 'bg-green-500/15 text-green-700 border-green-500/30',
  reversed: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

function loadRegister(entityCode: string): CommissionEntry[] {
  try {
    // [JWT] GET /api/salesx/commission-register?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(commissionRegisterKey(entityCode)) || '[]');
  } catch { return []; }
}
function saveRegister(entityCode: string, list: CommissionEntry[]): void {
  // [JWT] PATCH /api/salesx/commission-register
  localStorage.setItem(commissionRegisterKey(entityCode), JSON.stringify(list));
}

export function CommissionRegisterPanel({ entityCode }: Props) {
  const [register, setRegister] = useState<CommissionEntry[]>(() => loadRegister(entityCode));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<'all' | CommissionEntry['status']>('all');

  const [activeId, setActiveId] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(todayISO());
  const [receiptNo, setReceiptNo] = useState('');
  const [amountReceived, setAmountReceived] = useState('');

  // Sprint 4 — expand row + agent invoice + GL voucher
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [agentInvoiceId, setAgentInvoiceId] = useState<string | null>(null);
  const [agentInvNo, setAgentInvNo] = useState('');
  const [agentInvDate, setAgentInvDate] = useState(todayISO());
  const [agentInvGross, setAgentInvGross] = useState('');
  const [agentInvGST, setAgentInvGST] = useState('');

  const samCfg = useMemo<SAMConfig | null>(() => {
    try {
      // [JWT] GET /api/compliance/comply360/sam/:entityCode
      const raw = localStorage.getItem(comply360SAMKey(entityCode));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [entityCode]);

  const reload = useCallback(() => setRegister(loadRegister(entityCode)), [entityCode]);

  const filtered = useMemo(() => {
    let list = register;
    if (statusFilter !== 'all') list = list.filter(e => e.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.voucher_no.toLowerCase().includes(q) ||
        e.customer_name.toLowerCase().includes(q) ||
        e.person_name.toLowerCase().includes(q),
      );
    }
    return list.slice().sort((a, b) => b.voucher_date.localeCompare(a.voucher_date));
  }, [register, search, statusFilter]);

  const totals = useMemo(() => {
    return register.reduce((acc, e) => {
      acc.commission += e.total_commission;
      acc.received += e.amount_received_to_date;
      acc.earned += e.commission_earned_to_date;
      acc.tds += e.tds_deducted_to_date;
      acc.net += e.net_paid_to_date;
      return acc;
    }, { commission: 0, received: 0, earned: 0, tds: 0, net: 0 });
  }, [register]);

  const active = useMemo(
    () => register.find(e => e.id === activeId) ?? null,
    [register, activeId],
  );

  const openPay = (e: CommissionEntry) => {
    setActiveId(e.id);
    setPayDate(todayISO());
    setReceiptNo('');
    setAmountReceived('');
  };

  const closePay = () => {
    setActiveId(null);
    setReceiptNo('');
    setAmountReceived('');
  };

  const previewPayment = useMemo(() => {
    if (!active) return null;
    const amt = Number(amountReceived);
    if (!amt || amt <= 0) return null;
    const ratio = active.invoice_amount > 0 ? amt / active.invoice_amount : 0;
    const commissionOnReceipt = round2(dMul(active.total_commission, ratio));
    const tdsAmount = active.tds_applicable
      ? round2(dPct(commissionOnReceipt, active.tds_rate))
      : 0;
    const netCommissionPaid = round2(dSub(commissionOnReceipt, tdsAmount));
    return { commissionOnReceipt, tdsAmount, netCommissionPaid };
  }, [active, amountReceived]);

  const handleLogPayment = useCallback(() => {
    if (!active) return;
    const amt = Number(amountReceived);
    if (!amt || amt <= 0) { toast.error('Amount received must be positive'); return; }
    const remaining = active.invoice_amount - active.amount_received_to_date;
    if (amt > remaining + 0.01) {
      toast.error(`Amount exceeds remaining ₹${inrFmt.format(remaining)}`);
      return;
    }
    if (!previewPayment) return;

    const now = new Date().toISOString();
    let tdsDeductionEntryId: string | null = null;

    // Write TDSDeductionEntry if TDS is applicable and threshold crossed
    if (active.tds_applicable && active.tds_section && previewPayment.tdsAmount > 0) {
      const allTDS: TDSDeductionEntry[] = (() => {
        try {
          // [JWT] GET /api/compliance/tds-deductions
          return JSON.parse(localStorage.getItem(tdsDeductionsKey(entityCode)) || '[]');
        } catch { return []; }
      })();

      // Check YTD aggregate for this person+section+AY (194H threshold = ₹15,000)
      const currentAY = getAssessmentYear(payDate);
      const threshold = active.tds_section === '194H' ? 15000 : 30000;
      const ytdGross = round2(dSum(
        allTDS.filter(t =>
          t.party_id === active.person_id &&
          t.tds_section === active.tds_section &&
          t.assessment_year === currentAY &&
          t.status !== 'cancelled'
        ),
        t => t.gross_amount,
      ));

      if (ytdGross + previewPayment.commissionOnReceipt >= threshold) {
        const tdsEntry: TDSDeductionEntry = {
          id: `tds-comm-${Date.now()}`,
          entity_id: entityCode,
          source_voucher_id: active.voucher_id,
          source_voucher_no: active.voucher_no,
          source_voucher_type: 'Payment',
          party_id: active.person_id,
          party_name: active.person_name,
          party_pan: active.person_pan ?? '',
          deductee_type: active.deductee_type,
          tds_section: active.tds_section,
          nature_of_payment: active.tds_section === '194H'
            ? 'Commission or brokerage'
            : 'Fee for professional services',
          tds_rate: active.tds_rate,
          gross_amount: previewPayment.commissionOnReceipt,
          advance_tds_already: 0,
          net_tds_amount: previewPayment.tdsAmount,
          date: payDate,
          quarter: getQuarter(payDate),
          assessment_year: currentAY,
          status: 'open',
          created_at: now,
        };
        // [JWT] POST /api/compliance/tds-deductions
        localStorage.setItem(
          tdsDeductionsKey(entityCode),
          JSON.stringify([...allTDS, tdsEntry])
        );
        tdsDeductionEntryId = tdsEntry.id;
      }
    }

    const payment: CommissionPayment = {
      id: `cp-${Date.now()}`,
      payment_date: payDate,
      receipt_voucher_id: null,
      receipt_voucher_no: receiptNo.trim() || null,
      amount_received: amt,
      commission_on_receipt: previewPayment.commissionOnReceipt,
      tds_rate: active.tds_rate,
      tds_amount: previewPayment.tdsAmount,
      net_commission_paid: previewPayment.netCommissionPaid,
      tds_deduction_entry_id: tdsDeductionEntryId,
      created_at: now,
    };

    const list = loadRegister(entityCode);
    const idx = list.findIndex(e => e.id === active.id);
    if (idx < 0) { toast.error('Entry not found'); return; }
    const updated = { ...list[idx] };
    updated.payments = [...updated.payments, payment];
    updated.amount_received_to_date =
      round2(dAdd(updated.amount_received_to_date, amt));
    updated.commission_earned_to_date =
      round2(dAdd(updated.commission_earned_to_date, previewPayment.commissionOnReceipt));
    updated.tds_deducted_to_date =
      round2(dAdd(updated.tds_deducted_to_date, previewPayment.tdsAmount));
    updated.net_paid_to_date =
      round2(dAdd(updated.net_paid_to_date, previewPayment.netCommissionPaid));
    updated.status = updated.amount_received_to_date >= updated.invoice_amount - 0.01
      ? 'paid' : 'partial';
    updated.updated_at = now;
    list[idx] = updated;
    saveRegister(entityCode, list);

    const tdsMsg = previewPayment.tdsAmount > 0
      ? ` TDS ₹${previewPayment.tdsAmount} (${active.tds_section}) deducted.` : '';
    toast.success(`Commission ₹${previewPayment.netCommissionPaid.toLocaleString('en-IN')} recorded.${tdsMsg}`);
    reload();
    closePay();
  }, [active, amountReceived, payDate, receiptNo, previewPayment, entityCode, reload]);

  // Sprint 4 — Post GL voucher for paid/partial commission
  const handlePostGLVoucher = useCallback((entry: CommissionEntry) => {
    const glResult = computeCommissionGL(
      entry,
      samCfg?.commissionLedgerSales ?? '',
      'Commission on Sales',
    );
    if ('error' in glResult) { toast.error(glResult.error); return; }
    const pvNo = generateVoucherNo('PV', entityCode);
    const pv: Voucher = {
      id: `v-${Date.now()}`,
      voucher_no: pvNo,
      voucher_type_id: '',
      voucher_type_name: 'Payment',
      base_voucher_type: 'Payment',
      entity_id: entityCode,
      date: todayISO(),
      party_name: entry.person_name,
      ref_voucher_no: entry.voucher_no,
      vendor_bill_no: '',
      net_amount: glResult.netPayableToAgent + glResult.tdsPayableAmount,
      narration: `Commission payment - ${entry.voucher_no}`,
      terms_conditions: '', payment_enforcement: '',
      payment_instrument: '', from_ledger_name: '',
      to_ledger_name: entry.person_name,
      from_godown_name: '', to_godown_name: '',
      ledger_lines: glResult.expenseLines,
      gross_amount: glResult.netPayableToAgent + glResult.tdsPayableAmount,
      total_discount: 0, total_taxable: 0,
      total_cgst: 0, total_sgst: 0, total_igst: 0,
      total_cess: 0, total_tax: 0, round_off: 0,
      tds_applicable: entry.tds_applicable,
      status: 'draft',
      created_by: 'current-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      // [JWT] POST /api/accounting/vouchers (commission GL)
      postVoucher(pv, entityCode);
      const list = loadRegister(entityCode);
      const idx = list.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          commission_expense_voucher_id: pv.id,
          commission_expense_voucher_no: pvNo,
          updated_at: new Date().toISOString(),
        };
        // [JWT] PATCH /api/salesx/commission-register
        saveRegister(entityCode, list);
        reload();
      }
      toast.success(`GL voucher ${pvNo} posted`);
    } catch { toast.error('Failed to post GL voucher'); }
  }, [entityCode, samCfg, reload]);

  // Sprint 5 — Pay Agent: bank payout for commission-paid + GL-posted entries
  const handlePayAgent = useCallback((entry: CommissionEntry) => {
    if (!entry.commission_expense_voucher_id) {
      toast.error('Post GL Voucher first before bank payout');
      return;
    }
    if (entry.bank_payment_voucher_id) {
      toast.error('Bank payment already recorded');
      return;
    }
    const netPayable = round2(dAdd(entry.net_paid_to_date, entry.collection_bonus_amount ?? 0));
    if (netPayable <= 0) {
      toast.error('No commission payable for bank payout');
      return;
    }
    const bankLedger = (samCfg?.commissionLedgerSales ?? '').trim();
    const pvNo = generateVoucherNo('PV', entityCode);
    const today = todayISO();
    const pv: Voucher = {
      id: `v-bank-${Date.now()}`,
      voucher_no: pvNo,
      voucher_type_id: '',
      voucher_type_name: 'Payment',
      base_voucher_type: 'Payment',
      entity_id: entityCode,
      date: today,
      party_name: entry.person_name,
      ref_voucher_no: entry.commission_expense_voucher_no ?? entry.voucher_no,
      vendor_bill_no: '',
      net_amount: netPayable,
      narration: `Commission bank payout - ${entry.person_name} - ${entry.voucher_no}`,
      terms_conditions: '', payment_enforcement: '',
      payment_instrument: 'NEFT',
      from_ledger_name: 'Bank',
      to_ledger_name: entry.person_name,
      from_godown_name: '', to_godown_name: '',
      ledger_lines: [
        {
          id: `bp-${Date.now()}-1`,
          ledger_id: '',
          ledger_code: '',
          ledger_name: entry.person_name,
          ledger_group_code: 'CRED',
          dr_amount: netPayable,
          cr_amount: 0,
          narration: `Commission paid - ${entry.voucher_no}`,
        },
        {
          id: `bp-${Date.now()}-2`,
          ledger_id: bankLedger,
          ledger_code: '',
          ledger_name: 'Bank',
          ledger_group_code: 'BANK',
          dr_amount: 0,
          cr_amount: netPayable,
          narration: `Bank payout - ${entry.person_name}`,
        },
      ],
      gross_amount: netPayable,
      total_discount: 0, total_taxable: 0,
      total_cgst: 0, total_sgst: 0, total_igst: 0,
      total_cess: 0, total_tax: 0, round_off: 0,
      tds_applicable: false,
      status: 'draft',
      created_by: 'current-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      // [JWT] POST /api/accounting/vouchers (commission bank payout)
      postVoucher(pv, entityCode);
      const list = loadRegister(entityCode);
      const idx = list.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        list[idx] = {
          ...list[idx],
          bank_payment_voucher_id: pv.id,
          bank_payment_voucher_no: pvNo,
          bank_payment_date: today,
          updated_at: new Date().toISOString(),
        };
        // [JWT] PATCH /api/salesx/commission-register
        saveRegister(entityCode, list);
        reload();
      }
      toast.success(`Bank payout ${pvNo} recorded · ₹${inrFmt.format(netPayable)}`);
    } catch { toast.error('Failed to record bank payout'); }
  }, [entityCode, samCfg, reload]);

  // Sprint 4 — Save / reconcile agent GST invoice
  const handleSaveAgentInvoice = useCallback((
    entry: CommissionEntry,
    nextStatus: 'received' | 'reconciled' | 'disputed',
    reason?: string,
  ) => {
    const gross = Number(agentInvGross);
    const gst = Number(agentInvGST);
    if (!agentInvNo.trim()) { toast.error('Agent invoice number required'); return; }
    if (!gross || gross <= 0) { toast.error('Gross amount must be positive'); return; }
    const variance = round2(dSub(dSub(gross, gst), entry.commission_earned_to_date));
    const list = loadRegister(entityCode);
    const idx = list.findIndex(e => e.id === entry.id);
    if (idx < 0) return;
    list[idx] = {
      ...list[idx],
      agent_invoice_no: agentInvNo.trim(),
      agent_invoice_date: agentInvDate,
      agent_invoice_gross_amount: gross,
      agent_invoice_gst_amount: gst,
      agent_invoice_status: nextStatus,
      agent_invoice_variance: variance,
      agent_invoice_dispute_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    };
    // [JWT] PATCH /api/salesx/commission-register/:id/agent-invoice
    saveRegister(entityCode, list);
    reload();
    setAgentInvoiceId(null);
    setAgentInvNo(''); setAgentInvGross(''); setAgentInvGST('');
    toast.success(`Agent invoice ${nextStatus}`);
  }, [agentInvNo, agentInvDate, agentInvGross, agentInvGST, entityCode, reload]);

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commission Register</h1>
          <p className="text-sm text-muted-foreground">
            Commission earned on amount received with TDS write-back
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Total Commission
            </p>
            <p className="text-lg font-bold font-mono mt-1">{formatINR(totals.commission)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Received
            </p>
            <p className="text-lg font-bold font-mono mt-1">{formatINR(totals.received)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Earned
            </p>
            <p className="text-lg font-bold font-mono mt-1">{formatINR(totals.earned)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              TDS Deducted
            </p>
            <p className="text-lg font-bold font-mono mt-1">{formatINR(totals.tds)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Net Paid
            </p>
            <p className="text-lg font-bold font-mono mt-1">{formatINR(totals.net)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search invoice / customer / SAM person"
                className="pl-9"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {(['all', 'pending', 'partial', 'paid', 'cancelled'] as const).map(s => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'h-7 text-xs capitalize',
                    statusFilter === s && 'bg-orange-500 hover:bg-orange-600',
                  )}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No commission entries match the current filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-6" />
                  <TableHead className="text-xs">Invoice</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">SAM Person</TableHead>
                  <TableHead className="text-xs text-right">Net Inv ₹</TableHead>
                  <TableHead className="text-xs text-right">Commission ₹</TableHead>
                  <TableHead className="text-xs text-right">Received ₹</TableHead>
                  <TableHead className="text-xs text-right">Net Paid ₹</TableHead>
                  <TableHead className="text-xs text-right">
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help underline decoration-dotted">Bonus ₹</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Collection bonus earned when payment arrived within credit window
                          (see Comply360 Config → Collection Bonus)
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Agent Inv</TableHead>
                  <TableHead className="text-xs w-44" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => {
                  const isExpanded = expandedId === e.id;
                  const hasCN = (e.credit_note_refs?.length ?? 0) > 0;
                  const isReversed = e.status === 'reversed';
                  return (
                    <>
                      <TableRow key={e.id} className={cn(isReversed && 'italic opacity-80')}>
                        <TableCell>
                          {hasCN && (
                            <Button
                              size="icon" variant="ghost" className="h-6 w-6"
                              onClick={() => setExpandedId(isExpanded ? null : e.id)}
                            >
                              {isExpanded
                                ? <ChevronDown className="h-3.5 w-3.5" />
                                : <ChevronRight className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{e.voucher_no}</TableCell>
                        <TableCell className="text-xs">{e.voucher_date}</TableCell>
                        <TableCell className="text-xs">{e.customer_name}</TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{e.person_name}</div>
                          <div className="text-[10px] text-muted-foreground capitalize">
                            {e.person_type}
                            {e.tds_applicable && e.tds_section && ` · TDS ${e.tds_section} @ ${e.tds_rate}%`}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">
                          {inrFmt.format(e.net_invoice_amount)}
                          {hasCN && (
                            <div className="text-[9px] text-rose-600">
                              −{inrFmt.format(e.credit_note_amount)} CN
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">{inrFmt.format(e.net_total_commission)}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{inrFmt.format(e.amount_received_to_date)}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{inrFmt.format(e.net_paid_to_date)}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-amber-600">
                          {(e.collection_bonus_amount ?? 0) > 0
                            ? inrFmt.format(e.collection_bonus_amount ?? 0)
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_COLOR[e.status])}>
                            {e.status}
                          </Badge>
                          {e.commission_expense_voucher_no && (
                            <div className="text-[9px] font-mono text-muted-foreground mt-0.5">
                              GL: {e.commission_expense_voucher_no}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {e.agent_invoice_status ? (
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {e.agent_invoice_status}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!isReversed && (
                            <div className="flex flex-wrap gap-1">
                              {(e.status === 'pending' || e.status === 'partial') && (
                                <Button
                                  size="sm" variant="outline" className="h-7 text-[10px] px-2"
                                  onClick={() => openPay(e)}
                                >
                                  <Wallet className="h-3 w-3 mr-1" /> Log
                                </Button>
                              )}
                              {(e.status === 'paid' || e.status === 'partial') && !e.commission_expense_voucher_id && (
                                <Button
                                  size="sm" variant="outline" className="h-7 text-[10px] px-2"
                                  onClick={() => handlePostGLVoucher(e)}
                                >
                                  <FileCheck className="h-3 w-3 mr-1" /> Post GL
                                </Button>
                              )}
                              {e.commission_expense_voucher_id && !e.bank_payment_voucher_id && (
                                <Button
                                  data-primary
                                  size="sm" className="h-7 text-[10px] px-2 bg-orange-500 hover:bg-orange-600"
                                  onClick={() => handlePayAgent(e)}
                                >
                                  <Banknote className="h-3 w-3 mr-1" /> Pay Agent
                                </Button>
                              )}
                              {e.bank_payment_voucher_no && (
                                <Badge variant="outline" className="text-[10px] bg-success/15 text-success border-success/30">
                                  Paid: {e.bank_payment_voucher_no}
                                </Badge>
                              )}
                              {!e.agent_invoice_status && (
                                <Button
                                  size="sm" variant="outline" className="h-7 text-[10px] px-2"
                                  onClick={() => {
                                    setAgentInvoiceId(e.id);
                                    setAgentInvNo(''); setAgentInvDate(todayISO());
                                    setAgentInvGross(''); setAgentInvGST('');
                                  }}
                                >
                                  Agent Inv
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasCN && (
                        <TableRow key={`${e.id}-cn`}>
                          <TableCell colSpan={13} className="bg-muted/30 p-3">
                            <p className="text-[11px] font-semibold mb-2">Credit Note Reversals</p>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-[10px]">CN No</TableHead>
                                  <TableHead className="text-[10px]">Date</TableHead>
                                  <TableHead className="text-[10px] text-right">CN Amount</TableHead>
                                  <TableHead className="text-[10px] text-right">Commission Reversed</TableHead>
                                  <TableHead className="text-[10px]">TDS</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {e.credit_note_refs.map(r => (
                                  <TableRow key={r.credit_note_id}>
                                    <TableCell className="text-[10px] font-mono">{r.credit_note_no}</TableCell>
                                    <TableCell className="text-[10px]">{r.credit_note_date}</TableCell>
                                    <TableCell className="text-[10px] text-right font-mono">{inrFmt.format(r.credit_note_amount)}</TableCell>
                                    <TableCell className="text-[10px] text-right font-mono">{inrFmt.format(r.commission_reversed)}</TableCell>
                                    <TableCell>
                                      {r.tds_reversal_entry_id ? (
                                        <Badge variant="outline" className="text-[9px] bg-success/15 text-success border-success/30">
                                          TDS Cancelled
                                        </Badge>
                                      ) : (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-700 border-amber-500/30 cursor-help">
                                              <AlertTriangle className="h-2.5 w-2.5 mr-1" /> Amend TDS
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            TDS challan already deposited — file 26Q amendment to reverse.
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableCell>
                        </TableRow>
                      )}
                      {agentInvoiceId === e.id && (
                        <TableRow key={`${e.id}-agent`}>
                          <TableCell colSpan={13} className="bg-orange-500/5 p-3">
                            <p className="text-[11px] font-semibold mb-2">Enter Agent GST Invoice</p>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                              <div>
                                <Label className="text-[10px]">Invoice No *</Label>
                                <Input value={agentInvNo} onChange={ev => setAgentInvNo(ev.target.value)} onKeyDown={onEnterNext} className="h-7 text-xs font-mono" />
                              </div>
                              <div>
                                <Label className="text-[10px]">Invoice Date</Label>
                                <SmartDateInput value={agentInvDate} onChange={setAgentInvDate} />
                              </div>
                              <div>
                                <Label className="text-[10px]">Gross Amount ₹ *</Label>
                                <Input type="number" value={agentInvGross} onChange={ev => setAgentInvGross(ev.target.value)} onKeyDown={onEnterNext} className="h-7 text-xs font-mono" />
                              </div>
                              <div>
                                <Label className="text-[10px]">GST Amount ₹</Label>
                                <Input type="number" value={agentInvGST} onChange={ev => setAgentInvGST(ev.target.value)} onKeyDown={onEnterNext} className="h-7 text-xs font-mono" />
                              </div>
                              <div className="flex items-end gap-1">
                                <Button data-primary size="sm" className="h-7 text-[10px] bg-orange-500 hover:bg-orange-600" onClick={() => handleSaveAgentInvoice(e, 'received')}>
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleSaveAgentInvoice(e, 'reconciled')}>
                                  Reconcile
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive" onClick={() => handleSaveAgentInvoice(e, 'disputed', 'Variance > 5%')}>
                                  Dispute
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setAgentInvoiceId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                            {Number(agentInvGross) > 0 && (() => {
                              const variance = round2(dSub(dSub(Number(agentInvGross), Number(agentInvGST)), e.commission_earned_to_date));
                              const variancePct = e.commission_earned_to_date > 0
                                ? Math.abs(variance / e.commission_earned_to_date) * 100 : 0;
                              return (
                                <p className={cn(
                                  'mt-2 text-[10px]',
                                  variancePct > 5 ? 'text-amber-700 font-semibold' : 'text-muted-foreground',
                                )}>
                                  Variance: ₹{inrFmt.format(variance)} ({variancePct.toFixed(2)}%)
                                  {variancePct > 5 && ' — review before reconciling'}
                                </p>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment dialog */}
      <Dialog open={!!active} onOpenChange={open => { if (!open) closePay(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-orange-500" />
              Record Receipt &amp; Commission
            </DialogTitle>
            <DialogDescription className="text-xs">
              {active && (
                <>Invoice <strong>{active.voucher_no}</strong> · {active.person_name}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {active && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Invoice Amount</p>
                  <p className="font-mono font-medium">{formatINR(active.invoice_amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Already Received</p>
                  <p className="font-mono font-medium">{formatINR(active.amount_received_to_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Commission</p>
                  <p className="font-mono font-medium">{formatINR(active.total_commission)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Earned to Date</p>
                  <p className="font-mono font-medium">{formatINR(active.commission_earned_to_date)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Payment Date</Label>
                  <SmartDateInput value={payDate} onChange={setPayDate} />
                </div>
                <div>
                  <Label className="text-xs">Receipt No</Label>
                  <Input
                    value={receiptNo}
                    onChange={e => setReceiptNo(e.target.value)}
                    onKeyDown={onEnterNext}
                    placeholder="RCPT/24-25/0001"
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Amount Received (₹) *</Label>
                <Input
                  type="number"
                  value={amountReceived}
                  onChange={e => setAmountReceived(e.target.value)}
                  onKeyDown={onEnterNext}
                  className="h-8 text-xs font-mono"
                />
              </div>

              {previewPayment && (
                <div className="rounded-md border border-orange-500/30 bg-orange-500/10 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Commission on this receipt</span>
                    <span className="font-mono font-medium">{formatINR(previewPayment.commissionOnReceipt)}</span>
                  </div>
                  {active.tds_applicable && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        TDS {active.tds_section} @ {active.tds_rate}%
                      </span>
                      <span className="font-mono font-medium text-destructive">
                        − {formatINR(previewPayment.tdsAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-orange-500/30 pt-1 mt-1">
                    <span className="font-medium">Net commission payable</span>
                    <span className="font-mono font-bold">{formatINR(previewPayment.netCommissionPaid)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closePay}>Cancel</Button>
            <Button
              size="sm"
              data-primary
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleLogPayment}
              disabled={!previewPayment}
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CommissionRegister(props: Props) {
  return <CommissionRegisterPanel {...props} />;
}
