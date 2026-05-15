/**
 * @file        src/pages/erp/servicedesk/service-tickets/ServiceTicketDetail.tsx
 * @purpose     Service ticket detail · 8-state machine · 4-Way Repair routing · Standby loan · OTP close
 * @sprint      T-Phase-1.C.1c · Block D.2
 * @iso        Usability + Functional Suitability + Reliability
 */
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Wrench, PackageOpen, ShieldCheck, Send, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  getServiceTicket,
  acknowledgeTicket,
  assignTicketToEngineer,
  startTicketWork,
  putTicketOnHold,
  markTicketResolved,
  closeTicket,
  reopenTicket,
  createRepairRoute,
  createStandbyLoan,
  createSparesIssue,
  listSparesForTicket,
  listRoutesForTicket,
  listStandbyLoansForTicket,
  generateOTPForTicketClose,
  verifyOTPForTicketClose,
} from '@/lib/servicedesk-engine';
import {
  emitServiceTicketToMaintainPro,
  emitSparesIssueToInventoryHub,
} from '@/lib/servicedesk-bridges';
import type { ServiceTicket } from '@/types/service-ticket';
import type { RepairRouteType } from '@/types/repair-route';
import { CustomerOutDialog } from './CustomerOutDialog';

interface Props {
  ticketId: string;
  onBack: () => void;
  autoOpenOTP?: boolean;
}

const ACTOR = 'desk_user';

export function ServiceTicketDetail({ ticketId, onBack, autoOpenOTP }: Props): JSX.Element {
  const [refreshKey, setRefreshKey] = useState(0);
  const ticket: ServiceTicket | null = useMemo(
    () => getServiceTicket(ticketId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ticketId, refreshKey],
  );
  const refresh = (): void => setRefreshKey((k) => k + 1);

  const [holdOpen, setHoldOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [engineerId, setEngineerId] = useState('');
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpGenerated, setOtpGenerated] = useState<string | null>(null);
  const [routeOpen, setRouteOpen] = useState(false);
  const [routeType, setRouteType] = useState<RepairRouteType>('in_house');
  const [routePartner, setRoutePartner] = useState('');
  const [routeCost, setRouteCost] = useState('0');
  const [standbyOpen, setStandbyOpen] = useState(false);
  const [standbySerial, setStandbySerial] = useState('');
  const [standbyModel, setStandbyModel] = useState('');
  const [standbyExp, setStandbyExp] = useState('');
  const [standbyDaily, setStandbyDaily] = useState('0');
  const [spareName, setSpareName] = useState('');
  const [spareQty, setSpareQty] = useState('1');
  const [spareCost, setSpareCost] = useState('0');
  const [spareBillable, setSpareBillable] = useState(true);
  const [coOpen, setCoOpen] = useState(false);

  useEffect(() => {
    if (autoOpenOTP && ticket && ticket.status === 'resolved') {
      setOtpOpen(true);
    }
  }, [autoOpenOTP, ticket]);

  if (!ticket) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <Card className="p-12 mt-4 text-center text-muted-foreground">Ticket not found.</Card>
      </div>
    );
  }

  const handleAck = (): void => { acknowledgeTicket(ticket.id, ACTOR); toast.success('Acknowledged'); refresh(); };
  const handleAssign = (): void => {
    if (!engineerId.trim()) return;
    assignTicketToEngineer(ticket.id, engineerId.trim(), ACTOR);
    setAssignOpen(false); setEngineerId(''); toast.success('Assigned'); refresh();
  };
  const handleStart = (): void => { startTicketWork(ticket.id, ACTOR); toast.success('Work started'); refresh(); };
  const handleHold = (): void => {
    putTicketOnHold(ticket.id, ACTOR, holdReason);
    setHoldOpen(false); setHoldReason(''); toast.success('On hold'); refresh();
  };
  const handleResolve = (): void => { markTicketResolved(ticket.id, ACTOR); toast.success('Resolved'); refresh(); };
  const handleOpenOTP = (): void => {
    const { otp } = generateOTPForTicketClose(ticket.id);
    setOtpGenerated(otp); setOtpOpen(true);
  };
  const handleClose = (): void => {
    const verified = verifyOTPForTicketClose(ticket.id, otpValue);
    if (!verified) { toast.error('Invalid OTP'); return; }
    try {
      closeTicket(ticket.id, ACTOR, true);
      toast.success('Ticket closed');
      setOtpOpen(false); setOtpValue(''); setOtpGenerated(null); refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  const handleReopen = (): void => {
    reopenTicket(ticket.id, ACTOR, reopenReason);
    setReopenOpen(false); setReopenReason(''); toast.success('Reopened'); refresh();
  };

  const handleRoute = (): void => {
    if (!routePartner.trim()) { toast.error('Partner required'); return; }
    const route = createRepairRoute({
      entity_id: ticket.entity_id,
      ticket_id: ticket.id,
      route_type: routeType,
      route_partner_id: routePartner.trim(),
      partner_name: routePartner.trim(),
      repair_out_at: new Date().toISOString(),
      expected_return_at: null,
      cost_paise: roundTo(dMul(Number(routeCost), 100), 0),
      rejection_reason: '',
      notes: '',
      created_by: ACTOR,
    });
    if (routeType === 'in_house') {
      emitServiceTicketToMaintainPro({
        service_ticket_id: ticket.id,
        service_ticket_no: ticket.ticket_no,
        customer_id: ticket.customer_id,
        equipment_serial: '',
        category: ticket.call_type_code,
        severity: ticket.severity,
      });
    }
    setRouteOpen(false); setRoutePartner(''); setRouteCost('0');
    toast.success(`Routed to ${route.route_type}`); refresh();
  };

  const handleStandby = (): void => {
    if (!standbySerial.trim() || !standbyExp) { toast.error('Serial + return date required'); return; }
    createStandbyLoan({
      entity_id: ticket.entity_id,
      ticket_id: ticket.id,
      customer_id: ticket.customer_id,
      loaner_serial: standbySerial.trim(),
      loaner_model: standbyModel.trim(),
      loaned_out_at: new Date().toISOString(),
      expected_return_date: standbyExp,
      daily_cost_paise: roundTo(dMul(Number(standbyDaily), 100), 0),
      notes: '',
      created_by: ACTOR,
    });
    setStandbyOpen(false); setStandbySerial(''); setStandbyModel(''); setStandbyExp(''); setStandbyDaily('0');
    toast.success('Standby loan issued'); refresh();
  };

  const handleAddSpare = (): void => {
    if (!spareName.trim()) { toast.error('Spare name required'); return; }
    const qty = Number(spareQty);
    const unit = roundTo(dMul(Number(spareCost), 100), 0);
    const issue = createSparesIssue({
      entity_id: ticket.entity_id,
      ticket_id: ticket.id,
      spare_id: spareName.trim(),
      spare_name: spareName.trim(),
      qty,
      unit_cost_paise: unit,
      total_cost_paise: qty * unit,
      engineer_id: ticket.assigned_engineer_id ?? ACTOR,
      van_stock_id: null,
      billable_to_customer: spareBillable,
      issued_at: new Date().toISOString(),
    });
    emitSparesIssueToInventoryHub({
      spares_issue_id: issue.id,
      spare_id: issue.spare_id,
      qty: issue.qty,
      engineer_id: issue.engineer_id,
    });
    setSpareName(''); setSpareQty('1'); setSpareCost('0');
    toast.success('Spare issued'); refresh();
  };

  const spares = listSparesForTicket(ticket.id, ticket.entity_id);
  const routes = listRoutesForTicket(ticket.id, ticket.entity_id);
  const loans = listStandbyLoansForTicket(ticket.id, ticket.entity_id);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <h1 className="text-2xl font-bold font-mono">{ticket.ticket_no}</h1>
        <Badge variant="secondary">{ticket.status.replace(/_/g, ' ')}</Badge>
        <Badge variant="outline">{ticket.severity}</Badge>
        <Badge variant="outline">{ticket.channel}</Badge>
      </div>

      <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><Label className="text-xs text-muted-foreground">Customer</Label><div>{ticket.customer_id}</div></div>
        <div><Label className="text-xs text-muted-foreground">Call type</Label><div>{ticket.call_type_code}</div></div>
        <div><Label className="text-xs text-muted-foreground">Engineer</Label><div>{ticket.assigned_engineer_id ?? '—'}</div></div>
        <div><Label className="text-xs text-muted-foreground">SLA timer</Label><div className="font-mono">{ticket.flash_timer_minutes_remaining}m remaining</div></div>
        <div className="col-span-2 md:col-span-4"><Label className="text-xs text-muted-foreground">Description</Label><p className="text-sm">{ticket.description || '—'}</p></div>
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Lifecycle Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={ticket.status !== 'raised'} onClick={handleAck}>Acknowledge</Button>
          <Button size="sm" disabled={ticket.status !== 'acknowledged'} onClick={() => setAssignOpen(true)}>Assign Engineer</Button>
          <Button size="sm" disabled={ticket.status !== 'assigned'} onClick={handleStart}>Start Work</Button>
          <Button size="sm" variant="outline" disabled={ticket.status !== 'in_progress'} onClick={() => setHoldOpen(true)}>Put On Hold</Button>
          <Button size="sm" disabled={ticket.status !== 'in_progress' && ticket.status !== 'on_hold'} onClick={handleResolve}>Mark Resolved</Button>
          <Button size="sm" variant="default" disabled={ticket.status !== 'resolved'} onClick={handleOpenOTP}>
            <ShieldCheck className="h-4 w-4 mr-2" /> Close (OTP)
          </Button>
          <Button size="sm" variant="outline" disabled={ticket.status !== 'closed'} onClick={() => setReopenOpen(true)}>Reopen</Button>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Wrench className="h-4 w-4" /> 4-Way Repair Routing</h2>
          <Button size="sm" variant="outline" onClick={() => setRouteOpen(true)}>Route for Repair</Button>
        </div>
        {routes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No repair routes.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {routes.map((r) => (
              <li key={r.id} className="flex justify-between border-b pb-1">
                <span><Badge variant="secondary" className="mr-2">{r.route_type}</Badge>{r.partner_name}</span>
                <span className="font-mono text-xs">{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><PackageOpen className="h-4 w-4" /> Standby Loan</h2>
          <Button size="sm" variant="outline" onClick={() => setStandbyOpen(true)}>Issue Standby</Button>
        </div>
        {loans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No standby loans.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {loans.map((l) => (
              <li key={l.id} className="flex justify-between border-b pb-1">
                <span className="font-mono text-xs">{l.loaner_serial}</span>
                <span className="text-xs">{l.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Spares Consumed</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <div><Label className="text-xs">Spare</Label><Input value={spareName} onChange={(e) => setSpareName(e.target.value)} /></div>
          <div><Label className="text-xs">Qty</Label><Input type="number" value={spareQty} onChange={(e) => setSpareQty(e.target.value)} /></div>
          <div><Label className="text-xs">Unit ₹</Label><Input type="number" value={spareCost} onChange={(e) => setSpareCost(e.target.value)} /></div>
          <div className="flex items-center gap-2 pb-2">
            <input type="checkbox" id="bill" checked={spareBillable} onChange={(e) => setSpareBillable(e.target.checked)} />
            <Label htmlFor="bill" className="text-xs">Billable</Label>
          </div>
          <Button size="sm" onClick={handleAddSpare}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </div>
        {spares.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spares issued.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {spares.map((s) => (
              <li key={s.id} className="flex justify-between border-b pb-1">
                <span>{s.spare_name} × {s.qty}</span>
                <span className="font-mono text-xs">₹{(s.total_cost_paise / 100).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Customer-Out Voucher</h2>
          <Button size="sm" disabled={ticket.status !== 'resolved' && ticket.status !== 'closed'} onClick={() => setCoOpen(true)}>Open Wizard</Button>
        </div>
        {ticket.customer_out_voucher_id && (
          <p className="text-sm text-muted-foreground font-mono">{ticket.customer_out_voucher_id}</p>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <h2 className="font-semibold">Audit Trail</h2>
        <ul className="text-xs space-y-1 max-h-64 overflow-y-auto">
          {ticket.audit_trail.map((a, i) => (
            <li key={`${a.at}-${i}`} className="flex gap-2 border-b pb-1">
              <span className="font-mono text-muted-foreground">{a.at}</span>
              <span>{a.action}</span>
              <span className="text-muted-foreground">by {a.by}</span>
              {a.reason && <span className="text-muted-foreground italic">· {a.reason}</span>}
            </li>
          ))}
        </ul>
      </Card>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Engineer</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Engineer ID</Label>
            <Input value={engineerId} onChange={(e) => setEngineerId(e.target.value)} placeholder="eng_001" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Put On Hold</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea value={holdReason} onChange={(e) => setHoldReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldOpen(false)}>Cancel</Button>
            <Button onClick={handleHold}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reopen Ticket</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenOpen(false)}>Cancel</Button>
            <Button onClick={handleReopen}>Reopen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={otpOpen} onOpenChange={setOtpOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>HappyCode Channel 1 · OTP Close Gate</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {otpGenerated && (
              <p className="text-xs text-muted-foreground">Demo OTP (would be sent via WhatsApp): <span className="font-mono">{otpGenerated}</span></p>
            )}
            <Label>Enter OTP</Label>
            <Input value={otpValue} onChange={(e) => setOtpValue(e.target.value)} maxLength={6} className="font-mono" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOtpOpen(false)}>Cancel</Button>
            <Button onClick={handleClose}>Verify & Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={routeOpen} onOpenChange={setRouteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>4-Way Repair Routing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Route Type</Label>
              <Select value={routeType} onValueChange={(v) => setRouteType(v as RepairRouteType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_house">In-House (MaintainPro)</SelectItem>
                  <SelectItem value="manufacturer">Manufacturer</SelectItem>
                  <SelectItem value="third_party">Third Party</SelectItem>
                  <SelectItem value="service_centre">Service Centre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Partner</Label><Input value={routePartner} onChange={(e) => setRoutePartner(e.target.value)} /></div>
            <div><Label>Cost Estimate ₹</Label><Input type="number" value={routeCost} onChange={(e) => setRouteCost(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRouteOpen(false)}>Cancel</Button>
            <Button onClick={handleRoute}>Route</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={standbyOpen} onOpenChange={setStandbyOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Standby Loan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Loaner Serial</Label><Input value={standbySerial} onChange={(e) => setStandbySerial(e.target.value)} /></div>
            <div><Label>Model</Label><Input value={standbyModel} onChange={(e) => setStandbyModel(e.target.value)} /></div>
            <div><Label>Expected Return</Label><Input type="date" value={standbyExp} onChange={(e) => setStandbyExp(e.target.value)} /></div>
            <div><Label>Daily Cost ₹</Label><Input type="number" value={standbyDaily} onChange={(e) => setStandbyDaily(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStandbyOpen(false)}>Cancel</Button>
            <Button onClick={handleStandby}>Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerOutDialog
        open={coOpen}
        onClose={() => setCoOpen(false)}
        ticket={ticket}
        onCreated={() => { refresh(); }}
      />
    </div>
  );
}
