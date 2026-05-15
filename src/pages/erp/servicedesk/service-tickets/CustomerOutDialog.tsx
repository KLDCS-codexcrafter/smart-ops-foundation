/**
 * @file        src/pages/erp/servicedesk/service-tickets/CustomerOutDialog.tsx
 * @purpose     Customer-Out 5-step wizard · Circle 1-10 · final invoice emit
 * @sprint      T-Phase-1.C.1c · Block D.4
 * @iso        Usability + Functional Suitability
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
// Precision Arc · Stage 3B · Block 4c — paise integer-domain conversion (rupees->paise).
import { roundTo, dMul } from '@/lib/decimal-helpers';
import { createCustomerOutVoucher } from '@/lib/servicedesk-engine';
import { emitFinalInvoiceToFinCore } from '@/lib/servicedesk-bridges';
import type { ServiceTicket } from '@/types/service-ticket';
import type { PaymentMethod } from '@/types/customer-voucher';

interface Props {
  open: boolean;
  onClose: () => void;
  ticket: ServiceTicket;
  onCreated: () => void;
}

const ACTOR = 'desk_user';

export function CustomerOutDialog({ open, onClose, ticket, onCreated }: Props): JSX.Element {
  const [step, setStep] = useState(1);
  const [resolution, setResolution] = useState('');
  const [oldSerial, setOldSerial] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [readings, setReadings] = useState<string[]>(Array(10).fill('0'));
  const [chargesRupees, setChargesRupees] = useState('0');
  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [deliveredTo, setDeliveredTo] = useState('');
  const [trainingAck, setTrainingAck] = useState(false); // S33 Customer Training Ack

  const next = (): void => setStep((s) => Math.min(5, s + 1));
  const prev = (): void => setStep((s) => Math.max(1, s - 1));

  const submit = (): void => {
    const charges_paise = roundTo(dMul(Number(chargesRupees), 100), 0);
    const voucher = createCustomerOutVoucher({
      entity_id: ticket.entity_id,
      branch_id: ticket.branch_id,
      ticket_id: ticket.id,
      resolution_summary: resolution,
      old_serial: oldSerial,
      new_serial: newSerial || oldSerial,
      circle_readings: readings.map((r) => Number(r) || 0),
      spares_consumed_summary: '',
      charges_paise,
      paid,
      payment_method: paid ? paymentMethod : null,
      delivered_to: deliveredTo,
      delivered_at: new Date().toISOString(),
      acknowledgement_signed: trainingAck,
      acknowledgement_signature_url: null,
      created_by: ACTOR,
    });
    if (charges_paise > 0) {
      emitFinalInvoiceToFinCore({
        service_ticket_id: ticket.id,
        customer_out_voucher_id: voucher.id,
        entity_id: ticket.entity_id,
        branch_id: ticket.branch_id,
        voucher_type_id: 'vt-customer-out',
        amount_paise: charges_paise,
      });
    }
    toast.success(`Customer-Out ${voucher.voucher_no} created`);
    onCreated();
    onClose();
    setStep(1);
  };

  const updateReading = (i: number, v: string): void => {
    setReadings((prev) => prev.map((r, idx) => (idx === i ? v : r)));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Customer-Out · Step {step} of 5</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {step === 1 && (
            <div><Label>Resolution Summary</Label><Textarea rows={4} value={resolution} onChange={(e) => setResolution(e.target.value)} /></div>
          )}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Old Serial</Label><Input value={oldSerial} onChange={(e) => setOldSerial(e.target.value)} /></div>
              <div><Label>New Serial (if replaced)</Label><Input value={newSerial} onChange={(e) => setNewSerial(e.target.value)} /></div>
            </div>
          )}
          {step === 3 && (
            <div>
              <Label>Circle Readings 1-10</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {readings.map((r, i) => (
                  <div key={`circle-${i}`}>
                    <Label className="text-xs">C{i + 1}</Label>
                    <Input type="number" value={r} onChange={(e) => updateReading(i, e.target.value)} className="font-mono" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-3">
              <div><Label>Charges ₹</Label><Input type="number" value={chargesRupees} onChange={(e) => setChargesRupees(e.target.value)} /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="paid" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
                <Label htmlFor="paid">Paid</Label>
              </div>
              {paid && (
                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="on_amc">On AMC</SelectItem>
                      <SelectItem value="on_account">On Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          {step === 5 && (
            <div className="space-y-2">
              <div><Label>Delivered To</Label><Input value={deliveredTo} onChange={(e) => setDeliveredTo(e.target.value)} /></div>
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                <input
                  type="checkbox"
                  id="training-ack"
                  checked={trainingAck}
                  onChange={(e) => setTrainingAck(e.target.checked)}
                />
                <Label htmlFor="training-ack" className="text-sm">
                  Customer trained on operation &amp; care · acknowledgement captured (S33)
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">{/* [JWT] signature pad Phase 2 */}Signature capture wired in Phase 2.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={prev} disabled={step === 1}><ArrowLeft className="h-4 w-4 mr-1" /> Prev</Button>
          {step < 5 ? (
            <Button size="sm" onClick={next}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <Button size="sm" onClick={submit}><Check className="h-4 w-4 mr-1" /> Submit</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
