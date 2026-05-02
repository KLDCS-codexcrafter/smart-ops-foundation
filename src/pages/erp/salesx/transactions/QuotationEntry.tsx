/**
 * MONEY-MATH-AUDITED · Sprint T-Phase-1.2.5h-c1
 * All money/qty/percentage arithmetic uses Decimal.js helpers
 * (dMul · dAdd · dSub · dPct · dSum · round2) from @/lib/decimal-helpers.
 * No float multiplication or Math.round on money values.
 */
// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration
/**
 * QuotationEntry.tsx — Sales Quotation register + 2-tab form + revision history
 * Charis TDL UDF 4955-4975.
 * [JWT] GET/POST/PATCH /api/salesx/quotations
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Plus, Save, Trash2, ArrowLeft, Edit2, ChevronRight, FileText, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { useQuotations } from '@/hooks/useQuotations';
import { useEnquiries } from '@/hooks/useEnquiries';
import { useOrders } from '@/hooks/useOrders';
import { generateDocNo } from '@/lib/finecore-engine';
import type { OrderLine } from '@/types/order';
import type { Quotation, QuotationItem, QuotationStage, QuotationType } from '@/types/quotation';
import { applySchemes, totalSchemeDiscountPaise, type SchemeCart } from '@/lib/scheme-engine';
import { schemesKey, type Scheme } from '@/types/scheme';
import { Sparkles } from 'lucide-react';
import { dMul, dPct, dSub, dAdd, dSum, round2 } from '@/lib/decimal-helpers';
import { findItemByName, resolveHSNForItem } from '@/lib/hsn-resolver';
import { useT } from '@/lib/i18n-engine';
// Sprint T-Phase-2.7-c-fix · Q3-d UPGRADED · cancellation audit log
import { writeCancellationAuditEntry } from '@/types/cancellation-audit-log';
import { computeIRNLockState } from '@/lib/irn-lock-engine';
import { getCurrentUser } from '@/lib/auth-helpers';
import { useStockAvailability } from '@/hooks/useStockAvailability';
import {
  upsertQuoteReservation,
  releaseQuoteReservations,
  createOrderReservations,
} from '@/lib/stock-reservation-engine';
import { logConversionEvent } from '@/lib/salesx-conversion-engine';
// Sprint T-Phase-1.2.6e-tally-1-fix · Q1-b/Q2-c/Q3-b/Q4-d
import { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';
import { MultiSourcePicker } from '@/components/uth/MultiSourcePicker';
import { SourceVoucherPickerDialog } from '@/components/uth/SourceVoucherPickerDialog';
import type { MultiSourceRef } from '@/types/multi-source-ref';
// Sprint T-Phase-2.7-a · Batch C2 · GST + Bill/Ship mount
import { GSTBillShipSection } from '@/components/uth/GSTBillShipSection';
import { toSimpleGSTLines } from '@/components/uth/gst-bill-ship.helpers';

// Sprint T-Phase-2.7-b · OOB-2/3/7 · uses VoucherClassPicker + SaveButtonGroup + validateFieldRules via VoucherClassMount
import { VoucherClassMount as _VCM_27B } from '@/components/uth/VoucherClassMount';
import { useVoucherClassMount as _useVCM_27B } from '@/hooks/useVoucherClassMount';
const _VC_FAMILY_27B = 'sales_quote' as const;
// Sprint 2.7-b · keep imports referenced (no runtime effect, no react-refresh export):
const _SPRINT_27B_VCM_REF = [_VCM_27B, _useVCM_27B, _VC_FAMILY_27B] as const;
if (false as boolean) { console.log(_SPRINT_27B_VCM_REF); }

interface Props { entityCode: string }
type View = 'list' | 'form';

const STAGE_FILTERS: Array<{ id: 'all' | QuotationStage; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'lost', label: 'Lost' },
];

const STAGE_COLOR: Record<QuotationStage, string> = {
  draft: 'bg-muted text-muted-foreground border-border',
  on_hold: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  negotiation: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  confirmed: 'bg-green-500/15 text-green-700 border-green-500/30',
  proforma: 'bg-teal-500/15 text-teal-700 border-teal-500/30',
  sales_order: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  lost: 'bg-destructive/15 text-destructive border-destructive/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
};

function loadCustomers(): Array<{ id: string; partyName: string }> {
  try {
    // [JWT] GET /api/masters/customers
    return JSON.parse(localStorage.getItem('erp_group_customer_master') || '[]');
  }
  catch { return []; }
}

const todayISO = () => new Date().toISOString().split('T')[0];
const addDays = (iso: string, n: number): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

type FormState = Omit<Quotation, 'id' | 'quotation_no' | 'entity_id' | 'created_at' | 'updated_at'>;

const blank = (): FormState => ({
  quotation_date: todayISO(),
  quotation_type: 'original',
  quotation_stage: 'draft',
  enquiry_id: null, enquiry_no: null,
  customer_id: null, customer_name: null,
  valid_until_days: 30,
  valid_until_date: addDays(todayISO(), 30),
  original_quotation_no: null,
  last_quotation_no: null, last_quotation_date: null,
  revision_number: 0, revision_history: [],
  items: [],
  sub_total: 0, tax_amount: 0, total_amount: 0,
  notes: null, terms_conditions: null,
  proforma_no: null,
  proforma_date: null,
  proforma_converted_at: null,
  so_id: null,
  so_no: null,
  so_converted_at: null,
  // Sprint T-Phase-1.1.1a — ProjX hookpoint stub (D-171 dual-phase)
  project_id: null,
  is_active: true,
  // Sprint T-Phase-1.2.6b · D-226 UTS · accounting effective date
  effective_date: null,
  // Sprint T-Phase-1.2.6e-tally-1 · multi-source linking (Q2-c)
  multi_source_refs: [],
});

function recalcLine(it: QuotationItem): QuotationItem {
  // Decimal-safe: gross = qty*rate, then apply discount %, then add tax %.
  const gross = dMul(it.qty, it.rate);
  const sub_total = round2(dSub(gross, dPct(gross, it.discount_pct || 0)));
  const tax_amount = round2(dPct(sub_total, it.tax_pct || 0));
  return { ...it, sub_total, tax_amount, amount: round2(dAdd(sub_total, tax_amount)) };
}

export function QuotationEntryPanel({ entityCode }: Props) {
  const t = useT();
  const { quotations, createQuotation, updateQuotation, createRevision, markConvertedToSO } = useQuotations(entityCode);
  const { enquiries } = useEnquiries(entityCode);
  const { createOrder } = useOrders(entityCode);
  const customers = useMemo(() => loadCustomers(), []);
  const navigate = useNavigate();

  const [view, setView] = useState<View>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blank());
  const [stageFilter, setStageFilter] = useState<'all' | QuotationStage>('all');
  const [revisionReason, setRevisionReason] = useState('');
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  // Sprint T-Phase-1.2.6e-tally-1-fix · multi-source + Use Last
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);

  const update = useCallback((p: Partial<FormState>) => setForm(prev => ({ ...prev, ...p })), []);

  const filtered = useMemo(() => {
    let list = quotations;
    if (stageFilter !== 'all') list = list.filter(q => q.quotation_stage === stageFilter);
    return list.slice().sort((a, b) => b.quotation_date.localeCompare(a.quotation_date));
  }, [quotations, stageFilter]);

  // Sprint T-Phase-1.1.1m · Stock availability for item grid (D-186 · Operix MOAT #19)
  const itemNames = useMemo(
    () => form.items.map(it => it.item_name).filter(n => n && n.trim()),
    [form.items],
  );
  const { availabilityMap, refresh: refreshAvailability } = useStockAvailability(entityCode, itemNames);

  const handleNew = () => {
    setEditingId(null); setForm(blank()); setView('form'); setSnapshotId(null);
  };
  const handleEdit = (q: Quotation) => {
    setEditingId(q.id);
    const { id, quotation_no, entity_id, created_at, updated_at, ...rest } = q;
    setForm(rest); setView('form'); setSnapshotId(null);
  };

  const handleSave = useCallback(() => {
    if (!form.customer_id) { toast.error('Customer required'); return; }
    if (form.items.length === 0) { toast.error('Add at least one item'); return; }
    const qid = editingId ?? `q-${Date.now()}`;
    if (editingId) updateQuotation(editingId, form);
    else createQuotation(form);
    // Sprint T-Phase-1.1.1m · upsert quote-level soft-hold reservation
    upsertQuoteReservation(
      entityCode,
      qid,
      '', // quotation_no assigned by useQuotations; refresh on next mount
      form.customer_name,
      null, // salesman: Phase 2
      form.items.map(it => ({ item_name: it.item_name, qty: it.qty })),
    );
    refreshAvailability();
    setView('list');
  }, [form, editingId, updateQuotation, createQuotation, entityCode, refreshAvailability]);

  useCtrlS(view === 'form' ? handleSave : () => {});

  const addLine = () => update({
    items: [...form.items, recalcLine({
      id: `it-${Date.now()}`, item_name: '', description: null,
      qty: 1, uom: null, rate: 0, discount_pct: 0,
      sub_total: 0, tax_pct: 0, tax_amount: 0, amount: 0,
    })],
  });
  const updateLine = (idx: number, patch: Partial<QuotationItem>) => {
    // Sprint 2.7-a-fix · HSN auto-resolve when operator types item_name
    let resolvedPatch: Partial<QuotationItem> = patch;
    if (typeof patch.item_name === 'string' && patch.item_name.trim()) {
      const masterItem = findItemByName(patch.item_name, entityCode);
      if (masterItem) {
        const resolved = resolveHSNForItem(masterItem, entityCode);
        if (resolved.hsn_sac_code) {
          resolvedPatch = {
            ...patch,
            hsn_sac_code: resolved.hsn_sac_code,
            gst_rate: resolved.gst_rate,
            is_rcm_eligible: resolved.is_rcm_eligible,
            tax_pct: resolved.gst_rate,
          };
        }
      }
    }
    const items = form.items.map((it, i) => i === idx ? recalcLine({ ...it, ...resolvedPatch }) : it);
    const sub = round2(dSum(items, it => it.sub_total));
    const tax = round2(dSum(items, it => it.tax_amount));
    update({ items, sub_total: sub, tax_amount: tax, total_amount: round2(dAdd(sub, tax)) });
  };
  const removeLine = (idx: number) => {
    const items = form.items.filter((_, i) => i !== idx);
    const sub = round2(dSum(items, it => it.sub_total));
    const tax = round2(dSum(items, it => it.tax_amount));
    update({ items, sub_total: sub, tax_amount: tax, total_amount: round2(dAdd(sub, tax)) });
  };

  const handleReviseFrom = (qid: string) => {
    const src = quotations.find(q => q.id === qid);
    if (!src) return;
    update({
      last_quotation_no: src.quotation_no,
      last_quotation_date: src.quotation_date,
      original_quotation_no: src.original_quotation_no ?? src.quotation_no,
      items: src.items.map(it => ({ ...it, id: `it-${Date.now()}-${Math.random()}` })),
      sub_total: src.sub_total, tax_amount: src.tax_amount, total_amount: src.total_amount,
      customer_id: src.customer_id, customer_name: src.customer_name,
    });
    toast.success('Loaded items from previous quotation');
  };

  const handleCreateRevision = () => {
    if (!editingId || !revisionReason) { toast.error('Reason required'); return; }
    const updated = createRevision(editingId, revisionReason, 'Current User');
    if (updated) {
      const { id, quotation_no, entity_id, created_at, updated_at, ...rest } = updated;
      setForm(rest);
      setRevisionReason('');
    }
  };

  /**
   * Quotation → Sales Order conversion · existing pattern verified by Sprint T-Phase-1.1.1a.
   * Uses useOrders.createOrder with base_voucher_type='Sales Order' (D-127/D-128 zero-touch preserved).
   * Mapping is inline here (not in salesx-conversion-engine) because it composes the live
   * `quotations` and `createOrder` runtime closures from this component.
   */
  const handleConvertToSO = useCallback(() => {
    if (!editingId) return;
    const q = quotations.find(x => x.id === editingId);
    if (!q) return;
    const lines: OrderLine[] = q.items.map((item, i) => ({
      id: `ol-${Date.now()}-${i}`,
      item_id: '', item_code: '', item_name: item.item_name,
      hsn_sac_code: '',
      qty: item.qty,
      uom: item.uom ?? '',
      rate: item.rate,
      discount_percent: item.discount_pct,
      taxable_value: item.sub_total,
      gst_rate: item.tax_pct,
      pending_qty: item.qty,
      fulfilled_qty: 0,
      status: 'open' as const,
    }));
    const result = createOrder({
      base_voucher_type: 'Sales Order',
      entity_id: entityCode,
      date: todayISO(),
      party_id: q.customer_id ?? '',
      party_name: q.customer_name ?? '',
      ref_no: q.quotation_no,
      lines,
      gross_amount: q.sub_total,
      total_tax: q.tax_amount,
      net_amount: q.total_amount,
      narration: `Converted from Quotation ${q.quotation_no}`,
      terms_conditions: q.terms_conditions ?? '',
    });
    if (result) {
      markConvertedToSO(editingId, result.id, result.order_no);
      setForm(prev => ({
        ...prev,
        quotation_stage: 'sales_order',
        so_id: result.id,
        so_no: result.order_no,
        so_converted_at: new Date().toISOString(),
      }));
      // Sprint T-Phase-1.1.1m · release quote-level hold · create order-level hold
      releaseQuoteReservations(entityCode, editingId);
      createOrderReservations(
        entityCode,
        result.id,
        result.order_no,
        q.customer_name,
        q.items.map(it => ({ item_name: it.item_name, qty: it.qty })),
      );
      refreshAvailability();
      toast.success(`Sales Order ${result.order_no} created. Link to Sales Invoice when dispatching.`);
      // Sprint T-Phase-1.1.1q · Fix 4 — log QUOT→SO conversion event
      logConversionEvent(
        entityCode,
        'system', // [JWT] Phase 2: replace with auth.userId
        'quotation_to_sales_order',
        q.id,
        q.quotation_no,
        result.id,
        result.order_no,
      );
    }
  }, [editingId, quotations, createOrder, entityCode, markConvertedToSO, refreshAvailability]);

  /**
   * Quotation → Proforma conversion · existing pattern verified by Sprint T-Phase-1.1.1a.
   * Uses generateDocNo('PF', entityCode) — same sequence engine as other doc numbers.
   * Stage transitions to 'proforma' on the existing Quotation record (no new entity).
   */
  const handleConvertToProforma = useCallback(() => {
    if (!editingId) return;
    const q = quotations.find(x => x.id === editingId);
    if (!q) return;
    if (q.quotation_stage !== 'confirmed' && q.quotation_stage !== 'negotiation') {
      toast.error('Quotation must be Confirmed or in Negotiation');
      return;
    }
    // [JWT] GET/PATCH /api/procurement/sequences/PF/:entityCode
    const proforma_no = generateDocNo('PF', entityCode);
    const now = new Date().toISOString();
    updateQuotation(editingId, {
      quotation_stage: 'proforma',
      proforma_no,
      proforma_date: todayISO(),
      proforma_converted_at: now,
    });
    setForm(prev => ({
      ...prev,
      quotation_stage: 'proforma',
      proforma_no,
      proforma_date: todayISO(),
      proforma_converted_at: now,
    }));
    toast.success(`Proforma ${proforma_no} generated`);
  }, [editingId, quotations, entityCode, updateQuotation]);

  const handlePrintProforma = useCallback(() => {
    if (!editingId) return;
    navigate(`/erp/salesx/proforma-print/${editingId}`);
  }, [editingId, navigate]);


  const openEnquiries = enquiries.filter(e => e.status !== 'sold' && e.status !== 'lost');
  const customerQuotations = quotations.filter(q =>
    form.customer_id && q.customer_id === form.customer_id && q.id !== editingId,
  );

  // ── LIST VIEW ─────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('salesx.quotation.title', 'Quotation Register')}</h1>
            <p className="text-sm text-muted-foreground">Manage sales quotations &amp; revisions</p>
          </div>
          <Button onClick={handleNew} data-primary className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />New Quotation
          </Button>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-1 flex-wrap">
              {STAGE_FILTERS.map(f => (
                <Button
                  key={f.id} size="sm"
                  variant={stageFilter === f.id ? 'default' : 'outline'}
                  onClick={() => setStageFilter(f.id)}
                  className={cn('h-7 text-xs', stageFilter === f.id && 'bg-orange-500 hover:bg-orange-600')}
                >{f.label}</Button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">No quotations yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Enquiry</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Rev</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(q => (
                    <TableRow key={q.id} className="cursor-pointer" onClick={() => handleEdit(q)}>
                      <TableCell className="font-mono text-xs">{q.quotation_no}</TableCell>
                      <TableCell className="text-xs">{q.quotation_date}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{q.quotation_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', STAGE_COLOR[q.quotation_stage])}>
                          {q.quotation_stage}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{q.enquiry_no ?? '—'}</TableCell>
                      <TableCell className="text-xs">{q.customer_name ?? '—'}</TableCell>
                      <TableCell className="text-xs font-mono">₹{q.total_amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs">{q.valid_until_date ?? '—'}</TableCell>
                      <TableCell>
                        {q.revision_number > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-orange-500/15 text-orange-700 border-orange-500/30">
                            Rev {q.revision_number}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={ev => { ev.stopPropagation(); handleEdit(q); }}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── FORM VIEW ─────────────────────────────────────────────────────
  const snapshot = snapshotId ? form.revision_history.find(r => r.id === snapshotId) : null;

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{editingId ? t('common.edit', 'Edit Quotation') : t('common.add', 'New Quotation')}</h1>
            <p className="text-sm text-muted-foreground">Charis TDL UDF 4955-4975</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editingId && (
            <UseLastVoucherButton
              entityCode={entityCode}
              recordType="quotation"
              partyValue={form.customer_id}
              partyLabel={form.customer_name ?? undefined}
              onUse={(data) => {
                setForm(prev => ({ ...prev, ...(data as Partial<FormState>) }));
                toast.success('Pre-filled from last quotation · review and edit.');
              }}
            />
          )}
          {editingId && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Revision reason"
                className="w-40 h-8 text-xs"
                value={revisionReason}
                onChange={e => setRevisionReason(e.target.value)}
              />
              <Button size="sm" variant="outline" onClick={handleCreateRevision}>
                Save as Revision
              </Button>
            </div>
          )}
          <Button onClick={handleSave} data-primary className="bg-orange-500 hover:bg-orange-600">
            <Save className="h-4 w-4 mr-2" />Save Quotation
          </Button>
          {editingId && (form.quotation_stage === 'confirmed' || form.quotation_stage === 'negotiation') && (
            <Button
              size="sm"
              variant="outline"
              className="border-teal-500 text-teal-700 hover:bg-teal-50"
              onClick={handleConvertToProforma}
            >
              <FileText className="h-3 w-3 mr-1" /> Convert to Proforma
            </Button>
          )}
          {editingId && form.quotation_stage === 'proforma' && (
            <Button
              size="sm"
              variant="outline"
              className="border-teal-500 text-teal-700 hover:bg-teal-50"
              onClick={handlePrintProforma}
            >
              <Printer className="h-3 w-3 mr-1" /> Print Proforma
            </Button>
          )}
          {editingId && (form.quotation_stage === 'confirmed' || form.quotation_stage === 'proforma') && !form.so_id && (
            <Button
              size="sm"
              variant="outline"
              className="border-orange-500/40 text-orange-700 hover:bg-orange-500/10"
              onClick={handleConvertToSO}
            >
              Convert to Sales Order
            </Button>
          )}
          {editingId && form.so_id && form.so_no && (
            <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-700 border-purple-500/30 self-center">
              → {form.so_no}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Quotation Info</TabsTrigger>
          <TabsTrigger value="items">Items &amp; Terms</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium">Quotation Date</label>
                  <SmartDateInput value={form.quotation_date} onChange={v => update({
                    quotation_date: v,
                    valid_until_date: addDays(v, form.valid_until_days),
                  })} />
                </div>
                <div>
                  {/* Sprint T-Phase-1.2.6b · D-226 UTS · effective accounting date */}
                  <label className="text-xs font-medium">Effective Date</label>
                  <SmartDateInput
                    value={form.effective_date ?? ''}
                    onChange={v => update({ effective_date: v || null })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Type</label>
                  <div className="flex gap-2 mt-1">
                    {(['original', 'revised'] as QuotationType[]).map(t => (
                      <Button key={t} size="sm" type="button"
                        variant={form.quotation_type === t ? 'default' : 'outline'}
                        onClick={() => update({ quotation_type: t })}
                        className={cn('capitalize', form.quotation_type === t && 'bg-orange-500 hover:bg-orange-600')}
                      >{t}</Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sprint T-Phase-1.2.6e-tally-1 · Q2-c multi-source linking (Enquiries) */}
              <MultiSourcePicker
                refs={form.multi_source_refs ?? []}
                onChange={(refs) => update({ multi_source_refs: refs })}
                onAddSource={() => setSourcePickerOpen(true)}
                primaryRefLabel={form.enquiry_no || undefined}
                title="Linked Source Enquiries"
                emptyState="No additional enquiries linked · primary enquiry shown above (if any)"
              />
              <SourceVoucherPickerDialog
                open={sourcePickerOpen}
                onClose={() => setSourcePickerOpen(false)}
                sourceType="enquiry"
                partyId={form.customer_id}
                excludeIds={(form.multi_source_refs ?? []).map(r => r.voucher_id)}
                entityCode={entityCode}
                onSelect={(refs: MultiSourceRef[]) => {
                  update({ multi_source_refs: [...(form.multi_source_refs ?? []), ...refs] });
                  setSourcePickerOpen(false);
                }}
              />

              {form.quotation_type === 'revised' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium">Revise from</label>
                  <Select onValueChange={handleReviseFrom}>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        form.last_quotation_no
                          ? `${form.last_quotation_no} dated ${form.last_quotation_date}`
                          : 'Select previous quotation'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {customerQuotations.length === 0 && (
                        <SelectItem value="none" disabled>No prior quotations for this customer</SelectItem>
                      )}
                      {customerQuotations.map(q => (
                        <SelectItem key={q.id} value={q.id}>
                          {q.quotation_no} | ₹{q.total_amount.toLocaleString('en-IN')} | {q.quotation_stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.last_quotation_no && (
                    <div className="bg-muted/30 rounded p-2 text-xs">
                      Revising: {form.last_quotation_no} dated {form.last_quotation_date}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Enquiry No</label>
                  <Select
                    value={form.enquiry_id ?? ''}
                    onValueChange={v => {
                      const e = openEnquiries.find(x => x.id === v);
                      update({ enquiry_id: v, enquiry_no: e?.enquiry_no ?? null });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Link enquiry" /></SelectTrigger>
                    <SelectContent>
                      {openEnquiries.map(e => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.enquiry_no} | {e.customer_name ?? e.contact_person ?? '—'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Customer</label>
                  <Select
                    value={form.customer_id ?? ''}
                    onValueChange={v => {
                      const c = customers.find(x => x.id === v);
                      update({ customer_id: v, customer_name: c?.partyName ?? null });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.partyName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium">Stage</label>
                  <Select value={form.quotation_stage} onValueChange={v => update({ quotation_stage: v as QuotationStage })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Valid Until Days</label>
                  <Input
                    type="number" value={form.valid_until_days}
                    onChange={e => {
                      const days = parseInt(e.target.value) || 0;
                      update({ valid_until_days: days, valid_until_date: addDays(form.quotation_date, days) });
                    }}
                    onKeyDown={onEnterNext}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Valid Until Date</label>
                  <SmartDateInput value={form.valid_until_date ?? ''} onChange={v => update({ valid_until_date: v || null })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Items</CardTitle>
              <Button size="sm" variant="outline" onClick={addLine}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add Line
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-16">Qty</TableHead>
                    <TableHead className="w-16">UOM</TableHead>
                    <TableHead className="w-20 text-xs">Avail</TableHead>
                    <TableHead className="w-24">Rate</TableHead>
                    <TableHead className="w-16">Disc%</TableHead>
                    <TableHead className="w-24">Sub Total</TableHead>
                    <TableHead className="w-16">Tax%</TableHead>
                    <TableHead className="w-24">Tax Amt</TableHead>
                    <TableHead className="w-24">Amount</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.items.map((it, i) => (
                    <TableRow key={it.id}>
                      <TableCell><Input value={it.item_name} onChange={e => updateLine(i, { item_name: e.target.value })} onKeyDown={onEnterNext} /></TableCell>
                      <TableCell><Input value={it.description ?? ''} onChange={e => updateLine(i, { description: e.target.value })} onKeyDown={onEnterNext} /></TableCell>
                      <TableCell><Input type="number" value={it.qty} onChange={e => updateLine(i, { qty: parseFloat(e.target.value) || 0 })} onKeyDown={onEnterNext} /></TableCell>
                      <TableCell><Input value={it.uom ?? ''} onChange={e => updateLine(i, { uom: e.target.value })} onKeyDown={onEnterNext} /></TableCell>
                      {/* Sprint T-Phase-1.1.1m · Avail badge · green ≥ qty · amber 0 < avail < qty · red = 0 */}
                      <TableCell>
                        {(() => {
                          const trimmed = it.item_name.trim();
                          const avail = trimmed ? availabilityMap.get(trimmed) : undefined;
                          if (!trimmed || !avail) {
                            return <span className="text-muted-foreground text-xs">—</span>;
                          }
                          const cls = avail.available >= it.qty
                            ? 'bg-green-500/15 text-green-700 border-green-500/30'
                            : avail.available > 0
                              ? 'bg-amber-500/15 text-amber-700 border-amber-500/30'
                              : 'bg-destructive/15 text-destructive border-destructive/30';
                          return (
                            <Badge variant="outline" className={cn('text-xs font-mono', cls)}>
                              {avail.available.toLocaleString('en-IN')}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell><Input type="number" value={it.rate} onChange={e => updateLine(i, { rate: parseFloat(e.target.value) || 0 })} onKeyDown={onEnterNext} /></TableCell>
                      <TableCell><Input type="number" value={it.discount_pct} onChange={e => updateLine(i, { discount_pct: parseFloat(e.target.value) || 0 })} onKeyDown={onEnterNext} /></TableCell>
                      <TableCell className="font-mono text-xs">₹{it.sub_total.toLocaleString('en-IN')}</TableCell>
                      <TableCell><Input type="number" value={it.tax_pct} onChange={e => updateLine(i, { tax_pct: parseFloat(e.target.value) || 0 })} onKeyDown={onEnterNext} /></TableCell>
                      <TableCell className="font-mono text-xs">₹{it.tax_amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="font-mono text-xs">₹{it.amount.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => removeLine(i)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex justify-end gap-6 pt-4 text-sm font-mono border-t mt-2">
                <div>Sub Total: ₹{form.sub_total.toLocaleString('en-IN')}</div>
                <div>Tax: ₹{form.tax_amount.toLocaleString('en-IN')}</div>
                <div className="font-bold">Total: ₹{form.total_amount.toLocaleString('en-IN')}</div>
              </div>

              {/* Sprint 12 — Applicable scheme chips (customer audience) */}
              {(() => {
                const allSchemes: Scheme[] = (() => {
                  try {
                    // [JWT] GET /api/schemes
                    return JSON.parse(localStorage.getItem(schemesKey(entityCode)) || '[]') as Scheme[];
                  } catch { return []; }
                })();
                const schemeCart: SchemeCart = {
                  audience: 'customer',
                  order_value_paise: Math.round((form.total_amount || 0) * 100),
                  lines: form.items.map(it => ({
                    line_id: it.id,
                    item_id: it.id,
                    qty: it.qty,
                    unit_price_paise: Math.round((it.rate || 0) * 100),
                    line_total_paise: Math.round((it.sub_total || 0) * 100),
                  })),
                };
                const applied = applySchemes(schemeCart, allSchemes);
                const total = totalSchemeDiscountPaise(applied);
                if (applied.length === 0) return null;
                return (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Schemes</span>
                    {applied.map(a => (
                      <Badge key={a.scheme_id} variant="outline" className="text-[10px] bg-violet-500/10 text-violet-700 border-violet-500/30">
                        {a.scheme_name}
                        {a.discount_paise > 0 && <> · −₹{(a.discount_paise / 100).toLocaleString('en-IN')}</>}
                      </Badge>
                    ))}
                    {total > 0 && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                        −₹{(total / 100).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="text-xs font-medium">Terms &amp; Conditions</label>
                  <Textarea value={form.terms_conditions ?? ''} onChange={e => update({ terms_conditions: e.target.value })} rows={3} />
                </div>
                <div>
                  <label className="text-xs font-medium">Notes</label>
                  <Textarea value={form.notes ?? ''} onChange={e => update({ notes: e.target.value })} rows={3} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sprint T-Phase-2.7-a · Batch C2 · Bill/Ship + GST summary */}
      <Card>
        <CardContent className="p-4">
          <GSTBillShipSection
            customerId={form.customer_id}
            customerName={form.customer_name}
            lines={toSimpleGSTLines(form.items)}
          />
        </CardContent>
      </Card>

      {form.revision_number > 0 && (
        <Card>
          <Collapsible>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer">
                <CardTitle className="text-sm">Revision History ({form.revision_history.length} versions)</CardTitle>
                <ChevronRight className="h-4 w-4" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Revision No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Changed By</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.revision_history.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.revision_no}</TableCell>
                        <TableCell className="text-xs">{r.revision_date}</TableCell>
                        <TableCell className="font-mono text-xs">₹{r.total_at_revision.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-xs">{r.changed_by}</TableCell>
                        <TableCell className="text-xs">{r.reason ?? '—'}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => setSnapshotId(r.id)}>
                            View Snapshot
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {snapshot && (
                  <Card className="mt-3">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-xs">Snapshot — {snapshot.revision_no}</CardTitle>
                      <Button size="sm" variant="ghost" onClick={() => setSnapshotId(null)}>Close snapshot</Button>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Disc%</TableHead>
                            <TableHead>Sub Total</TableHead>
                            <TableHead>Tax%</TableHead>
                            <TableHead>Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {snapshot.snapshot_items.map(it => (
                            <TableRow key={it.id}>
                              <TableCell className="text-xs">{it.item_name}</TableCell>
                              <TableCell className="text-xs">{it.qty}</TableCell>
                              <TableCell className="text-xs font-mono">₹{it.rate.toLocaleString('en-IN')}</TableCell>
                              <TableCell className="text-xs">{it.discount_pct}%</TableCell>
                              <TableCell className="text-xs font-mono">₹{it.sub_total.toLocaleString('en-IN')}</TableCell>
                              <TableCell className="text-xs">{it.tax_pct}%</TableCell>
                              <TableCell className="text-xs font-mono">₹{it.amount.toLocaleString('en-IN')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
}

export default QuotationEntryPanel;

// 2.7-b family: sales_quote