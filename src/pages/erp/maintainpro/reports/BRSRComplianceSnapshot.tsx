/**
 * @file        src/pages/erp/maintainpro/reports/BRSRComplianceSnapshot.tsx
 * @sprint      T-Phase-3.PROD-5 · Theme A Block 3
 * @purpose     BRSR Section A indicators snapshot · 4 tiles · BRSR-ready badge.
 */
import { useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { computeBRSRSectionAIndicators } from '@/lib/maintainpro-engine';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ShieldCheck, Zap, Cloud, Droplets, Trash2 } from 'lucide-react';

const FY_OPTIONS = ['FY2024-25', 'FY2025-26', 'FY2026-27'];

export function BRSRComplianceSnapshotPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [fy, setFy] = useState('FY2025-26');
  const indicators = useMemo(
    () => (entityCode
      ? computeBRSRSectionAIndicators(entityCode, fy)
      : { energyConsumedGJ: 0, emissionsTCO2: 0, waterKL: 0, wasteT: 0 }),
    [entityCode, fy],
  );

  if (!entityCode) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Select a company to view BRSR snapshot.</p>
      </div>
    );
  }

  const tiles = [
    { label: 'Energy Consumed', value: indicators.energyConsumedGJ, unit: 'GJ', icon: Zap },
    { label: 'Emissions', value: indicators.emissionsTCO2, unit: 'tCO₂e', icon: Cloud },
    { label: 'Water', value: indicators.waterKL, unit: 'KL', icon: Droplets },
    { label: 'Waste', value: indicators.wasteT, unit: 't', icon: Trash2 },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> BRSR Compliance Snapshot
          </h1>
          <p className="text-sm text-muted-foreground">SEBI BRSR Section A · 4 key indicators</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={fy} onValueChange={setFy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FY_OPTIONS.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline">BRSR-ready</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Card key={t.label} className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className="h-4 w-4" /> {t.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-2xl">{t.value.toLocaleString('en-IN')}</div>
                <div className="text-xs text-muted-foreground">{t.unit}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="glass-card">
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">
            Indicators populate BRSR Section A. Full BRSR Comply360 Arc (Sections B-G) lands in Sprint 68+.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default BRSRComplianceSnapshotPanel;
