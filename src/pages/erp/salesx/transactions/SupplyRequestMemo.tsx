/**
 * SupplyRequestMemo.tsx — Supply Request Memo (SRM) entry · SalesX Hub
 * Sprint T-Phase-1.1.1n. Memo is the authorization; Delivery Note is the goods movement.
 * [JWT] GET/POST/PATCH /api/salesx/supply-request-memos
 *
 * D-127/D-128 ZERO-TOUCH: This component NEVER posts vouchers · never touches voucher.ts schemas.
 * The SRM is a pure authorization document · status flow: draft → raised → acknowledged → dispatching → dispatched.
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
import { Save, Send, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { samPersonsKey, type SAMPerson } from '@/types/sam-person';
import { useOrders } from '@/hooks/useOrders';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { generateDocNo } from '@/lib/finecore-engine';
import { dSum, round2 } from '@/lib/decimal-helpers';
import { dMul, round2 } from '@/lib/decimal-helpers';
import {
  supplyRequestMemosKey,
  SRM_STATUS_LABELS,
  type SupplyRequestMemo,
  type SRMItem,
  type SRMStatus,
} from '@/types/supply-request-memo';

interface Props { entityCode: string }

const todayISO = () => new Date().toISOString().split('T')[0];

// Sprint T-Phase-1.1.2-d: SRQM doc-no now delegated to generateDocNo('SRQM', entityCode).
// Storage key (`erp_doc_seq_SRQM_${entityCode}`) and format are identical — sequences persist.

function ls<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; }
  catch { return []; }
}

const RAISE_BY_TYPES = ['salesman', 'agent', 'broker', 'reference'];

export function SupplyRequestMemoPanel({ entityCode }: Props) {
  const [memoNo] = useState(() => generateDocNo('SRQM', entityCode));
  const [memoDate, setMemoDate] = useState(todayISO());

  const persons = useMemo(() =>
    ls<SAMPerson>(samPersonsKey(entityCode)).filter(p =>
      RAISE_BY_TYPES.includes(p.person_type) && p.is_active,
    ),
  [entityCode]);
  const [raisedById, setRaisedById] = useState<string>('');

  const { orders } = useOrders(entityCode);
  const openSOs = useMemo(
    () => orders.filter(o =>
      o.base_voucher_type === 'Sales Order' &&
      o.status !== 'closed' &&
      o.status !== 'cancelled',
    ),
    [orders],
  );
  const [salesOrderId, setSalesOrderId] = useState<string>('');
  const selectedSO = useMemo(
    () => openSOs.find(o => o.id === salesOrderId) ?? null,
    [openSOs, salesOrderId],
  );

  const [expectedDispatchDate, setExpectedDispatchDate] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const [items, setItems] = useState<SRMItem[]>([]);

  // Existing memos list
  const [existingMemos, setExistingMemos] = useState<SupplyRequestMemo[]>(
    () => ls<SupplyRequestMemo>(supplyRequestMemosKey(entityCode)),
  );

  useEffect(() => {
    if (!selectedSO) { setItems([]); return; }
    const lines = (selectedSO.lines ?? []).map((l, i) => ({
      id: `srm-it-${Date.now()}-${i}`,
      item_name: l.item_name,
      description: null,
      qty: l.pending_qty > 0 ? l.pending_qty : l.qty,
      uom: l.uom,
      rate: l.rate,
      amount: round2(dMul(l.pending_qty > 0 ? l.pending_qty : l.qty, l.rate)),
    }));
    setItems(lines);
  }, [selectedSO]);

  const updateLine = (idx: number, patch: Partial<SRMItem>) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, ...patch };
      next.amount = round2(dMul(next.qty, next.rate));
      return next;
    }));
  };
  const removeLine = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const addLine = () => setItems(prev => [...prev, {
    id: `srm-it-${Date.now()}`,
    item_name: '', description: null,
    qty: 1, uom: 'NOS', rate: 0, amount: 0,
  }]);

  const totalAmount = useMemo(
    () => round2(dSum(items, it => it.amount)),
    [items],
  );

  const validate = useCallback((): string | null => {
    if (!raisedById) return 'Select the person raising this memo';
    if (!selectedSO) return 'Select a Sales Order';
    if (items.length === 0) return 'Add at least one item line';
    if (items.some(it => !it.item_name.trim())) return 'Every line must have an item name';
    if (items.some(it => it.qty <= 0)) return 'Item quantity must be positive';
    return null;
  }, [raisedById, selectedSO, items]);

  const persistMemo = useCallback((status: SRMStatus): SupplyRequestMemo | null => {
    const err = validate();
    if (err) { toast.error(err); return null; }
    const person = persons.find(p => p.id === raisedById)!;
    const so = selectedSO!;
    const now = new Date().toISOString();
    const memo: SupplyRequestMemo = {
      id: `srm-${Date.now()}`,
      entity_id: entityCode,
      memo_no: memoNo,
      memo_date: memoDate,
      sales_order_id: so.id,
      sales_order_no: so.order_no,
      customer_id: so.party_id ?? null,
      customer_name: so.party_name ?? null,
      raised_by_person_id: person.id,
      raised_by_person_name: person.display_name,
      raised_by_person_type: person.person_type,
      expected_dispatch_date: expectedDispatchDate || null,
      delivery_address: deliveryAddress.trim() || null,
      special_instructions: specialInstructions.trim() || null,
      items,
      total_amount: totalAmount,
      status,
      acknowledged_by: null,
      acknowledged_at: null,
      dispatched_at: null,
      delivery_memo_id: null,
      delivery_memo_no: null,
      created_at: now,
      updated_at: now,
    };
    const key = supplyRequestMemosKey(entityCode);
    // [JWT] GET /api/salesx/supply-request-memos
    const list = ls<SupplyRequestMemo>(key);
    list.push(memo);
    // [JWT] POST /api/salesx/supply-request-memos
    localStorage.setItem(key, JSON.stringify(list));
    setExistingMemos(list);
    setRaisedById(''); setSalesOrderId('');
    setExpectedDispatchDate(''); setDeliveryAddress(''); setSpecialInstructions('');
    setItems([]);
    return memo;
  }, [persons, raisedById, selectedSO, entityCode, memoNo, memoDate,
      expectedDispatchDate, deliveryAddress, specialInstructions,
      items, totalAmount, validate]);

  const handleSaveDraft = useCallback(() => {
    const m = persistMemo('draft');
    if (m) toast.info(`SRM ${m.memo_no} saved as draft`);
  }, [persistMemo]);

  const handleRaise = useCallback(() => {
    const m = persistMemo('raised');
    if (m) toast.success(`SRM ${m.memo_no} raised to Dispatch`);
  }, [persistMemo]);

  useCtrlS(handleRaise);

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Supply Request Memo</h1>
          <p className="text-sm text-muted-foreground">
            Authorise Dispatch to pick · pack · ship goods against a confirmed Sales Order.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">{memoNo}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Memo Header</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Raised By</CardTitle></CardHeader>
        <CardContent>
          <Label className="text-xs">Person</Label>
          <Select value={raisedById} onValueChange={setRaisedById}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select salesman / agent / broker / reference" />
            </SelectTrigger>
            <SelectContent>
              {persons.length === 0 && (
                <SelectItem value="none" disabled>No SAM persons available</SelectItem>
              )}
              {persons.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name}
                  <span className="text-muted-foreground text-[10px] ml-1 capitalize">· {p.person_type}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Against Sales Order</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={salesOrderId} onValueChange={setSalesOrderId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select open Sales Order" />
            </SelectTrigger>
            <SelectContent>
              {openSOs.length === 0 && (
                <SelectItem value="none" disabled>No open Sales Orders</SelectItem>
              )}
              {openSOs.map(o => (
                <SelectItem key={o.id} value={o.id}>
                  {o.order_no} · {o.party_name ?? '—'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSO && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-muted/30 rounded p-3">
              <div><span className="text-muted-foreground">Customer: </span>{selectedSO.party_name}</div>
              <div><span className="text-muted-foreground">SO Date: </span>{selectedSO.date}</div>
              <div><span className="text-muted-foreground">Status: </span>{selectedSO.status}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Delivery Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Expected Dispatch Date</Label>
            <SmartDateInput value={expectedDispatchDate} onChange={setExpectedDispatchDate} />
          </div>
          <div>
            <Label className="text-xs">Delivery Address</Label>
            <Input
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              onKeyDown={onEnterNext}
              className="h-9 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Special Instructions</Label>
            <Textarea
              value={specialInstructions}
              onChange={e => setSpecialInstructions(e.target.value)}
              className="min-h-[64px] text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Items</CardTitle>
          <Button size="sm" variant="outline" onClick={addLine} className="h-7 text-xs">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Select a Sales Order to pre-populate items, or add lines manually.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs w-20 text-right">Qty</TableHead>
                  <TableHead className="text-xs w-20">UOM</TableHead>
                  <TableHead className="text-xs w-28 text-right">Rate ₹</TableHead>
                  <TableHead className="text-xs w-32 text-right">Amount ₹</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, i) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <Input
                        value={it.item_name} onKeyDown={onEnterNext}
                        onChange={e => updateLine(i, { item_name: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number" min={0} step="0.01"
                        value={it.qty} onKeyDown={onEnterNext}
                        onChange={e => updateLine(i, { qty: Number(e.target.value) || 0 })}
                        className="h-8 text-xs text-right font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={it.uom ?? ''} onKeyDown={onEnterNext}
                        onChange={e => updateLine(i, { uom: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number" min={0} step="0.01"
                        value={it.rate} onKeyDown={onEnterNext}
                        onChange={e => updateLine(i, { rate: Number(e.target.value) || 0 })}
                        className="h-8 text-xs text-right font-mono"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => removeLine(i)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-orange-500/30">
        <CardContent className="pt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total memo value</p>
            <p className="text-2xl font-bold font-mono">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="h-4 w-4 mr-1" /> Save Draft
            </Button>
            <Button data-primary onClick={handleRaise}
              className="bg-orange-500 hover:bg-orange-600">
              <Send className="h-4 w-4 mr-1" /> Raise to Dispatch
            </Button>
          </div>
        </CardContent>
      </Card>

      {existingMemos.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Existing Supply Request Memos</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Memo No</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">SO</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">Amount ₹</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existingMemos.slice().reverse().map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.memo_no}</TableCell>
                    <TableCell className="text-xs">{m.memo_date}</TableCell>
                    <TableCell className="font-mono text-xs">{m.sales_order_no ?? '—'}</TableCell>
                    <TableCell className="text-xs">{m.customer_name ?? '—'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {m.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{SRM_STATUS_LABELS[m.status]}</Badge>
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

export default function SupplyRequestMemoPage() {
  return <SupplyRequestMemoPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />;
}
