/**
 * SalesInvoice.tsx — Full Sales Invoice form
 * Sprint 3B: Customer Advance Linking
 * Sprint 3 SalesX: SAM assignment + commission preview + commission-on-receipt register booking
 * [JWT] All storage via finecore-engine
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { ChevronDown, Send, Info, Link2, ShieldAlert, FileText, Truck, Printer, X } from 'lucide-react';
import { checkCreditHold } from '@/lib/credit-hold-engine';
import {
  creditHoldAuditKey, type CreditHoldCheck, type CreditHoldOverride,
} from '@/types/credit-hold';
import type { OutstandingEntry } from '@/types/voucher';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
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
import { isCommissionAlreadyBooked } from '@/lib/commission-engine';
import type { CommissionResult } from '@/lib/sam-engine';
import type { CommissionEntry } from '@/types/commission-register';
import { commissionRegisterKey } from '@/types/commission-register';
import type { SAMPerson } from '@/types/sam-person';
import { samPersonsKey } from '@/types/sam-person';
import { comply360SAMKey } from '@/pages/erp/accounting/Comply360Config';
import type { SAMConfig } from '@/pages/erp/accounting/Comply360Config';
import { notifyDistributorInvoicePosted } from '@/lib/distributor-whatsapp-notify';
import { resolveCustomerAddress } from '@/lib/customer-address-lookup';
import { entityGstKey, DEFAULT_ENTITY_GST_CONFIG } from '@/types/entity-gst';

interface CustomerRow {
  id: string;
  partyName: string;
  partyCode?: string;
  creditLimit?: number;
  warningLimit?: number;
  credit_hold_mode?: import('@/types/credit-hold').CreditHoldMode | null;
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

  // ── Sprint 8 — Credit hold state ────────────────────────────────
  const [creditCheck, setCreditCheck] = useState<CreditHoldCheck | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  // ── Sprint 9 — IRN / EWB state ──────────────────────────────────
  const [postedVoucherId, setPostedVoucherId] = useState<string | null>(null);
  const [postedVoucherNo, setPostedVoucherNo] = useState<string>('');
  const [irnStatus, setIrnStatus] = useState<'pending' | 'generated' | 'cancelled' | 'failed'>('pending');
  const [currentIrn, setCurrentIrn] = useState<string | null>(null);
  const [irnAckDate, setIrnAckDate] = useState<string | null>(null);
  const [ewbBusy, setEwbBusy] = useState(false);
  const [irnBusy, setIrnBusy] = useState(false);
  const [irnCancelOpen, setIrnCancelOpen] = useState(false);
  const [irnCancelReason, setIrnCancelReason] = useState('1');
  const [irnCancelRemarks, setIrnCancelRemarks] = useState('');
  const [ewbDialogOpen, setEwbDialogOpen] = useState(false);
  const [ewbVehicleNo, setEwbVehicleNo] = useState('');
  const [ewbTransporter, setEwbTransporter] = useState('');
  const [ewbDistanceKm, setEwbDistanceKm] = useState<number>(100);

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

  const recordOverride = useCallback((check: CreditHoldCheck, reason: string, by: string) => {
    try {
      // [JWT] POST /api/receivx/credit-hold/override
      const auditKey = creditHoldAuditKey(entityCode);
      const existing: CreditHoldOverride[] = JSON.parse(localStorage.getItem(auditKey) || '[]');
      const now = new Date().toISOString();
      const entry: CreditHoldOverride = {
        id: `cho-${Date.now()}`, entity_id: entityCode,
        party_id: check.party_id, party_name: check.party_name,
        voucher_type: 'sales_invoice', voucher_ref: voucherNo,
        amount: check.new_invoice_amount,
        current_outstanding: check.current_outstanding,
        credit_limit: check.credit_limit,
        over_limit_by: check.over_limit_by,
        override_reason: reason,
        approved_by_user: by,
        approved_at: now, created_at: now,
      };
      existing.push(entry);
      localStorage.setItem(auditKey, JSON.stringify(existing));
    } catch { /* noop */ }
  }, [entityCode, voucherNo]);

  const commitVoucher = useCallback(() => {
    const key = vouchersKey(entityCode);
    try {
      // [JWT] GET /api/accounting/vouchers
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      // Audit fix #3+#8: resolve real customer address + persist state codes
      const cust = customers.find(c => c.id === customerId) ?? null;
      const resolved = resolveCustomerAddress(customerId, partyName, placeOfSupply);
      const customerGstinValue = (() => {
        try {
          const raw = localStorage.getItem('erp_group_customer_master');
          const list: Array<{ id: string; gstin?: string }> = raw ? JSON.parse(raw) : [];
          return list.find(x => x.id === customerId)?.gstin ?? '';
        } catch { return ''; }
      })();
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
        party_id: cust?.id,
        party_gstin: customerGstinValue || undefined,
        party_state_code: resolved.state_code || placeOfSupply || undefined,
        customer_state_code: resolved.state_code || placeOfSupply || undefined,
        place_of_supply: placeOfSupply || resolved.state_code || undefined,
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
      setPostedVoucherId(voucher.id);
      setPostedVoucherNo(voucher.voucher_no);
      setIrnStatus('pending');
      setCurrentIrn(null);
      setIrnAckDate(null);

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

      // Check if commission was already booked at Delivery Note stage
      const allRegForGuard: CommissionEntry[] = (() => {
        try {
          // [JWT] GET /api/salesx/commission-register
          return JSON.parse(localStorage.getItem(commissionRegisterKey(entityCode)) || '[]');
        } catch { return []; }
      })();
      const commissionAlreadyAtDN = againstDN
        ? isCommissionAlreadyBooked(againstDN, allRegForGuard)
        : false;

      // Write pending CommissionEntry for each SAM result — NO GL POSTING
      // Commission is payable on receipt, not here.
      if (commissionPreview.length > 0 && !commissionAlreadyAtDN) {
        const regStore: CommissionEntry[] = (() => {
          try {
            // [JWT] GET /api/salesx/commission-register?entityCode={entityCode}
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
            // Sprint 4 — CN reversal + GL voucher + agent invoice + catch-up TDS
            credit_note_amount: 0,
            credit_note_refs: [],
            net_invoice_amount: gstTotals.total,
            net_total_commission: result.commission_amount,
            commission_expense_ledger_id: person?.commission_expense_ledger_id ?? null,
            commission_expense_ledger_name: person?.commission_expense_ledger_name ?? null,
            commission_expense_voucher_id: null,
            commission_expense_voucher_no: null,
            agent_invoice_no: null,
            agent_invoice_date: null,
            agent_invoice_gross_amount: null,
            agent_invoice_gst_amount: null,
            agent_invoice_status: null,
            agent_invoice_variance: null,
            agent_invoice_dispute_reason: null,
            catchup_tds_required: false,
            catchup_tds_amount: 0,
            source_document: 'sales_invoice',
            bank_payment_voucher_id: null,
            bank_payment_voucher_no: null,
            bank_payment_date: null,
            collection_bonus_earned: false,
            collection_bonus_window_days: 0,
            collection_bonus_amount: 0,
            receipt_within_window: false,
            status: 'pending',
            created_at: now,
            updated_at: now,
          };
          regStore.push(entry);
        });
        // [JWT] POST /api/salesx/commission-register
        localStorage.setItem(commissionRegisterKey(entityCode), JSON.stringify(regStore));
      } else if (commissionAlreadyAtDN) {
        toast.info('Commission already recorded at Delivery Note stage — skipping.');
      }

      // Sprint 10 Part D · Feature #5 — notify distributor on WhatsApp.
      try {
        const cust = customers.find(c => c.id === customerId);
        const phone = (cust as unknown as { phone?: string; contact_mobile?: string } | undefined);
        const contact = phone?.phone ?? phone?.contact_mobile ?? '';
        if (cust && contact) {
          const portalLink = `${window.location.origin}/erp/distributor/invoices`;
          notifyDistributorInvoicePosted(
            entityCode,
            { id: cust.id, name: partyName, phone: contact },
            voucher,
            portalLink,
          );
        }
      } catch { /* best-effort */ }

      toast.success('Sales Invoice posted');
    } catch { toast.error('Failed to save'); }
  }, [
    partyName, date, voucherNo, againstDN, gstTotals, narration, termsConditions, paymentTerms,
    ledgerLines, inventoryLines, invoiceMode, entityCode, linkedAdvance, againstSO, openSOs, fulfillOrderLine,
    samSalesmanId, samSalesmanName, samAgentId, samAgentName, samReferenceId, samReferenceName,
    commissionPreview, customerId, samPersons,
  ]);

  const handlePost = useCallback(() => {
    if (!partyName) { toast.error('Party name is required'); return; }
    // ── Sprint 8 — Credit hold check ────────────────────────
    try {
      // [JWT] GET /api/receivx/config
      const cfgRaw = localStorage.getItem(`erp_receivx_config_${entityCode}`);
      const cfg = cfgRaw ? JSON.parse(cfgRaw) : null;
      const customer = customers.find(c => c.id === customerId);
      if (cfg && customer && Array.isArray(cfg.credit_hold_block_on)
        && cfg.credit_hold_block_on.includes('sales_invoice')) {
        // [JWT] GET /api/accounting/outstanding
        const allOut: OutstandingEntry[] = JSON.parse(
          localStorage.getItem(`erp_outstanding_${entityCode}`) || '[]',
        );
        const check = checkCreditHold(
          {
            id: customer.id,
            partyCode: customer.partyCode ?? '',
            partyName: customer.partyName,
            creditLimit: customer.creditLimit ?? 0,
            warningLimit: customer.warningLimit ?? 0,
            credit_hold_mode: customer.credit_hold_mode ?? null,
          },
          gstTotals.total,
          allOut,
          cfg.credit_hold_mode ?? 'soft_warn',
          cfg.credit_hold_ratio ?? 1.0,
        );
        if (check.is_blocked) {
          setCreditCheck(check);
          setOverrideReason('');
          setOverrideOpen(true);
          return;
        }
        if (check.is_warning) {
          toast.warning(check.block_reason || 'Customer over warning limit');
          recordOverride(check, 'soft_warn_auto', 'system');
        }
      }
    } catch { /* noop — credit check failure should not block */ }
    commitVoucher();
  }, [partyName, entityCode, customers, customerId, gstTotals.total, commitVoucher, recordOverride]);

  const confirmOverride = useCallback(() => {
    if (!creditCheck) return;
    if (overrideReason.trim().length < 10) {
      toast.error('Override reason must be at least 10 characters');
      return;
    }
    recordOverride(creditCheck, overrideReason.trim(), 'current-user');
    setOverrideOpen(false);
    setCreditCheck(null);
    commitVoucher();
  }, [creditCheck, overrideReason, recordOverride, commitVoucher]);

  // Sprint 9 polish: Ctrl+S triggers Post (unless override dialog is open)
  useCtrlS(() => { if (!overrideOpen) handlePost(); });


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

  // ── Sprint 9 — IRN / EWB action handlers ────────────────────────
  const handleGenerateIRN = useCallback(async () => {
    if (!postedVoucherId) { toast.error('Post the invoice first'); return; }
    setIrnBusy(true);
    try {
      const { buildIRNPayload, generateIRN } = await import('@/lib/irn-engine');
      const { irnRecordsKey } = await import('@/types/irn');
      const gstRaw = localStorage.getItem(entityGstKey(entityCode));
      const gst = gstRaw ? { ...DEFAULT_ENTITY_GST_CONFIG, ...JSON.parse(gstRaw) } : { ...DEFAULT_ENTITY_GST_CONFIG, entity_id: entityCode };
      const allV: Voucher[] = JSON.parse(localStorage.getItem(vouchersKey(entityCode)) || '[]');
      const v = allV.find(x => x.id === postedVoucherId);
      if (!v) { toast.error('Voucher not found'); return; }
      // Audit fix #3: real customer address
      const resolved = resolveCustomerAddress(v.party_id ?? null, v.party_name ?? null,
        v.customer_state_code ?? v.party_state_code ?? null);
      const payload = buildIRNPayload(
        v, gst.gstin, gst.legal_name, gst.address_line_1, gst.city, gst.pincode, gst.state_code,
        v.party_gstin ?? '', resolved.legal_name || v.party_name || '', resolved.full_address || 'NA',
        resolved.city, resolved.pincode,
        resolved.state_code || v.customer_state_code || v.party_state_code || '',
      );
      const rec = await generateIRN(payload, {
        username: gst.irp_username, password: gst.irp_password,
        client_id: gst.irp_client_id, client_secret: gst.irp_client_secret,
        gsp_provider: gst.gsp_provider, test_mode: gst.irp_test_mode,
      }, v, entityCode);
      // [JWT] POST /api/finecore/irn
      const all = JSON.parse(localStorage.getItem(irnRecordsKey(entityCode)) || '[]');
      all.push(rec);
      localStorage.setItem(irnRecordsKey(entityCode), JSON.stringify(all));
      const idx = allV.findIndex(x => x.id === postedVoucherId);
      if (idx >= 0) {
        allV[idx] = { ...allV[idx], irn: rec.irn ?? undefined, irn_status: rec.status, irn_ack_no: rec.ack_no ?? undefined, irn_ack_date: rec.ack_date ?? undefined, irn_signed_qr: rec.signed_qr_code ?? undefined };
        localStorage.setItem(vouchersKey(entityCode), JSON.stringify(allV));
      }
      setIrnStatus(rec.status);
      setCurrentIrn(rec.irn);
      setIrnAckDate(rec.ack_date);
      if (rec.status === 'generated') toast.success('IRN generated');
      else toast.error(`IRN failed: ${rec.error_message ?? 'unknown'}`);
    } finally { setIrnBusy(false); }
  }, [postedVoucherId, entityCode]);

  const handleCancelIRN = useCallback(async () => {
    if (!currentIrn || !postedVoucherId) return;
    if (irnCancelRemarks.trim().length < 10) { toast.error('Remarks min 10 chars'); return; }
    setIrnBusy(true);
    try {
      const { cancelIRN } = await import('@/lib/irn-engine');
      const { irnRecordsKey } = await import('@/types/irn');
      const gstRaw = localStorage.getItem(entityGstKey(entityCode));
      const gst = gstRaw ? { ...DEFAULT_ENTITY_GST_CONFIG, ...JSON.parse(gstRaw) } : DEFAULT_ENTITY_GST_CONFIG;
      const patch = await cancelIRN(currentIrn, irnCancelReason, irnCancelRemarks.trim(), {
        username: gst.irp_username, password: gst.irp_password,
        client_id: gst.irp_client_id, client_secret: gst.irp_client_secret,
        gsp_provider: gst.gsp_provider, test_mode: gst.irp_test_mode,
      });
      const all = JSON.parse(localStorage.getItem(irnRecordsKey(entityCode)) || '[]');
      const updated = all.map((r: { voucher_id: string }) => r.voucher_id === postedVoucherId ? { ...r, ...patch } : r);
      localStorage.setItem(irnRecordsKey(entityCode), JSON.stringify(updated));
      setIrnStatus('cancelled');
      setIrnCancelOpen(false);
      setIrnCancelRemarks('');
      toast.success('IRN cancelled');
    } finally { setIrnBusy(false); }
  }, [currentIrn, postedVoucherId, irnCancelReason, irnCancelRemarks, entityCode]);

  const handleGenerateEWB = useCallback(async () => {
    if (!postedVoucherId) return;
    setEwbBusy(true);
    try {
      const { buildEWBPayload, generateEWB } = await import('@/lib/ewb-engine');
      const { ewbRecordsKey } = await import('@/types/irn');
      const gstRaw = localStorage.getItem(entityGstKey(entityCode));
      const gst = gstRaw ? { ...DEFAULT_ENTITY_GST_CONFIG, ...JSON.parse(gstRaw) } : DEFAULT_ENTITY_GST_CONFIG;
      const allV: Voucher[] = JSON.parse(localStorage.getItem(vouchersKey(entityCode)) || '[]');
      const v = allV.find(x => x.id === postedVoucherId);
      if (!v) return;
      // Audit fix #3: real customer address (not party_name)
      const resolved = resolveCustomerAddress(v.party_id ?? null, v.party_name ?? null,
        v.customer_state_code ?? v.party_state_code ?? null);
      const ctx = {
        voucher: v, irn: currentIrn,
        supplier_gstin: gst.gstin, supplier_state_code: gst.state_code,
        supplier_address: gst.address_line_1,
        customer_gstin: v.party_gstin ?? '',
        customer_state_code: resolved.state_code || v.customer_state_code || v.party_state_code || '',
        customer_address: resolved.full_address || 'NA',
        transporter_id: null, transporter_name: ewbTransporter || null,
        vehicle_no: ewbVehicleNo || null, vehicle_type: 'regular' as const,
        transport_mode: 'road' as const, transport_distance_km: ewbDistanceKm,
        sub_supply_type: 'supply' as const, doc_type: 'INV' as const, supply_type: 'outward' as const,
      };
      const payload = buildEWBPayload(ctx);
      const rec = await generateEWB(payload, {
        username: gst.ewb_username, password: gst.ewb_password, test_mode: gst.ewb_test_mode,
      }, ctx, entityCode);
      const all = JSON.parse(localStorage.getItem(ewbRecordsKey(entityCode)) || '[]');
      all.push(rec);
      localStorage.setItem(ewbRecordsKey(entityCode), JSON.stringify(all));
      const idx = allV.findIndex(x => x.id === postedVoucherId);
      if (idx >= 0) {
        allV[idx] = { ...allV[idx], ewb_no: rec.ewb_no ?? undefined, ewb_status: rec.status, ewb_valid_until: rec.valid_until ?? undefined, vehicle_no: ewbVehicleNo || undefined, transporter: ewbTransporter || undefined };
        localStorage.setItem(vouchersKey(entityCode), JSON.stringify(allV));
      }
      setEwbDialogOpen(false);
      if (rec.status === 'generated') toast.success(`E-Way Bill generated: ${rec.ewb_no}`);
      else toast.error(`EWB failed: ${rec.error_message ?? 'unknown'}`);
    } finally { setEwbBusy(false); }
  }, [postedVoucherId, entityCode, currentIrn, ewbVehicleNo, ewbTransporter, ewbDistanceKm]);

  const handlePrintInvoice = useCallback(() => {
    if (!postedVoucherId) return;
    window.open(`/erp/finecore/invoice-print?voucher_id=${postedVoucherId}&entity=${entityCode}`, '_blank');
  }, [postedVoucherId, entityCode]);

  // ── Audit fix #1+#2: auto-generate IRN on post + auto-EWB above threshold ──
  const autoFiredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!postedVoucherId || autoFiredFor.current === postedVoucherId) return;
    autoFiredFor.current = postedVoucherId;
    try {
      const gstRaw = localStorage.getItem(entityGstKey(entityCode));
      const gst = gstRaw ? { ...DEFAULT_ENTITY_GST_CONFIG, ...JSON.parse(gstRaw) } : DEFAULT_ENTITY_GST_CONFIG;
      const allV: Voucher[] = JSON.parse(localStorage.getItem(vouchersKey(entityCode)) || '[]');
      const v = allV.find(x => x.id === postedVoucherId);
      if (!v) return;
      // Auto IRN
      if (gst.irp_api_enabled && gst.auto_generate_irn_on_post) {
        toast.info('Auto-generating IRN as per Comply360 setting…');
        void handleGenerateIRN();
      }
      // Auto EWB threshold check
      if (gst.ewb_api_enabled && gst.auto_generate_ewb_above > 0
        && v.net_amount > gst.auto_generate_ewb_above
        && (v.customer_state_code ?? v.party_state_code) !== gst.state_code) {
        toast.info(`Invoice exceeds ₹${gst.auto_generate_ewb_above.toLocaleString('en-IN')} interstate threshold — opening E-Way Bill dialog`);
        setEwbDialogOpen(true);
      }
    } catch { /* noop */ }
  }, [postedVoucherId, entityCode, handleGenerateIRN]);

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

      {/* Sprint 9 — IRN / EWB / Print toolbar (visible after Post) */}
      {postedVoucherId && (
        <Card className="border-teal-500/30">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs">
                <div className="font-semibold flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-teal-500" />
                  e-Invoice / E-Way Bill — {postedVoucherNo}
                </div>
                <div className="text-muted-foreground mt-0.5">
                  IRN: <span className="font-mono">{currentIrn ? currentIrn.slice(0, 24) + '…' : '—'}</span>
                  <span className="ml-2">Status: <Badge variant="outline" className="text-[9px] ml-1">{irnStatus}</Badge></span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {irnStatus !== 'generated' && (
                  <Button size="sm" variant="outline" onClick={handleGenerateIRN} disabled={irnBusy}>
                    <FileText className="h-3.5 w-3.5 mr-1" /> Generate IRN
                  </Button>
                )}
                {irnStatus === 'generated' && (
                  <Button size="sm" variant="outline" className="text-destructive"
                    onClick={() => setIrnCancelOpen(true)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel IRN
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setEwbDialogOpen(true)} disabled={ewbBusy}>
                  <Truck className="h-3.5 w-3.5 mr-1" /> Generate E-Way Bill
                </Button>
                <Button size="sm" data-primary onClick={handlePrintInvoice}>
                  <Printer className="h-3.5 w-3.5 mr-1" /> Print Invoice
                </Button>
              </div>
            </div>
            {irnAckDate && (
              <div className="text-[10px] text-muted-foreground">
                Acknowledged at {(() => {
                  const d = new Date(irnAckDate);
                  if (Number.isNaN(d.getTime())) return irnAckDate;
                  const ist = new Date(d.getTime() + 330 * 60 * 1000);
                  const day = String(ist.getUTCDate()).padStart(2, '0');
                  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                  const hh = String(ist.getUTCHours()).padStart(2, '0');
                  const mm = String(ist.getUTCMinutes()).padStart(2, '0');
                  return `${day} ${months[ist.getUTCMonth()]} ${ist.getUTCFullYear()} ${hh}:${mm} IST`;
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancel IRN dialog */}
      <Dialog open={irnCancelOpen} onOpenChange={setIrnCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel IRN</DialogTitle>
            <DialogDescription>Cancellation must be done within 24 hours of generation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Reason</Label>
              <select value={irnCancelReason} onChange={e => setIrnCancelReason(e.target.value)}
                className="w-full h-8 text-xs rounded-md border border-input bg-background px-2">
                <option value="1">Duplicate</option>
                <option value="2">Data Entry Mistake</option>
                <option value="3">Order Cancelled</option>
                <option value="4">Other</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">Remarks (min 10 chars)</Label>
              <Textarea rows={3} value={irnCancelRemarks}
                onChange={e => setIrnCancelRemarks(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">{irnCancelRemarks.trim().length}/10</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIrnCancelOpen(false)}>Close</Button>
            <Button data-primary variant="destructive" onClick={handleCancelIRN}
              disabled={irnBusy || irnCancelRemarks.trim().length < 10}>Cancel IRN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate EWB dialog */}
      <Dialog open={ewbDialogOpen} onOpenChange={setEwbDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate E-Way Bill</DialogTitle>
            <DialogDescription>
              EWB is mandatory for interstate movement of goods over ₹50,000.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Vehicle Number</Label>
              <Input value={ewbVehicleNo} onChange={e => setEwbVehicleNo(e.target.value.toUpperCase())}
                placeholder="MH12AB1234" className="h-8 text-sm font-mono uppercase" />
            </div>
            <div>
              <Label className="text-xs">Transporter</Label>
              <Input value={ewbTransporter} onChange={e => setEwbTransporter(e.target.value)}
                className="h-8 text-sm" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Distance (km)</Label>
              <Input type="number" value={ewbDistanceKm}
                onChange={e => setEwbDistanceKm(Number(e.target.value) || 0)}
                className="h-8 text-sm font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEwbDialogOpen(false)}>Close</Button>
            <Button data-primary onClick={handleGenerateEWB} disabled={ewbBusy || ewbDistanceKm <= 0}>
              Generate E-Way Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Credit Hold Triggered
            </DialogTitle>
            <DialogDescription>
              Customer over credit limit. Override requires written reason (min 10 chars), logged to audit.
            </DialogDescription>
          </DialogHeader>

          {creditCheck && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{creditCheck.block_reason}</AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="text-muted-foreground">Credit Limit</div>
                <div className="font-mono text-right">₹{creditCheck.credit_limit.toLocaleString('en-IN')}</div>

                <div className="text-muted-foreground">Current Outstanding</div>
                <div className="font-mono text-right">₹{creditCheck.current_outstanding.toLocaleString('en-IN')}</div>

                {creditCheck.overdue_outstanding > 0 && (
                  <>
                    <div className="text-muted-foreground">Of Which Overdue</div>
                    <div className="font-mono text-right text-warning">
                      ₹{creditCheck.overdue_outstanding.toLocaleString('en-IN')}
                    </div>
                  </>
                )}

                <div className="text-muted-foreground">New Invoice</div>
                <div className="font-mono text-right">₹{creditCheck.new_invoice_amount.toLocaleString('en-IN')}</div>

                <div className="text-muted-foreground font-semibold">Over By</div>
                <div className="font-mono text-right font-semibold text-destructive">
                  ₹{creditCheck.over_limit_by.toLocaleString('en-IN')}
                </div>
              </div>

              <div>
                <Label htmlFor="override-reason" className="text-xs">Override Reason (min 10 chars)</Label>
                <Textarea
                  id="override-reason"
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Key account, payment confirmed for next week"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {overrideReason.trim().length}/10 characters
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOverrideOpen(false); setCreditCheck(null); }}>
              Cancel
            </Button>
            <Button data-primary variant="destructive"
              disabled={overrideReason.trim().length < 10}
              onClick={confirmOverride}>
              Override and Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
