/**
 * @file        src/pages/erp/comply360/widgets/StatutoryMemoryWidget.tsx
 * @purpose     OOB-5 Statutory Memory · recent filed acknowledgements with ARN
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 3 · OOB-5
 */
import { Card } from '@/components/ui/card';
import { History, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import type { FilingObligation } from '@/lib/comply360-health-score-engine';

interface Props {
  filings: FilingObligation[];
}

export function StatutoryMemoryWidget({ filings }: Props): JSX.Element {
  const filed = filings
    .filter((f) => f.status === 'filed' && f.filed_at)
    .sort((a, b) => (a.filed_at! < b.filed_at! ? 1 : -1))
    .slice(0, 5);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-success" />
        <h3 className="font-semibold">Statutory Memory</h3>
        <span className="text-xs text-muted-foreground">· OOB-5 · recent filings</span>
      </div>
      {filed.length === 0 ? (
        <p className="text-sm text-muted-foreground">No filings recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {filed.map((f) => (
            <li key={f.id} className="flex items-start gap-2 rounded-lg border bg-muted/20 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{f.label}</div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  Filed {format(new Date(f.filed_at!), 'dd MMM yyyy')}
                  {f.arn ? ` · ARN ${f.arn}` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
