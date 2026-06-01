/**
 * @file        InternalPricingHubPage.tsx
 * @purpose     Standalone Page #25 — Internal inter-scope pricing matrix +
 *              one-click TP-audit generator + approval queue.
 * @reads       internal-pricing-engine · idea-7-transfer-pricing-audit-engine
 * @writes      none directly (delegates to engines)
 * @sprint      T-Phase-6.A.0.4 · Sprint 99 · Block 4
 */
import { useState } from 'react';
import { Sparkles, FileCheck2, ShieldAlert, ShieldCheck, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  listPricingRules,
  resolvePrice,
  type InternalPricingRule,
} from '@/lib/internal-pricing-engine';
import {
  generateTPAudit,
  listTPAudits,
  setCommitteeDecision,
  type TPAuditRecord,
} from '@/lib/idea-7-transfer-pricing-audit-engine';

const fmtINR = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

function ScopeBadge({ scope }: { scope: InternalPricingRule['from_scope'] }) {
  const parts = [scope.entity_id, scope.branch_id, scope.division_id, scope.department_id, scope.project_id, scope.site_id].filter(Boolean);
  return (
    <span className="text-[11px] font-mono text-muted-foreground">
      {parts.join(' › ')}
    </span>
  );
}

export default function InternalPricingHubPage() {
  const [tick, setTick] = useState(0);
  const rules = useMemo(() => listPricingRules(), [tick]);
  const audits = useMemo(() => listTPAudits(), [tick]);
  const auditByRule = useMemo(() => {
    const m = new Map<string, TPAuditRecord>();
    audits.forEach((a) => m.set(a.pricing_rule_id, a));
    return m;
  }, [audits]);

  const handleGenerate = (ruleId: string) => {
    try {
      generateTPAudit({ pricing_rule_id: ruleId });
      toast.success('Section 92 TP-audit generated');
      setTick((t) => t + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDecision = (tpId: string, decision: 'approved' | 'rejected') => {
    try {
      setCommitteeDecision(tpId, decision);
      toast.success(`Committee ${decision}`);
      setTick((t) => t + 1);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const pending = audits.filter((a) => a.committee_approval === 'pending');

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Internal Pricing Hub
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            7-tier inter-scope pricing · Section 92 TP documentation orchestrator · approval queue.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-[10px] font-mono">{rules.length} rules</Badge>
          <Badge variant="secondary" className="text-[10px] font-mono">{audits.length} TP records</Badge>
          <Badge variant="destructive" className="text-[10px] font-mono">{pending.length} pending</Badge>
        </div>
      </div>

      <Card className="glass-card">
        <CardContent className="p-3">
          {rules.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-12">
              No inter-scope pricing rules yet. Add a rule via the API or seed data.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Rule</TableHead>
                  <TableHead className="text-[11px]">From → To</TableHead>
                  <TableHead className="text-[11px]">Method</TableHead>
                  <TableHead className="text-[11px] text-right">Price</TableHead>
                  <TableHead className="text-[11px]">Sec 92</TableHead>
                  <TableHead className="text-[11px]">TP</TableHead>
                  <TableHead className="text-[11px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => {
                  const resolved = resolvePrice({
                    rule_type: r.rule_type,
                    from_scope: r.from_scope,
                    to_scope: r.to_scope,
                    item_key: r.item_key,
                  });
                  const audit = auditByRule.get(r.pricing_rule_id);
                  return (
                    <TableRow key={r.pricing_rule_id}>
                      <TableCell className="text-[11px] font-mono">
                        {r.pricing_rule_id}
                        <div className="text-muted-foreground">{r.rule_type}</div>
                      </TableCell>
                      <TableCell className="text-[11px]">
                        <ScopeBadge scope={r.from_scope} />
                        <div>→</div>
                        <ScopeBadge scope={r.to_scope} />
                      </TableCell>
                      <TableCell className="text-[11px]">{r.pricing_method}</TableCell>
                      <TableCell className="text-[11px] font-mono text-right">
                        {resolved ? fmtINR(resolved.price) : '—'}
                      </TableCell>
                      <TableCell>
                        {audit ? (
                          audit.section92_applicable ? (
                            <Badge variant="destructive" className="text-[10px]">
                              <ShieldAlert className="h-3 w-3 mr-1" /> Applicable
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              <ShieldCheck className="h-3 w-3 mr-1" /> Below threshold
                            </Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-[10px]">unknown</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-[11px]">
                        {audit ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-mono">{audit.methodology}</span>
                            <Badge variant="outline" className="text-[10px]">{audit.committee_approval}</Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => handleGenerate(r.pricing_rule_id)}>
                          <Sparkles className="h-3 w-3 mr-1" /> TP-doc
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-3">
            <h2 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-primary" /> Approval Queue
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">TP ID</TableHead>
                  <TableHead className="text-[11px]">Rule</TableHead>
                  <TableHead className="text-[11px]">Method</TableHead>
                  <TableHead className="text-[11px]">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((a) => (
                  <TableRow key={a.tp_audit_id}>
                    <TableCell className="text-[11px] font-mono">{a.tp_audit_id}</TableCell>
                    <TableCell className="text-[11px] font-mono">{a.pricing_rule_id}</TableCell>
                    <TableCell className="text-[11px]">{a.methodology}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="default" onClick={() => handleDecision(a.tp_audit_id, 'approved')}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDecision(a.tp_audit_id, 'rejected')}>
                        Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
