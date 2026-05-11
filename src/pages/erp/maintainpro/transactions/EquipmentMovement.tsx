/**
 * @file        src/pages/erp/maintainpro/transactions/EquipmentMovement.tsx
 * @sprint      T-Phase-1.A.16b · Block E.2
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createEquipmentMovement, listEquipmentMovements, listEquipment } from '@/lib/maintainpro-engine';
import type { EquipmentMovement as EM } from '@/types/maintainpro';

interface Props { onNavigate: (m: string) => void }
const E = 'DEMO';

export function EquipmentMovement(_props: Props): JSX.Element {
  const equipment = listEquipment(E);
  const [equipmentId, setEquipmentId] = useState(equipment[0]?.id ?? '');
  const [src, setSrc] = useState('Plant 1');
  const [dest, setDest] = useState('Workshop');
  const [list, setList] = useState<EM[]>(listEquipmentMovements(E));

  const submit = (): void => {
    if (!equipmentId) { toast.error('Equipment required'); return; }
    createEquipmentMovement(E, {
      movement_no: `EM/26-27/${String(list.length + 1).padStart(4, '0')}`,
      equipment_id: equipmentId,
      source_location: src,
      source_site_id: null,
      destination_location: dest,
      destination_site_id: null,
      movement_reason: 'maintenance_workshop',
      movement_date: new Date().toISOString().slice(0, 10),
      transport_vehicle: '',
      transport_cost: 0,
      authorized_by_user_id: 'demo_user',
      project_id: null,
    });
    setList(listEquipmentMovements(E));
    toast.success('Movement recorded');
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Equipment Movement</h1>
      <Card><CardContent className="p-4 space-y-3">
        <div className="space-y-1"><Label>Equipment</Label>
          <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
            {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.equipment_code}</option>)}
          </select>
        </div>
        <div className="space-y-1"><Label>From</Label><Input value={src} onChange={(e) => setSrc(e.target.value)} /></div>
        <div className="space-y-1"><Label>To</Label><Input value={dest} onChange={(e) => setDest(e.target.value)} /></div>
        <Button onClick={submit}>Record Movement</Button>
        <div className="text-xs font-mono">{list.length} movements recorded</div>
      </CardContent></Card>
    </div>
  );
}

export default EquipmentMovement;
