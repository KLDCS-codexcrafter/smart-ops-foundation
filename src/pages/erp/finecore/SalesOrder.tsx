/**
 * SalesOrder.tsx — Sales Order panel with New SO form + Order Book
 * Orders are commitment documents — zero GL/stock/GST impact.
 * [JWT] All data via useOrders hook
 */
import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Plus, Send, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { generateDocNo } from '@/lib/finecore-engine';
import { useOrders } from '@/hooks/useOrders';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { usePriceLists } from '@/hooks/usePriceLists';
import type { Order, OrderLine } from '@/types/order';
import { indianStates } from '@/data/india-geography';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { TallyVoucherHeader } from '@/components/finecore/TallyVoucherHeader';
import {
  PartyDispatchDialog, ItemAllocationDialog,
} from '@/components/finecore/dialogs';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { eventBus } from '@/lib/event-bus';
import type { VoucherDispatchDetails } from '@/types/voucher';

interface SalesOrderPanelProps {
  entityCode: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  partial: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  closed: 'bg-muted text-muted-foreground border-border',
  preclosed: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

const STATUS_TABS = ['all', 'open', 'partial', 'closed', 'preclosed', 'cancelled'] as const;

export function SalesOrderPanel({ entityCode }: SalesOrderPanelProps) {
  const { orders, createOrder, preCloseOrder, cancelOrder, reload } = useOrders(entityCode);
  const { items } = useInventoryItems();
  const { lists: priceLists, items: priceListItems } = usePriceLists();

  // ── New SO Form State ──
  const [soNo] = useState(() => generateDocNo('SO', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [validTill, setValidTill] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerPORef, setCustomerPORef] = useState('');
  const [priceListId, setPriceListId] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [narration, setNarration] = useState('');
  const [terms, setTerms] = useState('');
  const [paymentEnforcement, setPaymentEnforcement] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);

  // ── Tally header + dispatch + allocations (Sprint T10-pre.0) ──
  const { accountingMode } = useTenantConfig(entityCode);
  const [refDate, setRefDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [dispatchDetails, setDispatchDetails] = useState<VoucherDispatchDetails | undefined>(undefined);
  const [allocationDialogState, setAllocationDialogState] = useState<{
    open: boolean; lineIdx: number;
  }>({ open: false, lineIdx: -1 });

  // ── Order Book State ──
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [preCloseSheet, setPreCloseSheet] = useState<Order | null>(null);
  const [preCloseReason, setPreCloseReason] = useState('');

  const customerMaster = useMemo(() => {
    try {
      // [JWT] GET /api/masters/customers
      const raw = localStorage.getItem('erp_group_customer_master');
      return raw ? JSON.parse(raw) as Array<{ id: string; partyName: string; state?: string }> : [];
    } catch { return []; }
  }, []);

  const activeItems = useMemo(() => items.filter(i => i.stock_nature === 'Inventory'), [items]);

  const addLine = () => {
    setLines(prev => [...prev, {
      id: `ol-${Date.now()}-${prev.length}`,
      item_id: '', item_code: '', item_name: '', hsn_sac_code: '',
      qty: 1, uom: '', rate: 0, discount_percent: 0, taxable_value: 0,
      gst_rate: 0, pending_qty: 1, fulfilled_qty: 0, status: 'open',
    }]);
  };

  const updateLine = (idx: number, field: string, value: string | number) => {
    setLines(prev => {
      const next = [...prev];
      const line = { ...next[idx], [field]: value };
      if (field === 'item_id') {
        const item = items.find(i => i.id === value);
        if (item) {
          line.item_code = item.code;
          line.item_name = item.name;
          line.hsn_sac_code = item.hsn_sac_code || '';
          line.uom = item.primary_uom_symbol || 'Nos';
          line.gst_rate = item.igst_rate || 0;
          line.qty = 1;
          // Rate: PriceList → fallback std_selling_rate → 0
          const plItem = priceListId ? priceListItems.find(p => p.price_list_id === priceListId && p.item_id === item.id) : null;
          line.rate = plItem?.price ?? item.std_selling_rate ?? 0;
        }
      }
      line.taxable_value = line.qty * line.rate * (1 - line.discount_percent / 100);
      line.pending_qty = line.qty;
      next[idx] = line;
      return next;
    });
  };

  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const totals = useMemo(() => {
    const gross = lines.reduce((s, l) => s + l.taxable_value, 0);
    const tax = lines.reduce((s, l) => s + l.taxable_value * l.gst_rate / 100, 0);
    return { gross, tax, net: gross + tax };
  }, [lines]);

  const handleCreate = useCallback(() => {
    if (!customerName) { toast.error('Select a customer'); return; }
    if (lines.length === 0) { toast.error('Add at least one item line'); return; }
    if (lines.some(l => l.qty <= 0)) { toast.error('All lines must have qty > 0'); return; }
    if (lines.some(l => l.rate <= 0)) { toast.error('All lines must have rate > 0'); return; }

    const result = createOrder({
      base_voucher_type: 'Sales Order',
      entity_id: entityCode, date,
      valid_till: validTill || undefined,
      party_id: customerId, party_name: customerName,
      place_of_supply: placeOfSupply || undefined,
      ref_no: customerPORef || undefined,
      ref_date: refDate || undefined,
      effective_date: effectiveDate || date,
      dispatch_details: dispatchDetails,
      lines,
      gross_amount: totals.gross, total_tax: totals.tax, net_amount: totals.net,
      narration, terms_conditions: terms,
    });
    if (result) {
      toast.success(`Sales Order ${result.order_no} created`);
      // [JWT] replace 'demo-user' with real user id from auth context
      eventBus.emit('order.placed', {
        voucher_id: result.id,
        voucher_no: result.order_no,
        voucher_type: 'Sales Order',
        entity_code: entityCode,
        accounting_mode: accountingMode,
        actor_id: 'demo-user',
        timestamp: new Date().toISOString(),
        amount: result.net_amount,
      });
      setLines([]); setCustomerName(''); setCustomerId(''); setCustomerPORef('');
      setNarration(''); setTerms(''); setPaymentEnforcement(''); setValidTill('');
      setPriceListId(''); setPlaceOfSupply('');
      setRefDate(''); setEffectiveDate(''); setDispatchDetails(undefined);
      reload();
    }
  }, [customerName, customerId, customerPORef, refDate, effectiveDate, dispatchDetails, lines, date, validTill, placeOfSupply, narration, terms, totals, entityCode, createOrder, reload, accountingMode]);

  const handlePreClose = () => {
    if (!preCloseSheet || !preCloseReason.trim()) { toast.error('Reason is required'); return; }
    preCloseOrder(preCloseSheet.id, preCloseReason);
    setPreCloseSheet(null);
    setPreCloseReason('');
    reload();
  };

  const handleCancel = (order: Order) => {
    cancelOrder(order.id, 'User cancelled');
    reload();
  };

  const soOrders = useMemo(() => {
    let filtered = orders.filter(o => o.base_voucher_type === 'Sales Order');
    if (statusFilter !== 'all') filtered = filtered.filter(o => o.status === statusFilter);
    if (search) filtered = filtered.filter(o =>
      o.order_no.toLowerCase().includes(search.toLowerCase()) ||
      o.party_name.toLowerCase().includes(search.toLowerCase())
    );
    return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [orders, statusFilter, search]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="p-6 space-y-4 animate-fade-in" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Sales Order</h2>
          <p className="text-xs text-muted-foreground">Create and manage sales orders</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">{soNo}</Badge>
      </div>

      <Tabs defaultValue="new-so" className="space-y-4">
        <TabsList>
          <TabsTrigger value="new-so">New Sales Order</TabsTrigger>
          <TabsTrigger value="order-book">Order Book ({soOrders.length})</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: New SO Form ── */}
        <TabsContent value="new-so" className="space-y-4">
          {/* Tally-style voucher header */}
          <TallyVoucherHeader
            voucherTypeName="Sales Order"
            baseVoucherType="Sales Order"
            voucherFamily="Order"
            voucherNo={soNo}
            refNo={customerPORef}
            refDate={refDate}
            voucherDate={date}
            effectiveDate={effectiveDate}
            status="draft"
            onRefNoChange={setCustomerPORef}
            onRefDateChange={setRefDate}
            onVoucherDateChange={setDate}
            onEffectiveDateChange={setEffectiveDate}
          />

          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs">Customer</Label>
                  <Select value={customerId} onValueChange={v => {
                    setCustomerId(v);
                    const cust = customerMaster.find(c => c.id === v);
                    if (cust) {
                      setCustomerName(cust.partyName);
                      if (cust.state) setPlaceOfSupply(cust.state);
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customerMaster.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.partyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Price List</Label>
                  <Select value={priceListId} onValueChange={setPriceListId}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      {priceLists.map(pl => (
                        <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Valid Till</Label>
                  <SmartDateInput value={validTill} onChange={setValidTill} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Place of Supply</Label>
                  <Select value={placeOfSupply} onValueChange={setPlaceOfSupply}>
                    <SelectTrigger><SelectValue placeholder="Auto from customer" /></SelectTrigger>
                    <SelectContent>
                      {indianStates.map(s => (
                        <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {customerId && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDispatchDialogOpen(true)}
                  >
                    {dispatchDetails ? 'Edit Dispatch Details' : 'Add Dispatch Details'}
                  </Button>
                  {dispatchDetails?.tracking_no && (
                    <Badge variant="outline" className="text-xs font-mono">
                      Tracking: {dispatchDetails.tracking_no}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Grid */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Item Lines</Label>
                <Button variant="outline" size="sm" onClick={addLine} className="gap-1">
                  <Plus className="h-3.5 w-3.5" />Add Line
                </Button>
              </div>
              {lines.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs">HSN/SAC</TableHead>
                      <TableHead className="text-xs w-20">Qty</TableHead>
                      <TableHead className="text-xs w-16">UOM</TableHead>
                      <TableHead className="text-xs w-24">Rate</TableHead>
                      <TableHead className="text-xs w-16">Disc %</TableHead>
                      <TableHead className="text-xs text-right">Taxable</TableHead>
                      <TableHead className="text-xs w-16">GST %</TableHead>
                      <TableHead className="text-xs">Delivery</TableHead>
                      <TableHead className="text-xs w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line, idx) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <Select value={line.item_id} onValueChange={v => updateLine(idx, 'item_id', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              {activeItems.map(it => (
                                <SelectItem key={it.id} value={it.id}>{it.code} — {it.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input value={line.hsn_sac_code} onChange={e => updateLine(idx, 'hsn_sac_code', e.target.value)} className="h-8 text-xs w-20" /></TableCell>
                        <TableCell><Input type="number" value={line.qty} onChange={e => updateLine(idx, 'qty', Number(e.target.value))} onKeyDown={onEnterNext} className="h-8 text-xs font-mono" /></TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{line.uom || '—'}</span></TableCell>
                        <TableCell><Input type="number" value={line.rate} onChange={e => updateLine(idx, 'rate', Number(e.target.value))} onKeyDown={onEnterNext} className="h-8 text-xs font-mono" /></TableCell>
                        <TableCell><Input type="number" value={line.discount_percent} onChange={e => updateLine(idx, 'discount_percent', Number(e.target.value))} onKeyDown={onEnterNext} className="h-8 text-xs font-mono" /></TableCell>
                        <TableCell className="text-right font-mono text-xs">₹{line.taxable_value.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{line.gst_rate}%</TableCell>
                        <TableCell><SmartDateInput value={line.delivery_date || ''} onChange={v => updateLine(idx, 'delivery_date', v)} /></TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => removeLine(idx)} className="h-6 w-6 p-0"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {lines.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No lines added. Click "Add Line" to begin.</p>}

              {lines.length > 0 && (
                <div className="flex justify-end">
                  <div className="space-y-1 text-right text-xs">
                    <div className="flex gap-8 justify-end"><span className="text-muted-foreground">Gross:</span><span className="font-mono">₹{totals.gross.toLocaleString('en-IN')}</span></div>
                    <div className="flex gap-8 justify-end"><span className="text-muted-foreground">Indicative GST:</span><span className="font-mono">₹{totals.tax.toLocaleString('en-IN')}</span></div>
                    <div className="flex gap-8 justify-end font-semibold"><span>Net:</span><span className="font-mono">₹{totals.net.toLocaleString('en-IN')}</span></div>
                    <p className="text-[10px] text-muted-foreground/60">Indicative — not posted</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Terms */}
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div>
                <Label className="text-xs">Terms & Conditions</Label>
                <Textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3} />
              </div>
              <div>
                <Label className="text-xs">Payment Enforcement</Label>
                <Textarea value={paymentEnforcement} onChange={e => setPaymentEnforcement(e.target.value)} rows={2} />
              </div>
              <div>
                <Label className="text-xs">Narration</Label>
                <Textarea value={narration} onChange={e => setNarration(e.target.value)} rows={2} placeholder="Optional remarks" />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setLines([]); toast.info('Form reset'); }}>Cancel</Button>
            <Button data-primary onClick={handleCreate}><Send className="h-4 w-4 mr-2" />Create SO</Button>
          </div>
        </TabsContent>

        {/* ── Tab 2: Order Book ── */}
        <TabsContent value="order-book" className="space-y-4">
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {STATUS_TABS.map(s => (
                  <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" className="text-xs capitalize" onClick={() => setStatusFilter(s)}>
                    {s === 'all' ? 'All' : s}
                  </Button>
                ))}
              </div>
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order no or customer..." className="max-w-sm" onKeyDown={onEnterNext} />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Order No</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Valid Till</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs text-right">Order Value</TableHead>
                    <TableHead className="text-xs text-right">Fulfilled</TableHead>
                    <TableHead className="text-xs text-right">Pending</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {soOrders.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">No sales orders found</TableCell></TableRow>
                  )}
                  {soOrders.map(order => {
                    const fulfilledValue = order.lines.reduce((s, l) => s + l.fulfilled_qty * l.rate, 0);
                    const pendingValue = order.net_amount - fulfilledValue;
                    const isLapsed = order.valid_till && order.valid_till < today && order.status !== 'closed' && order.status !== 'cancelled';
                    return (
                      <Collapsible key={order.id} open={expandedId === order.id} onOpenChange={o => setExpandedId(o ? order.id : null)} asChild>
                        <>
                          <CollapsibleTrigger asChild>
                            <TableRow className="cursor-pointer hover:bg-accent/30">
                              <TableCell className="text-xs font-mono text-primary">{order.order_no}</TableCell>
                              <TableCell className="text-xs">{order.date}</TableCell>
                              <TableCell className="text-xs">
                                {order.valid_till || '—'}
                                {isLapsed && <Badge variant="destructive" className="ml-1 text-[9px] px-1 py-0">Lapsed</Badge>}
                              </TableCell>
                              <TableCell className="text-xs">{order.party_name}</TableCell>
                              <TableCell className="text-xs text-right font-mono">₹{order.net_amount.toLocaleString('en-IN')}</TableCell>
                              <TableCell className="text-xs text-right font-mono">₹{fulfilledValue.toLocaleString('en-IN')}</TableCell>
                              <TableCell className="text-xs text-right font-mono">₹{pendingValue.toLocaleString('en-IN')}</TableCell>
                              <TableCell><Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[order.status] || ''}`}>{order.status}</Badge></TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {(order.status === 'open' || order.status === 'partial') && (
                                    <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={e => { e.stopPropagation(); setPreCloseSheet(order); }}>Pre-close</Button>
                                  )}
                                  {order.status === 'open' && order.lines.every(l => l.fulfilled_qty === 0) && (
                                    <Button variant="outline" size="sm" className="h-6 text-[10px] text-destructive" onClick={e => { e.stopPropagation(); handleCancel(order); }}>Cancel</Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </CollapsibleTrigger>
                          <CollapsibleContent asChild>
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/30 p-4">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-[10px]">Item</TableHead>
                                      <TableHead className="text-[10px] text-right">Ordered</TableHead>
                                      <TableHead className="text-[10px] text-right">Fulfilled</TableHead>
                                      <TableHead className="text-[10px] text-right">Pending</TableHead>
                                      <TableHead className="text-[10px] text-right">Rate</TableHead>
                                      <TableHead className="text-[10px]">Delivery</TableHead>
                                      <TableHead className="text-[10px]">Status</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {order.lines.map(l => (
                                      <TableRow key={l.id}>
                                        <TableCell className="text-[10px]">{l.item_name}</TableCell>
                                        <TableCell className="text-[10px] text-right font-mono">{l.qty}</TableCell>
                                        <TableCell className="text-[10px] text-right font-mono">{l.fulfilled_qty}</TableCell>
                                        <TableCell className="text-[10px] text-right font-mono">{l.pending_qty}</TableCell>
                                        <TableCell className="text-[10px] text-right font-mono">₹{l.rate.toLocaleString('en-IN')}</TableCell>
                                        <TableCell className="text-[10px]">{l.delivery_date || '—'}</TableCell>
                                        <TableCell><Badge variant="outline" className={`text-[9px] ${STATUS_COLORS[l.status] || ''}`}>{l.status}</Badge></TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </TableCell>
                            </TableRow>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pre-close Sheet */}
      <Sheet open={!!preCloseSheet} onOpenChange={o => { if (!o) setPreCloseSheet(null); }}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Pre-close Order</SheetTitle>
            <SheetDescription>Close order {preCloseSheet?.order_no} with remaining pending quantities abandoned.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4" data-keyboard-form>
            {preCloseSheet && (
              <>
                <div className="text-xs space-y-2">
                  <p><span className="text-muted-foreground">Order:</span> <span className="font-mono">{preCloseSheet.order_no}</span></p>
                  <p><span className="text-muted-foreground">Customer:</span> {preCloseSheet.party_name}</p>
                  <p><span className="text-muted-foreground">Order Value:</span> <span className="font-mono">₹{preCloseSheet.net_amount.toLocaleString('en-IN')}</span></p>
                </div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-[10px]">Item</TableHead>
                    <TableHead className="text-[10px] text-right">Pending Qty</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {preCloseSheet.lines.filter(l => l.pending_qty > 0).map(l => (
                      <TableRow key={l.id}>
                        <TableCell className="text-[10px]">{l.item_name}</TableCell>
                        <TableCell className="text-[10px] text-right font-mono">{l.pending_qty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div>
                  <Label className="text-xs">Reason (required)</Label>
                  <Textarea value={preCloseReason} onChange={e => setPreCloseReason(e.target.value)} rows={2} placeholder="Why is this order being pre-closed?" />
                </div>
                <Button data-primary onClick={handlePreClose} className="w-full">Confirm Pre-close</Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dispatch dialog (T10-pre.0) */}
      <PartyDispatchDialog
        open={dispatchDialogOpen}
        onOpenChange={setDispatchDialogOpen}
        partyName={customerName}
        addresses={(() => {
          // [JWT] GET /api/masters/customers/:id/addresses
          try {
            const raw = localStorage.getItem('erp_group_customer_master');
            const customers = raw ? JSON.parse(raw) : [];
            const c = customers.find((x: { id: string }) => x.id === customerId);
            return c?.addresses ?? [];
          } catch { return []; }
        })()}
        initial={dispatchDetails}
        onSave={setDispatchDetails}
      />

      {/* Allocation dialog (T10-pre.0) — godowns/batches/serials wired in T10-pre.2 */}
      {allocationDialogState.open && lines[allocationDialogState.lineIdx] && (
        <ItemAllocationDialog
          open={allocationDialogState.open}
          onOpenChange={(open) => setAllocationDialogState(s => ({ ...s, open }))}
          itemName={lines[allocationDialogState.lineIdx].item_name}
          lineQty={lines[allocationDialogState.lineIdx].qty}
          lineRate={lines[allocationDialogState.lineIdx].rate}
          lineDiscountAmount={0}
          godowns={[]}
          batches={[]}
          serials={[]}
          isBatchTracked={false}
          isSerialTracked={false}
          initial={lines[allocationDialogState.lineIdx].allocations ?? []}
          onSave={(allocations) => {
            setLines(prev => prev.map((l, i) =>
              i === allocationDialogState.lineIdx ? { ...l, allocations } : l
            ));
            setAllocationDialogState({ open: false, lineIdx: -1 });
          }}
        />
      )}
    </div>
  );
}

export default function SalesOrder() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Sales Order' }]} showDatePicker={false} showCompany={false} />
        <main><SalesOrderPanel /></main>
      </div>
    </SidebarProvider>
  );
}
