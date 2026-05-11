/**
 * @file        src/components/maintainpro/MaintenancePulseWidget.tsx
 * @purpose     Andon-style maintenance pulse widget · Production Welcome callout · OOB-M3 bidirectional capacity feedback
 * @sprint      T-Phase-1.A.16b · Block G.2 · Q-LOCK-5 · D-NEW-CZ POSSIBLE 23rd canonical
 * @reuses      listEquipment from maintainpro-engine
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { listEquipment } from '@/lib/maintainpro-engine';

const E = 'DEMO';

export function MaintenancePulseWidget(): JSX.Element {
  const { downCount, total, availablePct, status } = useMemo(() => {
    const all = listEquipment(E);
    const down = all.filter((eq) => eq.operational_status === 'breakdown' || eq.operational_status === 'under_maintenance');
    const tot = all.length;
    const pct = tot === 0 ? 100 : Math.round(((tot - down.length) / tot) * 100);
    const stat: 'green' | 'amber' | 'red' = pct >= 90 ? 'green' : pct >= 70 ? 'amber' : 'red';
    return { downCount: down.length, total: tot, availablePct: pct, status: stat };
  }, []);

  const pulseClass = status === 'green' ? 'bg-success' : status === 'amber' ? 'bg-warning' : 'bg-destructive';

  return (
    <Card className="border-l-4" style={{ borderLeftColor: 'hsl(var(--primary))' }}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-3 w-3 rounded-full ${pulseClass} animate-pulse`} />
        <Activity className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <div className="text-sm font-medium">Maintenance Pulse · Available capacity {availablePct}%</div>
          <div className="text-xs text-muted-foreground font-mono">
            {downCount} of {total} machines down · expected restore data from MaintainPro
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MaintenancePulseWidget;
