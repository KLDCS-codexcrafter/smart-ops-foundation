/**
 * CapitalAssetMaster.tsx — FC Sprint 4
 * fc-fa-master: 3 tabs — Asset Units | Capital Purchase | Put To Use
 * + Asset Transfer + Custodian Change dialogs
 * [JWT] Replace with GET/POST /api/fixed-assets/*
 */
import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Package, Plus, Search, MapPin, UserCheck } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import type { AssetUnitRecord, AssetUnitLine, ITActBlock } from '@/types/fixed-asset';
import { faUnitsKey, IT_ACT_BLOCK_LABELS } from '@/types/fixed-asset';
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

const STATUS_BADGES: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  cwip: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  disposed: 'bg-slate-500/10 text-slate-500 border-slate-400/30',
  written_off: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  transferred: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30',
};

interface Props { entityCode: string; }

export function CapitalAssetMasterPanel({ entityCode }: Props) {
  const [tab, setTab] = useState('units');
  const [units, setUnits] = useState<AssetUnitRecord[]>(() => ls<AssetUnitRecord>(faUnitsKey(entityCode)));
  const [search, setSearch] = useState('');
  const [cpDate, setCpDate] = useState('');
  const [cpVendor, setCpVendor] = useState('');
  const [cpItemName, setCpItemName] = useState('');
  const [cpLedgerId, setCpLedgerId] = useState('');
  const [cpInvoiceRef, setCpInvoiceRef] = useState('');
  const [cpInvoiceAmount, setCpInvoiceAmount] = useState(0);
  const [cpAssetCost, setCpAssetCost] = useState(0);
  const [cpGstAmount, setCpGstAmount] = useState(0);
  const [cpNarration, setCpNarration] = useState('');
  // Asset ID Generation
  const [idSheetOpen, setIdSheetOpen] = useState(false);
  const [idPrefix, setIdPrefix] = useState('PPE');
  const [idSuffix, setIdSuffix] = useState('');
  const [idFrom, setIdFrom] = useState(1);
  const [idCount, setIdCount] = useState(1);
  const [idLocation, setIdLocation] = useState('');
  const [idDepartment, setIdDepartment] = useState('');
  const [idCustodian, setIdCustodian] = useState('');
  const [idBlock, setIdBlock] = useState<ITActBlock>('Plant & Machinery');
  const [idSalvage, setIdSalvage] = useState(0);
  const [idPutToUse, setIdPutToUse] = useState('');
  // Transfer dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferUnit, setTransferUnit] = useState<AssetUnitRecord | null>(null);
  const [trLocation, setTrLocation] = useState('');
  const [trDepartment, setTrDepartment] = useState('');
  const [trCustodian, setTrCustodian] = useState('');
  // Put To Use dialog
  const [ptuOpen, setPtuOpen] = useState(false);
  const [ptuUnit, setPtuUnit] = useState<AssetUnitRecord | null>(null);
  const [ptuDate, setPtuDate] = useState('');

  const reload = () => setUnits(ls<AssetUnitRecord>(faUnitsKey(entityCode)));

  const filtered = useMemo(() =>
    units.filter(u => u.entity_id === entityCode &&
      (u.asset_id.toLowerCase().includes(search.toLowerCase()) ||
       u.item_name.toLowerCase().includes(search.toLowerCase()) ||
       u.custodian_name.toLowerCase().includes(search.toLowerCase()))),
    [units, search, entityCode]
  );

  const fy = (() => {
    const now = new Date();
    const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${String(y).slice(2)}-${String(y + 1).slice(2)}`;
  })();

  const handleCapitalPurchaseSave = () => {
    if (!cpDate || !cpItemName || !cpAssetCost) {
      toast.error('Date, Asset Item, and Asset Cost are required');
      return;
    }

    const assetUnitLines: AssetUnitLine[] = [{
      item_id: `item-${cpItemName}`, item_name: cpItemName,
      ledger_definition_id: cpLedgerId || 'ppe-default',
      asset_id_prefix: idPrefix, asset_id_suffix: idSuffix || fy,
      asset_id_from: idFrom, asset_id_count: idCount,
      location: idLocation, department: idDepartment, custodian_name: idCustodian,
      cost_per_unit: cpAssetCost / idCount,
      salvage_value: idSalvage,
      it_act_block: idBlock,
      put_to_use_date: idPutToUse || undefined,
    }];

    const voucher: Voucher = {
      id: `v-${Date.now()}`,
      voucher_no: generateVoucherNo('CP', entityCode),
      voucher_type_id: 'capital-purchase',
      voucher_type_name: 'Capital Purchase',
      base_voucher_type: 'Capital Purchase',
      entity_id: entityCode,
      date: cpDate,
      ledger_lines: [
        { id: `ll-1-${Date.now()}`, ledger_id: cpLedgerId || 'ppe', ledger_code: 'PPE', ledger_name: 'Fixed Asset', ledger_group_code: 'PPE', dr_amount: cpAssetCost, cr_amount: 0, narration: '' },
        { id: `ll-2-${Date.now()}`, ledger_id: 'vendor', ledger_code: 'TPAY', ledger_name: cpVendor || 'Vendor', ledger_group_code: 'TPAY', dr_amount: 0, cr_amount: cpInvoiceAmount || cpAssetCost, narration: '' },
      ],
      gross_amount: cpInvoiceAmount || cpAssetCost,
      total_discount: 0, total_taxable: cpAssetCost,
      total_cgst: cpGstAmount / 2, total_sgst: cpGstAmount / 2,
      total_igst: 0, total_cess: 0, total_tax: cpGstAmount,
      round_off: 0, net_amount: cpInvoiceAmount || cpAssetCost,
      tds_applicable: false,
      narration: cpNarration,
      terms_conditions: '', payment_enforcement: '', payment_instrument: '',
      status: 'draft', created_by: 'Admin',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      asset_unit_lines: assetUnitLines,
    };

    postVoucher(voucher, entityCode);
    toast.success(`Capital Purchase ${voucher.voucher_no} posted — ${idCount} asset unit(s) created`);
    reload();
    setTab('units');
    // Reset form
    setCpDate(''); setCpVendor(''); setCpItemName(''); setCpLedgerId('');
    setCpInvoiceRef(''); setCpInvoiceAmount(0); setCpAssetCost(0); setCpGstAmount(0); setCpNarration('');
  };

  const handlePutToUse = () => {
    if (!ptuUnit || !ptuDate) { toast.error('Select date'); return; }
    const all = ls<AssetUnitRecord>(faUnitsKey(entityCode));
    const updated = all.map(u => u.id === ptuUnit.id ? { ...u, put_to_use_date: ptuDate, status: 'active' as const, updated_at: new Date().toISOString() } : u);
    // [JWT] PATCH /api/fixed-assets/units/:id
    ss(faUnitsKey(entityCode), updated);
    toast.success(`${ptuUnit.asset_id} put to use on ${ptuDate}`);
    setPtuOpen(false); setPtuUnit(null); reload();
  };

  const handleTransfer = () => {
    if (!transferUnit) return;
    const all = ls<AssetUnitRecord>(faUnitsKey(entityCode));
    const updated = all.map(u => u.id === transferUnit.id ? {
      ...u, location: trLocation, department: trDepartment, custodian_name: trCustodian, updated_at: new Date().toISOString(),
    } : u);
    // [JWT] PATCH /api/fixed-assets/units/:id/transfer
    ss(faUnitsKey(entityCode), updated);
    toast.success(`${transferUnit.asset_id} transferred`);
    setTransferOpen(false); setTransferUnit(null); reload();
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-teal-500" /> Capital Asset Master
          </h2>
          <p className="text-xs text-muted-foreground">Manage asset units, capital purchases, and put-to-use</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="units">Asset Units ({units.filter(u => u.entity_id === entityCode).length})</TabsTrigger>
          <TabsTrigger value="purchase">Capital Purchase</TabsTrigger>
          <TabsTrigger value="ptu">Put To Use</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search asset ID, item, custodian..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" onKeyDown={onEnterNext} />
            </div>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Asset ID</TableHead>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">IT Act Block</TableHead>
                  <TableHead className="text-xs text-right">Cost</TableHead>
                  <TableHead className="text-xs text-right">NBV</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No asset units found</TableCell></TableRow>
                )}
                {filtered.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">{u.asset_id}</TableCell>
                    <TableCell className="text-xs">{u.item_name}</TableCell>
                    <TableCell className="text-xs">{u.it_act_block}</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹{u.gross_block_cost.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹{u.net_book_value.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-xs">{u.location}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_BADGES[u.status] || ''}`}>{u.status}</Badge>
                    </TableCell>
                    <TableCell className="space-x-1">
                      {u.status === 'cwip' && (
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { setPtuUnit(u); setPtuDate(''); setPtuOpen(true); }}>Put To Use</Button>
                      )}
                      {u.status === 'active' && (
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => {
                          setTransferUnit(u); setTrLocation(u.location); setTrDepartment(u.department); setTrCustodian(u.custodian_name); setTransferOpen(true);
                        }}>
                          <MapPin className="h-3 w-3 mr-1" /> Transfer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="purchase" className="space-y-4">
          <div className="glass-card rounded-xl p-4 space-y-4">
            <p className="text-sm font-semibold">Capital Purchase Entry</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date *</Label>
                <SmartDateInput value={cpDate} onChange={setCpDate} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Voucher No</Label>
                <Input value={`CP/${fy}/auto`} readOnly className="h-9 bg-muted/50 font-mono text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Vendor</Label>
                <Input value={cpVendor} onChange={e => setCpVendor(e.target.value)} onKeyDown={onEnterNext} placeholder="Vendor name" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Asset Item *</Label>
                <Input value={cpItemName} onChange={e => setCpItemName(e.target.value)} onKeyDown={onEnterNext} placeholder="e.g. Laptop Dell Latitude" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Linked GL Ledger</Label>
                <Input value={cpLedgerId} onChange={e => setCpLedgerId(e.target.value)} onKeyDown={onEnterNext} placeholder="PPE ledger ID" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Invoice Reference</Label>
                <Input value={cpInvoiceRef} onChange={e => setCpInvoiceRef(e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Invoice Amount (Total)</Label>
                <Input type="number" value={cpInvoiceAmount || ''} onChange={e => setCpInvoiceAmount(parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Asset Cost (Ex-GST) *</Label>
                <Input type="number" value={cpAssetCost || ''} onChange={e => setCpAssetCost(parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">GST Amount</Label>
                <Input type="number" value={cpGstAmount || ''} onChange={e => setCpGstAmount(parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Narration</Label>
                <Textarea value={cpNarration} onChange={e => setCpNarration(e.target.value)} className="h-9 min-h-[36px]" />
              </div>
            </div>

            {/* Asset ID Generation */}
            <div className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Asset ID Generation</p>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setIdSheetOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Configure
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Prefix: <span className="font-mono">{idPrefix}</span> | Suffix: <span className="font-mono">{idSuffix || fy}</span> | From: {idFrom} | Count: {idCount} | Block: {idBlock}
              </div>
            </div>

            <Button data-primary onClick={handleCapitalPurchaseSave} className="w-full">Save Capital Purchase</Button>
          </div>
        </TabsContent>

        <TabsContent value="ptu" className="space-y-3">
          <p className="text-sm text-muted-foreground">Select CWIP assets from the Units tab and use the "Put To Use" action button.</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Asset ID</TableHead>
                  <TableHead className="text-xs">Item</TableHead>
                  <TableHead className="text-xs">Purchase Date</TableHead>
                  <TableHead className="text-xs text-right">Cost</TableHead>
                  <TableHead className="text-xs">Age (days)</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.filter(u => u.entity_id === entityCode && u.status === 'cwip').map(u => {
                  const age = Math.floor((Date.now() - new Date(u.purchase_date).getTime()) / 86400000);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs">{u.asset_id}</TableCell>
                      <TableCell className="text-xs">{u.item_name}</TableCell>
                      <TableCell className="text-xs font-mono">{u.purchase_date}</TableCell>
                      <TableCell className="text-xs text-right font-mono">₹{u.gross_block_cost.toLocaleString('en-IN')}</TableCell>
                      <TableCell className={`text-xs font-mono ${age > 365 ? 'text-destructive font-bold' : ''}`}>{age}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => { setPtuUnit(u); setPtuDate(''); setPtuOpen(true); }}>Capitalise</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Asset ID Generation Sheet */}
      <Sheet open={idSheetOpen} onOpenChange={setIdSheetOpen}>
        <SheetContent className="w-[400px]">
          <SheetHeader><SheetTitle>Asset ID Generation</SheetTitle></SheetHeader>
          <div className="space-y-3 mt-4" data-keyboard-form>
            <div className="space-y-1.5">
              <Label className="text-xs">Prefix</Label>
              <Input value={idPrefix} onChange={e => setIdPrefix(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Suffix (FY auto)</Label>
              <Input value={idSuffix} onChange={e => setIdSuffix(e.target.value)} onKeyDown={onEnterNext} placeholder={fy} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Range From</Label>
                <Input type="number" value={idFrom} onChange={e => setIdFrom(parseInt(e.target.value) || 1)} onKeyDown={onEnterNext} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Count</Label>
                <Input type="number" value={idCount} onChange={e => setIdCount(parseInt(e.target.value) || 1)} onKeyDown={onEnterNext} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Input value={idLocation} onChange={e => setIdLocation(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Department</Label>
              <Input value={idDepartment} onChange={e => setIdDepartment(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Custodian</Label>
              <Input value={idCustodian} onChange={e => setIdCustodian(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">IT Act Block</Label>
              <Select value={idBlock} onValueChange={v => setIdBlock(v as ITActBlock)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(IT_ACT_BLOCK_LABELS) as ITActBlock[]).map(k => (
                    <SelectItem key={k} value={k}>{IT_ACT_BLOCK_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Salvage Value</Label>
                <Input type="number" value={idSalvage || ''} onChange={e => setIdSalvage(parseFloat(e.target.value) || 0)} onKeyDown={onEnterNext} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Put To Use Date</Label>
                <SmartDateInput value={idPutToUse} onChange={setIdPutToUse} />
              </div>
            </div>
            <Button className="w-full" onClick={() => setIdSheetOpen(false)}>Done</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Put To Use Dialog */}
      <Dialog open={ptuOpen} onOpenChange={setPtuOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Put To Use</DialogTitle>
            <DialogDescription>Set the put-to-use date for {ptuUnit?.asset_id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Put To Use Date *</Label>
              <SmartDateInput value={ptuDate} onChange={setPtuDate} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPtuOpen(false)}>Cancel</Button>
            <Button onClick={handlePutToUse}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asset Transfer</DialogTitle>
            <DialogDescription>Transfer {transferUnit?.asset_id} to a new location/custodian</DialogDescription>
          </DialogHeader>
          <div className="space-y-3" data-keyboard-form>
            <div className="space-y-1.5">
              <Label className="text-xs">New Location</Label>
              <Input value={trLocation} onChange={e => setTrLocation(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">New Department</Label>
              <Input value={trDepartment} onChange={e => setTrDepartment(e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">New Custodian</Label>
              <Input value={trCustodian} onChange={e => setTrCustodian(e.target.value)} onKeyDown={onEnterNext} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={handleTransfer}><UserCheck className="h-3.5 w-3.5 mr-1" /> Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CapitalAssetMaster() { return <CapitalAssetMasterPanel entityCode={DEFAULT_ENTITY_SHORTCODE} />; }
