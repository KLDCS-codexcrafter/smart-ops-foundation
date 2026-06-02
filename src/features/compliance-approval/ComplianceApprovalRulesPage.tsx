/**
 * @file        src/features/compliance-approval/ComplianceApprovalRulesPage.tsx
 * @page        First-Class Standalone Page #40 · OOB-8 Compliance-Aware Approval Rules
 * @sprint      T-Phase-6.B.OOB.1 · Sprint 113 · Arc 4 opener
 * @decisions   DP-A4-2 (FR-44 idea-6 reuse) · DP-A4-8 (HONEST METRICS — no machine "15/16" register)
 * @reads-from  oob8-compliance-aware-approval-engine (no dead UI)
 * @discipline  Dark mode · semantic tokens · shadcn · lucide · font-mono on numbers · ₹ Indian locale · NOT a SIBLID
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ShieldCheck, Workflow, Activity, AlertTriangle } from 'lucide-react';
import {
  DEFAULT_COMPLIANCE_APPROVAL_RULES,
  listComplianceApprovalRules,
  setRuleActive,
  evaluateComplianceApproval,
  decideComplianceApproval,
  listRoutedWorkflows,
  type ComplianceApprovalEvaluation,
  type ComplianceApprovalRule,
  type ComplianceApprovalRuleId,
} from '@/lib/oob8-compliance-aware-approval-engine';

function fmtINR(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function ComplianceApprovalRulesPage() {
  const [, force] = useState(0);
  const refresh = () => force((x) => x + 1);
  const rules = useMemo<ComplianceApprovalRule[]>(() => listComplianceApprovalRules(), []);

  // Demo state
  const [amount, setAmount] = useState<number>(750_000);
  const [txnType, setTxnType] = useState<string>('vendor_payment');
  const [ctx, setCtx] = useState({
    vendor_msme: false,
    regulated: false,
    near_statutory_deadline: false,
    related_party: false,
    cross_entity: false,
    tds_tcs: false,
    is_capex: false,
  });
  const [lastEval, setLastEval] = useState<ComplianceApprovalEvaluation | null>(null);
  const routed = listRoutedWorkflows();

  const toggle = (rule_id: ComplianceApprovalRuleId, active: boolean) => {
    setRuleActive(rule_id, active);
    toast.success(`Rule ${active ? 'enabled' : 'disabled'}`, { description: rule_id });
    refresh();
  };

  const runEvaluation = () => {
    const result = evaluateComplianceApproval({
      txn_type: txnType,
      amount,
      entity_code: 'GLOBAL',
      ...ctx,
    });
    setLastEval(result);
    if (result.requires_approval) {
      toast.success(`Rule fired: ${result.rule_id}`, {
        description: `Routed to ${result.approver_role} via idea-6 (workflow ${result.routed_workflow_id ?? '—'})`,
      });
    } else {
      toast.info('No rule fired for this compliance context');
    }
    refresh();
  };

  const decide = (workflow_id: string, decision: 'approved' | 'rejected') => {
    const r = decideComplianceApproval(workflow_id, decision, `Demo ${decision}`);
    if (r.ok) {
      toast.success(`Workflow ${decision}`, { description: workflow_id });
      refresh();
    } else {
      toast.error('Decision failed', { description: r.reason ?? 'unknown' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Compliance-Aware Approval (OOB-8)
        </h1>
        <p className="text-sm text-muted-foreground">
          8 default compliance-context rules. When a rule fires, the approval is routed through the
          Inter-Department Approval Bridge (idea-6). Price-variance trigger remains owned by idea-6;
          OOB-8 adds the compliance dimension.
        </p>
      </header>

      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" /> 8 Default Rules
          </CardTitle>
          <CardDescription>Toggle a rule to enable/disable it for this entity scope.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rules.map((r) => (
              <div
                key={r.rule_id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={r.active ? 'default' : 'secondary'}>{r.rule_id}</Badge>
                    <span className="text-xs text-muted-foreground">{r.approver_role}</span>
                  </div>
                  <p className="text-sm">{r.description}</p>
                  {typeof r.threshold_inr === 'number' && (
                    <p className="text-xs font-mono text-muted-foreground">Threshold: {fmtINR(r.threshold_inr)}</p>
                  )}
                </div>
                <Switch
                  checked={r.active}
                  onCheckedChange={(v) => toggle(r.rule_id, Boolean(v))}
                  aria-label={`Toggle ${r.rule_id}`}
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {DEFAULT_COMPLIANCE_APPROVAL_RULES.length} default rules · honest-metrics note: any narrative
            "OOB 15/16" figure is documentary only — no machine OOB counter is asserted here.
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Evaluation Demo
          </CardTitle>
          <CardDescription>Synthesise a transaction context to see which rule fires and how it routes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="txnType">Transaction type</Label>
              <Input id="txnType" value={txnType} onChange={(e) => setTxnType(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                className="font-mono"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(Object.keys(ctx) as Array<keyof typeof ctx>).map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={ctx[k]}
                  onCheckedChange={(v) => setCtx((p) => ({ ...p, [k]: Boolean(v) }))}
                />
                {k}
              </label>
            ))}
          </div>
          <Button onClick={runEvaluation}>Evaluate &amp; route through idea-6</Button>
          {lastEval && (
            <div className="p-3 rounded-lg border border-border/60 bg-card/50 text-sm">
              <div className="flex items-center gap-2">
                {lastEval.requires_approval ? (
                  <Badge>{lastEval.rule_id}</Badge>
                ) : (
                  <Badge variant="secondary">no rule fired</Badge>
                )}
                <span className="text-muted-foreground">{lastEval.reason}</span>
              </div>
              {lastEval.routed_workflow_id && (
                <p className="mt-1 text-xs font-mono text-muted-foreground">
                  routed_workflow_id: {lastEval.routed_workflow_id} · approver: {lastEval.approver_role}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Routed Workflows (via idea-6)
          </CardTitle>
          <CardDescription>Pending compliance-context approvals routed through the inter-dept bridge.</CardDescription>
        </CardHeader>
        <CardContent>
          {routed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No routed workflows yet. Run the evaluation demo above.</p>
          ) : (
            <div className="space-y-2">
              {routed.map((w) => (
                <div
                  key={w.routed_workflow_id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-card/50"
                >
                  <div className="text-sm">
                    <Badge variant="outline">{w.rule_id}</Badge>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{w.routed_workflow_id}</span>
                    <p className="text-xs text-muted-foreground">routed_at: {w.routed_at}</p>
                    {w.decision && (
                      <p className="text-xs text-muted-foreground">decision: {w.decision}{w.reason ? ` · ${w.reason}` : ''}</p>
                    )}
                  </div>
                  {!w.decision && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => decide(w.routed_workflow_id, 'approved')}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => decide(w.routed_workflow_id, 'rejected')}>
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
