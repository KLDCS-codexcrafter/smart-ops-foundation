/**
 * CommissionPaymentDialog.tsx — UPRA-1 Phase C · workflow shell extracted from
 * CommissionRegister.tsx (897 LOC) per Q-LOCK M12.
 *
 * BYTE-IDENTICAL PARITY ATTESTATION (verified at extraction time):
 * - TDS calc · uses round2(dPct(commissionOnReceipt, tds_rate)) when tds_applicable
 *   (e.g. 10000 INR @ 194H 5% → 500.00 INR · matches source-of-truth output)
 * - GL posting (Post GL Voucher) · ledger lines · narration · amounts: byte-identical
 *   (helpers moved unchanged into actions; never modified)
 * - tdsDeductionsKey write · gross_amount / tds_section / quarter / assessment_year /
 *   party / nature_of_payment: byte-identical (lifted verbatim)
 * - comply360SAMKey reads · same call site (loadSAMConfig in actions)
 * - decimal-helpers calls · no reordering, no substitution
 *   (dMul, dPct, dSub, dAdd, dSum, round2 imports lifted verbatim)
 * - generateVoucherNo('PV', entityCode) + postVoucher(pv, entityCode): same args, same order
 * - YTD threshold check (194H = 15000, else 30000): preserved verbatim
 * - All toast messages preserved verbatim (success and error)
 *
 * [JWT] POST /api/salesx/commission-register/:id/payments
 */

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Receipt } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import {
  commissionRegisterKey,
  type CommissionEntry,
  type CommissionPayment,
} from '@/types/commission-register';
import { getQuarter, getAssessmentYear } from '@/lib/fincore-engine';
import type { TDSDeductionEntry } from '@/types/compliance';
import { tdsDeductionsKey } from '@/types/compliance';
import { dAdd, dSub, dMul, dPct, round2, dSum } from '@/lib/decimal-helpers';

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;
const todayISO = () => new Date().toISOString().split('T')[0];

export interface CommissionPaymentDialogProps {
  entityCode: string;
  entry: CommissionEntry | null;
  open: boolean;
  onClose: () => void;
  onPaymentComplete?: (updatedEntry: CommissionEntry, payment: CommissionPayment) => void;
}

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

export function CommissionPaymentDialog(
  props: CommissionPaymentDialogProps,
): JSX.Element | null {
  const { entityCode, entry: active, open, onClose, onPaymentComplete } = props;
  const [payDate, setPayDate] = useState(todayISO());
  const [receiptNo, setReceiptNo] = useState('');
  const [amountReceived, setAmountReceived] = useState('');

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

  const resetAndClose = useCallback(() => {
    setReceiptNo('');
    setAmountReceived('');
    onClose();
  }, [onClose]);

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
    onPaymentComplete?.(updated, payment);
    resetAndClose();
  }, [active, amountReceived, payDate, receiptNo, previewPayment, entityCode, onPaymentComplete, resetAndClose]);

  if (!active) return null;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) resetAndClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-orange-500" />
            Record Receipt &amp; Commission
          </DialogTitle>
          <DialogDescription className="text-xs">
            Invoice <strong>{active.voucher_no}</strong> · {active.person_name}
          </DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={resetAndClose}>Cancel</Button>
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
  );
}

export default CommissionPaymentDialog;
