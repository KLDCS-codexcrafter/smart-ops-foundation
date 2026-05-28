/**
 * @file        src/pages/erp/comply360/tax-gst/IMSPanelPage.tsx
 * @purpose     NATIVE Comply360 IMS (Invoice Management System) action panel · 3-state buyer workflow
 * @sprint      Sprint 70b · T-Phase-5.A.1.2-PASS-B · Block 4 · Q-LOCK-3-P1-D
 * @decisions   D-S69-1 (100% native) · DP-S70-4 · DP-S70-6 (IMS 3-state model: accept/reject/keep_pending)
 * @iso         Reliability · Auditability
 * @disciplines FR-7 · FR-13 · FR-19 (reads Pass A IMS engine) · FR-91 honest disclosure
 * @reads-from  src/lib/comply360-gst-aggregator-engine.ts (aggregateInwardSupplies)
 *              src/lib/comply360-ims-engine.ts (loadIMSActions · recordIMSAction · bulkAcceptIMS · getIMSPendingCount)
 *              src/hooks/useEntityGSTINs.ts · src/hooks/useEntityCode.ts
 */
import { useMemo, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCcw, Inbox, CheckCheck, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  aggregateInwardSupplies,
  type CrossCardSupply,
} from '@/lib/comply360-gst-aggregator-engine';
import {
  loadIMSActions,
  recordIMSAction,
  bulkAcceptIMS,
  type IMSAction,
  type IMSStatus,
} from '@/lib/comply360-ims-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityGSTINs } from '@/hooks/useEntityGSTINs';

function defaultPeriod(): string {
  const d = new Date();
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${String(prev.getMonth() + 1).padStart(2, '0')}-${prev.getFullYear()}`;
}

function inr(n: number): string {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function IMSPanelPage(): JSX.Element {
  const { entityId } = useEntityCode();
  const { gstins, activeGSTIN, setActiveGSTIN } = useEntityGSTINs(entityId);
  const [returnPeriod, setReturnPeriod] = useState<string>(defaultPeriod());
  const [refreshTick, setRefreshTick] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const supplies = useMemo<CrossCardSupply[]>(() => {
    if (!entityId || entityId === 'all' || !activeGSTIN) return [];
    return aggregateInwardSupplies({
      entity_id: entityId,
      gstin: activeGSTIN,
      fy: 'FY25-26',
      return_period: returnPeriod,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, activeGSTIN, returnPeriod, refreshTick]);

  const actions: IMSAction[] = useMemo(() => {
    if (!entityId || entityId === 'all') return [];
    return loadIMSActions(entityId, returnPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, returnPeriod, refreshTick]);

  const statusMap = useMemo(() => {
    const m = new Map<string, IMSStatus>();
    for (const a of actions) m.set(a.source_invoice_ref, a.status);
    return m;
  }, [actions]);

  const counts = useMemo(() => {
    let pending = 0, accepted = 0, rejected = 0, kept = 0;
    for (const s of supplies) {
      const st = statusMap.get(s.source_ref) ?? 'pending';
      if (st === 'accepted') accepted++;
      else if (st === 'rejected') rejected++;
      else if (st === 'kept_pending') kept++;
      else pending++;
    }
    return { pending, accepted, rejected, kept };
  }, [supplies, statusMap]);

  const periodOptions = useMemo(() => {
    const out: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push(`${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`);
    }
    return out;
  }, []);

  const handleAction = useCallback((s: CrossCardSupply, status: IMSStatus): void => {
    if (!entityId || !activeGSTIN) return;
    recordIMSAction({
      id: `ims-${s.source_ref}`,
      entity_id: entityId,
      gstin: activeGSTIN,
      return_period: returnPeriod,
      source_invoice_ref: s.source_ref,
      supplier_gstin: s.gstin_supplier ?? '',
      taxable_value: s.taxable_value,
      igst: s.igst,
      cgst: s.cgst,
      sgst: s.sgst,
      status,
    });
    setRefreshTick(t => t + 1);
    toast.success(`Invoice ${s.invoice_no} marked ${status.replace('_', ' ')}`);
  }, [entityId, activeGSTIN, returnPeriod]);

  const handleBulkAccept = useCallback((): void => {
    if (!entityId || selected.size === 0) return;
    const refs = supplies
      .filter(s => selected.has(s.source_ref))
      .map(s => s.source_ref);
    bulkAcceptIMS(entityId, returnPeriod, refs);
    // Ensure rows that had no prior IMS action get persisted via recordIMSAction
    for (const s of supplies.filter(x => selected.has(x.source_ref))) {
      if (!statusMap.has(s.source_ref)) {
        recordIMSAction({
          id: `ims-${s.source_ref}`,
          entity_id: entityId,
          gstin: activeGSTIN,
          return_period: returnPeriod,
          source_invoice_ref: s.source_ref,
          supplier_gstin: s.gstin_supplier ?? '',
          taxable_value: s.taxable_value,
          igst: s.igst,
          cgst: s.cgst,
          sgst: s.sgst,
          status: 'accepted',
        });
      }
    }
    setSelected(new Set());
    setRefreshTick(t => t + 1);
    toast.success(`${refs.length} invoices accepted in bulk`);
  }, [entityId, activeGSTIN, returnPeriod, supplies, selected, statusMap]);

  const toggleSelect = (ref: string): void => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref); else next.add(ref);
      return next;
    });
  };

  const toggleSelectAll = (): void => {
    if (selected.size === supplies.length) setSelected(new Set());
    else setSelected(new Set(supplies.map(s => s.source_ref)));
  };

  const statusBadge = (status: IMSStatus): JSX.Element => {
    if (status === 'accepted') return <Badge className="bg-emerald-600 hover:bg-emerald-700">Accepted</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
    if (status === 'kept_pending') return <Badge variant="secondary">Kept Pending</Badge>;
    return <Badge variant="outline">Pending</Badge>;
  };

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Inbox className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to use IMS.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">IMS · Invoice Management System</h1>
          <p className="text-muted-foreground text-sm">Pre-filing buyer actions · accept · reject · keep pending</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={activeGSTIN} onValueChange={setActiveGSTIN}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select GSTIN" /></SelectTrigger>
            <SelectContent>
              {gstins.length === 0 && <SelectItem value="__none__" disabled>No GSTINs registered</SelectItem>}
              {gstins.map(g => (
                <SelectItem key={g.gstin} value={g.gstin}>
                  <span className="font-mono">{g.gstin}</span> · {g.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={returnPeriod} onValueChange={setReturnPeriod}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periodOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setRefreshTick(t => t + 1)}>
            <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Pending</div>
          <div className="text-2xl font-mono font-semibold mt-1">{counts.pending}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Accepted</div>
          <div className="text-2xl font-mono font-semibold mt-1 text-emerald-500">{counts.accepted}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Rejected</div>
          <div className="text-2xl font-mono font-semibold mt-1 text-destructive">{counts.rejected}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground uppercase">Kept Pending</div>
          <div className="text-2xl font-mono font-semibold mt-1 text-amber-500">{counts.kept}</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-muted-foreground">{selected.size} selected</div>
          <Button size="sm" onClick={handleBulkAccept} disabled={selected.size === 0}>
            <CheckCheck className="h-4 w-4 mr-1" /> Bulk Accept ({selected.size})
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={supplies.length > 0 && selected.size === supplies.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Supplier GSTIN</TableHead>
              <TableHead>Invoice No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Taxable</TableHead>
              <TableHead className="text-right">Total Tax</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supplies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No inward supplies for <span className="font-mono">{activeGSTIN || '—'}</span> in {returnPeriod}.
                </TableCell>
              </TableRow>
            ) : supplies.map(s => {
              const status = statusMap.get(s.source_ref) ?? 'pending';
              const tax = s.igst + s.cgst + s.sgst + s.cess;
              return (
                <TableRow key={s.source_ref}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(s.source_ref)}
                      onCheckedChange={() => toggleSelect(s.source_ref)}
                    />
                  </TableCell>
                  <TableCell className="font-mono">{s.gstin_supplier ?? '—'}</TableCell>
                  <TableCell className="font-mono">{s.invoice_no}</TableCell>
                  <TableCell className="font-mono">{s.invoice_date}</TableCell>
                  <TableCell className="text-right font-mono">{inr(s.taxable_value)}</TableCell>
                  <TableCell className="text-right font-mono">{inr(tax)}</TableCell>
                  <TableCell>{statusBadge(status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleAction(s, 'accepted')} title="Accept">
                        <CheckCheck className="h-4 w-4 text-emerald-500" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleAction(s, 'rejected')} title="Reject">
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleAction(s, 'kept_pending')} title="Keep pending">
                        <Clock className="h-4 w-4 text-amber-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
