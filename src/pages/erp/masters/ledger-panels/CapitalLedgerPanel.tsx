/**
 * @file     CapitalLedgerPanel.tsx
 * @purpose  Full-pattern Panel for Capital/Equity ledgers — tree view + 5-step sidebar.
 *           Reads/writes via useLedgerStore against erp_group_ledger_definitions.
 * @sprint   T-H1.5-C-S6.5a
 * @finding  CC-059
 */
import { useMemo, useState } from 'react';
import { Plus, PiggyBank } from 'lucide-react';
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

type CapitalType =
  | 'share_capital_equity' | 'share_capital_preference'
  | 'partners_capital' | 'proprietor_capital'
  | 'general_reserve' | 'retained_earnings' | 'other_reserve';

interface CapitalLedger {
  id: string;
  ledgerType: 'capital';
  name: string; mailingName: string; numericCode: string; code: string; alias: string;
  parentGroupCode: string; parentGroupName: string;
  entityId: string | null; entityShortCode: string | null;
  openingBalance: number; openingBalanceType: 'Dr' | 'Cr';
  capitalType: CapitalType;
  authorisedCapital: number; issuedCapital: number; paidUpCapital: number;
  faceValuePerShare: number; numberOfShares: number;
  partnerName: string; partnerPAN: string;
  profitSharingRatio: number; capitalContribution: number;
  proprietorName: string; proprietorPAN: string;
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

const CAPITAL_STEPS = [
  { id: 1, title: 'Identity',             description: 'Name, code, alias, mailing' },
  { id: 2, title: 'Scope & Parent Group', description: 'Entity, parent group, type' },
  { id: 3, title: 'Holder Details',       description: 'Holder name, PAN, share' },
  { id: 4, title: 'Opening Balance',      description: 'Opening balance, capital amounts' },
  { id: 5, title: 'Audit & Notes',        description: 'Status, description' },
];

const CAPITAL_GROUPS = L3_FINANCIAL_GROUPS.filter(g =>
  ['EQSH', 'PSH', 'RSRV', 'PCAP', 'PRCAP', 'RETE'].includes(g.code));

const CAPITAL_TYPES: { value: CapitalType; label: string }[] = [
  { value: 'share_capital_equity',     label: 'Equity Share Capital' },
  { value: 'share_capital_preference', label: 'Preference Share Capital' },
  { value: 'partners_capital',         label: "Partner's Capital" },
  { value: 'proprietor_capital',       label: "Proprietor's Capital" },
  { value: 'general_reserve',          label: 'General Reserve' },
  { value: 'retained_earnings',        label: 'Retained Earnings' },
  { value: 'other_reserve',            label: 'Other Reserve' },
];

function emptyDraft(): CapitalLedger {
  return {
    id: `cap-${Date.now()}`, ledgerType: 'capital',
    name: '', mailingName: '', numericCode: '', code: '', alias: '',
    parentGroupCode: 'EQSH', parentGroupName: 'Equity Share Capital',
    entityId: null, entityShortCode: null,
    openingBalance: 0, openingBalanceType: 'Cr',
    capitalType: 'general_reserve',
    authorisedCapital: 0, issuedCapital: 0, paidUpCapital: 0,
    faceValuePerShare: 10, numberOfShares: 0,
    partnerName: '', partnerPAN: '',
    profitSharingRatio: 0, capitalContribution: 0,
    proprietorName: '', proprietorPAN: '',
    status: 'active', description: '', notes: '',
    suspendedBy: null, suspendedAt: null, suspendedReason: null,
    reinstatedBy: null, reinstatedAt: null, reinstatedReason: null,
  };
}

function computeCompletedSteps(d: CapitalLedger): number[] {
  const out: number[] = [];
  if (d.name.trim()) out.push(1);
  if (d.parentGroupCode && d.capitalType) out.push(2);
  const isPartner = d.capitalType === 'partners_capital';
  const isProp = d.capitalType === 'proprietor_capital';
  if ((isPartner && d.partnerName.trim()) || (isProp && d.proprietorName.trim()) || (!isPartner && !isProp)) out.push(3);
  if (d.openingBalanceType) out.push(4);
  if (d.status) out.push(5);
  return out;
}

export function CapitalLedgerPanel() {
  const { ledgers, create, update } = useLedgerStore<CapitalLedger>('capital');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CapitalLedger>(emptyDraft());
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
    setDraft({ ...emptyDraft(), ...(raw as Partial<CapitalLedger>), id: String(raw.id) } as CapitalLedger);
    setIsEdit(true); setStep(1); setOpen(true);
  };
  const save = () => {
    if (!draft.name.trim()) { toast.error('Name is required'); return; }
    if (isEdit) { update(draft.id, draft); toast.success('Capital ledger updated'); }
    else { create(draft); toast.success('Capital ledger created'); }
    setOpen(false);
  };
  const setField = <K extends keyof CapitalLedger>(k: K, v: CapitalLedger[K]) =>
    setDraft(prev => ({ ...prev, [k]: v }));

  const isPartner = draft.capitalType === 'partners_capital';
  const isProp = draft.capitalType === 'proprietor_capital';
  const isShare = draft.capitalType === 'share_capital_equity' || draft.capitalType === 'share_capital_preference';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold">Capital & Equity Ledgers</h3>
          <Badge variant="outline" className="text-[10px]">{ledgers.length} total</Badge>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Capital Ledger
        </Button>
      </div>

      <LedgerTreeList
        tree={tree}
        onLeafClick={leaf => openEdit(leaf.raw)}
        emptyState="No capital ledgers yet."
        renderLeafMeta={leaf => {
          const t = String((leaf.raw as Record<string, unknown>).capitalType ?? '');
          const found = CAPITAL_TYPES.find(c => c.value === t);
          return found ? <Badge variant="outline" className="text-[9px]">{found.label}</Badge> : null;
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Capital Ledger' : 'New Capital Ledger'}</DialogTitle>
          </DialogHeader>

          <LedgerStepSidebar
            steps={CAPITAL_STEPS}
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
                  <Label className="text-xs">Capital Type</Label>
                  <Select value={draft.capitalType} onValueChange={v => setField('capitalType', v as CapitalType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAPITAL_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Parent Group</Label>
                  <Select
                    value={draft.parentGroupCode}
                    onValueChange={v => {
                      const g = CAPITAL_GROUPS.find(x => x.code === v);
                      setDraft(p => ({ ...p, parentGroupCode: v, parentGroupName: g?.name ?? p.parentGroupName }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CAPITAL_GROUPS.length === 0 ? (
                        <SelectItem value={draft.parentGroupCode}>{draft.parentGroupName}</SelectItem>
                      ) : CAPITAL_GROUPS.map(g => <SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>)}
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
              <div className="space-y-3">
                {isPartner && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Partner Name</Label>
                      <Input value={draft.partnerName} onChange={e => setField('partnerName', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Partner PAN</Label>
                      <Input value={draft.partnerPAN} onChange={e => setField('partnerPAN', e.target.value.toUpperCase())} className="font-mono uppercase" maxLength={10} />
                    </div>
                    <div>
                      <Label className="text-xs">Profit Sharing Ratio (%)</Label>
                      <Input type="number" value={draft.profitSharingRatio} onChange={e => setField('profitSharingRatio', Number(e.target.value) || 0)} className="font-mono" />
                    </div>
                    <div>
                      <Label className="text-xs">Capital Contribution (₹)</Label>
                      <Input type="number" value={draft.capitalContribution} onChange={e => setField('capitalContribution', Number(e.target.value) || 0)} className="font-mono" />
                    </div>
                  </div>
                )}
                {isProp && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Proprietor Name</Label>
                      <Input value={draft.proprietorName} onChange={e => setField('proprietorName', e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Proprietor PAN</Label>
                      <Input value={draft.proprietorPAN} onChange={e => setField('proprietorPAN', e.target.value.toUpperCase())} className="font-mono uppercase" maxLength={10} />
                    </div>
                  </div>
                )}
                {isShare && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Authorised Capital (₹)</Label>
                      <Input type="number" value={draft.authorisedCapital} onChange={e => setField('authorisedCapital', Number(e.target.value) || 0)} className="font-mono" />
                    </div>
                    <div>
                      <Label className="text-xs">Issued Capital (₹)</Label>
                      <Input type="number" value={draft.issuedCapital} onChange={e => setField('issuedCapital', Number(e.target.value) || 0)} className="font-mono" />
                    </div>
                    <div>
                      <Label className="text-xs">Paid-up Capital (₹)</Label>
                      <Input type="number" value={draft.paidUpCapital} onChange={e => setField('paidUpCapital', Number(e.target.value) || 0)} className="font-mono" />
                    </div>
                    <div>
                      <Label className="text-xs">Face Value per Share (₹)</Label>
                      <Input type="number" value={draft.faceValuePerShare} onChange={e => setField('faceValuePerShare', Number(e.target.value) || 0)} className="font-mono" />
                    </div>
                    <div>
                      <Label className="text-xs">Number of Shares</Label>
                      <Input type="number" value={draft.numberOfShares} onChange={e => setField('numberOfShares', Number(e.target.value) || 0)} className="font-mono" />
                    </div>
                  </div>
                )}
                {!isPartner && !isProp && !isShare && (
                  <p className="text-xs text-muted-foreground">No additional holder details required for this capital type.</p>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Opening Balance (₹)</Label>
                  <Input type="number" value={draft.openingBalance} onChange={e => setField('openingBalance', Number(e.target.value) || 0)} className="font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Dr / Cr</Label>
                  <Select value={draft.openingBalanceType} onValueChange={v => setField('openingBalanceType', v as 'Dr' | 'Cr')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cr">Credit (Cr)</SelectItem>
                      <SelectItem value="Dr">Debit (Dr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={draft.status} onValueChange={v => setField('status', v as CapitalLedger['status'])}>
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
            <Button onClick={save}>{isEdit ? 'Save Changes' : 'Create Capital Ledger'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
