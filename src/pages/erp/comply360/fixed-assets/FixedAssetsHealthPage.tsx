/**
 * @file        src/pages/erp/comply360/fixed-assets/FixedAssetsHealthPage.tsx
 * @purpose     Sprint 79d · FA Health 4-tile surface · migrated from Dashboard.tsx per cards-only invariant restoration.
 *              Renders FA Health / Compliance / Custodian / IoT Stream computed from comply360-health-score-engine.
 * @sprint      Sprint 79d · T-Phase-5.A.1.11-HYGIENE-D
 * @decisions   DP-S79d-1 (hygiene pass) · DP-S79d-4 (FR-106 10th scenario · tab-shell) · DP-S79d-5 (customer-friendly caption)
 */
import { useMemo } from 'react';
import type { WeightedHealthBreakdown } from '@/lib/comply360-health-score-engine';
import { computeWeightedComplianceHealth } from '@/lib/comply360-health-score-engine';
import { loadObligations } from '@/lib/comply360-statutory-memory';

interface FATileDef {
  id: string;
  title: string;
  metric: string;
  caption: string;
}

function buildFATiles(entityCode: string, health: WeightedHealthBreakdown): FATileDef[] {
  let iotCount = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`4ds_iot_asset_stream_${entityCode}_`)) iotCount++;
    }
  } catch { /* ignore */ }

  const roc      = health.modules.find((m) => m.module === 'mca-roc');
  const audit    = health.modules.find((m) => m.module === 'audit-trail');
  const licenses = health.modules.find((m) => m.module === 'licenses');

  const faHealthRaw = roc && audit ? Math.round((roc.raw_score + audit.raw_score) / 2) : 100;
  const faHealthLabel =
    faHealthRaw >= 85 ? 'Healthy' :
    faHealthRaw >= 65 ? 'Watch' :
    faHealthRaw >= 40 ? 'At Risk' : 'Critical';

  const complianceLabel =
    !roc                ? 'On-track' :
    roc.raw_score >= 85 ? 'On-track' :
    roc.raw_score >= 65 ? 'Minor gaps' :
    roc.raw_score >= 40 ? 'Material gaps' : 'Adverse';

  const custTotal   = (roc?.counts.total   ?? 0) + (audit?.counts.total   ?? 0) + (licenses?.counts.total   ?? 0);
  const custOverdue = (roc?.counts.overdue ?? 0) + (audit?.counts.overdue ?? 0) + (licenses?.counts.overdue ?? 0);
  const custPct = custTotal === 0 ? 100 : Math.round(((custTotal - custOverdue) / custTotal) * 100);

  return [
    { id: 'fa-health-tile',     title: 'FA Health',  metric: `${faHealthLabel} (${faHealthRaw})`, caption: 'CARO / Schedule II / GST status from Comply360' },
    { id: 'fa-compliance-tile', title: 'Compliance', metric: complianceLabel,                      caption: 'CARO 2020 · Schedule II · GST ITC (Comply360 ROC sub-score)' },
    { id: 'fa-custodian-tile',  title: 'Custodian',  metric: `${custPct}%`,                        caption: 'Assets with custodian + on-time filings (Comply360-driven)' },
    { id: 'fa-iot-stream-tile', title: 'IoT Stream', metric: String(iotCount),                     caption: 'Real-time stream count' },
  ];
}

function FATile({ tile }: { tile: FATileDef }) {
  return (
    <div className="rounded-2xl p-5 bg-card/60 backdrop-blur-xl border border-border">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{tile.title}</div>
      <div className="text-2xl font-mono font-semibold text-foreground mt-2">{tile.metric}</div>
      <div className="text-xs text-muted-foreground mt-2 leading-relaxed">{tile.caption}</div>
    </div>
  );
}

export default function FixedAssetsHealthPage({ entityCode = 'DEMO-CORP-01' }: { entityCode?: string }): JSX.Element {
  const obligations = useMemo(() => loadObligations(), []);
  const health = useMemo(() => computeWeightedComplianceHealth(obligations), [obligations]);
  const tiles = useMemo(() => buildFATiles(entityCode, health), [entityCode, health]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Fixed Assets · Health</h1>
        <p className="text-sm text-muted-foreground mt-1">
          CARO / Schedule II / Ind AS 116 / EPCG / MSME 43B(h) consolidated view · live from Comply360 health-score-engine.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((tile) => (<FATile key={tile.id} tile={tile} />))}
      </div>
    </div>
  );
}
