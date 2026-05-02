/**
 * MilestoneDetailPanel.tsx — Milestone drill detail.
 * Sprint T-Phase-1.2.6d.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuditHistoryButton } from '@/components/uth/AuditHistoryButton';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useMemo } from 'react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import {
  MILESTONE_STATUS_LABELS, MILESTONE_STATUS_COLORS,
  type ProjectMilestone,
} from '@/types/projx/project-milestone';
import { timeEntriesKey, type TimeEntry } from '@/types/projx/time-entry';
import type { Project } from '@/types/projx/project';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props {
  milestone: ProjectMilestone;
  project: Project | null;
  onPrint: () => void;
}

export function MilestoneDetailPanel({ milestone, project, onPrint }: Props) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';

  const linkedEntries = useMemo<TimeEntry[]>(() => {
    try {
      // [JWT] GET /api/projx/time-entries/:entityCode
      const all = JSON.parse(localStorage.getItem(timeEntriesKey(safeEntity)) || '[]') as TimeEntry[];
      return all.filter(e => e.milestone_id === milestone.id);
    } catch { return []; }
  }, [safeEntity, milestone.id]);

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{milestone.milestone_no} · {milestone.milestone_name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {project?.project_no ?? '—'} · {project?.project_name ?? ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${MILESTONE_STATUS_COLORS[milestone.status]}`}>
              {MILESTONE_STATUS_LABELS[milestone.status]}
            </Badge>
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <AuditHistoryButton
              recordId={milestone.id}
              entityType="project_milestone"
              entityCode={entityCode || ''}
              currentRecord={milestone as unknown as Record<string, unknown>}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Target Date</div><div className="font-mono">{milestone.target_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Completed</div><div className="font-mono">{milestone.actual_completion_date ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective</div><div className="font-mono">{milestone.effective_date ?? milestone.target_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Invoice %</div><div className="font-mono">{milestone.invoice_pct}%</div></div>
          <div><div className="text-xs text-muted-foreground">Invoice Amount</div><div className="font-mono font-semibold">{fmtINR(milestone.invoice_amount)}</div></div>
          <div><div className="text-xs text-muted-foreground">Billed</div><div>{milestone.is_billed ? 'Yes' : 'No'}</div></div>
          <div><div className="text-xs text-muted-foreground">Invoice Voucher</div><div className="font-mono">{milestone.invoice_voucher_no ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Blocks</div><div className="font-mono text-xs">{milestone.blocks_milestone_ids.length || '—'}</div></div>
        </div>

        {milestone.description && (
          <div>
            <div className="text-xs text-muted-foreground">Description</div>
            <div className="text-sm">{milestone.description}</div>
          </div>
        )}

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Linked Time Entries ({linkedEntries.length})
          </div>
          {linkedEntries.length === 0 ? (
            <div className="text-xs text-muted-foreground py-3">No time entries linked to this milestone.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linkedEntries.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs font-mono">{e.entry_date}</TableCell>
                    <TableCell className="text-xs">{e.person_name}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{e.hours}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{e.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
