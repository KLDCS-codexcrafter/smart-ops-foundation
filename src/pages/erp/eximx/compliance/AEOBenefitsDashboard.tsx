/**
 * @file        src/pages/erp/eximx/compliance/AEOBenefitsDashboard.tsx
 * @purpose     AEO FULL benefits dashboard · BCD reduction + clearance savings + annual review
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { loadEntityAEOCerts } from '@/lib/aeo-tier-engine';
import { computeAEOBenefit, getAEOUpgradePathway, AEO_BCD_REDUCTION_PCT, AEO_CLEARANCE_HOURS_SAVED } from '@/lib/aeo-tier-benefit-engine';
import type { EntityAEOCertification } from '@/types/aeo-tier-mapping';

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
    </div>
  );
}
