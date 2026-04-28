/**
 * WebinarMaster.tsx — Canvas Wave 3 (T-Phase-1.1.1d)
 * 4-tab form: Details · Budget · Participants · Summary
 * [JWT] /api/salesx/webinars
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
  Plus, Save, Trash2, X, Search, Video, ExternalLink, Calendar, Users,
} from 'lucide-react';
import { useWebinars } from '@/hooks/useWebinars';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useCtrlS } from '@/lib/keyboard';
import type {
  Webinar, WebinarStatus, WebinarCategory, WebinarPlatform,
  WebinarBudget, WebinarOutcome, WebinarParticipant, ParticipantStatus,
} from '@/types/webinar';
import {
  WEBINAR_CATEGORY_LABELS, WEBINAR_PLATFORM_LABELS,
  defaultWebinarBudget, defaultWebinarOutcome,
  computeWebinarBudget, computeWebinarMetrics,
} from '@/types/webinar';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

interface FormState {
  webinar_code: string;
  webinar_title: string;
  category: WebinarCategory;
  platform: WebinarPlatform;
  platform_url: string;
  platform_meeting_id: string;
  platform_passcode: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_mins: number;
  host_name: string;
  speakers: string;          // CSV input
  topic_summary: string;
  target_audience: string;
  max_registrations: number | '';
  registration_link: string;
  recording_url: string;
  campaign_code: string;     // empty string === none
  status: WebinarStatus;
  is_active: boolean;
  budget: WebinarBudget;
  outcome: WebinarOutcome;
  actual_platform_cost: string;
  actual_speaker_fee: string;
  actual_promotion: string;
  actual_production: string;
  actual_misc: string;
  editingId: string | null;
}

const todayISO = () => new Date().toISOString().split('T')[0];

const blankForm = (): FormState => ({
  webinar_code: '',
  webinar_title: '',
  category: 'product_demo',
  platform: 'zoom',
  platform_url: '',
  platform_meeting_id: '',
  platform_passcode: '',
  scheduled_date: todayISO(),
  scheduled_time: '11:00',
  duration_mins: 60,
  host_name: '',
  speakers: '',
  topic_summary: '',
  target_audience: '',
  max_registrations: '',
  registration_link: '',
  recording_url: '',
  campaign_code: '',
  status: 'draft',
  is_active: true,
  budget: defaultWebinarBudget(),
  outcome: defaultWebinarOutcome(),
  actual_platform_cost: '',
  actual_speaker_fee: '',
  actual_promotion: '',
  actual_production: '',
  actual_misc: '',
  editingId: null,
});

const STATUS_COLOR: Record<WebinarStatus, string> = {
  draft:     'bg-muted text-muted-foreground border-border',
  scheduled: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  live:      'bg-red-500/15 text-red-700 border-red-500/30 animate-pulse',
  completed: 'bg-green-500/15 text-green-700 border-green-500/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

const PARTICIPANT_STATUS_COLOR: Record<ParticipantStatus, string> = {
  registered: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  attended:   'bg-green-500/15 text-green-700 border-green-500/30',
  no_show:    'bg-muted text-muted-foreground border-border',
  cancelled:  'bg-destructive/15 text-destructive border-destructive/30',
};

const INTEREST_COLOR: Record<WebinarParticipant['interest_level'], string> = {
  hot:             'bg-red-500/15 text-red-700 border-red-500/30',
  warm:            'bg-amber-500/15 text-amber-700 border-amber-500/30',
  cold:            'bg-blue-500/15 text-blue-700 border-blue-500/30',
  not_interested:  'bg-muted text-muted-foreground border-border',
};

interface PartFormState {
  name: string;
  company: string;
  designation: string;
  email: string;
  mobile: string;
  city: string;
  registration_date: string;
  status: ParticipantStatus;
  interest_level: WebinarParticipant['interest_level'];
  attended_duration_mins: number | '';
  questions_asked: string;
  follow_up_due: string;
  notes: string;
}

const blankPartForm = (): PartFormState => ({
  name: '', company: '', designation: '',
  email: '', mobile: '', city: '',
  registration_date: todayISO(),
  status: 'registered',
  interest_level: 'warm',
  attended_duration_mins: '',
  questions_asked: '',
  follow_up_due: '',
  notes: '',
});

export function WebinarMasterPanel({ entityCode }: Props) {
  const {
    webinars, saveWebinar, deleteWebinar,
    saveParticipant, deleteParticipant, participantsForWebinar,
  } = useWebinars(entityCode);
  const { campaigns } = useCampaigns(entityCode);

  const [form, setForm] = useState<FormState>(blankForm());
  const [activeTab, setActiveTab] = useState('details');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WebinarStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | WebinarCategory>('all');
  const [showPartForm, setShowPartForm] = useState(false);
  const [partForm, setPartForm] = useState<PartFormState>(blankPartForm());

  const filteredWebinars = useMemo(() => {
    const q = search.trim().toLowerCase();
    return webinars.filter(w => {
      if (statusFilter !== 'all' && w.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && w.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        w.webinar_code.toLowerCase().includes(q) ||
        w.webinar_title.toLowerCase().includes(q) ||
        (w.host_name || '').toLowerCase().includes(q)
      );
    });
  }, [webinars, search, statusFilter, categoryFilter]);

  const kpis = useMemo(() => {
    const total = webinars.length;
    const scheduled = webinars.filter(w => w.status === 'scheduled').length;
    const totalReg = webinars.reduce((s, w) => s + (w.outcome?.registrations || 0), 0);
    const completed = webinars.filter(w => w.status === 'completed' && (w.outcome?.registrations || 0) > 0);
    const avgAtt = completed.length === 0 ? 0
      : Math.round(
          completed.reduce((s, w) => {
            const o = w.outcome!;
            return s + (o.registrations > 0 ? (o.attendees / o.registrations) * 100 : 0);
          }, 0) / completed.length * 10,
        ) / 10;
    return { total, scheduled, totalReg, avgAtt };
  }, [webinars]);

  const currentParticipants = useMemo(() =>
    form.editingId ? participantsForWebinar(form.editingId) : [],
  [form.editingId, participantsForWebinar]);

  const handleEdit = useCallback((w: Webinar) => {
    setForm({
      webinar_code: w.webinar_code,
      webinar_title: w.webinar_title,
      category: w.category,
      platform: w.platform,
      platform_url: w.platform_url || '',
      platform_meeting_id: w.platform_meeting_id || '',
      platform_passcode: w.platform_passcode || '',
      scheduled_date: w.scheduled_date,
      scheduled_time: w.scheduled_time,
      duration_mins: w.duration_mins,
      host_name: w.host_name || '',
      speakers: (w.speakers || []).join(', '),
      topic_summary: w.topic_summary || '',
      target_audience: w.target_audience || '',
      max_registrations: w.max_registrations ?? '',
      registration_link: w.registration_link || '',
      recording_url: w.recording_url || '',
      campaign_code: w.campaign_code || '',
      status: w.status,
      is_active: w.is_active,
      budget: w.budget || defaultWebinarBudget(),
      outcome: w.outcome || defaultWebinarOutcome(),
      editingId: w.id,
    });
    setActiveTab('details');
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (!window.confirm('Delete this webinar? Participants will also be removed.')) return;
    deleteWebinar(id);
    if (form.editingId === id) {
      setForm(blankForm());
      setActiveTab('details');
    }
    toast.success('Webinar deleted');
  }, [deleteWebinar, form.editingId]);

  const handleSave = useCallback(() => {
    const code = form.webinar_code.trim().toUpperCase();
    const title = form.webinar_title.trim();
    if (!code) { toast.error('Webinar code is required'); return; }
    if (!title) { toast.error('Webinar title is required'); return; }
    if (!form.scheduled_date) { toast.error('Scheduled date is required'); return; }
    if (!form.scheduled_time) { toast.error('Scheduled time is required'); return; }
    const dup = webinars.find(w =>
      w.webinar_code.toUpperCase() === code && w.id !== form.editingId,
    );
    if (dup) { toast.error(`Code '${code}' already exists`); return; }

    const budget = computeWebinarBudget(form.budget);
    const speakers = form.speakers
      .split(',').map(s => s.trim()).filter(Boolean);

    saveWebinar({
      id: form.editingId ?? undefined,
      entity_id: entityCode,
      webinar_code: code,
      webinar_title: title,
      category: form.category,
      platform: form.platform,
      platform_url: form.platform_url.trim() || null,
      platform_meeting_id: form.platform_meeting_id.trim() || null,
      platform_passcode: form.platform_passcode.trim() || null,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time,
      duration_mins: Number(form.duration_mins) || 0,
      host_name: form.host_name.trim() || null,
      speakers,
      topic_summary: form.topic_summary.trim() || null,
      target_audience: form.target_audience.trim() || null,
      max_registrations: form.max_registrations === '' ? null : Number(form.max_registrations),
      registration_link: form.registration_link.trim() || null,
      recording_url: form.recording_url.trim() || null,
      campaign_code: form.campaign_code || null,
      budget,
      outcome: form.outcome,
      status: form.status,
      is_active: form.is_active,
    });
    toast.success(form.editingId ? 'Webinar updated' : 'Webinar created');
    if (!form.editingId) {
      setForm(blankForm());
      setActiveTab('details');
    }
  }, [form, webinars, saveWebinar, entityCode]);

  useCtrlS(handleSave);

  const handleSaveParticipant = useCallback(() => {
    if (!form.editingId) { toast.error('Save the webinar first'); return; }
    if (!partForm.name.trim()) { toast.error('Participant name required'); return; }
    if (!partForm.company.trim()) { toast.error('Company required'); return; }
    saveParticipant({
      webinar_id: form.editingId,
      name: partForm.name.trim(),
      company: partForm.company.trim(),
      designation: partForm.designation.trim() || null,
      email: partForm.email.trim() || null,
      mobile: partForm.mobile.trim() || null,
      city: partForm.city.trim() || null,
      registration_date: partForm.registration_date,
      status: partForm.status,
      attended_duration_mins:
        partForm.attended_duration_mins === '' ? null : Number(partForm.attended_duration_mins),
      interest_level: partForm.interest_level,
      questions_asked: partForm.questions_asked.trim() || null,
      enquiry_created: false,
      enquiry_id: null,
      follow_up_due: partForm.follow_up_due || null,
      notes: partForm.notes.trim() || null,
    });
    toast.success('Participant added');
    setPartForm(blankPartForm());
    setShowPartForm(false);
  }, [partForm, form.editingId, saveParticipant]);

  const activeCampaigns = useMemo(
    () => campaigns.filter(c => c.is_active),
    [campaigns],
  );

  const metrics = useMemo(() => computeWebinarMetrics(form.outcome), [form.outcome]);

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard label="Total Webinars" value={kpis.total} icon={Video} />
        <KpiCard label="Scheduled" value={kpis.scheduled} icon={Calendar} accent="text-blue-600" />
        <KpiCard label="Total Registrations" value={kpis.totalReg} icon={Users} accent="text-orange-600" />
        <KpiCard label="Avg Attendance" value={`${kpis.avgAtt}%`} icon={Users} accent="text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Register table 3/5 */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Webinar Register</CardTitle>
              <Badge variant="outline" className="text-[10px]">{filteredWebinars.length} rows</Badge>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                <Input
                  className="h-8 text-xs pl-7"
                  placeholder="Search code, title, host…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'all' | WebinarStatus)}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={v => setCategoryFilter(v as 'all' | WebinarCategory)}>
                <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(WEBINAR_CATEGORY_LABELS).map(([k, lbl]) => (
                    <SelectItem key={k} value={k}>{lbl}</SelectItem>
                  ))}
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
                    <TableHead className="text-[10px]">Title / Category</TableHead>
                    <TableHead className="text-[10px]">When</TableHead>
                    <TableHead className="text-[10px]">Dur</TableHead>
                    <TableHead className="text-[10px]">Reg/Att</TableHead>
                    <TableHead className="text-[10px]">Status</TableHead>
                    <TableHead className="text-[10px] w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWebinars.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                        No webinars yet — create your first webinar →
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredWebinars.map(w => (
                    <TableRow
                      key={w.id}
                      className={cn(
                        'cursor-pointer hover:bg-muted/40',
                        form.editingId === w.id && 'bg-orange-500/5',
                      )}
                      onClick={() => handleEdit(w)}
                    >
                      <TableCell className="font-mono text-[11px]">{w.webinar_code}</TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{w.webinar_title}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[9px] py-0">
                            {WEBINAR_CATEGORY_LABELS[w.category]}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] py-0">
                            {WEBINAR_PLATFORM_LABELS[w.platform]}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">
                        {w.scheduled_date}<br />
                        <span className="text-muted-foreground">{w.scheduled_time}</span>
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">{w.duration_mins}m</TableCell>
                      <TableCell className="font-mono text-[11px]">
                        {w.outcome?.registrations || 0}/{w.outcome?.attendees || 0}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[9px] py-0', STATUS_COLOR[w.status])}>
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {w.status === 'live' && w.platform_url && (
                            <a
                              href={w.platform_url}
                              target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                            >
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </a>
                          )}
                          <Button
                            size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                            onClick={e => { e.stopPropagation(); handleDelete(w.id); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
                {form.editingId ? 'Edit Webinar' : 'New Webinar'}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave}>
                  <Save className="h-3 w-3" />Save
                </Button>
                <Button
                  size="sm" variant="outline" className="h-7 text-xs gap-1"
                  onClick={() => { setForm(blankForm()); setActiveTab('details'); }}
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
                <TabsTrigger value="participants" className="text-[10px]">Participants</TabsTrigger>
                <TabsTrigger value="summary" className="text-[10px]">Summary</TabsTrigger>
              </TabsList>

              {/* DETAILS */}
              <TabsContent value="details" className="space-y-2 mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Code *">
                    <Input
                      className="h-8 text-xs font-mono"
                      maxLength={16}
                      value={form.webinar_code}
                      onChange={e => setForm(p => ({ ...p, webinar_code: e.target.value.toUpperCase() }))}
                    />
                  </Field>
                  <Field label="Status">
                    <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as WebinarStatus }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Webinar Title *">
                  <Input
                    className="h-8 text-xs"
                    value={form.webinar_title}
                    onChange={e => setForm(p => ({ ...p, webinar_title: e.target.value }))}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Category">
                    <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as WebinarCategory }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(WEBINAR_CATEGORY_LABELS).map(([k, lbl]) => (
                          <SelectItem key={k} value={k}>{lbl}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Platform">
                    <Select value={form.platform} onValueChange={v => setForm(p => ({ ...p, platform: v as WebinarPlatform }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(WEBINAR_PLATFORM_LABELS).map(([k, lbl]) => (
                          <SelectItem key={k} value={k}>{lbl}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Platform URL (join link)">
                  <Input
                    className="h-8 text-xs"
                    value={form.platform_url}
                    onChange={e => setForm(p => ({ ...p, platform_url: e.target.value }))}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Meeting ID">
                    <Input
                      className="h-8 text-xs font-mono"
                      value={form.platform_meeting_id}
                      onChange={e => setForm(p => ({ ...p, platform_meeting_id: e.target.value }))}
                    />
                  </Field>
                  <Field label="Passcode">
                    <Input
                      className="h-8 text-xs font-mono"
                      value={form.platform_passcode}
                      onChange={e => setForm(p => ({ ...p, platform_passcode: e.target.value }))}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Date *">
                    <SmartDateInput
                      value={form.scheduled_date}
                      onChange={v => setForm(p => ({ ...p, scheduled_date: v }))}
                    />
                  </Field>
                  <Field label="Time *">
                    <Input
                      type="time"
                      className="h-8 text-xs"
                      value={form.scheduled_time}
                      onChange={e => setForm(p => ({ ...p, scheduled_time: e.target.value }))}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Duration (mins)">
                    <Input
                      type="number" className="h-8 text-xs font-mono"
                      value={form.duration_mins}
                      onChange={e => setForm(p => ({ ...p, duration_mins: Number(e.target.value) }))}
                    />
                  </Field>
                  <Field label="Max Registrations">
                    <Input
                      type="number" className="h-8 text-xs font-mono"
                      value={form.max_registrations}
                      onChange={e => setForm(p => ({
                        ...p,
                        max_registrations: e.target.value === '' ? '' : Number(e.target.value),
                      }))}
                    />
                  </Field>
                </div>
                <Field label="Host Name">
                  <Input
                    className="h-8 text-xs"
                    value={form.host_name}
                    onChange={e => setForm(p => ({ ...p, host_name: e.target.value }))}
                  />
                </Field>
                <Field label="Speakers (comma separated)">
                  <Input
                    className="h-8 text-xs"
                    value={form.speakers}
                    onChange={e => setForm(p => ({ ...p, speakers: e.target.value }))}
                  />
                </Field>
                <Field label="Target Audience">
                  <Input
                    className="h-8 text-xs"
                    placeholder="e.g. Architects, Interior Designers"
                    value={form.target_audience}
                    onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))}
                  />
                </Field>
                <Field label="Topic Summary">
                  <Textarea
                    rows={2} className="text-xs"
                    value={form.topic_summary}
                    onChange={e => setForm(p => ({ ...p, topic_summary: e.target.value }))}
                  />
                </Field>
                <Field label="Registration Link">
                  <Input
                    className="h-8 text-xs"
                    value={form.registration_link}
                    onChange={e => setForm(p => ({ ...p, registration_link: e.target.value }))}
                  />
                </Field>
                <Field label="Recording URL">
                  <Input
                    className="h-8 text-xs"
                    value={form.recording_url}
                    onChange={e => setForm(p => ({ ...p, recording_url: e.target.value }))}
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
              </TabsContent>

              {/* BUDGET */}
              <TabsContent value="budget" className="space-y-3 mt-3">
                <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded">
                  5-category budget · planned vs actual
                </div>
                {(['platform_cost', 'speaker_fee', 'promotion', 'production', 'misc'] as const).map(k => (
                  <div key={k} className="grid grid-cols-3 gap-2 items-center">
                    <Label className="text-[10px] capitalize">{k.replace('_', ' ')}</Label>
                    <Input
                      type="number" className="h-7 text-xs font-mono"
                      placeholder="Planned"
                      value={form.budget[k]}
                      onChange={e => setForm(p => ({
                        ...p, budget: computeWebinarBudget({ ...p.budget, [k]: Number(e.target.value) }),
                      }))}
                    />
                    <Input
                      type="number" className="h-7 text-xs font-mono"
                      placeholder="Actual"
                      value={k === 'platform_cost' ? form.budget.total_actual : ''}
                      onChange={e => {
                        if (k === 'platform_cost') {
                          setForm(p => ({
                            ...p,
                            budget: computeWebinarBudget({ ...p.budget, total_actual: Number(e.target.value) }),
                          }));
                        }
                      }}
                      disabled={k !== 'platform_cost'}
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
                    <span className="font-bold">₹ {form.budget.total_actual.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Variance</span>
                    <span className={cn('font-bold', form.budget.variance > 0 ? 'text-destructive' : 'text-green-600')}>
                      ₹ {form.budget.variance.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </TabsContent>

              {/* PARTICIPANTS */}
              <TabsContent value="participants" className="space-y-3 mt-3">
                {!form.editingId ? (
                  <div className="text-xs text-muted-foreground py-8 text-center">
                    Save the webinar first to add participants.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-muted-foreground">
                        {currentParticipants.length} participant(s)
                      </div>
                      <Button
                        size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => setShowPartForm(s => !s)}
                      >
                        <Plus className="h-3 w-3" />
                        {showPartForm ? 'Hide form' : 'Add Participant'}
                      </Button>
                    </div>

                    {showPartForm && (
                      <div className="border rounded p-2 space-y-2 bg-muted/20">
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Name *">
                            <Input className="h-7 text-xs" value={partForm.name}
                              onChange={e => setPartForm(p => ({ ...p, name: e.target.value }))} />
                          </Field>
                          <Field label="Company *">
                            <Input className="h-7 text-xs" value={partForm.company}
                              onChange={e => setPartForm(p => ({ ...p, company: e.target.value }))} />
                          </Field>
                          <Field label="Email">
                            <Input className="h-7 text-xs" value={partForm.email}
                              onChange={e => setPartForm(p => ({ ...p, email: e.target.value }))} />
                          </Field>
                          <Field label="Mobile">
                            <Input className="h-7 text-xs font-mono" value={partForm.mobile}
                              onChange={e => setPartForm(p => ({ ...p, mobile: e.target.value }))} />
                          </Field>
                          <Field label="City">
                            <Input className="h-7 text-xs" value={partForm.city}
                              onChange={e => setPartForm(p => ({ ...p, city: e.target.value }))} />
                          </Field>
                          <Field label="Reg Date">
                            <SmartDateInput value={partForm.registration_date}
                              onChange={v => setPartForm(p => ({ ...p, registration_date: v }))} />
                          </Field>
                          <Field label="Status">
                            <Select value={partForm.status} onValueChange={v => setPartForm(p => ({ ...p, status: v as ParticipantStatus }))}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="registered">Registered</SelectItem>
                                <SelectItem value="attended">Attended</SelectItem>
                                <SelectItem value="no_show">No Show</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Interest">
                            <Select value={partForm.interest_level} onValueChange={v => setPartForm(p => ({ ...p, interest_level: v as PartFormState['interest_level'] }))}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="hot">Hot</SelectItem>
                                <SelectItem value="warm">Warm</SelectItem>
                                <SelectItem value="cold">Cold</SelectItem>
                                <SelectItem value="not_interested">Not Interested</SelectItem>
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="Attended Mins">
                            <Input type="number" className="h-7 text-xs font-mono"
                              value={partForm.attended_duration_mins}
                              onChange={e => setPartForm(p => ({
                                ...p,
                                attended_duration_mins: e.target.value === '' ? '' : Number(e.target.value),
                              }))} />
                          </Field>
                          <Field label="Follow-up">
                            <SmartDateInput value={partForm.follow_up_due}
                              onChange={v => setPartForm(p => ({ ...p, follow_up_due: v }))} />
                          </Field>
                        </div>
                        <Field label="Questions Asked">
                          <Textarea rows={2} className="text-xs" value={partForm.questions_asked}
                            onChange={e => setPartForm(p => ({ ...p, questions_asked: e.target.value }))} />
                        </Field>
                        <Field label="Notes">
                          <Textarea rows={2} className="text-xs" value={partForm.notes}
                            onChange={e => setPartForm(p => ({ ...p, notes: e.target.value }))} />
                        </Field>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" className="h-7 text-xs" onClick={handleSaveParticipant}>
                            <Save className="h-3 w-3 mr-1" />Save Participant
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="max-h-[260px] overflow-auto border rounded">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px]">Name</TableHead>
                            <TableHead className="text-[10px]">Company</TableHead>
                            <TableHead className="text-[10px]">Status</TableHead>
                            <TableHead className="text-[10px]">Interest</TableHead>
                            <TableHead className="text-[10px]">Dur</TableHead>
                            <TableHead className="text-[10px]">Follow-up</TableHead>
                            <TableHead className="text-[10px] w-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentParticipants.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-[11px] text-muted-foreground py-4">
                                No participants yet
                              </TableCell>
                            </TableRow>
                          )}
                          {currentParticipants.map(p => (
                            <TableRow key={p.id}>
                              <TableCell className="text-[11px]">{p.name}</TableCell>
                              <TableCell className="text-[11px]">{p.company || '—'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn('text-[9px] py-0', PARTICIPANT_STATUS_COLOR[p.status])}>
                                  {p.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn('text-[9px] py-0', INTEREST_COLOR[p.interest_level])}>
                                  {p.interest_level}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-[11px]">
                                {p.attended_duration_mins ?? '—'}
                              </TableCell>
                              <TableCell className="font-mono text-[11px]">
                                {p.follow_up_due || '—'}
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                                  onClick={() => deleteParticipant(p.id)}>
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
                  <div className="text-xs text-muted-foreground py-8 text-center">
                    Save the webinar first to view summary.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      <SummaryStat label="Registrations" value={form.outcome.registrations} />
                      <SummaryStat label="Attended" value={form.outcome.attendees} accent="text-green-600" />
                      <SummaryStat label="No-Shows" value={form.outcome.no_shows} accent="text-muted-foreground" />
                      <SummaryStat label="Attendance %" value={`${metrics.attendance_rate}%`} accent="text-orange-600" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <SummaryStat label="Enquiries" value={form.outcome.enquiries_created} />
                      <SummaryStat label="Orders" value={form.outcome.orders_converted} />
                      <SummaryStat label="Revenue" value={`₹ ${form.outcome.revenue_attributed.toLocaleString('en-IN')}`} accent="text-green-600" />
                    </div>
                    <Card>
                      <CardHeader className="py-2"><CardTitle className="text-xs">Budget Summary</CardTitle></CardHeader>
                      <CardContent className="font-mono text-[11px] space-y-1">
                        <div className="flex justify-between"><span className="text-muted-foreground">Planned</span><span>₹ {form.budget.total_planned.toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Actual</span><span>₹ {form.budget.total_actual.toLocaleString('en-IN')}</span></div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Variance</span>
                          <span className={cn(form.budget.variance > 0 ? 'text-destructive' : 'text-green-600')}>
                            ₹ {form.budget.variance.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                          <span className="text-muted-foreground">Cost / Attendee</span>
                          <span>
                            ₹ {form.outcome.attendees > 0
                              ? Math.round(form.budget.total_actual / form.outcome.attendees).toLocaleString('en-IN')
                              : '—'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="py-2"><CardTitle className="text-xs">Platform</CardTitle></CardHeader>
                      <CardContent className="text-[11px] space-y-1">
                        <div><span className="text-muted-foreground">Platform: </span>{WEBINAR_PLATFORM_LABELS[form.platform]}</div>
                        {form.platform_url && (
                          <div className="truncate">
                            <a href={form.platform_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" /> Join Link
                            </a>
                          </div>
                        )}
                        {form.recording_url && (
                          <div className="truncate">
                            <a href={form.recording_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" /> Recording
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
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
}: { label: string; value: number | string; icon: React.ElementType; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
          <Icon className={cn('h-4 w-4 text-orange-500', accent)} />
        </div>
        <div>
          <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
          <div className={cn('text-lg font-bold font-mono', accent)}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="border rounded p-2 text-center">
      <div className="text-[9px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className={cn('text-sm font-bold font-mono', accent)}>{value}</div>
    </div>
  );
}

export default WebinarMasterPanel;
