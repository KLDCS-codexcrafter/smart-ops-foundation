/**
 * @file        src/pages/erp/accounting/capital-assets/BRSRFADisclosurePack.tsx
 * @purpose     UI dashboard + PDF export for FA-specific BRSR disclosure
 * @reachable   Via FinCorePage switch case 'fc-fa-brsr-disclosure' (wired Prompt C)
 * @reads-from  brsr-fa-engine.computeBRSRFADisclosurePack
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileDown, Leaf } from 'lucide-react';
import { computeBRSRFADisclosurePack } from '@/lib/brsr-fa-engine';

interface Props { entityCode: string }

export function BRSRFADisclosurePackPanel({ entityCode }: Props): JSX.Element {
  const [fy] = useState('FY 2025-26');
  const pack = useMemo(() => computeBRSRFADisclosurePack(entityCode, fy), [entityCode, fy]);

  const exportPDF = (): void => {
    // [JWT] Phase 5: server-side PDF render · for now use browser print
    window.print();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-success" />
          <h2 className="text-lg font-semibold">BRSR FA Disclosure Pack · {fy}</h2>
        </div>
        <Button size="sm" variant="outline" onClick={exportPDF}>
          <FileDown className="h-4 w-4 mr-1" /> Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KPI label="Total assets" value={pack.summary.total_assets_disclosed.toString()} />
        <KPI label="CO₂ kg / yr" value={pack.summary.total_co2_kg_per_year.toLocaleString('en-IN')} />
        <KPI label="With BRSR meta" value={pack.summary.total_assets_with_brsr_metadata.toString()} />
        <KPI label="Coverage" value={`${pack.summary.coverage_pct}%`} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {pack.sections.map(sec => (
          <Card key={sec.section}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Section {sec.section}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs font-mono">
              <div>Assets: {sec.asset_count}</div>
              <div>CO₂: {sec.total_carbon_footprint_kgco2_per_year.toLocaleString('en-IN')} kg</div>
              <div>Intensity: {sec.total_resource_intensity_score}</div>
              <div className="flex gap-1 flex-wrap pt-1">
                {Object.entries(sec.by_esg_category).map(([k, v]) => (
                  <Badge key={k} variant="outline" className="text-[9px]">{k}:{v}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><p className="text-2xl font-mono">{value}</p></CardContent>
    </Card>
  );
}
