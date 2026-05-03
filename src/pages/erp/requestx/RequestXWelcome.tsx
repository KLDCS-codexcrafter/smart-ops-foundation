/**
 * @file        RequestXWelcome.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block J
 * @purpose     RequestX welcome refresh · KPIs + Pulse + Health + Splitting + PinnedTemplates + Recent.
 * @disciplines SD-13, SD-14 (Pulse stub), SD-15, SD-16
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList, FileText, Building2, IndianRupee, Clock, CheckCircle2,
  Activity, AlertTriangle, Heart, Radio,
} from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useMaterialIndents } from '@/hooks/useMaterialIndents';
import { useServiceRequests } from '@/hooks/useServiceRequests';
import { useCapitalIndents } from '@/hooks/useCapitalIndents';
import { dAdd, round2 } from '@/lib/decimal-helpers';
import { PinnedTemplatesWidget } from '@/components/uth/PinnedTemplatesWidget';
import { STATUS_LABEL } from '@/types/requisition-common';
import {
  computeIndentHealthScore, detectSplittingPattern, inrFmt,
} from '@/lib/requestx-report-engine';
import { subscribeProcurementPulse, type PulseAlert } from '@/lib/procurement-pulse-stub';
import type { RequestXModule } from './RequestXSidebar.types';

interface Props {
  onNavigate: (m: RequestXModule) => void;
}

const severityClass = (s: PulseAlert['severity']): string =>
  s === 'critical' ? 'text-destructive' : s === 'warning' ? 'text-warning' : 'text-muted-foreground';

const healthBand = (score: number): { label: string; cls: string } => {
  if (score >= 85) return { label: 'Excellent', cls: 'text-success' };
  if (score >= 65) return { label: 'Good', cls: 'text-primary' };
  if (score >= 40) return { label: 'Warning', cls: 'text-warning' };
  return { label: 'Critical', cls: 'text-destructive' };
};

export function RequestXWelcome({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const mi = useMaterialIndents();
  const sr = useServiceRequests();
  const ci = useCapitalIndents();

  const kpis = useMemo(() => {
    const all = [...mi, ...sr, ...ci];
    const today = new Date().toISOString().slice(0, 10);
    const monthPrefix = today.slice(0, 7);
    const pendingHod = all.filter(x => x.status === 'pending_hod').length;
    const pendingPurchase = all.filter(x => x.status === 'pending_purchase').length;
    const approvedToday = all.filter(x => x.status === 'approved' && x.updated_at.slice(0, 10) === today).length;
    let monthSpend = 0;
    for (const x of all) {
      if (x.date.startsWith(monthPrefix)) monthSpend = dAdd(monthSpend, x.total_estimated_value);
    }
    return { pendingHod, pendingPurchase, approvedToday, monthSpend: round2(monthSpend) };
  }, [mi, sr, ci]);

  const recent = useMemo(() => {
    const rows = [
      ...mi.map(x => ({ ...x, kind: 'Material' as const })),
      ...sr.map(x => ({ ...x, kind: 'Service' as const })),
      ...ci.map(x => ({ ...x, kind: 'Capital' as const })),
    ];
    return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 10);
  }, [mi, sr, ci]);

  // OOB-4 · Health Score (averaged across material indents)
  const avgHealth = useMemo(() => {
    if (mi.length === 0) return 100;
    const total = mi.reduce((a, x) => a + computeIndentHealthScore(x), 0);
    return Math.round(total / mi.length);
  }, [mi]);
  const band = healthBand(avgHealth);

  // OOB-45 · Splitting flags
  const splittingFlags = useMemo(
    () => detectSplittingPattern([...mi, ...sr, ...ci]).slice(0, 3),
    [mi, sr, ci],
  );

  // OOB-18 · Pulse alerts (SD-14 stub)
  const [alerts, setAlerts] = useState<PulseAlert[]>([]);
  useEffect(() => {
    const handle = subscribeProcurementPulse(
      a => setAlerts(prev => [a, ...prev].slice(0, 5)),
      30000,
    );
    return () => handle.stop();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">RequestX</h1>
        <p className="text-sm text-muted-foreground">
          Department demand capture · Material Indent · Service Request · Capital Indent
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending HOD</p>
                <p className="text-2xl font-bold font-mono">{kpis.pendingHod}</p>
              </div>
              <Clock className="h-5 w-5 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Purchase</p>
                <p className="text-2xl font-bold font-mono">{kpis.pendingPurchase}</p>
              </div>
              <Clock className="h-5 w-5 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Approved Today</p>
                <p className="text-2xl font-bold font-mono">{kpis.approvedToday}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This Month Spend</p>
                <p className="text-xl font-bold font-mono">{inrFmt(kpis.monthSpend)}</p>
              </div>
              <IndianRupee className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create New</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => onNavigate('tx-material-indent')}>
            <ClipboardList className="h-4 w-4 mr-2" /> Material Indent
          </Button>
          <Button variant="outline" onClick={() => onNavigate('tx-service-request')}>
            <FileText className="h-4 w-4 mr-2" /> Service Request
          </Button>
          <Button variant="outline" onClick={() => onNavigate('tx-capital-indent')}>
            <Building2 className="h-4 w-4 mr-2" /> Capital Indent
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" /> Indent Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <p className="text-4xl font-bold font-mono">{avgHealth}</p>
              <span className={`text-xs font-medium ${band.cls}`}>{band.label}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average score across {mi.length} material indents · OOB-4
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Splitting Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {splittingFlags.length === 0 && (
              <p className="text-xs text-muted-foreground">No splitting patterns detected · OOB-45</p>
            )}
            {splittingFlags.map(f => (
              <div key={f.requester_id + (f.vendor_id ?? '')} className="flex items-center justify-between text-xs">
                <span>{f.requester_name}</span>
                <Badge variant={f.flag === 'high' ? 'destructive' : 'outline'} className="text-[10px]">
                  {inrFmt(f.aggregate_value)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" /> Procurement Pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.length === 0 && (
              <p className="text-xs text-muted-foreground">Listening for live alerts · OOB-18 stub</p>
            )}
            {alerts.map(a => (
              <div key={a.id} className="flex items-start gap-2 text-xs">
                <Activity className={`h-3 w-3 mt-0.5 ${severityClass(a.severity)}`} />
                <span className="flex-1">{a.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Pinned Templates</CardTitle></CardHeader>
          <CardContent>
            <PinnedTemplatesWidget entityCode={entityCode} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Indents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 && (
              <p className="text-xs text-muted-foreground">No indents yet. Click "Create New" above to begin.</p>
            )}
            {recent.map(r => (
              <div key={r.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
                <div className="flex flex-col">
                  <span className="font-mono text-xs">{r.voucher_no}</span>
                  <span className="text-xs text-muted-foreground">{r.kind} · {r.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{inrFmt(r.total_estimated_value)}</span>
                  <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[r.status]}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
