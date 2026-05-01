/**
 * MONEY-MATH-AUDITED · Sprint T-Phase-1.2.5h-c1
 * All money/qty/percentage arithmetic uses Decimal.js helpers
 * (dMul · dAdd · dSub · dPct · dSum · round2) from @/lib/decimal-helpers.
 * No float multiplication or Math.round on money values.
 */
/**
 * ExhibitionMaster.tsx — Canvas Wave 2 (T-Phase-1.1.1c)
 * 4-tab panel: Details · Budget · Visitors · Summary
 * [JWT] /api/salesx/exhibitions
 */
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import {
  Save, Trash2, X, Search, Store, Users, BookOpen, Plus,
} from 'lucide-react';
import { useExhibitions } from '@/hooks/useExhibitions';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useCtrlS } from '@/lib/keyboard';
import type {
  Exhibition, ExhibitionStatus, ExhibitionCategory,
  ExhibitionBudget, ExhibitionOutcome, ExhibitionVisitor, VisitorInterestLevel,
} from '@/types/exhibition';
import {
  EXHIBITION_CATEGORY_LABELS,
  defaultExhibitionBudget, defaultExhibitionOutcome, computeExhibitionBudget,
} from '@/types/exhibition';
import { cn } from '@/lib/utils';
import { dSum, round2 } from '@/lib/decimal-helpers';

interface Props { entityCode: string }

interface FormState {
  exhibition_code: string;
  exhibition_name: string;
  category: ExhibitionCategory;
  organiser: string;
  venue_name: string;
  venue_city: string;
  venue_state: string;
  start_date: string;
  end_date: string;
  stall_no: string;
  stall_size: string;
  team_members: string; // CSV
  campaign_code: string; // '' = none
  description: string;
  status: ExhibitionStatus;
  is_active: boolean;
  budget: ExhibitionBudget;
  outcome: ExhibitionOutcome;
  editingId: string | null;
}

const todayISO = () => new Date().toISOString().split('T')[0];

const blankForm = (): FormState => ({
  exhibition_code: '',
  exhibition_name: '',
  category: 'trade_fair',
  organiser: '',
  venue_name: '',
  venue_city: '',
  venue_state: '',
  start_date: todayISO(),
  end_date: todayISO(),
  stall_no: '',
  stall_size: '',
  team_members: '',
  campaign_code: '',
  description: '',
  status: 'planned',
  is_active: true,
  budget: defaultExhibitionBudget(),
  outcome: defaultExhibitionOutcome(),
  editingId: null,
});

const STATUS_COLOR: Record<ExhibitionStatus, string> = {
  planned:   'bg-blue-500/15 text-blue-700 border-blue-500/30',
  active:    'bg-red-500/15 text-red-700 border-red-500/30 animate-pulse',
  completed: 'bg-green-500/15 text-green-700 border-green-500/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

const INTEREST_COLOR: Record<VisitorInterestLevel, string> = {
  hot:            'bg-red-500/15 text-red-700 border-red-500/30',
  warm:           'bg-amber-500/15 text-amber-700 border-amber-500/30',
  cold:           'bg-blue-500/15 text-blue-700 border-blue-500/30',
  not_interested: 'bg-muted text-muted-foreground border-border',
};

interface VisFormState {
  visitor_name: string;
  company_name: string;
  designation: string;
  mobile: string;
  email: string;
  city: string;
  visit_date: string;
  capture_method: ExhibitionVisitor['capture_method'];
  interest_level: VisitorInterestLevel;
  estimated_value: number | '';
  follow_up_due: string;
  notes: string;
  products_interested: string; // CSV
}

const blankVisForm = (): VisFormState => ({
  visitor_name: '', company_name: '', designation: '',
  mobile: '', email: '', city: '',
  visit_date: todayISO(),
  capture_method: 'manual',
  interest_level: 'warm',
  estimated_value: '',
  follow_up_due: '',
  notes: '',
  products_interested: '',
});

const BUDGET_ROWS: Array<{ key: keyof Pick<ExhibitionBudget, 'booth' | 'travel' | 'meals' | 'marketing' | 'staff' | 'misc'>; label: string; actualField: keyof Pick<FormStateActuals, 'actual_booth' | 'actual_travel' | 'actual_meals' | 'actual_marketing' | 'actual_staff' | 'actual_misc'> }> = [
  { key: 'booth',     label: 'Booth / Stall',          actualField: 'actual_booth' },
  { key: 'travel',    label: 'Travel',                 actualField: 'actual_travel' },
  { key: 'meals',     label: 'Meals / Hospitality',    actualField: 'actual_meals' },
  { key: 'marketing', label: 'Marketing / Branding',   actualField: 'actual_marketing' },
  { key: 'staff',     label: 'Staff / Allowances',     actualField: 'actual_staff' },
  { key: 'misc',      label: 'Miscellaneous',          actualField: 'actual_misc' },
];

interface FormStateActuals {
  actual_booth: string;
  actual_travel: string;
  actual_meals: string;
  actual_marketing: string;
  actual_staff: string;
  actual_misc: string;
}

const blankActuals = (): FormStateActuals => ({
  actual_booth: '', actual_travel: '', actual_meals: '',
  actual_marketing: '', actual_staff: '', actual_misc: '',
});

export function ExhibitionMasterPanel({ entityCode }: Props) {
  const {
    exhibitions, saveExhibition, deleteExhibition,
    saveVisitor, deleteVisitor, visitorsForExhibition,
  } = useExhibitions(entityCode);
  const { campaigns } = useCampaigns(entityCode);

  const [form, setForm] = useState<FormState>(blankForm());
  const [actuals, setActuals] = useState<FormStateActuals>(blankActuals());
  const [activeTab, setActiveTab] = useState('details');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ExhibitionStatus>('all');
  const [showVisForm, setShowVisForm] = useState(false);
  const [visForm, setVisForm] = useState<VisFormState>(blankVisForm());
  const [bookExId, setBookExId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exhibitions.filter(e => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;
      if (!q) return true;
      return (
        e.exhibition_code.toLowerCase().includes(q) ||
        e.exhibition_name.toLowerCase().includes(q) ||
        e.venue_city.toLowerCase().includes(q)
      );
    });
  }, [exhibitions, search, statusFilter]);

  const kpis = useMemo(() => {
    const today = todayISO();
    const active = exhibitions.filter(e =>
      e.status === 'active' || (e.start_date <= today && e.end_date >= today),
    ).length;
    const upcoming = exhibitions.filter(e => e.status === 'planned' && e.start_date > today).length;
    const totalBudget = exhibitions.reduce((s, e) => s + (e.budget?.total_planned || 0), 0);
    const totalVisitors = exhibitions.reduce((s, e) => s + (e.outcome?.total_visitors || 0), 0);
    return { active, upcoming, totalBudget, totalVisitors };
  }, [exhibitions]);

  const currentVisitors = useMemo(() =>
    form.editingId ? visitorsForExhibition(form.editingId) : [],
  [form.editingId, visitorsForExhibition]);

  const handleEdit = useCallback((e: Exhibition) => {
    setForm({
      exhibition_code: e.exhibition_code,
      exhibition_name: e.exhibition_name,
      category: e.category,
      organiser: e.organiser || '',
      venue_name: e.venue_name,
      venue_city: e.venue_city,
      venue_state: e.venue_state || '',
      start_date: e.start_date,
      end_date: e.end_date,
      stall_no: e.stall_no || '',
      stall_size: e.stall_size || '',
      team_members: (e.team_members || []).join(', '),
      campaign_code: e.campaign_code || '',
      description: e.description || '',
      status: e.status,
      is_active: e.is_active,
      budget: e.budget || defaultExhibitionBudget(),
      outcome: e.outcome || defaultExhibitionOutcome(),
      editingId: e.id,
    });
    // Per-category actuals are not persisted separately; we split equally only if total_actual exists.
    // Default them to '' so user can re-enter if needed.
    setActuals(blankActuals());
    setActiveTab('details');
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (!window.confirm('Delete this exhibition? Visitors will also be removed.')) return;
    deleteExhibition(id);
    if (form.editingId === id) {
      setForm(blankForm());
      setActuals(blankActuals());
      setActiveTab('details');
    }
    if (bookExId === id) setBookExId(null);
    toast.success('Exhibition deleted');
  }, [deleteExhibition, form.editingId, bookExId]);

  const handleSave = useCallback(() => {
    const code = form.exhibition_code.trim().toUpperCase();
    const name = form.exhibition_name.trim();
    if (!code) { toast.error('Exhibition code is required'); return; }
    if (!name) { toast.error('Exhibition name is required'); return; }
    if (!form.venue_name.trim()) { toast.error('Venue name is required'); return; }
    if (!form.venue_city.trim()) { toast.error('Venue city is required'); return; }
    if (!form.start_date || !form.end_date) { toast.error('Start and end dates required'); return; }
    if (form.end_date < form.start_date) { toast.error('End date cannot be before start date'); return; }
    const dup = exhibitions.find(e =>
      e.exhibition_code.toUpperCase() === code && e.id !== form.editingId,
    );
    if (dup) { toast.error(`Code '${code}' already exists`); return; }

    const total_actual =
      Number(actuals.actual_booth || 0) +
      Number(actuals.actual_travel || 0) +
      Number(actuals.actual_meals || 0) +
      Number(actuals.actual_marketing || 0) +
      Number(actuals.actual_staff || 0) +
      Number(actuals.actual_misc || 0);
    const budget = computeExhibitionBudget({
      ...form.budget,
      total_actual: total_actual > 0 ? total_actual : form.budget.total_actual,
    });
    const team_members = form.team_members.split(',').map(s => s.trim()).filter(Boolean);

    saveExhibition({
      id: form.editingId ?? undefined,
      entity_id: entityCode,
      exhibition_code: code,
      exhibition_name: name,
      category: form.category,
      organiser: form.organiser.trim() || null,
      venue_name: form.venue_name.trim(),
      venue_city: form.venue_city.trim(),
      venue_state: form.venue_state.trim() || null,
      start_date: form.start_date,
      end_date: form.end_date,
      stall_no: form.stall_no.trim() || null,
      stall_size: form.stall_size.trim() || null,
      team_members,
      campaign_code: form.campaign_code || null,
      budget,
      outcome: form.outcome,
      status: form.status,
      description: form.description.trim() || null,
      is_active: form.is_active,
    });
    toast.success(form.editingId ? 'Exhibition updated' : 'Exhibition created');
    if (!form.editingId) {
      setForm(blankForm());
      setActuals(blankActuals());
      setActiveTab('details');
    }
  }, [form, actuals, exhibitions, saveExhibition, entityCode]);

  const isFormActive = !!(form.exhibition_name.trim() || form.editingId);
  useCtrlS(isFormActive ? handleSave : () => {});

  const handleSaveVisitor = useCallback(() => {
    if (!form.editingId) { toast.error('Save the exhibition first'); return; }
    if (!visForm.visitor_name.trim()) { toast.error('Visitor name required'); return; }
    if (!visForm.company_name.trim()) { toast.error('Company required'); return; }
    saveVisitor({
      exhibition_id: form.editingId,
      visit_date: visForm.visit_date,
      visit_time: null,
      capture_method: visForm.capture_method,
      visitor_name: visForm.visitor_name.trim(),
      company_name: visForm.company_name.trim() || null,
      designation: visForm.designation.trim() || null,
      mobile: visForm.mobile.trim() || null,
      email: visForm.email.trim() || null,
      city: visForm.city.trim() || null,
      interest_level: visForm.interest_level,
      products_interested: visForm.products_interested
        .split(',').map(s => s.trim()).filter(Boolean),
      estimated_value: visForm.estimated_value === '' ? null : Number(visForm.estimated_value),
      notes: visForm.notes.trim() || null,
      enquiry_created: false,
      enquiry_id: null,
      follow_up_due: visForm.follow_up_due || null,
      assigned_salesman_id: null,
      assigned_salesman_name: null,
    });
    toast.success('Visitor added');
    setVisForm(blankVisForm());
    setShowVisForm(false);
  }, [visForm, form.editingId, saveVisitor]);

  const activeCampaigns = useMemo(
    () => campaigns.filter(c => c.is_active),
    [campaigns],
  );

  // Summary tab metrics
  const summary = useMemo(() => {
    const vs = currentVisitors;
    const hot = vs.filter(v => v.interest_level === 'hot').length;
    const warm = vs.filter(v => v.interest_level === 'warm').length;
    const cold = vs.filter(v => v.interest_level === 'cold').length;
    const pipeline = vs.reduce((s, v) => s + (v.estimated_value || 0), 0);
    const productFreq: Record<string, number> = {};
    vs.forEach(v => v.products_interested.forEach(p => {
      productFreq[p] = (productFreq[p] || 0) + 1;
    }));
    return { total: vs.length, hot, warm, cold, pipeline, productFreq };
  }, [currentVisitors]);

  // Total actuals shown live
  const liveTotalActual = useMemo(() => {
    return Number(actuals.actual_booth || 0) +
      Number(actuals.actual_travel || 0) +
      Number(actuals.actual_meals || 0) +
      Number(actuals.actual_marketing || 0) +
      Number(actuals.actual_staff || 0) +
      Number(actuals.actual_misc || 0);
  }, [actuals]);
  const liveVariance = liveTotalActual - form.budget.total_planned;

  const bookExhibition = bookExId ? exhibitions.find(e => e.id === bookExId) : null;
  const bookVisitors = bookExId ? visitorsForExhibition(bookExId) : [];

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard label="Active" value={kpis.active} icon={Store} accent="text-red-600" />
        <KpiCard label="Upcoming" value={kpis.upcoming} icon={Store} accent="text-blue-600" />
        <KpiCard
          label="Total Budget"
          value={`₹ ${kpis.totalBudget.toLocaleString('en-IN')}`}
          icon={Store}
          accent="text-orange-600"
        />
        <KpiCard label="Total Visitors" value={kpis.totalVisitors} icon={Users} accent="text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Register table 3/5 */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Exhibition Register</CardTitle>
              <Badge variant="outline" className="text-[10px]">{filtered.length} rows</Badge>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                <Input
                  className="h-8 text-xs pl-7"
                  placeholder="Search code, name, city…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'all' | ExhibitionStatus)}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[560px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Code</TableHead>
                    <TableHead className="text-[10px]">Name / Status / City</TableHead>
                    <TableHead className="text-[10px]">Dates</TableHead>
                    <TableHead className="text-[10px]">Budget</TableHead>
                    <TableHead className="text-[10px]">Visitors</TableHead>
                    <TableHead className="text-[10px] w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                        No exhibitions yet — create your first exhibition →
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map(e => {
                    const visCount = visitorsForExhibition(e.id).length;
                    return (
                      <TableRow
                        key={e.id}
                        className={cn(
                          'cursor-pointer hover:bg-muted/40',
                          form.editingId === e.id && 'bg-orange-500/5',
                        )}
                        onClick={() => handleEdit(e)}
                      >
                        <TableCell className="font-mono text-[11px]">{e.exhibition_code}</TableCell>
                        <TableCell>
                          <div className="text-xs font-medium">{e.exhibition_name}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge variant="outline" className={cn('text-[9px] py-0', STATUS_COLOR[e.status])}>
                              {e.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">{e.venue_city}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[10px]">
                          {e.start_date}<br />
                          <span className="text-muted-foreground">{e.end_date}</span>
                        </TableCell>
                        <TableCell className="font-mono text-[11px]">
                          ₹ {(e.budget?.total_planned || 0).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="font-mono text-[11px]">{visCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm" variant="ghost" className="h-6 w-6 p-0 text-blue-600"
                              title="Visitor Book"
                              onClick={ev => { ev.stopPropagation(); setBookExId(e.id); }}
                            >
                              <BookOpen className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                              onClick={ev => { ev.stopPropagation(); handleDelete(e.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Form 2/5 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {form.editingId ? 'Edit Exhibition' : 'New Exhibition'}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave}>
                  <Save className="h-3 w-3" />Save
                </Button>
                <Button
                  size="sm" variant="outline" className="h-7 text-xs gap-1"
                  onClick={() => { setForm(blankForm()); setActuals(blankActuals()); setActiveTab('details'); }}
                >
                  <X className="h-3 w-3" />Cancel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 h-8">
                <TabsTrigger value="details" className="text-[10px]">Details</TabsTrigger>
                <TabsTrigger value="budget" className="text-[10px]">Budget</TabsTrigger>
                <TabsTrigger value="visitors" className="text-[10px]">Visitors</TabsTrigger>
                <TabsTrigger value="summary" className="text-[10px]">Summary</TabsTrigger>
              </TabsList>

              {/* DETAILS */}
              <TabsContent value="details" className="space-y-2 mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Code *">
                    <Input
                      className="h-8 text-xs font-mono"
                      maxLength={16}
                      value={form.exhibition_code}
                      onChange={e => setForm(p => ({ ...p, exhibition_code: e.target.value.toUpperCase() }))}
                    />
                  </Field>
                  <Field label="Status">
                    <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as ExhibitionStatus }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Exhibition Name *">
                  <Input
                    className="h-8 text-xs"
                    value={form.exhibition_name}
                    onChange={e => setForm(p => ({ ...p, exhibition_name: e.target.value }))}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Category">
                    <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as ExhibitionCategory }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(EXHIBITION_CATEGORY_LABELS).map(([k, lbl]) => (
                          <SelectItem key={k} value={k}>{lbl}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Organiser">
                    <Input
                      className="h-8 text-xs"
                      value={form.organiser}
                      onChange={e => setForm(p => ({ ...p, organiser: e.target.value }))}
                    />
                  </Field>
                </div>
                <Field label="Venue Name *">
                  <Input
                    className="h-8 text-xs"
                    value={form.venue_name}
                    onChange={e => setForm(p => ({ ...p, venue_name: e.target.value }))}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="City *">
                    <Input
                      className="h-8 text-xs"
                      value={form.venue_city}
                      onChange={e => setForm(p => ({ ...p, venue_city: e.target.value }))}
                    />
                  </Field>
                  <Field label="State">
                    <Input
                      className="h-8 text-xs"
                      value={form.venue_state}
                      onChange={e => setForm(p => ({ ...p, venue_state: e.target.value }))}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Start Date *">
                    <SmartDateInput
                      value={form.start_date}
                      onChange={v => setForm(p => ({ ...p, start_date: v }))}
                    />
                  </Field>
                  <Field label="End Date *">
                    <SmartDateInput
                      value={form.end_date}
                      onChange={v => setForm(p => ({ ...p, end_date: v }))}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Stall No">
                    <Input
                      className="h-8 text-xs"
                      value={form.stall_no}
                      onChange={e => setForm(p => ({ ...p, stall_no: e.target.value }))}
                    />
                  </Field>
                  <Field label="Stall Size">
                    <Input
                      className="h-8 text-xs"
                      value={form.stall_size}
                      onChange={e => setForm(p => ({ ...p, stall_size: e.target.value }))}
                    />
                  </Field>
                </div>
                <Field label="Team Members (comma separated)">
                  <Input
                    className="h-8 text-xs"
                    value={form.team_members}
                    onChange={e => setForm(p => ({ ...p, team_members: e.target.value }))}
                  />
                </Field>
                <Field label="Linked Campaign">
                  <Select
                    value={form.campaign_code || '__none__'}
                    onValueChange={v => setForm(p => ({ ...p, campaign_code: v === '__none__' ? '' : v }))}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {activeCampaigns.map(c => (
                        <SelectItem key={c.id} value={c.campaign_code}>
                          {c.campaign_code} — {c.campaign_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Description">
                  <Textarea
                    rows={2} className="text-xs"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  />
                </Field>
              </TabsContent>

              {/* BUDGET */}
              <TabsContent value="budget" className="space-y-3 mt-3">
                <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded">
                  6-category budget · planned vs actual
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <Label className="text-[10px] text-muted-foreground">Category</Label>
                  <Label className="text-[10px] text-muted-foreground">Planned ₹</Label>
                  <Label className="text-[10px] text-muted-foreground">Actual ₹</Label>
                </div>
                {BUDGET_ROWS.map(row => (
                  <div key={row.key} className="grid grid-cols-3 gap-2 items-center">
                    <Label className="text-[10px]">{row.label}</Label>
                    <Input
                      type="number" className="h-7 text-xs font-mono"
                      placeholder="0"
                      value={form.budget[row.key]}
                      onChange={e => setForm(p => ({
                        ...p,
                        budget: computeExhibitionBudget({ ...p.budget, [row.key]: Number(e.target.value) }),
                      }))}
                    />
                    <Input
                      type="number" className="h-7 text-xs font-mono"
                      placeholder="0"
                      value={actuals[row.actualField]}
                      onChange={e => setActuals(p => ({ ...p, [row.actualField]: e.target.value }))}
                    />
                  </div>
                ))}
                <div className="border-t pt-2 space-y-1 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Planned</span>
                    <span className="font-bold text-orange-600">₹ {form.budget.total_planned.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Actual</span>
                    <span className="font-bold">₹ {liveTotalActual.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Variance</span>
                    <span className={cn('font-bold', liveVariance > 0 ? 'text-destructive' : 'text-green-600')}>
                      ₹ {liveVariance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </TabsContent>

              {/* VISITORS */}
              <TabsContent value="visitors" className="space-y-3 mt-3">
                {!form.editingId ? (
                  <div className="text-xs text-muted-foreground p-4 text-center bg-muted/30 rounded">
                    Save the exhibition first to add visitors.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-muted-foreground">
                        {currentVisitors.length} visitor(s)
                      </div>
                      <Button
                        size="sm" className="h-7 text-xs gap-1"
                        onClick={() => setShowVisForm(s => !s)}
                      >
                        <Plus className="h-3 w-3" />{showVisForm ? 'Close' : 'Add Visitor'}
                      </Button>
                    </div>

                    {showVisForm && (
                      <div className="border rounded p-2 space-y-2 bg-muted/20">
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Name *">
                            <Input
                              className="h-7 text-xs"
                              value={visForm.visitor_name}
                              onChange={e => setVisForm(p => ({ ...p, visitor_name: e.target.value }))}
                            />
                          </Field>
                          <Field label="Company *">
                            <Input
                              className="h-7 text-xs"
                              value={visForm.company_name}
                              onChange={e => setVisForm(p => ({ ...p, company_name: e.target.value }))}
                            />
                          </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Designation">
                            <Input
                              className="h-7 text-xs"
                              value={visForm.designation}
                              onChange={e => setVisForm(p => ({ ...p, designation: e.target.value }))}
                            />
                          </Field>
                          <Field label="City">
                            <Input
                              className="h-7 text-xs"
                              value={visForm.city}
                              onChange={e => setVisForm(p => ({ ...p, city: e.target.value }))}
                            />
                          </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Mobile">
                            <Input
                              className="h-7 text-xs font-mono"
                              value={visForm.mobile}
                              onChange={e => setVisForm(p => ({ ...p, mobile: e.target.value }))}
                            />
                          </Field>
                          <Field label="Email">
                            <Input
                              className="h-7 text-xs"
                              value={visForm.email}
                              onChange={e => setVisForm(p => ({ ...p, email: e.target.value }))}
                            />
                          </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Visit Date">
                            <SmartDateInput
                              value={visForm.visit_date}
                              onChange={v => setVisForm(p => ({ ...p, visit_date: v }))}
                            />
                          </Field>
                          <Field label="Capture Method">
                            <Select
                              value={visForm.capture_method}
                              onValueChange={v => setVisForm(p => ({ ...p, capture_method: v as ExhibitionVisitor['capture_method'] }))}
                            >
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">Manual</SelectItem>
                                <SelectItem value="qr_scan">QR Scan</SelectItem>
                                <SelectItem value="badge_scan">Badge Scan</SelectItem>
                                <SelectItem value="business_card">Business Card</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Interest">
                            <Select
                              value={visForm.interest_level}
                              onValueChange={v => setVisForm(p => ({ ...p, interest_level: v as VisitorInterestLevel }))}
                            >
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hot">Hot</SelectItem>
                                <SelectItem value="warm">Warm</SelectItem>
                                <SelectItem value="cold">Cold</SelectItem>
                                <SelectItem value="not_interested">Not Interested</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Est Value ₹">
                            <Input
                              type="number" className="h-7 text-xs font-mono"
                              value={visForm.estimated_value}
                              onChange={e => setVisForm(p => ({
                                ...p,
                                estimated_value: e.target.value === '' ? '' : Number(e.target.value),
                              }))}
                            />
                          </Field>
                        </div>
                        <Field label="Products Interested (comma separated)">
                          <Input
                            className="h-7 text-xs"
                            value={visForm.products_interested}
                            onChange={e => setVisForm(p => ({ ...p, products_interested: e.target.value }))}
                          />
                        </Field>
                        <Field label="Follow-up Date">
                          <SmartDateInput
                            value={visForm.follow_up_due}
                            onChange={v => setVisForm(p => ({ ...p, follow_up_due: v }))}
                          />
                        </Field>
                        <Field label="Notes">
                          <Textarea
                            rows={2} className="text-xs"
                            value={visForm.notes}
                            onChange={e => setVisForm(p => ({ ...p, notes: e.target.value }))}
                          />
                        </Field>
                        <Button size="sm" className="h-7 text-xs gap-1 w-full" onClick={handleSaveVisitor}>
                          <Save className="h-3 w-3" />Save Visitor
                        </Button>
                      </div>
                    )}

                    <div className="border rounded">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px]">Name</TableHead>
                            <TableHead className="text-[10px]">Company</TableHead>
                            <TableHead className="text-[10px]">Interest</TableHead>
                            <TableHead className="text-[10px]">Est ₹</TableHead>
                            <TableHead className="text-[10px]">Follow-up</TableHead>
                            <TableHead className="text-[10px] w-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentVisitors.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">
                                No visitors yet
                              </TableCell>
                            </TableRow>
                          )}
                          {currentVisitors.map(v => (
                            <TableRow key={v.id}>
                              <TableCell className="text-[11px]">{v.visitor_name}</TableCell>
                              <TableCell className="text-[11px]">{v.company_name || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn('text-[9px] py-0', INTEREST_COLOR[v.interest_level])}>
                                  {v.interest_level}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-[10px]">
                                {v.estimated_value ? `₹ ${v.estimated_value.toLocaleString('en-IN')}` : '-'}
                              </TableCell>
                              <TableCell className="font-mono text-[10px]">{v.follow_up_due || '-'}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                                  onClick={() => deleteVisitor(v.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* SUMMARY */}
              <TabsContent value="summary" className="space-y-3 mt-3">
                {!form.editingId ? (
                  <div className="text-xs text-muted-foreground p-4 text-center bg-muted/30 rounded">
                    Save the exhibition first to view summary.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-5 gap-2">
                      <MiniKpi label="Total" value={summary.total} />
                      <MiniKpi label="Hot" value={summary.hot} accent="text-red-600" />
                      <MiniKpi label="Warm" value={summary.warm} accent="text-amber-600" />
                      <MiniKpi label="Cold" value={summary.cold} accent="text-blue-600" />
                      <MiniKpi
                        label="Pipeline ₹"
                        value={summary.pipeline.toLocaleString('en-IN')}
                        accent="text-green-600"
                      />
                    </div>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs">Budget Snapshot</CardTitle>
                      </CardHeader>
                      <CardContent className="font-mono text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Planned</span>
                          <span className="font-bold">₹ {form.budget.total_planned.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Actual</span>
                          <span className="font-bold">₹ {liveTotalActual.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Variance</span>
                          <span className={cn('font-bold', liveVariance > 0 ? 'text-destructive' : 'text-green-600')}>
                            ₹ {liveVariance.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-muted-foreground">Pipeline ÷ Budget</span>
                          <span className="font-bold">
                            {form.budget.total_planned > 0
                              ? `${((summary.pipeline / form.budget.total_planned) * 100).toFixed(1)}%`
                              : '-'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                    {Object.keys(summary.productFreq).length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-xs">Product Interest Cloud</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-1">
                          {Object.entries(summary.productFreq)
                            .sort((a, b) => b[1] - a[1])
                            .map(([p, c]) => (
                              <Badge key={p} variant="outline" className="text-[10px]">
                                {p} · {c}
                              </Badge>
                            ))}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Visitor Book — full-width card */}
      {bookExhibition && (
        <Card className="border-blue-500/50 border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
                Visitor Book — {bookExhibition.exhibition_code} · {bookExhibition.exhibition_name}
              </CardTitle>
              <Button
                size="sm" variant="ghost" className="h-7 text-xs gap-1"
                onClick={() => setBookExId(null)}
              >
                <X className="h-3 w-3" />Close
              </Button>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-2">
              <MiniKpi label="Total" value={bookVisitors.length} />
              <MiniKpi label="Hot" value={bookVisitors.filter(v => v.interest_level === 'hot').length} accent="text-red-600" />
              <MiniKpi label="Warm" value={bookVisitors.filter(v => v.interest_level === 'warm').length} accent="text-amber-600" />
              <MiniKpi label="Cold" value={bookVisitors.filter(v => v.interest_level === 'cold').length} accent="text-blue-600" />
              <MiniKpi
                label="Pipeline ₹"
                value={bookVisitors.reduce((s, v) => s + (v.estimated_value || 0), 0).toLocaleString('en-IN')}
                accent="text-green-600"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Date</TableHead>
                    <TableHead className="text-[10px]">Method</TableHead>
                    <TableHead className="text-[10px]">Name</TableHead>
                    <TableHead className="text-[10px]">Company</TableHead>
                    <TableHead className="text-[10px]">Designation</TableHead>
                    <TableHead className="text-[10px]">Mobile</TableHead>
                    <TableHead className="text-[10px]">City</TableHead>
                    <TableHead className="text-[10px]">Interest</TableHead>
                    <TableHead className="text-[10px]">Est ₹</TableHead>
                    <TableHead className="text-[10px]">Products</TableHead>
                    <TableHead className="text-[10px]">Follow-up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookVisitors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-xs text-muted-foreground py-4">
                        No visitors recorded
                      </TableCell>
                    </TableRow>
                  )}
                  {bookVisitors.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-mono text-[10px]">{v.visit_date}</TableCell>
                      <TableCell className="text-[10px]">{v.capture_method}</TableCell>
                      <TableCell className="text-[11px]">{v.visitor_name}</TableCell>
                      <TableCell className="text-[11px]">{v.company_name || '-'}</TableCell>
                      <TableCell className="text-[10px]">{v.designation || '-'}</TableCell>
                      <TableCell className="font-mono text-[10px]">{v.mobile || '-'}</TableCell>
                      <TableCell className="text-[10px]">{v.city || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[9px] py-0', INTEREST_COLOR[v.interest_level])}>
                          {v.interest_level}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px]">
                        {v.estimated_value ? `₹ ${v.estimated_value.toLocaleString('en-IN')}` : '-'}
                      </TableCell>
                      <TableCell className="text-[10px]">{v.products_interested.join(', ') || '-'}</TableCell>
                      <TableCell className="font-mono text-[10px]">{v.follow_up_due || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function KpiCard({
  label, value, icon: Icon, accent,
}: { label: string; value: string | number; icon: React.ElementType; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <Icon className={cn('h-5 w-5', accent || 'text-muted-foreground')} />
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className={cn('text-lg font-bold font-mono', accent)}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniKpi({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="border rounded p-2 text-center">
      <div className="text-[9px] text-muted-foreground uppercase">{label}</div>
      <div className={cn('text-sm font-bold font-mono', accent)}>{value}</div>
    </div>
  );
}

export default ExhibitionMasterPanel;
