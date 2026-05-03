/**
 * @file        ApprovalTimelinePanel.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block C2 · OOB-7 FULL
 * @purpose     Reusable Approval Timeline preview · used by all 3 indent forms.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { APPROVAL_MATRIX } from '@/types/requisition-common';

interface Props {
  totalEstimatedValue: number;
  forceFinanceGate?: boolean; // CapitalIndent always tier-3
  className?: string;
}

const tierFor = (value: number): 1 | 2 | 3 => {
  for (const t of APPROVAL_MATRIX) {
    if (value >= t.min_value && value <= t.max_value) return t.tier;
  }
  return 3;
};

export function ApprovalTimelinePanel({ totalEstimatedValue, forceFinanceGate, className }: Props): JSX.Element {
  const activeTier = forceFinanceGate ? 3 : tierFor(totalEstimatedValue);

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Approval Timeline Preview</p>
            <p className="text-xs text-muted-foreground">
              Tier <span className="font-mono">{activeTier}</span> · routing based on total estimated value
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            ETA ~{APPROVAL_MATRIX.find(t => t.tier === activeTier)?.estimated_hours ?? 0}h
          </Badge>
        </div>

        <div className="space-y-2">
          {APPROVAL_MATRIX.map(t => {
            const isActive = t.tier === activeTier;
            const isPast = t.tier < activeTier;
            return (
              <div
                key={t.tier}
                className={`flex items-start gap-3 rounded-md border p-2 ${
                  isActive ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="mt-0.5">
                  {isPast ? <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    : isActive ? <AlertCircle className="h-4 w-4 text-primary" />
                    : <Clock className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">
                      Tier {t.tier} · {t.approver_label}
                    </p>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {t.threshold_label}
                    </span>
                  </div>
                  <ul className="mt-1 text-[11px] text-muted-foreground space-y-0.5">
                    {t.required_approvals.map(step => (
                      <li key={`${t.tier}-${step.role}`} className="font-mono">
                        {step.role} · ~{step.avg_response_hours}h avg
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {forceFinanceGate && (
          <p className="text-[11px] text-warning">
            Capital Indent · Finance gate is mandatory regardless of value (D-218).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
