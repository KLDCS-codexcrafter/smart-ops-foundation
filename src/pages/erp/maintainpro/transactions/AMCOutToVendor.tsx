/**
 * @file        src/pages/erp/maintainpro/transactions/AMCOutToVendor.tsx
 * @sprint      T-Phase-1.A.16b · Block E.4 · OOB-M2 reminder cycle
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { createAMCOutToVendor, listAMCOutToVendor, getAMCRemindersDue, listEquipment } from '@/lib/maintainpro-engine';
import type { AMCOutToVendor as AMC } from '@/types/maintainpro';

interface Props { onNavigate: (m: string) => void }
const E = 'DEMO';

export function AMCOutToVendor(_props: Props): JSX.Element {
  const equipment = listEquipment(E);
  const [equipmentId, setEquipmentId] = useState(equipment[0]?.id ?? '');
  const [vendorId, setVendorId] = useState('vendor_001');
  const [expReturn, setExpReturn] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [list, setList] = useState<AMC[]>(listAMCOutToVendor(E));
  const reminders = getAMCRemindersDue(E);

  const submit = (): void => {
    if (!equipmentId) { toast.error('Equipment required'); return; }
    createAMCOutToVendor(E, {
      rma_no: `RMA/26-27/${String(list.length + 1).padStart(4, '0')}`,
      equipment_id: equipmentId,
      parts_sent: [],
      vendor_id: vendorId,
      vendor_rma_no: null,
      sent_date: new Date().toISOString().slice(0, 10),
      expected_return_date: expReturn,
      actual_return_date: null,
      status: 'sent',
      stock_state: 'wip_at_vendor',
      estimated_cost: 0,
      actual_cost: null,
      is_under_warranty: false,
      fincore_voucher_id: null,
      project_id: null,
      triggered_by_work_order_id: null,
      originating_department_id: 'maintenance',
      created_by_user_id: 'demo_user',
    });
    setList(listAMCOutToVendor(E));
    toast.success('AMC RMA created');
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">AMC Out-to-Vendor</h1>
      <div className="flex gap-2">
        <Badge variant="outline">50% reminders: {reminders.fifty_pct.length}</Badge>
        <Badge variant="outline">75% reminders: {reminders.seventy_five_pct.length}</Badge>
        <Badge variant="destructive">Overdue: {reminders.overdue.length}</Badge>
      </div>
      <Card><CardContent className="p-4 space-y-3">
        <div className="space-y-1"><Label>Equipment</Label>
          <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
            {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.equipment_code}</option>)}
          </select>
        </div>
        <div className="space-y-1"><Label>Vendor ID (service_provider)</Label><Input value={vendorId} onChange={(e) => setVendorId(e.target.value)} /></div>
        <div className="space-y-1"><Label>Expected Return</Label><Input type="date" value={expReturn} onChange={(e) => setExpReturn(e.target.value)} /></div>
        <Button onClick={submit}>Send to Vendor</Button>
        <div className="text-xs font-mono">{list.length} RMAs</div>
      </CardContent></Card>
    </div>
  );
}

export default AMCOutToVendor;
