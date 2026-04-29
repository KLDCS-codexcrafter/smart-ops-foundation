/**
 * InvoiceMemo.tsx — Invoice/Tax Memo (IM) entry · SalesX Hub
 * Sprint T-Phase-1.1.1n. Memo is the authorization; Sales Invoice is the accounting entry.
 * [JWT] GET/POST/PATCH /api/salesx/invoice-memos
 *
 * D-127/D-128 ZERO-TOUCH: This component NEVER posts vouchers.
 * Status flow: draft → raised → invoice_posted.
 * Accounts (FineCore side · Phase 2) flips status to 'invoice_posted' after posting Sales Invoice.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Save, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { dMul, round2 } from '@/lib/decimal-helpers';
import {
  deliveryMemosKey,
  type DeliveryMemo,
} from '@/types/delivery-memo';
import {
  supplyRequestMemosKey,
  type SupplyRequestMemo,
} from '@/types/supply-request-memo';
import {
  invoiceMemosKey,
  IM_STATUS_LABELS,
  type InvoiceMemo,
  type IMItem,
  type IMStatus,
} from '@/types/invoice-memo';

interface Props { entityCode: string }

const todayISO = () => new Date().toISOString().split('T')[0];

function fyShort(): string {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${String(y).slice(2)}-${String(y + 1).slice(2)}`;
}

function nextMemoNo(entityCode: string): string {
  const key = `erp_doc_seq_IM_${entityCode}`;
  // [JWT] GET /api/salesx/sequences/IM/:entityCode
  const raw = localStorage.getItem(key);
  const seq = raw ? parseInt(raw, 10) + 1 : 1;
  // [JWT] PATCH /api/salesx/sequences/IM/:entityCode
  localStorage.setItem(key, String(seq));
  return `IM/${fyShort()}/${String(seq).padStart(4, '0')}`;
}

function ls<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; }
  catch { return []; }
}

function buildItem(srcName: string, qty: number, uom: string | null, rate: number, taxPct: number, idx: number): IMItem {
  const sub = round2(dMul(qty, rate));
  const taxAmt = round2(sub * taxPct / 100);
  return {
    id: `im-it-${Date.now()}-${idx}`,
    item_name: srcName,
    qty, uom, rate,
    discount_pct: 0,
    sub_total: sub,
    tax_pct: taxPct,
    tax_amount: taxAmt,
    amount: round2(sub + taxAmt),
  };
}

export function InvoiceMemoPanel({ entityCode }: Props) {
  const [memoNo] = useState(() => nextMemoNo(entityCode));
  const [memoDate, setMemoDate] = useState(todayISO());

  const allDMs = useMemo(
    () => ls<DeliveryMemo>(deliveryMemosKey(entityCode)),
    [entityCode],
  );
  const deliveredDMs = useMemo(
    () => allDMs.filter(m => m.status === 'delivered' || m.status === 'lr_assigned'),
    [allDMs],
  );
  const [dmId, setDmId] = useState<string>('');
  const selectedDM = useMemo(
    () => deliveredDMs.find(m => m.id === dmId) ?? null,
    [deliveredDMs, dmId],
  );

  const linkedSRM = useMemo(() => {
    if (!selectedDM?.supply_request_memo_id) return null;
    return ls<SupplyRequestMemo>(supplyRequestMemosKey(entityCode))
      .find(s => s.id === selectedDM.supply_request_memo_id) ?? null;
  }, [selectedDM, entityCode]);

  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [billingAddress, setBillingAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [narration, setNarration] = useState('');
  const [defaultTaxPct, setDefaultTaxPct] = useState(18);

  const [items, setItems] = useState<IMItem[]>([]);

  const [existingMemos, setExistingMemos] = useState<InvoiceMemo[]>(
    () => ls<InvoiceMemo>(invoiceMemosKey(entityCode)),
  );

  useEffect(() => {
    if (!selectedDM) { setItems([]); setBillingAddress(''); return; }
    setBillingAddress(selectedDM.delivery_address ?? '');
    // Hydrate items from DM (need rate from SRM)
    const srm = ls<SupplyRequestMemo>(supplyRequestMemosKey(entityCode))
      .find(s => s.id === selectedDM.supply_request_memo_id);
    setItems(selectedDM.items.map((it, i) => {
      const srmItem = srm?.items.find(si => si.item_name === it.item_name);
      const rate = srmItem?.rate ?? (it.qty > 0 ? it.amount / it.qty : 0);
      return buildItem(it.item_name, it.qty, it.uom, rate, defaultTaxPct, i);
    }));
  }, [selectedDM, entityCode, defaultTaxPct]);

  const updateLine = (idx: number, patch: Partial<IMItem>) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, ...patch };
      next.sub_total = round2(dMul(next.qty, next.rate) * (1 - next.discount_pct / 100));
      next.tax_amount = round2(next.sub_total * next.tax_pct / 100);
      next.amount = round2(next.sub_total + next.tax_amount);
      return next;
    }));
  };

  const subTotal = useMemo(
    () => +items.reduce((s, it) => s + it.sub_total, 0).toFixed(2), [items],
  );
  const taxTotal = useMemo(
    () => +items.reduce((s, it) => s + it.tax_amount, 0).toFixed(2), [items],
  );
  const grandTotal = useMemo(
    () => +items.reduce((s, it) => s + it.amount, 0).toFixed(2), [items],
  );

  const validate = useCallback((): string | null => {
    if (!selectedDM) return 'Select a delivered Delivery Memo';
    if (items.length === 0) return 'No items to invoice';
    if (items.some(it => it.qty <= 0 || it.rate <= 0)) return 'Each line needs positive qty and rate';
    return null;
  }, [selectedDM, items]);

  const persistMemo = useCallback((status: IMStatus): InvoiceMemo | null => {
    const err = validate();
    if (err) { toast.error(err); return null; }
    const dm = selectedDM!;
    const now = new Date().toISOString();
    const memo: InvoiceMemo = {
      id: `im-${Date.now()}`,
      entity_id: entityCode,
      memo_no: memoNo,
      memo_date: memoDate,
      sales_order_id: linkedSRM?.sales_order_id ?? null,
      sales_order_no: linkedSRM?.sales_order_no ?? null,
      supply_request_memo_id: dm.supply_request_memo_id,
      supply_request_memo_no: dm.supply_request_memo_no,
      delivery_memo_id: dm.id,
      delivery_memo_no: dm.memo_no,
      customer_id: dm.customer_id,
      customer_name: dm.customer_name,
      invoice_date: invoiceDate || null,
      billing_address: billingAddress.trim() || null,
      gstin: gstin.trim() || null,
      place_of_supply: placeOfSupply.trim() || null,
      items,
      sub_total: subTotal,
      tax_amount: taxTotal,
      total_amount: grandTotal,
      narration: narration.trim() || null,
      status,
      raised_by: 'salesx_user',
      invoice_voucher_id: null,
      invoice_voucher_no: null,
      invoice_posted_at: null,
      created_at: now,
      updated_at: now,
    };
    const key = invoiceMemosKey(entityCode);
    // [JWT] GET /api/salesx/invoice-memos
    const list = ls<InvoiceMemo>(key);
    list.push(memo);
    // [JWT] POST /api/salesx/invoice-memos
    localStorage.setItem(key, JSON.stringify(list));
    setExistingMemos(list);
    setDmId(''); setBillingAddress(''); setGstin(''); setPlaceOfSupply('');
    setNarration(''); setItems([]);
    return memo;
  }, [validate, selectedDM, linkedSRM, entityCode, memoNo, memoDate,
      invoiceDate, billingAddress, gstin, placeOfSupply, items,
      subTotal, taxTotal, grandTotal, narration]);

  const handleSaveDraft = useCallback(() => {
    const m = persistMemo('draft');
    if (m) toast.info(`IM ${m.memo_no} saved as draft`);
  }, [persistMemo]);
  const handleRaise = useCallback(() => {
    const m = persistMemo('raised');
    if (m) toast.success(`${m.memo_no} raised to Accounts for invoicing`);
  }, [persistMemo]);
  const handleMarkPosted = useCallback(() => {
    const m = persistMemo('invoice_posted');
    if (m) toast.success(`${m.memo_no} marked as Invoice Posted`);
  }, [persistMemo]);

  useCtrlS(handleRaise);

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoice / Tax Memo</h1>
          <p className="text-sm text-muted-foreground">
            Authorise Accounts to post the Sales Invoice voucher against a delivered Delivery Memo.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">{memoNo}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Memo Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Memo No</Label>
            <Input value={memoNo} disabled className="h-9 font-mono text-sm" />
          </div>
          <div>
            <Label className="text-xs">Memo Date</Label>
            <SmartDateInput value={memoDate} onChange={setMemoDate} />
            {memoDate && isPeriodLocked(memoDate, entityCode) && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-2 mt-1">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-[11px] text-amber-800 dark:text-amber-300">
                  <p className="font-medium">Period locked</p>
                  <p className="text-amber-700 dark:text-amber-400">
                    {periodLockMessage(memoDate, entityCode)} The downstream voucher will fail unless the period lock is lifted. You can still save this memo as a draft.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs">Invoice Date</Label>
            <SmartDateInput value={invoiceDate} onChange={setInvoiceDate} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Against Delivery Memo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={dmId} onValueChange={setDmId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select delivered Delivery Memo" />
            </SelectTrigger>
            <SelectContent>
              {deliveredDMs.length === 0 && (
                <SelectItem value="none" disabled>No delivered DMs</SelectItem>
              )}
              {deliveredDMs.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.memo_no} · {m.customer_name ?? '—'} · LR {m.lr_no ?? '—'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDM && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs bg-muted/30 rounded p-3">
              <div><span className="text-muted-foreground">SO: </span>{linkedSRM?.sales_order_no ?? '—'}</div>
              <div><span className="text-muted-foreground">SRM: </span>{selectedDM.supply_request_memo_no ?? '—'}</div>
              <div><span className="text-muted-foreground">DM: </span>{selectedDM.memo_no}</div>
              <div><span className="text-muted-foreground">Customer: </span>{selectedDM.customer_name ?? '—'}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Billing</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">GSTIN</Label>
            <Input value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())}
              onKeyDown={onEnterNext} className="h-9 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">Place of Supply</Label>
            <Input value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)}
              onKeyDown={onEnterNext} className="h-9 text-sm" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Billing Address</Label>
            <Input value={billingAddress} onChange={e => setBillingAddress(e.target.value)}
              onKeyDown={onEnterNext} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Default Tax %</Label>
            <Input type="number" min={0} step="0.01"
              value={defaultTaxPct}
              onChange={e => setDefaultTaxPct(Number(e.target.value) || 0)}
              className="h-9 text-sm font-mono" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Items</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Select a Delivery Memo to load items.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs w-16 text-right">Qty</TableHead>
                  <TableHead className="text-xs w-20">UOM</TableHead>
                  <TableHead className="text-xs w-24 text-right">Rate ₹</TableHead>
                  <TableHead className="text-xs w-20 text-right">Disc %</TableHead>
                  <TableHead className="text-xs w-28 text-right">Sub-Total ₹</TableHead>
                  <TableHead className="text-xs w-20 text-right">Tax %</TableHead>
                  <TableHead className="text-xs w-24 text-right">Tax ₹</TableHead>
                  <TableHead className="text-xs w-28 text-right">Amount ₹</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-xs">{it.item_name}</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" min={0} step="0.01" value={it.qty}
                        onChange={e => updateLine(i, { qty: Number(e.target.value) || 0 })}
                        onKeyDown={onEnterNext}
                        className="h-8 text-xs text-right font-mono" />
                    </TableCell>
                    <TableCell className="text-xs">{it.uom ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Input type="number" min={0} step="0.01" value={it.rate}
                        onChange={e => updateLine(i, { rate: Number(e.target.value) || 0 })}
                        onKeyDown={onEnterNext}
                        className="h-8 text-xs text-right font-mono" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input type="number" min={0} max={100} step="0.01" value={it.discount_pct}
                        onChange={e => updateLine(i, { discount_pct: Number(e.target.value) || 0 })}
                        onKeyDown={onEnterNext}
                        className="h-8 text-xs text-right font-mono" />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {it.sub_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input type="number" min={0} step="0.01" value={it.tax_pct}
                        onChange={e => updateLine(i, { tax_pct: Number(e.target.value) || 0 })}
                        onKeyDown={onEnterNext}
                        className="h-8 text-xs text-right font-mono" />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {it.tax_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Narration</CardTitle></CardHeader>
        <CardContent>
          <Textarea value={narration} onChange={e => setNarration(e.target.value)}
            placeholder="Notes for the Accounts team"
            className="min-h-[64px] text-sm" />
        </CardContent>
      </Card>

      <Card className="border-orange-500/30">
        <CardContent className="pt-4 flex items-center justify-between flex-wrap gap-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Sub-Total ₹{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ·
              Tax ₹{taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-2xl font-bold font-mono">
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="h-4 w-4 mr-1" /> Save Draft
            </Button>
            <Button data-primary onClick={handleRaise}
              className="bg-orange-500 hover:bg-orange-600">
              <Send className="h-4 w-4 mr-1" /> Raise to Accounts
            </Button>
            <Button variant="outline" onClick={handleMarkPosted}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Invoice Posted
            </Button>
          </div>
        </CardContent>
      </Card>

      {existingMemos.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Existing Invoice Memos</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Memo No</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">DM</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">Total ₹</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existingMemos.slice().reverse().map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.memo_no}</TableCell>
                    <TableCell className="text-xs">{m.memo_date}</TableCell>
                    <TableCell className="font-mono text-xs">{m.delivery_memo_no ?? '—'}</TableCell>
                    <TableCell className="text-xs">{m.customer_name ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {m.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{IM_STATUS_LABELS[m.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function InvoiceMemoPage() {
  return <InvoiceMemoPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />;
}
