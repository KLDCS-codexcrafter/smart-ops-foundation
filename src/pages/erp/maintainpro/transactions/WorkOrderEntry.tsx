/**
 * @file        src/pages/erp/maintainpro/transactions/WorkOrderEntry.tsx
 * @sprint      T-Phase-1.A.16b · Block D.2
 * @[JWT]       via createWorkOrder
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createWorkOrder, listWorkOrders, updateWorkOrderStatus, listEquipment } from '@/lib/maintainpro-engine';
import type { WorkOrder, WorkOrderStatus, WorkOrderType } from '@/types/maintainpro';

interface Props { onNavigate: (m: string) => void }
const E = 'DEMO';

export function WorkOrderEntry(_props: Props): JSX.Element {
  const equipment = listEquipment(E);
  const [equipmentId, setEquipmentId] = useState(equipment[0]?.id ?? '');
  const [woType, setWoType] = useState<WorkOrderType>('breakdown');
  const [est, setEst] = useState(60);
  const [list, setList] = useState<WorkOrder[]>(listWorkOrders(E));

  const submit = (): void => {
    if (!equipmentId) { toast.error('Equipment required'); return; }
    createWorkOrder(E, {
      wo_no: `WO/26-27/${String(list.length + 1).padStart(4, '0')}`,
      wo_type: woType,
      source_breakdown_id: null,
      source_pm_schedule_id: null,
      equipment_id: equipmentId,
      assigned_to_user_id: null,
      assigned_at: null,
      estimated_minutes: est,
      actual_minutes: null,
      status: 'draft',
      started_at: null,
      paused_at: null,
      resumed_at: null,
      completed_at: null,
      activities_planned: [],
      parts_used: [],
      completion_notes: '',
      followup_required: false,
      project_id: null,
      created_by_user_id: 'demo_user',
    });
    setList(listWorkOrders(E));
    toast.success('Work order created');
  };

  const advance = (woId: string, status: WorkOrderStatus): void => {
    updateWorkOrderStatus(E, woId, status);
    setList(listWorkOrders(E));
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Work Order</h1>
      <Card><CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Equipment</Label>
            <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
              {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.equipment_code}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={woType} onChange={(e) => setWoType(e.target.value as WorkOrderType)}>
              <option value="breakdown">Breakdown</option><option value="pm_scheduled">PM Scheduled</option>
              <option value="pm_overdue">PM Overdue</option><option value="inspection">Inspection</option><option value="safety">Safety</option>
            </select>
          </div>
          <div className="space-y-1"><Label>Est. minutes</Label><Input type="number" value={est} onChange={(e) => setEst(Number(e.target.value))} /></div>
        </div>
        <Button onClick={submit}>Create WO</Button>
      </CardContent></Card>

      <Card><CardContent className="p-4">
        <h3 className="text-sm font-medium mb-2">Work Orders ({list.length})</h3>
        <div className="space-y-2 text-xs font-mono">
          {list.slice().reverse().map((wo) => (
            <div key={wo.id} className="flex items-center justify-between py-1 border-b border-border">
              <span>{wo.wo_no}</span>
              <span className="text-muted-foreground">{wo.wo_type}</span>
              <span>{wo.status}</span>
              <div className="flex gap-1">
                {wo.status === 'draft' && <Button size="sm" variant="outline" onClick={() => advance(wo.id, 'in_progress')}>Start</Button>}
                {wo.status === 'in_progress' && <Button size="sm" variant="outline" onClick={() => advance(wo.id, 'completed')}>Complete</Button>}
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="text-muted-foreground">No work orders</div>}
        </div>
      </CardContent></Card>
    </div>
  );
}

export default WorkOrderEntry;
