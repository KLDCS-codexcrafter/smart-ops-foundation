/**
 * CreditNote.tsx — Full Credit Note form
 * Sprint 4: Auto-trigger commission reversal + optional reversal JV.
 * [JWT] All storage via finecore-engine
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, FileMinus, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { InvoiceModeToggle } from '@/components/finecore/InvoiceModeToggle';
import { InventoryLineGrid } from '@/components/finecore/InventoryLineGrid';
import { LedgerLineGrid } from '@/components/finecore/LedgerLineGrid';
import { GSTComputationPanel } from '@/components/finecore/GSTComputationPanel';
import {
  generateVoucherNo,
  postVoucher,
  vouchersKey,
} from '@/lib/finecore-engine';
import type { Voucher, VoucherInventoryLine, VoucherLedgerLine } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { triggerCommissionReversal } from '@/lib/commission-engine';
import type { CommissionEntry } from '@/types/commission-register';
import { commissionRegisterKey } from '@/types/commission-register';
import type { TDSDeductionEntry } from '@/types/compliance';
import { tdsDeductionsKey } from '@/types/compliance';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useVoucherEntityGuard } from '@/hooks/useVoucherEntityGuard';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { salesReturnMemosKey, type SalesReturnMemo } from '@/types/sales-return-memo';

const REASON_CODES = [
  'Goods Return', 'Price Correction', 'Excess Charged',
  'Discount Post-Sale', 'Short Delivery', 'Quality Issue', 'Other',
];

interface CreditNotePanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function CreditNotePanel({ onSaveDraft }: CreditNotePanelProps) {
  const { entityCode } = useEntityCode();
  const [searchParams] = useSearchParams();
  const fromMemoId = searchParams.get('from_memo');

  const [voucherNo] = useState(() => generateVoucherNo('CN', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [partyId, setPartyId] = useState('');
  const [againstInvoice, setAgainstInvoice] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [invoiceMode, setInvoiceMode] = useState<'item' | 'accounting'>('item');
  const [inventoryLines, setInventoryLines] = useState<VoucherInventoryLine[]>([]);
  const [ledgerLines, setLedgerLines] = useState<VoucherLedgerLine[]>([]);
  const [narration, setNarration] = useState('');
  const [selectedMemoId, setSelectedMemoId] = useState<string>(fromMemoId ?? '');
  const [postedVoucherId, setPostedVoucherId] = useState<string | null>(null);

  const [reversalBanner, setReversalBanner] = useState<string | null>(null);
  const [pendingReversalJV, setPendingReversalJV] = useState<{
    lines: VoucherLedgerLine[];
    banner: string;
  } | null>(null);

  // Sprint 6B — load approved memos for from-memo selector
  const approvedMemos = useMemo(() => {
    try {
      // [JWT] GET /api/salesx/sales-return-memos
      const all = JSON.parse(localStorage.getItem(salesReturnMemosKey(entityCode)) || '[]') as SalesReturnMemo[];
      return all.filter(m => m.status === 'approved');
    } catch { return []; }
  }, [entityCode]);

  // Pre-fill from selected memo
  const applyMemo = useCallback((memoId: string) => {
    const memo = (() => {
      try {
        const all = JSON.parse(localStorage.getItem(salesReturnMemosKey(entityCode)) || '[]') as SalesReturnMemo[];
        return all.find(m => m.id === memoId) ?? null;
      } catch { return null; }
    })();
    if (!memo) return;
    setSelectedMemoId(memoId);
    setPartyName(memo.customer_name);
    setPartyId(memo.customer_id);
    setAgainstInvoice(memo.against_invoice_no);
    setNarration(`Per Sales Return Memo ${memo.memo_no}`);
    setInvoiceMode('item');
    setInventoryLines(memo.items.map((it, i) => ({
      id: `inv-mem-${Date.now()}-${i}`,
      item_id: '', item_code: '', item_name: it.item_name,
      hsn_sac_code: '', godown_id: '', godown_name: '',
      qty: it.qty, uom: it.uom ?? '', rate: it.rate,
      discount_percent: 0, discount_amount: 0,
      taxable_value: it.amount,
      gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
      cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
      total: it.amount,
      gst_type: 'taxable' as const, gst_source: 'item' as const,
    })));
  }, [entityCode]);

  useEffect(() => {
    if (fromMemoId) applyMemo(fromMemoId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromMemoId]);

  const gstTotals = useMemo(() => {
    const t = { taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, total: 0 };
    inventoryLines.forEach(l => {
      t.taxable += l.taxable_value; t.cgst += l.cgst_amount;
      t.sgst += l.sgst_amount; t.igst += l.igst_amount; t.total += l.total;
    });
    return t;
  }, [inventoryLines]);

  const handlePost = useCallback(() => {
    if (!partyName) { toast.error('Party name is required'); return; }
    if (!againstInvoice) { toast.error('Against Invoice No is required'); return; }
    if (!reasonCode) { toast.error('Reason code is required'); return; }
    const key = vouchersKey(entityCode);
    try {
      // [JWT] GET /api/accounting/vouchers
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
        voucher_type_name: 'Credit Note', base_voucher_type: 'Credit Note',
        entity_id: '', date, party_name: partyName, ref_voucher_no: againstInvoice,
        vendor_bill_no: '', net_amount: gstTotals.total, narration,
        terms_conditions: '', payment_enforcement: '', payment_instrument: '',
        from_ledger_name: '', to_ledger_name: '',
        from_godown_name: '', to_godown_name: '',
        ledger_lines: ledgerLines, inventory_lines: inventoryLines,
        gross_amount: gstTotals.taxable, total_discount: 0, total_taxable: gstTotals.taxable,
        total_cgst: gstTotals.cgst, total_sgst: gstTotals.sgst, total_igst: gstTotals.igst,
        total_cess: 0, total_tax: gstTotals.cgst + gstTotals.sgst + gstTotals.igst,
        round_off: 0, tds_applicable: false, status: 'posted',
        created_by: 'current-user', created_at: now, updated_at: now,
        invoice_mode: invoiceMode,
      };
      existing.push(voucher);
      // [JWT] POST /api/accounting/vouchers
      localStorage.setItem(key, JSON.stringify(existing));

      // Trigger commission reversal on credit note (Sprint 4)
      if (againstInvoice) {
        const allEntries: CommissionEntry[] = (() => {
          try {
            // [JWT] GET /api/salesx/commission-register
            return JSON.parse(localStorage.getItem(commissionRegisterKey(entityCode)) || '[]');
          } catch { return []; }
        })();
        const allTDS: TDSDeductionEntry[] = (() => {
          try {
            // [JWT] GET /api/compliance/tds-deductions
            return JSON.parse(localStorage.getItem(tdsDeductionsKey(entityCode)) || '[]');
          } catch { return []; }
        })();
        if (allEntries.some(e => e.voucher_no === againstInvoice)) {
          const result = triggerCommissionReversal(
            voucherNo, gstTotals.taxable, againstInvoice, date,
            allEntries, allTDS,
          );
          // [JWT] PATCH /api/salesx/commission-register
          localStorage.setItem(
            commissionRegisterKey(entityCode),
            JSON.stringify(result.updatedEntries),
          );
          if (result.cancelledTDSIds.length > 0) {
            const tdsStore = allTDS.map(t =>
              result.cancelledTDSIds.includes(t.id)
                ? { ...t, status: 'cancelled' as const } : t,
            );
            // [JWT] PATCH /api/compliance/tds-deductions
            localStorage.setItem(tdsDeductionsKey(entityCode), JSON.stringify(tdsStore));
          }
          if (result.banner) setReversalBanner(result.banner);
          if (result.reversalJVLines) {
            setPendingReversalJV({ lines: result.reversalJVLines, banner: result.banner });
          }
        }
      }

      // Sprint 6B — flip memo to credit_note_posted
      if (selectedMemoId) {
        try {
          const all = JSON.parse(localStorage.getItem(salesReturnMemosKey(entityCode)) || '[]') as SalesReturnMemo[];
          const idx = all.findIndex(m => m.id === selectedMemoId);
          if (idx >= 0) {
            all[idx] = {
              ...all[idx],
              status: 'credit_note_posted',
              credit_note_voucher_id: voucher.id,
              credit_note_voucher_no: voucherNo,
              credit_note_posted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            // [JWT] PATCH /api/salesx/sales-return-memos/:id
            localStorage.setItem(salesReturnMemosKey(entityCode), JSON.stringify(all));
            toast.success(`Memo ${all[idx].memo_no} marked as CN posted`);
          }
        } catch { /* ignore */ }
      }

      toast.success('Credit Note posted');
      setPostedVoucherId(voucher.id);
    } catch { toast.error('Failed to save'); }
  }, [partyName, againstInvoice, reasonCode, gstTotals, date, voucherNo, narration, ledgerLines, inventoryLines, invoiceMode, entityCode, selectedMemoId]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`, module: 'fc-txn-credit-note',
        label: `CN ${partyName || 'New'}`, voucherTypeName: 'Credit Note',
        savedAt: new Date().toISOString(),
        formState: { party_name: partyName, date, ref_voucher_no: againstInvoice } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, partyName, date, againstInvoice]);

  const isDirty = useCallback(
    () => !!partyName || !!againstInvoice || !!reasonCode || !!narration || inventoryLines.length > 0 || ledgerLines.length > 0,
    [partyName, againstInvoice, reasonCode, narration, inventoryLines, ledgerLines],
  );
  const serializeFormState = useCallback(
    (): Partial<Voucher> => ({
      party_name: partyName, date, ref_voucher_no: againstInvoice, narration,
      inventory_lines: inventoryLines, ledger_lines: ledgerLines,
    }),
    [partyName, date, againstInvoice, narration, inventoryLines, ledgerLines],
  );
  const clearForm = useCallback(() => {
    setPartyName(''); setPartyId(''); setAgainstInvoice(''); setReasonCode('');
    setInventoryLines([]); setLedgerLines([]); setNarration(''); setSelectedMemoId('');
    setReversalBanner(null); setPendingReversalJV(null);
    setPostedVoucherId(null);
  }, []);

  const handlePrint = useCallback(() => {
    if (!postedVoucherId) return;
    window.open(
      `/erp/finecore/credit-note-print?voucher_id=${postedVoucherId}&entity=${entityCode}`,
      '_blank',
    );
  }, [postedVoucherId, entityCode]);
  const { GuardDialog } = useVoucherEntityGuard({
    isDirty, serializeFormState, onSaveDraft, clearForm,
    voucherTypeName: 'Credit Note',
    fineCoreModule: 'fc-txn-credit-note',
    currentEntityCode: entityCode,
  });

  return (
    <>
    {GuardDialog}
    <div data-keyboard-form className="p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Credit Note</h2>
          <p className="text-xs text-muted-foreground">Issue credit note against sales invoice</p>
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
              <Label className="text-xs">Party</Label>
              <Input value={partyName} onChange={e => setPartyName(e.target.value)} onKeyDown={onEnterNext} placeholder="Customer name" />
            </div>
            <div className="flex items-end">
              <InvoiceModeToggle mode={invoiceMode} onToggle={setInvoiceMode} hasLines={inventoryLines.length > 0 || ledgerLines.length > 0} />
            </div>
          </div>
          {approvedMemos.length > 0 && (
            <div>
              <Label className="text-xs flex items-center gap-1">
                <FileMinus className="h-3 w-3 text-orange-500" /> From Sales Return Memo (optional)
              </Label>
              <Select value={selectedMemoId || 'none'} onValueChange={v => v !== 'none' && applyMemo(v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pick approved memo to pre-fill" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {approvedMemos.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.memo_no} — {m.customer_name} — ₹{m.total_amount.toLocaleString('en-IN')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Against Invoice No</Label>
              <Input value={againstInvoice} onChange={e => setAgainstInvoice(e.target.value)} onKeyDown={onEnterNext} placeholder="Original invoice number (mandatory)" />
            </div>
            <div>
              <Label className="text-xs">Reason Code</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select reason" /></SelectTrigger>
                <SelectContent>
                  {REASON_CODES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoiceMode === 'item' ? (
        <InventoryLineGrid lines={inventoryLines} onChange={setInventoryLines} mode="credit" showTax isInterState={false} />
      ) : (
        <LedgerLineGrid lines={ledgerLines} onChange={setLedgerLines} />
      )}

      {invoiceMode === 'item' && <GSTComputationPanel lines={inventoryLines} isInterState={false} />}

      {reversalBanner && !pendingReversalJV && (
        <Alert className="border-orange-500/30 bg-orange-500/5">
          <AlertDescription className="text-xs text-orange-700">
            ↩ {reversalBanner}
          </AlertDescription>
        </Alert>
      )}

      {pendingReversalJV && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-3 space-y-2">
            <p className="text-xs font-semibold text-amber-700">
              Commission already paid – reversal journal required
            </p>
            <p className="text-xs text-muted-foreground">{pendingReversalJV.banner}</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                data-primary
                className="bg-amber-600 hover:bg-amber-700"
                onClick={() => {
                  const jvNo = generateVoucherNo('JV', entityCode);
                  const jv: Voucher = {
                    id: `v-${Date.now()}`,
                    voucher_no: jvNo,
                    voucher_type_id: '',
                    voucher_type_name: 'Journal',
                    base_voucher_type: 'Journal',
                    entity_id: entityCode,
                    date,
                    party_name: partyName,
                    ref_voucher_no: voucherNo,
                    vendor_bill_no: '',
                    net_amount: 0,
                    narration: `Commission reversal JV - ${voucherNo}`,
                    terms_conditions: '', payment_enforcement: '',
                    payment_instrument: '', from_ledger_name: '', to_ledger_name: '',
                    from_godown_name: '', to_godown_name: '',
                    ledger_lines: pendingReversalJV.lines,
                    gross_amount: 0, total_discount: 0, total_taxable: 0,
                    total_cgst: 0, total_sgst: 0, total_igst: 0,
                    total_cess: 0, total_tax: 0, round_off: 0,
                    tds_applicable: false, status: 'draft',
                    created_by: 'current-user',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  };
                  try {
                    // [JWT] POST /api/accounting/vouchers (reversal JV)
                    postVoucher(jv, entityCode);
                    toast.success(`Reversal JV ${jvNo} posted`);
                  } catch { toast.error('Failed to post reversal JV'); }
                  setPendingReversalJV(null);
                }}
              >
                Post Reversal JV
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPendingReversalJV(null)}>
                Dismiss (post manually)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Input value={narration} onChange={e => setNarration(e.target.value)} onKeyDown={onEnterNext} placeholder="Credit note narration" />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        {onSaveDraft && <Button variant="outline" onClick={handleSaveDraft}>Save to Draft Tray</Button>}
        <Button variant="outline" onClick={() => toast.info('Discarded')}>Cancel</Button>
        <Button data-primary onClick={handlePost}><Send className="h-4 w-4 mr-2" />Post</Button>
        {postedVoucherId && (
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Print Credit Note
          </Button>
        )}
      </div>
    </div>
    </>
  );
}

export default function CreditNote() {
  const { entityCode } = useEntityCode();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Credit Note' }]} showDatePicker={false} />
        <main>{entityCode ? <CreditNotePanel /> : <SelectCompanyGate title="Select a company to create a Credit Note" />}</main>
      </div>
    </SidebarProvider>
  );
}
