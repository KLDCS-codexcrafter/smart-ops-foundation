/**
 * @file        src/pages/erp/frontdesk/visitors/PlanVisitPage.tsx
 * @sprint      Sprint 145 · T-FrontDesk-A6F.1 · Block 4
 */
import { useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEmployees } from '@/hooks/useEmployees';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { createPlannedVisitor } from '@/lib/frontdesk-engine';
import type { VisitPurpose } from '@/types/frontdesk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const PURPOSES: VisitPurpose[] = [
  'Vendor Meeting', 'Interview', 'Audit', 'Client Demo', 'General Visit',
  'Delivery', 'Maintenance', 'Government/Statutory',
];

interface Props { onDone?: () => void }

export function PlanVisitPage({ onDone }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { employees } = useEmployees();
  const me = useCurrentUser();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState<VisitPurpose>('General Visit');
  const [hostId, setHostId] = useState('');
  const [plannedAt, setPlannedAt] = useState('');
  const [duration, setDuration] = useState('60');

  const submit = (): void => {
    try {
      const host = employees.find((e) => e.id === hostId);
      if (!host) throw new Error('Select a host');
      if (!plannedAt) throw new Error('Planned date/time required');
      createPlannedVisitor(entityCode, me?.id ?? 'demo-user', {
        name, company: company || null, phone: phone || null,
        purpose,
        hostEmployeeId: hostId,
        hostName: host.displayName,
        plannedAt: new Date(plannedAt).toISOString(),
        expectedDurationMinutes: Number(duration) || null,
      });
      toast.success(`Planned visit for ${name}`);
      onDone?.();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="p-6">
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Plan Visit</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Visitor name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={10} /></div>
            <div>
              <Label>Purpose</Label>
              <Select value={purpose} onValueChange={(v) => setPurpose(v as VisitPurpose)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Host *</Label>
              <Select value={hostId} onValueChange={setHostId}>
                <SelectTrigger><SelectValue placeholder="Choose host employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.displayName} · {e.empCode}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Planned at *</Label><Input type="datetime-local" value={plannedAt} onChange={(e) => setPlannedAt(e.target.value)} /></div>
            <div><Label>Expected duration (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onDone}>Cancel</Button>
            <Button onClick={submit}>Plan visit</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
