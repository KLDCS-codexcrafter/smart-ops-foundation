/**
 * @file     ApprovalsPendingPage.tsx — Web register for pending approvals
 * @sprint   T-Phase-2.7-b · Q4-c
 * @purpose  Desktop counterpart to MobileApprovalsPage · same data source
 *           (loadAllPendingApprovals) · approve/reject inline.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, CheckCircle2, XCircle, Clock, IndianRupee, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getCurrentUser } from '@/lib/auth-helpers';
import {
  loadAllPendingApprovals,
  patchPendingApprovalRecord,
  type PendingApproval,
  type PendingApprovalRecordType,
} from '@/lib/pending-approvals-loader';

const FALLBACK_ROLES = ['stores_manager', 'sales_head', 'finance_head'];

function daysSince(iso: string): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

export default function ApprovalsPendingPage() {
  const { entityCode } = useEntityCode();
  const user = getCurrentUser();
  const userRoles = useMemo<string[]>(() => {
    const u = user as unknown as { roles?: string[] };
    return Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : FALLBACK_ROLES;
  }, [user]);

  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterParty, setFilterParty] = useState('');
  const [filterMin, setFilterMin] = useState('');
  const [filterMax, setFilterMax] = useState('');
  const [rejectFor, setRejectFor] = useState<PendingApproval | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const refresh = useCallback(() => {
    if (entityCode) setApprovals(loadAllPendingApprovals(entityCode, userRoles));
  }, [entityCode, userRoles]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    return approvals.filter(a => {
      if (filterType !== 'all' && a.record_type !== filterType) return false;
      if (filterParty && !a.party_name.toLowerCase().includes(filterParty.toLowerCase())) return false;
      const min = Number(filterMin) || 0;
      const max = Number(filterMax) || Number.POSITIVE_INFINITY;
      if (a.total_amount < min || a.total_amount > max) return false;
      return true;
    });
  }, [approvals, filterType, filterParty, filterMin, filterMax]);

  const kpis = useMemo(() => {
    const totalValue = filtered.reduce((s, a) => s + a.total_amount, 0);
    const types = new Set(filtered.map(a => a.record_type)).size;
    const avgWait = filtered.length === 0
      ? 0
      : filtered.reduce((s, a) => s + daysSince(a.submitted_at), 0) / filtered.length;
    return { count: filtered.length, totalValue, types, avgWait };
  }, [filtered]);

  const onApprove = async (a: PendingApproval) => {
    setBusy(a.record_id);
    try {
      const ok = patchPendingApprovalRecord(entityCode, a.record_type, a.record_id, {
        status: 'approved',
        approved_at: new Date().toISOString(),
        approver_id: user.id,
        approver_name: user.displayName,
      });
      if (ok) {
        toast.success(`${a.record_no} approved`);
        setApprovals(prev => prev.filter(p => p.record_id !== a.record_id));
      } else {
        toast.error('Failed to approve · record not found');
      }
    } finally { setBusy(null); }
  };

  const submitReject = () => {
    if (!rejectFor) return;
    const trimmed = rejectReason.trim();
    if (trimmed.length < 10) {
      toast.error('Reject reason must be at least 10 characters');
      return;
    }
    setBusy(rejectFor.record_id);
    try {
      const ok = patchPendingApprovalRecord(entityCode, rejectFor.record_type, rejectFor.record_id, {
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        approver_id: user.id,
        approver_name: user.displayName,
        rejection_reason: trimmed,
      });
      if (ok) {
        toast.success(`${rejectFor.record_no} rejected`);
        setApprovals(prev => prev.filter(p => p.record_id !== rejectFor.record_id));
      } else {
        toast.error('Failed to reject · record not found');
      }
      setRejectFor(null);
      setRejectReason('');
    } finally { setBusy(null); }
  };

  const recordTypes: PendingApprovalRecordType[] = [
    'grn', 'rtv', 'cycle_count', 'consumption_entry', 'quotation', 'supply_request_memo',
    'invoice_memo', 'sample_outward_memo', 'demo_outward_memo', 'delivery_memo', 'secondary_sales',
  ];

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approvals · Pending</h1>
          <p className="text-sm text-muted-foreground">Records submitted for approval across all transaction types.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Pending</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono">{kpis.count}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><IndianRupee className="h-4 w-4" />Total Value</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono">₹{kpis.totalValue.toLocaleString('en-IN')}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><Layers className="h-4 w-4" />Types</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono">{kpis.types}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs flex items-center gap-2"><Clock className="h-4 w-4" />Avg Wait (days)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono">{kpis.avgWait.toFixed(1)}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {recordTypes.map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Party</Label>
            <Input value={filterParty} onChange={e => setFilterParty(e.target.value)} placeholder="Search party…" />
          </div>
          <div>
            <Label className="text-xs">Min Amount</Label>
            <Input value={filterMin} onChange={e => setFilterMin(e.target.value)} placeholder="0" inputMode="numeric" />
          </div>
          <div>
            <Label className="text-xs">Max Amount</Label>
            <Input value={filterMax} onChange={e => setFilterMax(e.target.value)} placeholder="∞" inputMode="numeric" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record No</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Wait (d)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    No pending approvals
                  </TableCell>
                </TableRow>
              ) : filtered.map(a => (
                <TableRow key={`${a.record_type}-${a.record_id}`}>
                  <TableCell className="font-mono text-xs">{a.record_no}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{a.record_type.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>{a.party_name}</TableCell>
                  <TableCell className="text-right font-mono">₹{a.total_amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-xs">{a.submitted_at?.slice(0, 10) || '—'}</TableCell>
                  <TableCell className="text-right font-mono">{daysSince(a.submitted_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground"
                        onClick={() => onApprove(a)} disabled={busy === a.record_id}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="destructive"
                        onClick={() => { setRejectFor(a); setRejectReason(''); }}
                        disabled={busy === a.record_id}>
                        <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!rejectFor} onOpenChange={(o) => { if (!o) { setRejectFor(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejectFor?.record_no}</DialogTitle>
            <DialogDescription>Provide a reason (minimum 10 characters).</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="w-reject-reason">Reason</Label>
            <Textarea id="w-reject-reason" value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4} />
            <p className="text-xs text-muted-foreground font-mono">{rejectReason.trim().length} / 10 chars</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectFor(null); setRejectReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={submitReject} disabled={rejectReason.trim().length < 10}>
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
