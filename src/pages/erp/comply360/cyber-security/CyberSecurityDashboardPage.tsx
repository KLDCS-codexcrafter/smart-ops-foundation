/**
 * @file        src/pages/erp/comply360/cyber-security/CyberSecurityDashboardPage.tsx
 * @purpose     Cyber Security dashboard · 3-tab · 19th First-Class Standalone Page
 * @sprint      Sprint 92 · T-Phase-5.F.5.4 · Floor 5.4 · Q36
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import {
  listCyberIncidents, isIncidentLate,
  listVulnerabilities, listAccessGrants,
  getCyberComplianceSummary,
} from '@/lib/comply360-cyber-security-engine';
import { ReportChart, ScorecardTile } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig, resolveRag } from '@/lib/report-framework';

type TabKey = 'incidents' | 'vulnerabilities' | 'access';

export default function CyberSecurityDashboardPage(): JSX.Element {
  const [tab, setTab] = useState<TabKey>('incidents');
  const summary = useMemo(() => getCyberComplianceSummary(), []);
  const incidents = useMemo(() => listCyberIncidents(), []);
  const vulns = useMemo(() => listVulnerabilities(), []);
  const grants = useMemo(() => listAccessGrants({ active: true }), []);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Cyber Security · CERT-In Directions 2022</h1>
        <p className="text-sm text-muted-foreground">
          6-hour Incident Reporting · Vulnerability Disclosure · Access Control Matrix
        </p>
      </header>

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-warning">{summary.open_incidents}</div>
          <div className="text-xs text-muted-foreground">Open Incidents</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-destructive">{summary.late_incident_reports}</div>
          <div className="text-xs text-muted-foreground">Late Reports (&gt;6h)</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-destructive">{summary.critical_vulnerabilities_open}</div>
          <div className="text-xs text-muted-foreground">Critical Vulns Open</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{summary.active_access_grants}</div>
          <div className="text-xs text-muted-foreground">Active Access Grants</div>
        </Card>
      </div>

      <div className="text-sm">
        Overall status:{' '}
        <Badge variant={summary.overall_status === 'compliant' ? 'default' : 'destructive'}>
          {summary.overall_status}
        </Badge>
      </div>

      {(() => {
        const chartRows = [
          { status: 'Open Incidents', count: summary.open_incidents },
          { status: 'Late Reports', count: summary.late_incident_reports },
          { status: 'Critical Vulns', count: summary.critical_vulnerabilities_open },
          { status: 'Active Grants', count: summary.active_access_grants },
        ];
        const ok = summary.active_access_grants;
        const bad = summary.open_incidents + summary.late_incident_reports + summary.critical_vulnerabilities_open;
        const pct = Math.round((ok * 100) / ((ok + bad) || 1));
        const kpi = getKpi('cmp-cyber');
        const chartConfig = kpi?.defaultChart ?? defaultChartConfig({ chartType: 'doughnut', xKey: 'status', series: [{ key: 'count', label: 'Cyber controls' }] });
        const rag = resolveRag(pct, kpi?.thresholds ?? { amber: 85, red: 70, direction: 'higher-good' });
        const sig = signReport(chartRows);
        return (
          <section className="space-y-3" data-testid="rpt2aii-cyber-section">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ScorecardTile label="CERT-In readiness %" value={`${pct}%`} rag={rag} hint="Grants vs incidents/vulns" />
              <ScorecardTile label="Late Reports (>6h)" value={summary.late_incident_reports} hint="6-hour CERT-In window" />
              <Card className="p-3 flex items-center gap-2" data-testid="integrity-badge-cyber">
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
        </TabsList>

        <TabsContent value="incidents">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">CERT-In Cyber Incidents</h2>
            {incidents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No incidents recorded.</p>
            ) : (
              <ul className="space-y-1">
                {incidents.map((i) => (
                  <li key={i.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">
                      {i.category} · {i.severity} · {i.hours_to_report ?? '–'}h to report
                    </span>
                    <Badge variant={isIncidentLate(i) ? 'destructive' : 'default'}>
                      {isIncidentLate(i) ? 'late' : i.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="vulnerabilities">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">Vulnerability Disclosure Log</h2>
            {vulns.length === 0 ? (
              <p className="text-xs text-muted-foreground">No vulnerabilities recorded.</p>
            ) : (
              <ul className="space-y-1">
                {vulns.map((v) => (
                  <li key={v.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{v.cve_id ?? 'no-cve'} · {v.asset} · {v.severity}</span>
                    <Badge>{v.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="access">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">Access Control Matrix</h2>
            {grants.length === 0 ? (
              <p className="text-xs text-muted-foreground">No active access grants.</p>
            ) : (
              <ul className="space-y-1">
                {grants.map((g) => (
                  <li key={g.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{g.user_name} → {g.resource}</span>
                    <Badge>{g.access_level}</Badge>
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
