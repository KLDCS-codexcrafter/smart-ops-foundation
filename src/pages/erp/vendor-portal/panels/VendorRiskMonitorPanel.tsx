/**
 * @file        src/pages/erp/vendor-portal/panels/VendorRiskMonitorPanel.tsx
 * @purpose     Risk Monitor · alerts list + CC-editable threshold rules · CONSUMES base scores
 * @sprint      T-VPG-VendorPortal-Gaps
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Play, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  listRiskAlerts, listRiskThresholds, evaluateRiskThresholds,
  upsertRiskThreshold, deleteRiskThreshold, updateRiskAlertStatus,
} from '@/lib/vendor-risk-compliance-engine';
import type { VendorRiskAlert } from '@/types/vendor-risk-alert';
import type { VendorRiskThreshold, VendorRiskMetric, VendorRiskOperator } from '@/types/vendor-risk-threshold';

const severityBadge = (s: VendorRiskAlert['severity']): string =>
  s === 'critical' ? 'bg-red-500/15 text-red-700 border-red-500/30' :
  s === 'warning'  ? 'bg-amber-500/15 text-amber-700 border-amber-500/30' :
                     'bg-blue-500/15 text-blue-700 border-blue-500/30';

export function VendorRiskMonitorPanel(): JSX.Element {
  const entityCode = useMemo(() => {
    try { return localStorage.getItem('active_entity_code') ?? DEFAULT_ENTITY_SHORTCODE; }
    catch { return DEFAULT_ENTITY_SHORTCODE; }
  }, []);
  const [alerts, setAlerts] = useState<VendorRiskAlert[]>(() => listRiskAlerts(entityCode));
  const [thresholds, setThresholds] = useState<VendorRiskThreshold[]>(() => listRiskThresholds(entityCode));
  const [form, setForm] = useState<{ metric: VendorRiskMetric; operator: VendorRiskOperator; value: string; severity: VendorRiskAlert['severity'] }>({
    metric: 'reliability', operator: 'lt', value: '50', severity: 'warning',
  });

  const runEval = (): void => {
    const fresh = evaluateRiskThresholds(entityCode);
    setAlerts(listRiskAlerts(entityCode));
    toast.success(fresh.length === 0 ? 'No new alerts (honest no-alert if no source scores)' : `${fresh.length} new alert(s)`);
  };

  const addThreshold = (): void => {
    const n = Number(form.value);
    if (!Number.isFinite(n)) { toast.error('Value must be numeric'); return; }
    upsertRiskThreshold(entityCode, { metric: form.metric, operator: form.operator, value: n, severity: form.severity, active: true });
    setThresholds(listRiskThresholds(entityCode));
    toast.success('Threshold added');
  };

  const removeThreshold = (id: string): void => {
    deleteRiskThreshold(entityCode, id);
    setThresholds(listRiskThresholds(entityCode));
  };

  const acknowledge = (id: string): void => {
    updateRiskAlertStatus(entityCode, id, 'acknowledged');
    setAlerts(listRiskAlerts(entityCode));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Risk Monitor</h1>
            <p className="text-sm text-muted-foreground">Threshold-driven alerts · consumes reliability / financial-health / compliance scores · never recomputes</p>
          </div>
        </div>
        <Button onClick={runEval}><Play className="h-4 w-4 mr-1" /> Evaluate now</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Threshold Rules ({thresholds.length})</CardTitle>
          <CardDescription>CC-editable · breach raises alerts (deduped per open rule × vendor)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Select value={form.metric} onValueChange={v => setForm({ ...form, metric: v as VendorRiskMetric })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="reliability">Reliability</SelectItem>
                <SelectItem value="financial_health">Financial Health</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="on_time">On-time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.operator} onValueChange={v => setForm({ ...form, operator: v as VendorRiskOperator })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lt">&lt;</SelectItem>
                <SelectItem value="lte">&le;</SelectItem>
                <SelectItem value="gt">&gt;</SelectItem>
                <SelectItem value="gte">&ge;</SelectItem>
                <SelectItem value="eq">=</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
            <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v as VendorRiskAlert['severity'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addThreshold}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>
          <div className="space-y-2">
            {thresholds.map(t => (
              <div key={t.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <div className="font-mono text-xs">
                  {t.metric} {t.operator} {t.value} · <Badge className={severityBadge(t.severity)}>{t.severity}</Badge>
                  {!t.active && <Badge variant="secondary" className="ml-2">inactive</Badge>}
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeThreshold(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Open Alerts ({alerts.filter(a => a.status === 'open').length})</CardTitle></CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No alerts. Click <em>Evaluate now</em> to scan source scores.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map(a => (
                <div key={a.id} className="flex items-start justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={severityBadge(a.severity)}>{a.severity}</Badge>
                      <span className="font-medium">{a.message}</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      vendor={a.vendor_id} · raised={a.raised_at.slice(0,19)} · status={a.status}
                    </div>
                  </div>
                  {a.status === 'open' && (
                    <Button size="sm" variant="outline" onClick={() => acknowledge(a.id)}>Acknowledge</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
