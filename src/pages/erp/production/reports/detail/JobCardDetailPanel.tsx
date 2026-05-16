/**
 * JobCardDetailPanel.tsx — UPRA-2 Phase A · T1-1
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { JobCard } from '@/types/job-card';

interface Props { card: JobCard; onPrint: () => void }

export function JobCardDetailPanel({ card, onPrint }: Props) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="font-mono">{card.doc_no}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {card.production_order_no} · {card.employee_name} ({card.employee_code})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize text-[10px]">{card.status.replace('_', ' ')}</Badge>
            <Button size="sm" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-1" /> Print
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Machine</div><div className="font-mono">{card.machine_id}</div></div>
          <div><div className="text-xs text-muted-foreground">Shift</div><div className="font-mono">{card.shift_name}</div></div>
          <div><div className="text-xs text-muted-foreground">Sched Start</div><div className="font-mono">{card.scheduled_start.slice(0, 16).replace('T', ' ')}</div></div>
          <div><div className="text-xs text-muted-foreground">Sched End</div><div className="font-mono">{card.scheduled_end.slice(0, 16).replace('T', ' ')}</div></div>
          <div><div className="text-xs text-muted-foreground">Actual Start</div><div className="font-mono">{card.actual_start?.slice(0, 16).replace('T', ' ') ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">Actual End</div><div className="font-mono">{card.actual_end?.slice(0, 16).replace('T', ' ') ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">FY</div><div className="font-mono">{card.fiscal_year_id ?? '—'}</div></div>
          <div><div className="text-xs text-muted-foreground">UOM</div><div className="font-mono">{card.uom}</div></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm border-t pt-3">
          <div><div className="text-xs text-muted-foreground">Planned</div><div className="font-mono">{card.planned_qty}</div></div>
          <div><div className="text-xs text-muted-foreground">Produced</div><div className="font-mono">{card.produced_qty}</div></div>
          <div><div className="text-xs text-muted-foreground">Rejected</div><div className="font-mono">{card.rejected_qty}</div></div>
          <div><div className="text-xs text-muted-foreground">Rework</div><div className="font-mono">{card.rework_qty}</div></div>
          <div><div className="text-xs text-muted-foreground">Wastage</div><div className="font-mono">{card.wastage_qty} ({card.wastage_reason ?? '—'})</div></div>
        </div>
        {card.status_history.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status Timeline</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {card.status_history.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs font-mono">{e.changed_at.slice(0, 16).replace('T', ' ')}</TableCell>
                    <TableCell className="text-xs">{e.from_status ?? '—'} → {e.to_status}</TableCell>
                    <TableCell className="text-xs">{e.changed_by_name}</TableCell>
                    <TableCell className="text-xs">{e.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {card.remarks && (
          <div className="border-t pt-3">
            <div className="text-xs text-muted-foreground">Remarks</div>
            <div className="text-sm">{card.remarks}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
