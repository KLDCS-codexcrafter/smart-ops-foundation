/**
 * @file        src/pages/erp/servicedesk/service-tickets/ServiceTicketRaise.tsx
 * @purpose     Desktop 5-step intake wizard · Customer-In voucher creation · ticket raise
 * @sprint      T-Phase-1.C.1c · Block D.3
 * @iso        Usability + Functional Suitability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  listActiveCallTypes,
  raiseServiceTicket,
  createCustomerInVoucher,
} from '@/lib/servicedesk-engine';
import type {
  ServiceTicketChannel,
  ServiceTicketSeverity,
} from '@/types/service-ticket';
import type { WarrantyStatus } from '@/types/customer-voucher';

interface Props {
  onDone: () => void;
}

const ENTITY = 'OPRX';
const BRANCH = 'BR-1';
const ACTOR = 'desk_user';

export function ServiceTicketRaise({ onDone }: Props): JSX.Element {
  const [step, setStep] = useState(1);
  const [customerId, setCustomerId] = useState('');
  const [amcId, setAmcId] = useState('');
  const [callType, setCallType] = useState('');
  const [severity, setSeverity] = useState<ServiceTicketSeverity>('sev3_medium');
  const [channel, setChannel] = useState<ServiceTicketChannel>('phone');
  const [description, setDescription] = useState('');
  const [serial, setSerial] = useState('');
  const [internalNo, setInternalNo] = useState('');
  const [warranty, setWarranty] = useState<WarrantyStatus>('out_of_warranty');
  const [conditionNotes, setConditionNotes] = useState('');

  const callTypes = listActiveCallTypes();

  const next = (): void => setStep((s) => Math.min(5, s + 1));
  const prev = (): void => setStep((s) => Math.max(1, s - 1));

  const submit = (): void => {
    if (!customerId.trim() || !callType) {
      toast.error('Customer + call type required');
      return;
    }
    const cin = createCustomerInVoucher({
      entity_id: ENTITY,
      branch_id: BRANCH,
      ticket_id: '',
      serial: serial.trim(),
      internal_no: internalNo.trim(),
      warranty_status_at_intake: warranty,
      condition_notes: conditionNotes,
      photos: [],
      received_by: ACTOR,
      received_at: new Date().toISOString(),
    });
    raiseServiceTicket({
      entity_id: ENTITY,
      branch_id: BRANCH,
      customer_id: customerId.trim(),
      amc_record_id: amcId.trim() || null,
      call_type_code: callType,
      channel,
      severity,
      description,
      sla_response_due_at: null,
      sla_resolution_due_at: null,
      flash_timer_minutes_remaining: 240,
      escalation_level: 0,
      assigned_engineer_id: null,
      repair_route_id: null,
      standby_loan_id: null,
      customer_in_voucher_id: cin.id,
      customer_out_voucher_id: null,
      happy_code_otp_verified: false,
      happy_code_feedback_id: null,
      spares_consumed: [],
      photos: [],
      created_by: ACTOR,
    });
    toast.success('Ticket raised');
    onDone();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <h1 className="text-2xl font-bold">Raise Ticket · Step {step} of 5</h1>
      </div>

      <Card className="p-6 space-y-4">
        {step === 1 && (
          <div className="space-y-3">
            <div><Label>Customer ID</Label><Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="C-001" /></div>
            <div><Label>AMC Record (optional)</Label><Input value={amcId} onChange={(e) => setAmcId(e.target.value)} placeholder="amc_xyz" /></div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <div>
              <Label>Call Type</Label>
              <Select value={callType} onValueChange={setCallType}>
                <SelectTrigger><SelectValue placeholder="Pick call type" /></SelectTrigger>
                <SelectContent>
                  {callTypes.map((ct) => <SelectItem key={ct.id} value={ct.call_type_code}>{ct.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as ServiceTicketSeverity)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sev1_critical">Sev1 Critical</SelectItem>
                  <SelectItem value="sev2_high">Sev2 High</SelectItem>
                  <SelectItem value="sev3_medium">Sev3 Medium</SelectItem>
                  <SelectItem value="sev4_low">Sev4 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as ServiceTicketChannel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="walkin">Walk-in</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="auto_pms">Auto-PMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <div><Label>Description</Label><Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">{/* [JWT] photo upload Phase 2 */}Photos: capture wired in Phase 2.</p>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm">Customer-In Voucher</h2>
            <div><Label>Serial Number</Label><Input value={serial} onChange={(e) => setSerial(e.target.value)} /></div>
            <div><Label>Internal Number</Label><Input value={internalNo} onChange={(e) => setInternalNo(e.target.value)} /></div>
            <div>
              <Label>Warranty Status at Intake</Label>
              <Select value={warranty} onValueChange={(v) => setWarranty(v as WarrantyStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_warranty">In Warranty</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="oem_warranty_only">OEM Warranty Only</SelectItem>
                  <SelectItem value="amc_covered">AMC Covered</SelectItem>
                  <SelectItem value="out_of_warranty">Out of Warranty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Condition Notes</Label><Textarea rows={3} value={conditionNotes} onChange={(e) => setConditionNotes(e.target.value)} /></div>
          </div>
        )}
        {step === 5 && (
          <div className="text-sm space-y-1">
            <p className="font-semibold">Review</p>
            <p>Customer: {customerId}</p>
            <p>Call type: {callType}</p>
            <p>Severity: {severity}</p>
            <p>Channel: {channel}</p>
            <p>Serial: {serial || '—'}</p>
            <p>Warranty: {warranty}</p>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" size="sm" onClick={prev} disabled={step === 1}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          {step < 5 ? (
            <Button size="sm" onClick={next}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <Button size="sm" onClick={submit}><Check className="h-4 w-4 mr-1" /> Submit</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
