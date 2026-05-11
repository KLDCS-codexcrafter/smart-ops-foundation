/**
 * @file        src/pages/erp/maintainpro/transactions/PMTickoffEntry.tsx
 * @sprint      T-Phase-1.A.16b · Block D.3
 * @[JWT]       via createPMTickoff
 */
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createPMTickoff, listPMTickoffs, listEquipment } from '@/lib/maintainpro-engine';
import type { PMTickoff } from '@/types/maintainpro';

interface Props { onNavigate: (m: string) => void }
const E = 'DEMO';

export function PMTickoffEntry(_props: Props): JSX.Element {
  const equipment = listEquipment(E);
  const [list, setList] = useState<PMTickoff[]>(listPMTickoffs(E));

  const submit = (): void => {
    if (equipment.length === 0) { toast.error('No equipment'); return; }
    createPMTickoff(E, {
      pm_no: `PM/26-27/${String(list.length + 1).padStart(4, '0')}`,
      pm_schedule_template_id: 'tpl_demo',
      equipment_id: equipment[0].id,
      scheduled_date: new Date().toISOString().slice(0, 10),
      actual_completion_date: new Date().toISOString().slice(0, 10),
      performed_by_user_id: 'demo_user',
      duration_minutes: 30,
      activities_completed: [],
      parts_used: [],
      next_due_date: null,
      status: 'completed',
      project_id: null,
    });
    setList(listPMTickoffs(E));
    toast.success('PM tick-off recorded');
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">PM Tick-off</h1>
      <Card><CardContent className="p-4">
        <Button onClick={submit}>Quick Tick-off (demo)</Button>
        <div className="mt-3 text-xs font-mono space-y-1">
          {list.slice().reverse().map((t) => <div key={t.id}>{t.pm_no} · {t.status}</div>)}
          {list.length === 0 && <div className="text-muted-foreground">No PM tick-offs</div>}
        </div>
      </CardContent></Card>
    </div>
  );
}

export default PMTickoffEntry;
