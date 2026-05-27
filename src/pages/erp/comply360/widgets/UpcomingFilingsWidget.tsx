/**
 * @file        src/pages/erp/comply360/widgets/UpcomingFilingsWidget.tsx
 * @purpose     Next-N upcoming/overdue filings · drill-target into mega-menu module
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 3 · OOB-5
 */
import { Card } from '@/components/ui/card';
import { CalendarClock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import type { FilingObligation } from '@/lib/comply360-health-score-engine';
import type { Comply360Module } from '../Comply360Sidebar.types';

interface Props {
  filings: FilingObligation[];
  onOpen: (module: Comply360Module) => void;
}

function daysFromToday(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function UpcomingFilingsWidget({ filings, onOpen }: Props): JSX.Element {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Upcoming Filings</h3>
        <span className="text-xs text-muted-foreground">· next {filings.length}</span>
      </div>
      {filings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending filings. You're caught up.</p>
      ) : (
        <ul className="space-y-2">
          {filings.map((f) => {
            const d = daysFromToday(f.due_date);
            const overdue = f.status === 'overdue' || d < 0;
            return (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => onOpen(f.module as Comply360Module)}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{f.label}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    Due {format(new Date(f.due_date), 'dd MMM yyyy')}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded-md ${
                      overdue
                        ? 'bg-destructive/10 text-destructive'
                        : d <= 7
                        ? 'bg-warning/10 text-warning'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {overdue ? `${Math.abs(d)}d late` : `in ${d}d`}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
