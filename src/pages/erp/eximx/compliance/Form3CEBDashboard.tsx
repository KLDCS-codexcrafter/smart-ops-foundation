/**
 * @file        src/pages/erp/eximx/compliance/Form3CEBDashboard.tsx
 * @purpose     D-NEW-FE · Form 3CEB compliance dashboard · 8th SIBLING UI surface
 * @sprint      T-Phase-2.B-2-EximX-MediumDNEWs · Block C
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileCheck, Calendar } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  buildForm3CEBSnapshot,
  saveForm3CEBSnapshot,
  loadForm3CEBSnapshots,
  summarizeForm3CEB,
} from '@/lib/form-3ceb-engine';

export default function Form3CEBDashboard(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [fy] = useState('FY2025-26');
  const [refreshKey, setRefreshKey] = useState(0);

  const snapshot = useMemo(() => {
    if (!entityCode) return null;
    return buildForm3CEBSnapshot(entityCode, fy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, fy, refreshKey]);

  const summary = snapshot ? summarizeForm3CEB(snapshot) : null;
  const existingSnapshots = entityCode ? loadForm3CEBSnapshots(entityCode) : [];

  const handlePersist = (): void => {
    if (!entityCode || !snapshot) return;
    saveForm3CEBSnapshot(entityCode, snapshot);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <FileCheck className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-semibold">Form 3CEB · Section 92E · D-NEW-FE · 8th SIBLING</h1>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Related parties</CardTitle></CardHeader>
            <CardContent className="pt-0"><p className="text-2xl font-semibold">{summary.parties}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Transactions</CardTitle></CardHeader>
            <CardContent className="pt-0"><p className="text-2xl font-semibold">{summary.transactions}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total value</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold">₹ {summary.total_value_inr.toLocaleString('en-IN')}</p>
              <Badge variant={summary.filing_required ? 'destructive' : 'secondary'} className="mt-1">
                {summary.filing_required ? 'Filing required' : 'Below threshold'}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Calendar className="w-3 h-3" />Days to deadline</CardTitle></CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold">{summary.days_until_due >= 0 ? summary.days_until_due : 'Past due'}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Snapshot generation</CardTitle>
            <Button onClick={handlePersist} disabled={!snapshot}>Persist draft snapshot</Button>
          </div>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <p>Snapshot built for: <strong>{fy}</strong></p>
          <p>Persisted snapshots: <strong>{existingSnapshots.length}</strong></p>
          <p className="text-muted-foreground">
            Once CA-signed (status: ca_signed), snapshots are immutable per Section 92E audit trail.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
