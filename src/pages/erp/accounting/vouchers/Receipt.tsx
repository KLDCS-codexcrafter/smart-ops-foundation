/**
 * Receipt.tsx — Full Receipt Voucher form
 * [JWT] All storage via finecore-engine
 */
import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { SettlementPanel } from '@/components/finecore/SettlementPanel';
import { generateVoucherNo, vouchersKey } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';
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

  const handlePost = useCallback(() => {
    if (!partyName) { toast.error('Party name is required'); return; }
    if (!bankCashLedger) { toast.error('Bank/Cash ledger is required'); return; }
    if (amount <= 0) { toast.error('Amount must be greater than zero'); return; }
    const key = vouchersKey(entityCode);
    try {
      // [JWT] GET /api/accounting/vouchers
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
        voucher_type_name: 'Receipt', base_voucher_type: 'Receipt',
        entity_id: '', date, party_name: partyName, ref_voucher_no: '',
        vendor_bill_no: '', net_amount: amount, narration,
        terms_conditions: '', payment_enforcement: '',
        payment_instrument: `${paymentMode === 'bank' ? 'Bank' : 'Cash'}: ${instrumentRef}`,
        from_ledger_name: partyName, to_ledger_name: bankCashLedger,
        from_godown_name: '', to_godown_name: '',
        ledger_lines: [], gross_amount: amount, total_discount: 0,
        total_taxable: 0, total_cgst: 0, total_sgst: 0, total_igst: 0,
        total_cess: 0, total_tax: 0, round_off: 0, tds_applicable: false,
        status: 'posted', created_by: 'current-user', created_at: now, updated_at: now,
      };
      existing.push(voucher);
      // [JWT] POST /api/accounting/vouchers
      localStorage.setItem(key, JSON.stringify(existing));
      toast.success('Receipt voucher posted');
    } catch { toast.error('Failed to save'); }
  }, [partyName, bankCashLedger, amount, date, voucherNo, paymentMode, instrumentRef, narration, entityCode]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`, module: 'fc-txn-receipt',
        label: `RV ${partyName || 'New'}`, voucherTypeName: 'Receipt',
        savedAt: new Date().toISOString(),
        formState: { party_name: partyName, date, net_amount: amount } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, partyName, date, amount, bankCashLedger]);

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
        <ERPHeader breadcrumbs={[{ label: 'Accounting', href: '/erp/accounting' }, { label: 'Receipt Voucher' }]} showDatePicker={false} showCompany={false} />
        <main><ReceiptPanel /></main>
      </div>
    </SidebarProvider>
  );
}
