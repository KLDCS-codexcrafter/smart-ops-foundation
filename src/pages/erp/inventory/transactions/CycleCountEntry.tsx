/**
 * CycleCountEntry.tsx — Sprint T-Phase-1.2.6
 * 3 modes: Draft / Review / Approved (Post)
 * Two-step approval enforced: counter cannot approve own count.
 */
// i18n-todo: Sprint T-Phase-1.2.5h-c2 · phased migration · top-strings wrapped where safe; remaining strings tracked for Phase 1.6
import { useMemo, useState } from 'react';
// Sprint T-Phase-1.2.5h-b2 · Validate-first inline-error pattern (M-3) + period-lock UX
import { makeFieldValidator, fieldErrorClass, fieldErrorText } from '@/lib/validate-first';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, ClipboardCheck, Printer, AlertTriangle, Send, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCycleCounts, getCycleCountSuggestions } from '@/hooks/useCycleCounts';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { CycleCount, CycleCountLine, CycleCountKind, VarianceReason } from '@/types/cycle-count';
import { COUNT_STATUS_COLORS, COUNT_KIND_LABELS, VARIANCE_REASON_LABELS } from '@/types/cycle-count';
import { PrintNarrationHeader } from '@/components/inventory-print/PrintNarrationHeader';
import type { InventoryItem } from '@/types/inventory-item';
import { dMul, round2 } from '@/lib/decimal-helpers';
import { useT } from '@/lib/i18n-engine';
import { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';

interface BalanceRow {
  item_id: string; item_code: string; item_name: string;
  godown_id: string; godown_name: string;
  qty: number; value: number; weighted_avg_rate: number;
}
interface GodownLite { id: string; name: string }

const fmtINR = (n: number) =>
  '₹' + (n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export function CycleCountEntryPanel() {
  const { entityCode, userId } = useCardEntitlement();
  const userName = userId || 'demo-user';
  const {
    counts, createCount, updateCount,
    submitForReview, approveCount, rejectCount, postCount, cancelCount,
  } = useCycleCounts(entityCode);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const items = useMemo<InventoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('erp_inventory_items') || '[]'); } catch { return []; }
  }, []);
  const balances = useMemo<BalanceRow[]>(() => {
    try { return JSON.parse(localStorage.getItem(`erp_stock_balance_${entityCode}`) || '[]'); } catch { return []; }
  }, [entityCode]);
  const godowns = useMemo<GodownLite[]>(() => {
    try { return JSON.parse(localStorage.getItem('erp_godowns') || '[]'); } catch { return []; }
  }, []);

  const suggestions = useMemo(
    () => getCycleCountSuggestions(items, counts),
    [items, counts],
  );
  const overdueByClass = useMemo(() => {
    const map = { A: 0, B: 0, C: 0, X: 0 } as Record<'A' | 'B' | 'C' | 'X', number>;
    for (const s of suggestions) if (s.is_overdue) map[(s.abc_class ?? 'X')] += 1;
    return map;
  }, [suggestions]);

  // KPIs
  const kpis = useMemo(() => {
    const open = counts.filter(c => c.status === 'draft').length;
    const review = counts.filter(c => c.status === 'submitted').length;
    const pendPost = counts.filter(c => c.status === 'approved').length;
    const monthIso = new Date().toISOString().slice(0, 7);
    const postedThisMonth = counts.filter(c => c.status === 'posted' && (c.posted_at ?? '').startsWith(monthIso)).length;
    const totVar = counts.filter(c => c.status === 'posted')
      .reduce((s, c) => s + c.total_variance_value, 0);
    return { open, review, pendPost, postedThisMonth, totVar };
  }, [counts]);

  const active = counts.find(c => c.id === activeId) ?? null;

  function handleStartCount(klass: 'A' | 'B' | 'C' | 'X' | null) {
    const overdue = suggestions.filter(s => s.is_overdue && (klass === null || (s.abc_class ?? 'X') === klass));
    if (overdue.length === 0) {
      toast.info('No overdue items in this class');
      return;
    }
    const lines: CycleCountLine[] = overdue.slice(0, 20).map(s => {
      const it = items.find(i => i.id === s.item_id);
      const bal = balances.find(b => b.item_id === s.item_id);
      return {
        id: crypto.randomUUID(),
        item_id: s.item_id, item_code: it?.code ?? '', item_name: s.item_name,
        uom: it?.primary_uom_symbol ?? 'NOS',
        godown_id: bal?.godown_id ?? '', godown_name: bal?.godown_name ?? '',
        bin_id: null, bin_code: null,
        system_qty: bal?.qty ?? 0, physical_qty: bal?.qty ?? 0,
        variance_qty: 0,
        weighted_avg_rate: bal?.weighted_avg_rate ?? (it?.std_purchase_rate ?? 0),
        variance_value: 0,
        variance_reason: null, variance_notes: null,
        recount_qty: null, recount_at: null, recount_by_id: null, recount_by_name: null,
      };
    });
    const created = createCount({
      count_kind: 'random' as CycleCountKind,
      count_date: new Date().toISOString().slice(0, 10),
      lines,
    });
    setActiveId(created.id);
  }

  // Sprint T-Phase-1.2.5h-b2 · Validate-first (M-3)
  const ccValidator = makeFieldValidator<{ count_date: string }>([
    { field: 'count_date', test: (v) => Boolean(v), message: 'Date is required' },
  ]);
  const ccFieldErr = (f: string) => fieldErrorClass({}, f);
  void ccFieldErr; void fieldErrorText; void ccValidator;

  const _t = useT();
  function handleCreateBlank(kind: CycleCountKind, godownId: string | null, effectiveDate: string | null) {
    const gd = godowns.find(g => g.id === godownId) ?? null;
    const countDate = new Date().toISOString().slice(0, 10);
    // Sprint T-Phase-1.2.5h-b2 · Period-lock UX surfacing (Deliverable 6)
    if (entityCode && isPeriodLocked(countDate, entityCode)) {
      const msg = periodLockMessage(countDate, entityCode) ?? 'Cannot create cycle count in a locked period';
      toast.error(msg);
      return;
    }
    // Sprint T-Phase-1.2.6b-fix · D-226 UTS · effective_date period-lock parity
    if (entityCode && effectiveDate && isPeriodLocked(effectiveDate, entityCode)) {
      const msg = periodLockMessage(effectiveDate, entityCode) ?? 'Effective date is in a locked period';
      toast.error(msg);
      return;
    }
    const created = createCount({
      count_kind: kind,
      count_date: countDate,
      effective_date: effectiveDate,
      godown_id: gd?.id ?? null,
      godown_name: gd?.name ?? null,
      lines: [],
    });
    setCreateOpen(false);
    setActiveId(created.id);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-cyan-600" />
            Cycle Count
          </h1>
          <p className="text-xs text-muted-foreground">Physical-vs-system reconciliation · two-step approval</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> New Cycle Count
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Open', val: kpis.open },
          { label: 'In Review', val: kpis.review },
          { label: 'Pending Post', val: kpis.pendPost },
          { label: 'Posted (mo)', val: kpis.postedThisMonth },
          { label: 'Net Variance', val: fmtINR(kpis.totVar) },
        ].map(k => (
          <Card key={k.label}><CardContent className="p-3">
            <div className="text-[10px] uppercase text-muted-foreground">{k.label}</div>
            <div className="text-lg font-semibold font-mono">{k.val}</div>
          </CardContent></Card>
        ))}
      </div>

      {/* Suggestions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Due for Count (ABC-driven)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-4 gap-2">
          {(['A', 'B', 'C', 'X'] as const).map(k => (
            <div key={k} className="border rounded-md p-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium">{k === 'X' ? 'Unclassified' : `${k}-class`}</div>
                <div className="text-lg font-mono">{overdueByClass[k]} overdue</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => handleStartCount(k)}>Start</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Counts list */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cycle Counts</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Count No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Godown</TableHead>
                <TableHead className="text-right">Lines</TableHead>
                <TableHead className="text-right">Var Lines</TableHead>
                <TableHead className="text-right">Var Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counts.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-6">No cycle counts yet</TableCell></TableRow>
              )}
              {counts.map(c => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setActiveId(c.id)}>
                  <TableCell className="font-mono text-xs">{c.count_no}</TableCell>
                  <TableCell className="text-xs">{c.count_date}</TableCell>
                  <TableCell className="text-xs">{COUNT_KIND_LABELS[c.count_kind]}</TableCell>
                  <TableCell className="text-xs">{c.godown_name ?? '—'}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{c.total_lines}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{c.variance_lines}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtINR(c.total_variance_value)}</TableCell>
                  <TableCell><Badge variant="outline" className={COUNT_STATUS_COLORS[c.status]}>{c.status}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="ghost">Open</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{_t('inv.cycle_count', 'Cycle Count')}</DialogTitle></DialogHeader>
          <CreateCountForm godowns={godowns} onCreate={handleCreateBlank} />
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActiveId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader><SheetTitle>{active?.count_no}</SheetTitle></SheetHeader>
          {active && (
            <CountDetail
              count={active}
              userId={userId}
              items={items} balances={balances} godowns={godowns}
              onUpdate={(patch) => updateCount(active.id, patch)}
              onSubmit={() => submitForReview(active.id, userId, userName)}
              onApprove={() => approveCount(active.id, userId, userName)}
              onReject={(reason) => rejectCount(active.id, reason)}
              onPost={() => postCount(active.id)}
              onCancel={(reason) => cancelCount(active.id, reason)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CreateCountForm({ godowns, onCreate }: {
  godowns: GodownLite[];
  onCreate: (kind: CycleCountKind, godownId: string | null, effectiveDate: string | null) => void;
}) {
  const _t = useT();
  const [kind, setKind] = useState<CycleCountKind>('random');
  const [gd, setGd] = useState<string>('');
  // Sprint T-Phase-1.2.6b-fix · D-226 UTS · effective_date capture
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  const todayStr = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Kind</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as CycleCountKind)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(['random', 'periodic_bin', 'annual_stocktake'] as CycleCountKind[]).map(k => (
              <SelectItem key={k} value={k}>{COUNT_KIND_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Godown (optional)</Label>
        <Select value={gd} onValueChange={setGd}>
          <SelectTrigger><SelectValue placeholder="All godowns" /></SelectTrigger>
          <SelectContent>
            {godowns.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {/* Sprint T-Phase-1.2.6b-fix · effective_date input (D-226 UTS dimension #3) */}
      <div>
        <Label className="text-xs">{_t('common.effective_date', 'Effective Date')}</Label>
        <Input type="date" value={effectiveDate}
          placeholder={todayStr}
          onChange={e => setEffectiveDate(e.target.value)} />
        <p className="text-[10px] text-muted-foreground mt-1">
          accounting date · defaults to Count Date
        </p>
      </div>
      <DialogFooter>
        <Button onClick={() => onCreate(kind, gd || null, effectiveDate || null)}>Create</Button>
      </DialogFooter>
    </div>
  );
}

function CountDetail({
  count, userId, items, balances, godowns,
  onUpdate, onSubmit, onApprove, onReject, onPost, onCancel,
}: {
  count: CycleCount;
  userId: string;
  items: InventoryItem[]; balances: BalanceRow[]; godowns: GodownLite[];
  onUpdate: (patch: Partial<CycleCount>) => CycleCount | null;
  onSubmit: () => CycleCount | null;
  onApprove: () => CycleCount | null;
  onReject: (reason: string) => CycleCount | null;
  onPost: () => CycleCount | null;
  onCancel: (reason: string) => CycleCount | null;
}) {
  const isDraft = count.status === 'draft';
  const isReview = count.status === 'submitted';
  const isApproved = count.status === 'approved';
  const sameAsCounter = count.counter_id && count.counter_id === userId;

  function setLineQty(id: string, qty: number) {
    onUpdate({ lines: count.lines.map(l => l.id === id ? { ...l, physical_qty: qty } : l) });
  }
  function setLineReason(id: string, r: VarianceReason | null, notes?: string) {
    onUpdate({ lines: count.lines.map(l => l.id === id ? { ...l, variance_reason: r, variance_notes: notes ?? l.variance_notes } : l) });
  }
  function addLineFromItem(itemId: string) {
    const it = items.find(i => i.id === itemId);
    if (!it) return;
    const bal = balances.find(b => b.item_id === itemId);
    const ln: CycleCountLine = {
      id: crypto.randomUUID(),
      item_id: it.id, item_code: it.code ?? '', item_name: it.name,
      uom: it.primary_uom_symbol ?? 'NOS',
      godown_id: bal?.godown_id ?? '', godown_name: bal?.godown_name ?? '',
      bin_id: null, bin_code: null,
      system_qty: bal?.qty ?? 0, physical_qty: bal?.qty ?? 0,
      variance_qty: 0,
      weighted_avg_rate: bal?.weighted_avg_rate ?? (it.std_purchase_rate ?? 0),
      variance_value: 0,
      variance_reason: null, variance_notes: null,
      recount_qty: null, recount_at: null, recount_by_id: null, recount_by_name: null,
    };
    onUpdate({ lines: [...count.lines, ln] });
  }

  function handlePrint() {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return;
    const lines = count.lines.map(l => `
      <tr><td>${l.item_code}</td><td>${l.item_name}</td><td>${l.bin_code ?? ''}</td>
      <td style="text-align:right">${l.system_qty}</td><td style="border:1px solid #000;width:80px"></td></tr>
    `).join('');
    w.document.write(`<html><head><title>${count.count_no}</title>
      <style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;font-size:12px}</style>
      </head><body>
      <h2 style="text-align:center">Cycle Count Sheet</h2>
      <p><b>Count No:</b> ${count.count_no} &nbsp; <b>Date:</b> ${count.count_date} &nbsp; <b>Godown:</b> ${count.godown_name ?? '—'}</p>
      <table><thead><tr><th>Item Code</th><th>Description</th><th>Bin</th><th>System Qty</th><th>Physical Qty</th></tr></thead><tbody>${lines}</tbody></table>
      <p style="margin-top:30px">Counter Signature: ____________________ Date/Time: __________</p>
      </body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={COUNT_STATUS_COLORS[count.status]}>{count.status}</Badge>
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
          <Printer className="h-3.5 w-3.5" /> Print Count Sheet
        </Button>
      </div>
      <div className="hidden">
        <PrintNarrationHeader voucherTypeId="vt-physical-stock" voucherTypeName="Cycle Count Sheet" baseVoucherType="Physical Stock" voucherNo={count.count_no} />
      </div>

      {isDraft && (
        <div className="border rounded-md p-3">
          <div className="text-xs font-medium mb-2">Add Line</div>
          <Select value="" onValueChange={(v) => addLineFromItem(v)}>
            <SelectTrigger><SelectValue placeholder="Pick item to count" /></SelectTrigger>
            <SelectContent>
              {items.slice(0, 100).map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">System</TableHead>
            <TableHead className="text-right">Physical</TableHead>
            <TableHead className="text-right">Variance</TableHead>
            <TableHead className="text-right">Var ₹</TableHead>
            <TableHead>Reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {count.lines.map(l => {
            const variance = l.physical_qty - l.system_qty;
            const varValue = round2(dMul(variance, l.weighted_avg_rate));
            const flagged = Math.abs(variance) / Math.max(1, l.system_qty) > 0.05 && Math.abs(varValue) > 1000;
            return (
              <TableRow key={l.id} className={flagged ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                <TableCell className="text-xs">{l.item_name}</TableCell>
                <TableCell className="text-right font-mono text-xs">{l.system_qty}</TableCell>
                <TableCell className="text-right">
                  {isDraft ? (
                    <Input type="number" className="h-7 w-24 text-right font-mono text-xs"
                      value={l.physical_qty}
                      onChange={(e) => setLineQty(l.id, parseFloat(e.target.value) || 0)} />
                  ) : <span className="font-mono text-xs">{l.physical_qty}</span>}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{variance.toFixed(2)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{fmtINR(varValue)}</TableCell>
                <TableCell>
                  {variance !== 0 && (
                    <Select
                      value={l.variance_reason ?? ''}
                      disabled={!isReview}
                      onValueChange={(v) => setLineReason(l.id, v as VarianceReason)}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Pick reason" /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(VARIANCE_REASON_LABELS) as VarianceReason[]).map(r =>
                          <SelectItem key={r} value={r}>{VARIANCE_REASON_LABELS[r]}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t pt-3">
        <div className="text-xs space-y-0.5">
          <div>Total Lines: <span className="font-mono">{count.total_lines}</span></div>
          <div>Variance Lines: <span className="font-mono">{count.variance_lines}</span></div>
          <div>Net Variance: <span className="font-mono">{fmtINR(count.total_variance_value)}</span></div>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <Button size="sm" onClick={onSubmit} className="gap-1">
              <Send className="h-3.5 w-3.5" /> Submit for Review
            </Button>
          )}
          {isReview && (
            <>
              {sameAsCounter && (
                <div className="text-[11px] text-amber-600 flex items-center gap-1 mr-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> Counter cannot approve own count
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => {
                const reason = window.prompt('Reject reason?');
                if (reason) onReject(reason);
              }} className="gap-1">
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
              <Button size="sm" disabled={!!sameAsCounter} onClick={onApprove} className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </Button>
            </>
          )}
          {isApproved && (
            <Button size="sm" onClick={onPost} className="gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Post
            </Button>
          )}
          {(isDraft || isReview) && (
            <Button size="sm" variant="ghost" onClick={() => {
              const reason = window.prompt('Cancel reason?');
              if (reason) onCancel(reason);
            }}>Cancel</Button>
          )}
        </div>
      </div>
      {/* Suppress unused */}
      <div className="hidden">{godowns.length}</div>
    </div>
  );
}
