/**
 * HeatMaster.tsx — Heat / Cast number register with chemistry + mechanical + MTC upload.
 * Sprint T-Phase-1.2.3 · Sinha-critical · 4 collapsible sections.
 *
 * D-127: lives outside finecore/.
 * [JWT] GET/POST /api/inventory/heat-numbers
 */
// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration
import { useT } from '@/lib/i18n-engine';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Flame, Plus, Trash2, FileText, Eye, ChevronDown, Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { useHeatNumbers } from '@/hooks/useHeatNumbers';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';
import {
  HEAT_STATUS_LABELS, HEAT_STATUS_COLORS, COMMON_HEAT_STANDARDS,
  type HeatNumber, type HeatStatus,
} from '@/types/heat-number';

const todayISO = () => new Date().toISOString().slice(0, 10);

interface FormState {
  // Identification
  heat_no: string;
  cast_no: string;
  mill_name: string;
  mill_batch_ref: string;
  supplier_name: string;
  supplier_batch_ref: string;
  item_id: string;
  item_code: string;
  item_name: string;
  // Chemistry
  carbon_pct: string;
  manganese_pct: string;
  silicon_pct: string;
  sulphur_pct: string;
  phosphorus_pct: string;
  chromium_pct: string;
  molybdenum_pct: string;
  nickel_pct: string;
  // Mechanical
  yield_strength_mpa: string;
  tensile_strength_mpa: string;
  elongation_pct: string;
  hardness_brinell: string;
  impact_energy_joules: string;
  // Certification
  certificate_no: string;
  certificate_date: string;
  standard: string;
  mtc_document_url: string;
  // Receipt
  received_date: string;
  received_qty: string;
  uom: string;
  status: HeatStatus;
  notes: string;
}

const BLANK: FormState = {
  heat_no: '', cast_no: '', mill_name: '', mill_batch_ref: '',
  supplier_name: '', supplier_batch_ref: '',
  item_id: '', item_code: '', item_name: '',
  carbon_pct: '', manganese_pct: '', silicon_pct: '', sulphur_pct: '',
  phosphorus_pct: '', chromium_pct: '', molybdenum_pct: '', nickel_pct: '',
  yield_strength_mpa: '', tensile_strength_mpa: '', elongation_pct: '',
  hardness_brinell: '', impact_energy_joules: '',
  certificate_no: '', certificate_date: '', standard: '', mtc_document_url: '',
  received_date: todayISO(), received_qty: '', uom: 'KG',
  status: 'received', notes: '',
};

const numOrNull = (s: string): number | null => {
  if (s.trim() === '') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

export function HeatMasterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const { items } = useInventoryItems();
  const { heats, createHeat, updateHeat, deleteHeat } = useHeatNumbers(safeEntity);

  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [readonly, setReadonly] = useState(false);
  const [form, setForm] = useState<FormState>(BLANK);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | HeatStatus>('all');

  // Section open state
  const [idOpen, setIdOpen] = useState(true);
  const [chemOpen, setChemOpen] = useState(false);
  const [mechOpen, setMechOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);

  const kpis = useMemo(() => ({
    total: heats.length,
    active: heats.filter(h => h.status === 'in_production' || h.status === 'received').length,
    consumed: heats.filter(h => h.status === 'consumed').length,
    rejected: heats.filter(h => h.status === 'rejected').length,
  }), [heats]);

  const filtered = useMemo(() => heats
    .filter(h => statusFilter === 'all' || h.status === statusFilter)
    .filter(h => !search ||
      h.heat_no.toLowerCase().includes(search.toLowerCase()) ||
      h.item_name.toLowerCase().includes(search.toLowerCase()) ||
      (h.mill_name ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [heats, statusFilter, search]);

  const startNew = () => {
    setEditingId(null); setReadonly(false);
    setForm(BLANK); setView('form');
    setIdOpen(true); setChemOpen(false); setMechOpen(false); setCertOpen(false);
  };

  const openExisting = (h: HeatNumber, ro: boolean) => {
    setEditingId(h.id); setReadonly(ro);
    setForm({
      heat_no: h.heat_no, cast_no: h.cast_no ?? '',
      mill_name: h.mill_name ?? '', mill_batch_ref: h.mill_batch_ref ?? '',
      supplier_name: h.supplier_name ?? '', supplier_batch_ref: h.supplier_batch_ref ?? '',
      item_id: h.item_id, item_code: h.item_code, item_name: h.item_name,
      carbon_pct: h.carbon_pct?.toString() ?? '',
      manganese_pct: h.manganese_pct?.toString() ?? '',
      silicon_pct: h.silicon_pct?.toString() ?? '',
      sulphur_pct: h.sulphur_pct?.toString() ?? '',
      phosphorus_pct: h.phosphorus_pct?.toString() ?? '',
      chromium_pct: h.chromium_pct?.toString() ?? '',
      molybdenum_pct: h.molybdenum_pct?.toString() ?? '',
      nickel_pct: h.nickel_pct?.toString() ?? '',
      yield_strength_mpa: h.yield_strength_mpa?.toString() ?? '',
      tensile_strength_mpa: h.tensile_strength_mpa?.toString() ?? '',
      elongation_pct: h.elongation_pct?.toString() ?? '',
      hardness_brinell: h.hardness_brinell?.toString() ?? '',
      impact_energy_joules: h.impact_energy_joules?.toString() ?? '',
      certificate_no: h.certificate_no ?? '',
      certificate_date: h.certificate_date ?? '',
      standard: h.standard ?? '',
      mtc_document_url: h.mtc_document_url ?? '',
      received_date: h.received_date ?? todayISO(),
      received_qty: h.received_qty?.toString() ?? '',
      uom: h.uom ?? 'KG',
      status: h.status,
      notes: h.notes ?? '',
    });
    setView('form');
    setIdOpen(true); setChemOpen(false); setMechOpen(false); setCertOpen(false);
  };

  const handleMTCUpload = (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.warning(`MTC file is ${(file.size / 1024 / 1024).toFixed(1)}MB — large files may slow down the page`);
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      setForm(f => ({ ...f, mtc_document_url: dataUri }));
      toast.success('MTC document attached');
      // [JWT] Phase 2: POST /api/inventory/heat-numbers/:id/mtc — replace data URI with S3 URL
    };
    reader.readAsDataURL(file);
  };

  const validate = (): string | null => {
    if (!form.heat_no.trim()) return 'Heat No is required';
    if (!form.item_id) return 'Item is required';
    if (form.received_date && isPeriodLocked(form.received_date, safeEntity)) {
      return periodLockMessage(form.received_date, safeEntity) ?? 'Period locked';
    }
    return null;
  };

  const handleSave = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    // Duplicate check (only on create)
    if (!editingId && heats.some(h => h.heat_no === form.heat_no)) {
      toast.warning(`Heat ${form.heat_no} already exists — saving duplicate (review required)`);
    }
    const now = new Date().toISOString();
    const recvQty = numOrNull(form.received_qty) ?? 0;
    const built: HeatNumber = {
      id: editingId ?? `heat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entity_id: safeEntity,
      heat_no: form.heat_no.trim(),
      cast_no: form.cast_no || null,
      mill_name: form.mill_name || null,
      mill_batch_ref: form.mill_batch_ref || null,
      supplier_name: form.supplier_name || null,
      supplier_batch_ref: form.supplier_batch_ref || null,
      item_id: form.item_id,
      item_code: form.item_code,
      item_name: form.item_name,
      carbon_pct: numOrNull(form.carbon_pct),
      manganese_pct: numOrNull(form.manganese_pct),
      silicon_pct: numOrNull(form.silicon_pct),
      sulphur_pct: numOrNull(form.sulphur_pct),
      phosphorus_pct: numOrNull(form.phosphorus_pct),
      chromium_pct: numOrNull(form.chromium_pct),
      molybdenum_pct: numOrNull(form.molybdenum_pct),
      nickel_pct: numOrNull(form.nickel_pct),
      yield_strength_mpa: numOrNull(form.yield_strength_mpa),
      tensile_strength_mpa: numOrNull(form.tensile_strength_mpa),
      elongation_pct: numOrNull(form.elongation_pct),
      hardness_brinell: numOrNull(form.hardness_brinell),
      impact_energy_joules: numOrNull(form.impact_energy_joules),
      certificate_no: form.certificate_no || null,
      certificate_date: form.certificate_date || null,
      standard: form.standard || null,
      mtc_document_url: form.mtc_document_url || null,
      mtc_uploaded_at: form.mtc_document_url ? now : null,
      mtc_uploaded_by: form.mtc_document_url ? 'current_user' : null,
      received_date: form.received_date || null,
      received_qty: recvQty,
      uom: form.uom,
      status: form.status,
      available_qty: editingId ? heats.find(h => h.id === editingId)?.available_qty ?? recvQty : recvQty,
      consumed_qty: editingId ? heats.find(h => h.id === editingId)?.consumed_qty ?? 0 : 0,
      source_grn_id: null, source_grn_no: null,
      notes: form.notes || null,
      created_at: editingId ? heats.find(h => h.id === editingId)?.created_at ?? now : now,
      updated_at: now,
    };
    if (editingId) {
      updateHeat(editingId, built);
      toast.success(`Heat ${built.heat_no} updated`);
    } else {
      createHeat(built);
      toast.success(`Heat ${built.heat_no} created`);
    }
    setView('list');
  };

  if (view === 'list') {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              Heat Master
            </h1>
            <p className="text-sm text-muted-foreground">
              Mill heat / cast traceability · chemistry · MTC documents
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={startNew}>
            <Plus className="h-4 w-4" /> New Heat
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardDescription>Total Heats</CardDescription>
            <CardTitle className="text-2xl font-mono">{kpis.total}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl font-mono text-blue-600">{kpis.active}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Consumed</CardDescription>
            <CardTitle className="text-2xl font-mono text-slate-600">{kpis.consumed}</CardTitle></CardHeader></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Rejected</CardDescription>
            <CardTitle className="text-2xl font-mono text-rose-600">{kpis.rejected}</CardTitle></CardHeader></Card>
        </div>

        <div className="flex items-center gap-3">
          <Input className="max-w-sm h-9" placeholder="Search heat no / item / mill..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'all' | HeatStatus)}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {(Object.keys(HEAT_STATUS_LABELS) as HeatStatus[]).map(s =>
                <SelectItem key={s} value={s}>{HEAT_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
            {['Heat No', 'Item', 'Mill', 'Cert No', 'Standard', 'Recv Qty', 'Avail Qty', 'Status', 'MTC', ''].map(h =>
              <TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                <Flame className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No heat numbers yet</p>
              </TableCell></TableRow>
            ) : filtered.map(h => (
              <TableRow key={h.id} className="group">
                <TableCell><code className="text-xs font-mono">{h.heat_no}</code></TableCell>
                <TableCell className="text-xs">{h.item_name}</TableCell>
                <TableCell className="text-xs">{h.mill_name ?? '—'}</TableCell>
                <TableCell className="text-xs">{h.certificate_no ?? '—'}</TableCell>
                <TableCell className="text-xs">{h.standard ?? '—'}</TableCell>
                <TableCell className="text-xs font-mono">{h.received_qty ?? 0} {h.uom}</TableCell>
                <TableCell className="text-xs font-mono">{h.available_qty ?? 0}</TableCell>
                <TableCell>
                  <Badge className={`text-[10px] ${HEAT_STATUS_COLORS[h.status]}`}>
                    {HEAT_STATUS_LABELS[h.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {h.mtc_document_url ? (
                    <a href={h.mtc_document_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline">View</a>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => openExisting(h, true)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => openExisting(h, false)}>
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600"
                      onClick={() => deleteHeat(h.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></CardContent></Card>
      </div>
    );
  }

  // Form mode
  const sectionHeader = (label: string, open: boolean) => (
    <div className="flex items-center justify-between w-full">
      <span className="text-sm font-semibold">{label}</span>
      <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            {editingId ? (readonly ? 'View Heat' : 'Edit Heat') : 'New Heat Number'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Mill test certificate (MTC) details · steel/alloy traceability
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setView('list')}>← Back</Button>
      </div>

      {/* Identification */}
      <Card>
        <Collapsible open={idOpen} onOpenChange={setIdOpen}>
          <CollapsibleTrigger className="w-full p-4 hover:bg-muted/30">
            {sectionHeader('1. Identification', idOpen)}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-0">
              <div>
                <Label className="text-xs">Heat No *</Label>
                <Input disabled={readonly} value={form.heat_no}
                  placeholder="H-2024-0891"
                  onChange={e => setForm(f => ({ ...f, heat_no: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Cast No</Label>
                <Input disabled={readonly} value={form.cast_no}
                  onChange={e => setForm(f => ({ ...f, cast_no: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Mill</Label>
                <Input disabled={readonly} value={form.mill_name}
                  placeholder="JSW Steel / SAIL / Tata Steel"
                  onChange={e => setForm(f => ({ ...f, mill_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Mill Batch Ref</Label>
                <Input disabled={readonly} value={form.mill_batch_ref}
                  onChange={e => setForm(f => ({ ...f, mill_batch_ref: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Supplier</Label>
                <Input disabled={readonly} value={form.supplier_name}
                  onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Supplier Batch Ref</Label>
                <Input disabled={readonly} value={form.supplier_batch_ref}
                  onChange={e => setForm(f => ({ ...f, supplier_batch_ref: e.target.value }))} />
              </div>
              <div className="md:col-span-3">
                <Label className="text-xs">Item *</Label>
                <Select disabled={readonly} value={form.item_id}
                  onValueChange={v => {
                    const it = items.find(x => x.id === v);
                    setForm(f => ({
                      ...f, item_id: v,
                      item_code: it?.code ?? '',
                      item_name: it?.name ?? '',
                      uom: it?.primary_uom_symbol ?? 'KG',
                    }));
                  }}>
                  <SelectTrigger><SelectValue placeholder="Select steel grade item" /></SelectTrigger>
                  <SelectContent>
                    {items.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.code} · {i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Received Date</Label>
                <Input disabled={readonly} type="date" value={form.received_date}
                  onChange={e => {
                    const v = e.target.value;
                    if (v && isPeriodLocked(v, safeEntity)) {
                      toast.warning(periodLockMessage(v, safeEntity) ?? 'Period locked');
                    }
                    setForm(f => ({ ...f, received_date: v }));
                  }} />
              </div>
              <div>
                <Label className="text-xs">Received Qty</Label>
                <Input disabled={readonly} type="number" min={0} step="0.001" value={form.received_qty}
                  onChange={e => setForm(f => ({ ...f, received_qty: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select disabled={readonly} value={form.status}
                  onValueChange={v => setForm(f => ({ ...f, status: v as HeatStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(HEAT_STATUS_LABELS) as HeatStatus[]).map(s =>
                      <SelectItem key={s} value={s}>{HEAT_STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Chemistry */}
      <Card>
        <Collapsible open={chemOpen} onOpenChange={setChemOpen}>
          <CollapsibleTrigger className="w-full p-4 hover:bg-muted/30">
            {sectionHeader('2. Chemistry (% by weight)', chemOpen)}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-0">
              {([
                ['carbon_pct', 'C — Carbon %'],
                ['manganese_pct', 'Mn — Manganese %'],
                ['silicon_pct', 'Si — Silicon %'],
                ['sulphur_pct', 'S — Sulphur %'],
                ['phosphorus_pct', 'P — Phosphorus %'],
                ['chromium_pct', 'Cr — Chromium %'],
                ['molybdenum_pct', 'Mo — Molybdenum %'],
                ['nickel_pct', 'Ni — Nickel %'],
              ] as const).map(([k, label]) => (
                <div key={k}>
                  <Label className="text-xs">{label}</Label>
                  <Input disabled={readonly} type="number" min={0} max={100} step="0.001"
                    value={form[k]}
                    onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Mechanical */}
      <Card>
        <Collapsible open={mechOpen} onOpenChange={setMechOpen}>
          <CollapsibleTrigger className="w-full p-4 hover:bg-muted/30">
            {sectionHeader('3. Mechanical Properties', mechOpen)}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-0">
              {([
                ['yield_strength_mpa', 'Yield Strength (MPa)'],
                ['tensile_strength_mpa', 'Tensile Strength (MPa)'],
                ['elongation_pct', 'Elongation %'],
                ['hardness_brinell', 'Hardness (BHN)'],
                ['impact_energy_joules', 'Impact Energy (J)'],
              ] as const).map(([k, label]) => (
                <div key={k}>
                  <Label className="text-xs">{label}</Label>
                  <Input disabled={readonly} type="number" min={0} step="0.01"
                    value={form[k]}
                    onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Certification */}
      <Card>
        <Collapsible open={certOpen} onOpenChange={setCertOpen}>
          <CollapsibleTrigger className="w-full p-4 hover:bg-muted/30">
            {sectionHeader('4. Certification & MTC', certOpen)}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0">
              <div>
                <Label className="text-xs">Certificate No</Label>
                <Input disabled={readonly} value={form.certificate_no}
                  onChange={e => setForm(f => ({ ...f, certificate_no: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Certificate Date</Label>
                <Input disabled={readonly} type="date" value={form.certificate_date}
                  onChange={e => setForm(f => ({ ...f, certificate_date: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Standard</Label>
                <Input disabled={readonly} list="heat-standards" value={form.standard}
                  placeholder="e.g. IS 2062 E350"
                  onChange={e => setForm(f => ({ ...f, standard: e.target.value }))} />
                <datalist id="heat-standards">
                  {COMMON_HEAT_STANDARDS.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">MTC Document</Label>
                {form.mtc_document_url ? (
                  <div className="flex items-center gap-2 text-xs">
                    <a href={form.mtc_document_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 underline">View attached MTC</a>
                    {!readonly && (
                      <Button variant="ghost" size="sm" className="h-7"
                        onClick={() => setForm(f => ({ ...f, mtc_document_url: '' }))}>
                        Remove
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input disabled={readonly} type="file" accept=".pdf,.png,.jpg,.jpeg"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleMTCUpload(f);
                      }} />
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Notes</Label>
                <Textarea disabled={readonly} rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {!readonly && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setView('list')}>Cancel</Button>
          <Button onClick={handleSave}>{editingId ? 'Update' : 'Create'} Heat</Button>
        </div>
      )}
    </div>
  );
}

// Avoid unused-import lint flagging Sheet helpers we may add later
