/**
 * @file        src/pages/erp/eximx/compliance/AEOBenefitsDashboard.tsx
 * @purpose     AEO FULL benefits dashboard · BCD reduction + clearance savings + annual review
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, TrendingUp, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { loadEntityAEOCerts } from '@/lib/aeo-tier-engine';
import { computeAEOBenefit, getAEOUpgradePathway, AEO_BCD_REDUCTION_PCT, AEO_CLEARANCE_HOURS_SAVED } from '@/lib/aeo-tier-benefit-engine';
import type { EntityAEOCertification } from '@/types/aeo-tier-mapping';
import { ReportChart, ScorecardTile } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig, resolveRag } from '@/lib/report-framework';

export function AEOBenefitsDashboard(): JSX.Element {
  const entityCode = 'sinha-steel';
  const [certs, setCerts] = useState<EntityAEOCertification[]>([]);
  useEffect(() => { setCerts(loadEntityAEOCerts(entityCode)); }, []);

  const sampleBcd = 500000;
  const today = new Date().toISOString().slice(0, 10);
  const demoTier = certs[0]?.aeo_tier ?? 'tier_2';
  const benefit = computeAEOBenefit(entityCode, certs[0]?.entity_id ?? 'sinha-steel', today, sampleBcd);
  const pathway = getAEOUpgradePathway(demoTier);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold"><Award className="w-5 h-5 inline mr-2" />AEO FULL Benefits (Moat #4 PRIMARY)</h2>
        <p className="text-sm text-muted-foreground">Tier benefits engine · BCD reduction + expedited clearance + annual review tracker · sibling extension</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Current Tier</div><Badge variant="default">{benefit.tier}</Badge></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">BCD Reduction</div><div className="text-2xl font-bold text-success">{benefit.bcd_reduction_pct}%</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground"><Clock className="w-3 h-3 inline mr-1" />Clearance Saved</div><div className="text-2xl font-bold">{benefit.clearance_hours_saved}h</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total Benefit</div><div className="text-2xl font-bold text-success"><TrendingUp className="w-4 h-4 inline" /> ₹{benefit.total_benefit_inr.toLocaleString('en-IN')}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Tier Benefits Reference</CardTitle></CardHeader>
        <CardContent>
          {(['not_aeo', 'tier_1', 'tier_2', 'tier_3'] as const).map((tier) => (
            <div key={tier} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
              <Badge variant={tier === benefit.tier ? 'default' : 'outline'}>{tier}</Badge>
              <span>BCD reduction: <strong>{AEO_BCD_REDUCTION_PCT[tier]}%</strong></span>
              <span>Clearance hours saved: <strong>{AEO_CLEARANCE_HOURS_SAVED[tier]}h</strong></span>
            </div>
          ))}
        </CardContent>
      </Card>

      {benefit.is_review_due_within_30_days && (
        <Card className="border-warning">
          <CardContent className="pt-4 text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2 text-warning" />
            <strong>Annual Review Due</strong> · {benefit.annual_review_due_date} · Initiate re-application paperwork
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Upgrade Pathway · {benefit.tier} → {pathway.nextTier ?? 'Max'}</CardTitle></CardHeader>
        <CardContent>
          <ul className="text-sm space-y-1">
            {pathway.requirements.map((req, i) => (<li key={`req-${i}`}>• {req}</li>))}
          </ul>
        </CardContent>
      </Card>

      {(() => {
        const tiers = ['not_aeo', 'tier_1', 'tier_2', 'tier_3'] as const;
        const chartRows = tiers.map((t) => ({
          tier: t,
          bcd_pct: AEO_BCD_REDUCTION_PCT[t],
        }));
        const pct = benefit.bcd_reduction_pct;
        const kpi = getKpi('ex-aeo');
        const chartConfig = kpi?.defaultChart ?? defaultChartConfig({
          chartType: 'column', xKey: 'tier',
          series: [{ key: 'bcd_pct', label: 'BCD reduction %' }],
          title: 'AEO benefit utilisation',
        });
        const rag = resolveRag(pct, kpi?.thresholds ?? { amber: 80, red: 50, direction: 'higher-good' });
        const sig = signReport(chartRows);
        return (
          <section className="space-y-3" data-testid="rpt2biii-aeo-section">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ScorecardTile label="AEO benefit utilisation %" value={`${pct}%`} rag={rag} hint="Current tier BCD reduction" />
              <ScorecardTile label="Clearance hours saved" value={`${benefit.clearance_hours_saved}h`} hint="Per tier benefit" />
              <Card className="p-3 flex items-center gap-2" data-testid="integrity-badge-aeo">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Integrity</span>
                <span className="font-mono text-xs">{sig.slice(0, 12)}</span>
              </Card>
            </div>
            <Card className="p-4">
              <div className="h-72">
                <ReportChart data={chartRows} config={chartConfig} />
              </div>
            </Card>
          </section>
        );
      })()}
    </div>
  );
}
