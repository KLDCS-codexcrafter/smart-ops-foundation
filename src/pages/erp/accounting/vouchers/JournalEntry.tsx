/**
 * JournalEntry.tsx — Full Journal Entry form
 * [JWT] All storage via finecore-engine
 */
import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { LedgerLineGrid } from '@/components/finecore/LedgerLineGrid';
import { generateVoucherNo, vouchersKey } from '@/lib/finecore-engine';
import type { Voucher, VoucherLedgerLine } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';

interface JournalEntryPanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function JournalEntryPanel({ onSaveDraft }: JournalEntryPanelProps) {
  const entityCode = 'SMRT';
  const [voucherNo] = useState(() => generateVoucherNo('JV', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [ledgerLines, setLedgerLines] = useState<VoucherLedgerLine[]>([]);
  const [narration, setNarration] = useState('');

  const balance = useMemo(() => {
    let dr = 0, cr = 0;
    ledgerLines.forEach(l => { dr += l.dr_amount ?? 0; cr += l.cr_amount ?? 0; });
    return { dr, cr, diff: Math.abs(dr - cr) };
  }, [ledgerLines]);

  const handlePost = useCallback(() => {
    if (balance.diff > 0.01) { toast.error('Debit and Credit must balance'); return; }
    if (ledgerLines.length < 2) { toast.error('At least 2 ledger lines required'); return; }
    const key = vouchersKey(entityCode);
    try {
      // [JWT] GET /api/accounting/vouchers
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
        voucher_type_name: 'Journal', base_voucher_type: 'Journal',
        entity_id: '', date, party_name: '', ref_voucher_no: '',
        vendor_bill_no: '', net_amount: balance.dr, narration,
        terms_conditions: '', payment_enforcement: '', payment_instrument: '',
        from_ledger_name: '', to_ledger_name: '',
        from_godown_name: '', to_godown_name: '',
        ledger_lines: ledgerLines, gross_amount: balance.dr, total_discount: 0,
        total_taxable: 0, total_cgst: 0, total_sgst: 0, total_igst: 0,
        total_cess: 0, total_tax: 0, round_off: 0, tds_applicable: false,
        status: 'posted', created_by: 'current-user', created_at: now, updated_at: now,
      };
      existing.push(voucher);
      // [JWT] POST /api/accounting/vouchers
      localStorage.setItem(key, JSON.stringify(existing));
      toast.success('Journal entry posted');
    } catch { toast.error('Failed to save'); }
  }, [balance, ledgerLines, date, voucherNo, narration, entityCode]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`, module: 'fc-txn-journal',
        label: `JV ${date}`, voucherTypeName: 'Journal',
        savedAt: new Date().toISOString(),
        formState: { date, narration } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, date, ledgerLines, narration]);

  return (
    <div data-keyboard-form className="p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Journal Entry</h2>
          <p className="text-xs text-muted-foreground">General ledger journal</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">{voucherNo}</Badge>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} onKeyDown={onEnterNext} />
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
            <span className={balance.diff > 0.01 ? 'text-destructive font-semibold' : 'text-emerald-600 font-semibold'}>
              Difference: ₹{balance.diff.toLocaleString('en-IN')}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Input value={narration} onChange={e => setNarration(e.target.value)} onKeyDown={onEnterNext} placeholder="Journal narration" />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        {onSaveDraft && <Button variant="outline" onClick={handleSaveDraft}>Save to Draft Tray</Button>}
        <Button variant="outline" onClick={() => toast.info('Discarded')}>Cancel</Button>
        <Button data-primary onClick={handlePost} disabled={balance.diff > 0.01}><Send className="h-4 w-4 mr-2" />Post</Button>
      </div>
    </div>
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
