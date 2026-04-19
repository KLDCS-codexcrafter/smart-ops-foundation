/**
 * DistributorCartState.tsx — Offline IndexedDB cart, submit creates a DistributorOrder.
 * Sprint 10. Reads/writes via distributor-cart-store (IndexedDB).
 * [JWT] On submit, POST /api/distributor/orders + clear cart.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Trash2, Send, Loader2, Package, AlertTriangle, CheckCircle2,
  Bookmark, BookmarkPlus, ListChecks, RotateCcw, Mic, MicOff, Sparkles,
} from 'lucide-react';
import { DistributorLayout } from '@/features/distributor/DistributorLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getDistributorSession, loadDistributors, hasRolePermission } from '@/lib/distributor-auth-engine';
import {
  getCart, setCart, clearCart, removeLine, isAvailable,
  saveTemplate, loadTemplates, deleteTemplate,
  type DistributorCartTemplate,
} from '@/lib/distributor-cart-store';
import {
  cartToOrder, nextOrderNumber, checkCreditAvailable,
} from '@/lib/distributor-order-engine';
import { formatINR } from '@/lib/india-validations';
import {
  distributorOrdersKey, type DistributorCartState, type DistributorOrder, type DistributorOrderLine,
} from '@/types/distributor-order';
import {
  isSpeechRecognitionSupported, transcribeVoice, parseVoiceOrder,
  type VoiceOrderResult,
} from '@/lib/voice-to-order-engine';
import type { InventoryItem } from '@/types/inventory-item';
import { applySchemes, totalSchemeDiscountPaise, describeUnlockGap, type SchemeCart } from '@/lib/scheme-engine';
import { schemesKey, type Scheme } from '@/types/scheme';
import { logAudit } from '@/lib/card-audit-engine';

const INDIGO = 'hsl(231 48% 58%)';
// Sprint 10: portal currently runs as 'owner' role — extend session in Sprint 11.
const CURRENT_ROLE = 'owner' as const;

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}
function setLs<T>(k: string, v: T[]): void { localStorage.setItem(k, JSON.stringify(v)); }

export function DistributorCartPanel() { return <DistributorCartPage />; }

export default function DistributorCartPage() {
  const navigate = useNavigate();
  const session = getDistributorSession();
  const [cart, setLocalCart] = useState<DistributorCartState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Sprint 10 Part D · Feature #10 — order templates state.
  const [view, setView] = useState<'cart' | 'templates'>('cart');
  const [templates, setTemplates] = useState<DistributorCartTemplate[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Sprint 11a — Voice-to-order state.
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceOrderResult | null>(null);
  const voiceSupported = isSpeechRecognitionSupported();

  const distributor = session
    ? loadDistributors(session.entity_code).find(p => p.id === session.distributor_id) ?? null
    : null;

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      if (!isAvailable()) {
        toast.error('Offline cart unavailable in this browser');
        setLocalCart(null);
      } else {
        setLocalCart(await getCart(session.distributor_id));
      }
    } finally {
      setLoading(false);
    }
  }, [session]);

  const refreshTemplates = useCallback(async () => {
    if (!session) return;
    try {
      const list = await loadTemplates(session.distributor_id);
      setTemplates(list.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    } catch { /* noop */ }
  }, [session]);

  useEffect(() => { void refresh(); void refreshTemplates(); }, [refresh, refreshTemplates]);

  if (!session || !distributor) {
    return (
      <DistributorLayout title="Cart">
        <div className="rounded-2xl border border-border/50 p-8 text-center text-sm text-muted-foreground">
          Distributor profile unavailable.
        </div>
      </DistributorLayout>
    );
  }

  const grand = cart?.lines.reduce((s, l) => s + l.total_paise, 0) ?? 0;
  const taxable = cart?.lines.reduce((s, l) => s + l.taxable_paise, 0) ?? 0;
  const tax = cart?.lines.reduce((s, l) => s + l.cgst_paise + l.sgst_paise + l.igst_paise, 0) ?? 0;

  // credit check moved below scheme calc — see netPayablePaise

  // Sprint 12 — evaluate applicable promotional schemes
  const allSchemes: Scheme[] = ls<Scheme>(schemesKey(session.entity_code));
  const schemeCart: SchemeCart = {
    audience: 'distributor',
    distributor_tier: (distributor.tier as 'gold' | 'silver' | 'bronze' | undefined) ?? undefined,
    territory_id: distributor.territory_id ?? null,
    order_value_paise: grand,
    lines: (cart?.lines ?? []).map(l => ({
      line_id: l.id,
      item_id: l.item_id,
      qty: l.qty,
      unit_price_paise: l.rate_paise,
      line_total_paise: l.total_paise,
    })),
  };
  const appliedSchemes = applySchemes(schemeCart, allSchemes);
  const schemeDiscountPaise = totalSchemeDiscountPaise(appliedSchemes);
  const netPayablePaise = Math.max(0, grand - schemeDiscountPaise);
  const unlockHints = describeUnlockGap(schemeCart, allSchemes);
  const credit = checkCreditAvailable(distributor, netPayablePaise);

  const handleQtyChange = async (lineId: string, qty: number) => {
    if (!cart) return;
    const next = { ...cart, lines: cart.lines.map(l => {
      if (l.id !== lineId) return l;
      const newQty = Math.max(1, qty);
      const ratio = newQty / l.qty;
      return {
        ...l,
        qty: newQty,
        taxable_paise: Math.round(l.taxable_paise * ratio),
        cgst_paise: Math.round(l.cgst_paise * ratio),
        sgst_paise: Math.round(l.sgst_paise * ratio),
        igst_paise: Math.round(l.igst_paise * ratio),
        total_paise: Math.round(l.total_paise * ratio),
      };
    })};
    await setCart(next);
    setLocalCart(next);
  };

  const handleRemove = async (itemId: string) => {
    const updated = await removeLine(session.distributor_id, itemId);
    setLocalCart(updated);
    toast.success('Line removed');
  };

  const handleNotes = async (notes: string) => {
    if (!cart) return;
    const next = { ...cart, notes };
    await setCart(next);
    setLocalCart(next);
  };

  const handleAddress = async (delivery_address: string) => {
    if (!cart) return;
    const next = { ...cart, delivery_address };
    await setCart(next);
    setLocalCart(next);
  };

  const handleSubmit = async () => {
    if (!cart || cart.lines.length === 0) return;
    if (!credit.ok) {
      toast.error('Credit limit exceeded', {
        description: `Order would exceed limit by ${formatINR(credit.would_exceed_by_paise)}`,
      });
      return;
    }
    setSubmitting(true);
    try {
      const existing = ls<DistributorOrder>(distributorOrdersKey(session.entity_code));
      const orderNo = nextOrderNumber(existing);
      const order = cartToOrder(cart, distributor, orderNo);
      // [JWT] POST /api/distributor/orders
      setLs(distributorOrdersKey(session.entity_code), [order, ...existing]);

      // Persist applied schemes for SchemeEffectivenessReport
      try {
        const key = `erp_applied_schemes_${session.entity_code}`;
        const raw = localStorage.getItem(key);
        const history = raw ? JSON.parse(raw) : [];
        history.push({
          order_id: order.id,
          order_date: order.submitted_at ?? new Date().toISOString(),
          distributor_id: distributor.id,
          distributor_name: distributor.legal_name,
          order_value_paise: grand,
          discount_paise: schemeDiscountPaise,
          net_payable_paise: netPayablePaise,
          applied: appliedSchemes,
        });
        localStorage.setItem(key, JSON.stringify(history));
      } catch { /* ignore */ }

      // Log audit event (Stage 3b pipeline)
      if (appliedSchemes.length > 0) {
        logAudit({
          entityCode: session.entity_code,
          userId: session.distributor_id,
          userName: distributor.legal_name,
          cardId: 'distributor-hub',
          action: 'voucher_post',
          refType: 'order_with_schemes',
          refId: order.id,
          refLabel: `${appliedSchemes.length} scheme(s) applied — saved ${formatINR(schemeDiscountPaise)}`,
        });
      }

      await clearCart(session.distributor_id);
      toast.success(`Order ${orderNo} submitted`, {
        description: 'Awaiting accountant approval at the ERP.',
      });
      navigate('/erp/distributor/dashboard');
    } catch (e) {
      toast.error('Could not submit order', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Templates (Sprint 10 Part D · Feature #10) ──
  const handleSaveTemplate = async () => {
    if (!cart || cart.lines.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    const name = templateName.trim();
    if (!name) { toast.error('Name required'); return; }
    try {
      const tpl: DistributorCartTemplate = {
        id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        distributor_party_id: session.distributor_id,
        name,
        lines: cart.lines.map(l => ({ ...l })),
        created_at: new Date().toISOString(),
        last_used_at: null,
        use_count: 0,
      };
      await saveTemplate(tpl);
      await refreshTemplates();
      setSaveOpen(false);
      setTemplateName('');
      toast.success(`Template "${name}" saved`);
    } catch (e) {
      toast.error('Could not save template', { description: e instanceof Error ? e.message : 'Storage error' });
    }
  };

  const handleApplyTemplate = async (tpl: DistributorCartTemplate) => {
    if (cart && cart.lines.length > 0 &&
        !window.confirm(`Cart already has ${cart.lines.length} item(s). Replace with template "${tpl.name}"?`)) {
      return;
    }
    try {
      const next: DistributorCartState = {
        id: session.distributor_id,
        partner_id: session.distributor_id,
        entity_code: session.entity_code,
        lines: tpl.lines.map(l => ({ ...l, id: `pol_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` })),
        notes: cart?.notes ?? '',
        delivery_address: cart?.delivery_address ?? '',
        expected_delivery_date: cart?.expected_delivery_date ?? null,
        updated_at: new Date().toISOString(),
      };
      await setCart(next);
      setLocalCart(next);
      // Bump usage counters
      await saveTemplate({
        ...tpl,
        last_used_at: new Date().toISOString(),
        use_count: tpl.use_count + 1,
      });
      await refreshTemplates();
      setView('cart');
      toast.success(`Applied "${tpl.name}"`, { description: `${tpl.lines.length} line(s) loaded` });
    } catch (e) {
      toast.error('Could not apply template', { description: e instanceof Error ? e.message : 'Storage error' });
    }
  };

  const handleDeleteTemplate = async (tpl: DistributorCartTemplate) => {
    if (!window.confirm(`Delete template "${tpl.name}"?`)) return;
    try {
      await deleteTemplate(tpl.id);
      await refreshTemplates();
      toast.success('Template deleted');
    } catch { toast.error('Failed to delete'); }
  };

  // ── Voice-to-Order (Sprint 11a) ─────────────────────────────────────────
  const startVoice = async () => {
    if (!voiceSupported) {
      toast.error('Voice not supported on this browser');
      return;
    }
    setVoiceOpen(true);
    setVoiceResult(null);
    setListening(true);
    try {
      const transcript = await transcribeVoice('en-IN');
      // [JWT] GET /api/inventory/items
      const items = ls<InventoryItem>('erp_inventory_items');
      const parsed = parseVoiceOrder(transcript, items);
      setVoiceResult(parsed);
      if (parsed.lines.length === 0) toast.message('Nothing recognised — try again');
    } catch (e) {
      toast.error('Voice failed', { description: e instanceof Error ? e.message : String(e) });
      setVoiceOpen(false);
    } finally {
      setListening(false);
    }
  };

  const handleApplyVoiceLines = async () => {
    if (!voiceResult || !session) return;
    const matched = voiceResult.lines.filter(l => l.item_id);
    if (matched.length === 0) {
      toast.error('No matched items to add');
      return;
    }
    // [JWT] GET /api/inventory/items
    const items = ls<InventoryItem>('erp_inventory_items');
    const newLines: DistributorOrderLine[] = matched.map(vl => {
      const it = items.find(i => i.id === vl.item_id);
      const ratePaise = 0;
      const taxable = ratePaise * vl.quantity;
      return {
        id: `pol_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        item_id: vl.item_id ?? '',
        item_code: it?.code ?? '',
        item_name: vl.item_name_matched ?? it?.name ?? 'Unknown',
        uom: it?.primary_uom_symbol ?? 'NOS',
        qty: vl.quantity,
        rate_paise: ratePaise,
        discount_percent: 0,
        taxable_paise: taxable,
        cgst_paise: 0,
        sgst_paise: 0,
        igst_paise: 0,
        total_paise: taxable,
        hsn_sac: null,
      };
    });
    const base: DistributorCartState = cart ?? {
      id: session.distributor_id,
      partner_id: session.distributor_id,
      entity_code: session.entity_code,
      lines: [],
      notes: '',
      delivery_address: '',
      expected_delivery_date: null,
      updated_at: new Date().toISOString(),
    };
    const next: DistributorCartState = { ...base, lines: [...base.lines, ...newLines] };
    await setCart(next);
    setLocalCart(next);
    setVoiceOpen(false);
    setVoiceResult(null);
    toast.success(`${newLines.length} line(s) added from voice`);
  };


  if (loading) {
    return (
      <DistributorLayout title="Cart">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: INDIGO }} />
        </div>
      </DistributorLayout>
    );
  }

  // ── Templates view (Sprint 10 Part D · Feature #10) ──
  if (view === 'templates') {
    return (
      <DistributorLayout title="Cart" subtitle="My Templates">
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setView('cart')} className="gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" /> Back to Cart
            </Button>
            <h3 className="text-sm font-semibold text-foreground">My Templates</h3>
          </div>
          {templates.length === 0 ? (
            <div className="rounded-2xl border border-border/50 p-12 text-center">
              <Bookmark className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">No saved templates yet</p>
              <p className="text-xs text-muted-foreground">Save your current cart as a template to reuse later.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map(t => (
                <div key={t.id} className="rounded-2xl border border-border/50 bg-card p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-600/15 shrink-0">
                    <Bookmark className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {t.lines.length} line{t.lines.length === 1 ? '' : 's'} · used {t.use_count}×
                      {t.last_used_at && <> · last used {new Date(t.last_used_at).toLocaleDateString('en-IN')}</>}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => void handleApplyTemplate(t)}
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleDeleteTemplate(t)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DistributorLayout>
    );
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <DistributorLayout title="Cart">
        <div className="rounded-2xl border border-border/50 p-12 text-center animate-fade-in">
          <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-foreground font-medium mb-1">Your cart is empty</p>
          <p className="text-xs text-muted-foreground mb-4">Browse the catalog to add tier-priced items.</p>
          <div className="flex items-center justify-center gap-2">
            <Button onClick={() => navigate('/erp/distributor/catalog')} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Package className="h-4 w-4 mr-2" /> Open Catalog
            </Button>
            {templates.length > 0 && (
              <Button variant="outline" onClick={() => setView('templates')} className="gap-1.5">
                <ListChecks className="h-4 w-4" /> My Templates ({templates.length})
              </Button>
            )}
          </div>
        </div>
      </DistributorLayout>
    );
  }

  return (
    <DistributorLayout title="Cart" subtitle={`${cart.lines.length} item${cart.lines.length === 1 ? '' : 's'} • saved offline`}>
      {/* Sprint 10 Part D · Feature #10 — view tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setView('cart')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
            view === 'cart'
              ? 'border-indigo-600 bg-indigo-600/10 text-indigo-700 dark:text-indigo-300'
              : 'border-border/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShoppingCart className="h-3.5 w-3.5 inline mr-1.5" />
          Current Cart
        </button>
        <button
          onClick={() => setView('templates')}
          className={'px-3 py-1.5 text-xs font-semibold rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-colors'}
        >
          <ListChecks className="h-3.5 w-3.5 inline mr-1.5" />
          My Templates ({templates.length})
        </button>
        {/* Sprint 11a — voice-to-order */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => void startVoice()}
          disabled={!voiceSupported}
          className="ml-auto gap-1.5 border-indigo-600/40 text-indigo-700 hover:bg-indigo-600/10"
          title={voiceSupported ? 'Speak your order' : 'Voice not supported on this browser'}
        >
          {voiceSupported ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
          Voice Order
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in">
        {/* Lines */}
        <div className="lg:col-span-2 space-y-3">
          {cart.lines.map(l => (
            <div key={l.id} className="rounded-2xl border border-border/50 bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'hsl(231 48% 48% / 0.12)' }}>
                  <Package className="h-4 w-4" style={{ color: INDIGO }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{l.item_name}</p>
                  <p className="text-[11px] font-mono text-muted-foreground">
                    {l.item_code} • {formatINR(l.rate_paise)} / {l.uom}
                    {l.discount_percent > 0 && <> • {l.discount_percent}% off</>}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <Input
                      type="number"
                      value={l.qty}
                      onChange={e => void handleQtyChange(l.id, parseInt(e.target.value, 10) || 1)}
                      className="w-20 h-8 rounded-md text-sm font-mono"
                    />
                    <span className="text-xs text-muted-foreground">×</span>
                    <span className="text-xs font-mono text-muted-foreground">{formatINR(l.rate_paise)}</span>
                    <button
                      onClick={() => void handleRemove(l.item_id)}
                      className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold font-mono text-foreground">{formatINR(l.total_paise)}</p>
                  <p className="text-[10px] text-muted-foreground">incl. tax</p>
                </div>
              </div>
            </div>
          ))}

          <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Delivery Address</label>
              <Textarea
                rows={2}
                placeholder="Where should we deliver?"
                value={cart.delivery_address}
                onChange={e => void handleAddress(e.target.value)}
                className="rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Order Notes</label>
              <Textarea
                rows={2}
                placeholder="Any special instructions?"
                value={cart.notes}
                onChange={e => void handleNotes(e.target.value)}
                className="rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-border/50 bg-card p-5 sticky top-24">
            <h3 className="text-sm font-semibold text-foreground mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Taxable</span>
                <span className="font-mono">{formatINR(taxable)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span className="font-mono">{formatINR(tax)}</span>
              </div>
              <div className="h-px bg-border/50 my-2" />
              {schemeDiscountPaise > 0 ? (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-mono line-through">{formatINR(grand)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Scheme savings</span>
                    <span className="font-mono">−{formatINR(schemeDiscountPaise)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>Net payable</span>
                    <span className="font-mono">{formatINR(netPayablePaise)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between font-semibold text-foreground">
                  <span>Grand Total</span>
                  <span className="font-mono">{formatINR(grand)}</span>
                </div>
              )}
            </div>

            {/* Sprint 12 — Applied schemes preview */}
            {(appliedSchemes.length > 0 || unlockHints.length > 0) && (
              <div className="mt-4 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-violet-700 dark:text-violet-300 font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Schemes</span>
                </div>
                {appliedSchemes.map(a => (
                  <div key={a.scheme_id} className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{a.scheme_name}</p>
                      <p className="text-muted-foreground text-[10px]">{a.note}</p>
                    </div>
                    {a.discount_paise > 0 && (
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                        −{formatINR(a.discount_paise)}
                      </span>
                    )}
                  </div>
                ))}
                {schemeDiscountPaise > 0 && (
                  <div className="flex justify-between pt-1 border-t border-violet-500/20 font-semibold">
                    <span className="text-foreground">Total scheme savings</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">−{formatINR(schemeDiscountPaise)}</span>
                  </div>
                )}
                {unlockHints.map((h, i) => (
                  <p key={`hint-${i}`} className="text-[10px] text-muted-foreground italic">{h}</p>
                ))}
              </div>
            )}
            {/* Credit gate */}
            <div className="mt-4 rounded-lg border border-border/50 p-3 text-xs">
              {credit.ok ? (
                <div className="flex items-start gap-2" style={{ color: 'hsl(142 71% 45%)' }}>
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Within credit limit</p>
                    <p className="text-muted-foreground mt-0.5">
                      Available after this order: <span className="font-mono">{formatINR(Math.max(0, credit.available_paise - netPayablePaise))}</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Exceeds credit limit</p>
                    <p className="text-muted-foreground mt-0.5">
                      Over by <span className="font-mono">{formatINR(credit.would_exceed_by_paise)}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {hasRolePermission(CURRENT_ROLE, 'place_order') ? (
              <div className="mt-4 space-y-2">
                <Button
                  onClick={() => void handleSubmit()}
                  disabled={submitting || !credit.ok}
                  className="w-full rounded-lg gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Place Order
                </Button>
                <Button
                  onClick={() => { setTemplateName(''); setSaveOpen(true); }}
                  variant="outline"
                  className="w-full rounded-lg gap-2"
                >
                  <BookmarkPlus className="h-4 w-4" /> Save as Template
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center mt-4 py-2">
                Your role does not have permission to place orders.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Save as Template dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save cart as template</DialogTitle>
            <DialogDescription>
              Reuse this list of items later from the My Templates tab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="tpl-name" className="text-xs">Template name</Label>
            <Input
              id="tpl-name"
              autoFocus
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              placeholder="e.g. Monthly staples"
              maxLength={60}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button
              onClick={() => void handleSaveTemplate()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sprint 11a — Voice-to-Order preview */}
      <Dialog open={voiceOpen} onOpenChange={(o) => { if (!listening) setVoiceOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-indigo-600" /> Voice Order
            </DialogTitle>
            <DialogDescription>
              {listening
                ? 'Listening… speak items and quantities, e.g. "20 pcs hammer, 5 boxes nails"'
                : 'Review what we heard before adding to your cart.'}
            </DialogDescription>
          </DialogHeader>
          {listening ? (
            <div className="flex items-center justify-center py-6 text-indigo-600">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm">Listening…</span>
            </div>
          ) : voiceResult ? (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              <div className="rounded-md border border-border/50 bg-muted/30 p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Transcript</p>
                <p className="text-xs text-foreground">{voiceResult.transcript || '(empty)'}</p>
              </div>
              {voiceResult.lines.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nothing recognised. Try again.</p>
              ) : (
                voiceResult.lines.map((l, i) => (
                  <div
                    key={`${l.raw_text}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {l.item_name_matched ?? <span className="text-destructive">No match</span>}
                      </p>
                      <p className="text-muted-foreground">qty {l.quantity} · "{l.raw_text}"</p>
                    </div>
                    {l.item_id ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                  </div>
                ))
              )}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoiceOpen(false)} disabled={listening}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleApplyVoiceLines()}
              disabled={listening || !voiceResult || voiceResult.lines.every(l => !l.item_id)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Add Matched Lines
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DistributorLayout>
  );
}
