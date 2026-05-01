/**
 * MaterialIssueNote.tsx — godown-to-godown transfer with real-time balance check
 * Sprint T-Phase-1.2.2 · Inventory Hub MOAT sprint
 *
 * D-127 boundary: lives in inventory/transactions/ (NOT finecore/).
 * MIN uses base voucher type 'vt-stock-transfer' which is already active.
 *
 * [JWT] POST /api/inventory/material-issue-notes/:id/issue
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
  ArrowUpFromLine, Plus, Trash2, AlertTriangle, FileText, Eye, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { useGodowns } from '@/hooks/useGodowns';
import { useSAMPersons } from '@/hooks/useSAMPersons';
import { useProjectCentres } from '@/hooks/useProjectCentres';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { useMaterialIssueNotes } from '@/hooks/useMaterialIssueNotes';
import { generateDocNo } from '@/lib/finecore-engine';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';
import { dMul, dAdd, round2 } from '@/lib/decimal-helpers';
import { stockBalanceKey, type StockBalanceEntry } from '@/types/grn';
import {
  MIN_STATUS_LABELS, MIN_STATUS_COLORS,
  type MaterialIssueNote, type MINLine, type MINStatus,
} from '@/types/consumption';
import { DEPARTMENT_LABELS, DEPARTMENT_BADGE_COLORS } from '@/types/godown';

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
  issue_date: string;
  from_godown_id: string;
  to_godown_id: string;
  requested_by_id: string;
  issued_by_id: string;
  project_centre_id: string | null;
  narration: string;
}

const BLANK_HEADER: FormHeader = {
  issue_date: todayISO(),
  from_godown_id: '', to_godown_id: '',
  requested_by_id: '', issued_by_id: '',
  project_centre_id: null, narration: '',
};

interface FormLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  qty: number;
  rate: number;
  available_qty: number;
  batch_no: string;
  notes: string;
  // Sprint T-Phase-1.2.3 audit fix: preferred-bin wiring on dispatch line.
  bin_id: string;
  bin_code: string;
  bin_id_source: 'preferred' | 'manual' | '';
}

const blankLine = (): FormLine => ({
  id: `mln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  item_id: '', item_code: '', item_name: '', uom: '',
  qty: 0, rate: 0, available_qty: 0,
  batch_no: '', notes: '',
  bin_id: '', bin_code: '', bin_id_source: '',
});

export function MaterialIssueNotePanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const { items } = useInventoryItems();
  const { godowns } = useGodowns();
  const { persons } = useSAMPersons(safeEntity);
  const { centres } = useProjectCentres(safeEntity);
  const { mins, upsertDraft, issueMin, cancelMin } = useMaterialIssueNotes(safeEntity);

  const [view, setView] = useState<'list' | 'form'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | MINStatus>('all');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [readonly, setReadonly] = useState(false);
  const [header, setHeader] = useState<FormHeader>(BLANK_HEADER);
  const [lines, setLines] = useState<FormLine[]>([]);
  const [showLineSheet, setShowLineSheet] = useState(false);
  const [draftLine, setDraftLine] = useState<FormLine>(blankLine());

  // mins is intentionally a dependency: re-read balances after a MIN is issued.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const balances = useMemo(() => loadBalances(safeEntity), [safeEntity, mins]);

  const totals = useMemo(() => {
    let qty = 0, value = 0;
    for (const l of lines) {
      qty = dAdd(qty, l.qty);
      value = dAdd(value, dMul(l.qty, l.rate));
    }
    return { qty: round2(qty), value: round2(value) };
  }, [lines]);

  const filtered = useMemo(() => mins
    .filter(m => statusFilter === 'all' || m.status === statusFilter)
    .filter(m => !search ||
      m.min_no.toLowerCase().includes(search.toLowerCase()) ||
      m.from_godown_name.toLowerCase().includes(search.toLowerCase()) ||
      m.to_godown_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [mins, statusFilter, search]);

  const kpis = useMemo(() => {
    const today = todayISO();
    return {
      draft: mins.filter(m => m.status === 'draft').length,
      issuedToday: mins.filter(m => m.issue_date === today && m.status === 'issued').length,
      issuedMonth: mins.filter(m =>
        m.status === 'issued' && m.issue_date.slice(0, 7) === today.slice(0, 7)).length,
      transferValue: mins
        .filter(m => m.status === 'issued' && m.issue_date.slice(0, 7) === today.slice(0, 7))
        .reduce((s, m) => dAdd(s, m.total_value), 0),
    };
  }, [mins]);

  const startNew = () => {
    setEditingId(null); setReadonly(false);
    setHeader(BLANK_HEADER); setLines([]);
    setView('form');
  };

  const openExisting = (m: MaterialIssueNote, ro: boolean) => {
    setEditingId(m.id); setReadonly(ro);
    setHeader({
      issue_date: m.issue_date,
      from_godown_id: m.from_godown_id, to_godown_id: m.to_godown_id,
      requested_by_id: m.requested_by_id, issued_by_id: m.issued_by_id,
      project_centre_id: m.project_centre_id, narration: m.narration,
    });
    setLines(m.lines.map(l => ({
      id: l.id, item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
      uom: l.uom, qty: l.qty, rate: l.rate,
      available_qty: l.available_qty_at_issue,
      batch_no: l.batch_no ?? '', notes: l.notes,
      bin_id: '', bin_code: '', bin_id_source: '' as const,
    })));
    setView('form');
  };

  const onPickItem = (itemId: string) => {
    const it = items.find(i => i.id === itemId);
    if (!it) return;
    const bal = balances.find(b => b.item_id === itemId && b.godown_id === header.from_godown_id);
    setDraftLine(d => ({
      ...d,
      item_id: it.id, item_code: it.code ?? '', item_name: it.name,
      uom: it.primary_uom_symbol ?? it.purchase_uom_symbol ?? 'NOS',
      rate: bal?.weighted_avg_rate ?? 0,
      available_qty: bal?.qty ?? 0,
    }));
  };

  const addLine = () => {
    if (!header.from_godown_id) {
      toast.error('Select source godown first'); return;
    }
    setDraftLine(blankLine()); setShowLineSheet(true);
  };

  const commitLine = () => {
    if (!draftLine.item_id) { toast.error('Select an item'); return; }
    if (draftLine.qty <= 0) { toast.error('Qty must be > 0'); return; }
    if (draftLine.qty > draftLine.available_qty) {
      toast.error(`Only ${draftLine.available_qty} available · cannot issue ${draftLine.qty}`);
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
    if (!header.from_godown_id) return 'Source godown is required';
    if (!header.to_godown_id) return 'Destination godown is required';
    if (header.from_godown_id === header.to_godown_id)
      return 'Source and destination must differ';
    if (!header.requested_by_id) return 'Requested by is required';
    if (!header.issued_by_id) return 'Issued by is required';
    if (lines.length === 0) return 'Add at least one line';
    return null;
  };

  const buildMin = (status: MINStatus, existing?: MaterialIssueNote): MaterialIssueNote => {
    const now = new Date().toISOString();
    const fromG = godowns.find(g => g.id === header.from_godown_id);
    const toG = godowns.find(g => g.id === header.to_godown_id);
    const reqP = persons.find(p => p.id === header.requested_by_id);
    const issP = persons.find(p => p.id === header.issued_by_id);
    const reqName = reqP?.display_name ?? '';
    const issName = issP?.display_name ?? '';
    const builtLines: MINLine[] = lines.map(l => ({
      id: l.id,
      item_id: l.item_id, item_code: l.item_code, item_name: l.item_name,
      uom: l.uom,
      qty: l.qty, rate: l.rate,
      value: round2(dMul(l.qty, l.rate)),
      available_qty_at_issue: l.available_qty,
      batch_no: l.batch_no || null, notes: l.notes,
    }));
    return {
      id: existing?.id ?? `min-${Date.now()}`,
      entity_id: safeEntity,
      min_no: existing?.min_no ?? generateDocNo('MIN', safeEntity),
      status,
      issue_date: header.issue_date,
      from_godown_id: header.from_godown_id, from_godown_name: fromG?.name ?? '',
      to_godown_id: header.to_godown_id, to_godown_name: toG?.name ?? '',
      to_department_code: toG?.department_code ?? null,
      requested_by_id: header.requested_by_id, requested_by_name: reqName,
      issued_by_id: header.issued_by_id, issued_by_name: issName,
      project_centre_id: header.project_centre_id,
      lines: builtLines,
      total_qty: totals.qty,
      total_value: totals.value,
      narration: header.narration,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      issued_at: existing?.issued_at ?? null,
      cancelled_at: existing?.cancelled_at ?? null,
      cancellation_reason: existing?.cancellation_reason ?? null,
    };
  };

  const handleSaveDraft = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const existing = editingId ? mins.find(m => m.id === editingId) : undefined;
    const built = buildMin('draft', existing);
    upsertDraft(built);
    toast.success(`MIN ${built.min_no} saved as draft`);
    setView('list');
  };

  const handleIssue = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const existing = editingId ? mins.find(m => m.id === editingId) : undefined;
    const built = buildMin('draft', existing);
    upsertDraft(built);
    const result = issueMin(built);
    if (result.ok) setView('list');
  };

  if (view === 'list') {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ArrowUpFromLine className="h-6 w-6 text-cyan-500" />
              Material Issue Note
            </h1>
            <p className="text-sm text-muted-foreground">
              Godown-to-godown transfers · departmental accountability
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={startNew}>
            <Plus className="h-4 w-4" /> New MIN
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>Draft</CardDescription>
            <CardTitle className="text-2xl font-mono">{kpis.draft}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Issued Today</CardDescription>
            <CardTitle className="text-2xl font-mono text-blue-600">{kpis.issuedToday}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Issued This Month</CardDescription>
            <CardTitle className="text-2xl font-mono text-emerald-600">{kpis.issuedMonth}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Transfer Value (Mo)</CardDescription>
            <CardTitle className="text-xl font-mono">{fmtINR(kpis.transferValue)}</CardTitle></CardHeader></Card>
        </div>

        <div className="flex items-center gap-3">
          <Input className="max-w-sm h-9" placeholder="Search MIN no / godown..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'all' | MINStatus)}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {(Object.keys(MIN_STATUS_LABELS) as MINStatus[]).map(s =>
                <SelectItem key={s} value={s}>{MIN_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
            {['MIN No', 'Date', 'From', '→', 'To', 'Dept', 'Lines', 'Value', 'Status', ''].map(h =>
              <TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No issue notes yet — create one to record a transfer</p>
              </TableCell></TableRow>
            ) : filtered.map(m => (
              <TableRow key={m.id} className="group">
                <TableCell><code className="text-xs font-mono">{m.min_no}</code></TableCell>
                <TableCell className="text-xs">{m.issue_date}</TableCell>
                <TableCell className="text-xs">{m.from_godown_name}</TableCell>
                <TableCell className="text-xs"><ArrowRight className="h-3 w-3 text-muted-foreground" /></TableCell>
                <TableCell className="text-xs">{m.to_godown_name}</TableCell>
                <TableCell>
                  {m.to_department_code ? (
                    <Badge className={`text-[10px] ${DEPARTMENT_BADGE_COLORS[m.to_department_code as keyof typeof DEPARTMENT_BADGE_COLORS] ?? ''}`}>
                      {DEPARTMENT_LABELS[m.to_department_code as keyof typeof DEPARTMENT_LABELS] ?? m.to_department_code}
                    </Badge>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-xs font-mono">{m.lines.length}</TableCell>
                <TableCell className="text-xs font-mono">{fmtINR(m.total_value)}</TableCell>
                <TableCell>
                  <Badge className={`text-[10px] ${MIN_STATUS_COLORS[m.status]}`}>
                    {MIN_STATUS_LABELS[m.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => openExisting(m, true)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {m.status === 'draft' && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => openExisting(m, false)}>
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600"
                          onClick={() => cancelMin(m.id, 'Cancelled by user')}>
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
  const fromGodown = godowns.find(g => g.id === header.from_godown_id);
  const toGodown = godowns.find(g => g.id === header.to_godown_id);

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5 text-cyan-500" />
            {editingId ? (readonly ? 'View MIN' : 'Edit MIN') : 'New Material Issue Note'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Stock transferred at source godown's weighted-average rate
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setView('list')}>← Back</Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Issue Date</Label>
            <Input type="date" disabled={readonly} value={header.issue_date}
              onChange={e => {
                const v = e.target.value;
                if (v && isPeriodLocked(v, safeEntity)) {
                  toast.warning(periodLockMessage(v, safeEntity) ?? 'Period locked');
                }
                setHeader(h => ({ ...h, issue_date: v }));
              }} />
          </div>
          <div>
            <Label className="text-xs">From Godown</Label>
            <Select disabled={readonly} value={header.from_godown_id}
              onValueChange={v => setHeader(h => ({ ...h, from_godown_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {godowns.filter(g => g.status === 'active').map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}{g.department_code ? ` · ${DEPARTMENT_LABELS[g.department_code]}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">To Godown</Label>
            <Select disabled={readonly} value={header.to_godown_id}
              onValueChange={v => setHeader(h => ({ ...h, to_godown_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
              <SelectContent>
                {godowns.filter(g => g.status === 'active' && g.id !== header.from_godown_id).map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}{g.department_code ? ` · ${DEPARTMENT_LABELS[g.department_code]}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Requested By</Label>
            <Select disabled={readonly} value={header.requested_by_id}
              onValueChange={v => setHeader(h => ({ ...h, requested_by_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select requester" /></SelectTrigger>
              <SelectContent>
                {persons.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Issued By (Storekeeper)</Label>
            <Select disabled={readonly} value={header.issued_by_id}
              onValueChange={v => setHeader(h => ({ ...h, issued_by_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select issuer" /></SelectTrigger>
              <SelectContent>
                {persons.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Project (optional)</Label>
            <Select disabled={readonly} value={header.project_centre_id ?? '__none'}
              onValueChange={v => setHeader(h => ({ ...h, project_centre_id: v === '__none' ? null : v }))}>
              <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None</SelectItem>
                {centres.filter(c => c.status === 'active').map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs">Narration</Label>
            <Textarea disabled={readonly} value={header.narration}
              onChange={e => setHeader(h => ({ ...h, narration: e.target.value }))}
              rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Lines · {lines.length}</CardTitle>
            <CardDescription className="text-xs">
              {fromGodown ? `Available balances from ${fromGodown.name}` : 'Pick source godown'}
              {toGodown ? ` → ${toGodown.name}` : ''}
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
              {['Item', 'UOM', 'Qty', 'Avail', 'Rate', 'Value', ''].map(h =>
                <TableHead key={h} className="text-xs">{h}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-xs">
                  No lines yet
                </TableCell></TableRow>
              ) : lines.map(l => {
                const insufficient = l.qty > l.available_qty;
                return (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">{l.item_name}</TableCell>
                    <TableCell className="text-xs">{l.uom}</TableCell>
                    <TableCell className={`text-xs font-mono ${insufficient ? 'text-rose-600 font-semibold' : ''}`}>
                      {l.qty}
                      {insufficient && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{l.available_qty}</TableCell>
                    <TableCell className="text-xs font-mono">{fmtINR(l.rate)}</TableCell>
                    <TableCell className="text-xs font-mono">{fmtINR(round2(dMul(l.qty, l.rate)))}</TableCell>
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
          <span className="text-muted-foreground"> · {totals.qty} units across {lines.length} line(s)</span>
        </div>
        {!readonly && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveDraft}>Save Draft</Button>
            <Button size="sm" onClick={handleIssue}>Issue MIN</Button>
          </div>
        )}
      </div>

      <Sheet open={showLineSheet} onOpenChange={setShowLineSheet}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Add Line</SheetTitle>
            <SheetDescription>Pick item & qty · rate snapshots from source godown</SheetDescription>
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
                <Label className="text-xs">Qty</Label>
                <Input type="number" min={0} step="0.001" value={draftLine.qty}
                  onChange={e => setDraftLine(d => ({ ...d, qty: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">Available</Label>
                <Input value={draftLine.available_qty} disabled className="font-mono" />
              </div>
              <div>
                <Label className="text-xs">Rate (₹)</Label>
                <Input type="number" min={0} step="0.01" value={draftLine.rate}
                  onChange={e => setDraftLine(d => ({ ...d, rate: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">UOM</Label>
                <Input value={draftLine.uom} disabled />
              </div>
            </div>
            <div>
              <Label className="text-xs">Batch (optional)</Label>
              <Input value={draftLine.batch_no}
                onChange={e => setDraftLine(d => ({ ...d, batch_no: e.target.value }))} />
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
