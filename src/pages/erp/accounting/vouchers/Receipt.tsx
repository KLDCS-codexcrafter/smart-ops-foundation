/**
 * Receipt.tsx — Full Receipt Voucher form
 * Sprint 3B: Customer Advance Tracking
 * [JWT] All storage via finecore-engine
 */
import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { SettlementPanel } from '@/components/finecore/SettlementPanel';
import { generateVoucherNo, postVoucher } from '@/lib/finecore-engine';
import type { Voucher, BillReference } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';

interface ReceiptPanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function ReceiptPanel({ onSaveDraft }: ReceiptPanelProps) {
  const entityCode = 'SMRT';
  const [voucherNo] = useState(() => generateVoucherNo('RV', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [bankCashLedger, setBankCashLedger] = useState('');
  const [paymentMode, setPaymentMode] = useState<'bank' | 'cash'>('bank');
  const [instrumentRef, setInstrumentRef] = useState('');
  const [amount, setAmount] = useState(0);
  const [narration, setNarration] = useState('');
  const [receiptPurpose, setReceiptPurpose] = useState<'regular' | 'advance'>('regular');

  // Load customers for party lookup
  const customers = useMemo((): any[] => {
    try {
      // [JWT] GET /api/masters/customers
      return JSON.parse(localStorage.getItem('erp_group_customer_master') || '[]');
    } catch { return []; }
  }, []);

  const selectedCustomer = useMemo(() =>
    customers.find((c: any) => c.partyName === partyName) ?? null,
  [customers, partyName]);

  const handlePost = useCallback(() => {
    if (!partyName) { toast.error('Party name is required'); return; }
    if (!bankCashLedger) { toast.error('Bank/Cash ledger is required'); return; }
    if (amount <= 0) { toast.error('Amount must be greater than zero'); return; }
    const now = new Date().toISOString();
    const billRefs: BillReference[] = receiptPurpose === 'advance'
      ? [{ voucher_id: '', voucher_no: '', voucher_date: date, amount, type: 'advance' }]
      : [];
    const voucher: Voucher = {
      id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
      voucher_type_name: 'Receipt', base_voucher_type: 'Receipt',
      entity_id: entityCode, date, party_id: selectedCustomer?.id ?? '',
      party_name: partyName, ref_voucher_no: '',
      vendor_bill_no: '', net_amount: amount, narration,
      terms_conditions: '', payment_enforcement: '',
      payment_instrument: `${paymentMode === 'bank' ? 'Bank' : 'Cash'}: ${instrumentRef}`,
      from_ledger_name: partyName, to_ledger_name: bankCashLedger,
      from_godown_name: '', to_godown_name: '',
      ledger_lines: [], gross_amount: amount, total_discount: 0,
      total_taxable: 0, total_cgst: 0, total_sgst: 0, total_igst: 0,
      total_cess: 0, total_tax: 0, round_off: 0, tds_applicable: false,
      bill_references: billRefs,
      status: 'draft', created_by: 'current-user', created_at: now, updated_at: now,
    };
    try {
      postVoucher(voucher, entityCode);
      toast.success('Receipt voucher posted');
    } catch { toast.error('Failed to save'); }
  }, [partyName, bankCashLedger, amount, date, voucherNo, paymentMode, instrumentRef, narration, entityCode, selectedCustomer, receiptPurpose]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`, module: 'fc-txn-receipt',
        label: `RV ${partyName || 'New'}`, voucherTypeName: 'Receipt',
        savedAt: new Date().toISOString(),
        formState: { party_name: partyName, date, net_amount: amount } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, partyName, date, amount]);

  return (
    <div data-keyboard-form className="p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Receipt Voucher</h2>
          <p className="text-xs text-muted-foreground">Record money received from customer</p>
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
              <Label className="text-xs">Amount (₹)</Label>
              <Input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} onKeyDown={onEnterNext} />
            </div>
          </div>

          {/* Receipt Purpose */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Receipt Purpose</Label>
            <div className="flex gap-4">
              {(['regular', 'advance'] as const).map(mode => (
                <label key={mode} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="receiptPurpose" checked={receiptPurpose === mode}
                    onChange={() => setReceiptPurpose(mode)}
                    className="accent-teal-500" />
                  <span className="text-xs capitalize">{mode === 'regular' ? 'Regular Receipt' : 'Advance Receipt'}</span>
                </label>
              ))}
            </div>
            {receiptPurpose === 'advance' && (
              <div className="border-t pt-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Label className="text-xs text-muted-foreground">Against Sales Order?</Label>
                      <Input disabled placeholder="Available Sprint 27" className="opacity-50 mt-1" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Sales Order integration available in Sprint 27</TooltipContent>
                </Tooltip>
                <p className="text-[10px] text-muted-foreground mt-1">This advance will generate ref ADVR/FY/XXXX on save.</p>
              </div>
            )}
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
              <Label className="text-xs">Bank / Cash Ledger</Label>
              <Input value={bankCashLedger} onChange={e => setBankCashLedger(e.target.value)} onKeyDown={onEnterNext} placeholder="Ledger name" />
            </div>
            {paymentMode === 'bank' && (
              <div>
                <Label className="text-xs">Cheque / NEFT / RTGS Ref</Label>
                <Input value={instrumentRef} onChange={e => setInstrumentRef(e.target.value)} onKeyDown={onEnterNext} placeholder="Reference number" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <SettlementPanel partyId={partyName} entityCode={entityCode} mode="debtor" />

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Input value={narration} onChange={e => setNarration(e.target.value)} onKeyDown={onEnterNext} placeholder="Receipt narration" />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        {onSaveDraft && <Button variant="outline" onClick={handleSaveDraft}>Save to Draft Tray</Button>}
        <Button variant="outline" onClick={() => toast.info('Discarded')}>Cancel</Button>
        <Button data-primary onClick={handlePost}><Send className="h-4 w-4 mr-2" />Post</Button>
      </div>
    </div>
  );
}

export default function Receipt() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Receipt Voucher' }]} showDatePicker={false} showCompany={false} />
        <main><ReceiptPanel /></main>
      </div>
    </SidebarProvider>
  );
}
