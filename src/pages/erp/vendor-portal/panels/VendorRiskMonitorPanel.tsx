/**
 * @file        VendorRiskMonitorPanel.tsx
 * @sprint      T-VPG-VendorPortal-Gaps
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle2, Settings } from 'lucide-react';
import {
  listAlerts, updateAlertStatus, listThresholds, updateThreshold,
} from '@/lib/vendor-risk-compliance-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import type { VendorRiskAlert } from '@/types/vendor-risk-alert';
import type { VendorRiskThreshold } from '@/types/vendor-risk-threshold';

export function VendorRiskMonitorPanel(): JSX.Element {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const [alerts, setAlerts] = useState<VendorRiskAlert[]>([]);
  const [thresholds, setThresholds] = useState<VendorRiskThreshold[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setAlerts(listAlerts(entityCode));
    setThresholds(listThresholds(entityCode));
  }, [entityCode]);

  const handleAck = (id: string): void => {
    updateAlertStatus(entityCode, id, 'acknowledged');
    setAlerts(listAlerts(entityCode));
  };
  const handleResolve = (id: string): void => {
    updateAlertStatus(entityCode, id, 'resolved');
    setAlerts(listAlerts(entityCode));
  };
  const handleThresholdEdit = (kind: VendorRiskThreshold['kind'], value: number): void => {
    updateThreshold(entityCode, kind, value);
    setThresholds(listThresholds(entityCode));
  };

  const open = alerts.filter((a) => a.status === 'open');
  const ack = alerts.filter((a) => a.status === 'acknowledged');

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" /> Risk Monitor
        </h1>
        <Button variant="outline" size="sm" onClick={() => setShowSettings((s) => !s)}>
          <Settings className="w-4 h-4 mr-2" /> Thresholds
        </Button>
      </div>

      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle>CC-Editable Thresholds</CardTitle>
            <CardDescription>Edits append to an internal log · audit-trail wall remains 0-DIFF.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {thresholds.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex-1">
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </div>
                <Input
                  type="number"
                  className="w-24 font-mono"
                  defaultValue={t.value}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v) && v !== t.value) handleThresholdEdit(t.kind, v);
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open</CardDescription>
            <CardTitle className="font-mono text-3xl">{open.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Acknowledged</CardDescription>
            <CardTitle className="font-mono text-3xl">{ack.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Alerts</CardTitle></CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No alerts. Honest study: alerts are only raised when source signals exist.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={a.severity === 'critical' ? 'destructive' : 'secondary'}>{a.severity}</Badge>
                      <span className="text-xs text-muted-foreground">{a.source}</span>
                      <Badge variant="outline">{a.status}</Badge>
                    </div>
                    <div className="text-sm font-medium mt-1">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.detail}</div>
                  </div>
                  <div className="flex gap-2">
                    {a.status === 'open' && (
                      <Button size="sm" variant="outline" onClick={() => handleAck(a.id)}>Ack</Button>
                    )}
                    {a.status !== 'resolved' && (
                      <Button size="sm" variant="outline" onClick={() => handleResolve(a.id)}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
