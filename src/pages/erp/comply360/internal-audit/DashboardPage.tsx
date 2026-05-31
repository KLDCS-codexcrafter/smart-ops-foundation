/**
 * @file        src/pages/erp/comply360/internal-audit/DashboardPage.tsx
 * @purpose     Internal Audit Team Dashboard · 6-tab surface (Overview + 5 functional areas).
 *              PROMOTED from S79a 13-LOC stub. DP-S79-2 stub 3 of 11 closed.
 *              FR-106 PATTERN-S70b 12th scenario candidate (DP-S81-12).
 *              CONSUMES all 4 S81a engines + S80a-e supporting engines.
 *              All 4 Q17 modules 9-12 (MAP Tracker · AC Reports · KPI/Maturity · Calendar)
 *              surfaced as tiles within Overview tab.
 * @sprint      Sprint 81b · T-Phase-5.B.2.2-PASS-B · DP-S81-5 · DP-S81-12
 * @stub-fill   DP-S79-2 stub 3 of 11 closed (was: 13-LOC redirect-target stub from S79a)
 * @consumes    comply360-internal-audit-engine (S81a · 5 Q17 modules)
 *              comply360-ia-risk-register-engine (S81a · Q17 Module 3 · heat-map)
 *              comply360-ia-control-testing-engine (S81a · Q17 Module 7 · effectiveness summary)
 *              comply360-auditor-workspace-engine (S80a · active engagement)
 *              comply360-audit-framework-engine (S80a · BAP visibility · findings)
 *              comply360-audit-ready-score-engine (S80e · pattern reference for Maturity Score)
 * @previous-author-history  Sprint 79a · T-Phase-5.A.1.11-PASS-A · DP-S79-2 redirect-target stub
 */
import { Fragment, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { runMockAudit, type MockAuditRun } from '@/lib/comply360-mock-audit-simulator-engine';
import { generateRecommendations, type IARecommendation } from '@/lib/comply360-ia-recommendation-engine';
import {
  listEngagementPlans,
  listAuditUniverse,
  listAuditPrograms,
  getEngagementMaturityScore,
  listIAIssues,
  type IAIssueLogEntry,
} from '@/lib/comply360-internal-audit-engine';
import {
  listRiskRegister,
  generateHeatmap,
  type RiskHeatmap,
  type RiskLikelihood,
  type RiskImpact,
} from '@/lib/comply360-ia-risk-register-engine';
import {
  computeControlEffectivenessSummary,
} from '@/lib/comply360-ia-control-testing-engine';
import {
  getActiveEngagement,
  type AuditEngagement,
} from '@/lib/comply360-auditor-workspace-engine';
import {
  getActiveBAPAccount,
  type BAPAccountId,
} from '@/lib/comply360-audit-framework-engine';
import {
  seedSampleEngagement,
  listSampleEngagementSeedRuns,
  type SampleEngagementSeedRun,
} from '@/lib/comply360-sample-engagement-seed';
import {
  generateExternalHandoffPackage,
  exportHandoffPackageJsonBundle,
  listExternalHandoffPackages,
  generateQuarterlyAuditCommitteeReport,
  type IAExternalHandoffPackage,
} from '@/lib/comply360-ia-external-handoff-engine';

type MaturityBand = 'Optimised' | 'Managed' | 'Defined' | 'Initial';

function bandFor(pct: number): MaturityBand {
  if (pct >= 85) return 'Optimised';
  if (pct >= 65) return 'Managed';
  if (pct >= 40) return 'Defined';
  return 'Initial';
}

function ratingBadgeClass(rating: 'Critical' | 'High' | 'Medium' | 'Low'): string {
  switch (rating) {
    case 'Critical': return 'bg-destructive text-destructive-foreground';
    case 'High': return 'bg-warning text-warning-foreground';
    case 'Medium': return 'bg-accent text-accent-foreground';
    case 'Low': return 'bg-muted text-muted-foreground';
  }
}

function severityBadgeClass(sev: IAIssueLogEntry['severity_class']): string {
  switch (sev) {
    case 'critical': return 'bg-destructive text-destructive-foreground';
    case 'high': return 'bg-warning text-warning-foreground';
    case 'medium': return 'bg-accent text-accent-foreground';
    case 'low': return 'bg-secondary text-secondary-foreground';
    case 'informational': return 'bg-muted text-muted-foreground';
  }
}

export default function InternalAuditDashboardPage(): JSX.Element {
  const [engagement] = useState<AuditEngagement | null>(getActiveEngagement());
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());

  const maturity = useMemo(
    () => engagement
      ? getEngagementMaturityScore(engagement.id)
      : { plan_approved: false, universe_defined: false, programs_assigned: 0, charter_approved: false, open_issues: 0, maturity_percentage: 0 },
    [engagement],
  );
  const heatmap: RiskHeatmap | null = useMemo(
    () => engagement ? generateHeatmap(engagement.id) : null,
    [engagement],
  );
  const issues = useMemo(
    () => engagement ? listIAIssues(engagement.id) : [],
    [engagement],
  );
  const controlSummary = useMemo(
    () => engagement
      ? computeControlEffectivenessSummary(engagement.id)
      : { total_tests_defined: 0, total_tests_executed: 0, passed_count: 0, failed_count: 0, compensating_control_count: 0, effectiveness_percentage: 0 },
    [engagement],
  );
  const universe = useMemo(() => listAuditUniverse(), []);
  const programs = useMemo(() => listAuditPrograms(), []);
  const plans = useMemo(
    () => engagement ? listEngagementPlans(engagement.id) : [],
    [engagement],
  );
  const risks = useMemo(
    () => engagement ? listRiskRegister(engagement.id) : [],
    [engagement],
  );

  const maturityPct = maturity.maturity_percentage;
  const maturityBand = bandFor(maturityPct);

  if (!engagement) {
    return (
      <div className="p-6 space-y-4">
        <header>
          <h1 className="text-2xl font-bold">Internal Audit Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Q17 12 Internal Audit modules · Maturity Score · Risk Heat-Map · Control Effectiveness · Issue Log
          </p>
        </header>
        <Card className="p-6">
          <h2 className="font-semibold mb-2">No active engagement</h2>
          <p className="text-sm text-muted-foreground">
            Create or select an Internal Audit engagement to populate this dashboard.
            Active BAP: <span className="font-mono">{bap}</span>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Internal Audit Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Q17 12 Internal Audit modules · Maturity Score · Risk Heat-Map · Control Effectiveness · Issue Log ·
          Active BAP: <span className="font-mono">{bap}</span>
        </p>
      </header>

      {/* IA Maturity Score TOP BANNER (Q17 Module 11) */}
      <section className="rounded-lg border-2 bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">IA Maturity Score</h2>
            <p className="text-xs text-muted-foreground">
              Composite of plan + universe + programs + charter + open issues
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Engagement: <span className="font-mono">{engagement.name}</span> · FY {engagement.fy}
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono text-5xl font-bold">{maturityPct}%</span>
            <p className="text-xs uppercase font-semibold text-muted-foreground">{maturityBand}</p>
          </div>
        </div>
      </section>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagements">Engagements</TabsTrigger>
          <TabsTrigger value="risk-heatmap">Risk Heat-Map</TabsTrigger>
          <TabsTrigger value="issue-log">Issue Log</TabsTrigger>
          <TabsTrigger value="control-effectiveness">Control Effectiveness</TabsTrigger>
          <TabsTrigger value="maturity">Maturity Detail</TabsTrigger>
          <TabsTrigger value="mock-audit">Mock Audit</TabsTrigger>
        </TabsList>

        {/* Tab 1 · Overview · Q17 Modules 9-12 surfaced as tiles */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <MAPTrackerTile issues={issues} />
            <QuarterlyACReportsTile engagement={engagement} />
            <IAMaturityDetailTile maturity={maturity} />
            <AuditPlanCalendarTile universe={universe} />
          </div>
        </TabsContent>

        {/* Tab 2 · Engagements */}
        <TabsContent value="engagements">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Active Engagement Plans · {plans.length}</h3>
            {plans.length === 0
              ? <p className="text-sm text-muted-foreground">No plans defined yet for this engagement.</p>
              : (
                <ul className="space-y-2">
                  {plans.map((p) => (
                    <li key={p.id} className="rounded-md border p-3 text-sm flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs text-muted-foreground">{p.id}</div>
                        <div>{p.audit_period_start} → {p.audit_period_end}</div>
                        <div className="text-xs text-muted-foreground">{p.scope_areas.join(' · ')}</div>
                      </div>
                      <Badge>{p.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            <h3 className="font-semibold pt-2">Audit Universe · {universe.length}</h3>
            <h3 className="font-semibold pt-2">Audit Programs · {programs.length}</h3>
          </Card>
        </TabsContent>

        {/* Tab 3 · Risk Heat-Map (5×5) */}
        <TabsContent value="risk-heatmap">
          <RiskHeatmapView heatmap={heatmap} riskCount={risks.length} />
        </TabsContent>

        {/* Tab 4 · Issue Log */}
        <TabsContent value="issue-log">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">IA Issues · {issues.length}</h3>
            {issues.length === 0
              ? <p className="text-sm text-muted-foreground">No issues logged yet.</p>
              : (
                <ul className="space-y-2">
                  {issues.map((i) => (
                    <li key={i.id} className="rounded-md border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-xs text-muted-foreground">{i.id}</div>
                        <Badge className={severityBadgeClass(i.severity_class)}>{i.severity_class}</Badge>
                      </div>
                      <div className="mt-1">{i.management_response}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Deadline {i.remediation_deadline} · Owner {i.responsible_bap} · Status {i.status}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </Card>
        </TabsContent>

        {/* Tab 5 · Control Effectiveness */}
        <TabsContent value="control-effectiveness">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Control Effectiveness Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Defined" value={controlSummary.total_tests_defined} />
              <Stat label="Executed" value={controlSummary.total_tests_executed} />
              <Stat label="Passed" value={controlSummary.passed_count} />
              <Stat label="Failed" value={controlSummary.failed_count} />
            </div>
            <div className="pt-2">
              <span className="text-sm text-muted-foreground">Effectiveness</span>
              <div className="font-mono text-3xl font-bold">
                {controlSummary.effectiveness_percentage}%
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 6 · Maturity Detail */}
        <TabsContent value="maturity">
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Maturity Sub-Scores</h3>
            <ul className="text-sm space-y-2">
              <li>Plan approved: <Badge>{maturity.plan_approved ? 'Yes (25)' : 'No (0)'}</Badge></li>
              <li>Universe defined: <Badge>{maturity.universe_defined ? 'Yes (25)' : 'No (0)'}</Badge></li>
              <li>Programs assigned: <Badge>{maturity.programs_assigned > 0 ? `Yes (20)` : 'No (0)'}</Badge> · count <span className="font-mono">{maturity.programs_assigned}</span></li>
              <li>Charter approved: <Badge>{maturity.charter_approved ? 'Yes (15)' : 'No (0)'}</Badge></li>
              <li>Open issues: <span className="font-mono">{maturity.open_issues}</span></li>
            </ul>
            <div className="pt-2">
              <span className="text-sm text-muted-foreground">Composite</span>
              <div className="font-mono text-3xl font-bold">{maturityPct}% · {maturityBand}</div>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 7 · Mock Audit Run · S81c DP-S81-3 · DP-S81-10 · OOB-6 extension */}
        <TabsContent value="mock-audit">
          <MockAuditRunPanel engagementId={engagement.id} bap={bap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground uppercase">{label}</div>
      <div className="font-mono text-2xl font-bold">{value}</div>
    </div>
  );
}

// ── Q17 Module 9 · MAP Tracker tile ──
function MAPTrackerTile({ issues }: { issues: IAIssueLogEntry[] }): JSX.Element {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = issues
    .filter((i) => i.status === 'open' && i.remediation_deadline < today)
    .slice(0, 3);
  const byStatus = {
    open: issues.filter((i) => i.status === 'open').length,
    in_remediation: issues.filter((i) => i.status === 'in_remediation').length,
    remediated: issues.filter((i) => i.status === 'remediated').length,
    risk_accepted: issues.filter((i) => i.status === 'risk_accepted').length,
  };
  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-semibold text-sm">MAP Tracker · Q17 Module 9</h3>
      <p className="text-xs text-muted-foreground">Management Action Plans</p>
      <div className="font-mono text-2xl font-bold">{issues.length}</div>
      <div className="text-xs space-y-1">
        <div>Open <span className="font-mono">{byStatus.open}</span> · In-rem <span className="font-mono">{byStatus.in_remediation}</span></div>
        <div>Remediated <span className="font-mono">{byStatus.remediated}</span> · Accepted <span className="font-mono">{byStatus.risk_accepted}</span></div>
      </div>
      {overdue.length > 0 && (
        <div className="pt-2 border-t">
          <div className="text-xs font-semibold text-destructive">Top overdue</div>
          <ul className="text-xs">
            {overdue.map((i) => (
              <li key={i.id} className="truncate">
                <span className="font-mono">{i.remediation_deadline}</span> · {i.severity_class}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

// ── Q17 Module 10 · Quarterly Audit Committee Reports tile ──
function QuarterlyACReportsTile({ engagement }: { engagement: AuditEngagement }): JSX.Element {
  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-semibold text-sm">Quarterly AC Reports · Q17 Module 10</h3>
      <p className="text-xs text-muted-foreground">Audit Committee deliverables · FY {engagement.fy}</p>
      <div className="grid grid-cols-2 gap-2 pt-1">
        {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
          <Button key={q} size="sm" variant="outline" className="text-xs">
            Generate {q}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground pt-1">
        Phase 5 · JSON export of findings + control summary + maturity score. PDF generation in Phase 6.
      </p>
    </Card>
  );
}

// ── Q17 Module 11 · IA Maturity Detail tile ──
function IAMaturityDetailTile({ maturity }: { maturity: ReturnType<typeof getEngagementMaturityScore> }): JSX.Element {
  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-semibold text-sm">KPI / IA Maturity · Q17 Module 11</h3>
      <p className="text-xs text-muted-foreground">Sub-score breakdown</p>
      <ul className="text-xs space-y-1">
        <li>Plan approved · <span className="font-mono">{maturity.plan_approved ? '25' : '0'}/25</span></li>
        <li>Universe defined · <span className="font-mono">{maturity.universe_defined ? '25' : '0'}/25</span></li>
        <li>Programs assigned · <span className="font-mono">{maturity.programs_assigned > 0 ? '20' : '0'}/20</span></li>
        <li>Charter approved · <span className="font-mono">{maturity.charter_approved ? '15' : '0'}/15</span></li>
        <li>Open issues · <span className="font-mono">{maturity.open_issues}</span></li>
      </ul>
      <div className="font-mono text-xl font-bold pt-1">{maturity.maturity_percentage}%</div>
    </Card>
  );
}

// ── Q17 Module 12 · Audit Plan Calendar tile ──
function AuditPlanCalendarTile({ universe }: { universe: ReturnType<typeof listAuditUniverse> }): JSX.Element {
  const upcoming = [...universe]
    .filter((u) => u.next_due_at !== null)
    .sort((a, b) => (a.next_due_at ?? '').localeCompare(b.next_due_at ?? ''))
    .slice(0, 4);
  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-semibold text-sm">Audit Plan Calendar · Q17 Module 12</h3>
      <p className="text-xs text-muted-foreground">Upcoming audits (next-due)</p>
      {upcoming.length === 0
        ? <p className="text-xs text-muted-foreground">No scheduled audits in universe.</p>
        : (
          <ul className="text-xs space-y-1">
            {upcoming.map((u) => (
              <li key={u.id} className="flex items-center justify-between">
                <span className="truncate">{u.area_name}</span>
                <span className="font-mono">{u.next_due_at}</span>
              </li>
            ))}
          </ul>
        )}
      <Button size="sm" variant="outline" className="text-xs w-full">Schedule Audit</Button>
    </Card>
  );
}

// ── Risk Heat-Map view (5×5 grid) ──
function RiskHeatmapView({ heatmap, riskCount }: { heatmap: RiskHeatmap | null; riskCount: number }): JSX.Element {
  if (!heatmap) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">No heat-map data available.</p>
      </Card>
    );
  }
  const likelihoods: RiskLikelihood[] = [5, 4, 3, 2, 1];
  const impacts: RiskImpact[] = [1, 2, 3, 4, 5];
  const cellFor = (l: RiskLikelihood, i: RiskImpact): RiskHeatmap['cells'][number] | undefined =>
    heatmap.cells.find((c) => c.likelihood === l && c.impact === i);
  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-semibold">Risk Heat-Map · {riskCount} risks</h3>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Critical {heatmap.critical_count}</span>
        <span>High {heatmap.high_count}</span>
        <span>Medium {heatmap.medium_count}</span>
        <span>Low {heatmap.low_count}</span>
      </div>
      <div className="grid grid-cols-6 gap-1 text-xs">
        <div />
        {impacts.map((i) => (
          <div key={`hdr-${i}`} className="text-center font-mono text-muted-foreground">I{i}</div>
        ))}
        {likelihoods.map((l) => (
          <Fragment key={`row-${l}`}>
            <div className="text-center font-mono text-muted-foreground self-center">L{l}</div>
            {impacts.map((i) => {
              const c = cellFor(l, i);
              const rating = c?.rating ?? 'Low';
              return (
                <div
                  key={`cell-${l}-${i}`}
                  className={`rounded-md p-2 text-center font-mono ${ratingBadgeClass(rating)}`}
                  title={`L${l} × I${i} · ${rating} · ${c?.risk_count ?? 0} risks`}
                >
                  {c?.risk_count ?? 0}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </Card>
  );
}

// ── Tab 7 · Mock Audit Run Panel · S81c DP-S81-3 · DP-S81-10 · OOB-6 extension ──
function MockAuditRunPanel({ engagementId, bap }: { engagementId: string; bap: BAPAccountId }): JSX.Element {
  const [run, setRun] = useState<MockAuditRun | null>(null);
  const [recs, setRecs] = useState<IARecommendation[]>([]);
  const [busy, setBusy] = useState(false);

  const handleRun = (): void => {
    setBusy(true);
    try {
      const r = runMockAudit({ engagement_id: engagementId, initiated_by_bap: bap });
      setRun(r);
    } finally {
      setBusy(false);
    }
  };
  const handleRecs = (): void => {
    setRecs(generateRecommendations({ engagement_id: engagementId, max_recommendations: 10 }));
  };
  const handleDownload = (): void => {
    if (!run) return;
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mock-audit-${run.id}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Mock Audit Simulator</h3>
          <p className="text-xs text-muted-foreground">
            Orchestrates 18 analytics procedures + 27 payroll modules + Audit-Ready Score.
          </p>
        </div>
        <Button onClick={handleRun} disabled={busy}>
          {busy ? 'Running…' : 'Run Mock Audit'}
        </Button>
      </div>
      {run && (
        <div className="space-y-3">
          <div className="rounded-md border p-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground uppercase">Engagement Readiness</div>
              <div className="font-mono text-4xl font-bold">{run.readiness_percentage}%</div>
              <Badge>{run.readiness_band}</Badge>
            </div>
            <div className="text-sm text-right space-y-1">
              <div>Analytics: {run.analytics_procedures_run} ({run.analytics_procedures_with_exceptions} excp.)</div>
              <div>Payroll: {run.payroll_modules_run} ({run.payroll_modules_with_exceptions} excp.)</div>
              <div>Findings: {run.open_findings_count} (C:{run.critical_findings_count} · H:{run.high_findings_count})</div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Card className="p-3">
              <h4 className="font-semibold text-sm mb-2">Expected Auditor Questions ({run.expected_questions.length})</h4>
              <ul className="text-xs space-y-1 max-h-48 overflow-auto">
                {run.expected_questions.map((q) => (
                  <li key={q.id} className="border-b pb-1">
                    <Badge>{q.priority}</Badge> {q.question_text}
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-3">
              <h4 className="font-semibold text-sm mb-2">Likely Findings ({run.likely_findings.length})</h4>
              <ul className="text-xs space-y-1 max-h-48 overflow-auto">
                {run.likely_findings.map((f) => (
                  <li key={f.id} className="border-b pb-1">
                    <Badge>{f.severity}</Badge> {f.description}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <Card className="p-3 text-xs">
            <h4 className="font-semibold text-sm mb-2">Mock Engagement Letter Response</h4>
            <div>Scope: <Badge>{run.mock_engagement_letter_response.scope_acceptance}</Badge></div>
            <div>Estimated hours: <span className="font-mono">{run.mock_engagement_letter_response.estimated_audit_hours}</span></div>
            <div>Fee range: <span className="font-mono">₹{run.mock_engagement_letter_response.estimated_fee_range_inr.min.toLocaleString('en-IN')} – ₹{run.mock_engagement_letter_response.estimated_fee_range_inr.max.toLocaleString('en-IN')}</span></div>
            <div>Completion: <span className="font-mono">{run.mock_engagement_letter_response.proposed_completion_weeks}w</span></div>
          </Card>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleDownload}>Download JSON</Button>
            <Button size="sm" variant="outline" onClick={handleRecs}>Generate IA Recommendations</Button>
          </div>
          {recs.length > 0 && (
            <Card className="p-3">
              <h4 className="font-semibold text-sm mb-2">IA Recommendations ({recs.length})</h4>
              <ul className="text-xs space-y-1">
                {recs.map((r) => (
                  <li key={r.id}><Badge>{r.priority}</Badge> {r.recommendation_text}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </Card>
  );
}

