/**
 * @file        src/pages/erp/comply360/esg/ESGSafetyPage.tsx
 * @purpose     Sprint 79b · ESG / Safety sub-tab on EsgPage · consumes comply360-esg-aggregator-engine.
 *              12 modules · DP-S79-6 deep-link UI to MaintainPro (energy + fire safety) and
 *              SiteX (PTW + incidents). FR-106 9th scenario · existing-shell tab extension.
 * @sprint      Sprint 79b · T-Phase-5.A.1.11-PASS-B · Block 5
 * @decisions   D-S69-1 (NATIVE) · DP-S79-6 (deep-links · no source mutation)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Leaf, ExternalLink, Flame, ShieldAlert, Activity, Droplets } from 'lucide-react';
import { toast } from 'sonner';
import {
  aggregateESGSafety,
  getEnergyTrend,
  getIncidentTrend,
  exportESGReportCsv,
  type ESGSafetyAggregatedView,
} from '@/lib/comply360-esg-aggregator-engine';

const ENTITIES = ['DEMO-CORP-01', 'ACME-PVT-LTD', 'BHARAT-AGRO-LLP'];
const FY = '2025-26';

interface DeepLink { label: string; href: string; icon: typeof Flame }
const DEEP_LINKS: DeepLink[] = [
  { label: 'View Energy in MaintainPro', href: '/erp/maintainpro/esg/energy', icon: Activity },
  { label: 'View Fire Safety in MaintainPro', href: '/erp/maintainpro/fire-safety', icon: Flame },
  { label: 'View PTW in SiteX', href: '/erp/sitex/permit-to-work', icon: ShieldAlert },
  { label: 'View Incidents in SiteX', href: '/erp/sitex/incidents', icon: ShieldAlert },
];

export default function ESGSafetyPage(): JSX.Element {
  const [entity, setEntity] = useState<string>(ENTITIES[0]);

  const view = useMemo<ESGSafetyAggregatedView>(() => aggregateESGSafety(entity, FY), [entity]);
  const energyTrend = useMemo(() => getEnergyTrend(entity, FY), [entity]);
  const incidentTrend = useMemo(() => getIncidentTrend(entity, FY), [entity]);
  const maxEnergy = Math.max(1, ...energyTrend.map((p) => p.kwh));
  const maxIncidents = Math.max(1, ...incidentTrend.map((p) => p.count));

  const onExport = (): void => {
    const csv = exportESGReportCsv(view);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `esg-safety-${entity}-${FY}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('ESG / Safety report exported');
  };

  const onDeepLink = (href: string, label: string): void => {
    toast.info(`Opening ${label}`);
    window.location.href = href;
  };

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Leaf className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">ESG / Safety Aggregator</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            12-module roll-up · energy + scope 1/2/3 emissions · fire safety · PTW · JSA · Toolbox · Incidents (LTIFR/TRIFR) · water + waste · BRSR P3/P6 scores. Operational data lives in MaintainPro &amp; SiteX (deep-link to source).
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <select className="text-xs bg-background border rounded-md px-2 py-1" value={entity} onChange={(e) => setEntity(e.target.value)}>
            {ENTITIES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <Button size="sm" variant="ghost" onClick={onExport}>Export CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">Energy</div>
          <div className="text-base font-bold font-mono">{view.esg.energy_kwh.toLocaleString('en-IN')} kWh</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">Scope 1 / 2 / 3 (tCO₂)</div>
          <div className="text-base font-bold font-mono">{view.esg.emissions_scope1_t} / {view.esg.emissions_scope2_t} / {view.esg.emissions_scope3_t}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Droplets className="h-3 w-3" /> Water / Waste</div>
          <div className="text-base font-bold font-mono">{view.esg.water_kl} kL · {view.esg.waste_t} t</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">BRSR P3 / P6 score</div>
          <div className="text-base font-bold font-mono">{view.brsr_principle_3_score ?? '—'} / {view.brsr_principle_6_score ?? '—'}</div>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">PTW open / closed</div>
          <div className="text-base font-bold font-mono">{view.safety.ptw_open} / {view.safety.ptw_closed}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">JSA / Toolbox</div>
          <div className="text-base font-bold font-mono">{view.safety.jsa_count} / {view.safety.toolbox_count}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground">LTIFR / TRIFR</div>
          <div className="text-base font-bold font-mono">{view.safety.ltifr} / {view.safety.trifr}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Flame className="h-3 w-3" /> Fire drills / audits</div>
          <div className="text-base font-bold font-mono">{view.safety.fire_drills_completed} / {view.safety.fire_audit_cycles_completed}</div>
        </Card>
      </div>

      <Card className="p-3">
        <h2 className="text-sm font-semibold mb-2">Energy trend (kWh · 12 months)</h2>
        <div className="flex items-end gap-1 h-20">
          {energyTrend.map((p) => (
            <div key={p.month} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-success/40 rounded-t"
                style={{ height: `${(p.kwh / maxEnergy) * 64}px` }}
                title={`${p.month}: ${p.kwh} kWh`}
              />
              <div className="text-[9px] text-muted-foreground font-mono">{p.month}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-3">
        <h2 className="text-sm font-semibold mb-2">Incident trend (count · 12 months)</h2>
        <div className="flex items-end gap-1 h-20">
          {incidentTrend.map((p) => (
            <div key={p.month} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-destructive/40 rounded-t"
                style={{ height: `${(p.count / maxIncidents) * 64}px`, minHeight: p.count > 0 ? '4px' : '0' }}
                title={`${p.month}: ${p.count}`}
              />
              <div className="text-[9px] text-muted-foreground font-mono">{p.month}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-3">
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-primary" />
          Deep-links to operational source (DP-S79-6)
        </h2>
        <p className="text-[11px] text-muted-foreground mb-3">
          ESG / Safety operational data lives in MaintainPro and SiteX. Comply360 aggregates and never mutates source.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {DEEP_LINKS.map((d) => {
            const Icon = d.icon;
            return (
              <Button
                key={d.href}
                variant="outline"
                className="justify-start"
                onClick={() => onDeepLink(d.href, d.label)}
              >
                <Icon className="h-4 w-4" />
                {d.label}
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
