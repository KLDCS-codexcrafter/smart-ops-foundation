/**
 * @file        src/pages/erp/servicedesk/settings/EscalationTreeSettings.tsx
 * @purpose     C.1d · Escalation tree visualizer · 4 levels (L0 → L3) · view-only Phase 1
 * @sprint      T-Phase-1.C.1d · Block D.2
 * @iso         Usability
 */
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';

const LEVELS = [
  { level: 0, label: 'L0 · Field Engineer', breach: 'On creation', sev_default: 'sev3_medium', color: 'bg-secondary' },
  { level: 1, label: 'L1 · Branch Service Manager', breach: 'After Response SLA breach', sev_default: 'sev2_high', color: 'bg-warning/20' },
  { level: 2, label: 'L2 · Regional Service Head', breach: 'After Resolution SLA × 0.5', sev_default: 'sev2_high', color: 'bg-warning/40' },
  { level: 3, label: 'L3 · COO / VP Service', breach: 'After Resolution SLA breach', sev_default: 'sev1_critical', color: 'bg-destructive/30' },
];

export function EscalationTreeSettings(): JSX.Element {
  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Escalation Tree</h1>
        <p className="text-sm text-muted-foreground mt-1">
          4-level cascade · driven by SLA Matrix breach signals · auto-promotes ticket escalation_level
        </p>
      </div>

      <Card className="glass-card p-6">
        <div className="space-y-3">
          {LEVELS.map((lv, idx) => (
            <div key={lv.level} className="flex items-center gap-3">
              <div className={`flex-1 rounded-lg p-4 border border-border ${lv.color}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{lv.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{lv.breach}</div>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    L{lv.level}
                  </Badge>
                </div>
              </div>
              {idx < LEVELS.length - 1 && (
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="glass-card p-4">
        <p className="text-xs text-muted-foreground">
          Phase 1 · view-only. Edits land at C.1e (escalation overrides per OEM/customer-class · D-NEW-CY 3rd consumer extension).
        </p>
      </Card>
    </div>
  );
}
