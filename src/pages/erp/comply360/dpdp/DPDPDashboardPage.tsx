/**
 * @file        src/pages/erp/comply360/dpdp/DPDPDashboardPage.tsx
 * @purpose     DPDP Act 2023 dashboard · 4-tab · 18th First-Class Standalone Page
 * @sprint      Sprint 92 · T-Phase-5.F.5.4 · Floor 5.4 · Q36
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  listDPOs, listDPRequests, listConsents, listBreaches, isBreachLate,
  getDPDPComplianceSummary,
} from '@/lib/comply360-dpdp-engine';

type TabKey = 'dpo' | 'requests' | 'consent' | 'breach';

export default function DPDPDashboardPage(): JSX.Element {
  const [tab, setTab] = useState<TabKey>('dpo');
  const summary = useMemo(() => getDPDPComplianceSummary(), []);
  const dpos = useMemo(() => listDPOs(), []);
  const dprs = useMemo(() => listDPRequests(), []);
  const consents = useMemo(() => listConsents(), []);
  const breaches = useMemo(() => listBreaches(), []);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">DPDP Act 2023 · Data Protection</h1>
        <p className="text-sm text-muted-foreground">
          Privacy Policy · Data Principal Rights · Consent · 72-hour Breach Notification
        </p>
      </header>

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{summary.active_dpos}</div>
          <div className="text-xs text-muted-foreground">Active DPOs</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-warning">{summary.overdue_dp_requests}</div>
          <div className="text-xs text-muted-foreground">Overdue DP Requests</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-success">{summary.active_consents}</div>
          <div className="text-xs text-muted-foreground">Active Consents</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-destructive">{summary.late_breach_notifications}</div>
          <div className="text-xs text-muted-foreground">Late Breach Reports</div>
        </Card>
      </div>

      <div className="text-sm">
        Overall status:{' '}
        <Badge variant={summary.overall_status === 'compliant' ? 'default' : 'destructive'}>
          {summary.overall_status}
        </Badge>
        {' · Privacy Policy: '}
        <Badge variant={summary.privacy_policy_published ? 'default' : 'destructive'}>
          {summary.privacy_policy_published ? 'published' : 'missing'}
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="dpo">DPO</TabsTrigger>
          <TabsTrigger value="requests">DP Requests</TabsTrigger>
          <TabsTrigger value="consent">Consent</TabsTrigger>
          <TabsTrigger value="breach">Breach</TabsTrigger>
        </TabsList>

        <TabsContent value="dpo">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">Data Protection Officers</h2>
            {dpos.length === 0 ? (
              <p className="text-xs text-muted-foreground">No DPO registered.</p>
            ) : (
              <ul className="space-y-1">
                {dpos.map((d) => (
                  <li key={d.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{d.name} · {d.email}</span>
                    <Badge variant={d.active ? 'default' : 'secondary'}>{d.active ? 'active' : 'inactive'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">Data Principal Requests</h2>
            {dprs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No requests received.</p>
            ) : (
              <ul className="space-y-1">
                {dprs.map((r) => (
                  <li key={r.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{r.request_type} · {r.principal_name} · due {r.due_date}</span>
                    <Badge>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="consent">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">Consent Records</h2>
            {consents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No consent records.</p>
            ) : (
              <ul className="space-y-1">
                {consents.map((c) => (
                  <li key={c.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{c.principal_id} · {c.purpose}</span>
                    <Badge variant={c.status === 'granted' ? 'default' : 'secondary'}>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="breach">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">Breach Notifications (72-hour rule)</h2>
            {breaches.length === 0 ? (
              <p className="text-xs text-muted-foreground">No breaches recorded.</p>
            ) : (
              <ul className="space-y-1">
                {breaches.map((b) => (
                  <li key={b.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">
                      {b.severity} · {b.affected_principal_count} principals · {b.hours_to_report ?? '–'}h to report
                    </span>
                    <Badge variant={isBreachLate(b) ? 'destructive' : 'default'}>
                      {isBreachLate(b) ? 'late' : b.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
