/**
 * @file     AssetLedgerPanel.tsx
 * @purpose  Full-pattern Panel for Asset ledgers — tree view + 6-step sidebar
 *           with depreciation (company + IT Act) and purchase details.
 *           Reads/writes via useLedgerStore against erp_group_ledger_definitions.
 * @sprint   T-H1.5-C-S6.5a
 * @finding  CC-059
 */
import { useMemo, useState } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LedgerTreeList } from '@/features/ledger-master/components/LedgerTreeList';
import { LedgerStepSidebar } from '@/features/ledger-master/components/LedgerStepSidebar';
import { buildLedgerTree } from '@/features/ledger-master/lib/ledger-tree-builder';
import { useLedgerStore } from '@/features/ledger-master/hooks/useLedgerStore';
import { L3_FINANCIAL_GROUPS, deriveLedgerNumericCode } from '@/data/finframe-seed-data';
import { loadEntities } from '@/data/mock-entities';
import type { ITActBlock } from '@/types/fixed-asset';
import { IT_ACT_RATES, IT_ACT_BLOCK_LABELS } from '@/types/fixed-asset';

type AssetCategory = 'ppe' | 'cwip' | 'intangible' | 'intangible_wip' | 'investment';
type DepreciationMethod = 'slm' | 'wdv' | 'none';

interface AssetLedger {
  id: string;
  ledgerType: 'asset';
  name: string;
  code: string;
  numericCode: string;
  alias: string;
  mailingName: string;
  parentGroupCode: string;
  parentGroupName: string;
  assetCategory: AssetCategory;
  purchaseDate: string;
  grossBlock: number;
  depreciationMethod: DepreciationMethod;
  usefulLifeYears: number;
  depreciationRate: number;
  vendorId: string;
  vendorName: string;
  entityId: string | null;
  entityShortCode: string | null;
  openingBalance: number;
  openingBalanceType: 'Dr';
  status: 'active' | 'suspended';
  description: string;
  notes: string;
  suspendedBy: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  reinstatedBy: string | null;
  reinstatedAt: string | null;
  reinstatedReason: string | null;
  it_act_block: ITActBlock;
  it_act_depr_rate: number;
  salvage_value_percent: number;
  accum_depr_ledger_id: string;
}

const ASSET_STEPS = [
  { id: 1, title: 'Identity',                 description: 'Name, code, alias, mailing' },
  { id: 2, title: 'Scope & Category',         description: 'Entity, parent group, category' },
  { id: 3, title: 'Purchase Details',         description: 'Vendor, date, gross block' },
  { id: 4, title: 'Depreciation (Company)',   description: 'SLM/WDV, life, rate, salvage' },
  { id: 5, title: 'Depreciation (IT Act)',    description: 'IT block, IT rate' },
  { id: 6, title: 'Audit & Notes',            description: 'Status, description' },
];

const ASSET_GROUPS = L3_FINANCIAL_GROUPS.filter(g => ['PPE', 'CWIP', 'INTAN', 'IAWIP', 'INVST', 'CINV'].includes(g.code));

const ASSET_CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: 'ppe', label: 'Property, Plant & Equipment' },
  { value: 'cwip', label: 'Capital Work in Progress' },
  { value: 'intangible', label: 'Intangible Asset' },
  { value: 'intangible_wip', label: 'Intangible WIP' },
  { value: 'investment', label: 'Investment' },
];

function emptyDraft(): AssetLedger {
  return {
    id: `asset-${Date.now()}`, ledgerType: 'asset',
    name: '', code: '', numericCode: '', alias: '', mailingName: '',
    parentGroupCode: 'PPE', parentGroupName: 'Property, Plant & Equipment',
    assetCategory: 'ppe', purchaseDate: '', grossBlock: 0,
    depreciationMethod: 'slm', usefulLifeYears: 10, depreciationRate: 10,
    vendorId: '', vendorName: '',
    entityId: null, entityShortCode: null,
    openingBalance: 0, openingBalanceType: 'Dr',
    status: 'active', description: '', notes: '',
    suspendedBy: null, suspendedAt: null, suspendedReason: null,
    reinstatedBy: null, reinstatedAt: null, reinstatedReason: null,
    it_act_block: 'plant_15' as ITActBlock,
    it_act_depr_rate: 15, salvage_value_percent: 5, accum_depr_ledger_id: '',
  };
}

function computeCompletedSteps(d: AssetLedger): number[] {
  const out: number[] = [];
  if (d.name.trim()) out.push(1);
  if (d.parentGroupCode && d.assetCategory) out.push(2);
  if (d.purchaseDate && d.grossBlock > 0) out.push(3);
  if (d.depreciationMethod) out.push(4);
  if (d.it_act_block && d.it_act_depr_rate >= 0) out.push(5);
  if (d.status) out.push(6);
  return out;
}

export function AssetLedgerPanel() {
  const { ledgers, create, update } = useLedgerStore<AssetLedger>('asset');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AssetLedger>(emptyDraft());
  const [isEdit, setIsEdit] = useState(false);
  const [step, setStep] = useState(1);
  const entities = useMemo(() => loadEntities(), []);

  const tree = useMemo(() => buildLedgerTree(ledgers, {
    parentGroupField: 'parentGroupCode',
    parentGroupLabelField: 'parentGroupName',
    entityField: 'entityShortCode',
  }), [ledgers]);

  const openCreate = () => {
    const d = emptyDraft();
    d.numericCode = deriveLedgerNumericCode(d.parentGroupCode, ledgers.length + 1);
    setDraft(d); setIsEdit(false); setStep(1); setOpen(true);
  };

  const openEdit = (raw: Record<string, unknown>) => {
    setDraft({ ...emptyDraft(), ...(raw as Partial<AssetLedger>), id: String(raw.id) } as AssetLedger);
    setIsEdit(true); setStep(1); setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) { toast.error('Name is required'); return; }
    if (isEdit) { update(draft.id, draft); toast.success('Asset ledger updated'); }
    else { create(draft); toast.success('Asset ledger created'); }
    setOpen(false);
  };

  const setField = <K extends keyof AssetLedger>(k: K, v: AssetLedger[K]) =>
    setDraft(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold">Asset Ledgers</h3>
          <Badge variant="outline" className="text-[10px]">{ledgers.length} total</Badge>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Asset Ledger
        </Button>
      </div>

      <LedgerTreeList
        tree={tree}
        onLeafClick={leaf => openEdit(leaf.raw)}
        emptyState="No asset ledgers yet. Click + Add Asset Ledger above."
        renderLeafMeta={leaf => {
          const a = leaf.raw as Record<string, unknown>;
          const method = String(a.depreciationMethod ?? '');
          return method ? <Badge variant="outline" className="text-[9px] uppercase">{method}</Badge> : null;
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Asset Ledger' : 'New Asset Ledger'}</DialogTitle>
          </DialogHeader>

          <LedgerStepSidebar
            steps={ASSET_STEPS}
            currentStep={step}
            onStepClick={setStep}
            completedSteps={computeCompletedSteps(draft)}
          >
            {step === 1 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={draft.name} onChange={e => setField('name', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Numeric Code</Label>
                  <Input value={draft.numericCode} onChange={e => setField('numericCode', e.target.value)} className="font-mono text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Code</Label>
                  <Input value={draft.code} onChange={e => setField('code', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Alias</Label>
                  <Input value={draft.alias} onChange={e => setField('alias', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Mailing Name</Label>
                  <Input value={draft.mailingName} onChange={e => setField('mailingName', e.target.value)} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Parent Group</Label>
                  <Select
                    value={draft.parentGroupCode}
                    onValueChange={v => {
                      const g = ASSET_GROUPS.find(x => x.code === v);
                      setDraft(p => ({ ...p, parentGroupCode: v, parentGroupName: g?.name ?? p.parentGroupName }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSET_GROUPS.map(g => <SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Asset Category</Label>
                  <Select value={draft.assetCategory} onValueChange={v => setField('assetCategory', v as AssetCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSET_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Entity Scope</Label>
                  <Select
                    value={draft.entityId ?? '__group__'}
                    onValueChange={v => {
                      if (v === '__group__') setDraft(p => ({ ...p, entityId: null, entityShortCode: null }));
                      else {
                        const e = entities.find(x => x.id === v);
                        setDraft(p => ({ ...p, entityId: v, entityShortCode: e?.shortCode ?? null }));
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__group__">Group Level</SelectItem>
                      {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.shortCode})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Vendor Name</Label>
                  <Input value={draft.vendorName} onChange={e => setField('vendorName', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Vendor ID</Label>
                  <Input value={draft.vendorId} onChange={e => setField('vendorId', e.target.value)} className="font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Purchase Date</Label>
                  <Input type="date" value={draft.purchaseDate} onChange={e => setField('purchaseDate', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Gross Block (₹)</Label>
                  <Input type="number" value={draft.grossBlock} onChange={e => setField('grossBlock', Number(e.target.value) || 0)} className="font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Opening Balance (₹)</Label>
                  <Input type="number" value={draft.openingBalance} onChange={e => setField('openingBalance', Number(e.target.value) || 0)} className="font-mono" />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Depreciation Method</Label>
                  <Select value={draft.depreciationMethod} onValueChange={v => setField('depreciationMethod', v as DepreciationMethod)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slm">Straight Line (SLM)</SelectItem>
                      <SelectItem value="wdv">Written Down Value (WDV)</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Useful Life (years)</Label>
                  <Input type="number" value={draft.usefulLifeYears} onChange={e => setField('usefulLifeYears', Number(e.target.value) || 0)} className="font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Depreciation Rate (%)</Label>
                  <Input type="number" value={draft.depreciationRate} onChange={e => setField('depreciationRate', Number(e.target.value) || 0)} className="font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Salvage Value (% of gross)</Label>
                  <Input type="number" value={draft.salvage_value_percent} onChange={e => setField('salvage_value_percent', Number(e.target.value) || 0)} className="font-mono" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Accumulated Depreciation Ledger ID</Label>
                  <Input value={draft.accum_depr_ledger_id} onChange={e => setField('accum_depr_ledger_id', e.target.value)} className="font-mono" />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">IT Act Block</Label>
                  <Select
                    value={draft.it_act_block}
                    onValueChange={v => {
                      const block = v as ITActBlock;
                      setDraft(p => ({ ...p, it_act_block: block, it_act_depr_rate: IT_ACT_RATES[block] ?? p.it_act_depr_rate }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(IT_ACT_BLOCK_LABELS).map(k => (
                        <SelectItem key={k} value={k}>{IT_ACT_BLOCK_LABELS[k as ITActBlock]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">IT Act Depreciation Rate (%)</Label>
                  <Input type="number" value={draft.it_act_depr_rate} onChange={e => setField('it_act_depr_rate', Number(e.target.value) || 0)} className="font-mono" />
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={draft.status} onValueChange={v => setField('status', v as AssetLedger['status'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea value={draft.description} onChange={e => setField('description', e.target.value)} rows={2} />
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={draft.notes} onChange={e => setField('notes', e.target.value)} rows={2} />
                </div>
              </div>
            )}
          </LedgerStepSidebar>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{isEdit ? 'Save Changes' : 'Create Asset Ledger'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
