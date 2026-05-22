/**
 * @file        ApproverDashboardPanel.tsx
 * @purpose     D-NEW-GK · Lists POs awaiting approval · approver actions
 * @sprint      T-Phase-2.HK-5 · Block A
 * @reuses      approval-matrix-engine · po-management-engine PUBLIC API
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listPosAwaitingApproval,
  routeForApproval,
  recordApproval,
  listApprovalsForPO,
  isPoFullyApproved,
} from '@/lib/approval-matrix-engine';
import { transitionPoStatus } from '@/lib/po-management-engine';
import type { PurchaseOrderRecord } from '@/types/po';

const formatINR = (n: number): string =>
  '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

export function ApproverDashboardPanel(): JSX.Element {
  const entityCode = useEntityCode();
  const [pos, setPos] = useState<PurchaseOrderRecord[]>([]);
  const [role, setRole] = useState<string>('HOD');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setPos(listPosAwaitingApproval(entityCode));
  }, [entityCode, tick]);

  const rows = useMemo(
    () =>
      pos.map((po) => {
        const routing = routeForApproval(entityCode, po.id);
        const records = listApprovalsForPO(entityCode, po.id);
        const fullyApproved = isPoFullyApproved(entityCode, po.id);
        return { po, routing, records, fullyApproved };
      }),
    [pos, entityCode],
  );

  const handleApprove = async (poId: string, notes: string): Promise<void> => {
    recordApproval(entityCode, poId, role, notes);
    toast.success(`Recorded ${role} approval for PO ${poId}`);
    if (isPoFullyApproved(entityCode, poId)) {
      try {
        await transitionPoStatus(poId, entityCode, 'approved', 'mock-user');
        toast.success('PO fully approved · status moved to approved');
      } catch (e) {
        toast.error(`Status transition failed: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }
    setTick((t) => t + 1);
  };

  return (
    <div className="space-y-4 p-4">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Approver Dashboard
          </CardTitle>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Your role</label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-8 w-32 font-mono"
            />
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No POs awaiting approval.
            </p>
          ) : (
            <div className="space-y-3">
              {rows.map(({ po, routing, records, fullyApproved }) => {
                const alreadyApproved = records.some((r) => r.approver_role === role);
                return (
                  <div
                    key={po.id}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-sm">{po.po_no}</p>
                        <p className="text-xs text-muted-foreground">
                          {po.vendor_name} · {formatINR(po.total_basic_value)}
                        </p>
                      </div>
                      <Badge variant={fullyApproved ? 'default' : 'outline'}>
                        {fullyApproved ? (
                          <><CheckCircle2 className="h-3 w-3 mr-1" /> Ready</>
                        ) : (
                          <><AlertCircle className="h-3 w-3 mr-1" /> Awaiting</>
                        )}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{routing.rationale}</p>
                    <div className="flex flex-wrap gap-1">
                      {routing.required_approvers.map((a) => {
                        const done = records.some((r) => r.approver_role === a.role);
                        return (
                          <Badge
                            key={`${po.id}-${a.role}`}
                            variant={done ? 'default' : 'outline'}
                            className="text-[10px]"
                          >
                            {a.role} {done ? '✓' : a.is_mandatory ? '(req)' : '(opt)'}
                          </Badge>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => void handleApprove(po.id, '')}
                        disabled={alreadyApproved}
                      >
                        {alreadyApproved ? `${role} approved` : `Approve as ${role}`}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
