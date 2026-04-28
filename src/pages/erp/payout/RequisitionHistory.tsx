/**
 * @file     RequisitionHistory.tsx
 * @purpose  Filterable audit-trail report for all Payment Requisitions.
 * @sprint   T-T8.4-Requisition-Universal · Group B Sprint B.4
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { History, FileText, RefreshCw } from 'lucide-react';
import {
  PAYMENT_TYPE_LABELS, REQUISITION_STATUS_COLORS,
  type PaymentRequisition, type RequisitionStatus, type PaymentRequestType,
} from '@/types/payment-requisition';
import { listRequisitions } from '@/lib/payment-requisition-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const STATUS_OPTIONS: Array<RequisitionStatus | 'all'> = [
  'all', 'draft', 'pending_dept_head', 'pending_accounts', 'approved', 'paid', 'rejected', 'on_hold',
];

export default function RequisitionHistory() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequisitionStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<PaymentRequestType | 'all'>('all');
  const [selected, setSelected] = useState<PaymentRequisition | null>(null);

  // `tick` is an intentional cache-buster — bumping it must re-run listRequisitions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const all = useMemo(() => listRequisitions(entityCode), [entityCode, tick]);

  const filtered = useMemo(() => {
    return all
      .filter(r => statusFilter === 'all' || r.status === statusFilter)
      .filter(r => typeFilter === 'all' || r.request_type === typeFilter)
      .filter(r => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          r.id.toLowerCase().includes(q) ||
          r.purpose.toLowerCase().includes(q) ||
          r.requested_by_name.toLowerCase().includes(q) ||
          (r.linked_payment_voucher_no ?? '').toLowerCase().includes(q) ||
          (r.vendor_name ?? '').toLowerCase().includes(q) ||
          (r.employee_name ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [all, search, statusFilter, typeFilter]);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <History className="h-5 w-5 text-violet-500" /> Requisition History
          </h1>
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {all.length} requisitions · full audit trail per record
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTick(t => t + 1)}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-3 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Input placeholder="Search id · purpose · vendor · voucher…" value={search}
              onChange={e => setSearch(e.target.value)} className="h-8 max-w-xs text-xs" />
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as RequisitionStatus | 'all')}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={v => setTypeFilter(v as PaymentRequestType | 'all')}>
              <SelectTrigger className="h-8 w-56 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All types</SelectItem>
                {(Object.keys(PAYMENT_TYPE_LABELS) as PaymentRequestType[]).map(t => (
                  <SelectItem key={t} value={t} className="text-xs">{PAYMENT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Req ID</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Purpose</TableHead>
                  <TableHead className="text-xs">Requester</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Voucher</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                  <TableHead className="text-xs"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8 text-xs">No requisitions match the filters</TableCell></TableRow>
                )}
                {filtered.map(req => (
                  <TableRow key={req.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(req)}>
                    <TableCell className="font-mono text-[10px]">{req.id.slice(0, 18)}…</TableCell>
                    <TableCell className="text-xs">{PAYMENT_TYPE_LABELS[req.request_type]}</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹{req.amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-xs max-w-48 truncate">{req.purpose}</TableCell>
                    <TableCell className="text-xs">{req.requested_by_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={REQUISITION_STATUS_COLORS[req.status] + ' text-[10px]'}>
                        {req.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{req.linked_payment_voucher_no ?? '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{req.created_at.slice(0, 10)}</TableCell>
                    <TableCell><FileText className="h-3.5 w-3.5 text-muted-foreground" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected ? PAYMENT_TYPE_LABELS[selected.request_type] : ''} · ₹{selected?.amount.toLocaleString('en-IN')}
            </DialogTitle>
            <DialogDescription className="font-mono text-[10px]">{selected?.id}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className={REQUISITION_STATUS_COLORS[selected.status]}>{selected.status}</Badge></div>
                <div><span className="text-muted-foreground">Created:</span> {selected.created_at.slice(0, 19).replace('T', ' ')}</div>
                <div><span className="text-muted-foreground">Department:</span> {selected.department_name}</div>
                <div><span className="text-muted-foreground">Requester:</span> {selected.requested_by_name}</div>
                {selected.vendor_name && <div className="col-span-2"><span className="text-muted-foreground">Vendor:</span> {selected.vendor_name}</div>}
                {selected.employee_name && <div className="col-span-2"><span className="text-muted-foreground">Employee:</span> {selected.employee_name}</div>}
                <div className="col-span-2"><span className="text-muted-foreground">Purpose:</span> {selected.purpose}</div>
                {selected.linked_payment_voucher_no && (
                  <div className="col-span-2"><span className="text-muted-foreground">Voucher:</span> <span className="font-mono">{selected.linked_payment_voucher_no}</span></div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold">Audit trail ({selected.approval_chain.length})</p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {selected.approval_chain.map((e, i) => (
                    <div key={`${selected.id}-h-${i}`} className="text-[10px] border-l-2 border-violet-500/30 pl-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">L{e.level} · {e.action.toUpperCase()} · {e.approver_role}</span>
                        <span className="font-mono text-muted-foreground">{e.timestamp.slice(0, 19).replace('T', ' ')}</span>
                      </div>
                      <p className="text-muted-foreground">{e.approver_name}{e.comment ? ` — ${e.comment}` : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
