/**
 * @file        src/pages/erp/servicedesk/repair-routing/RepairRouteList.tsx
 * @purpose     Repair Routes register · 4 route types · TallyWARM Workflow 1
 * @sprint      T-Phase-1.C.1c · Block E.1
 * @iso        Usability + Functional Suitability
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  listRepairRoutes,
  markRouteInRepair,
  markReturnedFromRepair,
  markRouteRejected,
} from '@/lib/servicedesk-engine';
import type { RepairRouteType, RepairRouteStatus } from '@/types/repair-route';

const ACTOR = 'desk_user';

const ROUTES: RepairRouteType[] = ['in_house', 'manufacturer', 'third_party', 'service_centre'];
const STATUSES: RepairRouteStatus[] = ['routed', 'in_repair', 'returned', 'rejected'];

export function RepairRouteList(): JSX.Element {
  const [routeFilter, setRouteFilter] = useState<RepairRouteType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<RepairRouteStatus | 'all'>('all');
  const [refresh, setRefresh] = useState(0);

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnId, setReturnId] = useState<string | null>(null);
  const [returnCost, setReturnCost] = useState('0');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const routes = useMemo(
    () => listRepairRoutes({
      route_type: routeFilter === 'all' ? undefined : routeFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [routeFilter, statusFilter, refresh],
  );

  const bump = (): void => setRefresh((r) => r + 1);

  const handleInRepair = (id: string): void => {
    markRouteInRepair(id, ACTOR); toast.success('Marked in repair'); bump();
  };
  const handleReturn = (): void => {
    if (!returnId) return;
    markReturnedFromRepair(returnId, ACTOR, Math.round(Number(returnCost) * 100));
    setReturnOpen(false); setReturnId(null); setReturnCost('0'); toast.success('Marked returned'); bump();
  };
  const handleReject = (): void => {
    if (!rejectId) return;
    markRouteRejected(rejectId, ACTOR, rejectReason);
    setRejectOpen(false); setRejectId(null); setRejectReason(''); toast.success('Marked rejected'); bump();
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Repair Routes</h1>
        <p className="text-sm text-muted-foreground">{routes.length} route(s)</p>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select value={routeFilter} onValueChange={(v) => setRouteFilter(v as RepairRouteType | 'all')}>
          <SelectTrigger><SelectValue placeholder="Route type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Route Types</SelectItem>
            {ROUTES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RepairRouteStatus | 'all')}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-0 overflow-hidden">
        {routes.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No repair routes.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3 font-medium">Ticket</th>
                <th className="p-3 font-medium">Route Type</th>
                <th className="p-3 font-medium">Partner</th>
                <th className="p-3 font-medium">Out</th>
                <th className="p-3 font-medium">In</th>
                <th className="p-3 font-medium">TAT (d)</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{r.ticket_id}</td>
                  <td className="p-3"><Badge variant="secondary">{r.route_type}</Badge></td>
                  <td className="p-3">{r.partner_name}</td>
                  <td className="p-3 font-mono text-xs">{r.repair_out_at.slice(0, 10)}</td>
                  <td className="p-3 font-mono text-xs">{r.repair_in_at?.slice(0, 10) ?? '—'}</td>
                  <td className="p-3 font-mono text-xs">{r.turnaround_days ?? '—'}</td>
                  <td className="p-3"><Badge variant="outline">{r.status}</Badge></td>
                  <td className="p-3 text-right space-x-1">
                    {r.status === 'routed' && (
                      <Button size="sm" variant="ghost" onClick={() => handleInRepair(r.id)}>In Repair</Button>
                    )}
                    {(r.status === 'routed' || r.status === 'in_repair') && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => { setReturnId(r.id); setReturnOpen(true); }}>Return</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setRejectId(r.id); setRejectOpen(true); }}>Reject</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Returned</DialogTitle></DialogHeader>
          <div><Label>Final Cost ₹</Label><Input type="number" value={returnCost} onChange={(e) => setReturnCost(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
            <Button onClick={handleReturn}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Rejected</DialogTitle></DialogHeader>
          <div><Label>Reason</Label><Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button onClick={handleReject}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
