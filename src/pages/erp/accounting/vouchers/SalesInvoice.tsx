/**
 * SalesInvoice.tsx — Full Sales Invoice form
 * [JWT] All storage via finecore-engine
 */
import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { TemplateField } from '@/components/finecore/TemplateField';
import { InvoiceModeToggle } from '@/components/finecore/InvoiceModeToggle';
import { InventoryLineGrid } from '@/components/finecore/InventoryLineGrid';
import { LedgerLineGrid } from '@/components/finecore/LedgerLineGrid';
import { GSTComputationPanel } from '@/components/finecore/GSTComputationPanel';
import { resolveVars, generateVoucherNo, vouchersKey } from '@/lib/finecore-engine';
import type { Voucher, VoucherInventoryLine, VoucherLedgerLine } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';

interface SalesInvoicePanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function SalesInvoicePanel({ onSaveDraft, initialState }: SalesInvoicePanelProps) {
  const entityCode = 'SMRT';
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

  const isInterState = useMemo(() => {
    if (!placeOfSupply) return false;
    // [JWT] GET /api/accounting/gst-config/:entityCode
    try {
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
      };
      existing.push(voucher);
      // [JWT] POST /api/accounting/vouchers
      localStorage.setItem(key, JSON.stringify(existing));
      toast.success('Sales Invoice posted');
    } catch { toast.error('Failed to save'); }
  }, [partyName, date, voucherNo, againstDN, gstTotals, narration, termsConditions, paymentTerms, ledgerLines, inventoryLines, invoiceMode, entityCode]);

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
  }, [onSaveDraft, partyName, date, inventoryLines, ledgerLines, narration]);

  return (
    <div data-keyboard-form className="p-5 max-w-4xl mx-auto space-y-4">
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
            <div className="flex items-end">
              <InvoiceModeToggle mode={invoiceMode} onToggle={setInvoiceMode} hasLines={inventoryLines.length > 0 || ledgerLines.length > 0} />
            </div>
          </div>
        </CardContent>
      </Card>

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
        <ERPHeader breadcrumbs={[{ label: 'Accounting', href: '/erp/accounting' }, { label: 'Sales Invoice' }]} showDatePicker={false} showCompany={false} />
        <main><SalesInvoicePanel /></main>
      </div>
    </SidebarProvider>
  );
}
