/**
 * DeliveryNote.tsx — Full Delivery Note form
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
import { InventoryLineGrid } from '@/components/finecore/InventoryLineGrid';
import { generateVoucherNo, vouchersKey } from '@/lib/finecore-engine';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';

interface DeliveryNotePanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function DeliveryNotePanel({ onSaveDraft }: DeliveryNotePanelProps) {
  const entityCode = 'SMRT';
  const [voucherNo] = useState(() => generateVoucherNo('DLN', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [againstSI, setAgainstSI] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverNo, setDriverNo] = useState('');
  const [distance, setDistance] = useState('');
  const [inventoryLines, setInventoryLines] = useState<VoucherInventoryLine[]>([]);
  const [narration, setNarration] = useState('');

  const handlePost = useCallback(() => {
    if (!partyName) { toast.error('Buyer name is required'); return; }
    const key = vouchersKey(entityCode);
    try {
      // [JWT] GET /api/accounting/vouchers
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
        voucher_type_name: 'Delivery Note', base_voucher_type: 'Delivery Note',
        entity_id: '', date, party_name: partyName, ref_voucher_no: againstSI,
        vendor_bill_no: '', net_amount: 0, narration,
        terms_conditions: '', payment_enforcement: '', payment_instrument: '',
        from_ledger_name: '', to_ledger_name: '',
        from_godown_name: '', to_godown_name: '',
        ledger_lines: [], inventory_lines: inventoryLines,
        gross_amount: 0, total_discount: 0, total_taxable: 0,
        total_cgst: 0, total_sgst: 0, total_igst: 0,
        total_cess: 0, total_tax: 0, round_off: 0, tds_applicable: false,
        status: 'posted', created_by: 'current-user', created_at: now, updated_at: now,
      };
      existing.push(voucher);
      // [JWT] POST /api/accounting/vouchers
      localStorage.setItem(key, JSON.stringify(existing));
      toast.success('Delivery Note posted');
    } catch { toast.error('Failed to save'); }
  }, [partyName, date, voucherNo, againstSI, inventoryLines, narration, entityCode]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`, module: 'fc-txn-delivery-note',
        label: `DLN ${partyName || 'New'}`, voucherTypeName: 'Delivery Note',
        savedAt: new Date().toISOString(),
        formState: { party_name: partyName, date } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, partyName, date, inventoryLines]);

  return (
    <div data-keyboard-form className="p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Delivery Note</h2>
          <p className="text-xs text-muted-foreground">Outward goods dispatch</p>
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
              <Label className="text-xs">Party (Buyer)</Label>
              <Input value={partyName} onChange={e => setPartyName(e.target.value)} onKeyDown={onEnterNext} placeholder="Buyer name" />
            </div>
            <div>
              <Label className="text-xs">Against Sales Invoice</Label>
              <Input value={againstSI} onChange={e => setAgainstSI(e.target.value)} onKeyDown={onEnterNext} placeholder="SI ref (optional)" />
            </div>
          </div>
        </CardContent>
      </Card>

      <InventoryLineGrid lines={inventoryLines} onChange={setInventoryLines} mode="delivery" showTax={false} />

      <Card>
        <CardContent className="pt-5 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Transport Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Transporter Name</Label>
              <Input value={transporterName} onChange={e => setTransporterName(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Vehicle No</Label>
              <Input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} onKeyDown={onEnterNext} placeholder="MH 01 AB 1234" />
            </div>
            <div>
              <Label className="text-xs">Driver Contact</Label>
              <Input value={driverNo} onChange={e => setDriverNo(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Distance (km)</Label>
              <Input type="number" value={distance} onChange={e => setDistance(e.target.value)} onKeyDown={onEnterNext} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Input value={narration} onChange={e => setNarration(e.target.value)} onKeyDown={onEnterNext} placeholder="Delivery narration" />
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

export default function DeliveryNote() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Delivery Note' }]} showDatePicker={false} showCompany={false} />
        <main><DeliveryNotePanel /></main>
      </div>
    </SidebarProvider>
  );
}
