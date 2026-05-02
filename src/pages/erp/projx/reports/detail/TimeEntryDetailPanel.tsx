/**
 * TimeEntryDetailPanel.tsx — Time entry drill detail with approval audit.
 * Sprint T-Phase-1.2.6d.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import {
  TIME_ENTRY_STATUS_LABELS, TIME_ENTRY_STATUS_COLORS,
  type TimeEntry,
} from '@/types/projx/time-entry';
import type { Project } from '@/types/projx/project';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface Props {
  entry: TimeEntry;
  project: Project | null;
  onPrint: () => void;
}

export function TimeEntryDetailPanel({ entry, project, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{entry.entry_date} · {entry.person_name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {project?.project_no ?? entry.project_no} · {project?.project_name ?? ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs ${TIME_ENTRY_STATUS_COLORS[entry.status]}`}>
              {TIME_ENTRY_STATUS_LABELS[entry.status]}
            </Badge>
            {entry.is_billable && (
              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">Billable</Badge>
            )}
            <Button size="sm" variant="outline" onClick={onPrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Entry Date</div><div className="font-mono">{entry.entry_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Effective</div><div className="font-mono">{entry.effective_date ?? entry.entry_date}</div></div>
          <div><div className="text-xs text-muted-foreground">Hours</div><div className="font-mono font-semibold">{entry.hours}</div></div>
          <div><div className="text-xs text-muted-foreground">Hourly Rate</div><div className="font-mono">{fmtINR(entry.hourly_rate)}</div></div>
          <div><div className="text-xs text-muted-foreground">Total Value</div><div className="font-mono font-semibold">{fmtINR(entry.hours * entry.hourly_rate)}</div></div>
          <div><div className="text-xs text-muted-foreground">Milestone</div><div className="font-mono">{entry.milestone_id ? 'Linked' : '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Person Code</div><div className="font-mono">{entry.person_id}</div></div>
          <div><div className="text-xs text-muted-foreground">Billable</div><div>{entry.is_billable ? 'Yes' : 'No'}</div></div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Task Description</div>
          <div className="text-sm">{entry.task_description}</div>
        </div>

        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Approval Audit</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Approved By</div><div>{entry.approved_by_name ?? '—'}</div></div>
            <div><div className="text-xs text-muted-foreground">Approved At</div><div className="font-mono text-xs">{entry.approved_at ?? '—'}</div></div>
            <div><div className="text-xs text-muted-foreground">Rejection Reason</div><div>{entry.rejection_reason ?? '—'}</div></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
