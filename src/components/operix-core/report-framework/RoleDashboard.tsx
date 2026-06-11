/**
 * @file        RoleDashboard.tsx
 * @purpose     RPT-4 · ONE generic role-aware dashboard surface.
 *              Auto-derives the section / KPI list from the role-layer engine,
 *              the entitled-cards set and the global KPI registry. Grows as
 *              later sprints seed more KPIs (QL-6 · no per-role files).
 * @sprint      RPT-4 · Role-Layer Auto-Derivation + Role Dashboard
 * @[JWT]       N/A — pure presentation over in-memory registry
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScorecardTile } from './ScorecardTile';
import { ReportChart } from './ChartLibrary';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  deriveRoleDashboard,
  layerCeilingFor,
  type RoleLayer,
} from '@/lib/report-framework/role-layer';
import { getSource } from '@/lib/report-framework/data-source-catalog';


const LAYER_ORDER: RoleLayer[] = ['operator', 'manager', 'management'];
const LAYER_RANK: Record<RoleLayer, number> = {
  operator: 1, manager: 2, management: 3,
};

export function RoleDashboard(): JSX.Element {
  const { profile, allowedCards } = useCardEntitlement();
  const { entityCode } = useEntityCode();
  const role = profile.role;
  const ceiling = useMemo(() => layerCeilingFor(role), [role]);
  const [layer, setLayer] = useState<RoleLayer>(ceiling);

  const config = useMemo(
    () => deriveRoleDashboard(role, layer, allowedCards as unknown as string[]),
    [role, layer, allowedCards],
  );

  // RPT-4 · T3 fix: real DSC rows per xc KPI. Empty/unresolved → empty-state.
  const xcRows = useMemo(() => {
    const map: Record<string, Record<string, unknown>[]> = {};
    const xc = config.sections.find((s) => s.cardId === 'cross-card');
    if (!xc) return map;
    for (const kpi of xc.kpis) {
      const src = getSource(kpi.dataSource);
      try {
        map[kpi.id] = src?.read(entityCode) ?? [];
      } catch {
        map[kpi.id] = [];
      }
    }
    return map;
  }, [config.sections, entityCode]);


  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Auto-derived for role <span className="font-mono">{role}</span>
            {' · '}layer ceiling <span className="font-mono">{ceiling}</span>
          </p>
        </div>
        <div className="flex items-center gap-2" role="group" aria-label="Layer switcher">
          {LAYER_ORDER.map((l) => {
            const disabled = LAYER_RANK[l] > LAYER_RANK[ceiling];
            const active = l === config.layer;
            return (
              <Button
                key={l}
                size="sm"
                variant={active ? 'default' : 'outline'}
                disabled={disabled}
                onClick={() => setLayer(l)}
                data-testid={`layer-chip-${l}`}
              >
                {l}
              </Button>
            );
          })}
        </div>
      </header>

      {config.sections.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground" data-testid="role-dashboard-empty">
          No KPIs available for your role at this layer.
        </Card>
      ) : (
        config.sections.map((section) => (
          <section
            key={section.cardId}
            className="space-y-3"
            data-testid={`role-dashboard-section-${section.cardId}`}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{section.cardName}</h2>
              <Badge variant="outline" className="text-[10px]">
                {section.kpis.length} KPI{section.kpis.length === 1 ? '' : 's'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {section.kpis.map((kpi) => (
                <ScorecardTile
                  key={kpi.id}
                  label={kpi.label}
                  value="—"
                  hint={kpi.id}
                />
              ))}
            </div>
            {section.cardId === 'cross-card' && config.layer === 'management' ? (
              <div
                className="grid grid-cols-1 lg:grid-cols-2 gap-3"
                data-testid="role-dashboard-xc-charts"
              >
                {section.kpis.map((kpi) => {
                  const rows = xcRows[kpi.id] ?? [];
                  return (
                    <Card key={`${kpi.id}-chart`} className="p-3">
                      <div className="text-xs text-muted-foreground mb-2">{kpi.label}</div>
                      <div data-testid={`role-dashboard-xc-chart-${kpi.id}`}>
                        {rows.length > 0 ? (
                          <ReportChart data={rows} config={kpi.defaultChart} />
                        ) : (
                          <div
                            className="text-xs text-muted-foreground py-6 text-center"
                            data-testid={`role-dashboard-xc-empty-${kpi.id}`}
                          >
                            No data yet for this KPI
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : null}

          </section>
        ))
      )}
    </div>
  );
}
