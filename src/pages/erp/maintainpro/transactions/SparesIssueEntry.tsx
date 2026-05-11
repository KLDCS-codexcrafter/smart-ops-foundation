/**
 * @file        src/pages/erp/maintainpro/transactions/SparesIssueEntry.tsx
 * @sprint      T-Phase-1.A.16b · Block E.1 · OOB-M7 velocity reorder
 */
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createSparesIssue, listSparesIssues, listEquipment } from '@/lib/maintainpro-engine';
import type { SparesIssue } from '@/types/maintainpro';

interface Props { onNavigate: (m: string) => void }
const E = 'DEMO';

export function SparesIssueEntry(_props: Props): JSX.Element {
  const equipment = listEquipment(E);
  const [spareId, setSpareId] = useState('spare-001');
  const [qty, setQty] = useState(1);
  const [list, setList] = useState<SparesIssue[]>(listSparesIssues(E));
  const [last, setLast] = useState<SparesIssue | null>(null);

  const submit = (): void => {
    if (equipment.length === 0) { toast.error('No equipment'); return; }
    const issue = createSparesIssue(E, {
      issue_no: `SI/26-27/${String(list.length + 1).padStart(4, '0')}`,
      spare_id: spareId,
      qty,
      consuming_equipment_id: equipment[0].id,
      consuming_work_order_id: null,
      consuming_breakdown_id: null,
      issued_to_user_id: 'demo_user',
      unit_cost: 100,
      total_cost: 100 * qty,
      fincore_voucher_id: null,
      project_id: null,
      issued_at: new Date().toISOString(),
    });
    setList(listSparesIssues(E));
    setLast(issue);
    toast.success(`Spare issued: ${issue.issue_no}`);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Spares Issue</h1>
      {last?.velocity_spike_detected && (
        <Card className="border-warning"><CardContent className="p-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <div className="text-sm">Velocity spike · current {last.current_velocity.toFixed(1)}/mo vs median {last.historical_median_velocity.toFixed(1)}/mo · reorder recommended</div>
        </CardContent></Card>
      )}
      <Card><CardContent className="p-4 space-y-3">
        <div className="space-y-1"><Label>Spare ID</Label><Input value={spareId} onChange={(e) => setSpareId(e.target.value)} /></div>
        <div className="space-y-1"><Label>Qty</Label><Input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></div>
        <Button onClick={submit}>Issue Spare</Button>
        <div className="text-xs font-mono">{list.length} issues recorded</div>
      </CardContent></Card>
    </div>
  );
}

export default SparesIssueEntry;
