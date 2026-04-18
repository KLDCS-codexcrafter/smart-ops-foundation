/**
 * CommissionRegister.tsx — SAM commission payable register
 * Allows logging a receipt-based commission payment with TDS write-back.
 * [JWT] GET /api/salesx/commission-register
 * [JWT] POST /api/salesx/commission-register/:id/payments
 */
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Wallet, Search, Receipt, FileCheck, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import {
  commissionRegisterKey,
} from '@/types/commission-register';
import type { CommissionEntry, CommissionPayment } from '@/types/commission-register';
import { getQuarter, getAssessmentYear, generateVoucherNo, postVoucher } from '@/lib/finecore-engine';
import type { TDSDeductionEntry } from '@/types/compliance';
import { tdsDeductionsKey } from '@/types/compliance';
import { computeCommissionGL } from '@/lib/commission-engine';
import { comply360SAMKey } from '@/pages/erp/accounting/Comply360Config';
import type { SAMConfig } from '@/pages/erp/accounting/Comply360Config';
import type { Voucher } from '@/types/voucher';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    const commissionOnReceipt = +(active.total_commission * ratio).toFixed(2);
    const tdsAmount = active.tds_applicable
      ? +(commissionOnReceipt * active.tds_rate / 100).toFixed(2)
      : 0;
    const netCommissionPaid = +(commissionOnReceipt - tdsAmount).toFixed(2);
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
      const ytdGross = allTDS
        .filter(t =>
          t.party_id === active.person_id &&
          t.tds_section === active.tds_section &&
          t.assessment_year === currentAY &&
          t.status !== 'cancelled'
        )
        .reduce((s, t) => s + t.gross_amount, 0);

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
      +(updated.amount_received_to_date + amt).toFixed(2);
    updated.commission_earned_to_date =
      +(updated.commission_earned_to_date + previewPayment.commissionOnReceipt).toFixed(2);
    updated.tds_deducted_to_date =
      +(updated.tds_deducted_to_date + previewPayment.tdsAmount).toFixed(2);
    updated.net_paid_to_date =
      +(updated.net_paid_to_date + previewPayment.netCommissionPaid).toFixed(2);
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
                  <TableHead className="text-xs">Invoice</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">SAM Person</TableHead>
                  <TableHead className="text-xs text-right">Invoice ₹</TableHead>
                  <TableHead className="text-xs text-right">Commission ₹</TableHead>
                  <TableHead className="text-xs text-right">Received ₹</TableHead>
                  <TableHead className="text-xs text-right">Net Paid ₹</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => (
                  <TableRow key={e.id}>
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
                    <TableCell className="text-xs text-right font-mono">{inrFmt.format(e.invoice_amount)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{inrFmt.format(e.total_commission)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{inrFmt.format(e.amount_received_to_date)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{inrFmt.format(e.net_paid_to_date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px] capitalize', STATUS_COLOR[e.status])}>
                        {e.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(e.status === 'pending' || e.status === 'partial') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => openPay(e)}
                        >
                          <Wallet className="h-3 w-3 mr-1" /> Log
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
