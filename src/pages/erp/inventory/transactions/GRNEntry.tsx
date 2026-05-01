/**
 * GRNEntry.tsx — Goods Receipt Note transaction
 * Sprint T-Phase-1.2.1 · Inventory Hub · Tier 1 Card #2 sub-sprint 1/3
 *
 * D-127: lives in inventory/ NOT finecore/. GRN is an authorization document, not a voucher.
 * Stock balance updated in localStorage on Post.
 * [JWT] POST /api/inventory/grn/:id/post
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowDownToLine, Plus, Trash2, AlertTriangle, IndianRupee, FileText, Eye, Printer, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { useGodowns } from '@/hooks/useGodowns';
import { useSAMPersons } from '@/hooks/useSAMPersons';
import { useProjectCentres } from '@/hooks/useProjectCentres';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { useItemPreferredLocation } from '@/hooks/useItemPreferredLocation';
import { generateDocNo } from '@/lib/finecore-engine';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';
import { dMul, dAdd, round2 } from '@/lib/decimal-helpers';
import {
  grnsKey, stockBalanceKey,
  GRN_STATUS_LABELS, GRN_STATUS_COLORS,
  type GRN, type GRNLine, type GRNStatus, type GRNQCResult, type StockBalanceEntry,
} from '@/types/grn';
import { DEPARTMENT_LABELS, DEPARTMENT_BADGE_COLORS } from '@/types/godown';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

const todayISO = () => new Date().toISOString().slice(0, 10);

function loadJson<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveJson<T>(key: string, v: T[]): void {
  // [JWT] PATCH /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(v));
}

interface FormHeader {
  vendor_id: string;
  vendor_name: string;
  vendor_invoice_no: string;
  vendor_invoice_date: string;
  po_no: string;
  receipt_date: string;
  vehicle_no: string;
  lr_no: string;
  received_by_id: string;
  received_by_name: string;
  godown_id: string;
  godown_name: string;
  project_centre_id: string | null;
  narration: string;
}

const BLANK_HEADER: FormHeader = {
  vendor_id: '', vendor_name: '',
  vendor_invoice_no: '', vendor_invoice_date: '',
  po_no: '',
  receipt_date: todayISO(),
  vehicle_no: '', lr_no: '',
  received_by_id: '', received_by_name: '',
  godown_id: '', godown_name: '',
  project_centre_id: null,
  narration: '',
};

interface FormLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  item_type: string;
  uom: string;
  ordered_qty: number;
  received_qty: number;
  accepted_qty: number;
  unit_rate: number;
  batch_no: string;
  serial_nos: string;
  heat_no: string;
  bin_id: string;
  bin_code: string;
  bin_id_source: 'preferred' | 'manual' | '';
  qc_result: GRNQCResult;
  qc_notes: string;
}

const blankLine = (): FormLine => ({
  id: `gln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  item_id: '', item_code: '', item_name: '', item_type: '', uom: '',
  ordered_qty: 0, received_qty: 0, accepted_qty: 0, unit_rate: 0,
  batch_no: '', serial_nos: '', heat_no: '',
  bin_id: '', bin_code: '', bin_id_source: '',
  qc_result: 'pending', qc_notes: '',
});

interface VendorSeed { id: string; name?: string; vendor_name?: string }
function loadVendors(): VendorSeed[] {
  try {
    // [JWT] GET /api/masters/vendors
    return JSON.parse(localStorage.getItem('erp_group_vendor_master') || '[]');
  } catch { return []; }
}

export function GRNEntryPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const { items } = useInventoryItems();
  const { godowns } = useGodowns();
  const { persons } = useSAMPersons(safeEntity);
  const { centres } = useProjectCentres(safeEntity);
  const vendors = useMemo(loadVendors, []);
  const [grns, setGrns] = useState<GRN[]>(() => loadJson<GRN>(grnsKey(safeEntity)));

  const [view, setView] = useState<'list' | 'form'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | GRNStatus>('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [readonly, setReadonly] = useState(false);
  const [header, setHeader] = useState<FormHeader>(BLANK_HEADER);
  const [lines, setLines] = useState<FormLine[]>([]);
  const [showLineSheet, setShowLineSheet] = useState(false);
  const [draftLine, setDraftLine] = useState<FormLine>(blankLine());

  const totals = useMemo(() => {
    let qty = 0, value = 0;
    let discrepancy = false;
    for (const l of lines) {
      qty = dAdd(qty, l.accepted_qty);
      value = dAdd(value, dMul(l.accepted_qty, l.unit_rate));
      if (l.ordered_qty > 0 && l.received_qty !== l.ordered_qty) discrepancy = true;
    }
    return { qty: round2(qty), value: round2(value), discrepancy };
  }, [lines]);

  const filtered = useMemo(() => {
    return grns
      .filter(g => statusFilter === 'all' || g.status === statusFilter)
      .filter(g => !search ||
        g.grn_no.toLowerCase().includes(search.toLowerCase()) ||
        g.vendor_name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [grns, statusFilter, search]);

  const kpis = useMemo(() => {
    const today = todayISO();
    const monthStart = today.slice(0, 7);
    return {
      draft: grns.filter(g => g.status === 'draft').length,
      receivedToday: grns.filter(g => g.receipt_date === today && g.status !== 'cancelled').length,
      discrepancies: grns.filter(g => g.has_discrepancy && g.status !== 'cancelled').length,
      postedThisMonth: grns.filter(g => g.status === 'posted' && g.posted_at?.startsWith(monthStart)).length,
    };
  }, [grns]);

  const startNew = () => {
    setEditingId(null); setReadonly(false);
    setHeader(BLANK_HEADER); setLines([]);
    setView('form');
  };

  const openExisting = (g: GRN, ro: boolean) => {
    setEditingId(g.id); setReadonly(ro);
    setHeader({
      vendor_id: g.vendor_id, vendor_name: g.vendor_name,
      vendor_invoice_no: g.vendor_invoice_no ?? '',
      vendor_invoice_date: g.vendor_invoice_date ?? '',
      po_no: g.po_no ?? '',
      receipt_date: g.receipt_date,
      vehicle_no: g.vehicle_no ?? '', lr_no: g.lr_no ?? '',
      received_by_id: g.received_by_id, received_by_name: g.received_by_name,
      godown_id: g.godown_id, godown_name: g.godown_name,
      project_centre_id: g.project_centre_id,
      narration: g.narration,
    });
    setLines(g.lines.map(l => ({
      id: l.id, item_id: l.item_id, item_code: l.item_code,
      item_name: l.item_name, item_type: l.item_type, uom: l.uom,
      ordered_qty: l.ordered_qty, received_qty: l.received_qty,
      accepted_qty: l.accepted_qty, unit_rate: l.unit_rate,
      batch_no: l.batch_no ?? '', serial_nos: (l.serial_nos ?? []).join('\n'),
      heat_no: l.heat_no ?? '',
      qc_result: l.qc_result ?? 'pending', qc_notes: l.qc_notes,
    })));
    setView('form');
  };

  const addLine = () => { setDraftLine(blankLine()); setShowLineSheet(true); };

  const commitLine = () => {
    if (!draftLine.item_id) { toast.error('Select an item'); return; }
    if (draftLine.received_qty <= 0) { toast.error('Received qty must be > 0'); return; }
    if (draftLine.accepted_qty > draftLine.received_qty) {
      toast.error('Accepted qty cannot exceed received qty'); return;
    }
    if ((draftLine.qc_result === 'fail' || draftLine.qc_result === 'partial') && !draftLine.qc_notes.trim()) {
      toast.error('QC notes required for fail/partial'); return;
    }
    setLines(prev => {
      const idx = prev.findIndex(l => l.id === draftLine.id);
      if (idx === -1) return [...prev, draftLine];
      const u = [...prev]; u[idx] = draftLine; return u;
    });
    setShowLineSheet(false);
  };

  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.id !== id));

  const validate = (): string | null => {
    if (!header.vendor_id) return 'Vendor is required';
    if (!header.godown_id) return 'Receiving godown is required';
    if (!header.received_by_id) return 'Received by is required';
    if (lines.length === 0) return 'Add at least one line';
    if (isPeriodLocked(header.receipt_date, safeEntity)) {
      return periodLockMessage(header.receipt_date, safeEntity) ?? 'Period is locked';
    }
    return null;
  };

  const buildGRN = (status: GRNStatus, existing?: GRN): GRN => {
    const now = new Date().toISOString();
    const builtLines: GRNLine[] = lines.map(l => ({
      id: l.id,
      item_id: l.item_id, item_code: l.item_code,
      item_name: l.item_name, item_type: l.item_type, uom: l.uom,
      ordered_qty: l.ordered_qty, received_qty: l.received_qty,
      accepted_qty: l.accepted_qty,
      rejected_qty: round2(l.received_qty - l.accepted_qty),
      unit_rate: l.unit_rate,
      line_total: round2(dMul(l.accepted_qty, l.unit_rate)),
      batch_no: l.batch_no || null,
      serial_nos: l.serial_nos.split('\n').map(s => s.trim()).filter(Boolean),
      heat_no: l.heat_no || null,
      bin_id: null,
      qc_result: l.qc_result,
      qc_notes: l.qc_notes,
    }));
    return {
      id: existing?.id ?? `grn-${Date.now()}`,
      entity_id: safeEntity,
      grn_no: existing?.grn_no ?? generateDocNo('GRN', safeEntity),
      status,
      po_id: null, po_no: header.po_no || null,
      vendor_id: header.vendor_id, vendor_name: header.vendor_name,
      vendor_invoice_no: header.vendor_invoice_no || null,
      vendor_invoice_date: header.vendor_invoice_date || null,
      receipt_date: header.receipt_date,
      vehicle_no: header.vehicle_no || null, lr_no: header.lr_no || null,
      received_by_id: header.received_by_id, received_by_name: header.received_by_name,
      godown_id: header.godown_id, godown_name: header.godown_name,
      project_centre_id: header.project_centre_id,
      lines: builtLines,
      total_qty: totals.qty,
      total_value: totals.value,
      has_discrepancy: totals.discrepancy,
      narration: header.narration,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      posted_at: status === 'posted' ? now : (existing?.posted_at ?? null),
      cancelled_at: existing?.cancelled_at ?? null,
      cancellation_reason: existing?.cancellation_reason ?? null,
    };
  };

  const persist = (next: GRN[]) => {
    setGrns(next);
    saveJson(grnsKey(safeEntity), next);
  };

  const updateStockBalance = (g: GRN) => {
    const balances = loadJson<StockBalanceEntry>(stockBalanceKey(safeEntity));
    const now = new Date().toISOString();
    for (const ln of g.lines) {
      if (ln.accepted_qty <= 0) continue;
      const idx = balances.findIndex(b => b.item_id === ln.item_id && b.godown_id === g.godown_id);
      if (idx === -1) {
        balances.push({
          item_id: ln.item_id, item_code: ln.item_code, item_name: ln.item_name,
          godown_id: g.godown_id, godown_name: g.godown_name,
          qty: ln.accepted_qty,
          value: round2(dMul(ln.accepted_qty, ln.unit_rate)),
          weighted_avg_rate: ln.unit_rate,
          last_grn_id: g.id, last_grn_no: g.grn_no,
          updated_at: now,
        });
      } else {
        const ex = balances[idx];
        const newQty = round2(dAdd(ex.qty, ln.accepted_qty));
        const newValue = round2(dAdd(ex.value, dMul(ln.accepted_qty, ln.unit_rate)));
        balances[idx] = {
          ...ex, qty: newQty, value: newValue,
          weighted_avg_rate: newQty > 0 ? round2(newValue / newQty) : ln.unit_rate,
          last_grn_id: g.id, last_grn_no: g.grn_no, updated_at: now,
        };
      }
    }
    saveJson(stockBalanceKey(safeEntity), balances);
  };

  /**
   * Sprint T-Phase-1.2.3 · Auto-create batch & heat-number masters on GRN post.
   * Idempotent: skips if same batch_no / heat_no already exists for the item.
   * [JWT] POST /api/inventory/batches and /api/inventory/heat-numbers
   */
  const autoCreateTraceabilityMasters = (g: GRN) => {
    const nowIso = new Date().toISOString();
    const batchesKey = 'erp_batches';
    const batches = loadJson<{ id: string; batch_number: string; item_id?: string | null }>(batchesKey);
    let batchesChanged = false;
    const heatKey = 'erp_heat_numbers';
    const heats = loadJson<{ id: string; heat_no: string; item_id?: string | null }>(heatKey);
    let heatsChanged = false;
    const serialsKey = 'erp_serial_numbers';
    const serials = loadJson<{ id: string; serial_number: string; item_id?: string | null }>(serialsKey);
    let serialsChanged = false;

    for (const ln of g.lines) {
      if (ln.accepted_qty <= 0) continue;
      if (ln.batch_no && !batches.some(b => b.batch_number === ln.batch_no && b.item_id === ln.item_id)) {
        batches.unshift({
          id: `batch-${Date.now()}-${ln.id}`,
          batch_number: ln.batch_no,
          item_id: ln.item_id,
          item_name: ln.item_name,
          quantity: ln.accepted_qty,
          available_quantity: ln.accepted_qty,
          supplier_name: g.vendor_name,
          supplier_invoice_no: g.vendor_invoice_no,
          unit_cost: ln.unit_rate,
          total_cost: round2(dMul(ln.accepted_qty, ln.unit_rate)),
          qc_status: ln.qc_result === 'pass' ? 'passed' : ln.qc_result === 'fail' ? 'failed' : 'pending',
          status: 'active',
          godown_name: g.godown_name,
          created_at: nowIso,
          updated_at: nowIso,
        } as never);
        batchesChanged = true;
      }
      if (ln.heat_no && !heats.some(h => h.heat_no === ln.heat_no && h.item_id === ln.item_id)) {
        heats.unshift({
          id: `heat-${Date.now()}-${ln.id}`,
          heat_no: ln.heat_no,
          item_id: ln.item_id,
          item_name: ln.item_name,
          item_code: ln.item_code,
          received_qty: ln.accepted_qty,
          balance_qty: ln.accepted_qty,
          source_grn_id: g.id,
          source_grn_no: g.grn_no,
          vendor_id: g.vendor_id,
          vendor_name: g.vendor_name,
          received_date: g.receipt_date,
          status: 'active',
          created_at: nowIso,
          updated_at: nowIso,
        } as never);
        heatsChanged = true;
      }
      if (ln.serial_nos && ln.serial_nos.length > 0) {
        for (const sn of ln.serial_nos) {
          if (!sn) continue;
          if (serials.some(s => s.serial_number === sn && s.item_id === ln.item_id)) continue;
          serials.unshift({
            id: `sn-${Date.now()}-${ln.id}-${sn}`,
            serial_number: sn,
            item_id: ln.item_id,
            item_name: ln.item_name,
            status: 'available',
            condition: 'new',
            purchase_date: g.receipt_date,
            purchase_price: ln.unit_rate,
            supplier_name: g.vendor_name,
            supplier_invoice_no: g.vendor_invoice_no,
            current_location: g.godown_name,
            grn_reference: g.grn_no,
            created_at: nowIso,
            updated_at: nowIso,
          } as never);
          serialsChanged = true;
        }
      }
    }
    if (batchesChanged) saveJson(batchesKey, batches);
    if (heatsChanged) saveJson(heatKey, heats);
    if (serialsChanged) saveJson(serialsKey, serials);
  };

  const handleSave = (target: GRNStatus) => {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (target === 'posted') {
      if (lines.some(l => l.qc_result === 'pending')) {
        toast.error('All lines must have a QC result before posting'); return;
      }
    }
    const existing = editingId ? grns.find(g => g.id === editingId) : undefined;
    const built = buildGRN(target, existing);
    const next = existing
      ? grns.map(g => g.id === existing.id ? built : g)
      : [built, ...grns];
    persist(next);
    if (target === 'posted') {
      updateStockBalance(built);
      autoCreateTraceabilityMasters(built);
      toast.success(`GRN ${built.grn_no} posted · stock credited to ${built.godown_name}`);
    } else {
      toast.success(`GRN ${built.grn_no} saved as ${GRN_STATUS_LABELS[target]}`);
    }
    setView('list');
  };

  if (view === 'list') {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ArrowDownToLine className="h-6 w-6 text-cyan-500" />
              GRN Entry
            </h1>
            <p className="text-sm text-muted-foreground">Goods Receipt Note · physical receiving</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={startNew}>
            <Plus className="h-4 w-4" /> New GRN
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>Draft</CardDescription>
            <CardTitle className="text-2xl font-mono">{kpis.draft}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Received Today</CardDescription>
            <CardTitle className="text-2xl font-mono text-blue-600">{kpis.receivedToday}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Discrepancies</CardDescription>
            <CardTitle className="text-2xl font-mono text-amber-600">{kpis.discrepancies}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Posted This Month</CardDescription>
            <CardTitle className="text-2xl font-mono text-emerald-600">{kpis.postedThisMonth}</CardTitle></CardHeader></Card>
        </div>

        <div className="flex items-center gap-3">
          <Input className="max-w-sm h-9" placeholder="Search GRN no / vendor..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'all' | GRNStatus)}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {(Object.keys(GRN_STATUS_LABELS) as GRNStatus[]).map(s =>
                <SelectItem key={s} value={s}>{GRN_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
            {['GRN No', 'Vendor', 'Date', 'Godown', 'Lines', 'Total ₹', 'Status', ''].map(h =>
              <TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No GRNs yet — create one to record a receipt</p>
              </TableCell></TableRow>
            ) : filtered.map(g => (
              <TableRow key={g.id} className="group">
                <TableCell><code className="text-xs font-mono">{g.grn_no}</code></TableCell>
                <TableCell className="text-sm">{g.vendor_name}</TableCell>
                <TableCell className="text-xs">{g.receipt_date}</TableCell>
                <TableCell className="text-xs">{g.godown_name}</TableCell>
                <TableCell className="text-xs font-mono">{g.lines.length}</TableCell>
                <TableCell className="text-xs font-mono">{fmtINR(g.total_value)}</TableCell>
                <TableCell>
                  <Badge className={`text-[10px] ${GRN_STATUS_COLORS[g.status]}`}>
                    {GRN_STATUS_LABELS[g.status]}
                  </Badge>
                  {g.has_discrepancy && (
                    <Badge variant="outline" className="ml-1 text-[10px] border-amber-500/40 text-amber-700">
                      <AlertTriangle className="h-3 w-3 mr-0.5" />Disc
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => openExisting(g, true)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {g.status !== 'posted' && g.status !== 'cancelled' && (
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => openExisting(g, false)}>
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></CardContent></Card>
      </div>
    );
  }

  // Form mode
  const selGodown = godowns.find(g => g.id === header.godown_id);
  const showProject = !!selGodown && (selGodown.is_virtual || selGodown.department_code === 'site');

  return (
    <div className="max-w-5xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{editingId ? 'GRN Details' : 'New GRN'}</h1>
          <p className="text-xs text-muted-foreground">
            {readonly ? 'View only' : 'Record physical receipt against vendor / PO'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setView('list')}>← Back to List</Button>
      </div>

      {totals.discrepancy && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs">
          <AlertTriangle className="h-4 w-4" />
          Quantity discrepancy detected on one or more lines (received ≠ ordered).
        </div>
      )}

      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5"><Label>Vendor *</Label>
            <Select disabled={readonly} value={header.vendor_id}
              onValueChange={v => {
                const ve = vendors.find(x => x.id === v);
                setHeader(h => ({ ...h, vendor_id: v, vendor_name: ve?.name ?? ve?.vendor_name ?? '' }));
              }}>
              <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.name ?? v.vendor_name ?? v.id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>PO Reference</Label>
            <Input disabled={readonly} placeholder="PO number (optional)" value={header.po_no}
              onChange={e => setHeader(h => ({ ...h, po_no: e.target.value }))} />
          </div>
          <div className="space-y-1.5"><Label>Receipt Date *</Label>
            <Input disabled={readonly} type="date" value={header.receipt_date}
              onChange={e => setHeader(h => ({ ...h, receipt_date: e.target.value }))} />
          </div>
          <div className="space-y-1.5"><Label>Vehicle No</Label>
            <Input disabled={readonly} value={header.vehicle_no}
              onChange={e => setHeader(h => ({ ...h, vehicle_no: e.target.value.toUpperCase() }))} />
          </div>
          <div className="space-y-1.5"><Label>LR No</Label>
            <Input disabled={readonly} value={header.lr_no}
              onChange={e => setHeader(h => ({ ...h, lr_no: e.target.value }))} />
          </div>
          <div className="space-y-1.5"><Label>Received By *</Label>
            <Select disabled={readonly} value={header.received_by_id}
              onValueChange={v => {
                const p = persons.find(x => x.id === v);
                setHeader(h => ({ ...h, received_by_id: v, received_by_name: p?.display_name ?? '' }));
              }}>
              <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
              <SelectContent>
                {persons.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 col-span-2"><Label>Receiving Godown *</Label>
            <Select disabled={readonly} value={header.godown_id}
              onValueChange={v => {
                const g = godowns.find(x => x.id === v);
                setHeader(h => ({ ...h, godown_id: v, godown_name: g?.name ?? '' }));
              }}>
              <SelectTrigger><SelectValue placeholder="Select godown" /></SelectTrigger>
              <SelectContent>
                {godowns.filter(g => g.status === 'active').map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.code} — {g.name}
                    {g.department_code ? ` · ${DEPARTMENT_LABELS[g.department_code]}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selGodown?.department_code && (
              <Badge className={`text-[10px] mt-1 ${DEPARTMENT_BADGE_COLORS[selGodown.department_code]}`}>
                {DEPARTMENT_LABELS[selGodown.department_code]}
              </Badge>
            )}
          </div>
          {showProject && (
            <div className="space-y-1.5"><Label>Project Centre</Label>
              <Select disabled={readonly} value={header.project_centre_id ?? ''}
                onValueChange={v => setHeader(h => ({ ...h, project_centre_id: v || null }))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {centres.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5"><Label>Vendor Invoice No</Label>
            <Input disabled={readonly} value={header.vendor_invoice_no}
              onChange={e => setHeader(h => ({ ...h, vendor_invoice_no: e.target.value }))} />
          </div>
          <div className="space-y-1.5"><Label>Vendor Invoice Date</Label>
            <Input disabled={readonly} type="date" value={header.vendor_invoice_date}
              onChange={e => setHeader(h => ({ ...h, vendor_invoice_date: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">Lines ({lines.length})</CardTitle>
          {!readonly && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={addLine}>
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-muted/40">
              {['Item', 'Ordered', 'Received', 'Accepted', 'Rate', 'Total', 'QC', ''].map(h =>
                <TableHead key={h} className="text-xs uppercase">{h}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                  No lines yet
                </TableCell></TableRow>
              ) : lines.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">
                    <div className="font-medium">{l.item_name}</div>
                    {l.heat_no && <div className="text-[10px] text-muted-foreground">Heat: {l.heat_no}</div>}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{l.ordered_qty || '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{l.received_qty}</TableCell>
                  <TableCell className="text-xs font-mono">{l.accepted_qty}</TableCell>
                  <TableCell className="text-xs font-mono">{fmtINR(l.unit_rate)}</TableCell>
                  <TableCell className="text-xs font-mono">{fmtINR(round2(dMul(l.accepted_qty, l.unit_rate)))}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{l.qc_result}</Badge></TableCell>
                  <TableCell>
                    {!readonly && (
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => removeLine(l.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-1.5"><Label>Narration</Label>
        <Textarea disabled={readonly} rows={2} value={header.narration}
          onChange={e => setHeader(h => ({ ...h, narration: e.target.value }))} />
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border">
        <div className="text-sm">
          <p className="text-muted-foreground text-xs">Total Value</p>
          <p className="font-mono text-lg font-semibold flex items-center gap-1">
            <IndianRupee className="h-4 w-4" />{fmtINR(totals.value).slice(1)}
          </p>
        </div>
        {!readonly && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleSave('draft')}>Save Draft</Button>
            <Button variant="outline" onClick={() => handleSave('received')}>Mark Received</Button>
            <Button variant="outline" onClick={() => handleSave('inspected')}>Mark Inspected</Button>
            <Button onClick={() => handleSave('posted')}>Post GRN</Button>
          </div>
        )}
      </div>

      {/* Line sheet */}
      <Sheet open={showLineSheet} onOpenChange={setShowLineSheet}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add Line Item</SheetTitle>
            <SheetDescription>Item details · QC result required before post</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5"><Label>Item *</Label>
              <Select value={draftLine.item_id}
                onValueChange={v => {
                  const it = items.find(x => x.id === v);
                  if (!it) return;
                  setDraftLine(l => ({
                    ...l, item_id: it.id, item_code: it.code,
                    item_name: it.name, item_type: it.item_type,
                    uom: it.primary_uom_symbol ?? 'NOS',
                  }));
                }}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {items.map(i => <SelectItem key={i.id} value={i.id}>{i.code} — {i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Ordered Qty</Label>
                <Input type="number" value={draftLine.ordered_qty || ''}
                  onChange={e => setDraftLine(l => ({ ...l, ordered_qty: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5"><Label>Received Qty *</Label>
                <Input type="number" value={draftLine.received_qty || ''}
                  onChange={e => {
                    const q = parseFloat(e.target.value) || 0;
                    setDraftLine(l => ({ ...l, received_qty: q, accepted_qty: q }));
                  }} />
              </div>
              <div className="space-y-1.5"><Label>Accepted Qty</Label>
                <Input type="number" value={draftLine.accepted_qty || ''}
                  onChange={e => setDraftLine(l => ({ ...l, accepted_qty: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-1.5"><Label>Unit Rate (₹)</Label>
                <Input type="number" value={draftLine.unit_rate || ''}
                  onChange={e => setDraftLine(l => ({ ...l, unit_rate: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            {draftLine.item_type === 'Raw Material' && (
              <div className="space-y-1.5"><Label>Heat / Cast No</Label>
                <Input placeholder="e.g. H-2024-0891 · leave blank if not applicable"
                  value={draftLine.heat_no}
                  onChange={e => setDraftLine(l => ({ ...l, heat_no: e.target.value }))} />
                <p className="text-[10px] text-muted-foreground">
                  Mill heat / cast number — links to mill test certificate (Sinha-critical for steel).
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Batch No</Label>
                <Input value={draftLine.batch_no}
                  onChange={e => setDraftLine(l => ({ ...l, batch_no: e.target.value }))} />
              </div>
              <div className="space-y-1.5"><Label>QC Result</Label>
                <Select value={draftLine.qc_result}
                  onValueChange={v => setDraftLine(l => ({ ...l, qc_result: v as GRNQCResult }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Serial Nos (one per line)</Label>
              <Textarea rows={2} value={draftLine.serial_nos}
                onChange={e => setDraftLine(l => ({ ...l, serial_nos: e.target.value }))} />
            </div>
            <div className="space-y-1.5"><Label>QC Notes</Label>
              <Textarea rows={2} value={draftLine.qc_notes}
                onChange={e => setDraftLine(l => ({ ...l, qc_notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLineSheet(false)}>Cancel</Button>
              <Button onClick={commitLine}>Add Line</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
