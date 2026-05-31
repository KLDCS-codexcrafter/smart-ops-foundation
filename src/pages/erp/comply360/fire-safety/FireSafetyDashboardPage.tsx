/**
 * @file        src/pages/erp/comply360/fire-safety/FireSafetyDashboardPage.tsx
 * @purpose     Fire Safety + Building Safety dashboard · 4-tab · 13th First-Class Standalone Page
 * @sprint      Sprint 89 · T-Phase-5.F.5.1 · DP-F5-2 · FLOOR 5 OPENS · Q33
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  listFireNOCs,
  listFireSafetyAudits,
  listEquipmentAMCs,
  listEvacuationDrills,
  getFireSafetyComplianceSummary,
} from '@/lib/comply360-fire-safety-engine';

type TabKey = 'noc' | 'audit' | 'equipment' | 'drills';

export default function FireSafetyDashboardPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('noc');
  const nocs = useMemo(() => listFireNOCs(), []);
  const audits = useMemo(() => listFireSafetyAudits(), []);
  const amcs = useMemo(() => listEquipmentAMCs(), []);
  const drills = useMemo(() => listEvacuationDrills(), []);
  const summary = useMemo(() => getFireSafetyComplianceSummary('FY25-26'), []);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Fire Safety &amp; Building Safety</h1>
        <p className="text-sm text-muted-foreground">
          NBC 2025 Part 4 · State Fire NOC · Equipment AMC · Evacuation Drills · Building Fire Safety Certificate
        </p>
      </header>

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{summary.active_nocs}</div>
          <div className="text-xs text-muted-foreground">Active Fire NOCs</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-warning">{summary.expiring_nocs_next_90_days}</div>
          <div className="text-xs text-muted-foreground">Expiring in 90 days</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-success">{summary.audits_passed_last_12_months}</div>
          <div className="text-xs text-muted-foreground">Audits passed (12 mo)</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{summary.evacuation_drills_last_12_months}</div>
          <div className="text-xs text-muted-foreground">Drills (12 mo)</div>
        </Card>
      </div>

      <div className="text-sm">
        Overall status: <Badge variant={summary.overall_status === 'compliant' ? 'default' : 'destructive'}>{summary.overall_status}</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="noc">Fire NOC</TabsTrigger>
          <TabsTrigger value="audit">Safety Audit</TabsTrigger>
          <TabsTrigger value="equipment">Equipment AMC</TabsTrigger>
          <TabsTrigger value="drills">Drills</TabsTrigger>
        </TabsList>

        <TabsContent value="noc">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-2">Fire NOC Register</h2>
            {nocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Fire NOCs recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {nocs.map((n) => (
                  <li key={n.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{n.noc_number} · {n.state}</span>
                    <Badge>{n.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-2">Fire Safety Audits</h2>
            {audits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fire safety audits recorded.</p>
            ) : (
              <ul className="space-y-2">
                {audits.map((a) => (
                  <li key={a.id} className="text-sm border rounded-lg p-2">
                    <div className="flex justify-between">
                      <span>{a.premises_id} · {a.audit_date}</span>
                      <Badge>{a.pass_status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{a.observations.length} observation(s) · auditor {a.auditor_name}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="equipment">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-2">Equipment AMC Schedule</h2>
            {amcs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No equipment AMCs recorded.</p>
            ) : (
              <ul className="space-y-2">
                {amcs.map((a) => (
                  <li key={a.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span>{a.equipment_type} · {a.vendor_name}</span>
                    <span className="font-mono text-xs text-muted-foreground">Next: {a.next_service_date}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="drills">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-2">Evacuation Drills</h2>
            {drills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No evacuation drills recorded.</p>
            ) : (
              <ul className="space-y-2">
                {drills.map((d) => (
                  <li key={d.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span>{d.premises_id} · {d.drill_date}</span>
                    <span className="font-mono text-xs">{d.participants_count} pax · {d.evacuation_time_seconds}s</span>
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
