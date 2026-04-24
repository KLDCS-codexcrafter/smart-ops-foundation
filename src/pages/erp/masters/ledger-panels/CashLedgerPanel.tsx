/**
 * @file     CashLedgerPanel.tsx
 * @purpose  Full-pattern Panel for Cash ledgers — tree view + 5-step sidebar
 *           inside Create/Edit dialog. Reads/writes via useLedgerStore against
 *           the existing erp_group_ledger_definitions storage key.
 * @sprint   T-H1.5-C-S6.5a
 * @finding  CC-059
 */
import { useMemo, useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
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
import { L3_FINANCIAL_GROUPS, L2_PARENT_GROUPS, deriveLedgerNumericCode } from '@/data/finframe-seed-data';
import { loadEntities } from '@/data/mock-entities';

interface CashLedger {
  id: string;
  ledgerType: 'cash';
  name: string;
  numericCode: string;
  code: string;
  alias: string;
  mailingName: string;
  parentGroupCode: string;
  parentGroupName: string;
  entityId: string | null;
  entityShortCode: string | null;
  location: string;
  cashLimit: number;
  alertThreshold: number;
  isMainCash: boolean;
  voucherSeries: string;
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

const CASH_STEPS = [
  { id: 1, title: 'Identity',             description: 'Name, code, alias, mailing name' },
  { id: 2, title: 'Scope & Parent Group', description: 'Entity, parent group' },
  { id: 3, title: 'Limits & Alerts',      description: 'Cash limit, alert threshold, main cash' },
  { id: 4, title: 'Voucher Config',       description: 'Voucher series, location' },
  { id: 5, title: 'Audit & Notes',        description: 'Status, description' },
];

const CASH_GROUPS = L3_FINANCIAL_GROUPS.filter(g => g.isCash);

function emptyDraft(): CashLedger {
  return {
    id: `cash-${Date.now()}`, ledgerType: 'cash',
    name: '', numericCode: '', code: '', alias: '', mailingName: '',
    parentGroupCode: 'CASH', parentGroupName: 'Cash & Cash Equivalents',
    entityId: null, entityShortCode: null,
    location: '', cashLimit: 0, alertThreshold: 0, isMainCash: false,
    voucherSeries: 'CR', status: 'active',
    description: '', notes: '',
    suspendedBy: null, suspendedAt: null, suspendedReason: null,
    reinstatedBy: null, reinstatedAt: null, reinstatedReason: null,
  };
}

function computeCompletedSteps(d: CashLedger): number[] {
  const out: number[] = [];
  if (d.name.trim()) out.push(1);
  if (d.parentGroupCode) out.push(2);
  if (d.cashLimit > 0 || d.alertThreshold > 0 || d.isMainCash) out.push(3);
  if (d.voucherSeries.trim()) out.push(4);
  if (d.description.trim() || d.notes.trim() || d.status) out.push(5);
  return out;
}

export function CashLedgerPanel() {
  const { ledgers, create, update } = useLedgerStore<CashLedger>('cash');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CashLedger>(emptyDraft());
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
    setDraft(d);
    setIsEdit(false);
    setStep(1);
    setOpen(true);
  };

  const openEdit = (raw: Record<string, unknown>) => {
    setDraft({ ...emptyDraft(), ...(raw as Partial<CashLedger>), id: String(raw.id) } as CashLedger);
    setIsEdit(true);
    setStep(1);
    setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) { toast.error('Name is required'); return; }
    if (isEdit) {
      update(draft.id, draft);
      toast.success('Cash ledger updated');
    } else {
      create(draft);
      toast.success('Cash ledger created');
    }
    setOpen(false);
  };

  const setField = <K extends keyof CashLedger>(k: K, v: CashLedger[K]) =>
    setDraft(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-teal-600" />
          <h3 className="text-sm font-semibold">Cash Ledgers</h3>
          <Badge variant="outline" className="text-[10px]">{ledgers.length} total</Badge>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Cash Ledger
        </Button>
      </div>

      <LedgerTreeList
        tree={tree}
        onLeafClick={leaf => openEdit(leaf.raw)}
        emptyState="No cash ledgers yet. Click + Add Cash Ledger above."
        renderLeafMeta={leaf => (
          <Badge variant="outline" className={`text-[9px] ${leaf.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
            {leaf.status}
          </Badge>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Cash Ledger' : 'New Cash Ledger'}</DialogTitle>
          </DialogHeader>

          <LedgerStepSidebar
            steps={CASH_STEPS}
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
                      const g = CASH_GROUPS.find(x => x.code === v);
                      setDraft(p => ({ ...p, parentGroupCode: v, parentGroupName: g?.name ?? p.parentGroupName }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CASH_GROUPS.map(g => <SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>)}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Cash Limit (₹)</Label>
                    <Input type="number" value={draft.cashLimit} onChange={e => setField('cashLimit', Number(e.target.value) || 0)} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Alert Threshold (₹)</Label>
                    <Input type="number" value={draft.alertThreshold} onChange={e => setField('alertThreshold', Number(e.target.value) || 0)} className="font-mono" />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={draft.isMainCash} onCheckedChange={v => setField('isMainCash', v)} />
                  <Label className="text-xs">Mark as Main Cash for this entity</Label>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Voucher Series</Label>
                  <Input value={draft.voucherSeries} onChange={e => setField('voucherSeries', e.target.value)} className="font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Physical Location</Label>
                  <Input value={draft.location} onChange={e => setField('location', e.target.value)} placeholder="e.g. HO Reception · Mumbai" />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={draft.status} onValueChange={v => setField('status', v as CashLedger['status'])}>
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
            <Button onClick={save}>{isEdit ? 'Save Changes' : 'Create Cash Ledger'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Reference parent-group lookup so build doesn't drop the import in tree-shake
void L2_PARENT_GROUPS;
