/**
 * ProjectDetailPanel.tsx — Project drill detail with Q4-a milestone cascade.
 * Sprint T-Phase-1.2.6d.
 *
 * Q4-a: when drill.current?.module === 'milestone-detail', renders the
 * MilestoneDetailPanel for the cascaded milestone (in-panel cascade).
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { AuditHistoryButton } from '@/components/uth/AuditHistoryButton';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS, PROJECT_TYPE_LABELS,
  type Project,
} from '@/types/projx/project';
import {
  MILESTONE_STATUS_LABELS, MILESTONE_STATUS_COLORS,
  type ProjectMilestone,
} from '@/types/projx/project-milestone';
import type { DrillContext } from '@/hooks/useDrillDown';
import { MilestoneDetailPanel } from './MilestoneDetailPanel';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props {
  project: Project;
  milestones: ProjectMilestone[];
  drill: DrillContext;
  onPrint: () => void;
}

export function ProjectDetailPanel({ project, milestones, drill, onPrint }: Props) {
  const { entityCode } = useCardEntitlement();
  // Q4-a cascade: if a milestone crumb is at the tip of the trail, render its detail in-panel.
  const tip = drill.current;
  if (tip?.module === 'milestone-detail') {
    const ms = tip.payload as ProjectMilestone;
    return <MilestoneDetailPanel milestone={ms} project={project} onPrint={onPrint} />;
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{project.project_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {project.project_name} · {PROJECT_TYPE_LABELS[project.project_type]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${PROJECT_STATUS_COLORS[project.status]}`}>
              {PROJECT_STATUS_LABELS[project.status]}
            </Badge>
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <AuditHistoryButton
              recordId={project.id}
              entityType="project"
              entityCode={entityCode || ''}
              currentRecord={project as unknown as Record<string, unknown>}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Customer</div><div>{project.customer_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Project Manager</div><div>{project.project_manager_name ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Start Date</div><div className="font-mono">{project.start_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Target End</div><div className="font-mono">{project.target_end_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective</div><div className="font-mono">{project.effective_date ?? project.start_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Contract Value</div><div className="font-mono font-semibold">{fmtINR(project.current_contract_value)}</div></div>
          <div><div className="text-xs text-muted-foreground">Billed</div><div className="font-mono">{fmtINR(project.billed_to_date)}</div></div>
          <div><div className="text-xs text-muted-foreground">Margin %</div><div className="font-mono">{project.margin_pct.toFixed(1)}%</div></div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Milestones ({milestones.length})
          </div>
          {milestones.length === 0 ? (
            <div className="text-xs text-muted-foreground py-3">No milestones defined.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead className="text-right">Inv %</TableHead>
                  <TableHead className="text-right">Amount ₹</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map(m => (
                  <TableRow
                    key={m.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => drill.push({
                      id: `milestone-detail:${m.id}`,
                      label: m.milestone_no,
                      level: 2,
                      module: 'milestone-detail',
                      payload: m,
                    })}
                  >
                    <TableCell className="text-xs font-mono text-primary">{m.milestone_no}</TableCell>
                    <TableCell className="text-xs">{m.milestone_name}</TableCell>
                    <TableCell className="text-xs font-mono">{m.target_date}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{m.invoice_pct}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{fmtINR(m.invoice_amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${MILESTONE_STATUS_COLORS[m.status]}`}>
                        {MILESTONE_STATUS_LABELS[m.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {project.description && (
          <div>
            <div className="text-xs text-muted-foreground">Description</div>
            <div className="text-sm">{project.description}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
