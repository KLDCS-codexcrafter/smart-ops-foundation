/**
 * @file     EMIDashboardWidget.tsx
 * @purpose  Command Center Overview widget — surfaces EMI alerts so the user
 *           never forgets a due date. Shows 6-stat summary + top 3 most
 *           urgent alerts. Closes leak L1 (forget EMI).
 * @sprint   T-H1.5-D-D3
 * @finding  CC-064
 */
import { CalendarClock, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEMIAlerts } from '../hooks/useEMIAlerts';
import type { AlertSeverity } from '../lib/alert-engine';

interface Props {
  onNavigate?: (view: 'calendar' | 'all') => void;
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function severityClasses(sev: AlertSeverity): string {
  if (sev === 'danger') return 'text-destructive';
  if (sev === 'warning') return 'text-warning';
  return 'text-muted-foreground';
}

function severityDotClasses(sev: AlertSeverity): string {
  if (sev === 'danger') return 'bg-destructive';
  if (sev === 'warning') return 'bg-warning';
  return 'bg-primary';
}

export function EMIDashboardWidget({ onNavigate }: Props) {
  const { alerts, summary } = useEMIAlerts();
  const top3 = alerts.slice(0, 3);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-primary" />
          Loan EMI Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
          <Stat label="Overdue" value={summary.overdue} tone={summary.overdue > 0 ? 'danger' : 'mute'} />
          <Stat label="Today" value={summary.today} tone={summary.today > 0 ? 'danger' : 'mute'} />
          <Stat label="Tomorrow" value={summary.dueIn1d} tone={summary.dueIn1d > 0 ? 'warning' : 'mute'} />
          <Stat label="In 3d" value={summary.dueIn3d} tone="warning" />
          <Stat label="In 7d" value={summary.dueIn7d} tone="info" />
          <Stat label="Total" value={summary.total} tone="info" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5">
            <p className="text-muted-foreground">Overdue (₹)</p>
            <p className="font-mono font-semibold text-destructive">
              {formatINR(summary.totalOverdueAmount)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-2.5">
            <p className="text-muted-foreground">Due This Week (₹)</p>
            <p className="font-mono font-semibold">
              {formatINR(summary.totalDueThisWeekAmount)}
            </p>
          </div>
        </div>

        {top3.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
            No EMIs due in the next 7 days.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Most Urgent</p>
            {top3.map(a => (
              <div key={`${a.ledgerId}-${a.emiNumber}`} className="flex items-start gap-2 text-xs">
                <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${severityDotClasses(a.severity)}`} />
                <div className="flex-1 min-w-0">
                  <p className={`truncate ${severityClasses(a.severity)}`}>
                    {a.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {formatINR(a.amount)}
                  </p>
                </div>
                {a.severity === 'danger' && (
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}

        {onNavigate && (
          <div className="flex justify-end pt-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigate('calendar')}>
              View calendar <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatProps { label: string; value: number; tone: 'danger' | 'warning' | 'info' | 'mute' }
function Stat({ label, value, tone }: StatProps) {
  const cls = tone === 'danger' ? 'text-destructive'
    : tone === 'warning' ? 'text-warning'
    : tone === 'info' ? 'text-foreground'
    : 'text-muted-foreground';
  return (
    <div className="rounded-lg bg-muted/30 p-2">
      <p className={`text-lg font-mono font-bold ${cls}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function EMIDashboardWidgetBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <Badge variant="destructive" className="text-[10px]">{count}</Badge>;
}
