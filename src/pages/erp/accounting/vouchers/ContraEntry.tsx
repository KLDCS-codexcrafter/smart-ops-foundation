/**
 * ContraEntry.tsx — Contra Voucher (cash/bank ↔ cash/bank transfer)
 *
 * PURPOSE
 * Records movement of funds between cash and bank ledgers. Supports all 4
 * pairings: bank↔bank, cash↔cash, bank↔cash, cash↔bank. Replaces the
 * earlier binary ContraModeToggle which forced both legs to be the same
 * group, breaking the most common Indian use-case (cash deposit into bank).
 *
 * INPUT        From + To ledgers (filtered to CASH/BANK groups), amount,
 *              instrument type + ref, narration.
 * OUTPUT       Posted Voucher via finecore-engine.postVoucher().
 *
 * DEPENDENCIES TallyVoucherHeader, LedgerPicker, VoucherFormFooter,
 *              useEntityCode, useTenantConfig, finecore-engine.
 *
 * SPEC DOC     Sprint T10-pre.1a Session B — owner-flagged "Contra bug"
 * [JWT] All storage via finecore-engine
 */
import { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { TallyVoucherHeader } from '@/components/finecore/TallyVoucherHeader';
import { LedgerPicker } from '@/components/finecore/pickers/LedgerPicker';
import { VoucherFormFooter } from '@/components/finecore/VoucherFormFooter';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { generateVoucherNo, postVoucher } from '@/lib/finecore-engine';
import type { Voucher, VoucherLedgerLine } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';

type ContraInstrumentType =
  | 'NEFT' | 'RTGS' | 'IMPS' | 'UPI'
  | 'Cheque Deposit' | 'Cheque Withdrawal'
  | 'Cash Deposit' | 'Cash Withdrawal'
  | 'DD' | 'Internal Transfer';

interface ContraEntryPanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function ContraEntryPanel({ onSaveDraft }: ContraEntryPanelProps) {
  const { entityCode } = useEntityCode();
  // accountingMode read so engine.postVoucher emits voucher.posted with the correct routing tag.
  useTenantConfig(entityCode);

  const [voucherNo, setVoucherNo] = useState(() => generateVoucherNo('CT', entityCode));
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [refNo, setRefNo] = useState('');
  const [refDate, setRefDate] = useState('');

  const [fromLedgerId, setFromLedgerId] = useState('');
  const [fromLedgerName, setFromLedgerName] = useState('');
  const [fromLedgerCode, setFromLedgerCode] = useState('');
  const [toLedgerId, setToLedgerId] = useState('');
  const [toLedgerName, setToLedgerName] = useState('');
  const [toLedgerCode, setToLedgerCode] = useState('');

  const [amount, setAmount] = useState(0);
  const [instrumentType, setInstrumentType] = useState<ContraInstrumentType>('NEFT');
  const [instrumentRef, setInstrumentRef] = useState('');
  const [narration, setNarration] = useState('');
  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef(false);

  const clearForm = useCallback(() => {
    setVoucherNo(generateVoucherNo('CT', entityCode));
    setDate(today);
    setEffectiveDate('');
    setRefNo('');
    setRefDate('');
    setFromLedgerId(''); setFromLedgerName(''); setFromLedgerCode('');
    setToLedgerId(''); setToLedgerName(''); setToLedgerCode('');
    setAmount(0);
    setInstrumentType('NEFT');
    setInstrumentRef('');
    setNarration('');
  }, [entityCode, today]);

  const handlePost = useCallback(async () => {
    if (!fromLedgerId || !toLedgerId) { toast.error('Select both From and To ledgers'); return; }
    if (fromLedgerId === toLedgerId) { toast.error('From and To must differ'); return; }
    if (amount <= 0) { toast.error('Amount must be positive'); return; }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const fromLine: VoucherLedgerLine = {
        id: `vl-${Date.now()}-1`,
        ledger_id: fromLedgerId,
        ledger_code: fromLedgerCode || '',
        ledger_name: fromLedgerName,
        ledger_group_code: '',
        dr_amount: 0,
        cr_amount: amount,
        narration: narration || '',
      };
      const toLine: VoucherLedgerLine = {
        id: `vl-${Date.now()}-2`,
        ledger_id: toLedgerId,
        ledger_code: toLedgerCode || '',
        ledger_name: toLedgerName,
        ledger_group_code: '',
        dr_amount: amount,
        cr_amount: 0,
        narration: narration || '',
      };

      const voucher: Voucher = {
        id: `v-${Date.now()}`,
        voucher_no: voucherNo,
        voucher_type_id: 'vt-contra',
        voucher_type_name: 'Contra',
        base_voucher_type: 'Contra',
        entity_id: entityCode,
        date,
        effective_date: effectiveDate || date,
        ref_no: refNo || undefined,
        ref_date: refDate || undefined,
        ledger_lines: [fromLine, toLine],
        gross_amount: amount,
        total_discount: 0,
        total_taxable: 0,
        total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0,
        total_tax: 0,
        round_off: 0,
        net_amount: amount,
        tds_applicable: false,
        narration: narration || '',
        terms_conditions: '',
        payment_enforcement: '',
        payment_instrument: instrumentRef || '',
        from_ledger_name: fromLedgerName,
        to_ledger_name: toLedgerName,
        from_godown_name: '',
        to_godown_name: '',
        instrument_type: instrumentType,
        instrument_ref_no: instrumentRef || undefined,
        status: 'posted',
        created_by: 'current-user',
        created_at: now,
        updated_at: now,
        posted_at: now,
      };

      postVoucher(voucher, entityCode);
      toast.success(`Contra ${voucher.voucher_no} posted`);
      lastSavedRef.current = true;
    } catch (err) {
      console.error('Contra post failed:', err);
      toast.error('Failed to post Contra');
      lastSavedRef.current = false;
    } finally {
      setSaving(false);
    }
  }, [fromLedgerId, fromLedgerName, fromLedgerCode, toLedgerId, toLedgerName, toLedgerCode,
      amount, date, effectiveDate, refNo, refDate, entityCode, narration,
      instrumentType, instrumentRef, voucherNo]);

  const handleSaveAndNew = useCallback(async () => {
    await handlePost();
    if (lastSavedRef.current) {
      clearForm();
      lastSavedRef.current = false;
    }
  }, [handlePost, clearForm]);

  const handleCancel = useCallback(() => {
    if (amount > 0 || narration.length > 0 || fromLedgerId || toLedgerId) {
      if (!window.confirm('Discard this voucher? Unsaved changes will be lost.')) return;
    }
    clearForm();
    toast.info('Voucher discarded.');
  }, [amount, narration, fromLedgerId, toLedgerId, clearForm]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`,
        module: 'fc-txn-contra',
        label: `CT ${fromLedgerName || 'New'}`,
        voucherTypeName: 'Contra',
        savedAt: new Date().toISOString(),
        formState: {
          date,
          from_ledger_name: fromLedgerName,
          to_ledger_name: toLedgerName,
          net_amount: amount,
        } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, date, fromLedgerName, toLedgerName, amount]);

  const refPlaceholder = instrumentType === 'Cheque Deposit' || instrumentType === 'Cheque Withdrawal'
    ? 'Cheque No'
    : instrumentType === 'DD'
      ? 'DD No'
      : instrumentType === 'Cash Deposit' || instrumentType === 'Cash Withdrawal'
        ? 'Slip / Receipt No'
        : 'UTR / Transaction ID';

  return (
    <div data-keyboard-form className="p-5 max-w-4xl mx-auto space-y-4">
      <TallyVoucherHeader
        voucherTypeName="Contra"
        baseVoucherType="Contra"
        voucherFamily="Accounting"
        voucherNo={voucherNo}
        refNo={refNo}
        onRefNoChange={setRefNo}
        refDate={refDate}
        onRefDateChange={setRefDate}
        voucherDate={date}
        onVoucherDateChange={setDate}
        effectiveDate={effectiveDate || date}
        onEffectiveDateChange={setEffectiveDate}
        status="draft"
      />

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">From (Cash or Bank Ledger) *</Label>
              <LedgerPicker
                value={fromLedgerId}
                onChange={(id, name, code) => {
                  setFromLedgerId(id); setFromLedgerName(name); setFromLedgerCode(code ?? '');
                }}
                entityCode={entityCode}
                allowedGroups={['CASH', 'BANK']}
                placeholder="Select source ledger"
                compact
              />
            </div>
            <div>
              <Label className="text-xs">To (Cash or Bank Ledger) *</Label>
              <LedgerPicker
                value={toLedgerId}
                onChange={(id, name, code) => {
                  setToLedgerId(id); setToLedgerName(name); setToLedgerCode(code ?? '');
                }}
                entityCode={entityCode}
                allowedGroups={['CASH', 'BANK']}
                placeholder="Select destination ledger"
                compact
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Amount (₹) *</Label>
              <Input
                type="number"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                onKeyDown={onEnterNext}
              />
            </div>
            <div>
              <Label className="text-xs">Instrument Type</Label>
              <Select value={instrumentType} onValueChange={v => setInstrumentType(v as ContraInstrumentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEFT">NEFT</SelectItem>
                  <SelectItem value="RTGS">RTGS</SelectItem>
                  <SelectItem value="IMPS">IMPS</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Cheque Deposit">Cheque Deposit</SelectItem>
                  <SelectItem value="Cheque Withdrawal">Cheque Withdrawal</SelectItem>
                  <SelectItem value="Cash Deposit">Cash Deposit</SelectItem>
                  <SelectItem value="Cash Withdrawal">Cash Withdrawal</SelectItem>
                  <SelectItem value="DD">Demand Draft</SelectItem>
                  <SelectItem value="Internal Transfer">Internal Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Instrument Ref No</Label>
              <Input
                value={instrumentRef}
                onChange={e => setInstrumentRef(e.target.value)}
                onKeyDown={onEnterNext}
                placeholder={refPlaceholder}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Textarea
            value={narration}
            onChange={e => setNarration(e.target.value)}
            placeholder="Contra narration"
            rows={2}
          />
        </CardContent>
      </Card>

      {onSaveDraft && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleSaveDraft}>Save to Draft Tray</Button>
        </div>
      )}

      <VoucherFormFooter
        onPost={handlePost}
        onSaveAndNew={handleSaveAndNew}
        onCancel={handleCancel}
        isSaving={saving}
        canPost
        status="draft"
      />
    </div>
  );
}

export default function ContraEntry() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Contra Entry' }]} showDatePicker={false} showCompany={false} />
        <main><ContraEntryPanel /></main>
      </div>
    </SidebarProvider>
  );
}
