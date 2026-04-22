/**
 * JournalEntry.tsx — Journal Voucher (general ledger entry)
 *
 * PURPOSE
 * Free-form Dr/Cr entry across any ledgers. Supports optional Party reference
 * (customer or vendor) and optional Department tag for cost reporting.
 *
 * INPUT        Multi-line ledger Dr/Cr grid + optional party/department + narration.
 * OUTPUT       Posted Voucher via finecore-engine.postVoucher().
 *
 * DEPENDENCIES TallyVoucherHeader, PartyPicker, VoucherFormFooter, LedgerLineGrid,
 *              useEntityCode, useTenantConfig, finecore-engine.
 *
 * SPEC DOC     Sprint T10-pre.1a Session B
 *
 * FOLLOW-UP    LedgerLineGrid.tsx still uses a plain text Input for the ledger
 *              name field (see line ~60). A future polish pass should swap it
 *              for an inline <LedgerPicker>. Out of scope here per sprint spec.
 *
 * [JWT] All storage via finecore-engine
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'sonner';

import { LedgerLineGrid } from '@/components/finecore/LedgerLineGrid';
import { TallyVoucherHeader } from '@/components/finecore/TallyVoucherHeader';
import { PartyPicker } from '@/components/finecore/pickers/PartyPicker';
import { VoucherFormFooter } from '@/components/finecore/VoucherFormFooter';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useVoucherEntityGuard } from '@/hooks/useVoucherEntityGuard';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { generateVoucherNo, postVoucher } from '@/lib/finecore-engine';
import type { Voucher, VoucherLedgerLine } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';

interface JournalEntryPanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

interface DepartmentRef { id: string; name: string }

export function JournalEntryPanel({ onSaveDraft }: JournalEntryPanelProps) {
  const { entityCode } = useEntityCode();
  // accountingMode read so engine.postVoucher emits voucher.posted with the correct routing tag.
  useTenantConfig(entityCode);

  const [voucherNo, setVoucherNo] = useState(() => generateVoucherNo('JV', entityCode));
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [refNo, setRefNo] = useState('');
  const [refDate, setRefDate] = useState('');

  const [ledgerLines, setLedgerLines] = useState<VoucherLedgerLine[]>([]);
  const [narration, setNarration] = useState('');

  // Optional party reference
  const [partyId, setPartyId] = useState('');
  const [partyName, setPartyName] = useState('');
  const [partyType, setPartyType] = useState<'customer' | 'vendor' | undefined>(undefined);

  // Optional department tag
  const [departments, setDepartments] = useState<DepartmentRef[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [departmentName, setDepartmentName] = useState('');

  const [saving, setSaving] = useState(false);
  const lastSavedRef = useRef(false);

  useEffect(() => {
    try {
      // [JWT] GET /api/org/departments
      const raw = localStorage.getItem('erp_group_departments');
      if (raw) {
        const parsed = JSON.parse(raw) as DepartmentRef[];
        setDepartments(parsed.filter(d => d?.id && d?.name));
      }
    } catch { /* empty */ }
  }, []);

  const balance = useMemo(() => {
    let dr = 0, cr = 0;
    ledgerLines.forEach(l => { dr += l.dr_amount ?? 0; cr += l.cr_amount ?? 0; });
    return { dr, cr, diff: Math.abs(dr - cr) };
  }, [ledgerLines]);

  const clearForm = useCallback(() => {
    setVoucherNo(generateVoucherNo('JV', entityCode));
    setDate(today);
    setEffectiveDate('');
    setRefNo('');
    setRefDate('');
    setLedgerLines([]);
    setNarration('');
    setPartyId(''); setPartyName(''); setPartyType(undefined);
    setDepartmentId(''); setDepartmentName('');
  }, [entityCode, today]);

  const handlePost = useCallback(async () => {
    if (balance.diff > 0.01) { toast.error('Debit and Credit must balance'); return; }
    if (ledgerLines.length < 2) { toast.error('At least 2 ledger lines required'); return; }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}`,
        voucher_no: voucherNo,
        voucher_type_id: 'vt-journal',
        voucher_type_name: 'Journal Voucher',
        base_voucher_type: 'Journal',
        entity_id: entityCode,
        date,
        effective_date: effectiveDate || date,
        ref_no: refNo || undefined,
        ref_date: refDate || undefined,
        party_id: partyId || undefined,
        party_name: partyName || undefined,
        party_type: partyType,
        department_id: departmentId || undefined,
        department_name: departmentName || undefined,
        ledger_lines: ledgerLines,
        gross_amount: balance.dr,
        total_discount: 0,
        total_taxable: 0,
        total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0,
        total_tax: 0,
        round_off: 0,
        net_amount: balance.dr,
        tds_applicable: false,
        narration: narration || '',
        terms_conditions: '',
        payment_enforcement: '',
        payment_instrument: '',
        from_ledger_name: '',
        to_ledger_name: '',
        from_godown_name: '',
        to_godown_name: '',
        status: 'posted',
        created_by: 'current-user',
        created_at: now,
        updated_at: now,
        posted_at: now,
      };

      postVoucher(voucher, entityCode);
      toast.success(`Journal Voucher ${voucher.voucher_no} posted`);
      lastSavedRef.current = true;
    } catch (err) {
      console.error('JV post failed:', err);
      toast.error('Failed to post Journal Voucher');
      lastSavedRef.current = false;
    } finally {
      setSaving(false);
    }
  }, [balance, ledgerLines, date, effectiveDate, refNo, refDate, voucherNo,
      narration, entityCode, partyId, partyName, partyType, departmentId, departmentName]);

  const handleSaveAndNew = useCallback(async () => {
    await handlePost();
    if (lastSavedRef.current) {
      clearForm();
      lastSavedRef.current = false;
    }
  }, [handlePost, clearForm]);

  const isDirty = useCallback(
    () => ledgerLines.length > 0 || narration.length > 0,
    [ledgerLines.length, narration],
  );

  const handleCancel = useCallback(() => {
    if (isDirty() && !window.confirm('Discard this voucher? Unsaved changes will be lost.')) return;
    clearForm();
    toast.info('Voucher discarded.');
  }, [isDirty, clearForm]);

  const serializeFormState = useCallback(
    (): Partial<Voucher> => ({ date, narration }),
    [date, narration],
  );

  const { GuardDialog } = useVoucherEntityGuard({
    isDirty, serializeFormState, onSaveDraft, clearForm,
    voucherTypeName: 'Journal Voucher',
    fineCoreModule: 'fc-txn-journal',
    currentEntityCode: entityCode,
  });

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`,
        module: 'fc-txn-journal',
        label: `JV ${date}`,
        voucherTypeName: 'Journal Voucher',
        savedAt: new Date().toISOString(),
        formState: serializeFormState(),
      });
    }
  }, [onSaveDraft, date, serializeFormState]);

  return (
    <>
    <div data-keyboard-form className="p-6 max-w-4xl mx-auto space-y-4">
      <TallyVoucherHeader
        voucherTypeName="Journal Voucher"
        baseVoucherType="Journal"
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
              <Label className="text-xs">Party (optional)</Label>
              <PartyPicker
                value={partyId}
                onChange={(row) => {
                  if (row) {
                    setPartyId(row.id);
                    setPartyName(row.partyName);
                    setPartyType(row._partyType);
                  } else {
                    setPartyId(''); setPartyName(''); setPartyType(undefined);
                  }
                }}
                entityCode={entityCode}
                mode="both"
                compact
              />
            </div>
            <div>
              <Label className="text-xs">Department (optional)</Label>
              <Select
                value={departmentId || 'none'}
                onValueChange={(v) => {
                  if (v === 'none') { setDepartmentId(''); setDepartmentName(''); return; }
                  const d = departments.find(x => x.id === v);
                  setDepartmentId(v);
                  setDepartmentName(d?.name ?? '');
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <LedgerLineGrid lines={ledgerLines} onChange={setLedgerLines} />

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between text-sm">
            <span>Total Dr: <span className="font-mono font-semibold">₹{balance.dr.toLocaleString('en-IN')}</span></span>
            <span>Total Cr: <span className="font-mono font-semibold">₹{balance.cr.toLocaleString('en-IN')}</span></span>
            <span className={balance.diff > 0.01 ? 'text-destructive font-semibold' : 'text-success font-semibold'}>
              Difference: ₹{balance.diff.toLocaleString('en-IN')}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Textarea
            value={narration}
            onChange={e => setNarration(e.target.value)}
            placeholder="Journal narration"
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
        canPost={balance.diff <= 0.01 && ledgerLines.length >= 2}
        status="draft"
      />
    </div>
    {GuardDialog}
    </>
  );
}

export default function JournalEntry() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Journal Entry' }]} showDatePicker={false} showCompany={false} />
        <main><JournalEntryPanel /></main>
      </div>
    </SidebarProvider>
  );
}
