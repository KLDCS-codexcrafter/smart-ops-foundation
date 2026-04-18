/**
 * DistributorInvoices.tsx — Distributor's own SI list with EWB tracking + pay link.
 * Sprint 10. Scopes vouchers to distributor.customer_id via scopeQueryToDistributor.
 * [JWT] GET /api/erp/distributor/invoices
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, IndianRupee, Truck, ExternalLink, Download,
  ChevronDown, ChevronRight, Sparkles, AlertOctagon,
} from 'lucide-react';
import { DistributorLayout } from '@/features/distributor/DistributorLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { getDistributorSession, scopeQueryToDistributor } from '@/lib/distributor-auth-engine';
import { formatINR } from '@/lib/india-validations';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import type { InventoryItem } from '@/types/inventory-item';
import {
  disputesKey, DISPUTE_REASON_LABELS,
  type DisputeReason, type InvoiceDispute,
} from '@/types/invoice-dispute';

const INDIGO = 'hsl(231 48% 58%)';
const INDIGO_BG = 'hsl(231 48% 48% / 0.12)';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmt2 = (n: number): string =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function DistributorInvoicesPanel() { return <DistributorInvoices />; }

export default function DistributorInvoices() {
  const navigate = useNavigate();
  const session = getDistributorSession();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Sprint 11a — dispute dialog state
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeVoucher, setDisputeVoucher] = useState<Voucher | null>(null);
  const [disputeLine, setDisputeLine] = useState<VoucherInventoryLine | null>(null);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>('short_supply');
  const [receivedQty, setReceivedQty] = useState<string>('');
  const [disputeRemarks, setDisputeRemarks] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Item master so we can look up MRP for the tier-saving breakdown.
  const itemMrpMap = useMemo<Map<string, number>>(() => {
    const items = ls<InventoryItem>('erp_inventory_items');
    const m = new Map<string, number>();
    items.forEach(it => {
      if (it.mrp != null) m.set(it.id, it.mrp);
    });
    return m;
  }, []);

  const invoices = useMemo<Voucher[]>(() => {
    if (!session) return [];
    const all = ls<Voucher>(`erp_group_vouchers_${session.entity_code}`);
    const sales = all.filter(v => v.base_voucher_type === 'Sales' && v.status === 'posted');
    return scopeQueryToDistributor(sales, session)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [session]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter(v => {
      if (q && !(v.voucher_no.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [invoices, search]);

  // Sprint 10 Part D · Feature #4 — total tier saving across all visible invoices.
  const totalTierSaving = useMemo(() => {
    return invoices.reduce((s, v) => {
      const lines = v.inventory_lines ?? [];
      return s + lines.reduce((ss, l) => {
        const mrp = itemMrpMap.get(l.item_id) ?? l.rate;
        return ss + Math.max(0, (mrp - l.rate)) * l.qty;
      }, 0);
    }, 0);
  }, [invoices, itemMrpMap]);

  if (!session) {
    return <DistributorLayout title="Invoices"><div className="text-sm text-muted-foreground">Sign in.</div></DistributorLayout>;
  }

  const totalDue = invoices.reduce((s, v) => s + (v.net_amount ?? 0), 0);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Sprint 11a — open dispute dialog for a line
  const openDispute = (v: Voucher, l: VoucherInventoryLine) => {
    setDisputeVoucher(v);
    setDisputeLine(l);
    setDisputeReason('short_supply');
    setReceivedQty(String(l.qty));
    setDisputeRemarks('');
    setDisputeOpen(true);
  };

  const submitDispute = () => {
    if (!session || !disputeVoucher || !disputeLine) return;
    const remarks = disputeRemarks.trim();
    if (remarks.length < 20) {
      toast.error('Remarks must be at least 20 characters');
      return;
    }
    const recvQty = Number(receivedQty);
    if (Number.isNaN(recvQty) || recvQty < 0) {
      toast.error('Enter a valid received quantity');
      return;
    }
    setSubmittingDispute(true);
    try {
      const billed = disputeLine.qty;
      const shortQty = Math.max(0, billed - recvQty);
      const disputed = Math.round(shortQty * disputeLine.rate * 100); // paise
      const list = ls<InvoiceDispute>(disputesKey(session.entity_code));
      const yr = new Date().getFullYear();
      const yrCount = list.filter(d => d.dispute_no.includes(`/${yr}/`)).length + 1;
      const dispute: InvoiceDispute = {
        id: `dsp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        entity_id: session.entity_code,
        dispute_no: `DSP/${yr}/${String(yrCount).padStart(4, '0')}`,
        dispute_date: new Date().toISOString(),
        distributor_id: session.distributor_id,
        customer_id: session.customer_id,
        voucher_id: disputeVoucher.id,
        voucher_no: disputeVoucher.voucher_no,
        line_id: disputeLine.id,
        reason: disputeReason,
        billed_quantity: billed,
        received_quantity: recvQty,
        disputed_amount_paise: disputed,
        distributor_remarks: remarks,
        photo_urls: [],
        status: 'open',
        reviewed_by: null,
        reviewed_at: null,
        resolution_type: null,
        credit_note_voucher_id: null,
        approved_amount_paise: null,
        rejection_reason: null,
        internal_remarks: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      // [JWT] POST /api/distributor/disputes
      localStorage.setItem(disputesKey(session.entity_code), JSON.stringify([dispute, ...list]));
      toast.success(`Dispute ${dispute.dispute_no} raised`, {
        description: 'Our ops team will review shortly.',
      });
      setDisputeOpen(false);
    } catch (e) {
      toast.error('Failed to raise dispute', { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSubmittingDispute(false);
    }
  };

  const renderBreakdown = (v: Voucher, line: VoucherInventoryLine) => {
    const basePrice = itemMrpMap.get(line.item_id) ?? line.rate;
    const tierDiscount = Math.max(0, basePrice - line.rate);
    const volumeSlabSaving = 0; // Sprint 12 scheme engine
    const schemeDiscount = 0;
    const lineTotal = line.rate * line.qty;
    return (
      <div className="rounded-lg border border-border/30 bg-muted/20 p-3 mt-2 space-y-1.5 text-xs font-mono">
        <div className="flex justify-between text-muted-foreground">
          <span>Base price (MRP)</span>
          <span>₹{fmt2(basePrice)}</span>
        </div>
        <div className="flex justify-between" style={{ color: 'hsl(142 71% 45%)' }}>
          <span>− Tier discount</span>
          <span>₹{fmt2(tierDiscount)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground/70">
          <span>− Volume slab</span>
          <span>₹{fmt2(volumeSlabSaving)} <span className="text-[10px]">(Sprint 12)</span></span>
        </div>
        <div className="flex justify-between text-muted-foreground/70">
          <span>− Scheme</span>
          <span>₹{fmt2(schemeDiscount)} <span className="text-[10px]">(Sprint 12)</span></span>
        </div>
        <div className="h-px bg-border/50 my-1" />
        <div className="flex justify-between font-semibold text-foreground">
          <span>= Net per unit</span>
          <span>₹{fmt2(line.rate)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>× Quantity</span>
          <span>× {line.qty}</span>
        </div>
        <div className="flex justify-between font-bold text-foreground">
          <span>= Line total</span>
          <span>₹{fmt2(lineTotal)}</span>
        </div>
        <div className="pt-2 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openDispute(v, line)}
            className="h-7 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 font-sans"
          >
            <AlertOctagon className="h-3.5 w-3.5" /> Raise Dispute
          </Button>
        </div>
      </div>
    );
  };

  return (
    <DistributorLayout title="My Invoices" subtitle={`${invoices.length} posted • Outstanding: ${formatINR(Math.round(totalDue * 100))}`}>
      <div className="space-y-4 animate-fade-in">
        {/* Sprint 10 Part D · Feature #4 — savings banner */}
        {totalTierSaving > 0 && (
          <div className="rounded-2xl border border-indigo-600/30 bg-indigo-600/10 px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-600/15">
              <Sparkles className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-sm text-foreground">
              You saved <span className="font-mono font-bold text-indigo-600">₹{totalTierSaving.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              {' '}on these invoices through your tier pricing.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-lg"
            />
          </div>
          <div className="flex rounded-lg border border-border/50 p-0.5">
            {(['all', 'open', 'paid'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize"
                style={filter === f ? { background: INDIGO_BG, color: INDIGO } : { color: 'hsl(215 16% 47%)' }}
              >
                {f}
              </button>
            ))}
          </div>
          <Button
            onClick={() => navigate('/erp/distributor/payments')}
            className="rounded-lg gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <IndianRupee className="h-4 w-4" /> Pay Now
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/50 p-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold w-8" />
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">EWB</th>
                  <th className="px-4 py-3 font-semibold">IRN</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map(v => {
                  const isOpen = expanded.has(v.id);
                  const lines = v.inventory_lines ?? [];
                  return (
                    <Collapsible key={v.id} asChild open={isOpen} onOpenChange={() => toggle(v.id)}>
                      <>
                        <tr className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <CollapsibleTrigger asChild>
                              <button
                                className="p-1 rounded hover:bg-muted text-muted-foreground"
                                aria-label="Toggle breakdown"
                              >
                                {isOpen
                                  ? <ChevronDown className="h-3.5 w-3.5" />
                                  : <ChevronRight className="h-3.5 w-3.5" />}
                              </button>
                            </CollapsibleTrigger>
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-foreground">{v.voucher_no}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(v.date)}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                            {formatINR(Math.round((v.net_amount ?? 0) * 100))}
                          </td>
                          <td className="px-4 py-3">
                            {v.ewb_no ? (
                              <span className="inline-flex items-center gap-1 text-xs">
                                <Truck className="h-3 w-3 text-indigo-600" />
                                <span className="font-mono">{v.ewb_no.slice(-6)}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {v.irn_status === 'generated' ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{ background: 'hsl(142 71% 45% / 0.15)', color: 'hsl(142 71% 45%)' }}>
                                OK
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground capitalize">{v.irn_status ?? '—'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => navigate(`/erp/finecore/invoice-print?id=${v.id}`)}
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                                title="View PDF"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => navigate(`/erp/finecore/invoice-print?id=${v.id}&download=1`)}
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={7} className="p-0">
                            <CollapsibleContent>
                              <div className="bg-muted/10 px-4 py-3 space-y-3">
                                <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                  Show pricing breakdown — Price Breakdown
                                </p>
                                {lines.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No inventory lines on this invoice.</p>
                                ) : (
                                  lines.map(l => (
                                    <div key={l.id} className="space-y-1">
                                      <p className="text-xs font-medium text-foreground">
                                        {l.item_name} <span className="text-muted-foreground font-mono">· {l.item_code}</span>
                                      </p>
                                      {renderBreakdown(v, l)}
                                    </div>
                                  ))
                                )}
                              </div>
                            </CollapsibleContent>
                          </td>
                        </tr>
                      </>
                    </Collapsible>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sprint 11a — Raise dispute dialog */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-destructive" /> Raise Dispute
            </DialogTitle>
            <DialogDescription>
              {disputeVoucher && disputeLine && (
                <>Invoice <span className="font-mono">{disputeVoucher.voucher_no}</span> · {disputeLine.item_name}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Reason</Label>
              <Select value={disputeReason} onValueChange={(v) => setDisputeReason(v as DisputeReason)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DISPUTE_REASON_LABELS) as DisputeReason[]).map(r => (
                    <SelectItem key={r} value={r}>{DISPUTE_REASON_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Billed Qty</Label>
                <Input value={disputeLine?.qty ?? ''} disabled className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Received Qty</Label>
                <Input
                  type="number"
                  value={receivedQty}
                  onChange={e => setReceivedQty(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Remarks (min 20 characters)</Label>
              <Textarea
                rows={3}
                value={disputeRemarks}
                onChange={e => setDisputeRemarks(e.target.value)}
                placeholder="Describe what went wrong…"
              />
              <p className="text-[10px] text-muted-foreground">
                {disputeRemarks.trim().length}/20
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)} disabled={submittingDispute}>
              Cancel
            </Button>
            <Button
              onClick={submitDispute}
              disabled={submittingDispute || disputeRemarks.trim().length < 20}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DistributorLayout>
  );
}
