/**
 * SalesInvoice.tsx — Full Sales Invoice form
 * Sprint 3B: Customer Advance Linking
 * Sprint 3 SalesX: SAM assignment + commission preview + commission-on-receipt register booking
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
import { calculateInvoiceCommission } from '@/lib/sam-engine';
import type { CommissionResult } from '@/lib/sam-engine';
import type { CommissionEntry } from '@/types/commission-register';
import { commissionRegisterKey } from '@/types/commission-register';
import type { SAMPerson } from '@/types/sam-person';
import { samPersonsKey } from '@/types/sam-person';
import { comply360SAMKey } from '@/pages/erp/accounting/Comply360Config';
import type { SAMConfig } from '@/pages/erp/accounting/Comply360Config';

interface CustomerRow {
  id: string;
  partyName: string;
  default_salesman_id?: string | null;
  default_salesman_name?: string | null;
  default_agent_id?: string | null;
  default_agent_name?: string | null;
  default_reference_id?: string | null;
  default_reference_name?: string | null;
  salesman_assignment_mode?: 'fixed' | 'select_at_voucher';
}

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

  // ── SAM state ───────────────────────────────────────────────────
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [samSalesmanId, setSamSalesmanId] = useState<string | null>(null);
  const [samSalesmanName, setSamSalesmanName] = useState<string | null>(null);
  const [samAgentId, setSamAgentId] = useState<string | null>(null);
  const [samAgentName, setSamAgentName] = useState<string | null>(null);
  const [samReferenceId, setSamReferenceId] = useState<string | null>(null);
  const [samReferenceName, setSamReferenceName] = useState<string | null>(null);
  const [salesmanAssignmentMode, setSalesmanAssignmentMode] =
    useState<'fixed' | 'select_at_voucher'>('fixed');

  const openSOs = useMemo(() => {
    const sos = getOpenOrdersForLookup('Sales Order');
    if (partyName) return sos.filter(s => s.party_name === partyName);
    return sos;
  }, [getOpenOrdersForLookup, partyName]);

  // Customers
  const customers = useMemo<CustomerRow[]>(() => {
    try {
      // [JWT] GET /api/masters/customers
      return JSON.parse(localStorage.getItem('erp_group_customer_master') || '[]');
    } catch { return []; }
  }, []);

  // SAM config + persons
  const samCfg = useMemo<SAMConfig | null>(() => {
    try {
      // [JWT] GET /api/compliance/comply360/sam/:entityCode
      const raw = localStorage.getItem(comply360SAMKey(entityCode));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [entityCode]);

  const samPersons = useMemo<SAMPerson[]>(() => {
    try {
      // [JWT] GET /api/salesx/sam/persons?entityCode={entityCode}
      const raw = localStorage.getItem(samPersonsKey(entityCode));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [entityCode]);

  const ledgerFlags = useMemo<Record<string, boolean>>(() => {
    try {
      // [JWT] GET /api/accounting/ledger-definitions
      const raw = localStorage.getItem('erp_group_ledger_definitions');
      const defs: Array<{ id: string; allow_commission_base?: boolean }> = raw ? JSON.parse(raw) : [];
      return Object.fromEntries(
        defs.filter(d => d.allow_commission_base === true).map(d => [d.id, true])
      );
    } catch { return {}; }
  }, []);

  // Open customer advances
  const openAdvances = useMemo(() => {
    if (!partyName) return [];
    const customer = customers.find(c => c.partyName === partyName);
    if (!customer) return [];
    // [JWT] GET /api/compliance/advances
    return ls<AdvanceEntry>(advancesKey(entityCode))
      .filter(a => a.party_id === customer.id && a.party_type === 'customer' && (a.status === 'open' || a.status === 'partial'));
  }, [partyName, entityCode, customers]);

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

  // Commission preview — live useMemo
  const commissionPreview = useMemo<CommissionResult[]>(() => {
    if (!samCfg) return [];
    const assigned = [samSalesmanId, samAgentId]
      .filter(Boolean)
      .map(id => samPersons.find(p => p.id === id))
      .filter((p): p is SAMPerson => !!p);
    if (assigned.length === 0) return [];
    return calculateInvoiceCommission(
      assigned, inventoryLines, ledgerLines, ledgerFlags, date, samCfg,
    );
  }, [samCfg, samSalesmanId, samAgentId, samPersons, inventoryLines, ledgerLines, ledgerFlags, date]);

  const totalCommissionPreview = useMemo(
    () => commissionPreview.reduce((s, r) => s + r.commission_amount, 0),
    [commissionPreview]
  );

  const handleCustomerSelect = useCallback((cId: string) => {
    // [JWT] GET /api/masters/customers/:id
    const cust = customers.find(c => c.id === cId);
    if (!cust) return;
    setCustomerId(cId);
    setPartyName(cust.partyName);
    setSamSalesmanId(cust.default_salesman_id ?? null);
    setSamSalesmanName(cust.default_salesman_name ?? null);
    setSamAgentId(cust.default_agent_id ?? null);
    setSamAgentName(cust.default_agent_name ?? null);
    setSamReferenceId(cust.default_reference_id ?? null);
    setSamReferenceName(cust.default_reference_name ?? null);
    setSalesmanAssignmentMode(cust.salesman_assignment_mode ?? 'fixed');
  }, [customers]);

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
        sam_salesman_id: samSalesmanId,
        sam_salesman_name: samSalesmanName,
        sam_agent_id: samAgentId,
        sam_agent_name: samAgentName,
        sam_reference_id: samReferenceId,
        sam_reference_name: samReferenceName,
        sam_commission_results: commissionPreview,
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

      // Write pending CommissionEntry for each SAM result — NO GL POSTING
      // Commission is payable on receipt, not here.
      if (commissionPreview.length > 0) {
        // [JWT] GET /api/salesx/commission-register?entityCode={entityCode}
        const regStore: CommissionEntry[] = (() => {
          try {
            return JSON.parse(localStorage.getItem(commissionRegisterKey(entityCode)) || '[]');
          } catch { return []; }
        })();

        commissionPreview.forEach(result => {
          const person = samPersons.find(p => p.id === result.person_id);
          const tdsSection = person?.tds_section ?? null;
          const tdsApplicable = !!person?.tds_deductible
            && tdsSection !== 'not_applicable'
            && !!tdsSection;
          let tdsRate = 0;
          if (tdsApplicable && tdsSection) {
            try {
              // [JWT] GET /api/accounting/tds-sections
              const secs = JSON.parse(localStorage.getItem('erp_tds_sections') || '[]');
              const sec = secs.find(
                (s: { sectionCode: string; rateIndividual: number }) => s.sectionCode === tdsSection
              );
              tdsRate = sec?.rateIndividual ?? 5;
            } catch { tdsRate = 5; }
          }
          const deducteeType: CommissionEntry['deductee_type'] =
            person?.pan && person.pan.length > 0 ? 'individual' : 'no_pan';
          const entry: CommissionEntry = {
            id: `cr-${Date.now()}-${result.person_id}`,
            entity_id: entityCode,
            voucher_id: voucher.id,
            voucher_no: voucher.voucher_no,
            voucher_date: voucher.date,
            customer_id: customerId,
            customer_name: partyName,
            person_id: result.person_id,
            person_name: result.person_name,
            person_type: result.person_type,
            person_pan: person?.pan ?? null,
            deductee_type: deducteeType,
            invoice_amount: gstTotals.total,
            base_amount: result.base_amount,
            commission_rate: result.rate_used,
            total_commission: result.commission_amount,
            method: result.method,
            tds_applicable: tdsApplicable,
            tds_section: tdsApplicable ? tdsSection : null,
            tds_rate: tdsRate,
            amount_received_to_date: 0,
            commission_earned_to_date: 0,
            tds_deducted_to_date: 0,
            net_paid_to_date: 0,
            payments: [],
            status: 'pending',
            created_at: now,
            updated_at: now,
          };
          regStore.push(entry);
        });
        // [JWT] POST /api/salesx/commission-register
        localStorage.setItem(commissionRegisterKey(entityCode), JSON.stringify(regStore));
      }

      toast.success('Sales Invoice posted');
    } catch { toast.error('Failed to save'); }
  }, [
    partyName, date, voucherNo, againstDN, gstTotals, narration, termsConditions, paymentTerms,
    ledgerLines, inventoryLines, invoiceMode, entityCode, linkedAdvance, againstSO, openSOs, fulfillOrderLine,
    samSalesmanId, samSalesmanName, samAgentId, samAgentName, samReferenceId, samReferenceName,
    commissionPreview, customerId, samPersons,
  ]);

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

  const showSamPanel = !!samCfg?.enableSalesActivityModule && (
    !!samSalesmanId || !!samAgentId || !!samCfg.enableCompanySalesMan || !!samCfg.enableAgentModule
  );

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
              <Select value={customerId ?? '__none__'} onValueChange={v => {
                if (v !== '__none__') handleCustomerSelect(v);
              }}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.partyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Sales Assignment (SAM) */}
      {showSamPanel && (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="pt-3 pb-3 space-y-2">
            <p className="text-xs font-semibold text-orange-700">Sales Assignment</p>
            {samCfg?.enableCompanySalesMan && (
              <div className="flex items-center gap-3">
                <Label className="text-xs w-24 shrink-0">Salesman</Label>
                {salesmanAssignmentMode === 'fixed' ? (
                  <Badge variant="outline" className="text-xs">
                    {samSalesmanName ?? '— None —'}
                    <span className="ml-1 text-muted-foreground">(fixed)</span>
                  </Badge>
                ) : (
                  <Select
                    value={samSalesmanId ?? '__none__'}
                    onValueChange={v => {
                      const p = samPersons.find(x => x.id === v);
                      setSamSalesmanId(v === '__none__' ? null : v);
                      setSamSalesmanName(p?.display_name ?? null);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Select salesman" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {samPersons
                        .filter(p => p.person_type === 'salesman' && p.is_active)
                        .map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            {samCfg?.enableAgentModule && (
              <div className="flex items-center gap-3">
                <Label className="text-xs w-24 shrink-0">Agent / Broker</Label>
                <Select
                  value={samAgentId ?? '__none__'}
                  onValueChange={v => {
                    const p = samPersons.find(x => x.id === v);
                    setSamAgentId(v === '__none__' ? null : v);
                    setSamAgentName(p?.display_name ?? null);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Select agent or broker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {samPersons
                      .filter(p => (p.person_type === 'agent' || p.person_type === 'broker') && p.is_active)
                      .map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.display_name}
                          <span className="text-[10px] text-muted-foreground ml-1">({p.person_type})</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {samCfg?.enableReference && (
              <div className="flex items-center gap-3">
                <Label className="text-xs w-24 shrink-0">Reference</Label>
                <Select
                  value={samReferenceId ?? '__none__'}
                  onValueChange={v => {
                    const p = samPersons.find(x => x.id === v);
                    setSamReferenceId(v === '__none__' ? null : v);
                    setSamReferenceName(p?.display_name ?? null);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Select reference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {samPersons
                      .filter(p => p.person_type === 'reference' && p.is_active)
                      .map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Commission Preview */}
      {commissionPreview.length > 0 && (
        <Collapsible defaultOpen>
          <Card className="border-orange-500/30">
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-orange-700 hover:bg-orange-500/5 rounded-t-lg">
                Commission Preview
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-3 space-y-1">
                {commissionPreview.map(r => (
                  <div key={r.person_id} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                    <span>
                      <span className="font-medium">{r.person_name}</span>
                      <span className="text-muted-foreground ml-2">({r.person_type})</span>
                    </span>
                    <span className="font-mono">
                      ₹{r.base_amount.toLocaleString('en-IN')}
                      <span className="text-muted-foreground mx-1">@</span>
                      {r.rate_used}%
                      <span className="text-muted-foreground mx-1">=</span>
                      <span className="font-semibold text-orange-600">₹{r.commission_amount.toLocaleString('en-IN')}</span>
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-xs pt-1 font-semibold">
                  <span>Total commission payable</span>
                  <span className="font-mono text-orange-600">
                    ₹{totalCommissionPreview.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground pt-1">
                  Commission will be recorded as pending. Payment is processed from Commission Register when receipt is collected.
                </p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
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
