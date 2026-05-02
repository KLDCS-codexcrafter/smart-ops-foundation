/**
 * ConsumptionEntry.tsx — Job/Overhead/Site stock consumption with variance.
 * Sprint T-Phase-1.2.2 · The MOAT sprint.
 *
 * D-127 boundary: lives in inventory/transactions/.
 * D-128 boundary: voucher schema is unchanged · CE rides 'vt-consumption-entry'.
 * D-216: variance is computed in the hook (computeConsumptionVariance).
 *
 * [JWT] POST /api/inventory/consumption-entries/:id/post
 */
// i18n-todo: Sprint T-Phase-1.2.5h-c2 · phased migration · top-strings wrapped where safe; remaining strings tracked for Phase 1.6
import { useMemo, useState } from 'react';
// Sprint T-Phase-1.2.5h-b2 · Validate-first inline-error pattern (M-3)
import { makeFieldValidator, fieldErrorClass, fieldErrorText } from '@/lib/validate-first';
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
  PackageOpen, Plus, Trash2, FileText, Eye, TrendingUp, TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { useGodowns } from '@/hooks/useGodowns';
import { useSAMPersons } from '@/hooks/useSAMPersons';
import { useProjectCentres } from '@/hooks/useProjectCentres';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { useConsumptionEntries, computeConsumptionVariance } from '@/hooks/useConsumptionEntries';
import { generateDocNo } from '@/lib/finecore-engine';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';
import { dMul, dAdd, round2 } from '@/lib/decimal-helpers';
import { stockBalanceKey, type StockBalanceEntry } from '@/types/grn';
import {
  CONSUMPTION_STATUS_LABELS, CONSUMPTION_STATUS_COLORS,
  CONSUMPTION_MODE_LABELS, CONSUMPTION_MODE_COLORS,
  type ConsumptionEntry, type ConsumptionLine,
  type ConsumptionMode, type ConsumptionStatus,
} from '@/types/consumption';
import { DEPARTMENT_LABELS } from '@/types/godown';
import { DEMO_BOM_HAPPY_PATH } from '@/data/demo-bom-data';
import { useT } from '@/lib/i18n-engine';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)}`;

const todayISO = (): string => new Date().toISOString().slice(0, 10);

function loadBalances(entityCode: string): StockBalanceEntry[] {
  try {
    // [JWT] GET /api/inventory/stock-balance
    return JSON.parse(localStorage.getItem(stockBalanceKey(entityCode)) || '[]');
  } catch { return []; }
}

interface FormHeader {
  consumption_date: string;
  /** Sprint T-Phase-1.2.6b · D-226 UTS · accounting effective date (defaults to consumption_date) */
  effective_date: string | null;
  mode: ConsumptionMode;
  godown_id: string;
  project_centre_id: string | null;
  bom_id: string | null;
  output_qty: number;
  output_uom: string;
  overhead_ledger_id: string | null;
  overhead_ledger_name: string;
  site_reference: string;
  consumed_by_id: string;
  narration: string;
}

const BLANK_HEADER: FormHeader = {
  consumption_date: todayISO(),
  effective_date: null,
  mode: 'job',
  godown_id: '',
  project_centre_id: null,
  bom_id: null,
  output_qty: 0,
  output_uom: '',
  overhead_ledger_id: null,
  overhead_ledger_name: '',
  site_reference: '',
  consumed_by_id: '',
  narration: '',
};

interface FormLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  standard_qty: number;
  actual_qty: number;
  rate: number;
  available_qty: number;
  notes: string;
}

const blankLine = (): FormLine => ({
  id: `cln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  item_id: '', item_code: '', item_name: '', uom: '',
  standard_qty: 0, actual_qty: 0, rate: 0, available_qty: 0, notes: '',
});

export function ConsumptionEntryPanel() {
  const _t = useT();
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const { items } = useInventoryItems();
  const { godowns } = useGodowns();
  const { persons } = useSAMPersons(safeEntity);
  const { centres } = useProjectCentres(safeEntity);
  const { entries, upsert, postEntry, cancelEntry } = useConsumptionEntries(safeEntity);

  const [view, setView] = useState<'list' | 'form'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | ConsumptionStatus>('all');
  const [modeFilter, setModeFilter] = useState<'all' | ConsumptionMode>('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [readonly, setReadonly] = useState(false);
  const [header, setHeader] = useState<FormHeader>(BLANK_HEADER);
  const [lines, setLines] = useState<FormLine[]>([]);
  const [showLineSheet, setShowLineSheet] = useState(false);
  const [draftLine, setDraftLine] = useState<FormLine>(blankLine());

  // entries is intentionally a dependency: re-read balances after posting.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const balances = useMemo(() => loadBalances(safeEntity), [safeEntity, entries]);

  const totals = useMemo(() => {
    let qty = 0, value = 0, varianceVal = 0;
    for (const l of lines) {
      qty = dAdd(qty, l.actual_qty);
      value = dAdd(value, dMul(l.actual_qty, l.rate));
      varianceVal = dAdd(varianceVal, dMul(l.actual_qty - l.standard_qty, l.rate));
    }
    return { qty: round2(qty), value: round2(value), varianceVal: round2(varianceVal) };
  }, [lines]);

  const filtered = useMemo(() => entries
    .filter(e => statusFilter === 'all' || e.status === statusFilter)
    .filter(e => modeFilter === 'all' || e.mode === modeFilter)
    .filter(e => !search ||
      e.ce_no.toLowerCase().includes(search.toLowerCase()) ||
      e.godown_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [entries, statusFilter, modeFilter, search]);

  const kpis = useMemo(() => {
    const today = todayISO();
    const month = today.slice(0, 7);
    const monthEntries = entries.filter(e => e.status === 'posted' && e.consumption_date.slice(0, 7) === month);
    return {
      draft: entries.filter(e => e.status === 'draft').length,
      postedMonth: monthEntries.length,
      monthValue: monthEntries.reduce((s, e) => dAdd(s, e.total_value), 0),
      monthVariance: monthEntries.reduce((s, e) => dAdd(s, e.total_variance_value), 0),
    };
  }, [entries]);

  const startNew = () => {
    setEditingId(null); setReadonly(false);
    setHeader(BLANK_HEADER); setLines([]);
    setView('form');
  };

  const openExisting = (e: ConsumptionEntry, ro: boolean) => {
    setEditingId(e.id); setReadonly(ro);
    setHeader({
      consumption_date: e.consumption_date,
      mode: e.mode,
      godown_id: e.godown_id,
      project_centre_id: e.project_centre_id,
      bom_id: e.bom_id,
      output_qty: e.output_qty,
      output_uom: e.output_uom ?? '',
      overhead_ledger_id: e.overhead_ledger_id,
      overhead_ledger_name: e.overhead_ledger_name ?? '',
      site_reference: e.site_reference ?? '',
      consumed_by_id: e.consumed_by_id,
      narration: e.narration,
    });
    setLines(e.lines.map(l => ({
      id: l.id, item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
      uom: l.uom,
      standard_qty: l.standard_qty, actual_qty: l.actual_qty, rate: l.rate,
      available_qty: 0, notes: l.notes,
    })));
    setView('form');
  };

  /** Auto-fill BOM standard qty when BOM selected. */
  const applyBOM = (bomId: string) => {
    const bom = DEMO_BOM_HAPPY_PATH.find(b => b.id === bomId);
    if (!bom || header.output_qty <= 0) {
      setHeader(h => ({ ...h, bom_id: bomId, output_uom: bom?.output_uom ?? h.output_uom }));
      return;
    }
    const scale = header.output_qty / (bom.output_qty || 1);
    const seeded: FormLine[] = bom.components.map(c => {
      const it = items.find(i => i.id === c.item_id);
      const bal = balances.find(b => b.item_id === c.item_id && b.godown_id === header.godown_id);
      return {
        id: `cln-${c.id}-${Date.now()}`,
        item_id: c.item_id, item_code: c.item_code, item_name: c.item_name,
        uom: c.uom,
        standard_qty: round2(c.qty * scale * (1 + (c.wastage_percent ?? 0) / 100)),
        actual_qty: round2(c.qty * scale * (1 + (c.wastage_percent ?? 0) / 100)),
        rate: bal?.weighted_avg_rate ?? 0,
        available_qty: bal?.qty ?? 0,
        notes: it ? '' : 'Item not in master',
      };
    });
    setHeader(h => ({ ...h, bom_id: bomId, output_uom: bom.output_uom }));
    setLines(seeded);
    toast.success(`BOM applied · ${seeded.length} component(s) seeded at standard qty`);
  };

  const onPickItem = (itemId: string) => {
    const it = items.find(i => i.id === itemId);
    if (!it) return;
    const bal = balances.find(b => b.item_id === itemId && b.godown_id === header.godown_id);
    setDraftLine(d => ({
      ...d,
      item_id: it.id, item_code: it.code ?? '', item_name: it.name,
      uom: it.primary_uom_symbol ?? it.purchase_uom_symbol ?? 'NOS',
      rate: bal?.weighted_avg_rate ?? 0,
      available_qty: bal?.qty ?? 0,
    }));
  };

  const addLine = () => {
    if (!header.godown_id) { toast.error('Select source godown first'); return; }
    setDraftLine(blankLine()); setShowLineSheet(true);
  };

  const commitLine = () => {
    if (!draftLine.item_id) { toast.error('Select an item'); return; }
    if (draftLine.actual_qty <= 0) { toast.error('Actual qty must be > 0'); return; }
    if (draftLine.actual_qty > draftLine.available_qty) {
      toast.error(`Only ${draftLine.available_qty} available · cannot consume ${draftLine.actual_qty}`);
      return;
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
    if (!header.godown_id) return 'Source godown is required';
    if (!header.consumed_by_id) return 'Consumed-by person required';
    if (header.mode === 'job' && !header.project_centre_id) return 'Job mode requires a project';
    if (header.mode === 'overhead' && !header.overhead_ledger_id) return 'Overhead mode requires ledger ref';
    if (lines.length === 0) return 'Add at least one line';
    return null;
  };

  const buildEntry = (status: ConsumptionStatus, existing?: ConsumptionEntry): ConsumptionEntry => {
    const now = new Date().toISOString();
    const g = godowns.find(x => x.id === header.godown_id);
    const cP = persons.find(p => p.id === header.consumed_by_id);
    const builtLines: ConsumptionLine[] = lines.map(l => ({
      id: l.id,
      item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
      uom: l.uom,
      standard_qty: l.standard_qty,
      actual_qty: l.actual_qty,
      variance_qty: round2(l.actual_qty - l.standard_qty),
      variance_percent: l.standard_qty > 0
        ? round2(((l.actual_qty - l.standard_qty) / l.standard_qty) * 100) : 0,
      rate: l.rate,
      value: round2(dMul(l.actual_qty, l.rate)),
      notes: l.notes,
    }));
    const draft: ConsumptionEntry = {
      id: existing?.id ?? `ce-${Date.now()}`,
      entity_id: safeEntity,
      ce_no: existing?.ce_no ?? generateDocNo('CE', safeEntity),
      status,
      consumption_date: header.consumption_date,
      mode: header.mode,
      godown_id: header.godown_id,
      godown_name: g?.name ?? '',
      department_code: g?.department_code ?? null,
      project_centre_id: header.project_centre_id,
      bom_id: header.bom_id,
      bom_version_no: null,
      output_qty: header.output_qty,
      output_uom: header.output_uom || null,
      overhead_ledger_id: header.overhead_ledger_id,
      overhead_ledger_name: header.overhead_ledger_name || null,
      site_reference: header.site_reference || null,
      consumed_by_id: header.consumed_by_id,
      consumed_by_name: cP?.display_name ?? '',
      lines: builtLines,
      total_qty: totals.qty,
      total_value: totals.value,
      total_variance_value: totals.varianceVal,
      narration: header.narration,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      posted_at: existing?.posted_at ?? null,
      cancelled_at: existing?.cancelled_at ?? null,
      cancellation_reason: existing?.cancellation_reason ?? null,
    };
    // Re-apply variance computer to keep all lines consistent
    const variance = computeConsumptionVariance(draft);
    return {
      ...draft,
      lines: variance.lines,
      total_variance_value: variance.total_variance_value,
    };
  };

  // Sprint T-Phase-1.2.5h-b2 · Validate-first inline-error pattern (M-3)
  const headerValidator = makeFieldValidator<FormHeader>([
    { field: 'consumption_date', test: (v) => Boolean(v), message: 'Date is required' },
    { field: 'godown_id',        test: (v) => Boolean(v), message: 'Source godown is required' },
    { field: 'consumed_by_id',   test: (v) => Boolean(v), message: 'Consumed by is required' },
  ]);
  const fieldErr = (f: string) => fieldErrorClass({}, f);
  void fieldErr; void fieldErrorText;

  const handleSaveDraft = () => {
    const fr = headerValidator(header);
    if (!fr.ok) { const k = Object.keys(fr.errors)[0]; toast.error(fr.errors[k]); return; }
    const err = validate();
    if (err) { toast.error(err); return; }
    const existing = editingId ? entries.find(e => e.id === editingId) : undefined;
    const built = buildEntry('draft', existing);
    upsert(built);
    toast.success(`Consumption ${built.ce_no} saved as draft`);
    setView('list');
  };

  const handlePost = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const existing = editingId ? entries.find(e => e.id === editingId) : undefined;
    const built = buildEntry('draft', existing);
    upsert(built);
    const result = postEntry(built);
    if (result.ok) setView('list');
  };

  if (view === 'list') {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PackageOpen className="h-6 w-6 text-cyan-500" />
              {_t('inv.consumption', 'Consumption Entry')}
            </h1>
            <p className="text-sm text-muted-foreground">
              Departmental consumption · job / overhead / site · variance vs BOM standard
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={startNew}>
            <Plus className="h-4 w-4" /> New Consumption
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>Draft</CardDescription>
            <CardTitle className="text-2xl font-mono">{kpis.draft}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Posted (Mo)</CardDescription>
            <CardTitle className="text-2xl font-mono text-emerald-600">{kpis.postedMonth}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Consumption Value (Mo)</CardDescription>
            <CardTitle className="text-xl font-mono">{fmtINR(kpis.monthValue)}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Variance Value (Mo)</CardDescription>
            <CardTitle className={`text-xl font-mono ${kpis.monthVariance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {fmtINR(kpis.monthVariance)}
            </CardTitle></CardHeader></Card>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input className="max-w-sm h-9" placeholder="Search CE no / godown..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'all' | ConsumptionStatus)}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {(Object.keys(CONSUMPTION_STATUS_LABELS) as ConsumptionStatus[]).map(s =>
                <SelectItem key={s} value={s}>{CONSUMPTION_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={modeFilter} onValueChange={v => setModeFilter(v as 'all' | ConsumptionMode)}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              {(Object.keys(CONSUMPTION_MODE_LABELS) as ConsumptionMode[]).map(m =>
                <SelectItem key={m} value={m}>{CONSUMPTION_MODE_LABELS[m]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
            {['CE No', 'Date', 'Mode', 'Godown', 'Lines', 'Value', 'Variance', 'Status', ''].map(h =>
              <TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No consumption entries yet</p>
              </TableCell></TableRow>
            ) : filtered.map(e => (
              <TableRow key={e.id} className="group">
                <TableCell><code className="text-xs font-mono">{e.ce_no}</code></TableCell>
                <TableCell className="text-xs">{e.consumption_date}</TableCell>
                <TableCell>
                  <Badge className={`text-[10px] ${CONSUMPTION_MODE_COLORS[e.mode]}`}>
                    {CONSUMPTION_MODE_LABELS[e.mode]}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">{e.godown_name}</TableCell>
                <TableCell className="text-xs font-mono">{e.lines.length}</TableCell>
                <TableCell className="text-xs font-mono">{fmtINR(e.total_value)}</TableCell>
                <TableCell className={`text-xs font-mono ${e.total_variance_value > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  <span className="inline-flex items-center gap-1">
                    {e.total_variance_value > 0
                      ? <TrendingUp className="h-3 w-3" />
                      : <TrendingDown className="h-3 w-3" />}
                    {fmtINR(e.total_variance_value)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={`text-[10px] ${CONSUMPTION_STATUS_COLORS[e.status]}`}>
                    {CONSUMPTION_STATUS_LABELS[e.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => openExisting(e, true)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {e.status === 'draft' && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => openExisting(e, false)}>
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600"
                          onClick={() => cancelEntry(e.id, 'Cancelled by user')}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
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

  // ── Form view ──────────────────────────────────────────────────────────
  const godown = godowns.find(g => g.id === header.godown_id);

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-cyan-500" />
            {editingId ? (readonly ? 'View Consumption' : 'Edit Consumption') : 'New Consumption Entry'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Stock deducted at source godown's weighted-average rate · variance computed live
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setView('list')}>← Back</Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" disabled={readonly} value={header.consumption_date}
              onChange={e => {
                const v = e.target.value;
                if (v && isPeriodLocked(v, safeEntity)) {
                  toast.warning(periodLockMessage(v, safeEntity) ?? 'Period locked');
                }
                setHeader(h => ({ ...h, consumption_date: v }));
              }} />
          </div>
          <div>
            <Label className="text-xs">Mode</Label>
            <Select disabled={readonly} value={header.mode}
              onValueChange={v => setHeader(h => ({ ...h, mode: v as ConsumptionMode }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CONSUMPTION_MODE_LABELS) as ConsumptionMode[]).map(m =>
                  <SelectItem key={m} value={m}>{CONSUMPTION_MODE_LABELS[m]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Source Godown</Label>
            <Select disabled={readonly} value={header.godown_id}
              onValueChange={v => setHeader(h => ({ ...h, godown_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select godown" /></SelectTrigger>
              <SelectContent>
                {godowns.filter(g => g.status === 'active').map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}{g.department_code ? ` · ${DEPARTMENT_LABELS[g.department_code]}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {header.mode === 'job' && (
            <>
              <div>
                <Label className="text-xs">Project</Label>
                <Select disabled={readonly} value={header.project_centre_id ?? '__none'}
                  onValueChange={v => setHeader(h => ({ ...h, project_centre_id: v === '__none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {centres.filter(c => c.status === 'active').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">BOM (optional)</Label>
                <Select disabled={readonly} value={header.bom_id ?? '__none'}
                  onValueChange={v => v === '__none'
                    ? setHeader(h => ({ ...h, bom_id: null }))
                    : applyBOM(v)}>
                  <SelectTrigger><SelectValue placeholder="No BOM" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {DEMO_BOM_HAPPY_PATH.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.product_item_code} · v{b.version_no}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Output Qty</Label>
                <Input type="number" min={0} step="0.001" disabled={readonly}
                  value={header.output_qty}
                  onChange={e => setHeader(h => ({ ...h, output_qty: parseFloat(e.target.value) || 0 }))} />
              </div>
            </>
          )}

          {header.mode === 'overhead' && (
            <div className="md:col-span-2">
              <Label className="text-xs">Overhead Ledger Reference</Label>
              <Input disabled={readonly} value={header.overhead_ledger_name}
                placeholder="e.g. Maintenance Expense"
                onChange={e => setHeader(h => ({
                  ...h,
                  overhead_ledger_name: e.target.value,
                  overhead_ledger_id: e.target.value ? `oh-${e.target.value.toLowerCase().replace(/\s+/g, '-')}` : null,
                }))} />
            </div>
          )}

          {header.mode === 'site' && (
            <>
              <div>
                <Label className="text-xs">Project</Label>
                <Select disabled={readonly} value={header.project_centre_id ?? '__none'}
                  onValueChange={v => setHeader(h => ({ ...h, project_centre_id: v === '__none' ? null : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {centres.filter(c => c.status === 'active').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Site Reference</Label>
                <Input disabled={readonly} value={header.site_reference}
                  placeholder="Site name / address"
                  onChange={e => setHeader(h => ({ ...h, site_reference: e.target.value }))} />
              </div>
            </>
          )}

          <div>
            <Label className="text-xs">Consumed By</Label>
            <Select disabled={readonly} value={header.consumed_by_id}
              onValueChange={v => setHeader(h => ({ ...h, consumed_by_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
              <SelectContent>
                {persons.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs">Narration</Label>
            <Textarea disabled={readonly} rows={2} value={header.narration}
              onChange={e => setHeader(h => ({ ...h, narration: e.target.value }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Lines · {lines.length}</CardTitle>
            <CardDescription className="text-xs">
              {godown ? `Stock from ${godown.name}` : 'Pick godown'} · variance = actual − standard
            </CardDescription>
          </div>
          {!readonly && (
            <Button size="sm" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" /> Add Line
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
              {['Item', 'UOM', 'Std Qty', 'Actual', 'Var %', 'Rate', 'Value', ''].map(h =>
                <TableHead key={h} className="text-xs">{h}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-xs">
                  No lines yet
                </TableCell></TableRow>
              ) : lines.map(l => {
                const varPct = l.standard_qty > 0
                  ? round2(((l.actual_qty - l.standard_qty) / l.standard_qty) * 100) : 0;
                const varCls = varPct > 5 ? 'text-rose-600' : varPct < -5 ? 'text-emerald-600' : 'text-muted-foreground';
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{l.item_name}</TableCell>
                    <TableCell className="text-xs">{l.uom}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{l.standard_qty}</TableCell>
                    <TableCell className="text-xs font-mono">{l.actual_qty}</TableCell>
                    <TableCell className={`text-xs font-mono ${varCls}`}>{varPct}%</TableCell>
                    <TableCell className="text-xs font-mono">{fmtINR(l.rate)}</TableCell>
                    <TableCell className="text-xs font-mono">{fmtINR(round2(dMul(l.actual_qty, l.rate)))}</TableCell>
                    <TableCell>
                      {!readonly && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600"
                          onClick={() => removeLine(l.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm font-mono">
          Total: <span className="font-semibold">{fmtINR(totals.value)}</span>
          <span className={`ml-3 ${totals.varianceVal > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            Variance: {fmtINR(totals.varianceVal)}
          </span>
          <span className="text-muted-foreground"> · {totals.qty} units across {lines.length} line(s)</span>
        </div>
        {!readonly && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveDraft}>Save Draft</Button>
            <Button size="sm" onClick={handlePost}>Post Consumption</Button>
          </div>
        )}
      </div>

      <Sheet open={showLineSheet} onOpenChange={setShowLineSheet}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Add Line</SheetTitle>
            <SheetDescription>Pick item · enter actual qty · standard auto-fills from BOM</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label className="text-xs">Item</Label>
              <Select value={draftLine.item_id} onValueChange={onPickItem}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {items.map(it => (
                    <SelectItem key={it.id} value={it.id}>{it.code} · {it.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Standard Qty</Label>
                <Input type="number" min={0} step="0.001" value={draftLine.standard_qty}
                  onChange={e => setDraftLine(d => ({ ...d, standard_qty: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">Actual Qty</Label>
                <Input type="number" min={0} step="0.001" value={draftLine.actual_qty}
                  onChange={e => setDraftLine(d => ({ ...d, actual_qty: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">Available</Label>
                <Input value={draftLine.available_qty} disabled className="font-mono" />
              </div>
              <div>
                <Label className="text-xs">UOM</Label>
                <Input value={draftLine.uom} disabled />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Rate (₹)</Label>
                <Input type="number" min={0} step="0.01" value={draftLine.rate}
                  onChange={e => setDraftLine(d => ({ ...d, rate: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={draftLine.notes}
                onChange={e => setDraftLine(d => ({ ...d, notes: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={commitLine}>Save Line</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
