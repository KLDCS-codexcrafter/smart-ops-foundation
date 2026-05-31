/**
 * @file        src/pages/erp/comply360/roc/Section393Page.tsx
 * @purpose     Section 393 arrangements register · consumes comply360-section393-engine
 * @sprint      Sprint 73b · T-Phase-5.A.1.5-PASS-B · Block 5 · PATTERN-S70b
 * @disciplines FR-7 · FR-13 · FR-19
 */
import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Scroll, Trash2, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import {
  loadArrangements,
  recordArrangement,
  buildSection393Disclosure,
  deleteArrangement,
  type Arrangement,
  type ArrangementScheme,
  type NCLTStatus,
} from '@/lib/comply360-section393-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
// S83 Floor 3 ROC-Suite imports
import {
  createDirectorMaster, listDirectors, generateDIR3KYCDraft, listDIR3KYCFilings, getUpcomingDIR3Deadlines,
} from '@/lib/comply360-dir3-kyc-engine';
import {
  createAOC4Filing, listAOC4Filings, computeAOC4Fee, type AOC4FilingType,
} from '@/lib/comply360-aoc4-engine';
import {
  createMGT7Filing, listMGT7Filings, determineMGT7Variant,
} from '@/lib/comply360-mgt7-engine';
import {
  createADT1Filing, listADT1Filings, addDSCVaultEntry, listDSCVaultEntries,
} from '@/lib/comply360-adt1-engine';
import {
  recordRegisterEntry, listRegisterEntries, getRegisterTypes, type StatutoryRegisterType,
} from '@/lib/comply360-statutory-registers-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';

const SCHEMES: ArrangementScheme[] = [
  'amalgamation', 'merger', 'demerger', 'compromise-with-creditors',
  'compromise-with-members', 'reconstruction', 'reduction-of-capital', 'cross-border-merger',
];

const NCLT_STATUSES: NCLTStatus[] = [
  'draft', 'first-motion-filed', 'meetings-convened', 'second-motion-filed',
  'sanctioned', 'rejected', 'withdrawn',
];

function InnerSurface(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [refreshTick, setRefreshTick] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [discOpen, setDiscOpen] = useState<Arrangement | null>(null);
  const [draft, setDraft] = useState({
    scheme: 'amalgamation' as ArrangementScheme,
    short_title: '',
    appointed_date: new Date().toISOString().slice(0, 10),
    nclt_status: 'draft' as NCLTStatus,
    transferor: '',
    transferee: '',
  });

  const arrangements = useMemo(() => {
    if (!entityCode) return [];
    return loadArrangements(entityCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, refreshTick]);

  if (!entityId || entityId === 'all') {
    return (
      <div className="p-6">
        <Card className="p-12 text-center">
          <Scroll className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-2">Select a company to continue</h2>
          <p className="text-muted-foreground">Choose an entity from the header dropdown to view the §393 register.</p>
        </Card>
      </div>
    );
  }

  const handleAdd = (): void => {
    if (!draft.short_title) {
      toast.error('Short title required');
      return;
    }
    recordArrangement({
      entity_code: entityCode,
      scheme: draft.scheme,
      short_title: draft.short_title,
      appointed_date: draft.appointed_date,
      nclt_status: draft.nclt_status,
      parties: [
        ...(draft.transferor ? [{ party_id: `tr-${draft.transferor}`, party_name: draft.transferor, role: 'transferor' as const }] : []),
        ...(draft.transferee ? [{ party_id: `te-${draft.transferee}`, party_name: draft.transferee, role: 'transferee' as const }] : []),
      ],
    });
    toast.success('Arrangement recorded');
    setAddOpen(false);
    setDraft({
      scheme: 'amalgamation', short_title: '', appointed_date: new Date().toISOString().slice(0, 10),
      nclt_status: 'draft', transferor: '', transferee: '',
    });
    setRefreshTick((t) => t + 1);
  };

  const handleDelete = (id: string): void => {
    if (deleteArrangement(entityCode, id)) {
      toast.success('Arrangement deleted');
      setRefreshTick((t) => t + 1);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Section 393 · Arrangements Register</h1>
          <p className="text-muted-foreground text-sm">Companies Act 2013 · arrangements, compromises, amalgamations</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Arrangement
        </Button>
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Scheme</TableHead>
              <TableHead>NCLT Status</TableHead>
              <TableHead>Appointed Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {arrangements.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No arrangements recorded</TableCell></TableRow>
            )}
            {arrangements.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.short_title}</TableCell>
                <TableCell><Badge variant="secondary">{a.scheme}</Badge></TableCell>
                <TableCell><Badge>{a.nclt_status}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{a.appointed_date}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" className="mr-2" onClick={() => setDiscOpen(a)}>
                    <FileJson className="h-3 w-3 mr-1" /> Disclosure
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(a.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Arrangement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="arr-title">Short Title</Label>
              <Input id="arr-title" value={draft.short_title} onChange={(e) => setDraft({ ...draft, short_title: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="arr-scheme">Scheme</Label>
              <Select value={draft.scheme} onValueChange={(v) => setDraft({ ...draft, scheme: v as ArrangementScheme })}>
                <SelectTrigger id="arr-scheme"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEMES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="arr-nclt">NCLT Status</Label>
              <Select value={draft.nclt_status} onValueChange={(v) => setDraft({ ...draft, nclt_status: v as NCLTStatus })}>
                <SelectTrigger id="arr-nclt"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NCLT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="arr-appointed">Appointed Date</Label>
              <Input id="arr-appointed" type="date" value={draft.appointed_date} onChange={(e) => setDraft({ ...draft, appointed_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="arr-transferor">Transferor</Label>
                <Input id="arr-transferor" value={draft.transferor} onChange={(e) => setDraft({ ...draft, transferor: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="arr-transferee">Transferee</Label>
                <Input id="arr-transferee" value={draft.transferee} onChange={(e) => setDraft({ ...draft, transferee: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={discOpen !== null} onOpenChange={(o) => !o && setDiscOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>§393 Disclosure · {discOpen?.short_title}</DialogTitle></DialogHeader>
          <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[50vh]">
            {discOpen ? JSON.stringify(buildSection393Disclosure(discOpen), null, 2) : '—'}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type SubTab = 'section393' | 'dir3-kyc' | 'aoc4' | 'mgt7' | 'adt1' | 'dsc-vault' | 'statutory-registers';

export default function Section393Page(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('section393');
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="section393">Section 393</TabsTrigger>
          <TabsTrigger value="dir3-kyc">DIR-3 KYC</TabsTrigger>
          <TabsTrigger value="aoc4">AOC-4</TabsTrigger>
          <TabsTrigger value="mgt7">MGT-7</TabsTrigger>
          <TabsTrigger value="adt1">ADT-1</TabsTrigger>
          <TabsTrigger value="dsc-vault">DSC Vault</TabsTrigger>
          <TabsTrigger value="statutory-registers">Statutory Registers</TabsTrigger>
        </TabsList>
        <TabsContent value="section393"><InnerSurface /></TabsContent>
        <TabsContent value="dir3-kyc"><DIR3KYCPanel bap={bap} /></TabsContent>
        <TabsContent value="aoc4"><AOC4Panel bap={bap} /></TabsContent>
        <TabsContent value="mgt7"><MGT7Panel bap={bap} /></TabsContent>
        <TabsContent value="adt1"><ADT1Panel bap={bap} /></TabsContent>
        <TabsContent value="dsc-vault"><DSCVaultPanel bap={bap} /></TabsContent>
        <TabsContent value="statutory-registers"><StatutoryRegistersPanel bap={bap} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ───────── S83 Inline Panels ─────────

function DIR3KYCPanel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [tick, setTick] = useState(0);
  const directors = useMemo(() => listDirectors(), [tick]);
  const filings = useMemo(() => listDIR3KYCFilings(), [tick]);
  const upcoming = useMemo(() => getUpcomingDIR3Deadlines(60), [tick]);
  const fy = `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, '0')}`;
  const addDemoDirector = (): void => {
    createDirectorMaster({
      din: `0000${Math.floor(1000 + Math.random() * 9000)}`,
      name: 'Demo Director', date_of_birth: '1980-01-01', pan: 'ABCDE1234F',
      passport_no: null, address: 'Mumbai, MH', email: 'dir@example.com',
      mobile: '9999900000', designation: 'Director', appointment_date: '2020-04-01',
      created_by_bap: bap,
    });
    toast.success('Director added');
    setTick((t) => t + 1);
  };
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">DIR-3 KYC · Director Master</h2>
        <Button onClick={addDemoDirector}><Plus className="h-4 w-4 mr-1" /> Add Director</Button>
      </div>
      {upcoming.length > 0 && (
        <Card className="p-3 border-warning">
          <p className="text-sm"><strong>{upcoming.length}</strong> upcoming DIR-3 KYC deadlines (next 60 days)</p>
        </Card>
      )}
      <Card className="p-4">
        <Table>
          <TableHeader><TableRow><TableHead>DIN</TableHead><TableHead>Name</TableHead><TableHead>Designation</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
          <TableBody>
            {directors.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No directors</TableCell></TableRow>)}
            {directors.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-xs">{d.din}</TableCell>
                <TableCell>{d.name}</TableCell>
                <TableCell><Badge variant="secondary">{d.designation}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => {
                    generateDIR3KYCDraft({ director_id: d.id, filing_type: 'DIR_3_KYC', fy, prepared_by_bap: bap });
                    toast.success('DIR-3 KYC draft generated'); setTick((t) => t + 1);
                  }}>Generate KYC</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2">Filings ({filings.length})</h3>
        <Table>
          <TableHeader><TableRow><TableHead>DIN</TableHead><TableHead>FY</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Deadline</TableHead></TableRow></TableHeader>
          <TableBody>
            {filings.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-xs">{f.din}</TableCell>
                <TableCell>{f.fy}</TableCell>
                <TableCell>{f.filing_type}</TableCell>
                <TableCell><Badge>{f.filing_status}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{f.deadline}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function AOC4Panel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [tick, setTick] = useState(0);
  const [variant, setVariant] = useState<AOC4FilingType>('standalone');
  const filings = useMemo(() => listAOC4Filings(), [tick]);
  const fy = `${new Date().getFullYear() - 1}-${String(new Date().getFullYear() % 100).padStart(2, '0')}`;
  const addDemo = (): void => {
    const capital = 50000000;
    createAOC4Filing({
      filing_type: variant, fy, agm_date: new Date().toISOString().slice(0, 10),
      paid_up_capital_inr: capital, authorized_capital_inr: capital * 2,
      balance_sheet_attestation_ref: null, pl_attestation_ref: null, cash_flow_attestation_ref: null,
      auditor_report_attachment: null, boards_report_attachment: null,
      csr_annexure_2_required: capital >= 50000000, csr_annexure_2_attachment: null,
      prepared_by_bap: bap,
    });
    toast.success(`AOC-4 ${variant} draft created`);
    setTick((t) => t + 1);
  };
  const feeSample = computeAOC4Fee(50000000, 0);
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AOC-4 · Financial Statement Filing</h2>
        <div className="flex gap-2">
          <Select value={variant} onValueChange={(v) => setVariant(v as AOC4FilingType)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="standalone">Standalone</SelectItem>
              <SelectItem value="consolidated">Consolidated</SelectItem>
              <SelectItem value="xbrl">XBRL</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addDemo}><Plus className="h-4 w-4 mr-1" /> New Filing</Button>
        </div>
      </div>
      <Card className="p-3 text-sm">Indicative fee (₹5 cr capital): ₹{feeSample.filing_fee_inr}</Card>
      <Card className="p-4">
        <Table>
          <TableHeader><TableRow><TableHead>FY</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Deadline</TableHead><TableHead className="text-right">Fee</TableHead></TableRow></TableHeader>
          <TableBody>
            {filings.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No AOC-4 filings</TableCell></TableRow>)}
            {filings.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.fy}</TableCell>
                <TableCell><Badge variant="secondary">{f.filing_type}</Badge></TableCell>
                <TableCell><Badge>{f.filing_status}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{f.filing_deadline}</TableCell>
                <TableCell className="text-right font-mono">₹{f.filing_fee_inr}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function MGT7Panel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [tick, setTick] = useState(0);
  const filings = useMemo(() => listMGT7Filings(), [tick]);
  const fy = `${new Date().getFullYear() - 1}-${String(new Date().getFullYear() % 100).padStart(2, '0')}`;
  const addDemo = (): void => {
    const paid_up = 30000000, turnover = 150000000;
    const variant = determineMGT7Variant({ paid_up_capital_inr: paid_up, turnover_inr: turnover });
    createMGT7Filing({
      filing_type: variant, fy, agm_date: new Date().toISOString().slice(0, 10),
      paid_up_capital_inr: paid_up, total_members: 12, prepared_by_bap: bap,
    });
    toast.success(`${variant} draft created`);
    setTick((t) => t + 1);
  };
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">MGT-7 · Annual Return</h2>
        <Button onClick={addDemo}><Plus className="h-4 w-4 mr-1" /> New Filing</Button>
      </div>
      <Card className="p-4">
        <Table>
          <TableHeader><TableRow><TableHead>FY</TableHead><TableHead>Variant</TableHead><TableHead>Status</TableHead><TableHead>Deadline</TableHead><TableHead className="text-right">Members</TableHead></TableRow></TableHeader>
          <TableBody>
            {filings.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No MGT-7 filings</TableCell></TableRow>)}
            {filings.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.fy}</TableCell>
                <TableCell><Badge variant="secondary">{f.filing_type}</Badge></TableCell>
                <TableCell><Badge>{f.filing_status}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{f.filing_deadline}</TableCell>
                <TableCell className="text-right font-mono">{f.total_members}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function ADT1Panel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [tick, setTick] = useState(0);
  const filings = useMemo(() => listADT1Filings(), [tick]);
  const fy = `${new Date().getFullYear() - 1}-${String(new Date().getFullYear() % 100).padStart(2, '0')}`;
  const addDemo = (): void => {
    createADT1Filing({
      fy, appointment_type: 'first_appointment', auditor_class: 'CA_Firm',
      auditor_name: 'Demo & Co LLP', icai_membership_no: 'M123456',
      ca_firm_registration_no: '012345N', appointment_date: new Date().toISOString().slice(0, 10),
      agm_date_resolution: new Date().toISOString().slice(0, 10), term_years: 5, prepared_by_bap: bap,
    });
    toast.success('ADT-1 draft created'); setTick((t) => t + 1);
  };
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">ADT-1 · Auditor Appointment</h2>
        <Button onClick={addDemo}><Plus className="h-4 w-4 mr-1" /> New Appointment</Button>
      </div>
      <Card className="p-4">
        <Table>
          <TableHeader><TableRow><TableHead>FY</TableHead><TableHead>Auditor</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Deadline</TableHead></TableRow></TableHeader>
          <TableBody>
            {filings.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No ADT-1 filings</TableCell></TableRow>)}
            {filings.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.fy}</TableCell>
                <TableCell>{f.auditor_name}</TableCell>
                <TableCell><Badge variant="secondary">{f.appointment_type}</Badge></TableCell>
                <TableCell><Badge>{f.filing_status}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{f.filing_deadline}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function DSCVaultPanel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [tick, setTick] = useState(0);
  const entries = useMemo(() => listDSCVaultEntries(), [tick]);
  const addDemo = (): void => {
    addDSCVaultEntry({
      director_id: null, din: '00012345',
      certificate_id: `CERT-${Date.now()}`, role: 'Director', added_by_bap: bap,
    });
    toast.success('DSC Vault entry added'); setTick((t) => t + 1);
  };
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">DSC Vault</h2>
        <Button onClick={addDemo}><Plus className="h-4 w-4 mr-1" /> Add DSC</Button>
      </div>
      <Card className="p-4">
        <Table>
          <TableHeader><TableRow><TableHead>Certificate ID</TableHead><TableHead>DIN</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Added</TableHead></TableRow></TableHeader>
          <TableBody>
            {entries.length === 0 && (<TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No DSC entries</TableCell></TableRow>)}
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.certificate_id}</TableCell>
                <TableCell className="font-mono text-xs">{e.din ?? '—'}</TableCell>
                <TableCell><Badge variant="secondary">{e.role}</Badge></TableCell>
                <TableCell><Badge>{e.vault_status}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{e.added_at.slice(0, 10)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function StatutoryRegistersPanel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const types = useMemo(() => getRegisterTypes(), []);
  const [active, setActive] = useState<StatutoryRegisterType>(types[0].register_type);
  const [tick, setTick] = useState(0);
  const entries = useMemo(() => listRegisterEntries(active, { is_active: true }), [active, tick]);
  const addDemo = (): void => {
    recordRegisterEntry({
      register_type: active,
      entry_payload: { note: `Demo entry · ${active}`, ts: Date.now() },
      effective_date: new Date().toISOString().slice(0, 10),
      recorded_by_bap: bap,
    });
    toast.success('Register entry recorded'); setTick((t) => t + 1);
  };
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-semibold">Statutory Registers</h2>
        <div className="flex gap-2">
          <Select value={active} onValueChange={(v) => setActive(v as StatutoryRegisterType)}>
            <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t.register_type} value={t.register_type}>{t.label} ({t.section})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addDemo}><Plus className="h-4 w-4 mr-1" /> Add Entry</Button>
        </div>
      </div>
      <Card className="p-4">
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Effective Date</TableHead><TableHead>Recorded At</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
          <TableBody>
            {entries.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No active entries</TableCell></TableRow>)}
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-xs">{e.id}</TableCell>
                <TableCell className="font-mono text-xs">{e.effective_date}</TableCell>
                <TableCell className="font-mono text-xs">{e.recorded_at.slice(0, 19)}</TableCell>
                <TableCell><Badge>{e.is_active ? 'active' : 'superseded'}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
