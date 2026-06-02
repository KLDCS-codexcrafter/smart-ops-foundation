/**
 * @file        src/features/inter-dept-governance/InterDeptGovernancePage.tsx
 * @page        First-Class Standalone Page #42 · Pillar C.3 · Inter-Department Governance
 * @sprint      T-Phase-6.C.3.1-CLOSE · Sprint 115 · 🏁 PHASE 6 FINALE
 * @reads-from  inter-dept-governance-engine (read-only · no dead UI)
 * @discipline  Dark mode · semantic tokens · shadcn · lucide · font-mono on numbers · NOT a SIBLID
 * @honest      Surfaces the engine's honest-metrics disclosure verbatim · 16/16 + 29 NEVER shown as "certified"
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Network, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck, Info } from 'lucide-react';
import {
  auditInterDeptBridges,
  listGovernedBridges,
  NARRATIVE_HEADLINE_FIGURES,
  type GovernanceAuditResult,
  type BridgeGovernanceRow,
} from '@/lib/inter-dept-governance-engine';

function bridgeTypeLabel(t: BridgeGovernanceRow['bridge_type']): string {
  if (t === 'inter_dept_approval') return 'Inter-Dept Approval';
  if (t === 'compliance_approval') return 'Compliance Approval';
  return 'Other Bridge';
}

export default function InterDeptGovernancePage() {
  const initialRows = useMemo(() => listGovernedBridges(), []);
  const [fy, setFy] = useState('FY25-26');
  const [audit, setAudit] = useState<GovernanceAuditResult | null>(null);

  // Render an initial preview without emitting an audit log entry.
  useEffect(() => {
    setAudit({
      fy,
      bridges: initialRows,
      total_bridges: initialRows.length,
      exceptions: [],
      sources_read: [
        'idea-6-inter-dept-approval-bridge-engine.listInterDeptWorkflows',
        'oob8-compliance-aware-approval-engine.listComplianceApprovalRules',
        '_institutional/sibling-register.SIBLINGS',
      ],
      honest_metrics_note: NARRATIVE_HEADLINE_FIGURES.disclaimer,
    });
  }, [fy, initialRows]);

  const runAudit = () => {
    const res = auditInterDeptBridges({ fy });
    setAudit(res);
  };

  const rows = audit?.bridges ?? [];
  const exceptions = audit?.exceptions ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Network className="h-6 w-6 text-primary" />
          Inter-Department Governance
        </h1>
        <p className="text-sm text-muted-foreground">
          Pillar C.3 · READ-ONLY audit of inter-dept bridges (idea-6 + oob8 + bridge-pattern siblings).
          Creates no bridge; mutates no bridge engine.
        </p>
      </header>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Honest-Metrics Disclosure (DP-A4-8 · FR-91)</AlertTitle>
        <AlertDescription className="text-xs">
          Headline narrative figures — <span className="font-mono">16/16</span> OOBs ·{' '}
          <span className="font-mono">29</span> bridges ·{' '}
          <span className="font-mono">161/161</span> obligations ·{' '}
          <span className="font-mono">18</span> capabilities · Horizon 1.5 — are positioning claims,
          NOT machine-certified register integers. The total below is the ACTUAL enumerated count.
        </AlertDescription>
      </Alert>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Audit Controls</CardTitle>
          <CardDescription>Run a read-only governance audit for the selected FY.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="gov-fy" className="text-xs">Financial Year</Label>
            <Input
              id="gov-fy"
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              className="w-40 font-mono"
            />
          </div>
          <Button onClick={runAudit} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Run Governance Audit
          </Button>
          <div className="ml-auto flex gap-2">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              Total bridges (actual): <span className="font-mono ml-1">{audit?.total_bridges ?? 0}</span>
            </Badge>
            <Badge variant={exceptions.length > 0 ? 'destructive' : 'default'} className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Exceptions: <span className="font-mono ml-1">{exceptions.length}</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Governed Bridges</CardTitle>
          <CardDescription>
            Enumerated read-only from idea-6, oob8, and the sibling-register.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bridge</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Active Rules</TableHead>
                <TableHead className="text-right">Workflows</TableHead>
                <TableHead>Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No bridges enumerated yet — run the audit.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.bridge_id}>
                    <TableCell className="font-mono text-xs">{r.bridge_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{bridgeTypeLabel(r.bridge_type)}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{r.active_rules}</TableCell>
                    <TableCell className="text-right font-mono">{r.workflow_count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.coverage_note}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Exceptions
          </CardTitle>
          <CardDescription>Coverage gaps flagged by the read-only audit.</CardDescription>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              No exceptions flagged in the current audit.
            </div>
          ) : (
            <ul className="space-y-2 text-sm">
              {exceptions.map((e, i) => (
                <li key={`${e.bridge_id}-${i}`} className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                  <div>
                    <div className="font-mono text-xs">{e.bridge_id}</div>
                    <div className="text-muted-foreground">{e.issue}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Sources Read (Transparency · FR-91)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-xs font-mono space-y-1 text-muted-foreground">
            {(audit?.sources_read ?? []).map((s) => (
              <li key={s}>· {s}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
