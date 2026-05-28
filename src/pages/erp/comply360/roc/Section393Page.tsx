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

type SubTab = 'section393';

export default function Section393Page(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('section393');
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="section393">Section 393 Register</TabsTrigger>
        </TabsList>
        <TabsContent value="section393"><InnerSurface /></TabsContent>
      </Tabs>
    </div>
  );
}
