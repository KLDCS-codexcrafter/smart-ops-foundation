/**
 * @file        src/pages/erp/comply360/widgets/HealthScoreWidget.tsx
 * @purpose     OOB-1 Compliance Health Score card · 0-100 dial + breakdown
 *              Cycle-2: accepts either HealthBreakdown (legacy) OR
 *              WeightedHealthBreakdown (per DP-S69-5 module-weighted model).
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Cycle 2 Block 3 · OOB-1
 */
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { ShieldCheck, AlertTriangle, AlertOctagon, Activity } from 'lucide-react';
import type {
  HealthBreakdown,
  HealthBand,
  WeightedHealthBreakdown,
  ModuleSubScore,
} from '@/lib/comply360-health-score-engine';

type AnyBreakdown = HealthBreakdown | WeightedHealthBreakdown;

interface Props {
  breakdown: AnyBreakdown;
}

const BAND_META: Record<HealthBand, { label: string; tone: string; icon: typeof ShieldCheck }> = {
  excellent: { label: 'Excellent', tone: 'text-success',     icon: ShieldCheck },
  good:      { label: 'Good',      tone: 'text-primary',     icon: Activity },
  warning:   { label: 'Warning',   tone: 'text-warning',     icon: AlertTriangle },
  critical:  { label: 'Critical',  tone: 'text-destructive', icon: AlertOctagon },
};

const MODULE_LABEL: Record<string, string> = {
  'tax-gst':     'GST',
  'tds':         'TDS',
  'mca-roc':     'MCA / ROC',
  'payroll':     'Payroll',
  'audit-trail': 'Audit Trail',
  'licenses':    'Licenses',
  'msme':        'MSME',
  'esg':         'ESG',
  'other':       'Other',
};

function isWeighted(b: AnyBreakdown): b is WeightedHealthBreakdown {
  return Array.isArray((b as WeightedHealthBreakdown).modules);
}

function dotTone(raw: number): string {
  if (raw >= 85) return 'bg-success';
  if (raw >= 65) return 'bg-primary';
  if (raw >= 40) return 'bg-warning';
  return 'bg-destructive';
}

export function HealthScoreWidget({ breakdown }: Props): JSX.Element {
  const meta = BAND_META[breakdown.band];
  const Icon = meta.icon;
  const pct = useMemo(() => Math.max(0, Math.min(100, breakdown.total)), [breakdown.total]);
  const weighted = isWeighted(breakdown) ? breakdown : null;
  const legacy = !weighted ? (breakdown as HealthBreakdown) : null;

  // Aggregate counts work for both shapes.
  const totalCount = weighted
    ? weighted.modules.reduce((s, m) => s + m.counts.total, 0)
    : legacy!.counts.total;

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
            OOB-1 · {weighted ? 'DP-S69-5 weighted · ' : ''}live across {totalCount} obligations
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

      {legacy && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-xs">
            <Stat label="Filed"   value={legacy.counts.filed}   tone="text-success" />
            <Stat label="Pending" value={legacy.counts.pending} tone="text-muted-foreground" />
            <Stat label="Overdue" value={legacy.counts.overdue} tone="text-warning" />
            <Stat label="Breach"  value={legacy.counts.breach}  tone="text-destructive" />
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
            <Penalty label="Overdue"  value={legacy.overdue_penalty} />
            <Penalty label="Breach"   value={legacy.breach_penalty} />
            <Penalty label="Upcoming" value={legacy.upcoming_penalty} />
            <Penalty label="Coverage" value={legacy.coverage_penalty} />
          </div>
        </>
      )}

      {weighted && (
        <div className="mt-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Per-module sub-scores (DP-S69-5)
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-1.5 font-medium">Module</th>
                  <th className="text-right px-3 py-1.5 font-medium">Weight</th>
                  <th className="text-right px-3 py-1.5 font-medium">Sub-score</th>
                  <th className="px-3 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {weighted.modules.map((m: ModuleSubScore) => (
                  <tr key={m.module} className="border-t">
                    <td className="px-3 py-1.5">{MODULE_LABEL[m.module] ?? m.module}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                      {Math.round(m.weight * 100)}%
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">{m.raw_score}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${dotTone(m.raw_score)}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
