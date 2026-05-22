/**
 * @file        ApprovalWorkflowEntry.tsx
 * @purpose     D-NEW-GK · Approval routing preview dialog (invoked from PO contexts)
 * @sprint      T-Phase-2.HK-5 · Block A
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { findApplicableTemplate, routeForApproval } from '@/lib/approval-matrix-engine';
import { transitionPoStatus } from '@/lib/po-management-engine';

interface Props {
  poId: string;
  amount: number;
  onRouted?: () => void;
}

const formatINR = (n: number): string =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

export function ApprovalWorkflowEntry({ poId, amount, onRouted }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const preview = findApplicableTemplate(entityCode, 'po', amount);
  const routing = routeForApproval(entityCode, poId);

  const handleSend = async (): Promise<void> => {
    try {
      await transitionPoStatus(poId, 'pending_approval', entityCode, 'mock-user');
      toast.success(`PO routed for approval · ${routing.required_approvers.length} approver(s)`);
      onRouted?.();
    } catch (e) {
      toast.error(`Routing failed: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Approval Routing Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">PO amount</span>
          <span className="font-mono">{formatINR(amount)}</span>
        </div>
        {preview.template ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Template</span>
              <span>{preview.template.name}</span>
            </div>
            {preview.tier ? (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Tier</span>
                  <Badge variant="outline">Tier {preview.tier.tier_no}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground">Required approvers</p>
                  <div className="flex flex-wrap gap-1">
                    {preview.tier.required_approvals.map((a) => (
                      <Badge key={a.role} variant="outline" className="text-[10px]">
                        {a.role} · ~{a.avg_response_hours}h
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-[11px] text-success">
                Amount below all tier thresholds · auto-approve eligible
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-warning">
            No approval template configured for PO in this entity.
          </p>
        )}
        <Button size="sm" onClick={() => void handleSend()} className="w-full">
          Send for Approval <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
