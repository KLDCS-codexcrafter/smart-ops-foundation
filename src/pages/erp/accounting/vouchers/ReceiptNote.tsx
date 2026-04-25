/**
 * ReceiptNote.tsx — Full Receipt Note (GRN) form
 * [JWT] All storage via finecore-engine
 */
import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { InventoryLineGrid } from '@/components/finecore/InventoryLineGrid';
import { generateVoucherNo, vouchersKey } from '@/lib/finecore-engine';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import type { DraftEntry } from '@/components/finecore/DraftTray';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useVoucherEntityGuard } from '@/hooks/useVoucherEntityGuard';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

interface ReceiptNotePanelProps {
  onSaveDraft?: (draft: DraftEntry) => void;
  initialState?: Record<string, unknown>;
}

export function ReceiptNotePanel({ onSaveDraft }: ReceiptNotePanelProps) {
  const { entityCode } = useEntityCode();
  const [voucherNo] = useState(() => generateVoucherNo('GRN', entityCode));
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [vendorChallanNo, setVendorChallanNo] = useState('');
  const [vendorChallanDate, setVendorChallanDate] = useState('');
  const [receiveGodown, setReceiveGodown] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [inventoryLines, setInventoryLines] = useState<VoucherInventoryLine[]>([]);
  const [narration, setNarration] = useState('');
  const [postedVoucherId, setPostedVoucherId] = useState<string | null>(null);

  const handlePost = useCallback(() => {
    if (!partyName) { toast.error('Vendor name is required'); return; }
    if (!vendorChallanNo) { toast.error('Vendor challan number is required'); return; }
    const key = vouchersKey(entityCode);
    try {
      // [JWT] GET /api/accounting/vouchers
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const now = new Date().toISOString();
      const voucher: Voucher = {
        id: `v-${Date.now()}`, voucher_no: voucherNo, voucher_type_id: '',
        voucher_type_name: 'Receipt Note', base_voucher_type: 'Receipt Note',
        entity_id: '', date, party_name: partyName, ref_voucher_no: vendorChallanNo,
        vendor_bill_no: '', net_amount: 0, narration,
        terms_conditions: '', payment_enforcement: '', payment_instrument: '',
        from_ledger_name: '', to_ledger_name: '',
        from_godown_name: '', to_godown_name: receiveGodown,
        ledger_lines: [], inventory_lines: inventoryLines,
        gross_amount: 0, total_discount: 0, total_taxable: 0,
        total_cgst: 0, total_sgst: 0, total_igst: 0,
        total_cess: 0, total_tax: 0, round_off: 0, tds_applicable: false,
        status: 'posted', created_by: 'current-user', created_at: now, updated_at: now,
      };
      existing.push(voucher);
      // [JWT] POST /api/accounting/vouchers
      localStorage.setItem(key, JSON.stringify(existing));
      setPostedVoucherId(voucher.id);
      toast.success('Receipt Note (GRN) posted');
    } catch { toast.error('Failed to save'); }
  }, [partyName, vendorChallanNo, date, voucherNo, receiveGodown, inventoryLines, narration, entityCode]);

  const handleSaveDraft = useCallback(() => {
    if (onSaveDraft) {
      onSaveDraft({
        id: `draft-${Date.now()}`, module: 'fc-txn-receipt-note',
        label: `GRN ${partyName || 'New'}`, voucherTypeName: 'Receipt Note',
        savedAt: new Date().toISOString(),
        formState: { party_name: partyName, date, ref_voucher_no: vendorChallanNo } as Partial<Voucher>,
      });
    }
  }, [onSaveDraft, partyName, date, vendorChallanNo]);

  const isDirty = useCallback(
    () => !!partyName || !!vendorChallanNo || !!receiveGodown || !!narration || inventoryLines.length > 0,
    [partyName, vendorChallanNo, receiveGodown, narration, inventoryLines],
  );
  const serializeFormState = useCallback(
    (): Partial<Voucher> => ({
      party_name: partyName, date, ref_voucher_no: vendorChallanNo,
      to_godown_name: receiveGodown, narration, inventory_lines: inventoryLines,
    }),
    [partyName, date, vendorChallanNo, receiveGodown, narration, inventoryLines],
  );
  const clearForm = useCallback(() => {
    setPartyName(''); setVendorChallanNo(''); setVendorChallanDate('');
    setReceiveGodown(''); setVehicleNo(''); setTransporterName('');
    setInventoryLines([]); setNarration('');
    setPostedVoucherId(null);
  }, []);
  const handlePrint = useCallback(() => {
    if (postedVoucherId && entityCode) {
      const url = `/erp/finecore/receipt-note-print?voucher_id=${postedVoucherId}&entity=${entityCode}&copy=stores`;
      window.open(url, '_blank');
    }
  }, [postedVoucherId, entityCode]);
  const { GuardDialog } = useVoucherEntityGuard({
    isDirty, serializeFormState, onSaveDraft, clearForm,
    voucherTypeName: 'Receipt Note',
    fineCoreModule: 'fc-txn-receipt-note',
    currentEntityCode: entityCode,
  });

  return (
    <>
    {GuardDialog}
    <div data-keyboard-form className="p-5 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Receipt Note (GRN)</h2>
          <p className="text-xs text-muted-foreground">Record goods received from vendor</p>
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
            <div>
              <Label className="text-xs">Receive to Godown</Label>
              <Input value={receiveGodown} onChange={e => setReceiveGodown(e.target.value)} onKeyDown={onEnterNext} placeholder="Target godown" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs">Vendor Challan No</Label>
              <Input value={vendorChallanNo} onChange={e => setVendorChallanNo(e.target.value)} onKeyDown={onEnterNext} placeholder="Challan number (mandatory)" />
            </div>
            <div>
              <Label className="text-xs">Vendor Challan Date</Label>
              <Input type="date" value={vendorChallanDate} onChange={e => setVendorChallanDate(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Label className="text-xs text-muted-foreground">Against PO No</Label>
                    <Input disabled placeholder="Available Sprint 25" className="opacity-50" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Available in Sprint 25 (Procure360)</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>

      <InventoryLineGrid lines={inventoryLines} onChange={setInventoryLines} mode="grn" showTax={false} />

      <Card>
        <CardContent className="pt-5 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Transport Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Vehicle No</Label>
              <Input value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div>
              <Label className="text-xs">Transporter Name</Label>
              <Input value={transporterName} onChange={e => setTransporterName(e.target.value)} onKeyDown={onEnterNext} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Label className="text-xs">Narration</Label>
          <Input value={narration} onChange={e => setNarration(e.target.value)} onKeyDown={onEnterNext} placeholder="GRN narration" />
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        {onSaveDraft && <Button variant="outline" onClick={handleSaveDraft}>Save to Draft Tray</Button>}
        <Button variant="outline" onClick={() => toast.info('Discarded')}>Cancel</Button>
        <Button data-primary onClick={handlePost}><Send className="h-4 w-4 mr-2" />Post</Button>
        {postedVoucherId && (
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        )}
      </div>
    </div>
    </>
  );
}

export default function ReceiptNote() {
  const { entityCode } = useEntityCode();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Receipt Note (GRN)' }]} showDatePicker={false} />
        <main>{entityCode ? <ReceiptNotePanel /> : <SelectCompanyGate title="Select a company to create a Receipt Note" />}</main>
      </div>
    </SidebarProvider>
  );
}
