/**
 * @file        src/pages/erp/comply360/environmental/EnvironmentalDashboardPage.tsx
 * @purpose     Environmental Compliance Pt 1 dashboard · 4-tab · 15th First-Class Standalone Page
 * @sprint      Sprint 90 · T-Phase-5.F.5.2 · DP-F5-2 · Q34
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  listCTEPermits, listCTOPermits, listForm5Statements, listFormVCesses,
  getEnvironmentalComplianceSummary,
} from '@/lib/comply360-environmental-engine';
import { listEIAProcesses, listCRZCompliances } from '@/lib/comply360-eia-engine';

type TabKey = 'cte-cto' | 'form5' | 'form-v' | 'eia-crz';

export default function EnvironmentalDashboardPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('cte-cto');
  const summary = useMemo(() => getEnvironmentalComplianceSummary('FY25-26'), []);
  const ctes = useMemo(() => listCTEPermits(), []);
  const ctos = useMemo(() => listCTOPermits(), []);
  const form5s = useMemo(() => listForm5Statements({ fy: 'FY25-26' }), []);
  const formVs = useMemo(() => listFormVCesses({ fy: 'FY25-26' }), []);
  const eias = useMemo(() => listEIAProcesses(), []);
  const crzs = useMemo(() => listCRZCompliances(), []);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Environmental Compliance</h1>
        <p className="text-sm text-muted-foreground">
          EP Act 1986 · Air Act 1981 · Water Act 1974 · EIA 2006 · CRZ 2019
        </p>
      </header>

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{summary.active_cte_count}</div>
          <div className="text-xs text-muted-foreground">Active CTE</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{summary.active_cto_count}</div>
          <div className="text-xs text-muted-foreground">Active CTO</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-warning">{summary.expiring_permits_next_90_days}</div>
          <div className="text-xs text-muted-foreground">Expiring (90d)</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-success">{summary.form5_statements_filed_current_fy}</div>
          <div className="text-xs text-muted-foreground">Form 5 filed</div>
        </Card>
      </div>

      <div className="text-sm">
        Overall status:{' '}
        <Badge variant={summary.overall_status === 'compliant' ? 'default' : 'destructive'}>
          {summary.overall_status}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="cte-cto">CTE / CTO</TabsTrigger>
          <TabsTrigger value="form5">Form 5</TabsTrigger>
          <TabsTrigger value="form-v">Form V</TabsTrigger>
          <TabsTrigger value="eia-crz">EIA / CRZ</TabsTrigger>
        </TabsList>

        <TabsContent value="cte-cto">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-2">CTE &amp; CTO Permits</h2>
            {ctes.length + ctos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No CTE / CTO permits recorded yet.</p>
            ) : (
              <ul className="space-y-2">
                {ctes.map((p) => (
                  <li key={`cte-${p.id}`} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">CTE · {p.permit_type} · {p.permit_number}</span>
                    <Badge>{p.status}</Badge>
                  </li>
                ))}
                {ctos.map((p) => (
                  <li key={`cto-${p.id}`} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">CTO · {p.permit_type} · {p.permit_number}</span>
                    <Badge>{p.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="form5">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-2">Form 5 Annual Environmental Statements</h2>
            {form5s.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Form 5 statements filed.</p>
            ) : (
              <ul className="space-y-2">
                {form5s.map((s) => (
                  <li key={s.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span>{s.fy} · {s.premises_id}</span>
                    <Badge>{s.filing_status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="form-v">
          <Card className="p-4">
            <h2 className="text-lg font-semibold mb-2">Form V Water Cess</h2>
            {formVs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Form V cess records.</p>
            ) : (
              <ul className="space-y-2">
                {formVs.map((c) => (
                  <li key={c.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span>{c.fy} · {c.premises_id}</span>
                    <span className="font-mono text-xs">₹{c.total_cess_inr.toLocaleString('en-IN')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="eia-crz">
          <Card className="p-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold mb-2">EIA Processes</h2>
              {eias.length === 0 ? (
                <p className="text-sm text-muted-foreground">No EIA processes recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {eias.map((p) => (
                    <li key={p.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span>{p.project_name} · {p.project_category}</span>
                      <Badge>{p.process_stage}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">CRZ Compliance</h2>
              {crzs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No CRZ records.</p>
              ) : (
                <ul className="space-y-2">
                  {crzs.map((c) => (
                    <li key={c.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span>{c.project_name} · {c.crz_zone} · {c.state}</span>
                      <Badge>{c.approval_status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
