/**
 * TransporterInvoiceInbox.tsx — Sprint 15c-1
 * MODULE ID: dh-t-transporter-invoice
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Upload, Settings, Eye, Play, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import {
  type TransporterInvoice, type TransporterInvoiceLine, type WorkflowMode,
  transporterInvoicesKey,
} from '@/types/transporter-invoice';
import {
  type MatchLine, type TenantToleranceDefault,
  matchLinesKey, tenantTolerancesKey, DEFAULT_TENANT_TOLERANCE,
} from '@/types/freight-reconciliation';
import type { Voucher } from '@/types/voucher';
import type { TransporterRateCard } from '@/types/transporter-rate';
import { transporterRateCardsKey } from '@/types/transporter-rate';
import { vouchersKey } from '@/lib/finecore-engine';
import {
  reconcileInvoice, summarizeMatches, type PayerCustomerLite,
} from '@/lib/freight-match-engine';
import { InvoiceUploadWizard } from './InvoiceUploadWizard';

interface LogisticLite { id: string; partyName: string; logisticType: string }
interface CustomerLite { id: string; isHeadOffice?: boolean; freightTerm?: string }

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; }
  catch { return []; }
}
function nowISO() { return new Date().toISOString(); }

function loadTenantTolerance(entity: string): TenantToleranceDefault {
  try {
    const raw = localStorage.getItem(tenantTolerancesKey(entity));
    if (raw) return JSON.parse(raw) as TenantToleranceDefault;
  } catch { /* ignore */ }
  const seeded = { ...DEFAULT_TENANT_TOLERANCE, updated_at: nowISO() };
  try {
    // [JWT] POST /api/dispatch/tolerance/seed
    localStorage.setItem(tenantTolerancesKey(entity), JSON.stringify(seeded));
  } catch { /* ignore */ }
  return seeded;
}

function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusBadge(s: TransporterInvoice['status']) {
  const map: Record<string, string> = {
    uploaded: 'bg-blue-500/15 text-blue-600',
    reconciling: 'bg-amber-500/15 text-amber-600',
    reconciled: 'bg-emerald-500/15 text-emerald-600',
    approved: 'bg-emerald-500/15 text-emerald-600',
    partial_approved: 'bg-amber-500/15 text-amber-600',
    disputed: 'bg-red-500/15 text-red-600',
    paid: 'bg-emerald-500/15 text-emerald-600',
    void: 'bg-muted text-muted-foreground',
  };
  return <Badge variant="outline" className={map[s] ?? ''}>{s}</Badge>;
}

function emptyLine(invId: string, n: number): TransporterInvoiceLine {
  return {
    id: `til-${Date.now()}-${n}`, invoice_id: invId, line_no: n,
    lr_no: '', lr_date: null,
    transporter_declared_weight_kg: 0, transporter_declared_rate: 0,
    transporter_declared_amount: 0,
    fuel_surcharge: 0, fov: 0, statistical: 0, cod: 0, demurrage: 0, oda: 0,
    gst_amount: 0, total: 0,
  };
}

export function TransporterInvoiceInboxPanel() {
  const { entityCode, userId } = useCardEntitlement();
  const [invoices, setInvoices] = useState<TransporterInvoice[]>([]);
  const [matches, setMatches] = useState<MatchLine[]>([]);
  const [logistics, setLogistics] = useState<LogisticLite[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [rateCards, setRateCards] = useState<TransporterRateCard[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [tenantTol, setTenantTol] = useState<TenantToleranceDefault>(() =>
    loadTenantTolerance(entityCode));

  const [filterTransporter, setFilterTransporter] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [showUpload, setShowUpload] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showTolerance, setShowTolerance] = useState(false);
  const [viewing, setViewing] = useState<TransporterInvoice | null>(null);

  const refresh = useCallback(() => {
    setInvoices(ls<TransporterInvoice>(transporterInvoicesKey(entityCode)));
    setMatches(ls<MatchLine>(matchLinesKey(entityCode)));
    setLogistics(ls<LogisticLite>('erp_group_logistic_master'));
    setVouchers(ls<Voucher>(vouchersKey(entityCode)));
    setRateCards(ls<TransporterRateCard>(transporterRateCardsKey(entityCode)));
    setCustomers(ls<CustomerLite>('erp_group_customer_master'));
    setTenantTol(loadTenantTolerance(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return invoices.filter(inv => {
      if (filterTransporter !== 'all' && inv.logistic_id !== filterTransporter) return false;
      if (filterStatus !== 'all' && inv.status !== filterStatus) return false;
      if (needle && !inv.invoice_no.toLowerCase().includes(needle) &&
        !inv.logistic_name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [invoices, filterTransporter, filterStatus, search]);

  const kpis = useMemo(() => {
    const pending = invoices.filter(i => i.status === 'uploaded').length;
    const disputedInvIds = new Set(
      matches.filter(m => m.auto_decision === 'dispute' || m.final_decision === 'dispute')
        .map(m => m.invoice_id),
    );
    const overBilledRs = matches
      .filter(m => m.status === 'over_billed' || m.status === 'ghost_lr')
      .reduce((s, m) => s + Math.max(0, m.variance_amount), 0);
    return { pending, disputed: disputedInvIds.size, overBilledRs };
  }, [invoices, matches]);

  const handleReconcile = useCallback((inv: TransporterInvoice) => {
    const result = reconcileInvoice({
      invoice: inv,
      dln_vouchers: vouchers,
      rate_cards: rateCards,
      tenant_tolerance: tenantTol,
      customer_master: customers as PayerCustomerLite[],
    });
    const allMatches = ls<MatchLine>(matchLinesKey(entityCode))
      .filter(m => m.invoice_id !== inv.id)
      .concat(result);
    try {
      // [JWT] POST /api/dispatch/match-lines/reconcile
      localStorage.setItem(matchLinesKey(entityCode), JSON.stringify(allMatches));
    } catch { /* ignore */ }

    const summary = summarizeMatches(result);
    const allInv = ls<TransporterInvoice>(transporterInvoicesKey(entityCode));
    const updated = allInv.map(i => i.id === inv.id ? {
      ...i, status: 'reconciled' as const,
      reconciled_at: nowISO(), reconciled_by: userId, updated_at: nowISO(),
    } : i);
    try {
      // [JWT] PATCH /api/dispatch/invoices/:id
      localStorage.setItem(transporterInvoicesKey(entityCode), JSON.stringify(updated));
    } catch { /* ignore */ }

    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'dispatch-hub', moduleId: 'dh-t-transporter-invoice',
      action: 'master_save', refType: 'transporter-invoice', refId: inv.id,
      refLabel: `Reconciled ${inv.invoice_no}`,
    });
    toast.success(
      `Reconciled ${result.length} lines · ${summary.exact_matches + summary.within_tolerance} ok · ${summary.over_billed + summary.ghost_lrs} flagged`,
    );
    refresh();
  }, [vouchers, rateCards, tenantTol, customers, entityCode, userId, refresh]);

  const handleApproveAll = useCallback((inv: TransporterInvoice) => {
    const myMatches = matches.filter(m => m.invoice_id === inv.id);
    if (myMatches.length === 0) { toast.error('No matches to approve. Reconcile first.'); return; }
    const all = ls<MatchLine>(matchLinesKey(entityCode));
    const updated = all.map(m => m.invoice_id === inv.id
      ? { ...m, final_decision: 'approve' as const, decided_by: userId, decided_at: nowISO() }
      : m);
    try {
      // [JWT] PATCH /api/dispatch/match-lines/approve-bulk
      localStorage.setItem(matchLinesKey(entityCode), JSON.stringify(updated));
    } catch { /* ignore */ }
    const allInv = ls<TransporterInvoice>(transporterInvoicesKey(entityCode));
    const newInv = allInv.map(i => i.id === inv.id
      ? { ...i, status: 'approved' as const, updated_at: nowISO() }
      : i);
    try {
      localStorage.setItem(transporterInvoicesKey(entityCode), JSON.stringify(newInv));
    } catch { /* ignore */ }
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'dispatch-hub', moduleId: 'dh-t-transporter-invoice',
      action: 'master_save', refType: 'transporter-invoice', refId: inv.id,
      refLabel: `Bulk approved ${inv.invoice_no}`,
    });
    toast.success(`Approved ${myMatches.length} lines for ${inv.invoice_no}`);
    refresh();
  }, [matches, entityCode, userId, refresh]);

  const handleExportCsv = useCallback((inv: TransporterInvoice) => {
    const myMatches = matches.filter(m => m.invoice_id === inv.id);
    const headers = ['LR No', 'DLN', 'Expected', 'Declared', 'Variance', 'Variance %', 'Status', 'Auto Decision'];
    const rows = myMatches.map(m => [
      m.lr_no, m.dln_voucher_no ?? '', m.expected_amount.toFixed(2),
      m.declared_amount.toFixed(2), m.variance_amount.toFixed(2),
      m.variance_pct.toFixed(2), m.status, m.auto_decision,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `match-lines-${inv.invoice_no}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [matches]);

  const handleDelete = useCallback((inv: TransporterInvoice) => {
    if (!confirm(`Delete invoice ${inv.invoice_no}?`)) return;
    const remaining = invoices.filter(i => i.id !== inv.id);
    try {
      localStorage.setItem(transporterInvoicesKey(entityCode), JSON.stringify(remaining));
      const ml = ls<MatchLine>(matchLinesKey(entityCode)).filter(m => m.invoice_id !== inv.id);
      localStorage.setItem(matchLinesKey(entityCode), JSON.stringify(ml));
    } catch { /* ignore */ }
    refresh();
  }, [invoices, entityCode, refresh]);

  const matchCountByInv = useMemo(() => {
    const m = new Map<string, { total: number; approved: number }>();
    for (const ml of matches) {
      const cur = m.get(ml.invoice_id) ?? { total: 0, approved: 0 };
      cur.total += 1;
      if (ml.auto_decision === 'approve' || ml.final_decision === 'approve') cur.approved += 1;
      m.set(ml.invoice_id, cur);
    }
    return m;
  }, [matches]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">Transporter Invoices</h2>
          <p className="text-xs text-muted-foreground">3-way match · Tolerance hierarchy · Workflow modes</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowUpload(true)} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="h-4 w-4 mr-1" /> Upload CSV/Excel
          </Button>
          <Button variant="outline" onClick={() => setShowManual(true)}>
            <Plus className="h-4 w-4 mr-1" /> Manual Entry
          </Button>
          <Button variant="outline" onClick={() => setShowTolerance(true)}>
            <Settings className="h-4 w-4 mr-1" /> Tolerance Settings
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Pending Reconciliation</p>
            <p className="text-2xl font-mono font-bold text-blue-600">{kpis.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Disputed Invoices</p>
            <p className="text-2xl font-mono font-bold text-red-600">{kpis.disputed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Est. Over-billed (open)</p>
            <p className="text-2xl font-mono font-bold text-amber-600">{fmtINR(kpis.overBilledRs)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-center">
          <Input placeholder="Search invoice or transporter…" value={search}
            onChange={e => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={filterTransporter} onValueChange={setFilterTransporter}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All transporters</SelectItem>
              {logistics.map(l => (
                <SelectItem key={l.id} value={l.id}>{l.partyName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="uploaded">Uploaded</SelectItem>
              <SelectItem value="reconciled">Reconciled</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Transporter</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Matches</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No invoices yet. Upload a CSV/Excel or add manually.
                </TableCell></TableRow>
              )}
              {filtered.map(inv => {
                const mc = matchCountByInv.get(inv.id);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono">{inv.invoice_no}</TableCell>
                    <TableCell className="font-mono text-xs">{inv.invoice_date}</TableCell>
                    <TableCell>{inv.logistic_name}</TableCell>
                    <TableCell className="text-right font-mono">{inv.lines.length}</TableCell>
                    <TableCell className="text-right font-mono">{fmtINR(inv.grand_total)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{inv.workflow_mode}</Badge></TableCell>
                    <TableCell>{statusBadge(inv.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {mc ? `${mc.approved} of ${mc.total}` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setViewing(inv)} title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {inv.status === 'uploaded' && (
                          <Button size="sm" variant="ghost" onClick={() => handleReconcile(inv)} title="Reconcile">
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {(inv.status === 'reconciled' || inv.status === 'partial_approved') && (
                          <Button size="sm" variant="ghost" onClick={() => handleApproveAll(inv)} title="Approve all">
                            ✓
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleExportCsv(inv)} title="Export CSV">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(inv)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upload wizard */}
      <InvoiceUploadWizard
        open={showUpload}
        onOpenChange={setShowUpload}
        logistics={logistics}
        onCreated={() => { refresh(); setShowUpload(false); }}
      />

      {/* Manual entry dialog */}
      <ManualInvoiceDialog
        open={showManual} onOpenChange={setShowManual}
        logistics={logistics}
        onSaved={() => { refresh(); setShowManual(false); }}
      />

      {/* Tolerance settings dialog */}
      <ToleranceSettingsDialog
        open={showTolerance}
        onOpenChange={setShowTolerance}
        current={tenantTol}
        onSaved={(t) => { setTenantTol(t); setShowTolerance(false); refresh(); }}
      />

      {/* View invoice dialog */}
      <ViewInvoiceDialog
        invoice={viewing}
        matches={viewing ? matches.filter(m => m.invoice_id === viewing.id) : []}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

// ───────────── Manual entry ─────────────

function ManualInvoiceDialog({ open, onOpenChange, logistics, onSaved }: {
  open: boolean; onOpenChange: (b: boolean) => void;
  logistics: LogisticLite[]; onSaved: () => void;
}) {
  const { entityCode, userId } = useCardEntitlement();
  const [logisticId, setLogisticId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('flag_only');
  const [tolPct, setTolPct] = useState('');
  const [tolAmt, setTolAmt] = useState('');
  const [lines, setLines] = useState<TransporterInvoiceLine[]>(() => [emptyLine('new', 1)]);

  useEffect(() => {
    if (!open) {
      setLogisticId(''); setInvoiceNo(''); setLines([emptyLine('new', 1)]);
      setTolPct(''); setTolAmt('');
    }
  }, [open]);

  const total = useMemo(() => lines.reduce((s, l) => s + l.total, 0), [lines]);
  const totalGst = useMemo(() => lines.reduce((s, l) => s + l.gst_amount, 0), [lines]);
  const totalDeclared = total - totalGst;

  const updateLine = (idx: number, patch: Partial<TransporterInvoiceLine>) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };

  const handleSave = () => {
    if (!logisticId) { toast.error('Select transporter'); return; }
    if (!invoiceNo.trim()) { toast.error('Enter invoice number'); return; }
    if (lines.some(l => !l.lr_no.trim())) { toast.error('All lines need an LR number'); return; }

    const log = logistics.find(l => l.id === logisticId);
    const id = `inv-${Date.now()}`;
    const finalLines = lines.map((l, i) => ({ ...l, invoice_id: id, line_no: i + 1 }));
    const inv: TransporterInvoice = {
      id, entity_id: entityCode,
      invoice_no: invoiceNo.trim(), invoice_date: invoiceDate,
      logistic_id: logisticId, logistic_name: log?.partyName ?? 'Unknown',
      period_from: periodFrom || invoiceDate, period_to: periodTo || invoiceDate,
      lines: finalLines,
      total_declared: totalDeclared, total_gst: totalGst, grand_total: total,
      workflow_mode: workflowMode,
      tolerance_pct: tolPct ? Number(tolPct) : null,
      tolerance_amount: tolAmt ? Number(tolAmt) * 100 : null,
      status: 'uploaded',
      uploaded_at: nowISO(), uploaded_by: userId, upload_source: 'manual',
      created_at: nowISO(), updated_at: nowISO(),
    };
    const all = ls<TransporterInvoice>(transporterInvoicesKey(entityCode));
    all.push(inv);
    try {
      // [JWT] POST /api/dispatch/transporter-invoices
      localStorage.setItem(transporterInvoicesKey(entityCode), JSON.stringify(all));
    } catch { /* ignore */ }
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'dispatch-hub', moduleId: 'dh-t-transporter-invoice',
      action: 'master_save', refType: 'transporter-invoice', refId: inv.id,
      refLabel: `Manual invoice ${inv.invoice_no}`,
    });
    toast.success(`Invoice ${invoiceNo} created`);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manual Transporter Invoice</DialogTitle>
          <DialogDescription>Enter line items manually for a single transporter invoice.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Transporter</Label>
            <Select value={logisticId} onValueChange={setLogisticId}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {logistics.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.partyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Invoice No</Label>
            <Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Invoice Date</Label>
            <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Period From</Label>
            <Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Period To</Label>
            <Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Workflow Mode</Label>
          <RadioGroup value={workflowMode} onValueChange={(v) => setWorkflowMode(v as WorkflowMode)} className="flex gap-4">
            <div className="flex items-center gap-2"><RadioGroupItem value="flag_only" id="wf-fo" /><Label htmlFor="wf-fo">Flag only</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="auto_approve" id="wf-aa" /><Label htmlFor="wf-aa">Auto approve</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="dispute_ticket" id="wf-dt" /><Label htmlFor="wf-dt">Dispute ticket</Label></div>
          </RadioGroup>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Tolerance % (override, optional)</Label>
            <Input type="number" value={tolPct} onChange={e => setTolPct(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Tolerance ₹ (override, optional)</Label>
            <Input type="number" value={tolAmt} onChange={e => setTolAmt(e.target.value)} />
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">LR No</TableHead>
                <TableHead className="text-xs">LR Date</TableHead>
                <TableHead className="text-xs text-right">Wt (kg)</TableHead>
                <TableHead className="text-xs text-right">Rate</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs text-right">Fuel</TableHead>
                <TableHead className="text-xs text-right">FOV</TableHead>
                <TableHead className="text-xs text-right">Stat</TableHead>
                <TableHead className="text-xs text-right">COD</TableHead>
                <TableHead className="text-xs text-right">Demr</TableHead>
                <TableHead className="text-xs text-right">ODA</TableHead>
                <TableHead className="text-xs text-right">GST</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l, i) => (
                <TableRow key={l.id}>
                  <TableCell><Input value={l.lr_no} onChange={e => updateLine(i, { lr_no: e.target.value })} className="h-7" /></TableCell>
                  <TableCell><Input type="date" value={l.lr_date ?? ''} onChange={e => updateLine(i, { lr_date: e.target.value || null })} className="h-7" /></TableCell>
                  <TableCell><Input type="number" value={l.transporter_declared_weight_kg} onChange={e => updateLine(i, { transporter_declared_weight_kg: Number(e.target.value) })} className="h-7 text-right" /></TableCell>
                  <TableCell><Input type="number" value={l.transporter_declared_rate} onChange={e => updateLine(i, { transporter_declared_rate: Number(e.target.value) })} className="h-7 text-right" /></TableCell>
                  <TableCell><Input type="number" value={l.transporter_declared_amount} onChange={e => updateLine(i, { transporter_declared_amount: Number(e.target.value) })} className="h-7 text-right" /></TableCell>
                  <TableCell><Input type="number" value={l.fuel_surcharge} onChange={e => updateLine(i, { fuel_surcharge: Number(e.target.value) })} className="h-7 text-right" /></TableCell>
                  <TableCell><Input type="number" value={l.fov} onChange={e => updateLine(i, { fov: Number(e.target.value) })} className="h-7 text-right" /></TableCell>
                  <TableCell><Input type="number" value={l.statistical} onChange={e => updateLine(i, { statistical: Number(e.target.value) })} className="h-7 text-right" /></TableCell>
                  <TableCell><Input type="number" value={l.cod} onChange={e => updateLine(i, { cod: Number(e.target.value) })} className="h-7 text-right" /></TableCell>
                  <TableCell><Input type="number" value={l.demurrage} onChange={e => updateLine(i, { demurrage: Number(e.target.value) })} className="h-7 text-right" /></TableCell>
                  <TableCell><Input type="number" value={l.oda} onChange={e => updateLine(i, { oda: Number(e.target.value) })} className="h-7 text-right" /></TableCell>
                  <TableCell><Input type="number" value={l.gst_amount} onChange={e => updateLine(i, { gst_amount: Number(e.target.value) })} className="h-7 text-right" /></TableCell>
                  <TableCell><Input type="number" value={l.total} onChange={e => updateLine(i, { total: Number(e.target.value) })} className="h-7 text-right" /></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => setLines(prev => prev.filter((_, k) => k !== i))}>
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between text-sm">
          <Button size="sm" variant="outline" onClick={() => setLines(prev => [...prev, emptyLine('new', prev.length + 1)])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add line
          </Button>
          <p className="font-mono">Total: <strong>{fmtINR(total)}</strong></p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Save Invoice</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────── Tolerance settings ─────────────

function ToleranceSettingsDialog({ open, onOpenChange, current, onSaved }: {
  open: boolean; onOpenChange: (b: boolean) => void;
  current: TenantToleranceDefault; onSaved: (t: TenantToleranceDefault) => void;
}) {
  const { entityCode, userId } = useCardEntitlement();
  const [pct, setPct] = useState(String(current.tolerance_pct));
  const [amt, setAmt] = useState(String(current.tolerance_amount_paise / 100));
  const [escPct, setEscPct] = useState(String(current.escalation_variance_pct));
  const [escAmt, setEscAmt] = useState(String(current.escalation_amount_paise / 100));

  useEffect(() => {
    if (open) {
      setPct(String(current.tolerance_pct));
      setAmt(String(current.tolerance_amount_paise / 100));
      setEscPct(String(current.escalation_variance_pct));
      setEscAmt(String(current.escalation_amount_paise / 100));
    }
  }, [open, current]);

  const handleSave = () => {
    const t: TenantToleranceDefault = {
      tolerance_pct: Number(pct) || 0,
      tolerance_amount_paise: Math.round((Number(amt) || 0) * 100),
      escalation_variance_pct: Number(escPct) || 0,
      escalation_amount_paise: Math.round((Number(escAmt) || 0) * 100),
      updated_at: nowISO(), updated_by: userId,
    };
    try {
      // [JWT] PATCH /api/dispatch/tolerance
      localStorage.setItem(tenantTolerancesKey(entityCode), JSON.stringify(t));
    } catch { /* ignore */ }
    toast.success('Tolerance settings saved');
    onSaved(t);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tolerance Settings</DialogTitle>
          <DialogDescription>Tenant-wide defaults for freight reconciliation tolerance.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Default Tolerance %</Label>
            <Input type="number" value={pct} onChange={e => setPct(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Default Tolerance ₹</Label>
            <Input type="number" value={amt} onChange={e => setAmt(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Escalation Threshold %</Label>
            <Input type="number" value={escPct} onChange={e => setEscPct(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Escalation Threshold ₹</Label>
            <Input type="number" value={escAmt} onChange={e => setEscAmt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────── View invoice ─────────────

function ViewInvoiceDialog({ invoice, matches, onClose }: {
  invoice: TransporterInvoice | null; matches: MatchLine[]; onClose: () => void;
}) {
  if (!invoice) return null;
  const matchByLine = new Map(matches.map(m => [m.invoice_line_id, m]));
  return (
    <Dialog open={!!invoice} onOpenChange={(b) => { if (!b) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice {invoice.invoice_no} · {invoice.logistic_name}</DialogTitle>
          <DialogDescription>{invoice.lines.length} lines · Total {fmtINR(invoice.grand_total)}</DialogDescription>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>LR No</TableHead>
              <TableHead className="text-right">Declared</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Auto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lines.map(l => {
              const m = matchByLine.get(l.id);
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.lr_no}</TableCell>
                  <TableCell className="text-right font-mono">{fmtINR(l.total)}</TableCell>
                  <TableCell className="text-right font-mono">{m ? fmtINR(m.expected_amount) : '—'}</TableCell>
                  <TableCell className="text-right font-mono">
                    {m ? <span className={m.variance_amount > 0 ? 'text-red-600' : 'text-emerald-600'}>{fmtINR(m.variance_amount)}</span> : '—'}
                  </TableCell>
                  <TableCell>
                    {m ? <Badge variant="outline" className="text-[10px]">{m.status}</Badge> : <span className="text-xs text-muted-foreground">not reconciled</span>}
                  </TableCell>
                  <TableCell className="text-xs">{m?.auto_decision ?? '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
