/**
 * @file        src/pages/erp/comply360/labour-tier2/LabourTier2DashboardPage.tsx
 * @purpose     Labour Tier-2 dashboard · 5-tab · 21st First-Class Standalone Page
 * @sprint      Sprint 93 · T-Phase-5.F.5.5 · Floor 5.5 · Q37
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  listBonusComputations, listMaternityClaims, listEqualRemAudits,
  listApprentices, listCLRAEngagements, listShops, listForm21, listOSHCheckups,
  getLabourTier2ComplianceSummary,
} from '@/lib/comply360-labour-tier2-engine';

type TabKey = 'bonus-mat' | 'equal-rem' | 'apprentices-clra' | 'shops-factories' | 'osh';

export default function LabourTier2DashboardPage(): JSX.Element {
  const [tab, setTab] = useState<TabKey>('bonus-mat');
  const summary = useMemo(() => getLabourTier2ComplianceSummary(), []);
  const bonus = useMemo(() => listBonusComputations(), []);
  const maternity = useMemo(() => listMaternityClaims(), []);
  const equalRem = useMemo(() => listEqualRemAudits(), []);
  const apps = useMemo(() => listApprentices(), []);
  const clra = useMemo(() => listCLRAEngagements(), []);
  const shops = useMemo(() => listShops(), []);
  const form21 = useMemo(() => listForm21(), []);
  const osh = useMemo(() => listOSHCheckups(), []);

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Labour Tier-2 · Q37</h1>
        <p className="text-sm text-muted-foreground">
          Bonus · Maternity · Equal Remuneration · Apprentices · CLRA · Shops · Factories Form 21 · OSH
        </p>
      </header>

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{summary.bonus_computed}</div>
          <div className="text-xs text-muted-foreground">Bonus Computed</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{summary.active_apprentices}</div>
          <div className="text-xs text-muted-foreground">Active Apprentices</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono">{summary.clra_engagements}</div>
          <div className="text-xs text-muted-foreground">CLRA Engagements</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold font-mono text-warning">{summary.osh_unfit}</div>
          <div className="text-xs text-muted-foreground">OSH Unfit</div>
        </Card>
      </div>

      <div className="text-sm">
        Overall status:{' '}
        <Badge variant={summary.overall_status === 'compliant' ? 'default' : 'destructive'}>
          {summary.overall_status}
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="bonus-mat">Bonus / Maternity</TabsTrigger>
          <TabsTrigger value="equal-rem">Equal Remuneration</TabsTrigger>
          <TabsTrigger value="apprentices-clra">Apprentices / CLRA</TabsTrigger>
          <TabsTrigger value="shops-factories">Shops / Form 21</TabsTrigger>
          <TabsTrigger value="osh">OSH Health</TabsTrigger>
        </TabsList>

        <TabsContent value="bonus-mat">
          <Card className="p-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Bonus Act 1965</h2>
              {bonus.length === 0 ? (
                <p className="text-xs text-muted-foreground">No bonus computations.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {bonus.map((b) => (
                    <li key={b.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span className="font-mono">{b.employee_name} · {b.fy}</span>
                      <span className="font-mono">₹{(b.bonus_paise / 100).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">Maternity Benefit</h2>
              {maternity.length === 0 ? (
                <p className="text-xs text-muted-foreground">No maternity claims.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {maternity.map((m) => (
                    <li key={m.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span className="font-mono">{m.employee_name} · {m.leave_weeks}w</span>
                      <Badge>{m.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="equal-rem">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">Equal Remuneration Audits</h2>
            {equalRem.length === 0 ? (
              <p className="text-xs text-muted-foreground">No audits recorded.</p>
            ) : (
              <ul className="space-y-1">
                {equalRem.map((e) => (
                  <li key={e.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{e.role} · {e.fy}</span>
                    <Badge variant={e.gap_pct > 5 ? 'destructive' : 'default'}>
                      {e.gap_pct}% gap
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="apprentices-clra">
          <Card className="p-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Apprentices</h2>
              {apps.length === 0 ? (
                <p className="text-xs text-muted-foreground">No apprentices.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {apps.map((a) => (
                    <li key={a.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span className="font-mono">{a.reg_no} · {a.name} · {a.trade}</span>
                      <Badge>{a.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">CLRA Engagements</h2>
              {clra.length === 0 ? (
                <p className="text-xs text-muted-foreground">No CLRA engagements.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {clra.map((c) => (
                    <li key={c.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span className="font-mono">{c.contractor_name} · {c.worker_count} workers</span>
                      <Badge variant={c.pf_esi_compliant ? 'default' : 'destructive'}>
                        PF/ESI {c.pf_esi_compliant ? 'OK' : 'fail'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="shops-factories">
          <Card className="p-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Shops & Establishments</h2>
              {shops.length === 0 ? (
                <p className="text-xs text-muted-foreground">No registrations.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {shops.map((s) => (
                    <li key={s.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span className="font-mono">{s.state} · {s.reg_no}</span>
                      <span className="text-xs text-muted-foreground">{s.employee_count} emp</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">Factories Form 21 (Annual)</h2>
              {form21.length === 0 ? (
                <p className="text-xs text-muted-foreground">No Form 21 returns.</p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {form21.map((f) => (
                    <li key={f.id} className="text-sm border rounded-lg p-2 flex justify-between">
                      <span className="font-mono">FY {f.fy} · {f.factory_lic_no}</span>
                      <Badge variant={f.filed_on ? 'default' : 'destructive'}>
                        {f.filed_on ? 'filed' : 'pending'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="osh">
          <Card className="p-4 space-y-2">
            <h2 className="text-lg font-semibold">OSH Annual Health Check-ups</h2>
            {osh.length === 0 ? (
              <p className="text-xs text-muted-foreground">No check-ups recorded.</p>
            ) : (
              <ul className="space-y-1">
                {osh.map((o) => (
                  <li key={o.id} className="text-sm border rounded-lg p-2 flex justify-between">
                    <span className="font-mono">{o.employee_name} · {o.exam_date}</span>
                    <Badge variant={o.fitness === 'unfit' ? 'destructive' : 'default'}>
                      {o.fitness}
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
