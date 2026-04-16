/**
 * ContraEntry.tsx — Full Contra Entry form
 * [JWT] All storage via finecore-engine
 */
import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { ContraModeToggle } from '@/components/finecore/ContraModeToggle';
import { generateVoucherNo, vouchersKey } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';

interface ContraEntryPanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function ContraEntryPanel({ onSaveDraft }: ContraEntryPanelProps) {
  const entityCode = 'SMRT';
  const [voucherNo] = useState(() => generateVoucherNo('CT', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [contraMode, setContraMode] = useState<'bank_transfer' | 'cash_transfer'>('bank_transfer');
  const [fromLedger, setFromLedger] = useState('');
  const [toLedger, setToLedger] = useState('');
  const [amount, setAmount] = useState(0);
  const [instrumentRef, setInstrumentRef] = useState('');
  const [narration, setNarration] = useState('');

  const handlePost = useCallback(() => {
    if (!fromLedger || !toLedger) { toast.error('Both From and To ledgers are required'); return; }
    if (fromLedger === toLedger) { toast.error('From and To ledgers must be different'); return; }
    if (amount <= 0) { toast.error('Amount must be greater than zero'); return; }
    const key = vouchersKey(entityCode);
    try {
      // [JWT] GET /api/accounting/vouchers
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
        voucher_type_name: 'Contra', base_voucher_type: 'Contra',
        entity_id: '', date, party_name: '', ref_voucher_no: '',
        vendor_bill_no: '', net_amount: amount, narration,
        terms_conditions: '', payment_enforcement: '',
        payment_instrument: instrumentRef,
        from_ledger_name: fromLedger, to_ledger_name: toLedger,
        from_godown_name: '', to_godown_name: '',
        ledger_lines: [], gross_amount: amount, total_discount: 0,
        total_taxable: 0, total_cgst: 0, total_sgst: 0, total_igst: 0,
        total_cess: 0, total_tax: 0, round_off: 0, tds_applicable: false,
        status: 'posted', created_by: 'current-user', created_at: now, updated_at: now,
        contra_mode: contraMode,
      };
      existing.push(voucher);
      // [JWT] POST /api/accounting/vouchers
      localStorage.setItem(key, JSON.stringify(existing));
      toast.success('Contra entry posted');
    } catch { toast.error('Failed to save'); }
  }, [fromLedger, toLedger, amount, date, voucherNo, instrumentRef, narration, contraMode, entityCode]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`, module: 'fc-txn-contra',
        label: `CT ${fromLedger || 'New'}`, voucherTypeName: 'Contra',
        savedAt: new Date().toISOString(),
        formState: { date, from_ledger_name: fromLedger, to_ledger_name: toLedger, net_amount: amount } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, date, fromLedger, toLedger, amount, contraMode]);

  return (
    <div data-keyboard-form className="p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Contra Entry</h2>
          <p className="text-xs text-muted-foreground">Bank-to-bank or cash-to-cash transfer</p>
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
              <Label className="text-xs">Amount (₹)</Label>
              <Input type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} onKeyDown={onEnterNext} />
            </div>
            <div className="flex items-end">
              <ContraModeToggle mode={contraMode} onToggle={setContraMode} hasLines={false} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">From {contraMode === 'bank_transfer' ? 'Bank' : 'Cash'} Ledger</Label>
              <Input value={fromLedger} onChange={e => setFromLedger(e.target.value)} onKeyDown={onEnterNext} placeholder={`From ${contraMode === 'bank_transfer' ? 'bank' : 'cash'} ledger`} />
            </div>
            <div>
              <Label className="text-xs">To {contraMode === 'bank_transfer' ? 'Bank' : 'Cash'} Ledger</Label>
              <Input value={toLedger} onChange={e => setToLedger(e.target.value)} onKeyDown={onEnterNext} placeholder={`To ${contraMode === 'bank_transfer' ? 'bank' : 'cash'} ledger`} />
            </div>
          </div>
          {contraMode === 'bank_transfer' && (
            <div>
              <Label className="text-xs">UTR / NEFT / RTGS Ref</Label>
              <Input value={instrumentRef} onChange={e => setInstrumentRef(e.target.value)} onKeyDown={onEnterNext} placeholder="Transfer reference" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Input value={narration} onChange={e => setNarration(e.target.value)} onKeyDown={onEnterNext} placeholder="Contra narration" />
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
