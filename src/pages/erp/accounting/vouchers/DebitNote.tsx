/**
 * DebitNote.tsx — Full Debit Note form
 * [JWT] All storage via finecore-engine
 */
import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { InvoiceModeToggle } from '@/components/finecore/InvoiceModeToggle';
import { InventoryLineGrid } from '@/components/finecore/InventoryLineGrid';
import { LedgerLineGrid } from '@/components/finecore/LedgerLineGrid';
import { GSTComputationPanel } from '@/components/finecore/GSTComputationPanel';
import { generateVoucherNo, vouchersKey } from '@/lib/finecore-engine';
import type { Voucher, VoucherInventoryLine, VoucherLedgerLine } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useVoucherEntityGuard } from '@/hooks/useVoucherEntityGuard';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

const REASON_CODES = [
  'Goods Return', 'Short Supply', 'Overcharge',
  'Quality Rejection', 'Freight Reversal', 'Other',
];

interface DebitNotePanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function DebitNotePanel({ onSaveDraft }: DebitNotePanelProps) {
  const { entityCode } = useEntityCode();
  const [voucherNo] = useState(() => generateVoucherNo('DN', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [againstBill, setAgainstBill] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [invoiceMode, setInvoiceMode] = useState<'item' | 'accounting'>('item');
  const [inventoryLines, setInventoryLines] = useState<VoucherInventoryLine[]>([]);
  const [ledgerLines, setLedgerLines] = useState<VoucherLedgerLine[]>([]);
  const [narration, setNarration] = useState('');

  const gstTotals = useMemo(() => {
    const t = { taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0, total: 0 };
    inventoryLines.forEach(l => {
      t.taxable += l.taxable_value; t.cgst += l.cgst_amount;
      t.sgst += l.sgst_amount; t.igst += l.igst_amount; t.total += l.total;
    });
    return t;
  }, [inventoryLines]);

  const handlePost = useCallback(() => {
    if (!partyName) { toast.error('Vendor name is required'); return; }
    if (!againstBill) { toast.error('Against Bill No is required'); return; }
    if (!reasonCode) { toast.error('Reason code is required'); return; }
    const key = vouchersKey(entityCode);
    try {
      // [JWT] GET /api/accounting/vouchers
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
        voucher_type_name: 'Debit Note', base_voucher_type: 'Debit Note',
        entity_id: '', date, party_name: partyName, ref_voucher_no: againstBill,
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
      toast.success('Debit Note posted');
    } catch { toast.error('Failed to save'); }
  }, [partyName, againstBill, reasonCode, gstTotals, date, voucherNo, narration, ledgerLines, inventoryLines, invoiceMode, entityCode]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`, module: 'fc-txn-debit-note',
        label: `DBN ${partyName || 'New'}`, voucherTypeName: 'Debit Note',
        savedAt: new Date().toISOString(),
        formState: { party_name: partyName, date, ref_voucher_no: againstBill } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, partyName, date, againstBill, reasonCode, inventoryLines]);

  const isDirty = useCallback(
    () => !!partyName || !!againstBill || !!reasonCode || !!narration || inventoryLines.length > 0 || ledgerLines.length > 0,
    [partyName, againstBill, reasonCode, narration, inventoryLines, ledgerLines],
  );
  const serializeFormState = useCallback(
    (): Partial<Voucher> => ({
      party_name: partyName, date, ref_voucher_no: againstBill, narration,
      inventory_lines: inventoryLines, ledger_lines: ledgerLines,
    }),
    [partyName, date, againstBill, narration, inventoryLines, ledgerLines],
  );
  const clearForm = useCallback(() => {
    setPartyName(''); setAgainstBill(''); setReasonCode('');
    setInventoryLines([]); setLedgerLines([]); setNarration('');
  }, []);
  const { GuardDialog } = useVoucherEntityGuard({
    isDirty, serializeFormState, onSaveDraft, clearForm,
    voucherTypeName: 'Debit Note',
    fineCoreModule: 'fc-txn-debit-note',
    currentEntityCode: entityCode,
  });

  return (
    <>
    {GuardDialog}
    <div data-keyboard-form className="p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Debit Note</h2>
          <p className="text-xs text-muted-foreground">Issue debit note against purchase invoice</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Against Bill No</Label>
              <Input value={againstBill} onChange={e => setAgainstBill(e.target.value)} onKeyDown={onEnterNext} placeholder="Original bill number (mandatory)" />
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
        <InventoryLineGrid lines={inventoryLines} onChange={setInventoryLines} mode="debit" showTax isInterState={false} />
      ) : (
        <LedgerLineGrid lines={ledgerLines} onChange={setLedgerLines} />
      )}

      {invoiceMode === 'item' && <GSTComputationPanel lines={inventoryLines} isInterState={false} />}

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Input value={narration} onChange={e => setNarration(e.target.value)} onKeyDown={onEnterNext} placeholder="Debit note narration" />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        {onSaveDraft && <Button variant="outline" onClick={handleSaveDraft}>Save to Draft Tray</Button>}
        <Button variant="outline" onClick={() => toast.info('Discarded')}>Cancel</Button>
        <Button data-primary onClick={handlePost}><Send className="h-4 w-4 mr-2" />Post</Button>
      </div>
    </div>
    </>
  );
}

export default function DebitNote() {
  const { entityCode } = useEntityCode();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Debit Note' }]} showDatePicker={false} />
        <main>{entityCode ? <DebitNotePanel /> : <SelectCompanyGate title="Select a company to create a Debit Note" />}</main>
      </div>
    </SidebarProvider>
  );
}
