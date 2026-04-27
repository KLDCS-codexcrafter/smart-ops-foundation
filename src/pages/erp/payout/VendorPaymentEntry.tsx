/**
 * @file     VendorPaymentEntry.tsx
 * @purpose  Vendor Payment Voucher entry form — mirrors Payment.tsx pattern with
 *           vendor-only defaults · uses payment-engine orchestrator for save.
 * @sprint   T-T8.2-Foundation (Group B Sprint B.2)
 * @whom     Operators saving vendor payment vouchers
 *
 * MIRROR (not modify) of Payment.tsx · D-127 voucher-form zero-touch streak preserved.
 * Lives in src/pages/erp/payout/ (NEW directory · NOT in vouchers/).
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { LedgerPicker } from '@/components/finecore/pickers/LedgerPicker';
import { PartyPicker } from '@/components/finecore/pickers/PartyPicker';
import { generateVoucherNo } from '@/lib/finecore-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { computeTDS } from '@/lib/tds-engine';
import { TDS_SECTIONS } from '@/data/compliance-seed-data';
import { processVendorPayment } from '@/lib/payment-engine';
import type { BillReference } from '@/types/voucher';
// [T-T8.3-AdvanceIntel] Advance toggle + proactive banner (additive)
import { UnmatchedAdvanceBanner } from '@/components/payout/UnmatchedAdvanceBanner';

interface VendorRef {
  id: string;
  partyName: string;
  pan: string;
  tdsApplicable: boolean;
  tdsSection: string;
  typeOfBusinessEntity: string;
  msmeCategory?: 'micro' | 'small' | 'medium' | null;
  primary_division_id?: string;
  primary_department_id?: string;
}

function ls<T>(key: string): T[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

function mapBusinessEntityToDeducteeType(entity: string): 'individual' | 'company' | 'huf' | 'no_pan' {
  if (['private_limited', 'public_limited', 'llp', 'opc'].includes(entity)) return 'company';
  if (entity === 'huf') return 'huf';
  return 'individual';
}

export default function VendorPaymentEntry() {
  const { entityCode } = useEntityCode();
  const [voucherNo, setVoucherNo] = useState(() => generateVoucherNo('PV', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [refNo, setRefNo] = useState('');
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
  const [tdsSection, setTdsSection] = useState('');
  const [tdsRate, setTdsRate] = useState(0);
  const [tdsAmount, setTdsAmount] = useState(0);
  const [departmentId, setDepartmentId] = useState('');
  const [bills, setBills] = useState<BillReference[]>([]);
  // [T-T8.3-AdvanceIntel] Payment purpose · 'advance' triggers finecore-engine
  // auto-create AdvanceEntry via bill_references[].type='advance' at line 452-475.
  const [paymentPurpose, setPaymentPurpose] = useState<'regular' | 'advance'>('regular');
  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef(false);

  const vendors = useMemo((): VendorRef[] => ls<VendorRef>('erp_group_vendor_master'), []);
  const selectedVendor = useMemo(() => vendors.find(v => v.id === partyId) ?? null, [vendors, partyId]);
  const isTdsApplicable = selectedVendor?.tdsApplicable ?? false;

  const deducteeType = useMemo(() => {
    if (!selectedVendor) return 'company' as const;
    if (!selectedVendor.pan) return 'no_pan' as const;
    return mapBusinessEntityToDeducteeType(selectedVendor.typeOfBusinessEntity);
  }, [selectedVendor]);

  // Auto-fill division/department from vendor master (Q-BB a · operator can override)
  useEffect(() => {
    if (selectedVendor?.primary_department_id) setDepartmentId(selectedVendor.primary_department_id);
    if (selectedVendor?.tdsSection && isTdsApplicable) setTdsSection(selectedVendor.tdsSection);
  }, [selectedVendor, isTdsApplicable]);

  // Auto-compute TDS via existing tds-engine (no duplicate logic)
  useEffect(() => {
    if (!isTdsApplicable || !tdsSection || amount <= 0) {
      setTdsRate(0); setTdsAmount(0);
      return;
    }
    const result = computeTDS(amount, tdsSection,
      deducteeType === 'huf' ? 'individual' : deducteeType,
      selectedVendor?.id ?? '', entityCode);
    if (result.applicable) {
      setTdsRate(result.rate);
      setTdsAmount(result.tdsAmount);
    } else {
      setTdsRate(0); setTdsAmount(0);
    }
  }, [tdsSection, amount, deducteeType, isTdsApplicable, selectedVendor, entityCode]);

  const activeSections = TDS_SECTIONS.filter(t => t.status === 'active');
  const netPayment = amount - tdsAmount;

  const clearForm = useCallback(() => {
    setVoucherNo(generateVoucherNo('PV', entityCode));
    setDate(new Date().toISOString().split('T')[0]);
    setRefNo(''); setPartyId(''); setPartyName('');
    setBankCashLedgerId(''); setBankCashLedgerName('');
    setPaymentMode('bank'); setInstrumentRef(''); setInstrumentType('NEFT');
    setChequeDate(''); setBankName('');
    setAmount(0); setNarration('');
    setTdsSection(''); setTdsRate(0); setTdsAmount(0);
    setBills([]); setDepartmentId('');
    lastSavedRef.current = false;
  }, [entityCode]);

  const addBillRow = useCallback(() => {
    setBills(prev => [...prev, { voucher_id: '', voucher_no: '', voucher_date: date, amount: 0, type: 'against_ref' }]);
  }, [date]);

  const updateBill = useCallback((idx: number, patch: Partial<BillReference>) => {
    setBills(prev => prev.map((b, i) => i === idx ? { ...b, ...patch } : b));
  }, []);

  const removeBill = useCallback((idx: number) => {
    setBills(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(async () => {
    if (!partyName) { toast.error('Vendor is required'); return; }
    if (!bankCashLedgerId) { toast.error('Bank/Cash ledger is required'); return; }
    if (amount <= 0) { toast.error('Amount must be greater than zero'); return; }
    setSaving(true);
    // [T-T8.3-AdvanceIntel] When purpose='advance' · write a single advance
    // bill_reference · finecore-engine line 452-475 auto-creates AdvanceEntry.
    const effectiveBillRefs: BillReference[] = paymentPurpose === 'advance'
      ? [{
          voucher_id: '', voucher_no: '', voucher_date: date,
          amount, type: 'advance',
        }]
      : bills;
    const result = processVendorPayment({
      entityCode,
      vendorId: partyId,
      vendorName: partyName,
      vendorPan: selectedVendor?.pan,
      bankCashLedgerId,
      bankCashLedgerName,
      amount,
      date,
      refNo: refNo || undefined,
      paymentMode,
      instrumentType,
      instrumentRef,
      chequeDate: chequeDate || undefined,
      bankName: bankName || undefined,
      narration,
      billReferences: effectiveBillRefs,
      applyTDS: isTdsApplicable && tdsAmount > 0,
      tdsSection: tdsSection || undefined,
      deducteeType,
      divisionId: selectedVendor?.primary_division_id,
      departmentId: departmentId || undefined,
    });
    setSaving(false);
    if (result.ok) {
      const purposeLabel = paymentPurpose === 'advance' ? ' · advance auto-tagged' : '';
      toast.success(`Vendor Payment ${result.voucherNo} posted${purposeLabel}`);
      lastSavedRef.current = true;
    } else {
      toast.error(result.errors?.[0] ?? 'Save failed');
      lastSavedRef.current = false;
    }
  }, [entityCode, partyId, partyName, selectedVendor, bankCashLedgerId, bankCashLedgerName,
      amount, date, refNo, paymentMode, instrumentType, instrumentRef, chequeDate, bankName,
      narration, bills, paymentPurpose, isTdsApplicable, tdsAmount, tdsSection, deducteeType, departmentId]);

  const handleSaveAndNew = useCallback(async () => {
    await handleSave();
    if (lastSavedRef.current) clearForm();
  }, [handleSave, clearForm]);

  const isMSME = selectedVendor?.msmeCategory === 'micro' || selectedVendor?.msmeCategory === 'small';

  return (
    <div data-keyboard-form className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Vendor Payment Voucher</h1>
          <p className="text-xs text-muted-foreground">Voucher No: <span className="font-mono">{voucherNo}</span></p>
        </div>
        <Badge variant="outline" className="text-violet-600 border-violet-300">PayOut · B.2</Badge>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Date *</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Reference No</Label>
              <Input value={refNo} onChange={e => setRefNo(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Amount (₹) *</Label>
              <Input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} onKeyDown={onEnterNext} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Vendor *</Label>
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
              {isMSME && (
                <Badge variant="outline" className="text-[9px] mt-1 border-amber-500/40 text-amber-600">
                  MSME · {selectedVendor?.msmeCategory} · 43B(h) applicable
                </Badge>
              )}
            </div>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* [T-T8.3-AdvanceIntel] Payment Purpose + Unmatched Advance Banner */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Payment Purpose</Label>
              <Select value={paymentPurpose} onValueChange={v => setPaymentPurpose(v as 'regular' | 'advance')}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular Payment (against bills)</SelectItem>
                  <SelectItem value="advance">Advance Payment (on-account)</SelectItem>
                </SelectContent>
              </Select>
              {paymentPurpose === 'advance' && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Will auto-create AdvanceEntry (ADVP/FY/XXXX) on save · settle later via Bill Settlement screen.
                </p>
              )}
            </div>
            <div className="flex items-end">
              {paymentPurpose === 'advance' && (
                <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-600 dark:text-violet-300">
                  Advance Mode · finecore auto-tag active
                </Badge>
              )}
            </div>
          </div>
          {partyId && paymentPurpose === 'regular' && (
            <UnmatchedAdvanceBanner
              entityCode={entityCode}
              vendorId={partyId}
              onApplyAdvance={(adv) => {
                toast.info(
                  `Advance ${adv.advance_ref_no} (${adv.balance_amount.toLocaleString('en-IN')}) noted · settle via Bill Settlement after invoice posted`,
                );
              }}
            />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">Bill Allocation</Label>
            <Button size="sm" variant="outline" onClick={addBillRow}>+ Add Bill</Button>
          </div>
          {bills.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No bill allocations · payment will post on-account.</p>
          ) : (
            <div className="space-y-2">
              {bills.map((b, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center text-xs">
                  <Input className="col-span-3 h-8" placeholder="Bill No" value={b.voucher_no}
                    onChange={e => updateBill(i, { voucher_no: e.target.value })} />
                  <Input className="col-span-3 h-8" type="date" value={b.voucher_date}
                    onChange={e => updateBill(i, { voucher_date: e.target.value })} />
                  <Input className="col-span-2 h-8" type="number" placeholder="Amount" value={b.amount || ''}
                    onChange={e => updateBill(i, { amount: Number(e.target.value) })} />
                  <Select value={b.type} onValueChange={v => updateBill(i, { type: v as BillReference['type'] })}>
                    <SelectTrigger className="col-span-3 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="against_ref">Against Bill</SelectItem>
                      <SelectItem value="advance">Advance</SelectItem>
                      <SelectItem value="new">New Reference</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="col-span-1 h-8" onClick={() => removeBill(i)}>×</Button>
                </div>
              ))}
            </div>
          )}
          {/* [B.3] advance balance display will populate here once advance auto-tag engine ships */}
          <p className="text-[10px] text-muted-foreground italic">Advance available: — (Coming in B.3)</p>
        </CardContent>
      </Card>

      {/* TDS panel */}
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
                }} className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">TDS Amount</Label>
                <Input type="number" value={tdsAmount || ''} onChange={e => setTdsAmount(Number(e.target.value))}
                  className="text-xs font-bold text-amber-600" />
              </div>
              <div>
                <Label className="text-xs">Net Payment</Label>
                <Input value={`₹${netPayment.toLocaleString('en-IN')}`} readOnly className="text-xs bg-muted/30 font-mono" />
              </div>
            </div>
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

      {selectedVendor?.primary_department_id && (
        <Alert className="border-blue-500/30 bg-blue-500/5">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-xs">
            Auto-tagged · Department {departmentId || '—'} from vendor master · operator can override (Coming in B.6 with full 5-tier picker).
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Textarea value={narration} onChange={e => setNarration(e.target.value)} placeholder="Payment narration" rows={2} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={clearForm}>Clear</Button>
        <Button variant="outline" onClick={handleSaveAndNew} disabled={saving}>Save & New</Button>
        <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
          {saving ? 'Saving…' : 'Post Vendor Payment'}
        </Button>
      </div>
    </div>
  );
}
