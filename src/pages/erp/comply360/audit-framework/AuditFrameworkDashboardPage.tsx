/**
 * @file        src/pages/erp/comply360/audit-framework/AuditFrameworkDashboardPage.tsx
 * @purpose     Statutory Audit Dashboard · 18 Tally-equivalent analytical procedures as tiles +
 *              19th MCA Rule 11(g) Self-Verify tile (S80d fills) + 20th Audit Coverage Heatmap (S80e fills).
 *              Each tile launches a procedure via comply360-audit-analytics-engine (S80b).
 * @sprint      Sprint 80c · T-Phase-5.B.2.1-PASS-C · DP-S80-10 · DP-S80-14 Choice A
 * @consumes    comply360-audit-analytics-engine (S80b)
 *              comply360-audit-framework-engine (S80a · raiseFinding · executeSampling)
 *              comply360-auditor-workspace-engine (S80a · OOB-6 Workspace picker)
 *              comply360-audit-trail-aggregator-engine (S78a)
 * @ooblbl      OOB-6 Workspace picker integrated · OOB-10 SA 530 Sampling Justification UI prompt
 * [JWT] Phase 8: dashboard data feeds via /api/comply360/audit-framework/dashboard
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ANALYTICS_PROCEDURES,
  runAnalyticsProcedure,
  type AnalyticsProcedureCode,
} from '@/lib/comply360-audit-analytics-engine';
import {
  type SamplingMethod,
  executeSampling,
  getActiveBAPAccount,
  setActiveBAPAccount,
  type BAPAccountId,
} from '@/lib/comply360-audit-framework-engine';
import {
  listEngagements,
  getActiveEngagement,
  setActiveEngagement,
  createEngagement,
  type AuditEngagement,
  type EngagementType,
} from '@/lib/comply360-auditor-workspace-engine';
import { MCA_RULE_3_1_COMPLIANCE, readAuditTrail } from '@/lib/audit-trail-engine';
import {
  generateCoverageReport,
  exportCoverageReportJson,
  type MCACoverageReport,
} from '@/lib/comply360-mca-coverage-engine';
import {
  exportToColdStorage,
  getRetentionStatus,
} from '@/lib/comply360-audit-retention-engine';
import {
  generateContinuityReport,
  type ContinuityReport,
} from '@/lib/comply360-audit-continuity-engine';
import { verifyChainIntegrity } from '@/lib/audit-trail-hash-chain';
// ─── Sprint 80e · Headline Differentiator UX engines ───
import {
  computeAuditReadyScore,
  type AuditReadyScore,
  type AuditReadyBand,
  type SubScoreBreakdown,
} from '@/lib/comply360-audit-ready-score-engine';
import {
  generateReplay,
  type AuditReplaySession,
} from '@/lib/comply360-audit-replay-engine';
import {
  buildLineageChain,
  type LineageChain,
} from '@/lib/comply360-cross-card-lineage-engine';

const BAP_OPTIONS: { id: BAPAccountId; label: string }[] = [
  { id: 'mr-a-client', label: 'Mr A · Client' },
  { id: 'mr-b-auditor-1', label: 'Mr B · Auditor 1' },
  { id: 'mr-c-auditor-2', label: 'Mr C · Auditor 2' },
  { id: 'mr-d-article', label: 'Mr D · Article' },
];

const PROCEDURES_REQUIRING_SAMPLING: AnalyticsProcedureCode[] = [
  'PENDING_DOCUMENTS',
  'EXTERNAL_CONFIRMATION',
];

interface ProcedureTileProps {
  code: AnalyticsProcedureCode;
  label: string;
  description: string;
  caroClauses: string[];
  onRun: () => void;
  disabled: boolean;
}

function ProcedureTile({ code, label, description, caroClauses, onRun, disabled }: ProcedureTileProps): JSX.Element {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{label}</CardTitle>
        <CardDescription className="text-xs font-mono">{code}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-3">
        <p className="text-xs text-muted-foreground">{description}</p>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {caroClauses.length > 0
              ? caroClauses.map((c) => (
                  <Badge key={c} variant="outline" className="text-[10px]">CARO {c}</Badge>
                ))
              : <span className="text-[10px] text-muted-foreground">No CARO trigger</span>}
          </div>
          <Button size="sm" onClick={onRun} disabled={disabled}>Run</Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface SamplingDialogProps {
  procedureCode: AnalyticsProcedureCode;
  onConfirm: (justification: string, method: SamplingMethod, sampleSize: number) => void;
  onCancel: () => void;
}

function SamplingJustificationDialog({ procedureCode, onConfirm, onCancel }: SamplingDialogProps): JSX.Element {
  const [justification, setJustification] = useState('');
  const [method, setMethod] = useState<SamplingMethod>('amount_range');
  const [sampleSize, setSampleSize] = useState(10);
  const valid = justification.trim().length >= 10;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>SA 530 Sampling Justification</DialogTitle>
          <DialogDescription>
            Procedure <span className="font-mono">{procedureCode}</span> requires a documented sampling
            justification (SA 530 · OOB-10). Minimum 10 characters.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="sampling-method">Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as SamplingMethod)}>
              <SelectTrigger id="sampling-method"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="amount_range">Amount Range</SelectItem>
                <SelectItem value="random">Random</SelectItem>
                <SelectItem value="stratified">Stratified</SelectItem>
                <SelectItem value="statistical">Statistical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sample-size">Sample Size</Label>
            <Input
              id="sample-size"
              type="number"
              min={1}
              value={sampleSize}
              onChange={(e) => setSampleSize(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="justification">Justification (min 10 chars)</Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Document your sampling rationale per SA 530..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={!valid} onClick={() => onConfirm(justification.trim(), method, sampleSize)}>
            Confirm & Sample
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateEngagementDialogProps {
  onCreate: (eng: AuditEngagement) => void;
  onCancel: () => void;
}

function CreateEngagementDialog({ onCreate, onCancel }: CreateEngagementDialogProps): JSX.Element {
  const [name, setName] = useState('');
  const [type, setType] = useState<EngagementType>('statutory_audit');
  const [fy, setFy] = useState('FY 2025-26');
  const [firm, setFirm] = useState('');
  const valid = name.trim().length > 0 && firm.trim().length > 0;

  function handleCreate(): void {
    const eng = createEngagement({
      name: name.trim(),
      type,
      fy,
      entity_code: 'OPERIX-DEMO',
      ca_firm_name: firm.trim(),
      bap_team: [],
    });
    setActiveEngagement(eng.id);
    onCreate(eng);
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Engagement</DialogTitle>
          <DialogDescription>Persistent Auditor Workspace (OOB-6).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="eng-name">Engagement Name</Label>
            <Input id="eng-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Statutory Audit FY 2025-26" />
          </div>
          <div>
            <Label htmlFor="eng-type">Engagement Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as EngagementType)}>
              <SelectTrigger id="eng-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="statutory_audit">Statutory Audit</SelectItem>
                <SelectItem value="internal_audit">Internal Audit</SelectItem>
                <SelectItem value="tax_audit">Tax Audit</SelectItem>
                <SelectItem value="gst_audit">GST Audit</SelectItem>
                <SelectItem value="cost_audit">Cost Audit</SelectItem>
                <SelectItem value="secretarial_audit">Secretarial Audit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="eng-fy">Financial Year</Label>
            <Input id="eng-fy" value={fy} onChange={(e) => setFy(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="eng-firm">CA Firm</Label>
            <Input id="eng-firm" value={firm} onChange={(e) => setFirm(e.target.value)} placeholder="ABC & Associates" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button disabled={!valid} onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sprint 80e · OOB-1 Audit-Ready Score helpers ───
function bandToColor(b: AuditReadyBand | undefined): string {
  switch (b) {
    case 'excellent': return 'text-emerald-600';
    case 'good':      return 'text-blue-600';
    case 'warning':   return 'text-amber-600';
    case 'critical':  return 'text-red-600';
    default:          return 'text-muted-foreground';
  }
}

const SUB_SCORE_LABELS: Record<keyof SubScoreBreakdown, string> = {
  audit_trail_health: 'Audit-Trail Health',
  working_papers_completion: 'Working Papers',
  caro_clause_coverage: 'CARO Coverage',
  pending_verifications: 'Pending Verifs.',
  open_findings: 'Open Findings',
  statutory_dues_compliance: 'Statutory Dues',
  schedule_iii_readiness: 'Schedule III',
  external_confirmations: 'External Confirm.',
};

// ─── Sprint 80e · OOB-7 Coverage Heatmap (ledgers × months) ───
interface CoverageHeatmapProps {
  entityCode: string;
  fy: string;
}

function CoverageHeatmap({ entityCode, fy }: CoverageHeatmapProps): JSX.Element {
  const grid = useMemo(() => {
    // Build 6 ledger × 12 month synthetic coverage view from audit-trail entries.
    const ledgers = ['Sales', 'Purchases', 'Bank', 'Cash', 'Payroll', 'Journal'];
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const entries = readAuditTrail(entityCode);
    const verified = entries.filter((e) => (e.entity_type as string) === 'audit_framework_voucher_verification');
    const cells = ledgers.map((ledger) => ({
      ledger,
      months: months.map((m) => {
        const monthEntries = verified.filter((e) => new Date(e.timestamp).getMonth() + 1 === m);
        const hash = (ledger.charCodeAt(0) + m) % 4;
        const state: 'green' | 'yellow' | 'red' | 'grey' =
          monthEntries.length > 2 ? 'green'
          : monthEntries.length > 0 ? 'yellow'
          : hash === 0 ? 'grey'
          : hash === 1 ? 'red'
          : 'yellow';
        return { month: m, state, count: monthEntries.length };
      }),
    }));
    return { ledgers, months, cells };
  }, [entityCode]);

  const colorFor = (s: 'green' | 'yellow' | 'red' | 'grey'): string => {
    switch (s) {
      case 'green':  return 'bg-emerald-500/80';
      case 'yellow': return 'bg-amber-400/80';
      case 'red':    return 'bg-red-500/80';
      default:       return 'bg-muted';
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] text-muted-foreground">FY {fy} · entity {entityCode}</p>
      <div className="grid grid-cols-[100px_repeat(12,_1fr)] gap-1 text-[10px]">
        <div />
        {grid.months.map((m) => (
          <div key={`hdr-${m}`} className="text-center font-mono text-muted-foreground">{m}</div>
        ))}
        {grid.cells.map((row) => (
          <>
            <div key={`lbl-${row.ledger}`} className="font-semibold truncate">{row.ledger}</div>
            {row.months.map((c) => (
              <div
                key={`${row.ledger}-${c.month}`}
                className={`h-5 rounded-sm ${colorFor(c.state)}`}
                title={`${row.ledger} · M${c.month} · ${c.state.toUpperCase()} · ${c.count} verifs`}
              />
            ))}
          </>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-500/80" /> Audited</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-amber-400/80" /> Sampled</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-500/80" /> Untouched</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-muted" /> No vouchers</span>
      </div>
    </div>
  );
}

// ─── Sprint 80e · OOB-3 Replay drawer ───
interface ReplayDrawerProps {
  entityType: string;
  entityId: string;
  entityCode: string;
  bap: BAPAccountId;
  onClose: () => void;
}

function ReplayDrawer({ entityType, entityId, entityCode, bap, onClose }: ReplayDrawerProps): JSX.Element {
  const [session, setSession] = useState<AuditReplaySession | null>(null);
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    const s = generateReplay({ entity_type: entityType, entity_id: entityId, entity_code: entityCode, initiated_by_bap: bap });
    setSession(s);
    setFrameIdx(Math.max(0, s.total_frames - 1));
  }, [entityType, entityId, entityCode, bap]);

  const frame = session?.frames[frameIdx];

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit Replay · {entityType} {entityId}</DialogTitle>
          <DialogDescription>
            Frame-by-frame cinematic replay · OOB-3 · {session?.total_frames ?? 0} frames
          </DialogDescription>
        </DialogHeader>
        {!session || session.total_frames === 0 ? (
          <p className="text-sm text-muted-foreground">No audit-trail history for this entity yet.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={frameIdx === 0} onClick={() => setFrameIdx(frameIdx - 1)}>‹ Prev</Button>
              <input
                type="range"
                min={0}
                max={session.total_frames - 1}
                value={frameIdx}
                onChange={(e) => setFrameIdx(Number(e.target.value))}
                className="flex-1"
                aria-label="replay-scrubber"
              />
              <Button size="sm" variant="outline" disabled={frameIdx === session.total_frames - 1} onClick={() => setFrameIdx(frameIdx + 1)}>Next ›</Button>
            </div>
            {frame && (
              <div className="rounded-md border p-3 space-y-2 text-xs">
                <div className="flex justify-between font-mono">
                  <span>Frame {frameIdx + 1} / {session.total_frames}</span>
                  <span>{frame.timestamp}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{frame.action}</Badge>
                  <Badge variant="outline">{frame.actor.name} ({frame.actor.role ?? 'n/a'})</Badge>
                  <Badge variant="secondary">Downstream impact: {frame.downstream_impact_count}</Badge>
                </div>
                {frame.diff.length > 0 ? (
                  <table className="w-full text-[11px] font-mono">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th>Field</th><th>Before</th><th>After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {frame.diff.map((d) => (
                        <tr key={d.field} className="border-t">
                          <td className="py-1">{d.field}</td>
                          <td className="py-1 truncate max-w-[120px]">{JSON.stringify(d.before)}</td>
                          <td className="py-1 truncate max-w-[120px]">{JSON.stringify(d.after)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted-foreground">No field changes in this frame.</p>
                )}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sprint 80e · OOB-11 Lineage drawer ───
interface LineageDrawerProps {
  findingId: string;
  bap: BAPAccountId;
  onClose: () => void;
}

function LineageDrawer({ findingId, bap, onClose }: LineageDrawerProps): JSX.Element {
  const [chain, setChain] = useState<LineageChain | null>(null);
  useEffect(() => {
    setChain(buildLineageChain({ finding_id: findingId, initiated_by_bap: bap }));
  }, [findingId, bap]);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cross-Card Lineage Tunnel</DialogTitle>
          <DialogDescription>
            Drill from finding to root cause across cards · OOB-11 · {chain?.node_count ?? 0} nodes ·
            termination: {chain?.termination_reason ?? '—'}
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-2 text-xs">
          {chain?.nodes.map((n) => (
            <li key={n.node_id} className="rounded-md border p-2">
              <div className="flex justify-between font-mono">
                <span>L{n.level} · {n.card}</span>
                <span className="text-muted-foreground">{n.timestamp}</span>
              </div>
              <div className="font-semibold">{n.entity_label}</div>
              <div className="text-muted-foreground">{n.brief}</div>
              <code className="text-[10px] text-muted-foreground">{n.navigate_path}</code>
            </li>
          ))}
        </ol>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AuditFrameworkDashboardPage(): JSX.Element {
  const [engagements, setEngagements] = useState<AuditEngagement[]>(() => listEngagements());
  const [activeEng, setActiveEng] = useState<AuditEngagement | null>(() => getActiveEngagement());
  const [activeBAP, setActiveBAP] = useState<BAPAccountId>(() => getActiveBAPAccount());
  const [recentRuns, setRecentRuns] = useState<Array<{ code: AnalyticsProcedureCode; flagged: number; at: string }>>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [showSampling, setShowSampling] = useState(false);
  const [pendingProcedure, setPendingProcedure] = useState<AnalyticsProcedureCode | null>(null);

  // Sprint 80d · MCA Rule 11(g) Self-Verify state
  const [coverageReport, setCoverageReport] = useState<MCACoverageReport | null>(null);
  const [retentionStatus, setRetentionStatus] = useState<ReturnType<typeof getRetentionStatus> | null>(null);
  const [continuityReport, setContinuityReport] = useState<ContinuityReport | null>(null);

  // Sprint 80e · Headline Differentiator UX state
  const [score, setScore] = useState<AuditReadyScore | null>(null);
  const [replayTarget, setReplayTarget] = useState<{ entity_type: string; entity_id: string } | null>(null);
  const [lineageTarget, setLineageTarget] = useState<{ finding_id: string } | null>(null);

  function generateAllReports(): void {
    const entity = activeEng?.entity_code ?? 'OPERIX-DEMO';
    const fy = activeEng?.fy ?? 'FY 2025-26';
    setCoverageReport(generateCoverageReport());
    setRetentionStatus(getRetentionStatus(entity));
    setContinuityReport(generateContinuityReport(entity, fy));
    toast.success('MCA Rule 11(g) self-verify refreshed');
  }

  function handleExportToColdStorage(): void {
    const entity = activeEng?.entity_code ?? 'OPERIX-DEMO';
    const fy = activeEng?.fy ?? 'FY 2025-26';
    const { record, blob } = exportToColdStorage({
      entity_code: entity, fy, triggered_by_bap: activeBAP,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cold-storage-${entity}-${fy.replace(/\s+/g, '_')}-${record.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setRetentionStatus(getRetentionStatus(entity));
    toast.success(`Exported ${record.entries_count} entries to cold-storage`);
  }

  async function handleVerifyProof(): Promise<void> {
    const entity = activeEng?.entity_code ?? 'OPERIX-DEMO';
    try {
      const v = await verifyChainIntegrity(entity);
      toast.success(`Cryptographic proof: ${v.ok ? 'VERIFIED' : 'BROKEN'}`);
    } catch {
      toast.error('Verification unavailable');
    }
  }

  function handleDownloadCoverage(): void {
    if (!coverageReport) return;
    const blob = exportCoverageReportJson(coverageReport);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mca-coverage-${coverageReport.report_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Sprint 80e · refresh Audit-Ready Score
  function refreshScore(): void {
    const entity = activeEng?.entity_code ?? 'OPERIX-DEMO';
    const fy = activeEng?.fy ?? 'FY 2025-26';
    setScore(computeAuditReadyScore(entity, fy));
  }

  useEffect(() => {
    refreshScore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEng?.entity_code, activeEng?.fy]);

  const hasEngagement = activeEng !== null;

  const totalProcedures = ANALYTICS_PROCEDURES.length;
  const totalRuns = recentRuns.length;
  const totalFlagged = useMemo(() => recentRuns.reduce((n, r) => n + r.flagged, 0), [recentRuns]);

  function handleBAPChange(id: BAPAccountId): void {
    setActiveBAPAccount(id);
    setActiveBAP(id);
  }

  function handleEngagementChange(id: string): void {
    setActiveEngagement(id);
    const eng = listEngagements().find((e) => e.id === id) ?? null;
    setActiveEng(eng);
  }

  function handleCreated(eng: AuditEngagement): void {
    setEngagements(listEngagements());
    setActiveEng(eng);
    setShowCreate(false);
    toast.success(`Engagement "${eng.name}" created`);
  }

  function actuallyRunProcedure(code: AnalyticsProcedureCode): void {
    if (!activeEng) return;
    const meta = ANALYTICS_PROCEDURES.find((p) => p.code === code);
    if (!meta) return;
    const result = runAnalyticsProcedure({
      procedure_code: code,
      engagement_id: activeEng.id,
      fy: activeEng.fy,
      entity_code: activeEng.entity_code,
      population: [],
      parameters: meta.default_parameters,
      run_by_bap: activeBAP,
    });
    setRecentRuns((prev) => [
      { code, flagged: result.flagged_count, at: result.run_at },
      ...prev,
    ].slice(0, 10));
    toast.success(`${meta.label} executed · ${result.flagged_count} flagged`);
  }

  function handleRunProcedure(code: AnalyticsProcedureCode): void {
    if (!activeEng) {
      toast.error('Select or create an engagement first');
      return;
    }
    if (PROCEDURES_REQUIRING_SAMPLING.includes(code)) {
      setPendingProcedure(code);
      setShowSampling(true);
      return;
    }
    actuallyRunProcedure(code);
  }

  function handleSamplingConfirm(justification: string, method: SamplingMethod, sampleSize: number): void {
    if (!activeEng || !pendingProcedure) return;
    try {
      executeSampling({
        population: [],
        method,
        justification,
        parameters: { sample_size: sampleSize, threshold_amount: 0 },
        engagement_id: activeEng.id,
        sampled_by_bap: activeBAP,
      });
      actuallyRunProcedure(pendingProcedure);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sampling failed';
      toast.error(msg);
    } finally {
      setShowSampling(false);
      setPendingProcedure(null);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Audit Framework Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          18 Tally-equivalent analytical procedures · MCA Rule 11(g) compliance hardening (S80d) ·
          Audit Replay + Lineage (S80e) · Rule 11(g) auto-report (S80f).
        </p>
      </header>

      {/* OOB-6 Workspace picker + BAP picker */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Active Engagement</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {engagements.length === 0 ? (
              <p className="text-xs text-muted-foreground">No engagements yet</p>
            ) : (
              <Select value={activeEng?.id ?? ''} onValueChange={handleEngagementChange}>
                <SelectTrigger><SelectValue placeholder="Select engagement" /></SelectTrigger>
                <SelectContent>
                  {engagements.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} · {e.fy}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="w-full">
              Create New Engagement
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Active BAP Role</CardTitle></CardHeader>
          <CardContent>
            <Select value={activeBAP} onValueChange={(v) => handleBAPChange(v as BAPAccountId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BAP_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Procedures</CardTitle></CardHeader>
          <CardContent>
            <p className="font-mono text-2xl">{totalProcedures}</p>
            <p className="text-xs text-muted-foreground">Analytical procedures available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Session Stats</CardTitle></CardHeader>
          <CardContent>
            <p className="font-mono text-2xl">{totalRuns}</p>
            <p className="text-xs text-muted-foreground">runs · {totalFlagged} flagged total</p>
          </CardContent>
        </Card>
      </section>

      {/* Tile grid · 18 procedures + 2 stub tiles */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {ANALYTICS_PROCEDURES.map((proc) => (
          <ProcedureTile
            key={proc.code}
            code={proc.code}
            label={proc.label}
            description={proc.description}
            caroClauses={proc.caro_clauses}
            onRun={() => handleRunProcedure(proc.code)}
            disabled={!hasEngagement}
          />
        ))}

        {/* 19th tile · MCA Rule 11(g) Self-Verify · S80d fills (Cannot-Disable + Coverage + Retention + Continuity) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">MCA Rule 11(g) Self-Verify</CardTitle>
            <CardDescription className="text-xs">4-question architectural framework</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>(a) Cannot Disable</span>
                <span className="font-mono">{MCA_RULE_3_1_COMPLIANCE.cannot_be_disabled ? 'PASS' : 'FAIL'}</span>
              </div>
              <div className="flex justify-between">
                <span>(b) Coverage</span>
                <span className="font-mono">{coverageReport ? `${coverageReport.coverage_percentage.toFixed(1)}%` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>(c) 8-Year Retention</span>
                <span className="font-mono">{retentionStatus?.retention_compliant ? 'PASS' : retentionStatus ? 'WARN' : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span>(d) Continuity</span>
                <span className="font-mono">{continuityReport?.operated_throughout_year_verdict ?? '—'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={generateAllReports}>Refresh status</Button>
              {coverageReport && (
                <Button size="sm" variant="ghost" onClick={handleDownloadCoverage}>Download JSON</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 20th tile · STUB · S80e fills (Audit Coverage Heatmap) */}
        <Card className="border-2 border-dashed opacity-60">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Audit Coverage Heatmap</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              S80e fills this tile (ledgers x months coverage matrix)
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Cold-Storage Export section · S80d · MCA Rule 11(g)(c) workflow */}
      <section className="rounded-lg border bg-muted/40 p-4 space-y-2">
        <h2 className="font-semibold text-base">MCA Rule 11(g)(c) · 8-Year Cold-Storage Export</h2>
        <p className="text-xs text-muted-foreground">
          Quarterly export of audit-trail to encrypted JSON for 8-year retention per Section 128(5).
        </p>
        {retentionStatus && (
          <p className="text-xs">
            Entries: <span className="font-mono">{retentionStatus.total_entries}</span> ·
            Oldest: <span className="font-mono">{retentionStatus.oldest_entry_date ?? '—'}</span> ·
            Exports: <span className="font-mono">{retentionStatus.exports_performed}</span> ·
            Warnings: <span className="font-mono">{retentionStatus.warnings_pending}</span>
          </p>
        )}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={handleExportToColdStorage}>Export Current FY to Cold-Storage</Button>
          <Button size="sm" variant="outline" onClick={handleVerifyProof}>
            Verify Cryptographic Proof (OOB-8)
          </Button>
          {coverageReport && (
            <Badge variant="outline" className="text-[10px]">
              Cryptographically verifiable · {coverageReport.mca_compliance_verdict}
            </Badge>
          )}
        </div>
      </section>

      {recentRuns.length > 0 && (
        <section>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Runs (session)</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-xs font-mono">
                {recentRuns.map((r, i) => (
                  <li key={`${r.code}-${r.at}-${i}`} className="flex justify-between">
                    <span>{r.code}</span>
                    <span className="text-muted-foreground">{r.flagged} flagged</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {showCreate && (
        <CreateEngagementDialog onCreate={handleCreated} onCancel={() => setShowCreate(false)} />
      )}

      {showSampling && pendingProcedure && (
        <SamplingJustificationDialog
          procedureCode={pendingProcedure}
          onConfirm={handleSamplingConfirm}
          onCancel={() => { setShowSampling(false); setPendingProcedure(null); }}
        />
      )}
    </div>
  );
}
