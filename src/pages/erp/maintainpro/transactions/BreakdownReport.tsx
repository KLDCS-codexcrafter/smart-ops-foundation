/**
 * @file        src/pages/erp/maintainpro/transactions/BreakdownReport.tsx
 * @purpose     Breakdown Report capture form · OOB-M1 pattern banner + OOB-M8 warranty banner
 * @sprint      T-Phase-1.A.16b · Block D.1
 * @[JWT]       via createBreakdownReport (localStorage Phase 1)
 */
import { useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  createBreakdownReport,
  listBreakdownReports,
  listEquipment,
} from '@/lib/maintainpro-engine';
import type { BreakdownReport as BD } from '@/types/maintainpro';

interface Props { onNavigate: (m: string) => void }

const E = 'DEMO';

export function BreakdownReport(_props: Props): JSX.Element {
  const equipment = listEquipment(E);
  const [equipmentId, setEquipmentId] = useState(equipment[0]?.id ?? '');
  const [complaint, setComplaint] = useState('');
  const [severity, setSeverity] = useState<BD['severity']>('medium');
  const [list, setList] = useState<BD[]>(listBreakdownReports(E));
  const [last, setLast] = useState<BD | null>(null);

  const submit = (): void => {
    if (!equipmentId || !complaint) { toast.error('Equipment + complaint required'); return; }
    const bd = createBreakdownReport(E, {
      breakdown_no: `BD/26-27/${String(list.length + 1).padStart(4, '0')}`,
      equipment_id: equipmentId,
      reported_by_user_id: 'demo_user',
      originating_department_id: 'production',
      occurred_at: new Date().toISOString(),
      reported_at: new Date().toISOString(),
      resolved_at: null,
      downtime_minutes: 0,
      nature_of_complaint: complaint,
      severity,
      corrective_action: '',
      attended_by_user_id: null,
      remarks: '',
      triggered_work_order_id: null,
      project_id: null,
    });
    setList(listBreakdownReports(E));
    setLast(bd);
    setComplaint('');
    toast.success(`Breakdown ${bd.breakdown_no} logged`);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Breakdown Report</h1>
      <p className="text-sm text-muted-foreground">Raise a breakdown · OOB-M1 pattern detection · OOB-M8 warranty check</p>

      {last?.is_equipment_in_warranty && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-start gap-2">
            <ShieldCheck className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="text-sm">
              <strong>EQUIPMENT IN WARRANTY</strong> · file claim BEFORE repair · contact: {last.warranty_contact ?? 'OEM'}
            </div>
          </CardContent>
        </Card>
      )}

      {last?.similar_breakdowns_pattern_detected && (
        <Card className="border-warning">
          <CardContent className="p-4 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            <div className="text-sm">{last.similar_breakdowns_pattern_detected}</div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-1">
            <Label>Equipment</Label>
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={equipmentId}
              onChange={(e) => setEquipmentId(e.target.value)}
            >
              {equipment.map((eq) => (<option key={eq.id} value={eq.id}>{eq.equipment_code} · {eq.equipment_name}</option>))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Nature of complaint</Label>
            <Textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Describe the issue..." />
          </div>
          <div className="space-y-1">
            <Label>Severity</Label>
            <select
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as BD['severity'])}
            >
              <option value="low">Low</option><option value="medium">Medium</option>
              <option value="high">High</option><option value="critical">Critical</option>
            </select>
          </div>
          <Button onClick={submit}>Raise Breakdown</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-2">Recent Breakdowns ({list.length})</h3>
          <div className="space-y-1 text-xs font-mono">
            {list.slice(-5).reverse().map((b) => (
              <div key={b.id} className="flex justify-between py-1 border-b border-border">
                <span>{b.breakdown_no}</span>
                <span className="text-muted-foreground">{b.severity}</span>
                <span>{b.status}</span>
              </div>
            ))}
            {list.length === 0 && <div className="text-muted-foreground">No breakdowns yet</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default BreakdownReport;
