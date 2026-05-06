/**
 * SchedulingBoard.tsx — 3-PlantOps-pre-3b · D-610 · Q38=ALL + Q41=c + Q42=c + Q43=a
 * Polymorphic Gantt board · view-only / click-to-reschedule / drag-drop stub (disabled).
 */
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Eye, Move, Lock, Calendar, AlertTriangle } from 'lucide-react';
import { ViewModeSelector } from '@/components/ViewModeSelector';
import { useFactoryContext } from '@/hooks/useFactoryContext';
import { useMachines } from '@/hooks/useMachines';
import { useProductionPlans } from '@/hooks/useProductionPlans';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useJobCards } from '@/hooks/useJobCards';
import { buildGanttData, rescheduleProductionOrder } from '@/lib/scheduling-engine';
import type { GanttBar, SchedulingViewMode } from '@/types/scheduling-snapshot';
import type { ProductionOrder } from '@/types/production-order';

export function SchedulingBoardPanel(): JSX.Element {
  const { selectedFactoryId } = useFactoryContext();
  const { machines } = useMachines();
  const { allPlans } = useProductionPlans();
  const { allOrders } = useProductionOrders();
  const { allJobCards } = useJobCards();

  const [viewMode, setViewMode] = useState<SchedulingViewMode>('view_only');
  const [factoryId, setFactoryId] = useState<string>(selectedFactoryId ?? '');
  const [dateFrom, setDateFrom] = useState<string>(() => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState<string>(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));

  const [editPO, setEditPO] = useState<ProductionOrder | null>(null);
  const [editStart, setEditStart] = useState<string>('');
  const [editEnd, setEditEnd] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');

  const bars = useMemo(() => buildGanttData({
    factory_id: factoryId || null,
    date_from: dateFrom, date_to: dateTo,
    plans: allPlans, pos: allOrders, job_cards: allJobCards, machines,
  }), [factoryId, dateFrom, dateTo, allPlans, allOrders, allJobCards, machines]);

  const handleViewModeChange = (m: SchedulingViewMode): void => {
    if (m === 'drag_drop_stub') {
      toast.info('Drag-Drop is coming in Phase 2 · click-to-reschedule available now');
      return;
    }
    setViewMode(m);
  };

  const handleBarClick = (bar: GanttBar): void => {
    if (viewMode === 'view_only') {
      toast.info(`${bar.source_doc_no} · ${bar.label} · ${bar.status}`);
      return;
    }
    if (viewMode === 'click_to_reschedule') {
      if (bar.is_locked) {
        toast.error(`${bar.source_doc_no} is locked (${bar.status})`);
        return;
      }
      if (bar.type !== 'production_order') {
        toast.info('Plan reschedule with cascade · select a PO bar to demo PO reschedule');
        return;
      }
      const po = allOrders.find(p => p.id === bar.source_id) ?? null;
      if (po) {
        setEditPO(po);
        setEditStart(po.start_date.slice(0, 10));
        setEditEnd(po.target_end_date.slice(0, 10));
        setEditReason('');
      }
    }
  };

  const handleSaveReschedule = (): void => {
    if (!editPO) return;
    if (!editReason.trim()) { toast.error('Reason required for audit trail'); return; }
    const result = rescheduleProductionOrder({
      po: editPO,
      new_start_date: editStart,
      new_target_end_date: editEnd,
      user: { id: 'mock-user', name: 'Operator' },
      reason: editReason,
      parent_plans: allPlans,
      pos: allOrders,
    });
    if (!result.success) { result.warnings.forEach(w => toast.error(w)); return; }
    result.warnings.forEach(w => toast.warning(w));
    result.conflicts.forEach(c => toast.warning(c));
    toast.success(`Rescheduled · audit ${result.audit_event_id}`);
    setEditPO(null);
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Scheduling Board (Plans + POs Gantt)
            </CardTitle>
            <ViewModeSelector
              value={viewMode}
              onChange={handleViewModeChange}
              storageKey="scheduling_view_mode"
              label="Mode:"
              options={[
                { id: 'view_only', label: 'View Only', tooltip: 'Read-only Gantt with click-to-drill', icon: Eye },
                { id: 'click_to_reschedule', label: 'Click to Reschedule', tooltip: 'Click bar → edit dates · smart cascade', icon: Move },
                { id: 'drag_drop_stub', label: 'Drag-Drop · Phase 2', tooltip: 'Coming Phase 2 · click-to-reschedule available now', icon: Lock },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Factory ID</Label>
              <Input value={factoryId} onChange={e => setFactoryId(e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="font-mono" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Gantt</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Doc</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Machine</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Warnings</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bars.map(bar => (
                <TableRow
                  key={bar.id}
                  onClick={() => handleBarClick(bar)}
                  className="cursor-pointer hover:bg-muted/40"
                >
                  <TableCell>
                    <Badge variant={bar.type === 'plan' ? 'outline' : 'default'}>{bar.type}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{bar.source_doc_no}</TableCell>
                  <TableCell className="text-xs">{bar.label}</TableCell>
                  <TableCell className="text-xs">{bar.machine_label}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {new Date(bar.start_ms).toISOString().slice(0, 10)} → {new Date(bar.end_ms).toISOString().slice(0, 10)} ({bar.duration_days}d)
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block w-3 h-3 rounded-sm mr-1 ${bar.status_color}`} />
                    <span className="text-xs">{bar.status}</span>
                    {bar.is_locked && <Lock className="inline h-3 w-3 ml-1 text-muted-foreground" />}
                  </TableCell>
                  <TableCell className="text-xs text-warning">
                    {bar.warnings.length > 0 && (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> {bar.warnings.join('; ')}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {bars.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No bars in selected window</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editPO} onOpenChange={open => { if (!open) setEditPO(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule {editPO?.doc_no}</DialogTitle>
            <DialogDescription>
              Smart cascade · period-mismatch + machine conflicts will be flagged on save.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">New Start</Label>
              <Input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label className="text-xs">New Target End</Label>
              <Input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label className="text-xs">Reason (audit)</Label>
              <Input value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="e.g. customer push-out" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPO(null)}>Cancel</Button>
            <Button onClick={handleSaveReschedule}>Save Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SchedulingBoardPanel;
