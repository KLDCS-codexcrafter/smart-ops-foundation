/**
 * LeadAggregationHub.tsx — Canvas Wave (T-Phase-1.1.1f)
 * Unified lead inbox · 9 platforms · dedup · bulk import · convert-to-enquiry
 * [JWT] /api/salesx/leads
 */
import { useState, useMemo, useCallback } from 'react';
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
  Plus, Save, Trash2, X, Search, Inbox, Upload, ChevronDown, ChevronUp,
  ArrowRightCircle, Copy, AlertCircle, FileText,
} from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useEnquiries } from '@/hooks/useEnquiries';
import { useCtrlS } from '@/lib/keyboard';
import type {
  Lead, LeadPlatform, LeadStatus, LeadPlatformMeta, LeadImportRow,
} from '@/types/lead';
import { LEAD_PLATFORM_LABELS, LEAD_PLATFORM_COLORS } from '@/types/lead';
import type { EnquiryType, EnquiryPriority } from '@/types/enquiry';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

interface FormState {
  platform: LeadPlatform;
  status: LeadStatus;
  priority: 'high' | 'medium' | 'low';
  contact_name: string;
  company_name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  product_interest: string;
  estimated_value: string;
  next_follow_up: string;
  assigned_salesman_name: string;
  campaign_code: string;
  notes: string;
  lead_date: string;
  meta: LeadPlatformMeta;
  editingId: string | null;
}

const todayISO = () => new Date().toISOString().split('T')[0];

const blankForm = (): FormState => ({
  platform: 'indiamart',
  status: 'new',
  priority: 'medium',
  contact_name: '',
  company_name: '',
  phone: '',
  email: '',
  city: '',
  state: '',
  product_interest: '',
  estimated_value: '',
  next_follow_up: '',
  assigned_salesman_name: '',
  campaign_code: '',
  notes: '',
  lead_date: todayISO(),
  meta: {},
  editingId: null,
});

const PLATFORMS: LeadPlatform[] = [
  'indiamart', 'justdial', 'tradeindia', 'facebook', 'instagram',
  'linkedin', 'email', 'website', 'whatsapp', 'other',
];

const STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost', 'duplicate'];

const STATUS_COLOR: Record<LeadStatus, string> = {
  new:        'bg-amber-500/15 text-amber-700 border-amber-500/30',
  contacted:  'bg-blue-500/15 text-blue-700 border-blue-500/30',
  qualified:  'bg-violet-500/15 text-violet-700 border-violet-500/30',
  converted:  'bg-green-500/15 text-green-700 border-green-500/30',
  lost:       'bg-destructive/15 text-destructive border-destructive/30',
  duplicate:  'bg-muted text-muted-foreground border-border',
};

const PRIORITY_COLOR: Record<'high' | 'medium' | 'low', string> = {
  high:   'bg-destructive/15 text-destructive border-destructive/30',
  medium: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  low:    'bg-muted text-muted-foreground border-border',
};

const SAMPLE_CSV =
  `contact_name,company_name,phone,email,city,product_interest,portal_query
Ravi Kumar,Kumar Builders,+919811001001,ravi@kumarbuilders.in,Delhi,Wall Putty,Looking for 500 bags
Priya Singh,Singh Interiors,+919822002002,priya@singhinteriors.com,Mumbai,Texture Paint,Need samples first
Mohan Das,,+919833003003,,Jaipur,Primer,`;

const TARGET_FIELDS = [
  { key: 'contact_name',     label: 'Contact Name',     required: true },
  { key: 'company_name',     label: 'Company Name',     required: false },
  { key: 'phone',            label: 'Phone',            required: false },
  { key: 'email',            label: 'Email',            required: false },
  { key: 'city',             label: 'City',             required: false },
  { key: 'product_interest', label: 'Product Interest', required: false },
  { key: 'portal_query',     label: 'Portal Query',     required: false },
] as const;

function parseCsvWithMapping(
  text: string,
  platform: LeadPlatform,
  mapping: Record<string, string>,
): LeadImportRow[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length <= 1) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: LeadImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const get = (key: string): string => {
      const userCol = mapping[key];
      if (!userCol) return '';
      const idx = headers.indexOf(userCol);
      return idx >= 0 ? cols[idx] ?? '' : '';
    };
    const contact_name = get('contact_name');
    if (!contact_name) continue;
    rows.push({
      contact_name,
      company_name: get('company_name') || undefined,
      phone: get('phone') || undefined,
      email: get('email') || undefined,
      city: get('city') || undefined,
      product_interest: get('product_interest') || undefined,
      portal_query: get('portal_query') || undefined,
      platform,
    });
  }
  return rows;
}

export function LeadAggregationHubPanel({ entityCode }: Props) {
  const {
    leads, saveLead, deleteLead, markDuplicate, convertToEnquiry, bulkImport,
  } = useLeads(entityCode);
  const { campaigns } = useCampaigns(entityCode);
  const { createEnquiry } = useEnquiries(entityCode);

  const [form, setForm] = useState<FormState>(blankForm());
  const [activeTab, setActiveTab] = useState<'contact' | 'platform' | 'dedup'>('contact');
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'all' | LeadPlatform>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const [showImport, setShowImport] = useState(false);
  const [importPlatform, setImportPlatform] = useState<LeadPlatform>('indiamart');
  const [importText, setImportText] = useState(SAMPLE_CSV);
  const [importPreview, setImportPreview] = useState<LeadImportRow[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});

  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [convertType, setConvertType] = useState<EnquiryType>('prospect');
  const [convertPriority, setConvertPriority] = useState<EnquiryPriority>('medium');
  const [convertExec, setConvertExec] = useState('');
  const [convertNote, setConvertNote] = useState('');

  // Pulse counts: open leads (new + contacted) per platform
  const platformCounts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    PLATFORMS.forEach(p => { c[p] = 0; });
    leads.forEach(l => {
      if (l.status === 'new' || l.status === 'contacted') {
        c.all += 1;
        c[l.platform] = (c[l.platform] ?? 0) + 1;
      }
    });
    return c;
  }, [leads]);

  // KPIs
  const kpis = useMemo(() => ({
    total: leads.length,
    nu: leads.filter(l => l.status === 'new').length,
    converted: leads.filter(l => l.status === 'converted').length,
    duplicates: leads.filter(l => l.is_duplicate).length,
  }), [leads]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter(l => {
      if (platformFilter !== 'all' && l.platform !== platformFilter) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && l.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        l.contact_name.toLowerCase().includes(q) ||
        (l.company_name ?? '').toLowerCase().includes(q) ||
        (l.phone ?? '').toLowerCase().includes(q) ||
        (l.email ?? '').toLowerCase().includes(q)
      );
    });
  }, [leads, search, platformFilter, statusFilter, priorityFilter]);

  // Dedup matches for current form
  const dedupMatches = useMemo(() => {
    const phone = form.phone.trim();
    const email = form.email.trim();
    if (!phone && !email) return [];
    return leads.filter(l =>
      l.id !== form.editingId &&
      (
        (!!phone && l.phone === phone) ||
        (!!email && l.email === email)
      ),
    );
  }, [leads, form.phone, form.email, form.editingId]);

  const handleSave = useCallback(() => {
    if (!form.contact_name.trim()) {
      toast.error('Contact name is required');
      return;
    }
    saveLead({
      id: form.editingId ?? undefined,
      entity_id: entityCode,
      lead_date: form.lead_date,
      platform: form.platform,
      status: form.status,
      contact_name: form.contact_name.trim(),
      company_name: form.company_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      product_interest: form.product_interest.trim() || null,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      priority: form.priority,
      assigned_salesman_id: null,
      assigned_salesman_name: form.assigned_salesman_name.trim() || null,
      assigned_telecaller_id: null,
      platform_meta: Object.keys(form.meta).length ? form.meta : null,
      is_duplicate: false,
      duplicate_of_lead_id: null,
      next_follow_up: form.next_follow_up || null,
      notes: form.notes.trim() || null,
      converted_enquiry_id: null,
      converted_at: null,
      campaign_code: form.campaign_code || null,
      is_active: true,
    });
    toast.success(form.editingId ? 'Lead updated' : 'Lead created');
    setForm(blankForm());
    setActiveTab('contact');
  }, [form, saveLead, entityCode]);

  const isFormActive = !!(form.contact_name.trim() || form.editingId);
  useCtrlS(isFormActive ? handleSave : () => {});

  const handleEdit = (l: Lead) => {
    setForm({
      platform: l.platform,
      status: l.status,
      priority: l.priority,
      contact_name: l.contact_name,
      company_name: l.company_name ?? '',
      phone: l.phone ?? '',
      email: l.email ?? '',
      city: l.city ?? '',
      state: l.state ?? '',
      product_interest: l.product_interest ?? '',
      estimated_value: l.estimated_value != null ? String(l.estimated_value) : '',
      next_follow_up: l.next_follow_up ?? '',
      assigned_salesman_name: l.assigned_salesman_name ?? '',
      campaign_code: l.campaign_code ?? '',
      notes: l.notes ?? '',
      lead_date: l.lead_date,
      meta: l.platform_meta ?? {},
      editingId: l.id,
    });
    setActiveTab('contact');
  };

  const handleDelete = (id: string) => {
    deleteLead(id);
    toast.success('Lead deleted');
    if (form.editingId === id) {
      setForm(blankForm());
      setActiveTab('contact');
    }
  };

  const handleMarkDup = (id: string, originalId: string) => {
    markDuplicate(id, originalId);
    toast.success('Marked as duplicate');
  };

  const handleParse = () => {
    const rows = parseCsv(importText, importPlatform);
    setImportPreview(rows);
    if (rows.length === 0) {
      toast.error('No valid rows found');
    } else {
      toast.success(`Parsed ${rows.length} rows`);
    }
  };

  const handleImport = () => {
    if (importPreview.length === 0) {
      toast.error('Click Parse & Preview first');
      return;
    }
    const res = bulkImport(importPreview, importPlatform);
    toast.success(`${res.added} added · ${res.duplicates} duplicates detected`);
    setImportPreview([]);
  };

  const startConvert = (l: Lead) => {
    setConvertingLead(l);
    setConvertType('prospect');
    setConvertPriority(l.priority);
    setConvertExec(l.assigned_salesman_name ?? '');
    setConvertNote(l.notes ?? '');
  };

  const cancelConvert = () => setConvertingLead(null);

  const doConvert = () => {
    if (!convertingLead) return;
    const l = convertingLead;
    const newEnq = createEnquiry({
      enquiry_date: l.lead_date,
      enquiry_time: null,
      enquiry_type: convertType,
      enquiry_source_id: null,
      enquiry_source_name: LEAD_PLATFORM_LABELS[l.platform],
      priority: convertPriority,
      campaign: l.campaign_code,
      customer_id: null,
      customer_name: l.contact_name,
      prospectus_id: null,
      partner_id: null,
      partner_name: null,
      contact_person: l.contact_name,
      department: null,
      designation: null,
      email: l.email,
      mobile: l.phone,
      phone: null,
      dealer_id: null,
      dealer_name: null,
      reference_id: null,
      reference_name: null,
      assigned_executive_id: null,
      assigned_executive_name: convertExec.trim() || null,
      items: [{
        id: 'item-1',
        product_name: l.product_interest ?? 'Enquiry',
        quantity: 1,
        unit: 'NOS',
        rate: l.estimated_value ?? null,
        amount: l.estimated_value ?? null,
        line_type: 'product',
      }],
      status: 'new',
      follow_ups: [],
      quotation_ids: [],
      opportunity_id: null,
      converted_at: null,
      is_active: true,
    });
    convertToEnquiry(l.id, newEnq.id);
    toast.success(`Lead converted → ${newEnq.enquiry_no}`);
    setConvertingLead(null);
    void convertNote;
  };

  const fmtINR = (n: number | null) =>
    n == null ? '—' : `₹${n.toLocaleString('en-IN')}`;

  const platformBadge = (p: LeadPlatform) => (
    <Badge variant="outline" className={cn('font-normal', LEAD_PLATFORM_COLORS[p])}>
      {LEAD_PLATFORM_LABELS[p]}
    </Badge>
  );

  return (
    <div className="space-y-4">
      {/* Platform pulse strip */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Inbox className="h-4 w-4" /> Platform Pulse — Open Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPlatformFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-md border text-xs flex items-center gap-2 transition-colors',
                platformFilter === 'all'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted',
              )}
            >
              All <Badge variant="secondary" className="h-5">{platformCounts.all}</Badge>
            </button>
            {PLATFORMS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatformFilter(p)}
                className={cn(
                  'px-3 py-1.5 rounded-md border text-xs flex items-center gap-2 transition-colors',
                  platformFilter === p
                    ? 'ring-2 ring-primary'
                    : 'hover:bg-muted',
                  LEAD_PLATFORM_COLORS[p],
                )}
              >
                {LEAD_PLATFORM_LABELS[p]}
                <Badge variant="secondary" className="h-5">{platformCounts[p] ?? 0}</Badge>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Total Leads</div>
            <div className="text-2xl font-mono font-bold">{kpis.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">New</div>
            <div className="text-2xl font-mono font-bold text-amber-600">{kpis.nu}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Converted</div>
            <div className="text-2xl font-mono font-bold text-green-600">{kpis.converted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground">Duplicates Detected</div>
            <div className="text-2xl font-mono font-bold text-muted-foreground">{kpis.duplicates}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Inbox table — 3/5 */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm">Lead Inbox</CardTitle>
              <Button size="sm" onClick={() => { setForm(blankForm()); setActiveTab('contact'); }}>
                <Plus className="h-4 w-4 mr-1" /> New Lead
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name / company / phone / email"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={platformFilter} onValueChange={v => setPlatformFilter(v as 'all' | LeadPlatform)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{LEAD_PLATFORM_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'all' | LeadStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={v => setPriorityFilter(v as 'all' | 'high' | 'medium' | 'low')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No leads match the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead No</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Interest</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Est Value</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Next FU</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(l => (
                      <TableRow
                        key={l.id}
                        className={cn(
                          'cursor-pointer',
                          form.editingId === l.id && 'bg-muted/40',
                        )}
                        onClick={() => handleEdit(l)}
                      >
                        <TableCell className="font-mono text-xs">{l.lead_no}</TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{l.contact_name}</div>
                          {l.company_name && (
                            <div className="text-xs text-muted-foreground">{l.company_name}</div>
                          )}
                        </TableCell>
                        <TableCell>{platformBadge(l.platform)}</TableCell>
                        <TableCell className="text-xs">{l.city ?? '—'}</TableCell>
                        <TableCell className="text-xs">{l.product_interest ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('font-normal text-xs', PRIORITY_COLOR[l.priority])}>
                            {l.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('font-normal text-xs', STATUS_COLOR[l.status])}>
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmtINR(l.estimated_value)}</TableCell>
                        <TableCell className="text-xs">{l.assigned_salesman_name ?? '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{l.next_follow_up ?? '—'}</TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {l.status !== 'converted' && l.status !== 'lost' && l.status !== 'duplicate' && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600"
                                onClick={() => startConvert(l)} title="Convert to Enquiry">
                                <ArrowRightCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {(l.status === 'new' || l.status === 'contacted') && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground"
                                onClick={() => {
                                  // mark dup of first matching lead by phone/email if any, else self-flag
                                  const original = leads.find(o =>
                                    o.id !== l.id && (
                                      (!!l.phone && o.phone === l.phone) ||
                                      (!!l.email && o.email === l.email)
                                    ),
                                  );
                                  handleMarkDup(l.id, original?.id ?? l.id);
                                }}
                                title="Mark as duplicate">
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(l.id)} title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form panel — 2/5 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">
                {form.editingId ? 'Edit Lead' : 'New Lead'}
              </CardTitle>
              {form.editingId && (
                <Button size="sm" variant="ghost" onClick={() => { setForm(blankForm()); setActiveTab('contact'); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'contact' | 'platform' | 'dedup')}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="platform">Platform</TabsTrigger>
                <TabsTrigger value="dedup">
                  Dedup {dedupMatches.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-4 text-[10px]">{dedupMatches.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contact" className="space-y-3 mt-3">
                <div>
                  <Label className="text-xs">Platform *</Label>
                  <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v as LeadPlatform }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map(p => <SelectItem key={p} value={p}>{LEAD_PLATFORM_LABELS[p]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as LeadStatus }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Priority</Label>
                    <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as 'high' | 'medium' | 'low' }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Contact Name *</Label>
                  <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Company Name</Label>
                  <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">City</Label>
                    <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">State</Label>
                    <Input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Product Interest</Label>
                  <Input value={form.product_interest} onChange={e => setForm(f => ({ ...f, product_interest: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Estimated Value (₹)</Label>
                    <Input type="number" value={form.estimated_value}
                      onChange={e => setForm(f => ({ ...f, estimated_value: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Next Follow-up</Label>
                    <SmartDateInput
                      value={form.next_follow_up}
                      onChange={v => setForm(f => ({ ...f, next_follow_up: v }))}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Assigned Salesman</Label>
                  <Input value={form.assigned_salesman_name}
                    onChange={e => setForm(f => ({ ...f, assigned_salesman_name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Campaign</Label>
                  <Select value={form.campaign_code || '__none__'}
                    onValueChange={v => setForm(f => ({ ...f, campaign_code: v === '__none__' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {campaigns.map(c => (
                        <SelectItem key={c.id} value={c.campaign_code}>
                          {c.campaign_code} — {c.campaign_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea rows={2} value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </TabsContent>

              <TabsContent value="platform" className="space-y-3 mt-3">
                <PlatformMetaFields
                  platform={form.platform}
                  meta={form.meta}
                  onChange={meta => setForm(f => ({ ...f, meta }))}
                />
              </TabsContent>

              <TabsContent value="dedup" className="space-y-3 mt-3">
                {dedupMatches.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-6 text-center">
                    No duplicates detected for this phone/email.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {dedupMatches.length} matching lead(s) found.
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead No</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Platform</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dedupMatches.map(m => (
                          <TableRow key={m.id}>
                            <TableCell className="font-mono text-xs">{m.lead_no}</TableCell>
                            <TableCell className="text-xs">
                              {m.contact_name}
                              {m.company_name && <div className="text-muted-foreground">{m.company_name}</div>}
                            </TableCell>
                            <TableCell>{platformBadge(m.platform)}</TableCell>
                            <TableCell className="text-right">
                              {form.editingId && (
                                <Button size="sm" variant="outline"
                                  onClick={() => handleMarkDup(form.editingId!, m.id)}>
                                  Mark dup of this
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" size="sm"
                onClick={() => { setForm(blankForm()); setActiveTab('contact'); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-1" /> {form.editingId ? 'Update' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Convert-to-Enquiry inline card */}
      {convertingLead && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-green-700">
              <ArrowRightCircle className="h-4 w-4" /> Convert Lead to Enquiry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><div className="text-muted-foreground">Name</div><div className="font-medium">{convertingLead.contact_name}</div></div>
              <div><div className="text-muted-foreground">Company</div><div className="font-medium">{convertingLead.company_name ?? '—'}</div></div>
              <div><div className="text-muted-foreground">Platform</div><div>{platformBadge(convertingLead.platform)}</div></div>
              <div><div className="text-muted-foreground">Interest</div><div className="font-medium">{convertingLead.product_interest ?? '—'}</div></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Enquiry Type</Label>
                <Select value={convertType} onValueChange={v => setConvertType(v as EnquiryType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">Existing</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={convertPriority} onValueChange={v => setConvertPriority(v as EnquiryPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Assigned Executive</Label>
                <Input value={convertExec} onChange={e => setConvertExec(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Note</Label>
              <Textarea rows={2} value={convertNote} onChange={e => setConvertNote(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={cancelConvert}>Cancel</Button>
              <Button size="sm" onClick={doConvert}>
                <ArrowRightCircle className="h-4 w-4 mr-1" /> Convert to Enquiry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Import collapsible */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowImport(s => !s)}>
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" /> Bulk Import
            </span>
            {showImport ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        {showImport && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Platform</Label>
                <Select value={importPlatform} onValueChange={v => setImportPlatform(v as LeadPlatform)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{LEAD_PLATFORM_LABELS[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Lead Date</Label>
                <SmartDateInput value={todayISO()} onChange={() => { /* import uses today */ }} disabled />
              </div>
            </div>
            <div>
              <Label className="text-xs">CSV (header row required)</Label>
              <Textarea rows={6} value={importText} onChange={e => setImportText(e.target.value)}
                className="font-mono text-xs" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleParse}>Parse & Preview</Button>
              <Button size="sm" onClick={handleImport} disabled={importPreview.length === 0}>
                Import {importPreview.length || ''} leads
              </Button>
            </div>
            {importPreview.length > 0 && (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Interest</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.map((r, i) => (
                      <TableRow key={`prev-${i}`}>
                        <TableCell className="text-xs">{r.contact_name}</TableCell>
                        <TableCell className="text-xs">{r.company_name ?? '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{r.phone ?? '—'}</TableCell>
                        <TableCell className="text-xs">{r.email ?? '—'}</TableCell>
                        <TableCell className="text-xs">{r.city ?? '—'}</TableCell>
                        <TableCell className="text-xs">{r.product_interest ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}

interface PlatformMetaProps {
  platform: LeadPlatform;
  meta: LeadPlatformMeta;
  onChange: (m: LeadPlatformMeta) => void;
}

function PlatformMetaFields({ platform, meta, onChange }: PlatformMetaProps) {
  const set = (patch: Partial<LeadPlatformMeta>) => onChange({ ...meta, ...patch });

  if (platform === 'indiamart' || platform === 'justdial' || platform === 'tradeindia') {
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Portal Lead ID</Label>
          <Input value={meta.portal_lead_id ?? ''} onChange={e => set({ portal_lead_id: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Portal Category</Label>
          <Input value={meta.portal_category ?? ''} onChange={e => set({ portal_category: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Buy Requirement</Label>
          <Input value={meta.buy_requirement ?? ''} onChange={e => set({ buy_requirement: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Raw Query</Label>
          <Textarea rows={3} value={meta.portal_query ?? ''} onChange={e => set({ portal_query: e.target.value })} />
        </div>
      </div>
    );
  }
  if (platform === 'facebook' || platform === 'instagram' || platform === 'linkedin') {
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Ad Campaign</Label>
          <Input value={meta.ad_campaign ?? ''} onChange={e => set({ ad_campaign: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Ad Set</Label>
          <Input value={meta.ad_set ?? ''} onChange={e => set({ ad_set: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Form Name</Label>
          <Input value={meta.form_name ?? ''} onChange={e => set({ form_name: e.target.value })} />
        </div>
      </div>
    );
  }
  if (platform === 'email') {
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Email Subject</Label>
          <Input value={meta.email_subject ?? ''} onChange={e => set({ email_subject: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Email Received At</Label>
          <Input type="datetime-local" value={meta.email_received_at ?? ''}
            onChange={e => set({ email_received_at: e.target.value })} />
        </div>
      </div>
    );
  }
  if (platform === 'website') {
    return (
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Page URL</Label>
          <Input value={meta.page_url ?? ''} onChange={e => set({ page_url: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">UTM Source</Label>
            <Input value={meta.utm_source ?? ''} onChange={e => set({ utm_source: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">UTM Medium</Label>
            <Input value={meta.utm_medium ?? ''} onChange={e => set({ utm_medium: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">UTM Campaign</Label>
            <Input value={meta.utm_campaign ?? ''} onChange={e => set({ utm_campaign: e.target.value })} />
          </div>
        </div>
      </div>
    );
  }
  if (platform === 'whatsapp') {
    return (
      <div>
        <Label className="text-xs">First Message Text</Label>
        <Textarea rows={4} value={meta.wa_message ?? ''} onChange={e => set({ wa_message: e.target.value })} />
      </div>
    );
  }
  return (
    <div className="text-xs text-muted-foreground py-4 text-center">
      No platform-specific fields for "{LEAD_PLATFORM_LABELS[platform]}". Use Notes on Contact tab.
    </div>
  );
}

export default LeadAggregationHubPanel;
