/**
 * DeliveryMemoEntry.tsx — Delivery Memo (DM) entry · Dispatch Hub
 * Sprint T-Phase-1.1.1n. Memo is the authorization; LR is the transport record.
 * [JWT] GET/POST/PATCH /api/dispatch/delivery-memos
 *
 * D-127/D-128 ZERO-TOUCH: This component NEVER posts vouchers.
 * Status flow: draft → raised → lr_assigned → delivered.
 */
// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration
import { useState, useMemo, useCallback, useEffect } from 'react';
// Sprint T-Phase-2.7-a · Batch C2 · GST + Bill/Ship mount
import { GSTBillShipSection } from '@/components/uth/GSTBillShipSection';
import { toSimpleGSTLines } from '@/components/uth/gst-bill-ship.helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Save, Send, Truck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { useT } from '@/lib/i18n-engine';
import {
  supplyRequestMemosKey,
  type SupplyRequestMemo,
} from '@/types/supply-request-memo';
import {
  deliveryMemosKey,
  DM_STATUS_LABELS,
  type DeliveryMemo,
  type DMItem,
  type DMStatus,
} from '@/types/delivery-memo';
// Sprint T-Phase-1.2.6e-tally-1-fix · Q1-b/Q2-c/Q3-b/Q4-d
import { UseLastVoucherButton } from '@/components/uth/UseLastVoucherButton';
import { MultiSourcePicker } from '@/components/uth/MultiSourcePicker';
import { SourceVoucherPickerDialog } from '@/components/uth/SourceVoucherPickerDialog';
import type { MultiSourceRef } from '@/types/multi-source-ref';

interface Props { entityCode: string }

const todayISO = () => new Date().toISOString().split('T')[0];

function fyShort(): string {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${String(y).slice(2)}-${String(y + 1).slice(2)}`;
}

function nextMemoNo(entityCode: string): string {
  const key = `erp_doc_seq_DM_${entityCode}`;
  // [JWT] GET /api/dispatch/sequences/DM/:entityCode
  const raw = localStorage.getItem(key);
  const seq = raw ? parseInt(raw, 10) + 1 : 1;
  // [JWT] PATCH /api/dispatch/sequences/DM/:entityCode
  localStorage.setItem(key, String(seq));
  return `DM/${fyShort()}/${String(seq).padStart(4, '0')}`;
}

function ls<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]') as T[]; }
  catch { return []; }
}

export function DeliveryMemoEntryPanel({ entityCode }: Props) {
  const t = useT();
  const [memoNo] = useState(() => nextMemoNo(entityCode));
  const [memoDate, setMemoDate] = useState(todayISO());

  const [allSRMs, setAllSRMs] = useState<SupplyRequestMemo[]>(
    () => ls<SupplyRequestMemo>(supplyRequestMemosKey(entityCode)),
  );
  const pendingSRMs = useMemo(
    () => allSRMs.filter(m => m.status === 'raised' || m.status === 'acknowledged'),
    [allSRMs],
  );
  const [srmId, setSrmId] = useState<string>('');
  const selectedSRM = useMemo(
    () => pendingSRMs.find(m => m.id === srmId) ?? null,
    [pendingSRMs, srmId],
  );

  const [transporterName, setTransporterName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [lrNo, setLrNo] = useState('');
  const [lrDate, setLrDate] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [podReference, setPodReference] = useState('');

  const [items, setItems] = useState<DMItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<string>('');
  // Sprint T-Phase-1.2.6e-tally-1-fix · multi-source linking (Q2-c)
  const [multiSources, setMultiSources] = useState<MultiSourceRef[]>([]);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);

  const [existingMemos, setExistingMemos] = useState<DeliveryMemo[]>(
    () => ls<DeliveryMemo>(deliveryMemosKey(entityCode)),
  );

  useEffect(() => {
    if (!selectedSRM) { setItems([]); setDeliveryAddress(''); return; }
    setItems(selectedSRM.items.map((it, i) => ({
      id: `dm-it-${Date.now()}-${i}`,
      item_name: it.item_name,
      qty: it.qty,
      uom: it.uom,
      amount: it.amount,
    })));
    setDeliveryAddress(selectedSRM.delivery_address ?? '');
  }, [selectedSRM]);

  const totalAmount = useMemo(
    () => +items.reduce((s, it) => s + it.amount, 0).toFixed(2),
    [items],
  );

  const validate = useCallback((requireLR: boolean, requirePod: boolean): string | null => {
    if (!selectedSRM) return 'Select a Supply Request Memo';
    if (items.length === 0) return 'No items to deliver';
    if (requireLR && !lrNo.trim()) return 'LR number is required to assign LR';
    if (requirePod && !podReference.trim()) return 'POD reference is required to mark delivered';
    return null;
  }, [selectedSRM, items, lrNo, podReference]);

  const persistMemo = useCallback((status: DMStatus): DeliveryMemo | null => {
    const requireLR = status === 'lr_assigned' || status === 'delivered';
    const requirePod = status === 'delivered';
    const err = validate(requireLR, requirePod);
    if (err) { toast.error(err); return null; }
    if (memoDate && isPeriodLocked(memoDate, entityCode)) {
      toast.error(periodLockMessage(memoDate, entityCode) ?? 'Memo date is in a locked period');
      return null;
    }
    if (effectiveDate && isPeriodLocked(effectiveDate, entityCode)) {
      toast.error(periodLockMessage(effectiveDate, entityCode) ?? 'Effective date is in a locked period');
      return null;
    }
    const srm = selectedSRM!;
    const now = new Date().toISOString();
    const memo: DeliveryMemo = {
      id: `dm-${Date.now()}`,
      entity_id: entityCode,
      memo_no: memoNo,
      memo_date: memoDate,
      supply_request_memo_id: srm.id,
      supply_request_memo_no: srm.memo_no,
      customer_id: srm.customer_id,
      customer_name: srm.customer_name,
      delivery_address: deliveryAddress.trim() || null,
      transporter_name: transporterName.trim() || null,
      vehicle_no: vehicleNo.trim() || null,
      lr_no: lrNo.trim() || null,
      lr_date: lrDate || null,
      expected_delivery_date: expectedDeliveryDate || null,
      items,
      total_amount: totalAmount,
      status,
      created_by: 'dispatch_user',
      delivered_at: status === 'delivered' ? now : null,
      pod_reference: podReference.trim() || null,
      effective_date: effectiveDate || null,
      multi_source_refs: multiSources,
      created_at: now,
      updated_at: now,
    };
    const key = deliveryMemosKey(entityCode);
    // [JWT] GET /api/dispatch/delivery-memos
    const list = ls<DeliveryMemo>(key);
    list.push(memo);
    // [JWT] POST /api/dispatch/delivery-memos
    localStorage.setItem(key, JSON.stringify(list));
    setExistingMemos(list);

    // Update linked SRM → acknowledged + linkage
    const srmKey = supplyRequestMemosKey(entityCode);
    // [JWT] GET /api/salesx/supply-request-memos
    const srmList = ls<SupplyRequestMemo>(srmKey);
    const updated = srmList.map(s => s.id === srm.id ? {
      ...s,
      status: status === 'delivered' ? 'dispatched' as const : 'acknowledged' as const,
      acknowledged_by: 'dispatch_user',
      acknowledged_at: s.acknowledged_at ?? now,
      dispatched_at: status === 'delivered' ? now : s.dispatched_at,
      delivery_memo_id: memo.id,
      delivery_memo_no: memo.memo_no,
      updated_at: now,
    } : s);
    // [JWT] PATCH /api/salesx/supply-request-memos/:id
    localStorage.setItem(srmKey, JSON.stringify(updated));
    setAllSRMs(updated);

    setSrmId(''); setTransporterName(''); setVehicleNo('');
    setLrNo(''); setLrDate(''); setExpectedDeliveryDate('');
    setPodReference(''); setItems([]); setDeliveryAddress('');
    setEffectiveDate(''); setMultiSources([]);
    return memo;
  }, [validate, selectedSRM, entityCode, memoNo, memoDate,
      deliveryAddress, transporterName, vehicleNo, lrNo, lrDate,
      expectedDeliveryDate, podReference, items, totalAmount,
      effectiveDate, multiSources]);

  const handleSaveDraft = useCallback(() => {
    const m = persistMemo('draft');
    if (m) toast.info(`DM ${m.memo_no} saved as draft`);
  }, [persistMemo]);
  const handleRaise = useCallback(() => {
    const m = persistMemo('raised');
    if (m) toast.success(`DM ${m.memo_no} raised to Logistics`);
  }, [persistMemo]);
  const handleAssignLR = useCallback(() => {
    const m = persistMemo('lr_assigned');
    if (m) toast.success(`DM ${m.memo_no} · LR ${m.lr_no} assigned`);
  }, [persistMemo]);
  const handleMarkDelivered = useCallback(() => {
    const m = persistMemo('delivered');
    if (m) toast.success(`DM ${m.memo_no} marked Delivered · POD ${m.pod_reference}`);
  }, [persistMemo]);

  useCtrlS(handleRaise);

  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('dispatch.dm.title', 'Delivery Memo')}</h1>
          <p className="text-sm text-muted-foreground">
            Authorise Logistics to ship · assign LR · capture POD against a raised Supply Request Memo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UseLastVoucherButton
            entityCode={entityCode}
            recordType="delivery_memo"
            partyValue={selectedSRM?.customer_id ?? null}
            partyLabel={selectedSRM?.customer_name ?? undefined}
            onUse={(data) => {
              const d = data as Partial<DeliveryMemo>;
              if (d.transporter_name) setTransporterName(d.transporter_name);
              if (d.vehicle_no) setVehicleNo(d.vehicle_no);
              if (d.delivery_address) setDeliveryAddress(d.delivery_address);
              toast.success('Pre-filled from last delivery memo · review and edit.');
            }}
          />
          <Badge variant="outline" className="font-mono text-xs">{memoNo}</Badge>
        </div>
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
          </div>
          <div>
            {/* Sprint T-Phase-1.2.6b · D-226 UTS · effective accounting date */}
            <Label className="text-xs">Effective Date</Label>
            <SmartDateInput value={effectiveDate} onChange={setEffectiveDate} />
          </div>
        </CardContent>
      </Card>

      {/* Sprint T-Phase-1.2.6e-tally-1 · Q2-c multi-source linking (Supply Request Memos) */}
      <MultiSourcePicker
        refs={multiSources}
        onChange={setMultiSources}
        onAddSource={() => setSourcePickerOpen(true)}
        primaryRefLabel={selectedSRM?.memo_no || undefined}
        title="Linked Source SRMs"
        emptyState="No additional SRMs linked · primary SRM shown above (if any)"
      />
      <SourceVoucherPickerDialog
        open={sourcePickerOpen}
        onClose={() => setSourcePickerOpen(false)}
        sourceType="srm"
        partyId={selectedSRM?.customer_id ?? null}
        excludeIds={multiSources.map(r => r.voucher_id)}
        entityCode={entityCode}
        onSelect={(refs) => {
          setMultiSources([...multiSources, ...refs]);
          setSourcePickerOpen(false);
        }}
      />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Against Supply Request Memo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select value={srmId} onValueChange={setSrmId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select raised / acknowledged SRM" />
            </SelectTrigger>
            <SelectContent>
              {pendingSRMs.length === 0 && (
                <SelectItem value="none" disabled>No pending SRMs</SelectItem>
              )}
              {pendingSRMs.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.memo_no} · {m.customer_name ?? '—'} · ₹{m.total_amount.toLocaleString('en-IN')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSRM && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-muted/30 rounded p-3">
              <div><span className="text-muted-foreground">SO: </span>{selectedSRM.sales_order_no ?? '—'}</div>
              <div><span className="text-muted-foreground">Customer: </span>{selectedSRM.customer_name ?? '—'}</div>
              <div><span className="text-muted-foreground">Status: </span>{selectedSRM.status}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Logistics</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Transporter</Label>
            <Input value={transporterName} onChange={e => setTransporterName(e.target.value)}
              onKeyDown={onEnterNext} className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Vehicle No</Label>
            <Input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)}
              onKeyDown={onEnterNext} className="h-9 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">LR No</Label>
            <Input value={lrNo} onChange={e => setLrNo(e.target.value)}
              onKeyDown={onEnterNext} className="h-9 text-sm font-mono" />
          </div>
          <div>
            <Label className="text-xs">LR Date</Label>
            <SmartDateInput value={lrDate} onChange={setLrDate} />
          </div>
          <div>
            <Label className="text-xs">Expected Delivery Date</Label>
            <SmartDateInput value={expectedDeliveryDate} onChange={setExpectedDeliveryDate} />
          </div>
          <div>
            <Label className="text-xs">POD Reference</Label>
            <Input value={podReference} onChange={e => setPodReference(e.target.value)}
              onKeyDown={onEnterNext} className="h-9 text-sm font-mono" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Delivery Address</Label>
            <Input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)}
              onKeyDown={onEnterNext} className="h-9 text-sm" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Items (from SRM)</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              Select an SRM to load items.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs w-20 text-right">Qty</TableHead>
                  <TableHead className="text-xs w-20">UOM</TableHead>
                  <TableHead className="text-xs w-32 text-right">Amount ₹</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(it => (
                  <TableRow key={it.id}>
                    <TableCell className="text-xs">{it.item_name}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{it.qty}</TableCell>
                    <TableCell className="text-xs">{it.uom ?? '—'}</TableCell>
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

            <Card className="border-blue-500/30">
        <CardContent className="pt-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs text-muted-foreground">Total memo value</p>
            <p className="text-2xl font-bold font-mono">
              ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleSaveDraft}>
              <Save className="h-4 w-4 mr-1" /> Save Draft
            </Button>
            <Button variant="outline" onClick={handleRaise}>
              <Send className="h-4 w-4 mr-1" /> Raise
            </Button>
            <Button variant="outline" onClick={handleAssignLR}>
              <Truck className="h-4 w-4 mr-1" /> Assign LR
            </Button>
            <Button data-primary onClick={handleMarkDelivered}
              className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Delivered
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sprint T-Phase-2.7-a · Batch C2 · Bill/Ship + GST */}
      <Card>
        <CardContent className="p-4">
          <GSTBillShipSection
            customerId={selectedSRM?.customer_id ?? null}
            customerName={selectedSRM?.customer_name ?? null}
            lines={toSimpleGSTLines(items)}
          />
        </CardContent>
      </Card>

      {existingMemos.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Existing Delivery Memos</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Memo No</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">SRM</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">LR</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existingMemos.slice().reverse().map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.memo_no}</TableCell>
                    <TableCell className="text-xs">{m.memo_date}</TableCell>
                    <TableCell className="font-mono text-xs">{m.supply_request_memo_no ?? '—'}</TableCell>
                    <TableCell className="text-xs">{m.customer_name ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{m.lr_no ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{DM_STATUS_LABELS[m.status]}</Badge>
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

export default function DeliveryMemoEntryPage() {
  return <DeliveryMemoEntryPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />;
}
