/**
 * @file        src/pages/erp/comply360/exim/foreign-tax/CbCRPage.tsx
 * @purpose     Sprint 77b · Country-by-Country Report (Form 3CEAD) Section 286 surface.
 * @sprint      Sprint 77b · T-Phase-5.A.1.9-PASS-B · Block 5
 * @disciplines FR-7 · FR-13 · FR-19 (engine 0-DIFF)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  recordCbCRFiling,
  loadCbCRFilings,
  CBCR_PARENT_REVENUE_THRESHOLD_INR,
} from '@/lib/comply360-transfer-pricing-engine';

function inr(n: number): string { return '₹' + n.toLocaleString('en-IN'); }

export default function CbCRPage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [fy, setFy] = useState('FY25-26');
  const [parentRev, setParentRev] = useState(String(72_000_000_000));
  const [tick, setTick] = useState(0);

  const filings = useMemo(() => {
    if (!entityCode) return [];
    return loadCbCRFilings(entityCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
        </Card>
      </div>
    );
  }

  const handleRecord = (): void => {
    const rev = Number(parentRev) || 0;
    recordCbCRFiling(entityCode, {
      financial_year: fy,
      parent_consolidated_revenue_inr: rev,
      filing_required: rev >= CBCR_PARENT_REVENUE_THRESHOLD_INR,
      filed_at: null,
      acknowledgment_no: null,
    });
    setTick(t => t + 1);
    toast.success(`CbCR entry recorded for ${fy}`);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">CbCR · Form 3CEAD (Sec 286)</h1>
        <p className="text-muted-foreground text-sm">
          Required when ultimate parent consolidated revenue ≥ {inr(CBCR_PARENT_REVENUE_THRESHOLD_INR)} (~€750M equivalent).
        </p>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><Label className="text-xs">Financial Year</Label><Input value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" /></div>
        <div><Label className="text-xs">Parent Consolidated Revenue (₹)</Label><Input value={parentRev} onChange={(e) => setParentRev(e.target.value)} className="font-mono" /></div>
        <div className="flex items-end gap-2">
          <Button onClick={handleRecord}>Record Filing</Button>
          <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}><RefreshCcw className="h-4 w-4" /></Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Filings ({filings.length})</h2>
        {filings.length === 0 ? (
          <div className="text-xs text-muted-foreground">No CbCR entries yet.</div>
        ) : (
          <div className="space-y-2">
            {filings.slice().reverse().map(f => (
              <div key={f.id} className="border-b py-2 last:border-0 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs">{f.id}</div>
                  <div className="text-xs text-muted-foreground">{f.financial_year} · parent revenue {inr(f.parent_consolidated_revenue_inr)}</div>
                </div>
                <Badge variant={f.filing_required ? 'destructive' : 'secondary'}>
                  {f.filing_required ? 'Required' : 'Not required'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
