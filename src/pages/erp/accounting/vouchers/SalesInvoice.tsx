/**
 * SalesInvoice.tsx — Full Sales Invoice form
 * Sprint 3B: Customer Advance Linking
 * [JWT] All storage via finecore-engine
 */
import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDown, Send, Info, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { TemplateField } from '@/components/finecore/TemplateField';
import { InvoiceModeToggle } from '@/components/finecore/InvoiceModeToggle';
import { InventoryLineGrid } from '@/components/finecore/InventoryLineGrid';
import { LedgerLineGrid } from '@/components/finecore/LedgerLineGrid';
import { GSTComputationPanel } from '@/components/finecore/GSTComputationPanel';
import { resolveVars, generateVoucherNo, vouchersKey } from '@/lib/finecore-engine';
import type { Voucher, VoucherInventoryLine, VoucherLedgerLine } from '@/types/voucher';
import type { AdvanceEntry } from '@/types/compliance';
import { advancesKey } from '@/types/compliance';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrders } from '@/hooks/useOrders';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useERPCompany } from '@/components/layout/ERPCompanySelector';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

interface SalesInvoicePanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function SalesInvoicePanel({ onSaveDraft }: SalesInvoicePanelProps) {
  const [selectedCompany] = useERPCompany();
  const entityCode = selectedCompany && selectedCompany !== 'all' ? selectedCompany : 'SMRT';
  const [voucherNo] = useState(() => generateVoucherNo('SI', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [againstDN, setAgainstDN] = useState('');
  const [invoiceMode, setInvoiceMode] = useState<'item' | 'accounting'>('item');
  const [inventoryLines, setInventoryLines] = useState<VoucherInventoryLine[]>([]);
  const [ledgerLines, setLedgerLines] = useState<VoucherLedgerLine[]>([]);
  const [narration, setNarration] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [collapseOpen, setCollapseOpen] = useState(false);
  const [linkedAdvance, setLinkedAdvance] = useState<AdvanceEntry | null>(null);
  const [againstSO, setAgainstSO] = useState('');
  const { getOpenOrdersForLookup, fulfillOrderLine } = useOrders(entityCode);
  const openSOs = useMemo(() => {
    const sos = getOpenOrdersForLookup('Sales Order');
    if (partyName) return sos.filter(s => s.party_name === partyName);
    return sos;
  }, [getOpenOrdersForLookup, partyName]);

  // Load open customer advances
  const openAdvances = useMemo(() => {
    if (!partyName) return [];
    // [JWT] GET /api/masters/customers
    const customers: any[] = (() => { try { return JSON.parse(localStorage.getItem('erp_group_customer_master') || '[]'); } catch { return []; } })();
    const customer = customers.find((c: any) => c.partyName === partyName);
    if (!customer) return [];
    // [JWT] GET /api/compliance/advances
    return ls<AdvanceEntry>(advancesKey(entityCode))
      .filter(a => a.party_id === customer.id && a.party_type === 'customer' && (a.status === 'open' || a.status === 'partial'));
  }, [partyName, entityCode]);

  const isInterState = useMemo(() => {
    if (!placeOfSupply) return false;
    try {
      // [JWT] GET /api/accounting/gst-config/:entityCode
      const raw = localStorage.getItem(`erp_gst_entity_config_${entityCode}`);
      if (raw) {
        const config = JSON.parse(raw);
        return config.stateCode !== placeOfSupply;
      }
    } catch { /* empty */ }
    return false;
  }, [placeOfSupply, entityCode]);

  const gstTotals = useMemo(() => {
    const totals = { taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, total: 0 };
    inventoryLines.forEach(l => {
      totals.taxable += l.taxable_value;
      totals.cgst += l.cgst_amount;
      totals.sgst += l.sgst_amount;
      totals.igst += l.igst_amount;
      totals.cess += l.cess_amount;
      totals.total += l.total;
    });
    return totals;
  }, [inventoryLines]);

  const vars = useMemo(() => resolveVars(
    { party_name: partyName, date, net_amount: gstTotals.total } as Partial<Voucher>,
    null, null, 'Current User'
  ), [partyName, date, gstTotals.total]);

  const handleLinkAdvance = (adv: AdvanceEntry) => {
    setLinkedAdvance(adv);
    toast.success(`Linked advance ${adv.advance_ref_no}`);
  };

  const handlePost = useCallback(() => {
    if (!partyName) { toast.error('Party name is required'); return; }
    const key = vouchersKey(entityCode);
    try {
      // [JWT] GET /api/accounting/vouchers
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
        voucher_type_name: 'Sales Invoice', base_voucher_type: 'Sales',
        entity_id: '', date, party_name: partyName, ref_voucher_no: againstDN,
        vendor_bill_no: '', net_amount: gstTotals.total, narration, terms_conditions: termsConditions,
        payment_enforcement: paymentTerms, payment_instrument: '',
        from_ledger_name: '', to_ledger_name: '', from_godown_name: '', to_godown_name: '',
        ledger_lines: ledgerLines, inventory_lines: inventoryLines,
        gross_amount: gstTotals.taxable, total_discount: 0, total_taxable: gstTotals.taxable,
        total_cgst: gstTotals.cgst, total_sgst: gstTotals.sgst, total_igst: gstTotals.igst,
        total_cess: gstTotals.cess, total_tax: gstTotals.cgst + gstTotals.sgst + gstTotals.igst,
        round_off: 0, tds_applicable: false, status: 'posted',
        created_by: 'current-user', created_at: now, updated_at: now,
        invoice_mode: invoiceMode,
        so_ref: againstSO ? openSOs.find(s => s.id === againstSO)?.order_no : undefined,
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
            amount_adjusted: adjAmount, tds_adjusted: 0, date: voucher.date,
          });
          adv.balance_amount -= adjAmount;
          adv.status = adv.balance_amount <= 0 ? 'adjusted' : 'partial';
          adv.updated_at = now;
          // [JWT] PATCH /api/compliance/advances
          localStorage.setItem(advancesKey(entityCode), JSON.stringify(advStore));
        }
      }
      // Fulfil SO if linked
      if (againstSO) {
        fulfillOrderLine(againstSO, gstTotals.total);
      }
      toast.success('Sales Invoice posted');
    } catch { toast.error('Failed to save'); }
  }, [partyName, date, voucherNo, againstDN, gstTotals, narration, termsConditions, paymentTerms, ledgerLines, inventoryLines, invoiceMode, entityCode, linkedAdvance, againstSO, openSOs, fulfillOrderLine]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`,
        module: 'fc-txn-sales-invoice',
        label: `SI ${partyName || 'New'}`,
        voucherTypeName: 'Sales Invoice',
        savedAt: new Date().toISOString(),
        formState: { party_name: partyName, date, narration } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, partyName, date, narration]);

  return (
    <div data-keyboard-form className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Sales Invoice</h2>
          <p className="text-xs text-muted-foreground">Create a new sales invoice</p>
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
              <Label className="text-xs">Party (Customer)</Label>
              <Input value={partyName} onChange={e => setPartyName(e.target.value)} onKeyDown={onEnterNext} placeholder="Customer name" />
            </div>
            <div>
              <Label className="text-xs">Place of Supply</Label>
              <Input value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} onKeyDown={onEnterNext} placeholder="State code" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Against Delivery Note</Label>
              <Input value={againstDN} onChange={e => setAgainstDN(e.target.value)} onKeyDown={onEnterNext} placeholder="DN reference (optional)" />
            </div>
            <div>
              <Label className="text-xs">Against SO</Label>
              <Select value={againstSO} onValueChange={setAgainstSO}>
                <SelectTrigger><SelectValue placeholder="Select SO (optional)" /></SelectTrigger>
                <SelectContent>
                  {openSOs.map(so => (
                    <SelectItem key={so.id} value={so.id}>
                      {so.order_no} — {so.party_name} (pending ₹{so.pending_value.toLocaleString('en-IN')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-end">
              <InvoiceModeToggle mode={invoiceMode} onToggle={setInvoiceMode} hasLines={inventoryLines.length > 0 || ledgerLines.length > 0} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer advance banner */}
      {openAdvances.length > 0 && (
        <Alert className="border-blue-500/30 bg-blue-500/5">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-xs text-blue-700">
            Customer has ₹{openAdvances.reduce((s, a) => s + a.balance_amount, 0).toLocaleString('en-IN')} advance (Ref: {openAdvances.map(a => a.advance_ref_no).join(', ')}).
            {!linkedAdvance && (
              <Button variant="link" size="sm" className="text-blue-600 h-auto p-0 ml-2 text-xs"
                onClick={() => handleLinkAdvance(openAdvances[0])}>
                <Link2 className="h-3 w-3 mr-1" />Link to this invoice
              </Button>
            )}
            {linkedAdvance && <span className="ml-2 font-medium text-green-600">Linked: {linkedAdvance.advance_ref_no}</span>}
          </AlertDescription>
        </Alert>
      )}

      {invoiceMode === 'item' ? (
        <InventoryLineGrid lines={inventoryLines} onChange={setInventoryLines} mode="sales" showTax isInterState={isInterState} />
      ) : (
        <LedgerLineGrid lines={ledgerLines} onChange={setLedgerLines} />
      )}

      {invoiceMode === 'item' && (
        <GSTComputationPanel lines={inventoryLines} isInterState={isInterState} />
      )}

      <Collapsible open={collapseOpen} onOpenChange={setCollapseOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-6 py-3 text-sm font-medium text-foreground hover:bg-accent/50 transition-colors rounded-t-lg">
              Narration & Print Settings
              <ChevronDown className={`h-4 w-4 transition-transform ${collapseOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <TemplateField type="narration" voucherTypeName="Sales Invoice" value={narration} onChange={setNarration} label="Narration" vars={vars} rows={2} />
              <TemplateField type="terms_conditions" voucherTypeName="Sales Invoice" value={termsConditions} onChange={setTermsConditions} label="Terms & Conditions" vars={vars} rows={4} />
              <TemplateField type="payment_enforcement" voucherTypeName="Sales Invoice" value={paymentTerms} onChange={setPaymentTerms} label="Payment Terms" vars={vars} rows={3} />
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

export default function SalesInvoice() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Sales Invoice' }]} showDatePicker={false} showCompany={false} />
        <main><SalesInvoicePanel /></main>
      </div>
    </SidebarProvider>
  );
}
