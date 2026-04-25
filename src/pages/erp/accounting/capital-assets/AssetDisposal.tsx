/**
 * AssetDisposal.tsx — FC Sprint 4
 * fc-fa-disposal: 2 tabs — Write Off | Capital Sale
 * [JWT] Replace with GET/POST /api/fixed-assets/*
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, DollarSign } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';
import { postVoucher, generateVoucherNo } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const ls = <T,>(k: string): T[] => {
  try {
    // [JWT] GET /api/fixed-assets/storage/:key
    const r = localStorage.getItem(k);
    return r ? JSON.parse(r) : [];
  } catch { return []; }
};
const ss = <T,>(k: string, d: T[]) => {
  // [JWT] POST /api/fixed-assets/storage/:key
  localStorage.setItem(k, JSON.stringify(d));
};

interface Props { entityCode: string; }

export function AssetDisposalPanel({ entityCode }: Props) {
  const units = useMemo(() => ls<AssetUnitRecord>(faUnitsKey(entityCode)).filter(u => u.entity_id === entityCode && u.status === 'active'), [entityCode]);
  const [tab, setTab] = useState('writeoff');
  const [selectedId, setSelectedId] = useState('');
  const [salePrice, setSalePrice] = useState(0);
  const [saleBuyer, setSaleBuyer] = useState('');
  const [saleDate, setSaleDate] = useState('');

  const selectedUnit = useMemo(() => units.find(u => u.id === selectedId), [units, selectedId]);

  const handleWriteOff = () => {
    if (!selectedUnit) { toast.error('Select an asset unit'); return; }
    const all = ls<AssetUnitRecord>(faUnitsKey(entityCode));
    const nbv = selectedUnit.net_book_value;

    const voucher: Voucher = {
      id: `v-wo-${Date.now()}`, voucher_no: generateVoucherNo('WO', entityCode),
      voucher_type_id: 'write-off', voucher_type_name: 'Asset Write Off',
      base_voucher_type: 'Asset Write Off', entity_id: entityCode,
      date: new Date().toISOString().slice(0, 10),
      ledger_lines: [
        { id: `ll-1-${Date.now()}`, ledger_id: 'loss-disposal', ledger_code: 'DTAN', ledger_name: 'Loss on Write Off', ledger_group_code: 'E-DEP', dr_amount: nbv, cr_amount: 0, narration: '' },
        { id: `ll-2-${Date.now()}`, ledger_id: 'accum-depr', ledger_code: 'ADEP', ledger_name: 'Accumulated Depreciation', ledger_group_code: 'ADEP', dr_amount: selectedUnit.accumulated_depreciation, cr_amount: 0, narration: '' },
        { id: `ll-3-${Date.now()}`, ledger_id: 'ppe', ledger_code: 'PPE', ledger_name: 'Fixed Asset', ledger_group_code: 'PPE', dr_amount: 0, cr_amount: selectedUnit.gross_block_cost, narration: '' },
      ],
      gross_amount: selectedUnit.gross_block_cost, total_discount: 0, total_taxable: 0,
      total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0, total_tax: 0,
      round_off: 0, net_amount: selectedUnit.gross_block_cost, tds_applicable: false,
      narration: `Write off ${selectedUnit.asset_id}`,
      terms_conditions: '', payment_enforcement: '', payment_instrument: '',
      status: 'draft', created_by: 'Admin',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    postVoucher(voucher, entityCode);

    const updated = all.map(u => u.id === selectedId ? { ...u, status: 'written_off' as const, disposal_voucher_id: voucher.id, updated_at: new Date().toISOString() } : u);
    // [JWT] PATCH /api/fixed-assets/units/:id
    ss(faUnitsKey(entityCode), updated);
    toast.success(`${selectedUnit.asset_id} written off`);
    setSelectedId('');
  };

  const handleCapitalSale = () => {
    if (!selectedUnit || !saleDate) { toast.error('Select unit and date'); return; }
    const all = ls<AssetUnitRecord>(faUnitsKey(entityCode));
    const nbv = selectedUnit.net_book_value;
    const gain = salePrice - nbv;

    const ledgerLines = [
      { id: `ll-1-${Date.now()}`, ledger_id: 'bank', ledger_code: 'BANK', ledger_name: saleBuyer || 'Bank', ledger_group_code: 'BANK', dr_amount: salePrice, cr_amount: 0, narration: '' },
      { id: `ll-2-${Date.now()}`, ledger_id: 'accum-depr', ledger_code: 'ADEP', ledger_name: 'Accumulated Depreciation', ledger_group_code: 'ADEP', dr_amount: selectedUnit.accumulated_depreciation, cr_amount: 0, narration: '' },
      { id: `ll-3-${Date.now()}`, ledger_id: 'ppe', ledger_code: 'PPE', ledger_name: 'Fixed Asset', ledger_group_code: 'PPE', dr_amount: 0, cr_amount: selectedUnit.gross_block_cost, narration: '' },
    ];
    if (gain > 0) {
      ledgerLines.push({ id: `ll-4-${Date.now()}`, ledger_id: 'gain-sale', ledger_code: 'GAIN', ledger_name: 'Profit on Sale of Fixed Asset', ledger_group_code: 'I-OI', dr_amount: 0, cr_amount: gain, narration: '' });
    } else if (gain < 0) {
      ledgerLines.push({ id: `ll-4-${Date.now()}`, ledger_id: 'loss-sale', ledger_code: 'DTAN', ledger_name: 'Loss on Sale of Fixed Asset', ledger_group_code: 'E-DEP', dr_amount: Math.abs(gain), cr_amount: 0, narration: '' });
    }

    const voucher: Voucher = {
      id: `v-cs-${Date.now()}`, voucher_no: generateVoucherNo('CS', entityCode),
      voucher_type_id: 'capital-sale', voucher_type_name: 'Capital Sale',
      base_voucher_type: 'Capital Sale', entity_id: entityCode, date: saleDate,
      ledger_lines: ledgerLines,
      gross_amount: salePrice, total_discount: 0, total_taxable: salePrice,
      total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0, total_tax: 0,
      round_off: 0, net_amount: salePrice, tds_applicable: false,
      narration: `Capital sale ${selectedUnit.asset_id} to ${saleBuyer}`,
      terms_conditions: '', payment_enforcement: '', payment_instrument: '',
      status: 'draft', created_by: 'Admin',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    postVoucher(voucher, entityCode);

    const updated = all.map(u => u.id === selectedId ? { ...u, status: 'disposed' as const, disposal_voucher_id: voucher.id, updated_at: new Date().toISOString() } : u);
    // [JWT] PATCH /api/fixed-assets/units/:id
    ss(faUnitsKey(entityCode), updated);
    toast.success(`${selectedUnit.asset_id} sold — ${gain >= 0 ? 'Gain' : 'Loss'}: ₹${Math.abs(gain).toLocaleString('en-IN')}`);
    setSelectedId(''); setSalePrice(0); setSaleBuyer(''); setSaleDate('');
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in" data-keyboard-form>
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-teal-500" /> Asset Disposal
        </h2>
        <p className="text-xs text-muted-foreground">Write off or sell fixed assets</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Select Asset Unit</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger><SelectValue placeholder="Choose an active asset..." /></SelectTrigger>
          <SelectContent>
            {units.map(u => (
              <SelectItem key={u.id} value={u.id}>{u.asset_id} — {u.item_name} (NBV: ₹{u.net_book_value.toLocaleString('en-IN')})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedUnit && (
        <div className="glass-card rounded-xl p-4 space-y-2 text-xs">
          <div className="grid grid-cols-4 gap-4">
            <div><span className="text-muted-foreground">Gross Block:</span> <span className="font-mono">₹{selectedUnit.gross_block_cost.toLocaleString('en-IN')}</span></div>
            <div><span className="text-muted-foreground">Accum Depr:</span> <span className="font-mono">₹{selectedUnit.accumulated_depreciation.toLocaleString('en-IN')}</span></div>
            <div><span className="text-muted-foreground">Net Book Value:</span> <span className="font-mono font-bold">₹{selectedUnit.net_book_value.toLocaleString('en-IN')}</span></div>
            <div><span className="text-muted-foreground">IT Block:</span> {selectedUnit.it_act_block}</div>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="writeoff">Write Off</TabsTrigger>
          <TabsTrigger value="sale">Capital Sale</TabsTrigger>
        </TabsList>

        <TabsContent value="writeoff" className="space-y-3">
          <p className="text-sm text-muted-foreground">Write off the selected asset — entire net book value is treated as loss.</p>
          <Button onClick={handleWriteOff} disabled={!selectedUnit} variant="destructive" data-primary>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Write Off Asset
          </Button>
        </TabsContent>

        <TabsContent value="sale" className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Sale Price</Label>
              <Input type="number" value={salePrice || ''} onChange={e => setSalePrice(parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Buyer (Ledger)</Label>
              <Input value={saleBuyer} onChange={e => setSaleBuyer(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <SmartDateInput value={saleDate} onChange={setSaleDate} />
            </div>
          </div>
          {selectedUnit && salePrice > 0 && (
            <p className="text-xs text-muted-foreground">
              {salePrice > selectedUnit.net_book_value
                ? `Gain: ₹${(salePrice - selectedUnit.net_book_value).toLocaleString('en-IN')}`
                : `Loss: ₹${(selectedUnit.net_book_value - salePrice).toLocaleString('en-IN')}`}
            </p>
          )}
          <Button onClick={handleCapitalSale} disabled={!selectedUnit || salePrice <= 0} data-primary>
            <DollarSign className="h-3.5 w-3.5 mr-1" /> Record Sale
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AssetDisposal() { return <AssetDisposalPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />; }
