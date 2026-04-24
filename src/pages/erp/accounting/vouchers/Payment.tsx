/**
 * Payment.tsx — Full Payment Voucher form
 * Sprint 3B: TDS Auto-Intelligence Enhancement
 * Sprint T10-pre.1a Session B: rewired with TallyVoucherHeader, master pickers,
 * VoucherFormFooter, useEntityCode, useTenantConfig.
 * [JWT] All storage via finecore-engine
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle, Plus, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { SettlementPanel } from '@/components/finecore/SettlementPanel';
import { TallyVoucherHeader } from '@/components/finecore/TallyVoucherHeader';
import { VoucherFormFooter } from '@/components/finecore/VoucherFormFooter';
import { LedgerPicker } from '@/components/finecore/pickers/LedgerPicker';
import { PartyPicker } from '@/components/finecore/pickers/PartyPicker';
import { generateVoucherNo, postVoucher } from '@/lib/finecore-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useVoucherEntityGuard } from '@/hooks/useVoucherEntityGuard';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { mapSACtoTDSSection } from '@/lib/sacTdsMap';
import { computeTDS } from '@/lib/tds-engine';
import { TDS_SECTIONS } from '@/data/compliance-seed-data';
import type { Voucher, BillReference } from '@/types/voucher';
import type { AdvanceEntry } from '@/types/compliance';
import { advancesKey } from '@/types/compliance';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { detectDuplicatePayments, type DuplicateHit } from '@/features/loan-emi/lib/duplicate-detector';
import { DuplicatePaymentWarningModal } from '@/features/loan-emi/components/DuplicatePaymentWarningModal';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

interface VendorRef {
  id: string; partyName: string; pan: string;
  tdsApplicable: boolean; tdsSection: string;
  typeOfBusinessEntity: string;
  lower_deduction_cert: string; lower_deduction_rate: number; lower_deduction_expiry: string;
}

interface POLineRef {
  hsn_sac_code?: string;
}
interface PORef {
  po_no?: string;
  lines?: POLineRef[];
}

function mapBusinessEntityToDeducteeType(entity: string): 'individual' | 'company' | 'huf' | 'no_pan' {
  if (['private_limited', 'public_limited', 'llp', 'opc'].includes(entity)) return 'company';
  if (entity === 'huf') return 'huf';
  return 'individual';
}

interface PaymentPanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function PaymentPanel({ onSaveDraft }: PaymentPanelProps) {
  const { entityCode } = useEntityCode();
  useTenantConfig(entityCode);
  const [voucherNo, setVoucherNo] = useState(() => generateVoucherNo('PV', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [refNo, setRefNo] = useState('');
  const [refDate, setRefDate] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [partyId, setPartyId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [bankCashLedgerId, setBankCashLedgerId] = useState('');
  const [bankCashLedgerName, setBankCashLedgerName] = useState('');
  const [paymentMode, setPaymentMode] = useState<'bank' | 'cash'>('bank');
  const [instrumentRef, setInstrumentRef] = useState('');
  const [instrumentType, setInstrumentType] = useState<'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'Cheque' | 'Cash' | 'DD'>('NEFT');
  const [chequeDate, setChequeDate] = useState('');
  const [bankName, setBankName] = useState('');
  const [amount, setAmount] = useState(0);
  const [narration, setNarration] = useState('');
  const [saving, setSaving] = useState(false);
  const [postedVoucherId, setPostedVoucherId] = useState<string | null>(null);
  const lastSavedRef = useRef(false);

  // T-H1.5-D-D3: party mode + duplicate-detector state
  const [partyMode, setPartyMode] = useState<'vendor' | 'borrowing'>('vendor');
  const [dupHits, setDupHits] = useState<DuplicateHit[]>([]);
  const [dupWarningOpen, setDupWarningOpen] = useState(false);
  const [dupOverrideAcknowledged, setDupOverrideAcknowledged] = useState(false);

  // Reset override flag when key fields change so a stale override can never
  // be reused for a different posting.
  useEffect(() => { setDupOverrideAcknowledged(false); }, [amount, partyId]);

  // Sprint 3B state
  const [paymentPurpose, setPaymentPurpose] = useState<'regular' | 'advance'>('regular');
  const [advancePORef, setAdvancePORef] = useState('');
  const [tdsSection, setTdsSection] = useState('');
  const [tdsRate, setTdsRate] = useState(0);
  const [tdsAmount, setTdsAmount] = useState(0);

  // Load vendors for vendor lookup
  const vendors = useMemo((): VendorRef[] => {
    try {
      // [JWT] GET /api/masters/vendors
      return JSON.parse(localStorage.getItem('erp_group_vendor_master') || '[]');
    } catch { return []; }
  }, []);

  const selectedVendor = useMemo(() =>
    vendors.find(v => v.id === partyId) ?? null,
  [vendors, partyId]);

  const isTdsApplicable = selectedVendor?.tdsApplicable ?? false;

  const deducteeType = useMemo(() => {
    if (!selectedVendor) return 'company' as const;
    if (!selectedVendor.pan) return 'no_pan' as const;
    return mapBusinessEntityToDeducteeType(selectedVendor.typeOfBusinessEntity);
  }, [selectedVendor]);

  // Open advances for selected vendor
  const openAdvances = useMemo(() => {
    if (!selectedVendor) return [];
    // [JWT] GET /api/compliance/advances
    return ls<AdvanceEntry>(advancesKey(entityCode))
      .filter(a => a.party_id === selectedVendor.id && (a.status === 'open' || a.status === 'partial'));
  }, [selectedVendor, entityCode]);

  // TDS Section resolution
  const resolveTDSSection = useCallback((vendor: VendorRef, poRef: string): string => {
    // Priority 1: vendor tdsSection
    if (vendor.tdsSection) return vendor.tdsSection;
    // Priority 2: PO line SAC codes
    if (poRef) {
      // [JWT] GET /api/procurement/purchase-orders
      const pos = ls<PORef>(`erp_purchase_orders_${entityCode}`);
      const po = pos.find((p) => p.po_no === poRef);
      if (po) {
        for (const line of po.lines ?? []) {
          const sec = mapSACtoTDSSection(line.hsn_sac_code ?? '');
          if (sec) return sec;
        }
      }
    }
    return '';
  }, [entityCode]);

  // Auto-compute TDS when section/amount/deductee changes
  useMemo(() => {
    if (!isTdsApplicable || !tdsSection || amount <= 0) {
      setTdsRate(0); setTdsAmount(0);
      return;
    }
    // Check lower deduction cert
    const today = new Date().toISOString().split('T')[0];
    if (selectedVendor?.lower_deduction_cert && selectedVendor.lower_deduction_expiry > today) {
      setTdsRate(selectedVendor.lower_deduction_rate);
      setTdsAmount(Math.round(amount * selectedVendor.lower_deduction_rate / 100));
      return;
    }
    const result = computeTDS(amount, tdsSection, deducteeType === 'huf' ? 'individual' : deducteeType, selectedVendor?.id ?? '', entityCode);
    if (result.applicable) {
      setTdsRate(result.rate);
      setTdsAmount(result.tdsAmount);
    }
  }, [tdsSection, amount, deducteeType, isTdsApplicable, selectedVendor, entityCode]);

  // When vendor selected, resolve TDS section
  useMemo(() => {
    if (selectedVendor && isTdsApplicable) {
      const resolved = resolveTDSSection(selectedVendor, advancePORef);
      if (resolved) setTdsSection(resolved);
    }
  }, [selectedVendor, isTdsApplicable, advancePORef, resolveTDSSection]);

  const activeSections = TDS_SECTIONS.filter(t => t.status === 'active');
  const netPayment = amount - tdsAmount;
  const todayStr = new Date().toISOString().split('T')[0];
  const hasLowerCert = selectedVendor?.lower_deduction_cert && selectedVendor.lower_deduction_expiry > todayStr;

  const clearForm = useCallback(() => {
    setVoucherNo(generateVoucherNo('PV', entityCode));
    setDate(new Date().toISOString().split('T')[0]);
    setRefNo(''); setRefDate(''); setEffectiveDate('');
    setPartyId(''); setPartyName('');
    setBankCashLedgerId(''); setBankCashLedgerName('');
    setPaymentMode('bank'); setInstrumentRef(''); setInstrumentType('NEFT');
    setChequeDate(''); setBankName('');
    setAmount(0); setNarration('');
    setPaymentPurpose('regular'); setAdvancePORef('');
    setTdsSection(''); setTdsRate(0); setTdsAmount(0);
    lastSavedRef.current = false;
    setPostedVoucherId(null);
  }, [entityCode]);

  const handlePost = useCallback(async () => {
    if (!partyName) { toast.error('Vendor is required'); return; }
    if (!bankCashLedgerId) { toast.error('Bank/Cash ledger is required'); return; }
    if (amount <= 0) { toast.error('Amount must be greater than zero'); return; }

    // T-H1.5-D-D3: Pre-post duplicate detection.
    // Heuristic: same party + amount ±₹0.50 + date ±3 days.
    // Override flag is set ONLY by explicit "Post Anyway" click and resets on
    // amount/party change (see useEffect above).
    const partyIdResolved = selectedVendor?.id ?? partyId;
    if (partyIdResolved && !dupOverrideAcknowledged) {
      const hits = detectDuplicatePayments({
        partyId: partyIdResolved,
        amount,
        date,
        entityCode,
      });
      if (hits.length > 0) {
        setDupHits(hits);
        setDupWarningOpen(true);
        return;
      }
    }

    setSaving(true);
    const now = new Date().toISOString();
    const billRefs: BillReference[] = paymentPurpose === 'advance'
      ? [{ voucher_id: '', voucher_no: '', voucher_date: date, amount, type: 'advance' }]
      : [];
    const isCheque = instrumentType === 'Cheque';
    const voucher: Voucher = {
      id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
      voucher_type_name: 'Payment', base_voucher_type: 'Payment',
      entity_id: entityCode, date,
      effective_date: effectiveDate || date,
      ref_no: refNo || undefined, ref_date: refDate || undefined,
      party_id: selectedVendor?.id ?? '',
      party_name: partyName, ref_voucher_no: '',
      vendor_bill_no: '', net_amount: netPayment, narration,
      terms_conditions: '', payment_enforcement: '',
      payment_instrument: `${paymentMode === 'bank' ? 'Bank' : 'Cash'}: ${instrumentRef}`,
      from_ledger_name: bankCashLedgerName, to_ledger_name: partyName,
      from_godown_name: '', to_godown_name: '',
      ledger_lines: [], gross_amount: amount, total_discount: 0,
      total_taxable: 0, total_cgst: 0, total_sgst: 0, total_igst: 0,
      total_cess: 0, total_tax: 0, round_off: 0,
      tds_applicable: isTdsApplicable && tdsAmount > 0,
      tds_section: tdsSection, tds_rate: tdsRate, tds_amount: tdsAmount,
      deductee_pan: selectedVendor?.pan ?? '',
      deductee_type: deducteeType,
      bill_references: billRefs,
      po_ref: advancePORef,
      instrument_type: instrumentType,
      instrument_ref_no: instrumentRef || undefined,
      cheque_date: isCheque ? (chequeDate || undefined) : undefined,
      bank_name: isCheque ? (bankName || undefined) : undefined,
      status: 'draft', created_by: 'current-user', created_at: now, updated_at: now,
    };
    try {
      postVoucher(voucher, entityCode);
      toast.success(`Payment ${voucher.voucher_no} posted`);
      lastSavedRef.current = true;
      setPostedVoucherId(voucher.id);
    } catch {
      toast.error('Failed to save');
      lastSavedRef.current = false;
    } finally {
      setSaving(false);
    }
  }, [partyName, partyId, bankCashLedgerId, bankCashLedgerName, amount, date, voucherNo, paymentMode, instrumentRef, instrumentType, chequeDate, bankName, narration, entityCode, selectedVendor, isTdsApplicable, tdsSection, tdsRate, tdsAmount, deducteeType, paymentPurpose, advancePORef, netPayment, refNo, refDate, effectiveDate, dupOverrideAcknowledged]);

  const handleSaveAndNew = useCallback(async () => {
    await handlePost();
    if (lastSavedRef.current) clearForm();
  }, [handlePost, clearForm]);

  const isDirty = useCallback(
    () => amount > 0 || narration.length > 0 || partyName.length > 0 || bankCashLedgerId.length > 0,
    [amount, narration, partyName, bankCashLedgerId],
  );

  const handleCancel = useCallback(() => {
    if (isDirty() && !window.confirm('Discard this voucher? Unsaved changes will be lost.')) return;
    clearForm();
    toast.info('Voucher discarded.');
  }, [isDirty, clearForm]);

  const serializeFormState = useCallback(
    (): Partial<Voucher> => ({ party_name: partyName, date, net_amount: amount }),
    [partyName, date, amount],
  );

  const { GuardDialog } = useVoucherEntityGuard({
    isDirty,
    serializeFormState,
    onSaveDraft,
    clearForm,
    voucherTypeName: 'Payment',
    fineCoreModule: 'fc-txn-payment',
    currentEntityCode: entityCode,
  });

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`, module: 'fc-txn-payment',
        label: `PV ${partyName || 'New'}`, voucherTypeName: 'Payment',
        savedAt: new Date().toISOString(),
        formState: serializeFormState(),
      });
    }
  }, [onSaveDraft, partyName, serializeFormState]);

  const handlePrint = useCallback(() => {
    if (!postedVoucherId) return;
    window.open(
      `/erp/finecore/payment-print?voucher_id=${postedVoucherId}&entity=${entityCode}`,
      '_blank',
    );
  }, [postedVoucherId, entityCode]);

  const applyAdvance = useCallback((adv: AdvanceEntry) => {
    setAmount(prev => prev + (adv.balance_amount ?? 0));
    toast.success(`Applied advance ${adv.advance_ref_no} (₹${(adv.balance_amount ?? 0).toLocaleString('en-IN')})`);
  }, []);

  return (
    <>
    <div data-keyboard-form className="p-6 max-w-4xl mx-auto space-y-4">
      <TallyVoucherHeader
        voucherTypeName="Payment"
        baseVoucherType="Payment"
        voucherFamily="Accounting"
        voucherNo={voucherNo}
        refNo={refNo} onRefNoChange={setRefNo}
        refDate={refDate} onRefDateChange={setRefDate}
        voucherDate={date} onVoucherDateChange={setDate}
        effectiveDate={effectiveDate || date} onEffectiveDateChange={setEffectiveDate}
        status="draft"
      />

      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* T-H1.5-D-D3: party type toggle (vendor / borrowing) */}
          <div>
            <Label className="text-xs">Party Type</Label>
            <RadioGroup
              value={partyMode}
              onValueChange={(v) => {
                setPartyMode(v as 'vendor' | 'borrowing');
                setPartyId(''); setPartyName('');   // reset on mode change
              }}
              className="flex gap-4 mt-1"
            >
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="vendor" id="pm-v" />
                <Label htmlFor="pm-v" className="text-xs cursor-pointer">Vendor</Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="borrowing" id="pm-b" />
                <Label htmlFor="pm-b" className="text-xs cursor-pointer">Borrowing / Loan</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">{partyMode === 'borrowing' ? 'Loan Ledger *' : 'Party (Vendor) *'}</Label>
              {partyMode === 'borrowing' ? (
                <PartyPicker
                  value={partyId}
                  onChange={(row) => {
                    if (row) { setPartyId(row.id); setPartyName(row.partyName); }
                    else { setPartyId(''); setPartyName(''); }
                  }}
                  entityCode={entityCode}
                  mode="borrowing"
                  compact
                />
              ) : (
                <PartyPicker
                  value={partyId}
                  onChange={(row) => {
                    if (row) { setPartyId(row.id); setPartyName(row.partyName); }
                    else { setPartyId(''); setPartyName(''); }
                  }}
                  entityCode={entityCode}
                  mode="vendor"
                  compact
                />
              )}
            </div>
            <div>
              <Label className="text-xs">Amount (₹) *</Label>
              <Input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={v => setPaymentMode(v as 'bank' | 'cash')}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Bank / Cash Ledger *</Label>
              <LedgerPicker
                value={bankCashLedgerId}
                onChange={(id, name) => { setBankCashLedgerId(id); setBankCashLedgerName(name); }}
                entityCode={entityCode}
                allowedGroups={['CASH', 'BANK']}
                placeholder="Select bank/cash ledger"
                compact
              />
            </div>
            <div>
              <Label className="text-xs">Instrument Type</Label>
              <Select value={instrumentType} onValueChange={v => setInstrumentType(v as typeof instrumentType)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEFT">NEFT</SelectItem>
                  <SelectItem value="RTGS">RTGS</SelectItem>
                  <SelectItem value="IMPS">IMPS</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="DD">Demand Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{instrumentType === 'Cheque' ? 'Cheque No' : instrumentType === 'DD' ? 'DD No' : 'UTR / Ref No'}</Label>
              <Input value={instrumentRef} onChange={e => setInstrumentRef(e.target.value)} onKeyDown={onEnterNext} placeholder="Reference number" />
            </div>
          </div>
          {instrumentType === 'Cheque' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Cheque Date</Label>
                <Input type="date" value={chequeDate} onChange={e => setChequeDate(e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div>
                <Label className="text-xs">Bank Name</Label>
                <Input value={bankName} onChange={e => setBankName(e.target.value)} onKeyDown={onEnterNext} placeholder="Drawee bank" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block A — Payment Purpose (show when TDS applicable) */}
      {isTdsApplicable && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <Label className="text-xs font-semibold">Payment Purpose</Label>
            <div className="flex gap-4">
              {(['regular', 'advance'] as const).map(mode => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="paymentPurpose" checked={paymentPurpose === mode}
                    onChange={() => setPaymentPurpose(mode)}
                    className="accent-teal-500" />
                  <span className="text-xs capitalize">{mode === 'regular' ? 'Regular Payment' : 'Advance Payment'}</span>
                </label>
              ))}
            </div>

            {/* Block B — Advance configuration */}
            {paymentPurpose === 'advance' && (
              <div className="space-y-3 border-t pt-3">
                <div>
                  <Label className="text-xs">Against Purchase Order?</Label>
                  <Input value={advancePORef} onChange={e => setAdvancePORef(e.target.value)}
                    onKeyDown={onEnterNext} placeholder="PO reference (optional)" className="mt-1" />
                  <p className="text-[10px] text-muted-foreground mt-1">If linked to a PO, TDS section will be auto-suggested from PO SAC codes.</p>
                </div>
                {!tdsSection && (
                  <div>
                    <Label className="text-xs">TDS Section (manual)</Label>
                    <Select value={tdsSection} onValueChange={setTdsSection}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select section" /></SelectTrigger>
                      <SelectContent>
                        {activeSections.map(t => (
                          <SelectItem key={t.sectionCode} value={t.sectionCode}>
                            {t.sectionCode} — {t.natureOfPayment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Block C — Interactive TDS Computation Panel */}
      {isTdsApplicable && amount > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold">TDS Deduction</p>
              {tdsSection && <Badge variant="outline" className="text-[10px]">u/s {tdsSection}</Badge>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Section</Label>
                <Select value={tdsSection} onValueChange={setTdsSection}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {activeSections.map(t => (
                      <SelectItem key={t.sectionCode} value={t.sectionCode}>
                        {t.sectionCode} — {t.natureOfPayment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Rate %</Label>
                <Input type="number" value={tdsRate || ''} onChange={e => {
                  const r = parseFloat(e.target.value) || 0;
                  setTdsRate(r);
                  setTdsAmount(Math.round(amount * r / 100));
                }} onKeyDown={onEnterNext} className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">Deductee Type</Label>
                <Input value={deducteeType} readOnly className="text-xs bg-muted/30" />
              </div>
              <div>
                <Label className="text-xs">Gross Amount</Label>
                <Input value={`₹${amount.toLocaleString('en-IN')}`} readOnly className="text-xs bg-muted/30" />
              </div>
              <div>
                <Label className="text-xs">TDS Amount</Label>
                <Input type="number" value={tdsAmount || ''} onChange={e => setTdsAmount(Number(e.target.value))}
                  onKeyDown={onEnterNext} className="text-xs font-bold text-amber-600" />
              </div>
              <div>
                <Label className="text-xs">Net Payment</Label>
                <Input value={`₹${netPayment.toLocaleString('en-IN')}`} readOnly className="text-xs bg-muted/30 font-mono" />
              </div>
            </div>
            {hasLowerCert && (
              <Badge className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30">
                Lower Deduction Cert Active — {selectedVendor?.lower_deduction_cert} @ {selectedVendor?.lower_deduction_rate}%
              </Badge>
            )}
            {deducteeType === 'no_pan' && (
              <Alert className="border-amber-500/30 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-xs text-amber-700">
                  Vendor has no PAN. TDS rate elevated to 20% u/s 206AA.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Block D — Advance outstanding check */}
      {openAdvances.length > 0 && (
        <Alert className="border-blue-500/30 bg-blue-500/5">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-xs text-blue-700">
            <div className="mb-2">This vendor has {openAdvances.length} open advance(s) totalling ₹{openAdvances.reduce((s, a) => s + a.balance_amount, 0).toLocaleString('en-IN')}.</div>
            <div className="space-y-1">
              {openAdvances.map(a => (
                <div key={a.id} className="flex items-center justify-between gap-2 bg-background/60 rounded px-2 py-1">
                  <span className="font-mono text-[11px]">{a.advance_ref_no} — ₹{a.balance_amount.toLocaleString('en-IN')}</span>
                  <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => applyAdvance(a)}>
                    <Plus className="h-3 w-3 mr-1" /> Apply
                  </Button>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <SettlementPanel partyId={partyName} entityCode={entityCode} mode="creditor" />

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Textarea value={narration} onChange={e => setNarration(e.target.value)} placeholder="Payment narration" rows={2} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        {onSaveDraft && <Button variant="outline" onClick={handleSaveDraft}>Save to Draft Tray</Button>}
        {postedVoucherId && (
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Print Payment
          </Button>
        )}
      </div>

      <VoucherFormFooter
        onPost={handlePost}
        onSaveAndNew={handleSaveAndNew}
        onCancel={handleCancel}
        isSaving={saving}
        canPost
        status="draft"
      />
    </div>
    {GuardDialog}
    </>
  );
}

export default function Payment() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Payment Voucher' }]} showDatePicker={false} showCompany={false} />
        <main><PaymentPanel /></main>
      </div>
    </SidebarProvider>
  );
}
