/**
 * @file        src/features/org-design/OrgDesignSimulatorPage.tsx
 * @page        First-Class Standalone Page #46 · 🏁 Arc D.0 Capstone · Org Design + Succession
 * @sprint      T-Phase-7.D.0.4 · Sprint 119
 * @card        Renders under the existing 'fpa-planning' card (requiredCards on the sidebar item).
 * @reads-from  org-design-succession-engine ONLY (simulateReorg · listReorgScenarios ·
 *              upsertSuccession · listSuccession · getSuccessionCoverage · upsertSkill ·
 *              getSkillsInventory). FR-44: org-structure / workforce-planning / Employee
 *              are READ INDIRECTLY via the engine — never mutated.
 * @discipline  Dark mode · semantic tokens · shadcn · lucide · font-mono on numbers · NOT a SIBLID.
 * @safety      The simulator UI is clearly labelled "SCENARIO — does not change live org".
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Network, ShieldAlert, Users, Sparkles, Save, Trash2, Plus,
} from 'lucide-react';
import {
  simulateReorg,
  listReorgScenarios,
  upsertSuccession,
  listSuccession,
  getSuccessionCoverage,
  upsertSkill,
  getSkillsInventory,
  type ProposedOrgNode,
  type OrgNodeType,
  type ReorgScenario,
  type SuccessionEntry,
  type SuccessionReadiness,
  type SkillEntry,
  type SkillProficiency,
} from '@/lib/org-design-succession-engine';

const inr = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const READINESS_OPTIONS: SuccessionReadiness[] = ['ready_now', '1-2_years', 'development'];
const PROFICIENCY_OPTIONS: SkillProficiency[] = ['basic', 'proficient', 'expert'];
const NODE_TYPE_OPTIONS: OrgNodeType[] = ['division', 'department'];

function coverageBadgeClass(coverage: SuccessionEntry['coverage']): string {
  if (coverage === 'covered') return 'bg-success/15 text-success border-success/30';
  if (coverage === 'at_risk') return 'bg-warning/15 text-warning border-warning/30';
  return 'bg-destructive/15 text-destructive border-destructive/30';
}

export default function OrgDesignSimulatorPage() {
  // ── Re-org simulator state ─────────────────────────────────────────────────
  const [fy, setFy] = useState('FY26-27');
  const [scenarioName, setScenarioName] = useState('Re-org Plan A');
  const [proposedNodes, setProposedNodes] = useState<ProposedOrgNode[]>([
    { node_id: 'N-1', node_type: 'division', parent_id: null, planned_headcount: 25 },
    { node_id: 'N-2', node_type: 'department', parent_id: 'N-1', planned_headcount: 10 },
  ]);
  const [scenarios, setScenarios] = useState<ReorgScenario[]>([]);
  const [lastScenario, setLastScenario] = useState<ReorgScenario | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  // ── Succession state ───────────────────────────────────────────────────────
  const [roleId, setRoleId] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [incumbentId, setIncumbentId] = useState('');
  const [successors, setSuccessors] = useState<{ employee_id: string; readiness: SuccessionReadiness }[]>([]);
  const [succession, setSuccession] = useState<SuccessionEntry[]>([]);
  const [succError, setSuccError] = useState<string | null>(null);

  // ── Skills state ───────────────────────────────────────────────────────────
  const [skillEmpId, setSkillEmpId] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillProf, setSkillProf] = useState<SkillProficiency>('proficient');
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [skillError, setSkillError] = useState<string | null>(null);

  useEffect(() => {
    setScenarios(listReorgScenarios());
    setSuccession(listSuccession());
    setSkills(getSkillsInventory());
  }, []);

  const coverage = useMemo(() => getSuccessionCoverage(), []);

  // ── Simulator handlers ─────────────────────────────────────────────────────
  function addNode() {
    setProposedNodes((rows) => [
      ...rows,
      {
        node_id: `N-${rows.length + 1}`,
        node_type: 'department',
        parent_id: rows[0]?.node_id ?? null,
        planned_headcount: 0,
      },
    ]);
  }

  function removeNode(idx: number) {
    setProposedNodes((rows) => rows.filter((_, i) => i !== idx));
  }

  function updateNode(idx: number, patch: Partial<ProposedOrgNode>) {
    setProposedNodes((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    );
  }

  function runSimulation() {
    setSimError(null);
    try {
      const next = simulateReorg({
        fy,
        name: scenarioName,
        proposed_nodes: proposedNodes,
      });
      setLastScenario(next);
      setScenarios(listReorgScenarios());
    } catch (e) {
      setSimError(e instanceof Error ? e.message : String(e));
    }
  }

  // ── Succession handlers ────────────────────────────────────────────────────
  function addSuccessorRow() {
    setSuccessors((rows) => [...rows, { employee_id: '', readiness: 'development' }]);
  }

  function updateSuccessor(idx: number, patch: Partial<{ employee_id: string; readiness: SuccessionReadiness }>) {
    setSuccessors((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeSuccessor(idx: number) {
    setSuccessors((rows) => rows.filter((_, i) => i !== idx));
  }

  function saveSuccession() {
    setSuccError(null);
    try {
      upsertSuccession({
        role_id: roleId,
        role_title: roleTitle,
        incumbent_employee_id: incumbentId || null,
        successors,
      });
      setSuccession(listSuccession());
    } catch (e) {
      setSuccError(e instanceof Error ? e.message : String(e));
    }
  }

  // ── Skill handlers ─────────────────────────────────────────────────────────
  function saveSkill() {
    setSkillError(null);
    try {
      upsertSkill({ employee_id: skillEmpId, skill: skillName, proficiency: skillProf });
      setSkills(getSkillsInventory());
    } catch (e) {
      setSkillError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Network className="h-6 w-6 text-primary" />
          Org Design &amp; Succession
        </h1>
        <p className="text-sm text-muted-foreground">
          Re-org simulator (scenario copy · live org untouched) · succession coverage · skills inventory.
        </p>
      </div>

      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>SCENARIO — does not change live org</AlertTitle>
        <AlertDescription>
          All re-org changes are written to a scenario side-store
          (<code className="font-mono text-xs">erp_org_design_scenario_*</code>). The real
          divisions/departments registers stay 0-DIFF.
        </AlertDescription>
      </Alert>

      {/* ── Re-org simulator ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Re-org Simulator</CardTitle>
          <CardDescription>
            Build a proposed tree and compute headcount + cost deltas via workforce-planning.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Financial year</Label>
              <Input value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" />
            </div>
            <div className="md:col-span-2">
              <Label>Scenario name</Label>
              <Input value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Node ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead className="text-right">Planned HC</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposedNodes.map((n, i) => (
                  <TableRow key={n.node_id + i}>
                    <TableCell className="font-mono">
                      <Input
                        value={n.node_id}
                        onChange={(e) => updateNode(i, { node_id: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={n.node_type}
                        onValueChange={(v) => updateNode(i, { node_type: v as OrgNodeType })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {NODE_TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-mono">
                      <Input
                        value={n.parent_id ?? ''}
                        placeholder="(root)"
                        onChange={(e) =>
                          updateNode(i, { parent_id: e.target.value || null })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        className="font-mono text-right"
                        value={n.planned_headcount}
                        onChange={(e) =>
                          updateNode(i, { planned_headcount: Number(e.target.value || 0) })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeNode(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={addNode}>
              <Plus className="h-4 w-4 mr-1" /> Add node
            </Button>
            <Button onClick={runSimulation}>
              <Sparkles className="h-4 w-4 mr-1" /> Run scenario
            </Button>
          </div>

          {simError && (
            <Alert variant="destructive">
              <AlertDescription>{simError}</AlertDescription>
            </Alert>
          )}

          {lastScenario && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Baseline HC</p>
                  <p className="text-xl font-mono">{lastScenario.baseline_headcount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Proposed HC</p>
                  <p className="text-xl font-mono">{lastScenario.proposed_headcount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">HC Δ</p>
                  <p className="text-xl font-mono">{lastScenario.headcount_delta}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Cost Δ</p>
                  <p className="text-xl font-mono">{inr(lastScenario.cost_delta)}</p>
                </CardContent>
              </Card>
            </div>
          )}

          {scenarios.length > 0 && (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead>FY</TableHead>
                    <TableHead className="text-right">HC Δ</TableHead>
                    <TableHead className="text-right">Cost Δ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenarios.map((s) => (
                    <TableRow key={s.scenario_id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell className="font-mono">{s.fy}</TableCell>
                      <TableCell className="text-right font-mono">{s.headcount_delta}</TableCell>
                      <TableCell className="text-right font-mono">{inr(s.cost_delta)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Succession ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Succession Matrix</CardTitle>
          <CardDescription>
            Role → incumbent → successors with readiness. Coverage RAG: gap / at-risk / covered.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total roles</p>
                <p className="text-xl font-mono">{coverage.total_roles}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Covered</p>
                <p className="text-xl font-mono text-success">{coverage.covered}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">At-risk / Gap</p>
                <p className="text-xl font-mono">
                  <span className="text-warning">{coverage.at_risk}</span>
                  {' / '}
                  <span className="text-destructive">{coverage.gap}</span>
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Role ID</Label>
              <Input value={roleId} onChange={(e) => setRoleId(e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label>Role title</Label>
              <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
            </div>
            <div>
              <Label>Incumbent employee ID (optional)</Label>
              <Input value={incumbentId} onChange={(e) => setIncumbentId(e.target.value)} className="font-mono" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Successors</Label>
            {successors.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  className="font-mono"
                  placeholder="Employee ID"
                  value={s.employee_id}
                  onChange={(e) => updateSuccessor(i, { employee_id: e.target.value })}
                />
                <Select
                  value={s.readiness}
                  onValueChange={(v) => updateSuccessor(i, { readiness: v as SuccessionReadiness })}
                >
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {READINESS_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="ghost" onClick={() => removeSuccessor(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" onClick={addSuccessorRow}>
                <Plus className="h-4 w-4 mr-1" /> Add successor
              </Button>
              <Button onClick={saveSuccession}>
                <Save className="h-4 w-4 mr-1" /> Save role
              </Button>
            </div>
          </div>

          {succError && (
            <Alert variant="destructive">
              <AlertDescription>{succError}</AlertDescription>
            </Alert>
          )}

          {succession.length > 0 && (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Incumbent</TableHead>
                    <TableHead className="text-right">Successors</TableHead>
                    <TableHead>Coverage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {succession.map((s) => (
                    <TableRow key={s.role_id}>
                      <TableCell>
                        <div className="font-medium">{s.role_title}</div>
                        <div className="font-mono text-xs text-muted-foreground">{s.role_id}</div>
                      </TableCell>
                      <TableCell className="font-mono">{s.incumbent_employee_id ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono">{s.successors.length}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={coverageBadgeClass(s.coverage)}>
                          {s.coverage}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Skills inventory ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Skills Inventory</CardTitle>
          <CardDescription>Per-employee skill catalog. Inventory only — no perf-mgmt, no comp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label>Employee ID</Label>
              <Input value={skillEmpId} onChange={(e) => setSkillEmpId(e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label>Skill</Label>
              <Input value={skillName} onChange={(e) => setSkillName(e.target.value)} />
            </div>
            <div>
              <Label>Proficiency</Label>
              <Select value={skillProf} onValueChange={(v) => setSkillProf(v as SkillProficiency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROFICIENCY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={saveSkill} className="w-full">
                <Users className="h-4 w-4 mr-1" /> Add skill
              </Button>
            </div>
          </div>

          {skillError && (
            <Alert variant="destructive">
              <AlertDescription>{skillError}</AlertDescription>
            </Alert>
          )}

          {skills.length > 0 && (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Skill</TableHead>
                    <TableHead>Proficiency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skills.map((s, i) => (
                    <TableRow key={s.employee_id + '::' + s.skill + '::' + i}>
                      <TableCell className="font-mono">{s.employee_id}</TableCell>
                      <TableCell>{s.skill}</TableCell>
                      <TableCell><Badge variant="outline">{s.proficiency}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
