/**
 * @file     JobCardEntry.tsx
 * @sprint   T-Phase-1.3-3-PlantOps-pre-2 · Block H · D-585 · Q30=a
 * @purpose  Job Card transaction · operator × machine × shift × PO with start/end timestamps.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Save, Play, Square, Pause, RotateCw, X, ExternalLink } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useFactories } from '@/hooks/useFactories';
import { useWorkCenters } from '@/hooks/useWorkCenters';
import { useMachines } from '@/hooks/useMachines';
import { useEmployees } from '@/hooks/useEmployees';
import { useShifts } from '@/hooks/usePayHubMasters3';
import { useJobCards } from '@/hooks/useJobCards';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  createJobCard, startJobCard, completeJobCard, holdJobCard, resumeJobCard, cancelJobCard,
} from '@/lib/job-card-engine';
import type { JobCard, JobCardWastageReason } from '@/types/job-card';

const WASTAGE_REASONS: { value: string; label: string }[] = [
  { value: '__none__', label: 'None' },
  { value: 'setup', label: 'Setup' },
  { value: 'breakdown', label: 'Breakdown' },
  { value: 'quality_failure', label: 'Quality Failure' },
  { value: 'material_shortage', label: 'Material Shortage' },
  { value: 'rework', label: 'Rework' },
  { value: 'other', label: 'Other' },
];

export function JobCardEntryPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { orders } = useProductionOrders();
  const { factories } = useFactories();
  const { workCenters } = useWorkCenters();
  const { machines } = useMachines();
  const { employees } = useEmployees();
  const { shifts } = useShifts();
  const { allJobCards, reload } = useJobCards();

  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo<JobCard | undefined>(
    () => allJobCards.find(j => j.id === editingId),
    [allJobCards, editingId],
  );

  const [factoryId, setFactoryId] = useState('');
  const [workCenterId, setWorkCenterId] = useState('');
  const [machineId, setMachineId] = useState('');
  const [poId, setPoId] = useState('');
  const [poLineId, setPoLineId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [scheduledStart, setScheduledStart] = useState(new Date().toISOString().slice(0, 16));
  const [scheduledEnd, setScheduledEnd] = useState(
    new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 16),
  );
  const [plannedQty, setPlannedQty] = useState('');
  const [uom, setUom] = useState('units');
  const [remarks, setRemarks] = useState('');

  // Output capture (clock-out)
  const [producedQty, setProducedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('0');
  const [reworkQty, setReworkQty] = useState('0');
  const [wastageQty, setWastageQty] = useState('0');
  const [wastageReason, setWastageReason] = useState('__none__');
  const [wastageNotes, setWastageNotes] = useState('');
  const [breakdownNotes, setBreakdownNotes] = useState('');

  const releasedPOs = useMemo(
    () => orders.filter(o => o.status === 'released' || o.status === 'in_progress'),
    [orders],
  );
  const selectedPO = useMemo(() => releasedPOs.find(p => p.id === poId), [releasedPOs, poId]);
  const filteredWCs = useMemo(
    () => workCenters.filter(w => !factoryId || w.factory_id === factoryId),
    [workCenters, factoryId],
  );
  const filteredMachines = useMemo(
    () => machines.filter(m =>
      (!factoryId || m.factory_id === factoryId) &&
      (!workCenterId || m.work_center_id === workCenterId),
    ),
    [machines, factoryId, workCenterId],
  );
  const operators = useMemo(() => employees.filter(e => e.is_production_operator), [employees]);

  const resetForm = (): void => {
    setEditingId(null);
    setPoId(''); setPoLineId(''); setEmployeeId(''); setShiftId('');
    setMachineId(''); setWorkCenterId('');
    setPlannedQty(''); setRemarks('');
    setProducedQty(''); setRejectedQty('0'); setReworkQty('0');
    setWastageQty('0'); setWastageReason('__none__'); setWastageNotes(''); setBreakdownNotes('');
  };

  const handlePlan = (): void => {
    const machine = machines.find(m => m.id === machineId);
    const employee = operators.find(e => e.id === employeeId);
    const po = releasedPOs.find(p => p.id === poId);
    const shift = shifts.find(s => s.id === shiftId);
    if (!machine || !employee || !po || !shift) {
      toast.error('Select factory · work center · machine · operator · PO · shift');
      return;
    }
    if (!plannedQty || parseFloat(plannedQty) <= 0) {
      toast.error('Planned qty must be > 0');
      return;
    }
    try {
      const isCert = (employee.certified_machine_ids ?? []).includes(machine.id);
      if (!isCert) toast.warning(`Operator not certified on ${machine.code} · proceeding`);
      const jc = createJobCard({
        entity_id: entityCode,
        factory_id: factoryId || machine.factory_id,
        work_center_id: workCenterId || machine.work_center_id,
        machine,
        production_order: po,
        production_order_line_id: poLineId || null,
        employee,
        shift,
        scheduled_start: new Date(scheduledStart).toISOString(),
        scheduled_end: new Date(scheduledEnd).toISOString(),
        planned_qty: parseFloat(plannedQty),
        uom,
        remarks,
        created_by: user?.name ?? 'system',
      });
      toast.success(`Job Card ${jc.doc_no} planned`);
      reload();
      resetForm();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const userCtx = { id: user?.id ?? 'system', name: user?.name ?? 'system' };

  const handleStart = (): void => {
    if (!editing) return;
    try {
      startJobCard(editing, userCtx);
      toast.success('Clocked in');
      reload();
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleComplete = (): void => {
    if (!editing) return;
    const machine = machines.find(m => m.id === editing.machine_id);
    const emp = employees.find(e => e.id === editing.employee_id);
    try {
      completeJobCard(editing, {
        produced_qty: parseFloat(producedQty) || 0,
        rejected_qty: parseFloat(rejectedQty) || 0,
        rework_qty: parseFloat(reworkQty) || 0,
        wastage_qty: parseFloat(wastageQty) || 0,
        wastage_reason: (wastageReason === '__none__' ? null : wastageReason) as JobCardWastageReason,
        wastage_notes: wastageNotes,
        remarks,
        employee_hourly_rate: emp?.hourly_rate_production ?? 0,
        machine_hourly_rate: machine?.hourly_run_cost ?? 0,
      }, userCtx);
      toast.success('Clocked out · DWR updated');
      reload();
      resetForm();
    } catch (e) { toast.error((e as Error).message); }
  };

  const handleHold = (): void => {
    if (!editing) return;
    try { holdJobCard(editing, userCtx, breakdownNotes || 'Held'); toast.success('On hold'); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const handleResume = (): void => {
    if (!editing) return;
    try { resumeJobCard(editing, userCtx); toast.success('Resumed'); reload(); }
    catch (e) { toast.error((e as Error).message); }
  };
  const handleCancel = (): void => {
    if (!editing) return;
    try { cancelJobCard(editing, userCtx, remarks || 'Cancelled'); toast.success('Cancelled'); reload(); resetForm(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="p-6 space-y-4">
      <button
        type="button"
        onClick={() => navigate('/erp/command-center?module=finecore-production-config')}
        className="w-full text-left rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground hover:bg-muted/60 flex items-center justify-between"
      >
        <span>ⓘ Job Card settings live in Command Center → Production Configuration</span>
        <ExternalLink className="h-3 w-3" />
      </button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Job Card Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Open existing Job Card</Label>
              <Select value={editingId ?? '__new__'} onValueChange={v => setEditingId(v === '__new__' ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">— New —</SelectItem>
                  {allJobCards.slice().reverse().slice(0, 50).map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.doc_no} · {j.status} · {j.employee_code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editing && (
              <div className="col-span-2 flex items-center gap-2">
                <Badge variant="outline">{editing.doc_no}</Badge>
                <Badge>{editing.status}</Badge>
                {editing.actual_start && <span className="text-xs text-muted-foreground">Started: {editing.actual_start.slice(11, 16)}</span>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Factory</Label>
              <Select value={factoryId} onValueChange={setFactoryId} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Select factory" /></SelectTrigger>
                <SelectContent>{factories.map(f => <SelectItem key={f.id} value={f.id}>{f.code} · {f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Work Center</Label>
              <Select value={workCenterId} onValueChange={setWorkCenterId} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Select work center" /></SelectTrigger>
                <SelectContent>{filteredWCs.map(w => <SelectItem key={w.id} value={w.id}>{w.code} · {w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Machine</Label>
              <Select value={editing?.machine_id ?? machineId} onValueChange={setMachineId} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Select machine" /></SelectTrigger>
                <SelectContent>{filteredMachines.map(m => <SelectItem key={m.id} value={m.id}>{m.code} · {m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Production Order</Label>
              <Select value={editing?.production_order_id ?? poId} onValueChange={setPoId} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Select PO" /></SelectTrigger>
                <SelectContent>{releasedPOs.map(p => <SelectItem key={p.id} value={p.id}>{p.doc_no} · {p.output_item_code}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">PO Line (optional)</Label>
              <Select value={poLineId || '__all__'} onValueChange={v => setPoLineId(v === '__all__' ? '' : v)} disabled={!selectedPO || !!editing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Whole PO</SelectItem>
                  {(selectedPO?.lines ?? []).map(l => <SelectItem key={l.id} value={l.id}>{l.item_code} · {l.item_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Operator</Label>
              <Select value={editing?.employee_id ?? employeeId} onValueChange={setEmployeeId} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Select operator" /></SelectTrigger>
                <SelectContent>{operators.map(e => <SelectItem key={e.id} value={e.id}>{e.empCode} · {e.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Shift</Label>
              <Select value={editing?.shift_id ?? shiftId} onValueChange={setShiftId} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
                <SelectContent>{shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Scheduled Start</Label>
              <Input type="datetime-local" value={editing?.scheduled_start.slice(0, 16) ?? scheduledStart} onChange={e => setScheduledStart(e.target.value)} disabled={!!editing} />
            </div>
            <div>
              <Label className="text-xs">Scheduled End</Label>
              <Input type="datetime-local" value={editing?.scheduled_end.slice(0, 16) ?? scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} disabled={!!editing} />
            </div>
            <div>
              <Label className="text-xs">Planned Qty</Label>
              <Input type="number" min="0" value={editing?.planned_qty ?? plannedQty} onChange={e => setPlannedQty(e.target.value)} disabled={!!editing} />
            </div>
            <div>
              <Label className="text-xs">UOM</Label>
              <Input value={editing?.uom ?? uom} onChange={e => setUom(e.target.value)} disabled={!!editing} />
            </div>
          </div>

          {editing && (editing.status === 'in_progress' || editing.status === 'on_hold') && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Output Capture</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Produced Qty</Label><Input type="number" value={producedQty} onChange={e => setProducedQty(e.target.value)} /></div>
                <div><Label className="text-xs">Rejected Qty</Label><Input type="number" value={rejectedQty} onChange={e => setRejectedQty(e.target.value)} /></div>
                <div><Label className="text-xs">Rework Qty</Label><Input type="number" value={reworkQty} onChange={e => setReworkQty(e.target.value)} /></div>
                <div><Label className="text-xs">Wastage Qty</Label><Input type="number" value={wastageQty} onChange={e => setWastageQty(e.target.value)} /></div>
                <div>
                  <Label className="text-xs">Wastage Reason</Label>
                  <Select value={wastageReason} onValueChange={setWastageReason}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{WASTAGE_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Wastage Notes</Label>
                  <Textarea rows={2} value={wastageNotes} onChange={e => setWastageNotes(e.target.value)} />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Breakdown / Hold Notes</Label>
                  <Textarea rows={2} value={breakdownNotes} onChange={e => setBreakdownNotes(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          )}

          <div>
            <Label className="text-xs">Remarks</Label>
            <Textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>

          <div className="flex gap-2 flex-wrap">
            {!editing && (
              <Button onClick={handlePlan}><Save className="h-4 w-4 mr-1" /> Plan Job Card</Button>
            )}
            {editing && editing.status === 'planned' && (
              <Button onClick={handleStart}><Play className="h-4 w-4 mr-1" /> Clock In</Button>
            )}
            {editing && editing.status === 'in_progress' && (
              <>
                <Button onClick={handleComplete}><Square className="h-4 w-4 mr-1" /> Clock Out</Button>
                <Button variant="outline" onClick={handleHold}><Pause className="h-4 w-4 mr-1" /> Hold</Button>
              </>
            )}
            {editing && editing.status === 'on_hold' && (
              <Button onClick={handleResume}><RotateCw className="h-4 w-4 mr-1" /> Resume</Button>
            )}
            {editing && editing.status !== 'completed' && editing.status !== 'cancelled' && (
              <Button variant="destructive" onClick={handleCancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
            )}
            {editing && (
              <Button variant="ghost" onClick={resetForm}>New Job Card</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default JobCardEntryPanel;
