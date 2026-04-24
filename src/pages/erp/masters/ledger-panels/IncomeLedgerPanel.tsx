/**
 * @file     IncomeLedgerPanel.tsx
 * @purpose  Full-pattern Panel for Income ledgers — tree + 5-step sidebar.
 *           Reads/writes via useLedgerStore against erp_group_ledger_definitions.
 * @sprint   T-H1.5-C-S6.5b
 * @finding  CC-059
 */
import { useMemo, useState } from 'react';
import { Plus, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

interface IncomeLedger {
  id: string;
  ledgerType: 'income';
  name: string; mailingName: string; numericCode: string; code: string; alias: string;
  parentGroupCode: string; parentGroupName: string;
  entityId: string | null; entityShortCode: string | null;
  openingBalance: number; openingBalanceType: 'Dr' | 'Cr';
  isGstApplicable: boolean;
  hsnSacCode: string; hsnSacType: 'hsn' | 'sac' | '';
  gstRate: number; cgstRate: number; sgstRate: number; igstRate: number; cessRate: number;
  gstType: 'taxable' | 'exempt' | 'nil_rated' | 'non_gst' | 'zero_rated';
  includeInGstTurnover: boolean;
  isTdsApplicable: boolean;
  tdsSection: string;
  isTdsReceivableLedger: boolean;
  allow_commission_base: boolean;
  costCentreApplicable: boolean;
  status: 'active' | 'suspended';
  description: string;
  notes: string;
  suspendedBy: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  reinstatedBy: string | null;
  reinstatedAt: string | null;
  reinstatedReason: string | null;
}

const INCOME_STEPS = [
  { id: 1, title: 'Identity',             description: 'Name, code, alias' },
  { id: 2, title: 'Scope & Parent Group', description: 'Entity, parent group' },
  { id: 3, title: 'GST & HSN Linkage',    description: 'HSN/SAC, GST rate, applicable flag' },
  { id: 4, title: 'TDS Applicability',    description: 'TDS section (194J/194C/...)' },
  { id: 5, title: 'Audit & Notes',        description: 'Status, description' },
];

const INCOME_GROUPS = L3_FINANCIAL_GROUPS.filter(g =>
  ['SALE', 'SRET', 'SDISC', 'SERV', 'EXINC', 'INTINC', 'DIVINC', 'RNTINC', 'GAIN', 'MISC', 'FXGAIN'].includes(g.code));

function emptyDraft(): IncomeLedger {
  return {
    id: `inc-${Date.now()}`, ledgerType: 'income',
    name: '', mailingName: '', numericCode: '', code: '', alias: '',
    parentGroupCode: 'SALE', parentGroupName: 'Revenue from Operations',
    entityId: null, entityShortCode: null,
    openingBalance: 0, openingBalanceType: 'Cr',
    isGstApplicable: true, hsnSacCode: '', hsnSacType: '',
    gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0,
    gstType: 'taxable', includeInGstTurnover: true,
    isTdsApplicable: false, tdsSection: '',
    isTdsReceivableLedger: false, allow_commission_base: false, costCentreApplicable: false,
    status: 'active', description: '', notes: '',
    suspendedBy: null, suspendedAt: null, suspendedReason: null,
    reinstatedBy: null, reinstatedAt: null, reinstatedReason: null,
  };
}

function computeCompletedSteps(d: IncomeLedger): number[] {
  const out: number[] = [];
  if (d.name.trim()) out.push(1);
  if (d.parentGroupCode) out.push(2);
  if (!d.isGstApplicable || d.hsnSacCode.trim() || d.gstRate > 0) out.push(3);
  if (!d.isTdsApplicable || d.tdsSection.trim()) out.push(4);
  if (d.description.trim() || d.notes.trim() || d.status) out.push(5);
  return out;
}

export function IncomeLedgerPanel() {
  const { ledgers, create, update } = useLedgerStore<IncomeLedger>('income');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<IncomeLedger>(emptyDraft());
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
    setDraft({ ...emptyDraft(), ...(raw as Partial<IncomeLedger>), id: String(raw.id) } as IncomeLedger);
    setIsEdit(true); setStep(1); setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) { toast.error('Name is required'); return; }
    if (isEdit) { update(draft.id, draft); toast.success('Income ledger updated'); }
    else { create(draft); toast.success('Income ledger created'); }
    setOpen(false);
  };

  const setField = <K extends keyof IncomeLedger>(k: K, v: IncomeLedger[K]) =>
    setDraft(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">Income Ledgers</h3>
          <Badge variant="outline" className="text-[10px]">{ledgers.length} total</Badge>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Income Ledger
        </Button>
      </div>

      <LedgerTreeList
        tree={tree}
        onLeafClick={leaf => openEdit(leaf.raw)}
        emptyState="No income ledgers yet. Click + Add Income Ledger above."
        renderLeafMeta={leaf => (
          <Badge variant="outline" className={`text-[9px] ${leaf.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
            {leaf.status}
          </Badge>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Income Ledger' : 'New Income Ledger'}</DialogTitle>
          </DialogHeader>

          <LedgerStepSidebar
            steps={INCOME_STEPS}
            currentStep={step}
            onStepClick={setStep}
            completedSteps={computeCompletedSteps(draft)}
          >
            {step === 1 && (
              <div className="space-y-3">
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
                </div>
                <div>
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
                      const g = INCOME_GROUPS.find(x => x.code === v);
                      setDraft(p => ({ ...p, parentGroupCode: v, parentGroupName: g?.name ?? p.parentGroupName }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INCOME_GROUPS.map(g => <SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>)}
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
                      <SelectItem value="__group__">Group Level (all entities)</SelectItem>
                      {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.shortCode})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={draft.isGstApplicable} onCheckedChange={v => setField('isGstApplicable', v)} />
                  <Label className="text-xs">GST Applicable</Label>
                </div>
                {draft.isGstApplicable && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">HSN/SAC Type</Label>
                        <Select value={draft.hsnSacType || 'sac'} onValueChange={v => setField('hsnSacType', v as IncomeLedger['hsnSacType'])}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hsn">HSN</SelectItem>
                            <SelectItem value="sac">SAC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">HSN/SAC Code</Label>
                        <Input value={draft.hsnSacCode} onChange={e => setField('hsnSacCode', e.target.value)} className="font-mono" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">GST Rate (%)</Label>
                        <Input type="number" value={draft.gstRate}
                          onChange={e => {
                            const r = Number(e.target.value) || 0;
                            setDraft(p => ({ ...p, gstRate: r, cgstRate: r / 2, sgstRate: r / 2, igstRate: r }));
                          }} className="font-mono" />
                      </div>
                      <div>
                        <Label className="text-xs">GST Type</Label>
                        <Select value={draft.gstType} onValueChange={v => setField('gstType', v as IncomeLedger['gstType'])}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="taxable">Taxable</SelectItem>
                            <SelectItem value="exempt">Exempt</SelectItem>
                            <SelectItem value="nil_rated">Nil Rated</SelectItem>
                            <SelectItem value="non_gst">Non-GST</SelectItem>
                            <SelectItem value="zero_rated">Zero Rated (Export)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-2">
                        <Switch checked={draft.includeInGstTurnover} onCheckedChange={v => setField('includeInGstTurnover', v)} />
                        <Label className="text-xs">Include in turnover</Label>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={draft.isTdsApplicable} onCheckedChange={v => setField('isTdsApplicable', v)} />
                  <Label className="text-xs">TDS Applicable on this income</Label>
                </div>
                {draft.isTdsApplicable && (
                  <div>
                    <Label className="text-xs">TDS Section</Label>
                    <Input value={draft.tdsSection} onChange={e => setField('tdsSection', e.target.value)}
                      placeholder="e.g. 194J · 194C · 194I" className="font-mono" />
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={draft.isTdsReceivableLedger} onCheckedChange={v => setField('isTdsReceivableLedger', v)} />
                  <Label className="text-xs">Mark as TDS Receivable ledger (26AS reconciliation)</Label>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={draft.status} onValueChange={v => setField('status', v as IncomeLedger['status'])}>
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
            <Button onClick={save}>{isEdit ? 'Save Changes' : 'Create Income Ledger'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
