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
import { useMemo, useState } from 'react';
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

export default function AuditFrameworkDashboardPage(): JSX.Element {
  const [engagements, setEngagements] = useState<AuditEngagement[]>(() => listEngagements());
  const [activeEng, setActiveEng] = useState<AuditEngagement | null>(() => getActiveEngagement());
  const [activeBAP, setActiveBAP] = useState<BAPAccountId>(() => getActiveBAPAccount());
  const [recentRuns, setRecentRuns] = useState<Array<{ code: AnalyticsProcedureCode; flagged: number; at: string }>>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [showSampling, setShowSampling] = useState(false);
  const [pendingProcedure, setPendingProcedure] = useState<AnalyticsProcedureCode | null>(null);

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

        {/* 19th tile · STUB · S80d fills (MCA Rule 11(g) Self-Verify) */}
        <Card className="border-2 border-dashed opacity-60">
          <CardHeader className="pb-2"><CardTitle className="text-sm">MCA Rule 11(g) Self-Verify</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              S80d fills this tile (Cannot-Disable + Coverage + Retention status)
            </p>
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
