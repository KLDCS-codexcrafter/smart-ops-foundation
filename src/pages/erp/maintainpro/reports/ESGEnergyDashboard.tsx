/**
 * @file        src/pages/erp/maintainpro/reports/ESGEnergyDashboard.tsx
 * @sprint      T-Phase-3.PROD-5 · Theme A Block 2 · RPT-12c chart-layer swap
 * @purpose     ESG energy + Scope 1/2 dashboard · 12-month trend
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  computeESGEnergyHistorical,
  computeScope1Emissions,
  computeScope2Emissions,
} from '@/lib/maintainpro-engine';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportChart } from '@/components/operix-core/report-framework';
import { defaultChartConfig, signReport } from '@/lib/report-framework';
import { Leaf, Zap, Factory, ShieldCheck } from 'lucide-react';

export function ESGEnergyDashboardPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const fy = useMemo(() => {
    const d = new Date();
    const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    return `FY${y}-${String((y + 1) % 100).padStart(2, '0')}`;
  }, []);

  const historical = useMemo(
    () => (entityCode ? computeESGEnergyHistorical(entityCode, 12) : []),
    [entityCode],
  );
  const scope1 = useMemo(
    () => (entityCode ? computeScope1Emissions(entityCode, fy) : { fuelKg: 0, refrigerantKg: 0, totalKgCO2: 0 }),
    [entityCode, fy],
  );
  const scope2 = useMemo(
    () => (entityCode ? computeScope2Emissions(entityCode, fy) : { gridKwh: 0, emissionFactorKgPerKwh: 0, totalKgCO2: 0 }),
    [entityCode, fy],
  );
  const hash = useMemo(() => signReport(historical as unknown as Record<string, unknown>[]), [historical]);
  const short = hash.replace('fnv1a:', '').slice(0, 10);

  if (!entityCode) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Select a company to view ESG dashboard.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Leaf className="h-6 w-6 text-success" /> ESG Energy Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">{fy} · CEA 2024 baseline 0.82 kg CO₂/kWh</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="mp-esg-integrity-badge" title={hash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{short}
          </Badge>
          <Badge variant="outline">BRSR-ready</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Factory className="h-4 w-4" /> Scope 1 (Direct)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl">{scope1.totalKgCO2.toLocaleString('en-IN')} kg CO₂</div>
            <div className="text-xs text-muted-foreground mt-1">
              Fuel {scope1.fuelKg.toLocaleString('en-IN')} · Refrigerant {scope1.refrigerantKg.toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" /> Scope 2 (Grid)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl">{scope2.totalKgCO2.toLocaleString('en-IN')} kg CO₂</div>
            <div className="text-xs text-muted-foreground mt-1">
              {scope2.gridKwh.toLocaleString('en-IN')} kWh × {scope2.emissionFactorKgPerKwh.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Scope 1 + 2</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-2xl text-primary">
              {(scope1.totalKgCO2 + scope2.totalKgCO2).toLocaleString('en-IN')} kg CO₂
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ≈ {((scope1.totalKgCO2 + scope2.totalKgCO2) / 1000).toFixed(2)} tCO₂e
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card" data-testid="mp-esg-chart-host">
        <CardHeader>
          <CardTitle>Last 12 months · Energy + Carbon Trend</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 320 }}>
          <ReportChart
            data={historical as unknown as Record<string, unknown>[]}
            config={defaultChartConfig({
              chartType: 'line', xKey: 'month',
              series: [
                { key: 'kwh', label: 'kWh' },
                { key: 'kgCO2', label: 'kg CO₂' },
              ],
            })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default ESGEnergyDashboardPanel;
