/**
 * @file     BillSettlement.tsx
 * @purpose  Post-hoc Bill Settlement screen — split-pane drag-drop UI to apply
 *           on-account vendor advances against open Purchase Invoices.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-T8.3-AdvanceIntel · Group B Sprint B.3
 * @whom     Operators settling advances post-hoc (no approval routing yet)
 *
 * INDUSTRY FIRST: most Indian SME ERPs require a manual Journal entry to
 * settle an On-Account Payment after the fact. B.3 lets the operator drag
 * the advance row onto the invoice row · we then update the source
 * Payment voucher's bill_references AND the AdvanceEntry adjustments in
 * one atomic call · with full audit trail.
 *
 * Drag-drop uses HTML5 native API (no @dnd-kit · zero new deps).
 * Checkbox + Apply fallback also provided for accessibility / mobile.
 *
 * [DEFERRED · Support & Back Office] approval routing · maker-checker ·
 *   notifications. See: /Future_Task_Register_Support_BackOffice.md
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Wallet, FileText, ArrowRight, CheckCircle2, Sparkles, History, RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  getUnmatchedAdvancesAllVendors,
  getOpenInvoicesForVendor,
  suggestAdvanceMatches,
} from '@/lib/advance-tagger-engine';
import {
  applyAdvanceToInvoice,
  getSettlementHistory,
  reverseSettlement,
} from '@/lib/bill-settlement-engine';
import type { AdvanceEntry, AdvanceAdjustment } from '@/types/compliance';
import type { Voucher } from '@/types/voucher';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string) => {
  try { return format(parseISO(iso), 'dd MMM yyyy'); } catch { return iso; }
};

interface PendingDrop {
  advance: AdvanceEntry;
  invoice: Voucher;
  amount: number;
  notes: string;
}

export default function BillSettlement() {
  const { entityCode } = useEntityCode();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [draggedAdvanceId, setDraggedAdvanceId] = useState<string | null>(null);
  const [hoverInvoiceId, setHoverInvoiceId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingDrop | null>(null);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [pendingNotes, setPendingNotes] = useState('');

  const groupedAdvances = useMemo(() => {
    if (!entityCode) return new Map<string, AdvanceEntry[]>();
    return getUnmatchedAdvancesAllVendors(entityCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, refreshKey]);

  const vendorIds = useMemo(
    () => Array.from(groupedAdvances.keys()),
    [groupedAdvances],
  );

  // Auto-select first vendor when list loads
  useEffect(() => {
    if (!selectedVendorId && vendorIds.length > 0) {
      setSelectedVendorId(vendorIds[0]);
    }
    if (selectedVendorId && !vendorIds.includes(selectedVendorId)) {
      setSelectedVendorId(vendorIds[0] ?? '');
    }
  }, [vendorIds, selectedVendorId]);

  const invoices = useMemo(() => {
    if (!entityCode || !selectedVendorId) return [] as Voucher[];
    return getOpenInvoicesForVendor(entityCode, selectedVendorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, selectedVendorId, refreshKey]);

  const suggestions = useMemo(() => {
    if (!entityCode) return [];
    return suggestAdvanceMatches(entityCode, selectedVendorId || undefined).slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, selectedVendorId, refreshKey]);

  const history = useMemo<AdvanceAdjustment[]>(() => {
    if (!entityCode) return [];
    return getSettlementHistory(entityCode).slice(-10).reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, refreshKey]);

  const advancesForVendor = selectedVendorId
    ? groupedAdvances.get(selectedVendorId) ?? []
    : [];

  // ── Drag handlers ──────────────────────────────────────────────
  const handleDragStart = useCallback((advanceId: string) => {
    setDraggedAdvanceId(advanceId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedAdvanceId(null);
    setHoverInvoiceId(null);
  }, []);

  const handleDrop = useCallback((invoice: Voucher) => {
    if (!draggedAdvanceId) return;
    const adv = advancesForVendor.find(a => a.id === draggedAdvanceId);
    if (!adv) return;
    openConfirm(adv, invoice);
    setDraggedAdvanceId(null);
    setHoverInvoiceId(null);
  }, [draggedAdvanceId, advancesForVendor]);

  // ── Confirm dialog ─────────────────────────────────────────────
  const openConfirm = (advance: AdvanceEntry, invoice: Voucher) => {
    const suggested = Math.min(advance.balance_amount, invoice.net_amount);
    setPending({ advance, invoice, amount: suggested, notes: '' });
    setPendingAmount(suggested);
    setPendingNotes('');
  };

  const cancelConfirm = () => {
    setPending(null);
  };

  const confirmApply = () => {
    if (!pending || !entityCode) return;
    const result = applyAdvanceToInvoice({
      entityCode,
      advanceId: pending.advance.id,
      invoiceId: pending.invoice.id,
      amountToApply: pendingAmount,
      notes: pendingNotes || undefined,
    });
    if (!result.ok) {
      toast.error(result.errors?.[0] ?? 'Settlement failed');
      return;
    }
    if (result.noOp) {
      toast.info('Already settled with same amount (no-op)');
    } else {
      toast.success(
        `Applied ${fmt(pendingAmount)} from ${pending.advance.advance_ref_no} → ${pending.invoice.voucher_no} · balance ${fmt(result.newBalance ?? 0)}`,
      );
    }
    setPending(null);
    setRefreshKey(k => k + 1);
  };

  const handleReverse = (advanceId: string, invoiceId: string) => {
    if (!entityCode) return;
    const reason = window.prompt('Reason for reversal') ?? 'Operator reversal';
    const result = reverseSettlement(entityCode, advanceId, invoiceId, reason);
    if (!result.ok) {
      toast.error(result.errors?.[0] ?? 'Reverse failed');
      return;
    }
    toast.success('Settlement reversed');
    setRefreshKey(k => k + 1);
  };

  if (!entityCode) {
    return (
      <div className="p-6">
        <p className="text-xs text-muted-foreground">Select a company to use Bill Settlement.</p>
      </div>
    );
  }

  const selectedVendorName = advancesForVendor[0]?.party_name ?? '';

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-violet-500" />
            Bill Settlement
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Drag an advance from the left onto a Purchase Invoice on the right to settle post-hoc · idempotent · audit-trailed
          </p>
        </div>
        <Badge variant="outline" className="text-violet-600 border-violet-300">PayOut · B.3 · INDUSTRY FIRST</Badge>
      </div>

      {/* Suggestions strip */}
      {suggestions.length > 0 && (
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              Auto-match suggestions ({suggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1.5">
            {suggestions.map(s => (
              <div
                key={`${s.advance.id}-${s.invoice.id}`}
                className="flex items-center justify-between text-xs rounded-md border border-violet-500/20 bg-background/60 px-2 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono">{s.advance.advance_ref_no}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono">{s.invoice.voucher_no}</span>
                  <span className="text-muted-foreground">· {s.reason}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">score {s.matchScore}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px]"
                    onClick={() => openConfirm(s.advance, s.invoice)}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Split pane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT — unmatched advances grouped by vendor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4 text-violet-500" />
              Unmatched Advances
              <Badge variant="outline" className="text-[10px]">
                {Array.from(groupedAdvances.values()).flat().length} open
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vendorIds.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No unmatched advances. Save a Vendor Payment with purpose=Advance to create one.</p>
            ) : (
              <>
                {/* Vendor selector chips */}
                <div className="flex flex-wrap gap-1">
                  {vendorIds.map(vid => {
                    const list = groupedAdvances.get(vid) ?? [];
                    const total = list.reduce((s, a) => s + a.balance_amount, 0);
                    const name = list[0]?.party_name ?? vid;
                    const active = vid === selectedVendorId;
                    return (
                      <button
                        key={vid}
                        onClick={() => setSelectedVendorId(vid)}
                        className={cn(
                          'text-[11px] px-2 py-1 rounded-md border transition-all',
                          active
                            ? 'bg-violet-500/20 border-violet-500/40 text-violet-700 dark:text-violet-300'
                            : 'border-border hover:bg-muted/50',
                        )}
                      >
                        {name} · {fmt(total)}
                      </button>
                    );
                  })}
                </div>

                {/* Advance rows */}
                <ScrollArea className="h-[420px] pr-2">
                  <div className="space-y-1.5">
                    {advancesForVendor.map(adv => (
                      <div
                        key={adv.id}
                        draggable
                        onDragStart={() => handleDragStart(adv.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'rounded-md border bg-background/40 px-3 py-2 cursor-grab active:cursor-grabbing transition-all',
                          draggedAdvanceId === adv.id
                            ? 'opacity-40 border-violet-500/60'
                            : 'border-border hover:border-violet-500/40 hover:bg-violet-500/5',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-xs">{adv.advance_ref_no}</span>
                            <Badge variant="outline" className="text-[9px] capitalize">{adv.status}</Badge>
                          </div>
                          <span className="font-mono text-xs font-semibold">{fmt(adv.balance_amount)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                          <span>{fmtDate(adv.date)} · {adv.source_voucher_no}</span>
                          {adv.po_ref && <span>PO {adv.po_ref}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>

        {/* RIGHT — open invoices for selected vendor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-500" />
              Open Purchase Invoices
              {selectedVendorName && (
                <Badge variant="outline" className="text-[10px]">{selectedVendorName}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedVendorId ? (
              <p className="text-xs text-muted-foreground italic">Select a vendor on the left to see open invoices.</p>
            ) : invoices.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No posted Purchase Invoices for this vendor.</p>
            ) : (
              <ScrollArea className="h-[460px] pr-2">
                <div className="space-y-1.5">
                  {invoices.map(inv => (
                    <div
                      key={inv.id}
                      onDragOver={e => { e.preventDefault(); setHoverInvoiceId(inv.id); }}
                      onDragLeave={() => setHoverInvoiceId(prev => prev === inv.id ? null : prev)}
                      onDrop={() => handleDrop(inv)}
                      className={cn(
                        'rounded-md border bg-background/40 px-3 py-2 transition-all',
                        hoverInvoiceId === inv.id && draggedAdvanceId
                          ? 'border-violet-500/60 bg-violet-500/10 ring-2 ring-violet-500/30'
                          : 'border-border',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs">{inv.voucher_no}</span>
                          {inv.vendor_bill_no && (
                            <Badge variant="outline" className="text-[9px]">Bill {inv.vendor_bill_no}</Badge>
                          )}
                        </div>
                        <span className="font-mono text-xs font-semibold">{fmt(inv.net_amount)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                        <span>{fmtDate(inv.date)}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 text-[10px] px-2"
                          onClick={() => {
                            const adv = advancesForVendor[0];
                            if (adv) openConfirm(adv, inv);
                          }}
                          disabled={advancesForVendor.length === 0}
                        >
                          Apply first advance
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent settlements / history */}
      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-violet-500" />
              Recent Settlements ({history.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {history.map((adj, i) => (
              <div
                key={`${adj.invoice_id}-${adj.date}-${i}`}
                className="flex items-center justify-between text-xs rounded-md border border-border bg-background/40 px-2 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span className="font-mono">{adj.invoice_no}</span>
                  <span className="text-muted-foreground">· {fmtDate(adj.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{fmt(adj.amount_adjusted)}</span>
                  {/* Reverse needs both ids · we look up via flat advance scan */}
                  <ReverseButton
                    invoiceId={adj.invoice_id}
                    onReverse={(advId) => handleReverse(advId, adj.invoice_id)}
                    entityCode={entityCode}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Confirm Apply dialog */}
      <Dialog open={!!pending} onOpenChange={v => { if (!v) cancelConfirm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Settlement</DialogTitle>
            <DialogDescription className="text-xs">
              Apply advance balance against this invoice. This action is idempotent and audit-trailed.
            </DialogDescription>
          </DialogHeader>
          {pending && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/30 p-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Advance</p>
                  <p className="font-mono">{pending.advance.advance_ref_no}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Balance</p>
                  <p className="font-mono font-semibold">{fmt(pending.advance.balance_amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Invoice</p>
                  <p className="font-mono">{pending.invoice.voucher_no}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Net Amount</p>
                  <p className="font-mono font-semibold">{fmt(pending.invoice.net_amount)}</p>
                </div>
              </div>
              <div>
                <Label className="text-xs">Amount to Apply (₹)</Label>
                <Input
                  type="number"
                  value={pendingAmount || ''}
                  onChange={e => setPendingAmount(Number(e.target.value))}
                  className="text-xs font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Max {fmt(Math.min(pending.advance.balance_amount, pending.invoice.net_amount))}
                </p>
              </div>
              <div>
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea
                  value={pendingNotes}
                  onChange={e => setPendingNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                  placeholder="Settlement note · audit trail"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={cancelConfirm}>Cancel</Button>
            <Button
              onClick={confirmApply}
              disabled={!pending || pendingAmount <= 0 || pendingAmount > (pending?.advance.balance_amount ?? 0)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              Apply Settlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Helper: reverse button looks up the advance that owns this adjustment
function ReverseButton({
  invoiceId,
  entityCode,
  onReverse,
}: {
  invoiceId: string;
  entityCode: string;
  onReverse: (advanceId: string) => void;
}) {
  const advanceId = useMemo(() => {
    try {
      const raw = localStorage.getItem(`erp_advances_${entityCode}`);
      const advs: Array<{ id: string; adjustments: Array<{ invoice_id: string }> }> =
        raw ? JSON.parse(raw) : [];
      return advs.find(a => a.adjustments.some(adj => adj.invoice_id === invoiceId))?.id ?? '';
    } catch { return ''; }
  }, [invoiceId, entityCode]);

  if (!advanceId) return null;
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-5 text-[10px] px-1.5"
      onClick={() => onReverse(advanceId)}
      title="Reverse settlement"
    >
      <RotateCcw className="h-3 w-3" />
    </Button>
  );
}
