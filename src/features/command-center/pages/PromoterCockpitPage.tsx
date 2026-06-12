/**
 * @file        PromoterCockpitPage.tsx
 * @sprint      RPT-10a · Block 2 · Promoter Cockpit (TV mode)
 * @purpose     Full-screen, read-only, auto-cycling executive cockpit.
 *              Composes FROZEN primitives — RoleDashboard layer derivation,
 *              ReportChart, ScorecardTile, DSC sources. NO synthetic data:
 *              every section reads real DSC rows or shows an honest empty-state.
 * @[JWT]       N/A — pure consumption
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pause, Play } from 'lucide-react';
import { ReportChart, ScorecardTile } from '@/components/operix-core/report-framework';
import { deriveRoleDashboard } from '@/lib/report-framework/role-layer';
import { getSource } from '@/lib/report-framework/data-source-catalog';
import { defaultChartConfig } from '@/lib/report-framework/chart-config';
import { resolveRag } from '@/lib/report-framework/rag';
import { signReport } from '@/lib/report-framework/integrity-sign';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { useEntityCode } from '@/hooks/useEntityCode';
import '@/lib/report-framework/data-sources';

const SECTION_MS = 12_000;
const SECTIONS = ['org-kpis', 'cash-ar', 'compliance', 'ops-pulse'] as const;
type Section = (typeof SECTIONS)[number];

function rowsFromSource(id: string, entityCode: string): Record<string, unknown>[] {
  try { return getSource(id)?.read(entityCode) ?? []; } catch { return []; }
}

function IntegrityBadge({ rows }: { rows: Record<string, unknown>[] }): JSX.Element {
  const sig = useMemo(() => (rows.length ? signReport(rows) : '—'), [rows]);
  return (
    <Badge variant="outline" className="font-mono text-[10px]" data-testid="cockpit-integrity">
      ◇ {sig.slice(0, 12)}
    </Badge>
  );
}

function EmptyState({ label }: { label: string }): JSX.Element {
  return (
    <Card className="p-12 text-center text-muted-foreground" data-testid="cockpit-empty">
      <p className="text-xl">No data yet</p>
      <p className="text-sm mt-2">{label}</p>
    </Card>
  );
}

export default function PromoterCockpitPage(): JSX.Element {
  const { profile, allowedCards } = useCardEntitlement();
  const { entityCode } = useEntityCode();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const rotRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    rotRef.current = setInterval(
      () => setIdx((i) => (i + 1) % SECTIONS.length),
      SECTION_MS,
    );
    return () => { if (rotRef.current) clearInterval(rotRef.current); };
  }, [paused]);

  // Pause on click or key
  useEffect(() => {
    const pause = () => setPaused(true);
    window.addEventListener('keydown', pause);
    return () => window.removeEventListener('keydown', pause);
  }, []);

  const section: Section = SECTIONS[idx];

  // ① Org KPIs — mgmt layer xc-* tiles via deriveRoleDashboard
  const dashboard = useMemo(
    () => deriveRoleDashboard('tenant_admin', 'management', allowedCards as unknown as string[]),
    [allowedCards],
  );
  const xc = dashboard.sections.find((s) => s.cardId === 'cross-card');

  // ② Cash & AR
  const cashRows = useMemo(() => rowsFromSource('xc-cash-position', entityCode), [entityCode]);
  const arRows = useMemo(() => rowsFromSource('receivx.ar', entityCode), [entityCode]);
  const arByBucket = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of arRows) {
      const b = String((r as { age_bucket?: string }).age_bucket ?? '—');
      const amt = Number((r as { pending_amount?: number }).pending_amount ?? 0);
      map.set(b, (map.get(b) ?? 0) + amt);
    }
    return Array.from(map.entries()).map(([age_bucket, outstanding]) => ({ age_bucket, outstanding }));
  }, [arRows]);

  // ③ Compliance
  const cmpRows = useMemo(
    () => rowsFromSource('comply360.aggregate.compliance-pct', entityCode),
    [entityCode],
  );

  // ④ Ops pulse — production + dispatch
  const prodRows = useMemo(() => rowsFromSource('production.orders', entityCode), [entityCode]);
  const dispRows = useMemo(() => rowsFromSource('dispatch.shipments', entityCode), [entityCode]);
  const prodByStatus = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of prodRows) {
      const s = String((r as { status?: string }).status ?? '—');
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    return Array.from(m.entries()).map(([status, count]) => ({ status, count }));
  }, [prodRows]);
  const dispByStatus = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of dispRows) {
      const s = String((r as { status?: string }).status ?? '—');
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    return Array.from(m.entries()).map(([status, count]) => ({ status, count }));
  }, [dispRows]);

  const togglePause = (): void => setPaused((p) => !p);

  return (
    <div
      className="min-h-screen bg-background p-8 select-none cursor-pointer"
      onClick={togglePause}
      data-testid="promoter-cockpit"
    >
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Promoter Cockpit</h1>
          <p className="text-base text-muted-foreground font-mono">
            {profile.role} · {entityCode} · TV mode · auto-cycle {SECTION_MS / 1000}s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1" role="tablist" aria-label="Cockpit sections">
            {SECTIONS.map((s, i) => (
              <span
                key={s}
                data-testid={`cockpit-dot-${s}`}
                className={
                  'h-2 w-8 rounded-full ' +
                  (i === idx ? 'bg-primary' : 'bg-muted')
                }
              />
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => { e.stopPropagation(); togglePause(); }}
            data-testid="cockpit-pause-toggle"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            <span className="ml-2">{paused ? 'Resume' : 'Pause'}</span>
          </Button>
        </div>
      </header>

      {section === 'org-kpis' && (
        <section data-testid="cockpit-section-org-kpis" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">① Org KPIs · Management Layer</h2>
            <IntegrityBadge rows={(xc?.kpis ?? []) as unknown as Record<string, unknown>[]} />
          </div>
          {xc && xc.kpis.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {xc.kpis.map((k) => (
                <ScorecardTile key={k.id} label={k.label} value="—" hint={k.id} />
              ))}
            </div>
          ) : (
            <EmptyState label="No management-layer xc-* KPIs seeded for this role." />
          )}
        </section>
      )}

      {section === 'cash-ar' && (
        <section data-testid="cockpit-section-cash-ar" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">② Cash & A/R</h2>
            <IntegrityBadge rows={[...cashRows, ...arRows]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-2">Cash Position</div>
              {cashRows.length > 0 ? (
                <ReportChart
                  data={cashRows}
                  config={defaultChartConfig({
                    chartType: 'column',
                    xKey: 'bank',
                    series: [{ key: 'balance', label: 'Balance' }],
                  })}
                />
              ) : (
                <EmptyState label="xc-cash-position source has no rows yet." />
              )}
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-2">A/R Aging</div>
              {arByBucket.length > 0 ? (
                <ReportChart
                  data={arByBucket}
                  config={defaultChartConfig({
                    chartType: 'stacked-column',
                    xKey: 'age_bucket',
                    series: [{ key: 'outstanding', label: 'Outstanding ₹' }],
                  })}
                />
              ) : (
                <EmptyState label="receivx.ar source has no debtor rows yet." />
              )}
            </Card>
          </div>
        </section>
      )}

      {section === 'compliance' && (
        <section data-testid="cockpit-section-compliance" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">③ Compliance</h2>
            <IntegrityBadge rows={cmpRows} />
          </div>
          {cmpRows.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {cmpRows.map((r) => {
                const pct = Number((r as { compliance_pct?: number }).compliance_pct ?? 0);
                const rag = resolveRag(pct, { amber: 80, red: 60, direction: 'higher-good' });
                return (
                  <ScorecardTile
                    key={String((r as { module?: string }).module)}
                    label={String((r as { module?: string }).module ?? '—')}
                    value={`${pct}%`}
                    rag={rag}
                    hint={`Filed ${(r as { filed?: number }).filed}/${(r as { total?: number }).total}`}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState label="comply360.aggregate.compliance-pct has no module rows yet." />
          )}
        </section>
      )}

      {section === 'ops-pulse' && (
        <section data-testid="cockpit-section-ops-pulse" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">④ Ops Pulse</h2>
            <IntegrityBadge rows={[...prodRows, ...dispRows]} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-2">Production Orders by Status</div>
              {prodByStatus.length > 0 ? (
                <ReportChart
                  data={prodByStatus}
                  config={defaultChartConfig({
                    chartType: 'column',
                    xKey: 'status',
                    series: [{ key: 'count', label: 'Orders' }],
                  })}
                />
              ) : (
                <EmptyState label="production.orders source has no rows yet." />
              )}
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-2">Dispatch Shipments by Status</div>
              {dispByStatus.length > 0 ? (
                <ReportChart
                  data={dispByStatus}
                  config={defaultChartConfig({
                    chartType: 'column',
                    xKey: 'status',
                    series: [{ key: 'count', label: 'Shipments' }],
                  })}
                />
              ) : (
                <EmptyState label="dispatch.shipments source has no rows yet." />
              )}
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
