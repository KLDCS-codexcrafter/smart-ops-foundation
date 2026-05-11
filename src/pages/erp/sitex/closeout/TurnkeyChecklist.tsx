/**
 * @file        src/pages/erp/sitex/closeout/TurnkeyChecklist.tsx
 * @purpose     Turnkey final-readiness checklist (Master Plan §6.3)
 * @sprint      T-Phase-1.A.15a · Q-LOCK-6a · Block F.4
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';

interface Props { onNavigate: (m: string) => void }

const ITEMS = [
  'Drawings handed over (as-built)',
  'Operation manual delivered',
  'Maintenance manual delivered',
  'Spares list signed',
  'Spares delivered to customer store',
  'Customer training conducted (operator)',
  'Customer training conducted (maintenance)',
  'Warranty registered',
  'AMC contract handed over',
  'Safety briefing conducted',
  'Keys & passwords transferred',
  'Final test certificates handed over',
  'Performance test report signed',
  'Punch-list closed',
  'NOC from customer received',
  'Final account settled',
  'Final reconciliation done',
  'Surplus material returned',
  'Equipment recalled',
  'Site cleaned',
  'Photographs archived',
  'DocVault evidence pack closed',
  'Customer feedback recorded',
  'AMC tickets pre-provisioned in ServiceDesk',
  'Site closure certificate issued',
];

export function TurnkeyChecklist({ onNavigate: _onNavigate }: Props): JSX.Element {
  const [state, setState] = useState<Record<number, boolean>>({});
  const done = Object.values(state).filter(Boolean).length;

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="h-6 w-6 text-amber-600" />
        <h1 className="text-2xl font-bold">Turnkey Checklist</h1>
      </div>

      <Card className="p-6 space-y-2">
        <div className="text-sm text-muted-foreground mb-3">{done} / {ITEMS.length} complete</div>
        {ITEMS.map((item, i) => (
          <label key={i} className="flex items-center gap-3 py-1 cursor-pointer">
            <Checkbox checked={Boolean(state[i])} onCheckedChange={(c) => setState((s) => ({ ...s, [i]: Boolean(c) }))} />
            <span className={state[i] ? 'line-through text-muted-foreground' : ''}>{item}</span>
          </label>
        ))}
        <Button className="mt-4" disabled={done < ITEMS.length}>Issue Closure Certificate</Button>
      </Card>
    </div>
  );
}
