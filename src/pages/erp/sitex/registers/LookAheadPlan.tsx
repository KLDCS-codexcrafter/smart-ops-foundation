/**
 * @file        src/pages/erp/sitex/registers/LookAheadPlan.tsx
 * @purpose     14-day rolling Look-Ahead Plan (OOB #19) · weather impact stub
 * @sprint      T-Phase-1.A.15a · Block E.5
 * @[JWT]       Phase 2 real weather API
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { listSites } from '@/lib/sitex-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
// RPT-6c imports
import { ReportChart } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';
import { ShieldCheck as RPT6cShield } from 'lucide-react';

interface Props { onNavigate: (m: string) => void }

const WEATHER_CYCLE: Array<'sunny' | 'cloudy' | 'rainy' | 'extreme'> = ['sunny', 'sunny', 'cloudy', 'sunny', 'rainy', 'cloudy', 'sunny'];

function riskFor(w: string): 'low' | 'medium' | 'high' {
  if (w === 'extreme') return 'high';
  if (w === 'rainy') return 'medium';
  return 'low';
}

export function LookAheadPlan({ onNavigate: _onNavigate }: Props): JSX.Element {
  const { entityCode: entity } = useEntityCode();
  const sites = useMemo(() => listSites(entity), [entity]);
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? '');

  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const w = WEATHER_CYCLE[i % WEATHER_CYCLE.length];
    return { date: d.toISOString().split('T')[0], weather: w, risk: riskFor(w) };
  });

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="h-6 w-6 text-amber-600" />
        <h1 className="text-2xl font-bold">14-Day Look-Ahead Plan</h1>
      </div>
      <Card className="p-4">
        <select className="w-full border rounded-lg px-3 py-2 bg-background"
          value={siteId} onChange={(e) => setSiteId(e.target.value)}>
          <option value="">Select site...</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.site_code} · {s.site_name}</option>)}
        </select>
      </Card>
      <Card className="p-6">
        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => (
            <div key={d.date} className="p-3 border rounded-lg text-center text-xs">
              <div className="font-semibold">{d.date.slice(5)}</div>
              <div className="text-muted-foreground capitalize my-1">{d.weather}</div>
              <Badge variant="outline" className={
                d.risk === 'high' ? 'border-destructive text-destructive' :
                d.risk === 'medium' ? 'border-warning text-warning' : 'border-success text-success'
              }>{d.risk}</Badge>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">Weather forecast stub · Phase 2 wires real weather API</p>
      </Card>

      {(() => {
        const rows = days.map(d => ({ week: d.date, planned_qty: d.risk === 'high' ? 3 : d.risk === 'medium' ? 2 : 1 }));
        const cfg = getKpi('site-lookahead')?.defaultChart ?? defaultChartConfig({ chartType: 'column', xKey: 'week', series: [{ key: 'planned_qty', label: 'Risk score' }], title: '14-day look-ahead risk' });
        const hash = signReport(rows);
        const short = hash.replace('fnv1a:', '').slice(0, 10);
        return (
          <div className="border rounded-lg p-3 space-y-2" data-testid="site-lookahead-dashboard-host">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center text-[10px] font-mono border rounded px-1.5 py-0.5" data-testid="site-lookahead-integrity-badge" title={hash}>
                <RPT6cShield className="h-3 w-3 mr-1" />{short}
              </span>
            </div>
            <div className="w-full h-64" data-testid="site-lookahead-chart-host"><ReportChart data={rows} config={cfg} /></div>
          </div>
        );
      })()}
    </div>
  );
}
