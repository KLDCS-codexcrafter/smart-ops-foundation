/**
 * @file     DutiesTaxLedgerPanel.tsx
 * @purpose  Full-pattern Panel for Duties & Tax ledgers — tree + 5-step sidebar.
 *           Reads/writes via useLedgerStore against erp_group_ledger_definitions.
 * @sprint   T-H1.5-C-S6.5b
 * @finding  CC-059
 */
import { useMemo, useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
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

type TaxType = 'gst' | 'tds' | 'tcs' | 'other';
type GstSubType = 'cgst' | 'sgst' | 'igst' | 'cess' | null;
type CalcBasis = 'item_rate' | 'ledger_value' | null;

interface DutiesTaxLedger {
  id: string;
  ledgerType: 'duties_tax';
  name: string; mailingName: string; numericCode: string; code: string; alias: string;
  parentGroupCode: string; parentGroupName: string;
  entityId: string | null; entityShortCode: string | null;
  openingBalance: number; openingBalanceType: 'Dr' | 'Cr';
  status: 'active' | 'suspended';
  taxType: TaxType;
  gstSubType: GstSubType;
  calculationBasis: CalcBasis;
  rate: number;
  // S6.5b alias for smoke test convenience (numeric mirror of `rate`)
  taxRate: number;
  rcmSection?: 'not_applicable' | 'section_9_3' | 'section_9_4';
  gstTaxSubType?: 'output' | 'input' | 'rcm_payable' | 'rcm_input' | 'cess';
  itcEligibility?: 'full' | 'ineligible_17_5' | 'blocked' | 'partial';
  description: string;
  notes: string;
  // Return filing (S6.5b additions, all optional)
  gstrMapping?: 'r1' | 'r3b' | 'r9' | 'none';
  filingFrequency?: 'monthly' | 'quarterly' | 'annual';
  tdsSection?: string;
  suspendedBy: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  reinstatedBy: string | null;
  reinstatedAt: string | null;
  reinstatedReason: string | null;
}

const DUTIES_STEPS = [
  { id: 1, title: 'Identity',              description: 'Name, code, tax type' },
  { id: 2, title: 'Scope & Parent Group',  description: 'Entity, parent group' },
  { id: 3, title: 'Tax Config',            description: 'Rate, basis, RCM, ITC' },
  { id: 4, title: 'Return Filing',         description: 'GSTR mapping, frequency' },
  { id: 5, title: 'Audit & Notes',         description: 'Status, description' },
];

const DUTIES_GROUPS = L3_FINANCIAL_GROUPS.filter(g =>
  ['DUTYP', 'TDSP', 'GSTP'].includes(g.code));

function emptyDraft(): DutiesTaxLedger {
  return {
    id: `dt-${Date.now()}`, ledgerType: 'duties_tax',
    name: '', mailingName: '', numericCode: '', code: '', alias: '',
    parentGroupCode: 'GSTP', parentGroupName: 'GST Payable',
    entityId: null, entityShortCode: null,
    openingBalance: 0, openingBalanceType: 'Cr',
    status: 'active',
    taxType: 'gst', gstSubType: 'cgst', calculationBasis: 'item_rate',
    rate: 9, taxRate: 9,
    rcmSection: 'not_applicable',
    gstTaxSubType: 'output', itcEligibility: 'full',
    description: '', notes: '',
    gstrMapping: 'r3b', filingFrequency: 'monthly', tdsSection: '',
    suspendedBy: null, suspendedAt: null, suspendedReason: null,
    reinstatedBy: null, reinstatedAt: null, reinstatedReason: null,
  };
}

function computeCompletedSteps(d: DutiesTaxLedger): number[] {
  const out: number[] = [];
  if (d.name.trim()) out.push(1);
  if (d.parentGroupCode) out.push(2);
  if (d.taxType && (typeof d.rate === 'number')) out.push(3);
  if (d.gstrMapping || d.tdsSection || d.filingFrequency) out.push(4);
  if (d.description.trim() || d.notes.trim() || d.status) out.push(5);
  return out;
}

export function DutiesTaxLedgerPanel() {
  const { ledgers, create, update } = useLedgerStore<DutiesTaxLedger>('duties_tax');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DutiesTaxLedger>(emptyDraft());
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
    const merged = { ...emptyDraft(), ...(raw as Partial<DutiesTaxLedger>), id: String(raw.id) } as DutiesTaxLedger;
    // backward fill — taxRate mirror of rate
    if (typeof merged.taxRate !== 'number') merged.taxRate = merged.rate;
    setDraft(merged);
    setIsEdit(true); setStep(1); setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) { toast.error('Name is required'); return; }
    const out = { ...draft, taxRate: draft.rate };
    if (isEdit) { update(draft.id, out); toast.success('Duties/Tax ledger updated'); }
    else { create(out); toast.success('Duties/Tax ledger created'); }
    setOpen(false);
  };

  const setField = <K extends keyof DutiesTaxLedger>(k: K, v: DutiesTaxLedger[K]) =>
    setDraft(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-violet-600" />
          <h3 className="text-sm font-semibold">Duties &amp; Taxes</h3>
          <Badge variant="outline" className="text-[10px]">{ledgers.length} total</Badge>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Duties / Tax Ledger
        </Button>
      </div>

      <LedgerTreeList
        tree={tree}
        onLeafClick={leaf => openEdit(leaf.raw)}
        emptyState="No duties / tax ledgers yet."
        renderLeafMeta={leaf => {
          const r = leaf.raw as Partial<DutiesTaxLedger>;
          return (
            <div className="flex gap-1.5">
              <Badge variant="outline" className="text-[9px] uppercase">{r.taxType}</Badge>
              <Badge variant="outline" className={`text-[9px] ${leaf.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                {leaf.status}
              </Badge>
            </div>
          );
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Duties / Tax Ledger' : 'New Duties / Tax Ledger'}</DialogTitle>
          </DialogHeader>

          <LedgerStepSidebar
            steps={DUTIES_STEPS}
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
                    <Label className="text-xs">Tax Type</Label>
                    <Select value={draft.taxType} onValueChange={v => setField('taxType', v as TaxType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gst">GST</SelectItem>
                        <SelectItem value="tds">TDS</SelectItem>
                        <SelectItem value="tcs">TCS</SelectItem>
                        <SelectItem value="other">Cess / Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                      const g = DUTIES_GROUPS.find(x => x.code === v);
                      setDraft(p => ({ ...p, parentGroupCode: v, parentGroupName: g?.name ?? p.parentGroupName }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DUTIES_GROUPS.map(g => <SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>)}
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
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Rate (%)</Label>
                    <Input type="number" step="0.01" value={draft.rate}
                      onChange={e => {
                        const r = Number(e.target.value) || 0;
                        setDraft(p => ({ ...p, rate: r, taxRate: r }));
                      }} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">GST Sub-type</Label>
                    <Select value={draft.gstSubType ?? 'cgst'} onValueChange={v => setField('gstSubType', v as GstSubType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cgst">CGST</SelectItem>
                        <SelectItem value="sgst">SGST</SelectItem>
                        <SelectItem value="igst">IGST</SelectItem>
                        <SelectItem value="cess">Cess</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Calculation Basis</Label>
                    <Select value={draft.calculationBasis ?? 'item_rate'} onValueChange={v => setField('calculationBasis', v as CalcBasis)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="item_rate">On Item Rate</SelectItem>
                        <SelectItem value="ledger_value">On Ledger Value</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">RCM Section</Label>
                    <Select value={draft.rcmSection ?? 'not_applicable'} onValueChange={v => setField('rcmSection', v as DutiesTaxLedger['rcmSection'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_applicable">Not Applicable</SelectItem>
                        <SelectItem value="section_9_3">Sec 9(3)</SelectItem>
                        <SelectItem value="section_9_4">Sec 9(4)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">ITC Eligibility</Label>
                    <Select value={draft.itcEligibility ?? 'full'} onValueChange={v => setField('itcEligibility', v as DutiesTaxLedger['itcEligibility'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="ineligible_17_5">Ineligible — Sec 17(5)</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">GSTR Mapping</Label>
                    <Select value={draft.gstrMapping ?? 'none'} onValueChange={v => setField('gstrMapping', v as DutiesTaxLedger['gstrMapping'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="r1">GSTR-1 (Outward)</SelectItem>
                        <SelectItem value="r3b">GSTR-3B (Summary)</SelectItem>
                        <SelectItem value="r9">GSTR-9 (Annual)</SelectItem>
                        <SelectItem value="none">Not GST-mapped</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Filing Frequency</Label>
                    <Select value={draft.filingFrequency ?? 'monthly'} onValueChange={v => setField('filingFrequency', v as DutiesTaxLedger['filingFrequency'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">TDS Section (if TDS)</Label>
                  <Input value={draft.tdsSection ?? ''} onChange={e => setField('tdsSection', e.target.value)}
                    placeholder="e.g. 194C" className="font-mono" />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={draft.status} onValueChange={v => setField('status', v as DutiesTaxLedger['status'])}>
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
            <Button onClick={save}>{isEdit ? 'Save Changes' : 'Create Tax Ledger'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
