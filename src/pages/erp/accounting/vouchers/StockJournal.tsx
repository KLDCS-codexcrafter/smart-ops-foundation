/**
 * StockJournal.tsx — Full Stock Journal form (two-grid layout)
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
import { StockJournalLineGrid } from '@/components/finecore/StockJournalLineGrid';
import { generateVoucherNo, vouchersKey } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useVoucherEntityGuard } from '@/hooks/useVoucherEntityGuard';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

const PURPOSES = ['Store Transfer', 'Production Issue', 'Scrap', 'Sample', 'Other'];

interface StockJournalPanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function StockJournalPanel({ onSaveDraft }: StockJournalPanelProps) {
  const { entityCode } = useEntityCode();
  const [voucherNo] = useState(() => generateVoucherNo('SJ', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [purpose, setPurpose] = useState('Store Transfer');
  const [department, setDepartment] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [consumptionLines, setConsumptionLines] = useState<import('@/components/finecore/StockJournalLineGrid').StockJournalLine[]>([]);
  const [productionLines, setProductionLines] = useState<import('@/components/finecore/StockJournalLineGrid').StockJournalLine[]>([]);
  const [narration, setNarration] = useState('');

  const handlePost = useCallback(() => {
    if (consumptionLines.length === 0) { toast.error('At least one consumption line is required'); return; }
    if (purpose === 'Other' && !referenceNo) { toast.error('Reference No is mandatory for "Other" purpose'); return; }
    const key = vouchersKey(entityCode);
    try {
      // [JWT] GET /api/accounting/vouchers
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
        voucher_type_name: 'Stock Journal', base_voucher_type: 'Stock Journal',
        entity_id: '', date, party_name: '', ref_voucher_no: referenceNo,
        vendor_bill_no: '', net_amount: 0, narration,
        terms_conditions: '', payment_enforcement: '', payment_instrument: '',
        from_ledger_name: '', to_ledger_name: '',
        from_godown_name: '', to_godown_name: '',
        ledger_lines: [], gross_amount: 0, total_discount: 0, total_taxable: 0,
        total_cgst: 0, total_sgst: 0, total_igst: 0,
        total_cess: 0, total_tax: 0, round_off: 0, tds_applicable: false,
        status: 'posted', created_by: 'current-user', created_at: now, updated_at: now,
      };
      existing.push(voucher);
      // [JWT] POST /api/accounting/vouchers
      localStorage.setItem(key, JSON.stringify(existing));
      toast.success('Stock Journal posted');
    } catch { toast.error('Failed to save'); }
  }, [consumptionLines, purpose, referenceNo, date, voucherNo, narration, entityCode]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`, module: 'fc-inv-stock-journal',
        label: `SJ ${purpose}`, voucherTypeName: 'Stock Journal',
        savedAt: new Date().toISOString(),
        formState: { date, narration } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, date, purpose, consumptionLines, productionLines]);

  return (
    <div data-keyboard-form className="p-5 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Stock Journal</h2>
          <p className="text-xs text-muted-foreground">Consumption to Production (internal stock movement)</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">{voucherNo}</Badge>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PURPOSES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Department</Label>
              <Input value={department} onChange={e => setDepartment(e.target.value)} onKeyDown={onEnterNext} placeholder="Department" />
            </div>
            <div>
              <Label className="text-xs">Reference No</Label>
              <Input value={referenceNo} onChange={e => setReferenceNo(e.target.value)} onKeyDown={onEnterNext} placeholder={purpose === 'Other' ? 'Mandatory' : 'Optional'} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-3">Consumption (Source)</h3>
            <StockJournalLineGrid lines={consumptionLines} onChange={setConsumptionLines} side="consumption" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Production (Destination)</h3>
            <StockJournalLineGrid lines={productionLines} onChange={setProductionLines} side="production" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Input value={narration} onChange={e => setNarration(e.target.value)} onKeyDown={onEnterNext} placeholder="Stock journal narration" />
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

export default function StockJournal() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Stock Journal' }]} showDatePicker={false} showCompany={false} />
        <main><StockJournalPanel /></main>
      </div>
    </SidebarProvider>
  );
}
