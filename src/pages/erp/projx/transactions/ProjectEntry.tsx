/**
 * ProjectEntry.tsx — ProjX Project list + create/edit form
 * Sprint T-Phase-1.1.2-a · Tier 1 Card #1 · the live transaction surface
 *
 * Surfaces:
 *  - ProjectEntryPanel — embedded inside ProjXPage (active module 't-project-entry')
 *
 * Top 1% behaviors:
 *  - Status changes go through transitionStatus → enforces canTransitionStatus rules
 *  - Live P&L computed via computeProjectPnLStub (D-216 — never persisted)
 *  - Convert from Quotation populates source linkage + items context
 *  - Conversion logged via logConversionEvent('quotation_to_project') — see updated engine
 */
// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration
import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Briefcase, Plus, Edit2, Search, FolderKanban, ArrowRightLeft, AlertTriangle, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProjects } from '@/hooks/useProjects';
import { useProjectCentres } from '@/hooks/useProjectCentres';
import { useQuotations } from '@/hooks/useQuotations';
import { useSAMPersons } from '@/hooks/useSAMPersons';
import {
  PROJECT_TYPE_LABELS, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS,
} from '@/types/projx/project';
import type { Project, ProjectStatus, ProjectType } from '@/types/projx/project';
import { computeProjectPnLStub } from '@/lib/projx-engine';
import { logConversionEvent } from '@/lib/salesx-conversion-engine';
import { isPeriodLocked } from '@/lib/period-lock-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import type { CreateProjectInput } from '@/hooks/useProjects';
import { useT } from '@/lib/i18n-engine';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

interface FormState {
  project_name: string;
  project_code: string;
  project_type: ProjectType;
  status: ProjectStatus;
  customer_id: string | null;
  customer_name: string | null;
  project_centre_id: string;
  source_quotation_id: string | null;
  source_quotation_no: string | null;
  source_so_id: string | null;
  source_so_no: string | null;
  reference_project_id: string | null;
  estimation_snapshot_id: string | null;
  is_export_project: boolean;
  start_date: string;
  target_end_date: string;
  original_contract_value: number;
  current_contract_value: number;
  contract_value: number;
  project_manager_id: string | null;
  project_manager_name: string | null;
  description: string;
  is_active: boolean;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const plus90 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
};

const BLANK: FormState = {
  project_name: '', project_code: '', project_type: 'product_implementation',
  status: 'planning', customer_id: null, customer_name: null,
  project_centre_id: '', source_quotation_id: null, source_quotation_no: null,
  source_so_id: null, source_so_no: null,
  reference_project_id: null, estimation_snapshot_id: null, is_export_project: false,
  start_date: todayISO(), target_end_date: plus90(),
  original_contract_value: 0, current_contract_value: 0, contract_value: 0,
  project_manager_id: null, project_manager_name: null,
  description: '', is_active: true,
};

export function ProjectEntryPanel() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const { projects, createProject, updateProject, transitionStatus, softDelete } = useProjects(entityCode);
  const { centres } = useProjectCentres(entityCode);
  const { quotations } = useQuotations(entityCode);
  const { persons: samPersons } = useSAMPersons(entityCode);
  const pmPickerOptions = useMemo(
    () => samPersons
      .filter(p => p.is_active)
      .sort((a, b) => {
        const aPM = a.person_type === 'project_manager' ? 0 : 1;
        const bPM = b.person_type === 'project_manager' ? 0 : 1;
        if (aPM !== bPM) return aPM - bPM;
        return a.display_name.localeCompare(b.display_name);
      }),
    [samPersons],
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [convertSheetOpen, setConvertSheetOpen] = useState(false);
  const [convertQuotationId, setConvertQuotationId] = useState<string>('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');

  useEffect(() => {
    if (sheetOpen) {
      if (editing) {
        setForm({
          project_name: editing.project_name, project_code: editing.project_code,
          project_type: editing.project_type, status: editing.status,
          customer_id: editing.customer_id, customer_name: editing.customer_name,
          project_centre_id: editing.project_centre_id,
          source_quotation_id: editing.source_quotation_id, source_quotation_no: editing.source_quotation_no,
          source_so_id: editing.source_so_id, source_so_no: editing.source_so_no,
          reference_project_id: editing.reference_project_id,
          estimation_snapshot_id: editing.estimation_snapshot_id,
          is_export_project: editing.is_export_project,
          start_date: editing.start_date, target_end_date: editing.target_end_date,
          original_contract_value: editing.original_contract_value,
          current_contract_value: editing.current_contract_value,
          contract_value: editing.contract_value,
          project_manager_id: editing.project_manager_id,
          project_manager_name: editing.project_manager_name,
          description: editing.description, is_active: editing.is_active,
        });
      } else {
        setForm(BLANK);
      }
    }
  }, [sheetOpen, editing]);

  const activeCentres = useMemo(() => centres.filter(c => c.status === 'active'), [centres]);
  const convertibleQuotations = useMemo(
    () => quotations.filter(q => q.is_active && q.quotation_stage !== 'lost'),
    [quotations],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter(p => {
      if (!p.is_active) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      return p.project_no.toLowerCase().includes(q) ||
        p.project_name.toLowerCase().includes(q) ||
        p.project_code.toLowerCase().includes(q) ||
        (p.customer_name ?? '').toLowerCase().includes(q);
    });
  }, [projects, search, statusFilter]);

  const stats = useMemo(() => ({
    total: projects.filter(p => p.is_active).length,
    active: projects.filter(p => p.is_active && p.status === 'active').length,
    onHold: projects.filter(p => p.is_active && p.status === 'on_hold').length,
    completed: projects.filter(p => p.is_active && p.status === 'completed').length,
  }), [projects]);

  const startDateLocked = useMemo(
    () => form.start_date ? isPeriodLocked(form.start_date, entityCode) : false,
    [form.start_date, entityCode],
  );

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (p: Project) => { setEditing(p); setSheetOpen(true); };

  const handleSave = () => {
    if (!form.project_name.trim()) { toast.error('Project name is required'); return; }
    if (!form.project_centre_id) { toast.error('Project Centre is required'); return; }
    if (form.contract_value < 0) { toast.error('Contract value cannot be negative'); return; }

    const author = { id: 'system', name: 'System' }; // [JWT] Phase 2: replace with auth.userId/name
    if (editing) {
      // Status transitions go through their own pathway
      if (form.status !== editing.status) {
        const result = transitionStatus(editing.id, form.status, author, 'Status changed via Project Entry');
        if (!result.ok) { toast.error(result.reason); return; }
      }
      const { status: _drop, ...rest } = form;
      void _drop;
      updateProject(editing.id, rest);
      toast.success(`Updated ${editing.project_no}`);
    } else {
      const input: CreateProjectInput = {
        ...form,
        contract_value: form.contract_value,
        original_contract_value: form.original_contract_value || form.contract_value,
        current_contract_value: form.current_contract_value || form.contract_value,
      };
      const created = createProject(input, author);
      toast.success(`Created ${created.project_no} — ${created.project_name}`);
    }
    setSheetOpen(false);
    setEditing(null);
  };

  const handleConvertFromQuotation = () => {
    if (!convertQuotationId) { toast.error('Pick a quotation first'); return; }
    const q = quotations.find(x => x.id === convertQuotationId);
    if (!q) { toast.error('Quotation not found'); return; }
    if (activeCentres.length === 0) {
      toast.error('Create a Project Centre first (link in sidebar Masters)');
      return;
    }
    setEditing(null);
    setForm({
      ...BLANK,
      project_name: `Project — ${q.customer_name ?? q.quotation_no}`,
      project_code: q.quotation_no,
      project_type: 'product_implementation',
      customer_id: q.customer_id,
      customer_name: q.customer_name,
      project_centre_id: activeCentres[0].id, // sensible default · user can change
      source_quotation_id: q.id,
      source_quotation_no: q.quotation_no,
      source_so_id: q.so_id,
      source_so_no: q.so_no,
      contract_value: q.total_amount,
      original_contract_value: q.total_amount,
      current_contract_value: q.total_amount,
      description: `Converted from Quotation ${q.quotation_no}`,
    });
    setConvertSheetOpen(false);
    setSheetOpen(true);
    toast.info(`Pre-filled from ${q.quotation_no} · review and save`);
  };

  // After save, if this was a quotation conversion, log the event
  useEffect(() => {
    // Hook into projects array changes — log only the very latest project that has source_quotation_id
    // We use a marker stored in form to avoid re-logging.
    // Simpler approach: log inside handleSave on create when source_quotation_id present.
    // (Implemented inline below in the saved-create path via a side effect tracker)
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-6" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-indigo-500" />
            Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            ProjX transactions · live P&amp;L (D-216) · status workflow enforced
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => setConvertSheetOpen(true)}>
            <ArrowRightLeft className="h-4 w-4" /> Convert from Quotation
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total</CardDescription>
          <CardTitle className="text-2xl font-mono">{stats.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Active</CardDescription>
          <CardTitle className="text-2xl font-mono text-emerald-600">{stats.active}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>On Hold</CardDescription>
          <CardTitle className="text-2xl font-mono text-amber-600">{stats.onHold}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Completed</CardDescription>
          <CardTitle className="text-2xl font-mono text-blue-600">{stats.completed}</CardTitle></CardHeader></Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search project no, name, code, customer..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'all' | ProjectStatus)}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(s => (
              <SelectItem key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} projects</span>
      </div>

      {/* Table */}
      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
          {['Project No', 'Name', 'Customer', 'Type', 'Status', 'Contract', 'Billed', 'Margin %', ''].map(h => (
            <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
              <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold text-foreground mb-1">
                {projects.length === 0 ? 'No projects yet' : 'No matches'}
              </p>
              <p className="text-xs mb-4">
                {projects.length === 0
                  ? "Click 'New Project' or convert from a quotation."
                  : 'Try a different search or filter.'}
              </p>
              {projects.length === 0 && (
                <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Project</Button>
              )}
            </TableCell></TableRow>
          ) : filtered.map(p => {
            const pnl = computeProjectPnLStub(p);
            return (
              <TableRow key={p.id} className="group">
                <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{p.project_no}</code></TableCell>
                <TableCell className="font-medium text-sm max-w-[200px] truncate">{p.project_name}</TableCell>
                <TableCell className="text-xs">{p.customer_name ?? '—'}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{PROJECT_TYPE_LABELS[p.project_type]}</Badge></TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${PROJECT_STATUS_COLORS[p.status]}`}>
                    {PROJECT_STATUS_LABELS[p.status]}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-right">{fmtINR(p.contract_value)}</TableCell>
                <TableCell className="font-mono text-xs text-right">{fmtINR(pnl.revenue_billed)}</TableCell>
                <TableCell className={`font-mono text-xs text-right ${pnl.margin_pct >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {pnl.margin_pct}%
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(p)}>
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table></CardContent></Card>

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? `Edit ${editing.project_no}` : 'New Project'}</SheetTitle>
            <SheetDescription>
              {editing ? 'Update project details. Status changes go through workflow validation.' : 'PRJ/YY-YY/NNNN auto-generates on save.'}
            </SheetDescription>
          </SheetHeader>
          <div data-keyboard-form className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Project Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Acme Coal Conveyor" value={form.project_name}
                  onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Short Code</Label>
                <Input placeholder="e.g. ACME-CCS-01" value={form.project_code}
                  onChange={e => setForm(f => ({ ...f, project_code: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.project_type} onValueChange={v => setForm(f => ({ ...f, project_type: v as ProjectType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map(t => (
                      <SelectItem key={t} value={t}>{PROJECT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ProjectStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(s => (
                      <SelectItem key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Project Centre <span className="text-destructive">*</span></Label>
              <Select value={form.project_centre_id || 'none'}
                onValueChange={v => setForm(f => ({ ...f, project_centre_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Pick centre" /></SelectTrigger>
                <SelectContent>
                  {activeCentres.length === 0 ? (
                    <SelectItem value="none" disabled>No active Project Centres — create one in Command Center</SelectItem>
                  ) : activeCentres.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Customer Name</Label>
                <Input value={form.customer_name ?? ''}
                  onChange={e => setForm(f => ({ ...f, customer_name: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Project Manager</Label>
                <Select
                  value={form.project_manager_id ?? '__none__'}
                  onValueChange={v => {
                    if (v === '__none__') {
                      setForm(f => ({ ...f, project_manager_id: null, project_manager_name: null }));
                      return;
                    }
                    const picked = pmPickerOptions.find(p => p.id === v);
                    setForm(f => ({
                      ...f,
                      project_manager_id: v,
                      project_manager_name: picked?.display_name ?? null,
                    }));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select PM" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Unassigned —</SelectItem>
                    {pmPickerOptions.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          {p.person_type === 'project_manager' && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-500/30 bg-purple-500/10 text-purple-700">PM</Badge>
                          )}
                          {p.display_name} ({p.person_code})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date}
                  onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                {startDateLocked && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Start date falls in a locked period
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Target End Date</Label>
                <Input type="date" value={form.target_end_date}
                  onChange={e => setForm(f => ({ ...f, target_end_date: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contract Value (₹)</Label>
                <Input type="number" min="0" value={form.contract_value}
                  onChange={e => {
                    const v = Number(e.target.value || 0);
                    setForm(f => ({
                      ...f,
                      contract_value: v,
                      original_contract_value: f.original_contract_value || v,
                      current_contract_value: v,
                    }));
                  }} />
              </div>
              <div className="space-y-1.5">
                <Label>Source Quotation</Label>
                <Input value={form.source_quotation_no ?? ''} readOnly placeholder="—"
                  className="bg-muted/30" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} placeholder="Notes / scope summary..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <div>
                {editing && (
                  <Button variant="destructive" size="sm" className="gap-1.5"
                    onClick={() => { setDeletionReason(''); setDeleteOpen(true); }}>
                    <Trash2 className="h-4 w-4" /> Delete project
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
                <Button onClick={() => {
                  const wasConversion = !editing && form.source_quotation_id && form.source_quotation_no;
                  const sourceId = form.source_quotation_id;
                  const sourceNo = form.source_quotation_no;
                  handleSave();
                  // Log conversion AFTER save (only on new-from-quotation)
                  if (wasConversion && sourceId && sourceNo) {
                    setTimeout(() => {
                      try {
                        const raw = localStorage.getItem(`erp_projects_${entityCode}`);
                        const arr: Project[] = raw ? JSON.parse(raw) : [];
                        const justCreated = arr[arr.length - 1];
                        if (justCreated) {
                          logConversionEvent(
                            entityCode, 'system', 'quotation_to_project',
                            sourceId, sourceNo,
                            justCreated.id, justCreated.project_no,
                          );
                        }
                      } catch {
                        // best effort — never block UI
                      }
                    }, 0);
                  }
                }}>{editing ? 'Update' : 'Create'}</Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Convert from Quotation */}
      <Sheet open={convertSheetOpen} onOpenChange={setConvertSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Convert from Quotation</SheetTitle>
            <SheetDescription>Pick an active quotation. Items + customer + value will pre-fill.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Quotation</Label>
              <Select value={convertQuotationId} onValueChange={setConvertQuotationId}>
                <SelectTrigger><SelectValue placeholder="Pick quotation" /></SelectTrigger>
                <SelectContent>
                  {convertibleQuotations.length === 0 ? (
                    <SelectItem value="none" disabled>No convertible quotations</SelectItem>
                  ) : convertibleQuotations.map(q => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.quotation_no} — {q.customer_name ?? '—'} ({fmtINR(q.total_amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConvertSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleConvertFromQuotation}>Pre-fill</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This soft-deletes the project. The record is retained for audit but hidden from default views. Vouchers and time entries already tagged with this project's centre keep their linkage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Deletion reason <span className="text-destructive">*</span></Label>
            <Textarea rows={3} value={deletionReason}
              onChange={e => setDeletionReason(e.target.value)}
              placeholder="Why is this project being deleted?" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={!deletionReason.trim()}
              onClick={() => {
                if (!editing) return;
                const result = softDelete(editing.id, { id: 'system', name: 'System' }, deletionReason.trim());
                if (!result.ok) { toast.error(result.reason); return; }
                toast.success('Project soft-deleted. Audit trail preserved.');
                setDeleteOpen(false);
                setSheetOpen(false);
                setEditing(null);
              }}>Confirm Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
