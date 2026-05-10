/**
 * IRNRegister.tsx — IRN ledger / register
 * Sprint 9. Lists every IRNRecord for the entity. Bulk Generate (run all
 * pending), Retry Generate (per row), Cancel (within 24h), View signed QR.
 *
 * [JWT] GET /api/finecore/irn/list?entity={code}
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  FileText, RefreshCw, Play, X, Search, Shield, ListOrdered,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type IRNRecord, irnRecordsKey, IRN_CANCEL_REASONS, IRN_CANCELLATION_WINDOW_HOURS,
} from '@/types/irn';
import type { Voucher } from '@/types/voucher';
import type { EntityGSTConfig } from '@/types/entity-gst';
import { entityGstKey, DEFAULT_ENTITY_GST_CONFIG } from '@/types/entity-gst';
import { vouchersKey } from '@/lib/finecore-engine';
import {
  buildIRNPayload, generateIRN, cancelIRN, type IRPCredentials,
} from '@/lib/irn-engine';

interface Props { entityCode: string }

function loadOne<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

export function IRNRegisterPanel({ entityCode }: Props) {
  const [records, setRecords] = useState<IRNRecord[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | IRNRecord['status']>('all');
  const [cancelTarget, setCancelTarget] = useState<IRNRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('1');
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setRecords(loadList<IRNRecord>(irnRecordsKey(entityCode)));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const persist = useCallback((next: IRNRecord[]) => {
    // [JWT] PUT /api/finecore/irn/bulk
    localStorage.setItem(irnRecordsKey(entityCode), JSON.stringify(next));
    setRecords(next);
  }, [entityCode]);

  const credentials = useMemo<IRPCredentials>(() => {
    const gst = loadOne<EntityGSTConfig>(
      entityGstKey(entityCode),
      { ...DEFAULT_ENTITY_GST_CONFIG, entity_id: entityCode },
    );
    return {
      username: gst.irp_username,
      password: gst.irp_password,
      client_id: gst.irp_client_id,
      client_secret: gst.irp_client_secret,
      gsp_provider: gst.gsp_provider,
      test_mode: gst.irp_test_mode,
    };
  }, [entityCode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return r.voucher_no.toLowerCase().includes(q)
        || r.customer_name.toLowerCase().includes(q)
        || (r.irn ?? '').toLowerCase().includes(q);
    });
  }, [records, search, statusFilter]);

  const totals = useMemo(() => ({
    total: records.length,
    generated: records.filter(r => r.status === 'generated').length,
    pending: records.filter(r => r.status === 'pending').length,
    failed: records.filter(r => r.status === 'failed').length,
    cancelled: records.filter(r => r.status === 'cancelled').length,
  }), [records]);

  const generateOne = useCallback(async (rec: IRNRecord) => {
    const vouchers = loadList<Voucher>(vouchersKey(entityCode));
    const v = vouchers.find(x => x.id === rec.voucher_id);
    if (!v) { toast.error(`Voucher ${rec.voucher_no} not found`); return rec; }
    const supplierGst = loadOne<EntityGSTConfig>(
      entityGstKey(entityCode),
      { ...DEFAULT_ENTITY_GST_CONFIG, entity_id: entityCode },
    );
    const payload = buildIRNPayload(
      v,
      supplierGst.gstin,
      supplierGst.legal_name,
      supplierGst.address_line_1,
      supplierGst.city,
      supplierGst.pincode,
      supplierGst.state_code,
      v.party_gstin ?? '',
      v.party_name ?? '',
      v.party_name ?? '',
      '',
      '',
      v.customer_state_code ?? v.party_state_code ?? '',
    );
    const out = await generateIRN(payload, credentials, v, entityCode);
    return { ...out, id: rec.id };
  }, [entityCode, credentials]);

  const handleRetry = useCallback(async (rec: IRNRecord) => {
    setBusy(true);
    try {
      const updated = await generateOne(rec);
      const next = records.map(r => r.id === rec.id ? updated : r);
      persist(next);
      if (updated.status === 'generated') toast.success(`IRN generated for ${rec.voucher_no}`);
      else toast.error(`IRN failed: ${updated.error_message ?? 'unknown'}`);
    } finally { setBusy(false); }
  }, [generateOne, records, persist]);

  const handleBulk = useCallback(async () => {
    const targets = records.filter(r => r.status === 'pending' || r.status === 'failed');
    if (targets.length === 0) { toast.info('No pending or failed IRNs to generate'); return; }
    setBusy(true);
    try {
      const updates = await Promise.all(targets.map(generateOne));
      const map = new Map(updates.map(u => [u.id, u]));
      const next = records.map(r => map.get(r.id) ?? r);
      persist(next);
      const ok = updates.filter(u => u.status === 'generated').length;
      toast.success(`Bulk Generate: ${ok}/${updates.length} succeeded`);
    } finally { setBusy(false); }
  }, [records, generateOne, persist]);

  const submitCancel = useCallback(async () => {
    if (!cancelTarget || !cancelTarget.irn) return;
    if (cancelRemarks.trim().length < 10) {
      toast.error('Remarks must be at least 10 characters');
      return;
    }
    setBusy(true);
    try {
      const patch = await cancelIRN(cancelTarget.irn, cancelReason, cancelRemarks.trim(), credentials);
      const next = records.map(r => r.id === cancelTarget.id ? { ...r, ...patch } as IRNRecord : r);
      persist(next);
      toast.success('IRN cancelled');
      setCancelTarget(null);
      setCancelRemarks('');
    } finally { setBusy(false); }
  }, [cancelTarget, cancelReason, cancelRemarks, credentials, records, persist]);

  const isWithinCancelWindow = useCallback((rec: IRNRecord) => {
    if (!rec.ack_date) return false;
    const ageMs = Date.now() - new Date(rec.ack_date).getTime();
    return ageMs < IRN_CANCELLATION_WINDOW_HOURS * 3600 * 1000;
  }, []);

  const statusBadge = (s: IRNRecord['status']) => {
    if (s === 'generated') return <Badge className="bg-success/15 text-success border-success/30">Generated</Badge>;
    if (s === 'pending') return <Badge variant="outline">Pending</Badge>;
    if (s === 'failed') return <Badge variant="destructive">Failed</Badge>;
    return <Badge variant="secondary">Cancelled</Badge>;
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-500" /> IRN Register
          </h2>
          <p className="text-xs text-muted-foreground">
            All Invoice Reference Numbers generated for this entity. Sandbox mode if Test Mode is on.
          </p>
        </div>
        <Button data-primary size="sm" onClick={handleBulk} disabled={busy}>
          <Play className="h-3.5 w-3.5 mr-1" /> Bulk Generate
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryTile label="Total" value={totals.total} />
        <SummaryTile label="Generated" value={totals.generated} tone="success" />
        <SummaryTile label="Pending" value={totals.pending} />
        <SummaryTile label="Failed" value={totals.failed} tone="destructive" />
        <SummaryTile label="Cancelled" value={totals.cancelled} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ListOrdered className="h-4 w-4 text-teal-500" /> IRN Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Voucher / customer / IRN…"
                className="h-8 pl-7 text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: 'all' | IRNRecord['status']) => setStatusFilter(v)}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="generated">Generated</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="rounded-md border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Voucher</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>IRN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                      No IRN records found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(r => (
                  <TableRow key={r.id} className="text-xs">
                    <TableCell className="font-mono">{r.voucher_no}</TableCell>
                    <TableCell>{r.voucher_date.slice(0, 10)}</TableCell>
                    <TableCell>{r.customer_name}</TableCell>
                    <TableCell className="font-mono text-right">
                      ₹{r.total_invoice_value.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] max-w-[180px] truncate">
                      {r.irn ?? '—'}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {(r.status === 'pending' || r.status === 'failed') && (
                          <Button
                            variant="outline" size="sm"
                            disabled={busy}
                            onClick={() => handleRetry(r)}
                            className="h-7 text-[10px]"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry Generate
                          </Button>
                        )}
                        {r.status === 'generated' && isWithinCancelWindow(r) && (
                          <Button
                            variant="outline" size="sm"
                            onClick={() => { setCancelTarget(r); setCancelRemarks(''); setCancelReason('1'); }}
                            className="h-7 text-[10px] text-destructive"
                          >
                            <X className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!cancelTarget} onOpenChange={o => !o && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" /> Cancel IRN
            </DialogTitle>
            <DialogDescription>
              Cancellation can only be done within {IRN_CANCELLATION_WINDOW_HOURS} hours of generation.
              This is logged at the GSTN portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Reason</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IRN_CANCEL_REASONS.map(r => (
                    <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Remarks (min 10 chars)</Label>
              <Textarea
                value={cancelRemarks}
                onChange={e => setCancelRemarks(e.target.value)}
                rows={3}
                placeholder="Why is this IRN being cancelled?"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {cancelRemarks.trim().length}/10 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>Close</Button>
            <Button data-primary variant="destructive" onClick={submitCancel}
              disabled={busy || cancelRemarks.trim().length < 10}>
              Cancel IRN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'destructive' }) {
  const toneClass =
    tone === 'success' ? 'text-success'
    : tone === 'destructive' ? 'text-destructive'
    : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold font-mono ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
