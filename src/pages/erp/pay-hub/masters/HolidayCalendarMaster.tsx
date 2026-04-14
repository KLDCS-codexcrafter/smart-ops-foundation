/**
 * HolidayCalendarMaster.tsx — Sprint 19 Holiday Calendar
 * 3-tier hierarchy: National → Company → Branch
 * Nager.Date API integration · From/To date range · CSV export
 */
import { useState, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar, Plus, Search, Edit2, Trash2, Copy,
  ToggleLeft, ToggleRight, X, Download,
  Building2, Globe, GitBranch, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useHolidayCalendars } from '@/hooks/usePayHubMasters3';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { toast } from 'sonner';
import type { HolidayCalendar, Holiday, CalendarLevel } from '@/types/payroll-masters';
import { cn } from '@/lib/utils';

// ── Indian state codes for API mapping ───────────────────────────────
const INDIA_STATES: { code: string; name: string; nagerCode: string }[] = [
  { code: 'AN', name: 'Andaman & Nicobar', nagerCode: 'IN-AN' },
  { code: 'AP', name: 'Andhra Pradesh',    nagerCode: 'IN-AP' },
  { code: 'AR', name: 'Arunachal Pradesh', nagerCode: 'IN-AR' },
  { code: 'AS', name: 'Assam',             nagerCode: 'IN-AS' },
  { code: 'BR', name: 'Bihar',             nagerCode: 'IN-BR' },
  { code: 'CT', name: 'Chhattisgarh',      nagerCode: 'IN-CT' },
  { code: 'DL', name: 'Delhi',             nagerCode: 'IN-DL' },
  { code: 'GA', name: 'Goa',              nagerCode: 'IN-GA' },
  { code: 'GJ', name: 'Gujarat',           nagerCode: 'IN-GJ' },
  { code: 'HR', name: 'Haryana',           nagerCode: 'IN-HR' },
  { code: 'HP', name: 'Himachal Pradesh',  nagerCode: 'IN-HP' },
  { code: 'JH', name: 'Jharkhand',         nagerCode: 'IN-JH' },
  { code: 'JK', name: 'Jammu & Kashmir',   nagerCode: 'IN-JK' },
  { code: 'KA', name: 'Karnataka',         nagerCode: 'IN-KA' },
  { code: 'KL', name: 'Kerala',            nagerCode: 'IN-KL' },
  { code: 'MP', name: 'Madhya Pradesh',    nagerCode: 'IN-MP' },
  { code: 'MH', name: 'Maharashtra',       nagerCode: 'IN-MH' },
  { code: 'MN', name: 'Manipur',           nagerCode: 'IN-MN' },
  { code: 'ML', name: 'Meghalaya',         nagerCode: 'IN-ML' },
  { code: 'MZ', name: 'Mizoram',           nagerCode: 'IN-MZ' },
  { code: 'NL', name: 'Nagaland',          nagerCode: 'IN-NL' },
  { code: 'OR', name: 'Odisha',            nagerCode: 'IN-OD' },
  { code: 'PB', name: 'Punjab',            nagerCode: 'IN-PB' },
  { code: 'RJ', name: 'Rajasthan',         nagerCode: 'IN-RJ' },
  { code: 'SK', name: 'Sikkim',            nagerCode: 'IN-SK' },
  { code: 'TN', name: 'Tamil Nadu',        nagerCode: 'IN-TN' },
  { code: 'TS', name: 'Telangana',         nagerCode: 'IN-TS' },
  { code: 'TR', name: 'Tripura',           nagerCode: 'IN-TR' },
  { code: 'UP', name: 'Uttar Pradesh',     nagerCode: 'IN-UP' },
  { code: 'UT', name: 'Uttarakhand',       nagerCode: 'IN-UT' },
  { code: 'WB', name: 'West Bengal',       nagerCode: 'IN-WB' },
  { code: 'PY', name: 'Puducherry',        nagerCode: 'IN-PY' },
  { code: 'LD', name: 'Lakshadweep',       nagerCode: 'IN-LD' },
];

// ── Nager API response type ───────────────────────────────────────
interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  counties: string[] | null;
  types: string[];
}

// ── Nager API fetch function (pure, above component) ─────────────
async function fetchNagerHolidays(
  year: number,
  stateNagerCode: string
): Promise<Holiday[]> {
  const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/IN`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Nager API returned ${res.status}`);
  const data: NagerHoliday[] = await res.json();

  const filtered = stateNagerCode
    ? data.filter(h => h.global || (h.counties && h.counties.includes(stateNagerCode)))
    : data.filter(h => h.global);

  return filtered.map(h => ({
    id: `nager-${h.date}-${Math.random().toString(36).slice(2,6)}`,
    date: h.date,
    name: h.name,
    localName: h.localName,
    type: h.global ? 'national' as const : 'state' as const,
    stateCode: stateNagerCode ? stateNagerCode.replace('IN-', '') : '',
    stateName: stateNagerCode
      ? (INDIA_STATES.find(s => s.nagerCode === stateNagerCode)?.name ?? stateNagerCode)
      : 'All India',
    counties: h.counties ?? [],
    isOptional: h.types.includes('Optional'),
    isFixed: h.fixed,
    source: 'api' as const,
    description: '',
  }));
}

// ── Level icons & colors ─────────────────────────────────────────
const LEVEL_META: Record<CalendarLevel, { icon: typeof Globe; label: string; color: string }> = {
  national: { icon: Globe, label: 'National', color: 'text-blue-600' },
  company:  { icon: Building2, label: 'Company', color: 'text-violet-600' },
  branch:   { icon: GitBranch, label: 'Branch', color: 'text-emerald-600' },
};

const TYPE_COLORS: Record<string, string> = {
  national: 'bg-blue-100 text-blue-800',
  state: 'bg-amber-100 text-amber-800',
  company: 'bg-violet-100 text-violet-800',
  optional: 'bg-slate-100 text-slate-800',
  restricted: 'bg-red-100 text-red-800',
};

const SOURCE_COLORS: Record<string, string> = {
  api: 'bg-green-100 text-green-800',
  manual: 'bg-slate-100 text-slate-700',
  inherited: 'bg-violet-100 text-violet-800',
};

// ── Constants ────────────────────────────────────────────────────
const currentYear = new Date().getFullYear();
const BLANK_CAL: Omit<HolidayCalendar,'id'|'created_at'|'updated_at'> = {
  name: '', calendarLevel: 'national',
  parentCalendarId: '', entityId: '', entityType: 'parent_company',
  fromDate: `${currentYear}-04-01`,
  toDate: `${currentYear + 1}-03-31`,
  stateCode: '', stateName: '', location: '',
  description: '', holidays: [], inheritedHolidays: [], status: 'active',
};

// ── Holiday table component ──────────────────────────────────────
function HolidayTable({ holidays, showSource = false }: { holidays: Holiday[]; showSource?: boolean }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (!holidays.length) return <p className="text-xs text-muted-foreground py-4 text-center">No holidays</p>;
  return (
    <Table>
      <TableHeader><TableRow>
        <TableHead className="text-xs">Date</TableHead>
        <TableHead className="text-xs">Day</TableHead>
        <TableHead className="text-xs">Name</TableHead>
        <TableHead className="text-xs">Local Name</TableHead>
        <TableHead className="text-xs">Type</TableHead>
        <TableHead className="text-xs">State</TableHead>
        {showSource && <TableHead className="text-xs">Source</TableHead>}
        <TableHead className="text-xs">Optional</TableHead>
      </TableRow></TableHeader>
      <TableBody>
        {holidays.map(h => (
          <TableRow key={h.id} className={cn(h.date === today && 'border-l-2 border-l-amber-500')}>
            <TableCell className="text-xs font-mono">{h.date ? format(parseISO(h.date), 'dd MMM yyyy') : '—'}</TableCell>
            <TableCell className="text-xs">{h.date ? format(parseISO(h.date), 'EEE') : '—'}</TableCell>
            <TableCell className="text-xs font-medium">{h.name}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{h.localName || '—'}</TableCell>
            <TableCell><Badge className={cn('text-[10px]', TYPE_COLORS[h.type])} variant="secondary">{h.type}</Badge></TableCell>
            <TableCell className="text-xs">{h.stateCode || 'All'}</TableCell>
            {showSource && <TableCell><Badge className={cn('text-[10px]', SOURCE_COLORS[h.source])} variant="secondary">{h.source}</Badge></TableCell>}
            <TableCell className="text-xs">{h.isOptional ? 'Yes' : '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ══════════════════════════════════════════════════════════════════
export function HolidayCalendarMasterPanel() {
  const { calendars, create, update, remove, clone, toggleStatus } = useHolidayCalendars();
  const [search, setSearch]         = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [editId, setEditId]         = useState<string|null>(null);
  const [form, setForm]             = useState({ ...BLANK_CAL, holidays: [] as Holiday[] });
  const [apiLoading, setApiLoading] = useState(false);
  const [selectedCalId, setSelectedCalId] = useState<string|null>(null);
  const setF = <K extends keyof typeof form>(k:K, v:(typeof form)[K]) =>
    setForm(p => ({...p,[k]:v}));

  // Filtered list
  const filtered = useMemo(() => calendars.filter(c => {
    if (levelFilter !== 'all' && c.calendarLevel !== levelFilter) return false;
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q)
      || c.location.toLowerCase().includes(q)
      || c.stateCode.toLowerCase().includes(q);
  }), [calendars, search, levelFilter]);

  // Selected calendar + its resolved full holiday list
  const selectedCal = calendars.find(c => c.id === selectedCalId) ?? null;
  const allHolidaysForSelected = selectedCal
    ? [...selectedCal.inheritedHolidays, ...selectedCal.holidays]
      .sort((a,b) => a.date.localeCompare(b.date))
    : [];

  // Eligible parent calendars (for hierarchy select in Sheet)
  const parentOptions = useMemo(() => {
    if (form.calendarLevel === 'national') return [];
    if (form.calendarLevel === 'company') return calendars.filter(c => c.calendarLevel === 'national');
    return calendars.filter(c => c.calendarLevel === 'company');
  }, [form.calendarLevel, calendars]);

  const openNew = () => { setEditId(null); setForm({...BLANK_CAL, holidays:[]}); setSheetOpen(true); };
  const openEdit = (c: HolidayCalendar) => {
    setEditId(c.id);
    const { id, created_at, updated_at, ...rest } = c;
    setForm({ ...rest, holidays: [...rest.holidays] });
    setSheetOpen(true);
  };

  const handleSave = useCallback(() => {
    if (!sheetOpen) return;
    if (!form.name.trim()) return toast.error('Calendar name is required');
    if (!form.fromDate)    return toast.error('From date is required');
    if (!form.toDate)      return toast.error('To date is required');
    if (form.fromDate >= form.toDate) return toast.error('From date must be before To date');
    if (editId) {
      update(editId, form);
    } else {
      create(form);
    }
    setSheetOpen(false); setEditId(null); setForm({...BLANK_CAL, holidays:[]});
  }, [form, editId, sheetOpen, create, update]);

  useCtrlS(handleSave);

  // ── Nager API fetch ────────────────────────────────────────────
  const handleFetchFromAPI = async () => {
    if (!form.fromDate) { toast.error('Set From date first'); return; }
    const year = new Date(form.fromDate).getFullYear();
    const stateEntry = INDIA_STATES.find(s => s.code === form.stateCode);
    const nagerCode = stateEntry?.nagerCode ?? '';
    setApiLoading(true);
    try {
      const fetched = await fetchNagerHolidays(year, nagerCode);
      const existingDates = new Set(form.holidays.map(h => h.date));
      const newOnes = fetched.filter(h => !existingDates.has(h.date)
        && h.date >= form.fromDate && h.date <= form.toDate);
      setForm(p => ({...p, holidays: [...p.holidays, ...newOnes]}));
      toast.success(
        `${newOnes.length} holidays fetched from Nager.Date`
        + (stateEntry ? ` for ${stateEntry.name}` : ' (national)')
      );
    } catch {
      toast.error('Could not reach Nager.Date API. Check your internet connection.');
    } finally {
      setApiLoading(false);
    }
  };

  // ── Manual add / remove / update holiday in form ───────────────
  const addHoliday = () => {
    const blank: Holiday = {
      id: `hol-${Date.now()}`,
      date: form.fromDate || '', name: '', localName: '',
      type: 'company', stateCode: form.stateCode, stateName: form.stateName,
      counties: [], isOptional: false, isFixed: false, source: 'manual', description: '',
    };
    setForm(p => ({...p, holidays: [...p.holidays, blank]}));
  };
  const removeHoliday = (idx: number) =>
    setForm(p => ({...p, holidays: p.holidays.filter((_,i) => i !== idx)}));
  const updateHoliday = (idx: number, patch: Partial<Holiday>) =>
    setForm(p => ({...p, holidays: p.holidays.map((h,i) => i === idx ? {...h,...patch} : h)}));

  // ── CSV export ─────────────────────────────────────────────────
  const exportCSV = () => {
    if (!selectedCal) return;
    const header = 'Date,Day,Name,Local Name,Type,State,Source,Optional';
    const rows = allHolidaysForSelected.map(h =>
      `${h.date},${h.date ? format(parseISO(h.date),'EEE') : ''},${h.name},${h.localName || ''},${h.type},${h.stateCode || 'All'},${h.source},${h.isOptional ? 'Yes' : 'No'}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${selectedCal.name.replace(/\s+/g,'_')}_holidays.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Stats ──────────────────────────────────────────────────────
  const totalCalendars = calendars.length;
  const activeCalendars = calendars.filter(c => c.status === 'active').length;
  const totalHolidays = calendars.filter(c => c.status === 'active').reduce((s,c) => s + c.holidays.length + c.inheritedHolidays.length, 0);

  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6 text-violet-600"/>
          <div>
            <h2 className="text-xl font-bold">Holiday Calendar</h2>
            <p className="text-xs text-muted-foreground">Three-tier hierarchy: National → Company → Branch  ·  Powered by Nager.Date API</p>
          </div>
        </div>
        <Button onClick={openNew} size="sm" className="gap-1"><Plus className="h-4 w-4"/>New Calendar</Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Total Calendars</p>
          <p className="text-2xl font-bold">{totalCalendars}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Active Calendars</p>
          <p className="text-2xl font-bold text-green-600">{activeCalendars}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground">Total Holiday Days</p>
          <p className="text-2xl font-bold text-violet-600">{totalHolidays}</p>
        </CardContent></Card>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input className="pl-8 text-xs" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={onEnterNext}/>
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-40 text-xs"><SelectValue/></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="national">National</SelectItem>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="branch">Branch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── TWO-PANEL LAYOUT ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT PANEL — Calendar list */}
        <div className="space-y-2 lg:col-span-1 max-h-[70vh] overflow-y-auto pr-1">
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No calendars found. Create one to get started.</p>}
          {filtered.map(c => {
            const meta = LEVEL_META[c.calendarLevel];
            const LevelIcon = meta.icon;
            const isSelected = selectedCalId === c.id;
            return (
              <Card key={c.id}
                className={cn('cursor-pointer transition-colors', isSelected && 'border-violet-500 ring-1 ring-violet-300')}
                onClick={() => setSelectedCalId(c.id)}>
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={cn('text-[10px] gap-1', meta.color)}>
                      <LevelIcon className="h-3 w-3"/>{meta.label}
                    </Badge>
                    <Badge variant={c.status==='active'?'default':'secondary'} className="text-[10px]">{c.status}</Badge>
                  </div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.fromDate} → {c.toDate}</p>
                  {c.location && <p className="text-xs text-muted-foreground">{c.location}{c.stateCode ? ` · ${c.stateCode}` : ''}</p>}
                  <p className="text-xs">Own: {c.holidays.length} · Inherited: {c.inheritedHolidays.length}</p>
                  <div className="flex gap-1 pt-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e=>{e.stopPropagation();openEdit(c)}}><Edit2 className="h-3 w-3"/></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e=>{e.stopPropagation();clone(c.id)}}><Copy className="h-3 w-3"/></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e=>{e.stopPropagation();toggleStatus(c.id)}}>
                      {c.status==='active'?<ToggleRight className="h-3 w-3 text-green-600"/>:<ToggleLeft className="h-3 w-3 text-muted-foreground"/>}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e=>{e.stopPropagation();remove(c.id)}}><Trash2 className="h-3 w-3"/></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* RIGHT PANEL — Selected calendar detail */}
        <div className="lg:col-span-2">
          {!selectedCal ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40"/>
              <p>Select a calendar to view its holidays</p>
            </CardContent></Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {selectedCal.name}
                      <Badge variant="outline" className={cn('text-[10px]', LEVEL_META[selectedCal.calendarLevel].color)}>
                        {LEVEL_META[selectedCal.calendarLevel].label}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{selectedCal.fromDate} → {selectedCal.toDate}</p>
                    {selectedCal.parentCalendarId && (
                      <p className="text-xs text-muted-foreground">Parent: {calendars.find(c => c.id === selectedCal.parentCalendarId)?.name ?? '—'}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={exportCSV}>
                    <Download className="h-3.5 w-3.5"/>Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all-holidays">
                  <TabsList>
                    <TabsTrigger value="all-holidays" className="text-xs">All Holidays ({allHolidaysForSelected.length})</TabsTrigger>
                    <TabsTrigger value="own" className="text-xs">Own ({selectedCal.holidays.length})</TabsTrigger>
                    <TabsTrigger value="inherited" className="text-xs">Inherited ({selectedCal.inheritedHolidays.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all-holidays">
                    <HolidayTable holidays={allHolidaysForSelected} showSource />
                  </TabsContent>
                  <TabsContent value="own">
                    <HolidayTable holidays={[...selectedCal.holidays].sort((a,b) => a.date.localeCompare(b.date))} showSource />
                  </TabsContent>
                  <TabsContent value="inherited">
                    <HolidayTable holidays={[...selectedCal.inheritedHolidays].sort((a,b) => a.date.localeCompare(b.date))} showSource />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── SHEET ─────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editId?'Edit Calendar':'New Calendar'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            {/* Calendar Name */}
            <div><Label className="text-xs">Calendar Name *</Label>
              <Input className="text-xs mt-1" value={form.name} onChange={e=>setF('name',e.target.value)} onKeyDown={onEnterNext} placeholder="e.g. India National FY 2025-26"/>
            </div>

            {/* Level + Parent */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Level *</Label>
                <Select value={form.calendarLevel} onValueChange={v => { setF('calendarLevel', v as CalendarLevel); setF('parentCalendarId',''); }}>
                  <SelectTrigger className="text-xs mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="branch">Branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.calendarLevel !== 'national' && (
                <div><Label className="text-xs">Parent Calendar</Label>
                  <Select value={form.parentCalendarId} onValueChange={v => setF('parentCalendarId', v)}>
                    <SelectTrigger className="text-xs mt-1"><SelectValue placeholder="Select parent…"/></SelectTrigger>
                    <SelectContent>
                      {parentOptions.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name} ({p.fromDate}→{p.toDate})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* From / To dates */}
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">From Date *</Label>
                <SmartDateInput value={form.fromDate} onChange={v => setF('fromDate', v)} placeholder="DD/MM/YYYY"/>
              </div>
              <div><Label className="text-xs">To Date *</Label>
                <SmartDateInput value={form.toDate} onChange={v => setF('toDate', v)} placeholder="DD/MM/YYYY"/>
              </div>
            </div>

            {/* State */}
            <div><Label className="text-xs">State</Label>
              <Select value={form.stateCode || '_none'} onValueChange={v => {
                if (v === '_none') { setF('stateCode',''); setF('stateName',''); }
                else { const s = INDIA_STATES.find(x=>x.code===v); setF('stateCode', v); setF('stateName', s?.name ?? ''); }
              }}>
                <SelectTrigger className="text-xs mt-1"><SelectValue placeholder="All India"/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">All India</SelectItem>
                  {INDIA_STATES.map(s => <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Location + Description */}
            <div><Label className="text-xs">Location</Label>
              <Input className="text-xs mt-1" value={form.location} onChange={e=>setF('location',e.target.value)} onKeyDown={onEnterNext} placeholder="e.g. Head Office — Mumbai"/>
            </div>
            <div><Label className="text-xs">Description</Label>
              <Textarea className="text-xs mt-1" rows={2} value={form.description} onChange={e=>setF('description',e.target.value)}/>
            </div>

            {/* Fetch from API */}
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">Fetch from Nager.Date API</p>
                  <p className="text-[10px] text-muted-foreground">Fetches public holidays for India (filtered by state if set). Requires internet.</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1 text-xs border-amber-300"
                  onClick={handleFetchFromAPI} disabled={apiLoading}>
                  {apiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <RefreshCw className="h-3.5 w-3.5"/>}
                  {apiLoading ? 'Fetching…' : 'Fetch Holidays'}
                </Button>
              </div>
            </div>

            {/* Holidays sub-table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Holidays ({form.holidays.length})</Label>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={addHoliday}><Plus className="h-3 w-3 mr-1"/>Add Manually</Button>
              </div>
              {form.holidays.length > 0 && (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Source</TableHead>
                    <TableHead className="text-xs">Optional</TableHead>
                    <TableHead/>
                  </TableRow></TableHeader>
                  <TableBody>
                    {form.holidays.map((h, i) => (
                      <TableRow key={h.id}>
                        <TableCell className="p-1"><Input type="date" className="text-xs h-7" value={h.date} onChange={e=>updateHoliday(i,{date:e.target.value})}/></TableCell>
                        <TableCell className="p-1"><Input className="text-xs h-7" value={h.name} onChange={e=>updateHoliday(i,{name:e.target.value})} onKeyDown={onEnterNext}/></TableCell>
                        <TableCell className="p-1">
                          <Select value={h.type} onValueChange={v=>updateHoliday(i,{type:v as Holiday['type']})}>
                            <SelectTrigger className="text-xs h-7"><SelectValue/></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="national">National</SelectItem>
                              <SelectItem value="state">State</SelectItem>
                              <SelectItem value="company">Company</SelectItem>
                              <SelectItem value="optional">Optional</SelectItem>
                              <SelectItem value="restricted">Restricted</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-1"><Badge className={cn('text-[10px]', SOURCE_COLORS[h.source])} variant="secondary">{h.source}</Badge></TableCell>
                        <TableCell className="p-1"><Switch checked={h.isOptional} onCheckedChange={v=>updateHoliday(i,{isOptional:v})}/></TableCell>
                        <TableCell className="p-1"><Button variant="ghost" size="icon" className="h-6 w-6" onClick={()=>removeHoliday(i)}><X className="h-3 w-3"/></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleSave} data-primary>{editId?'Update':'Create'} Calendar</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function HolidayCalendarMaster() {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex-1">
        <ERPHeader breadcrumbs={[{label:'Operix Core',href:'/erp/dashboard'},{label:'Pay Hub'},{label:'Holiday Calendar'}]} showDatePicker={false} showCompany={false}/>
        <div className="p-6 max-w-7xl mx-auto"><HolidayCalendarMasterPanel/></div>
      </div>
    </SidebarProvider>
  );
}
