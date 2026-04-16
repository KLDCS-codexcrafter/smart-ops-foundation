/**
 * PurchaseInvoice.tsx — Full Purchase Invoice form
 * Sprint 3B: Advance Adjustment Enhancement
 * [JWT] All storage via finecore-engine
 */
import { useState, useMemo, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDown, Send, Info, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { TemplateField } from '@/components/finecore/TemplateField';
import { InvoiceModeToggle } from '@/components/finecore/InvoiceModeToggle';
import { InventoryLineGrid } from '@/components/finecore/InventoryLineGrid';
import { LedgerLineGrid } from '@/components/finecore/LedgerLineGrid';
import { GSTComputationPanel } from '@/components/finecore/GSTComputationPanel';
import { TDSDeductionPanel } from '@/components/finecore/TDSDeductionPanel';
import { resolveVars, generateVoucherNo, vouchersKey } from '@/lib/finecore-engine';
import type { Voucher, VoucherInventoryLine, VoucherLedgerLine } from '@/types/voucher';
import type { AdvanceEntry } from '@/types/compliance';
import { advancesKey } from '@/types/compliance';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { useOrders } from '@/hooks/useOrders';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

interface PurchaseInvoicePanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function PurchaseInvoicePanel({ onSaveDraft }: PurchaseInvoicePanelProps) {
  const entityCode = 'SMRT';
  const [voucherNo] = useState(() => generateVoucherNo('PI', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [vendorBillNo, setVendorBillNo] = useState('');
  const [vendorBillDate, setVendorBillDate] = useState('');
  const [invoiceMode, setInvoiceMode] = useState<'item' | 'accounting'>('item');
  const [inventoryLines, setInventoryLines] = useState<VoucherInventoryLine[]>([]);
  const [ledgerLines, setLedgerLines] = useState<VoucherLedgerLine[]>([]);
  const [narration, setNarration] = useState('');
  const [collapseOpen, setCollapseOpen] = useState(false);
  const [linkedAdvance, setLinkedAdvance] = useState<AdvanceEntry | null>(null);
  const [advancesOpen, setAdvancesOpen] = useState(false);
  const [againstPO, setAgainstPO] = useState('');
  const { getOpenOrdersForLookup, fulfillOrderLine } = useOrders(entityCode);
  const openPOs = useMemo(() => {
    const pos = getOpenOrdersForLookup('Purchase Order');
    if (partyName) return pos.filter(p => p.party_name === partyName);
    return pos;
  }, [getOpenOrdersForLookup, partyName]);

  // Load open advances for vendor
  const openAdvances = useMemo(() => {
    if (!partyName) return [];
    // [JWT] GET /api/masters/vendors
    const vendors: any[] = (() => { try { return JSON.parse(localStorage.getItem('erp_group_vendor_master') || '[]'); } catch { return []; } })();
    const vendor = vendors.find((v: any) => v.partyName === partyName);
    if (!vendor) return [];
    // [JWT] GET /api/compliance/advances
    return ls<AdvanceEntry>(advancesKey(entityCode))
      .filter(a => a.party_id === vendor.id && a.party_type === 'vendor' && (a.status === 'open' || a.status === 'partial'));
  }, [partyName, entityCode]);

  const gstTotals = useMemo(() => {
    const t = { taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, total: 0 };
    inventoryLines.forEach(l => {
      t.taxable += l.taxable_value; t.cgst += l.cgst_amount;
      t.sgst += l.sgst_amount; t.igst += l.igst_amount; t.total += l.total;
    });
    return t;
  }, [inventoryLines]);

  const vars = useMemo(() => resolveVars(
    { party_name: partyName, date, net_amount: gstTotals.total, vendor_bill_no: vendorBillNo } as Partial<Voucher>,
    null, null, 'Current User'
  ), [partyName, date, gstTotals.total, vendorBillNo]);

  const handleLinkAdvance = (adv: AdvanceEntry) => {
    setLinkedAdvance(adv);
    toast.success(`Linked advance ${adv.advance_ref_no}`);
  };

  const handlePost = useCallback(() => {
    if (!partyName) { toast.error('Vendor name is required'); return; }
    if (!vendorBillNo) { toast.error('Vendor bill number is required'); return; }
    const key = vouchersKey(entityCode);
    try {
      // [JWT] GET /api/accounting/vouchers
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
        voucher_type_name: 'Purchase Invoice', base_voucher_type: 'Purchase',
        entity_id: '', date, party_name: partyName, ref_voucher_no: '',
        vendor_bill_no: vendorBillNo, net_amount: gstTotals.total, narration,
        terms_conditions: '', payment_enforcement: '', payment_instrument: '',
        from_ledger_name: '', to_ledger_name: '', from_godown_name: '', to_godown_name: '',
        ledger_lines: ledgerLines, inventory_lines: inventoryLines,
        gross_amount: gstTotals.taxable, total_discount: 0, total_taxable: gstTotals.taxable,
        total_cgst: gstTotals.cgst, total_sgst: gstTotals.sgst, total_igst: gstTotals.igst,
        total_cess: 0, total_tax: gstTotals.cgst + gstTotals.sgst + gstTotals.igst,
        round_off: 0, tds_applicable: false, status: 'posted',
        created_by: 'current-user', created_at: now, updated_at: now,
        invoice_mode: invoiceMode,
        po_ref: againstPO ? openPOs.find(p => p.id === againstPO)?.order_no : undefined,
      };
      existing.push(voucher);
      // [JWT] POST /api/accounting/vouchers
      localStorage.setItem(key, JSON.stringify(existing));

      // Update advance if linked
      if (linkedAdvance) {
        // [JWT] PATCH /api/compliance/advances/:id
        const advStore = ls<AdvanceEntry>(advancesKey(entityCode));
        const adv = advStore.find(a => a.id === linkedAdvance.id);
        if (adv) {
          const adjAmount = Math.min(adv.balance_amount, gstTotals.total);
          adv.adjustments.push({
            invoice_id: voucher.id, invoice_no: voucher.voucher_no,
            amount_adjusted: adjAmount, tds_adjusted: adv.tds_balance,
            date: voucher.date,
          });
          adv.balance_amount -= adjAmount;
          adv.tds_balance = 0;
          adv.status = adv.balance_amount <= 0 ? 'adjusted' : 'partial';
          adv.updated_at = now;
          // [JWT] PATCH /api/compliance/advances
          localStorage.setItem(advancesKey(entityCode), JSON.stringify(advStore));
        }
      }
      // Fulfil PO if linked
      if (againstPO) {
        fulfillOrderLine(againstPO, gstTotals.total);
      }
      toast.success('Purchase Invoice posted');
    } catch { toast.error('Failed to save'); }
  }, [partyName, vendorBillNo, date, voucherNo, gstTotals, narration, ledgerLines, inventoryLines, invoiceMode, entityCode, linkedAdvance, againstPO, openPOs, fulfillOrderLine]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`, module: 'fc-txn-purchase-invoice',
        label: `PI ${partyName || 'New'}`, voucherTypeName: 'Purchase Invoice',
        savedAt: new Date().toISOString(),
        formState: { party_name: partyName, date, vendor_bill_no: vendorBillNo, narration } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, partyName, date, vendorBillNo, narration]);

  return (
    <div data-keyboard-form className="p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Purchase Invoice</h2>
          <p className="text-xs text-muted-foreground">Record vendor purchase</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">{voucherNo}</Badge>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Party (Vendor)</Label>
              <Input value={partyName} onChange={e => setPartyName(e.target.value)} onKeyDown={onEnterNext} placeholder="Vendor name" />
            </div>
            <div className="flex items-end">
              <InvoiceModeToggle mode={invoiceMode} onToggle={setInvoiceMode} hasLines={inventoryLines.length > 0 || ledgerLines.length > 0} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Vendor Bill No</Label>
              <Input value={vendorBillNo} onChange={e => setVendorBillNo(e.target.value)} onKeyDown={onEnterNext} placeholder="Bill number (mandatory)" />
            </div>
            <div>
              <Label className="text-xs">Vendor Bill Date</Label>
              <Input type="date" value={vendorBillDate} onChange={e => setVendorBillDate(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Against PO No</Label>
              <Select value={againstPO} onValueChange={setAgainstPO}>
                <SelectTrigger><SelectValue placeholder="Select PO (optional)" /></SelectTrigger>
                <SelectContent>
                  {openPOs.map(po => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.order_no} — {po.party_name} (pending ₹{po.pending_value.toLocaleString('en-IN')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Open Advances for this vendor */}
      {openAdvances.length > 0 && (
        <Collapsible open={advancesOpen} onOpenChange={setAdvancesOpen}>
          <Card className="border-blue-500/20">
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <span className="text-xs">Open Advances for this vendor ({openAdvances.length})</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${advancesOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Ref No</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs text-right">Advance Amount</TableHead>
                      <TableHead className="text-xs text-right">TDS Deducted</TableHead>
                      <TableHead className="text-xs text-right">Balance</TableHead>
                      <TableHead className="text-xs text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openAdvances.map(adv => (
                      <TableRow key={adv.id}>
                        <TableCell className="text-xs font-mono">{adv.advance_ref_no}</TableCell>
                        <TableCell className="text-xs">{adv.date}</TableCell>
                        <TableCell className="text-xs text-right font-mono">₹{adv.advance_amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-xs text-right font-mono">₹{adv.tds_amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-xs text-right font-mono">₹{adv.balance_amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="h-6 text-[10px]"
                            onClick={() => handleLinkAdvance(adv)}
                            disabled={linkedAdvance?.id === adv.id}>
                            <Link2 className="h-3 w-3 mr-1" />
                            {linkedAdvance?.id === adv.id ? 'Linked' : 'Link to this Invoice'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {linkedAdvance && (
        <Alert className="border-green-500/30 bg-green-500/5">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-xs text-green-700">
            Advance {linkedAdvance.advance_ref_no} linked. Advance TDS ₹{linkedAdvance.tds_amount.toLocaleString('en-IN')} already deducted. Net TDS JV required: ₹{Math.max(0, (gstTotals.total * 0.1) - linkedAdvance.tds_amount).toLocaleString('en-IN')} (estimated).
          </AlertDescription>
        </Alert>
      )}

      {invoiceMode === 'item' ? (
        <InventoryLineGrid lines={inventoryLines} onChange={setInventoryLines} mode="purchase" showTax isInterState={false} />
      ) : (
        <LedgerLineGrid lines={ledgerLines} onChange={setLedgerLines} />
      )}

      {invoiceMode === 'item' && <GSTComputationPanel lines={inventoryLines} isInterState={false} />}

      <TDSDeductionPanel vendorId="" entityCode={entityCode} grossAmount={gstTotals.total} sectionCode="" deducteeType="company" />

      <Collapsible open={collapseOpen} onOpenChange={setCollapseOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors rounded-t-lg">
              Narration & Terms
              <ChevronDown className={`h-4 w-4 transition-transform ${collapseOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <TemplateField type="narration" voucherTypeName="Purchase Invoice" value={narration} onChange={setNarration} label="Narration" vars={vars} rows={2} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="flex gap-3 justify-end">
        {onSaveDraft && <Button variant="outline" onClick={handleSaveDraft}>Save to Draft Tray</Button>}
        <Button variant="outline" onClick={() => toast.info('Discarded')}>Cancel</Button>
        <Button data-primary onClick={handlePost}><Send className="h-4 w-4 mr-2" />Post</Button>
      </div>
    </div>
  );
}

export default function PurchaseInvoice() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Purchase Invoice' }]} showDatePicker={false} showCompany={false} />
        <main><PurchaseInvoicePanel /></main>
      </div>
    </SidebarProvider>
  );
}
