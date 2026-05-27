/**
 * @file        src/pages/erp/comply360/widgets/HealthScoreWidget.tsx
 * @purpose     OOB-1 Compliance Health Score card · 0-100 dial + breakdown
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 3 · OOB-1
 */
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ShieldCheck, AlertTriangle, AlertOctagon, Activity } from 'lucide-react';
import type { HealthBreakdown, HealthBand } from '@/lib/comply360-health-score-engine';

interface Props {
  breakdown: HealthBreakdown;
}

const BAND_META: Record<HealthBand, { label: string; tone: string; icon: typeof ShieldCheck }> = {
  excellent: { label: 'Excellent', tone: 'text-success',     icon: ShieldCheck },
  good:      { label: 'Good',      tone: 'text-primary',     icon: Activity },
  warning:   { label: 'Warning',   tone: 'text-warning',     icon: AlertTriangle },
  critical:  { label: 'Critical',  tone: 'text-destructive', icon: AlertOctagon },
};

export function HealthScoreWidget({ breakdown }: Props): JSX.Element {
  const meta = BAND_META[breakdown.band];
  const Icon = meta.icon;
  const pct = useMemo(() => Math.max(0, Math.min(100, breakdown.total)), [breakdown.total]);

  return (
    <Card className="p-6 col-span-1 md:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${meta.tone}`} />
            <h3 className="font-semibold">Compliance Health Score</h3>
            <span className={`text-xs font-medium ${meta.tone}`}>· {meta.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            OOB-1 · live across {breakdown.counts.total} obligations
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-4xl font-bold leading-none">{pct}</div>
          <div className="text-xs text-muted-foreground">/ 100</div>
        </div>
      </div>

      <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full transition-all ${
            breakdown.band === 'excellent'
              ? 'bg-success'
              : breakdown.band === 'good'
              ? 'bg-primary'
              : breakdown.band === 'warning'
              ? 'bg-warning'
              : 'bg-destructive'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-xs">
        <Stat label="Filed"        value={breakdown.counts.filed}        tone="text-success" />
        <Stat label="Pending"      value={breakdown.counts.pending}      tone="text-muted-foreground" />
        <Stat label="Overdue"      value={breakdown.counts.overdue}      tone="text-warning" />
        <Stat label="Breach"       value={breakdown.counts.breach}       tone="text-destructive" />
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
        <Penalty label="Overdue"  value={breakdown.overdue_penalty} />
        <Penalty label="Breach"   value={breakdown.breach_penalty} />
        <Penalty label="Upcoming" value={breakdown.upcoming_penalty} />
        <Penalty label="Coverage" value={breakdown.coverage_penalty} />
      </div>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }): JSX.Element {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div className={`font-mono text-lg font-semibold ${tone}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function Penalty({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <span>{label} penalty</span>
      <span className="font-mono">-{value}</span>
    </div>
  );
}
