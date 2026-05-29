/**
 * @file        src/pages/erp/comply360/exim/foreign-tax/MasterFilePage.tsx
 * @purpose     Sprint 77b · Master File (Form 3CEAA) Section 92D filing surface.
 *              Consumes transfer-pricing-engine (Pass A · read-only now).
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
  recordMasterFileFiling,
  loadMasterFileFilings,
  buildTransferPricingReport,
  MASTER_FILE_REVENUE_THRESHOLD_INR,
  MASTER_FILE_INTL_TXN_THRESHOLD_INR,
} from '@/lib/comply360-transfer-pricing-engine';

function inr(n: number): string { return '₹' + n.toLocaleString('en-IN'); }

export default function MasterFilePage(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [fy, setFy] = useState('FY25-26');
  const [groupRevenue, setGroupRevenue] = useState(String(6_200_000_000));
  const [tick, setTick] = useState(0);

  const filings = useMemo(() => {
    if (!entityCode) return [];
    return loadMasterFileFilings(entityCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, tick]);

  const report = useMemo(() => {
    if (!entityCode) return null;
    return buildTransferPricingReport(entityCode, fy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, fy, tick]);

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
    const rev = Number(groupRevenue) || 0;
    recordMasterFileFiling(entityCode, {
      financial_year: fy,
      consolidated_group_revenue_inr: rev,
      filing_required: rev >= MASTER_FILE_REVENUE_THRESHOLD_INR,
      filed_at: null,
      acknowledgment_no: null,
    });
    setTick(t => t + 1);
    toast.success(`Master File entry recorded for ${fy}`);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Master File · Form 3CEAA (Sec 92D)</h1>
        <p className="text-muted-foreground text-sm">
          Required if consolidated group revenue ≥ {inr(MASTER_FILE_REVENUE_THRESHOLD_INR)} <em>and</em> intl-RP txns ≥ {inr(MASTER_FILE_INTL_TXN_THRESHOLD_INR)}.
        </p>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><Label className="text-xs">Financial Year</Label><Input value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" /></div>
        <div><Label className="text-xs">Consolidated Group Revenue (₹)</Label><Input value={groupRevenue} onChange={(e) => setGroupRevenue(e.target.value)} className="font-mono" /></div>
        <div className="flex items-end gap-2">
          <Button onClick={handleRecord}>Record Filing</Button>
          <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}><RefreshCcw className="h-4 w-4" /></Button>
        </div>
      </Card>

      {report && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">TP report · {fy}</h2>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">3CEB snapshots: {report.form_3ceb_snapshots}</Badge>
            <Badge variant={report.master_file_required ? 'destructive' : 'secondary'}>
              Master File required: {String(report.master_file_required)}
            </Badge>
            <Badge variant={report.master_file_filed ? 'secondary' : 'outline'}>
              Master File filed: {String(report.master_file_filed)}
            </Badge>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Filings ({filings.length})</h2>
        {filings.length === 0 ? (
          <div className="text-xs text-muted-foreground">No Master File entries yet.</div>
        ) : (
          <div className="space-y-2">
            {filings.slice().reverse().map(f => (
              <div key={f.id} className="border-b py-2 last:border-0 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs">{f.id}</div>
                  <div className="text-xs text-muted-foreground">{f.financial_year} · revenue {inr(f.consolidated_group_revenue_inr)}</div>
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
