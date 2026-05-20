/**
 * @file        src/pages/erp/eximx/import/MultiLegGITDetail.tsx
 * @purpose     Multi-Leg GIT detail · 5-leg drilldown · 3-bucket reconciliation · cost allocation · Saathi panel
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, Anchor, Building2, Warehouse, Truck, Ship } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getMultiLegGIT } from '@/lib/multi-leg-git-engine';
import { summarizeMLGITReconciliation } from '@/lib/reconciliation-engine';
import { MultiLegGITSaathiPanel } from '../saathi/MultiLegGITSaathiPanel';
import { CostAllocationMethodPicker } from './CostAllocationMethodPicker';

const LEG_ICONS = [Anchor, Ship, Anchor, Building2, Warehouse];
const LEG_NAMES = ['Origin Port', 'Vessel/Flight', 'Destination Port', 'CFS/ICD', 'Customer Warehouse'];

export function MultiLegGITDetail(): JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const [showSaathi, setShowSaathi] = useState(false);
  const mlgit = entityCode ? getMultiLegGIT(entityCode, id) : null;

  if (!mlgit) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate('/erp/eximx/import')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <p className="mt-4">MultiLegGIT not found: {id}</p>
      </div>
    );
  }

  const summary = summarizeMLGITReconciliation(mlgit);
  const legs = [mlgit.leg1, mlgit.leg2, mlgit.leg3, mlgit.leg4, mlgit.leg5];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/erp/eximx/import')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold font-mono">{mlgit.mlgit_no}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge>{mlgit.overall_state}</Badge>
              <Badge variant="outline">PO: {mlgit.related_import_po_no}</Badge>
              <Badge variant="outline">Method: {mlgit.allocation_method}</Badge>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowSaathi((v) => !v)}><BookOpen className="w-4 h-4 mr-2" /> Saathi</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="w-4 h-4" /> 5-Leg Journey</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {legs.map((leg, i) => {
                const Icon = LEG_ICONS[i];
                return (
                  <div key={leg.leg_no} className={`p-3 rounded border-l-4 ${leg.skip_flag ? 'bg-muted/20 border-l-muted opacity-50' : 'bg-muted/40 border-l-primary'}`}>
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <div className="flex-1">
                        <div className="font-semibold text-sm">Leg {i + 1} · {LEG_NAMES[i]}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {leg.skip_flag ? 'SKIPPED · not applicable for this shipment' : `State: ${leg.state}`}
                        </div>
                        {!leg.skip_flag && leg.notes && <div className="text-xs mt-1">{leg.notes}</div>}
                      </div>
                      {!leg.skip_flag && <Badge>{leg.state}</Badge>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-warning">
            <CardHeader><CardTitle className="text-base">3-Bucket Reconciliation</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/40 rounded">
                  <Badge variant="outline" className="mb-2">Booked</Badge>
                  <div className="font-mono text-lg">₹{summary.booked.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                </div>
                <div className="p-3 bg-muted/40 rounded">
                  <Badge variant="outline" className="mb-2">Custom Revalued</Badge>
                  <div className="font-mono text-lg">{summary.custom_revalued > 0 ? `₹${summary.custom_revalued.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</div>
                  {summary.variance_booked_to_custom_inr !== 0 && (
                    <div className="text-xs mt-1 text-muted-foreground">Δ {summary.variance_booked_to_custom_pct.toFixed(2)}%</div>
                  )}
                </div>
                <div className="p-3 bg-muted/40 rounded">
                  <Badge variant="outline" className="mb-2">Actual Landed</Badge>
                  <div className="font-mono text-lg">{summary.actual_landed > 0 ? `₹${summary.actual_landed.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—'}</div>
                  {summary.variance_custom_to_actual_inr !== 0 && (
                    <div className="text-xs mt-1 text-muted-foreground">Δ {summary.variance_custom_to_actual_pct.toFixed(2)}%</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">4-Method Cost Allocation</CardTitle></CardHeader>
            <CardContent>
              <CostAllocationMethodPicker currentMethod={mlgit.allocation_method} />
              <p className="text-xs text-muted-foreground mt-3">
                Method consumed from LandedCostConfig (Q14=a) · operator can override per GIT.
                4 methods: by_value · by_weight · by_quantity · equal.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Reconciliation Events ({mlgit.reconciliation_events.length})</CardTitle></CardHeader>
            <CardContent>
              {mlgit.reconciliation_events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reconciliation events yet</p>
              ) : (
                <div className="space-y-2">
                  {mlgit.reconciliation_events.map((e) => (
                    <div key={e.id} className="text-xs p-2 bg-muted/40 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{e.event_type}</Badge>
                        <Badge>{e.bucket}</Badge>
                        <span className="font-mono">₹{e.amount_before_inr.toFixed(0)} → ₹{e.amount_after_inr.toFixed(0)}</span>
                        {e.variance_pct !== 0 && <span className="text-muted-foreground">({e.variance_pct.toFixed(2)}%)</span>}
                      </div>
                      <div className="text-muted-foreground mt-1">{e.justification}</div>
                      {e.gazette_ref && <div className="text-xs italic mt-1">Gazette: {e.gazette_ref}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {showSaathi && <div className="lg:col-span-1"><MultiLegGITSaathiPanel mlgit={mlgit} /></div>}
      </div>
    </div>
  );
}
