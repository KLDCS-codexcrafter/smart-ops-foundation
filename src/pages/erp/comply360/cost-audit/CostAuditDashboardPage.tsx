/**
 * @file        src/pages/erp/comply360/cost-audit/CostAuditDashboardPage.tsx
 * @purpose     Cost Audit dashboard · Section 148 · CRA-1/2/3/4 tracker · 28th First-Class Standalone Page
 * @sprint      Sprint 103 · T-Phase-6.A.1.2 · Arc 1 UX surfacing · DP-PH6-5B · DP-COSTING-1
 * @reads-from  comply360-cost-audit-engine (FR-44 · USE-SITE READ · engine 0-DIFF)
 *              · auditor appointments · CRA filings · audit reports · eligibility (cooling-off §148(3))
 * [JWT] Phase 8: GET /api/comply360/cost-audit/{appointments,cra,reports} (engine wraps; surface unchanged)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Scale, FileCheck2, Gavel, Sparkles, Layers, Plus, ShieldCheck } from 'lucide-react';
import { ReportChart, ScorecardTile } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig, resolveRag } from '@/lib/report-framework';
import {
  listCostAuditorAppointments,
  listCRAFormFilings,
  listCostAuditReports,
  isCostAuditorEligible,
  appointCostAuditor,
  determineCostAuditApplicability,
  listCostProductServices,
  upsertCostProductService,
  type CRAFormType,
  type CostProductServiceEntry,
} from '@/lib/comply360-cost-audit-engine';

const FY_CURRENT = '2025-26';
const FY_PRIOR = '2024-25';
const FORM_TYPES: CRAFormType[] = ['CRA_1', 'CRA_2', 'CRA_3', 'CRA_4'];

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export default function CostAuditDashboardPage(): JSX.Element {
  const [tab, setTab] = useState<'overview' | 'appointments' | 'filings' | 'reports'>('overview');

  const appointmentsFy = useMemo(() => listCostAuditorAppointments({ fy: FY_CURRENT }), []);
  const appointmentsPrior = useMemo(() => listCostAuditorAppointments({ fy: FY_PRIOR }), []);
  const filingsFy = useMemo(() => listCRAFormFilings({ fy: FY_CURRENT }), []);
  const filingsByType = useMemo(() => {
    const acc: Record<CRAFormType, { total: number; filed: number }> = {
      CRA_1: { total: 0, filed: 0 },
      CRA_2: { total: 0, filed: 0 },
      CRA_3: { total: 0, filed: 0 },
      CRA_4: { total: 0, filed: 0 },
    };
    for (const f of filingsFy) {
      acc[f.form_type].total += 1;
      if (f.filing_status === 'filed') acc[f.form_type].filed += 1;
    }
    return acc;
  }, [filingsFy]);
  const reportsFy = useMemo(() => listCostAuditReports({ fy: FY_CURRENT }), []);
  const adverseCount = useMemo(() => reportsFy.filter((r) => r.adverse_findings).length, [reportsFy]);

  // §148(3) cooling-off — demo: probe the first prior auditor for next FY eligibility.
  const eligibilityProbe = useMemo(() => {
    const prior = appointmentsPrior[0];
    if (!prior) return null;
    return {
      icmai: prior.icmai_membership_no,
      result: isCostAuditorEligible(prior.icmai_membership_no, '2026-27'),
    };
  }, [appointmentsPrior]);

  // CRA-2 (board appointment intimation) is due within 30 days of appointment.
  const cra2Due = useMemo(() => {
    const item = appointmentsFy[0];
    if (!item) return null;
    const deadline = new Date(item.appointment_date);
    deadline.setDate(deadline.getDate() + 30);
    return { deadlineIso: deadline.toISOString(), daysLeft: daysUntil(deadline.toISOString()) };
  }, [appointmentsFy]);

  // §148 applicability state (engine-backed · DP-A1-5)
  const [psRows, setPsRows] = useState<CostProductServiceEntry[]>(() => listCostProductServices(FY_CURRENT));
  const [psDraft, setPsDraft] = useState<CostProductServiceEntry>({ ceta_heading: '', description: '', turnover: 0 });
  const [industry, setIndustry] = useState<'regulated' | 'non_regulated' | 'exempt'>('non_regulated');
  const [overallTurnover, setOverallTurnover] = useState<number>(120_00_00_000);

  const aggregateTurnover = useMemo(
    () => psRows.reduce((s, r) => s + (Number.isFinite(r.turnover) ? r.turnover : 0), 0),
    [psRows],
  );

  const applicability = useMemo(
    () =>
      determineCostAuditApplicability({
        fy: FY_CURRENT,
        industry_category: industry,
        overall_turnover: overallTurnover,
        aggregate_product_service_turnover: aggregateTurnover,
      }),
    [industry, overallTurnover, aggregateTurnover],
  );

  const handleAddProductService = (): void => {
    if (!psDraft.ceta_heading.trim()) return;
    upsertCostProductService(FY_CURRENT, psDraft);
    setPsRows(listCostProductServices(FY_CURRENT));
    setPsDraft({ ceta_heading: '', description: '', turnover: 0 });
  };

  const handleSeedDemoAppointment = (): void => {
    // [JWT] POST /api/comply360/cost-audit/appointments — wraps engine.appointCostAuditor
    if (appointmentsFy.length > 0) return;
    appointCostAuditor({
      fy: FY_CURRENT,
      appointment_type: 'first_appointment',
      cost_auditor_name: 'M/s Sharma & Iyer Cost Accountants',
      icmai_membership_no: 'ICMAI-12345',
      firm_registration_no: 'FRN-CMA-001',
      appointment_date: new Date().toISOString().slice(0, 10),
      term_years: 1,
      prepared_by_bap: 'mr-a-client',
    });
    // Page is a snapshot — refresh prompts user re-mount; engine state is authoritative.
  };

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Cost Audit · Section 148</h1>
          <p className="text-sm text-muted-foreground">
            Standalone Page #28 · reads <span className="font-mono">comply360-cost-audit-engine</span> · CRA-1/2/3/4 tracker · §148(3) cooling-off
          </p>
        </div>
        <Badge variant={applicability.cost_audit_required ? 'default' : 'secondary'}>
          {applicability.cost_audit_required
            ? '§148 Audit Required'
            : applicability.cost_records_required
              ? '§148 Records Only'
              : '§148 Not Applicable'}
        </Badge>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Auditors · FY {FY_CURRENT}</div>
          <div className="text-2xl font-bold font-mono">{appointmentsFy.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">CRA filings · FY {FY_CURRENT}</div>
          <div className="text-2xl font-bold font-mono">{filingsFy.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Reports · FY {FY_CURRENT}</div>
          <div className="text-2xl font-bold font-mono">{reportsFy.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Adverse findings</div>
          <div className={`text-2xl font-bold font-mono ${adverseCount > 0 ? 'text-warning' : ''}`}>
            {adverseCount}
          </div>
        </Card>
      </div>

      {(() => {
        const chartRows = (['CRA_1', 'CRA_2', 'CRA_3', 'CRA_4'] as const).map((t) => ({
          form_type: t,
          filed: filingsByType[t].filed,
          pending: Math.max(0, filingsByType[t].total - filingsByType[t].filed),
        }));
        const totalFilings = chartRows.reduce((s, r) => s + r.filed + r.pending, 0);
        const filed = chartRows.reduce((s, r) => s + r.filed, 0);
        const baselinePct = totalFilings === 0 ? 100 : Math.round((filed * 100) / totalFilings);
        const pct = adverseCount > 0 ? Math.min(baselinePct, 60) : baselinePct;
        const kpi = getKpi('cmp-costaudit-filings');
        const chartConfig = kpi?.defaultChart ?? defaultChartConfig({
          chartType: 'stacked-column', xKey: 'form_type',
          series: [
            { key: 'filed', label: 'Filed' },
            { key: 'pending', label: 'Pending' },
          ],
        });
        const rag = adverseCount > 0
          ? ('red' as const)
          : resolveRag(pct, kpi?.thresholds ?? { amber: 90, red: 70, direction: 'higher-good' });
        const sig = signReport(chartRows);
        return (
          <section className="space-y-3" data-testid="rpt2ai-costaudit-section">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <ScorecardTile label="CRA filings on time %" value={`${pct}%`} rag={rag} hint={adverseCount > 0 ? 'Adverse findings present' : 'CRA-1/2/3/4'} />
              <ScorecardTile label="Adverse findings" value={adverseCount} hint="Reports flagged" />
              <Card className="p-3 flex items-center gap-2" data-testid="integrity-badge-costaudit">
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="filings">CRA filings</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="applicability">§148 Applicability</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <Card className="p-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> §148 applicability
            </h2>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <div>
                Table: <span className="font-mono">{applicability.table}</span>
                {' · '}Records:{' '}
                <span className={applicability.cost_records_required ? 'text-warning' : ''}>
                  {applicability.cost_records_required ? 'REQUIRED' : 'not required'}
                </span>
                {' · '}Audit:{' '}
                <span className={applicability.cost_audit_required ? 'text-warning' : ''}>
                  {applicability.cost_audit_required ? 'REQUIRED' : 'not required'}
                </span>
              </div>
              <div className="text-[11px]">{applicability.reason}</div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Gavel className="h-4 w-4 text-primary" /> CRA-2 board-intimation countdown
            </h2>
            {cra2Due ? (
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Deadline {cra2Due.deadlineIso.slice(0, 10)} · {cra2Due.daysLeft} day(s) remaining
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                No FY {FY_CURRENT} appointment recorded yet.{' '}
                <button
                  type="button"
                  className="underline text-primary"
                  onClick={handleSeedDemoAppointment}
                >
                  Seed demo appointment
                </button>
              </p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-primary" /> §148(3) cooling-off probe (next FY)
            </h2>
            {eligibilityProbe ? (
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                {eligibilityProbe.icmai} → {eligibilityProbe.result.eligible ? 'Eligible' : 'NOT eligible'} · {eligibilityProbe.result.reason}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">No prior-FY appointments to probe.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card className="p-4">
            {appointmentsFy.length === 0 ? (
              <p className="text-xs text-muted-foreground">No appointments recorded for FY {FY_CURRENT}.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr><th className="text-left p-2">Auditor</th><th className="text-left p-2">ICMAI</th><th className="text-left p-2">Type</th><th className="text-left p-2">Term</th></tr>
                </thead>
                <tbody>
                  {appointmentsFy.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="p-2">{a.cost_auditor_name}</td>
                      <td className="p-2 font-mono">{a.icmai_membership_no}</td>
                      <td className="p-2">{a.appointment_type}</td>
                      <td className="p-2 font-mono">{a.term_years}y</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="filings">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FORM_TYPES.map((ft) => {
              const row = filingsByType[ft];
              return (
                <Card key={ft} className="p-3">
                  <div className="text-xs text-muted-foreground">{ft.replace('_', '-')}</div>
                  <div className="text-2xl font-bold font-mono">{row.filed}/{row.total}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">filed / drafted</div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="p-4">
            {reportsFy.length === 0 ? (
              <p className="text-xs text-muted-foreground">No Cost Audit reports recorded for FY {FY_CURRENT}.</p>
            ) : (
              <ul className="text-xs space-y-1">
                {reportsFy.map((r) => (
                  <li key={r.id} className="flex items-center justify-between border-b border-border py-1">
                    <span className="font-mono">FY {r.fy} · total cost ₹{r.total_cost_inr.toLocaleString('en-IN')}</span>
                    <Badge variant={r.adverse_findings ? 'destructive' : 'secondary'}>
                      {r.adverse_findings ? 'ADVERSE' : 'CLEAN'}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="applicability" className="space-y-3">
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> CRA Rules 2014 · §148 inputs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Industry category</label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value as typeof industry)}
                >
                  <option value="regulated">Regulated (Table A)</option>
                  <option value="non_regulated">Non-regulated (Table B)</option>
                  <option value="exempt">Exempt</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Overall turnover (₹)</label>
                <Input
                  type="number"
                  value={overallTurnover}
                  onChange={(e) => setOverallTurnover(Math.max(0, Number(e.target.value)))}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Aggregate product/service (₹ · derived)</label>
                <div className="h-9 rounded-md border border-input bg-muted px-2 flex items-center font-mono text-xs">
                  {aggregateTurnover.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
            <div className="rounded-md border border-border p-3 text-xs space-y-1">
              <div>
                Table: <span className="font-mono">{applicability.table}</span>
              </div>
              <div>
                Records threshold:{' '}
                <span className="font-mono">₹{applicability.thresholds_applied.records_threshold.toLocaleString('en-IN')}</span>
                {' · '}Audit threshold:{' '}
                <span className="font-mono">₹{applicability.thresholds_applied.audit_threshold.toLocaleString('en-IN')}</span>
              </div>
              <div>
                Cost records: <Badge variant={applicability.cost_records_required ? 'default' : 'secondary'}>
                  {applicability.cost_records_required ? 'REQUIRED' : 'Not required'}
                </Badge>
                {' · '}Cost audit: <Badge variant={applicability.cost_audit_required ? 'default' : 'secondary'}>
                  {applicability.cost_audit_required ? 'REQUIRED' : 'Not required'}
                </Badge>
              </div>
              <div className="text-muted-foreground">{applicability.reason}</div>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Product / service turnover table (FY {FY_CURRENT})
            </h2>
            {psRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">No product/service entries yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">CETA heading</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Turnover (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {psRows.map((r) => (
                    <tr key={r.ceta_heading} className="border-t border-border">
                      <td className="p-2 font-mono">{r.ceta_heading}</td>
                      <td className="p-2">{r.description}</td>
                      <td className="p-2 text-right font-mono">{r.turnover.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input
                placeholder="CETA heading"
                value={psDraft.ceta_heading}
                onChange={(e) => setPsDraft({ ...psDraft, ceta_heading: e.target.value })}
                className="text-xs"
              />
              <Input
                placeholder="Description"
                value={psDraft.description}
                onChange={(e) => setPsDraft({ ...psDraft, description: e.target.value })}
                className="text-xs md:col-span-2"
              />
              <Input
                type="number"
                placeholder="Turnover (₹)"
                value={psDraft.turnover || ''}
                onChange={(e) => setPsDraft({ ...psDraft, turnover: Math.max(0, Number(e.target.value)) })}
                className="text-xs font-mono"
              />
            </div>
            <Button size="sm" variant="outline" onClick={handleAddProductService} className="gap-1">
              <Plus className="h-3 w-3" /> Upsert product / service
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
