/**
 * EnquiryCapture.tsx — Sales Enquiry register + 3-tab form
 * Charis TDL: Enquiry Entry Screen UDF 4900-4942.
 * [JWT] GET/POST/PATCH /api/salesx/enquiries
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Plus, Save, Trash2, ArrowLeft, Search, Edit2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { useEnquiries } from '@/hooks/useEnquiries';
import { canConvertEnquiryToQuotation } from '@/lib/salesx-conversion-engine';
import { getCurrentUserId } from '@/lib/auth-helpers';
import { rememberModule } from '@/lib/breadcrumb-memory';
import { useEnquirySources } from '@/hooks/useEnquirySources';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useProspects } from '@/hooks/useProspects';
import { comply360SAMKey } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { SAMConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type {
  Enquiry, EnquiryItem, EnquiryFollowUp, EnquiryType,
  EnquiryStatus, EnquiryPriority, FollowUpType,
} from '@/types/enquiry';
import { samPersonsKey } from '@/types/sam-person';
import type { SAMPerson } from '@/types/sam-person';
import { EMPLOYEES_KEY } from '@/types/employee';
import type { Employee } from '@/types/employee';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }
type View = 'list' | 'form';

const STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: 'New', assigned: 'Assigned', pending: 'Pending', in_process: 'In Process',
  demo: 'Demo', on_hold: 'On Hold', forwarded: 'Forwarded', quote: 'Quote',
  agreed: 'Agreed', sold: 'Sold', lost: 'Lost',
};

const STATUS_COLOR: Record<EnquiryStatus, string> = {
  new: 'bg-muted text-muted-foreground border-border',
  assigned: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  pending: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  in_process: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  demo: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  on_hold: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  forwarded: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  quote: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  agreed: 'bg-green-500/15 text-green-700 border-green-500/30',
  sold: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  lost: 'bg-destructive/15 text-destructive border-destructive/30',
};

const TYPE_COLOR: Record<EnquiryType, string> = {
  existing: 'bg-teal-500/15 text-teal-700 border-teal-500/30',
  prospect: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  partner:  'bg-blue-500/15 text-blue-700 border-blue-500/30',
};

const STATUS_FILTERS: Array<{ id: 'all' | EnquiryStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'pending', label: 'Pending' },
  { id: 'demo', label: 'Demo' },
  { id: 'quote', label: 'Quote' },
  { id: 'agreed', label: 'Agreed' },
  { id: 'lost', label: 'Lost' },
];

function loadCfg(entityCode: string): SAMConfig | null {
  try {
    // [JWT] GET /api/compliance/comply360/sam/:entityCode
    const raw = localStorage.getItem(comply360SAMKey(entityCode));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function loadSAMPersons(entityCode: string): SAMPerson[] {
  try {
    // [JWT] GET /api/salesx/sam/persons?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(samPersonsKey(entityCode)) || '[]');
  } catch { return []; }
}
function loadEmployees(): Employee[] {
  try {
    // [JWT] GET /api/payhub/employees
    return JSON.parse(localStorage.getItem(EMPLOYEES_KEY) || '[]');
  } catch { return []; }
}
function loadCustomers(): Array<{ id: string; partyName: string }> {
  try {
    // [JWT] GET /api/masters/customers
    return JSON.parse(localStorage.getItem('erp_group_customer_master') || '[]');
  } catch { return []; }
}

const todayISO = () => new Date().toISOString().split('T')[0];
const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

type FormState = Omit<Enquiry, 'id' | 'enquiry_no' | 'entity_id' | 'created_at' | 'updated_at'>;

const blankForm = (): FormState => ({
  enquiry_date: todayISO(),
  enquiry_time: nowHHMM(),
  enquiry_type: 'existing',
  enquiry_source_id: null, enquiry_source_name: null,
  priority: 'medium',
  campaign: null,
  customer_id: null, customer_name: null,
  prospectus_id: null,
  partner_id: null, partner_name: null,
  contact_person: null, department: null, designation: null,
  email: null, mobile: null, phone: null,
  dealer_id: null, dealer_name: null,
  reference_id: null, reference_name: null,
  assigned_executive_id: null, assigned_executive_name: null,
  items: [],
  status: 'new',
  follow_ups: [],
  quotation_ids: [],
  opportunity_id: null, converted_at: null,
  is_active: true,
});

const blankFollowUp = (): Omit<EnquiryFollowUp, 'id' | 'user_name'> => ({
  date: todayISO(),
  time: nowHHMM(),
  follow_up_type: 'call',
  status: 'in_process',
  executive_id: null, executive_name: null,
  follow_up_date: null, follow_up_time: null,
  reason: null,
  remarks: '',
});

export function EnquiryCapturePanel({ entityCode }: Props) {
  const cfg = useMemo(() => loadCfg(entityCode), [entityCode]);
  const navigate = useNavigate();
  const {
    enquiries, createEnquiry, updateEnquiry, addFollowUp,
    convertEnquiryToQuotation,
  } = useEnquiries(entityCode);
  const { sources: enquirySources } = useEnquirySources(entityCode);
  const { campaigns } = useCampaigns(entityCode);
  const { findByCompanyName } = useProspects(entityCode);

  const samPersons = useMemo(() => loadSAMPersons(entityCode), [entityCode]);
  const employees = useMemo(() => loadEmployees(), []);
  const customers = useMemo(() => loadCustomers(), []);

  const [view, setView] = useState<View>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EnquiryStatus>('all');
  const [followUp, setFollowUp] = useState(blankFollowUp());
  const [followUpError, setFollowUpError] = useState(false);

  const update = useCallback((p: Partial<FormState>) =>
    setForm(prev => ({ ...prev, ...p })), []);

  const matchedProspects = useMemo(() => {
    if (form.enquiry_type !== 'prospect' || !form.contact_person) return [];
    return findByCompanyName(form.contact_person);
  }, [form.enquiry_type, form.contact_person, findByCompanyName]);

  const filtered = useMemo(() => {
    let list = enquiries;
    if (statusFilter !== 'all') list = list.filter(e => e.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.enquiry_no.toLowerCase().includes(q) ||
        (e.customer_name ?? '').toLowerCase().includes(q) ||
        (e.contact_person ?? '').toLowerCase().includes(q) ||
        (e.mobile ?? '').includes(q),
      );
    }
    return list.slice().sort((a, b) => b.enquiry_date.localeCompare(a.enquiry_date));
  }, [enquiries, statusFilter, search]);

  const handleNew = () => {
    setEditingId(null);
    setForm(blankForm());
    setView('form');
  };

  const handleEdit = (e: Enquiry) => {
    setEditingId(e.id);
    const { id, enquiry_no, entity_id, created_at, updated_at, ...rest } = e;
    setForm(rest);
    setView('form');
  };

  const handleSave = useCallback(() => {
    if (!form.enquiry_date) { toast.error('Enquiry date required'); return; }
    if (form.enquiry_type === 'existing' && !form.customer_id) {
      toast.error('Customer required'); return;
    }
    if (form.enquiry_type === 'prospect' && !form.contact_person) {
      toast.error('Company name required'); return;
    }
    if (editingId) {
      updateEnquiry(editingId, form);
    } else {
      createEnquiry(form);
    }
    setView('list');
  }, [form, editingId, updateEnquiry, createEnquiry]);

  /**
   * Sprint T-Phase-1.1.1a — Push-side Enquiry → Quotation conversion.
   * Closes the D-185 audit gap: Enquiry schema has quotation_ids[] +
   * converted_at fields but no UI button populated them. This handler
   * delegates to useEnquiries.convertEnquiryToQuotation (which calls
   * salesx-conversion-engine pure mappers), then routes the user to
   * the new Quotation in the transactions tab.
   */
  const handleConvertToQuotation = useCallback(() => {
    if (!editingId) {
      toast.error('Save the enquiry first');
      return;
    }
    const enq = enquiries.find(e => e.id === editingId);
    if (!enq) return;
    const eligibility = canConvertEnquiryToQuotation(enq);
    if (!eligibility.ok) {
      toast.error(`Cannot convert: ${eligibility.reason}`);
      return;
    }
    const result = convertEnquiryToQuotation(enq.id, getCurrentUserId(), 30);
    if (result) {
      // [JWT] navigation only · no API call
      // Write the target module into breadcrumb memory so SalesXPage
      // restores to 'sx-t-quotation' on mount. This is the existing
      // pattern used by SalesXPage line 185 (rememberModule call).
      rememberModule('salesx', 'sx-t-quotation');
      navigate('/erp/salesx');
    }
  }, [editingId, enquiries, convertEnquiryToQuotation, navigate]);

  useCtrlS(view === 'form' ? handleSave : () => {});

  const addItem = () =>
    update({
      items: [...form.items, {
        id: `item-${Date.now()}`,
        product_name: '', quantity: 1, unit: null, rate: null, amount: null,
        line_type: 'product',
      }],
    });
  const addServiceLine = () =>
    update({
      items: [...form.items, {
        id: `svc-${Date.now()}`,
        product_name: '', quantity: 1, unit: null, rate: null, amount: 0,
        line_type: 'service', ledger_name: '',
      }],
    });
  const updateItem = (idx: number, patch: Partial<EnquiryItem>) => {
    const items = form.items.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      const qty = merged.quantity ?? 0;
      const rate = merged.rate ?? 0;
      merged.amount = qty && rate ? qty * rate : null;
      return merged;
    });
    update({ items });
  };
  const removeItem = (idx: number) =>
    update({ items: form.items.filter((_, i) => i !== idx) });

  const updateFollowUp = (p: Partial<typeof followUp>) =>
    setFollowUp(prev => ({ ...prev, ...p }));

  const handleAddFollowUp = () => {
    if (!editingId) return;
    if ((followUp.status === 'lost' || followUp.status === 'on_hold') && !followUp.reason) {
      setFollowUpError(true);
      toast.error('Reason required for Lost / On Hold');
      return;
    }
    setFollowUpError(false);
    const fu: EnquiryFollowUp = {
      id: `fu-${Date.now()}`,
      ...followUp,
      user_name: 'Current User',
    };
    addFollowUp(editingId, fu);
    setForm(prev => ({
      ...prev,
      status: fu.status,
      follow_ups: [...prev.follow_ups, fu],
    }));
    setFollowUp(blankFollowUp());
  };

  const sortedFollowUps = useMemo(
    () => form.follow_ups.slice().sort((a, b) =>
      `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
    ),
    [form.follow_ups],
  );

  const _salesmen = samPersons.filter(p => p.person_type === 'salesman');
  void _salesmen;
  const dealers = samPersons.filter(p => p.person_type === 'agent' || p.person_type === 'broker');
  const references = samPersons.filter(p => p.person_type === 'reference');

  // ── LIST VIEW ─────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Enquiry Register</h1>
            <p className="text-sm text-muted-foreground">Capture and track sales enquiries</p>
          </div>
          <Button onClick={handleNew} data-primary className="bg-orange-500 hover:bg-orange-600">
            <Plus className="h-4 w-4 mr-2" />New Enquiry
          </Button>
        </div>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search no / company / contact / mobile"
                  className="pl-9"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {STATUS_FILTERS.map(f => (
                  <Button
                    key={f.id}
                    size="sm"
                    variant={statusFilter === f.id ? 'default' : 'outline'}
                    onClick={() => setStatusFilter(f.id)}
                    className={cn(
                      'h-7 text-xs',
                      statusFilter === f.id && 'bg-orange-500 hover:bg-orange-600',
                    )}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No enquiries match the current filters.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enquiry No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Company / Contact</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Next Follow-Up</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(e => {
                    const lastFu = e.follow_ups[e.follow_ups.length - 1];
                    const next = lastFu?.follow_up_date ?? '—';
                    return (
                      <TableRow key={e.id} className="cursor-pointer" onClick={() => handleEdit(e)}>
                        <TableCell className="font-mono text-xs">{e.enquiry_no}</TableCell>
                        <TableCell className="text-xs">{e.enquiry_date}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', TYPE_COLOR[e.enquiry_type])}>
                            {e.enquiry_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {e.customer_name ?? e.contact_person ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs capitalize">{e.priority}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', STATUS_COLOR[e.status])}>
                            {STATUS_LABEL[e.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{e.assigned_executive_name ?? '—'}</TableCell>
                        <TableCell className="text-xs">{next}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={ev => { ev.stopPropagation(); handleEdit(e); }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── FORM VIEW ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {editingId ? 'Edit Enquiry' : 'New Enquiry'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {editingId ? `Status: ${STATUS_LABEL[form.status]}` : 'Charis TDL UDF 4900-4942'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editingId && form.status !== 'lost' && form.status !== 'sold' && (
            <Button
              size="sm"
              variant="outline"
              className="border-blue-500/40 text-blue-700 hover:bg-blue-500/10"
              onClick={handleConvertToQuotation}
            >
              <ArrowRight className="h-4 w-4 mr-1.5" />Convert to Quotation
            </Button>
          )}
          <Button onClick={handleSave} data-primary className="bg-orange-500 hover:bg-orange-600">
            <Save className="h-4 w-4 mr-2" />Save Enquiry
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Enquiry Details</TabsTrigger>
          <TabsTrigger value="items">Product Interest</TabsTrigger>
          <TabsTrigger value="history">Follow-Up &amp; History</TabsTrigger>
        </TabsList>

        {/* TAB 1 — Details */}
        <TabsContent value="details">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Enquiry Date</label>
                  <SmartDateInput value={form.enquiry_date} onChange={v => update({ enquiry_date: v })} />
                </div>
                <div>
                  <label className="text-xs font-medium">Time</label>
                  <Input
                    type="time"
                    value={form.enquiry_time ?? ''}
                    onChange={e => update({ enquiry_time: e.target.value })}
                    onKeyDown={onEnterNext}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Enquiry Type</label>
                <div className="flex gap-2 mt-1">
                  {(['existing', 'prospect', 'partner'] as EnquiryType[]).map(t => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant={form.enquiry_type === t ? 'default' : 'outline'}
                      onClick={() => update({ enquiry_type: t })}
                      className={cn(
                        'capitalize',
                        form.enquiry_type === t && 'bg-orange-500 hover:bg-orange-600',
                      )}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>

              {form.enquiry_type === 'existing' && (
                <div>
                  <label className="text-xs font-medium">Customer</label>
                  <Select
                    value={form.customer_id ?? ''}
                    onValueChange={v => {
                      const c = customers.find(x => x.id === v);
                      update({ customer_id: v, customer_name: c?.partyName ?? null });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.partyName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.enquiry_type === 'prospect' && (
                <>
                  <div>
                    <label className="text-xs font-medium">Company Name</label>
                    <Input
                      value={form.contact_person ?? ''}
                      onChange={e => update({ contact_person: e.target.value })}
                      onKeyDown={onEnterNext}
                      placeholder="Company / contact name"
                    />
                  </div>
                  {matchedProspects.length > 0 && (
                    <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs">
                      Existing prospect found: <strong>{matchedProspects[0].company_name}</strong>
                      {matchedProspects[0].last_contacted &&
                        <> — Last contact: {matchedProspects[0].last_contacted}</>}
                      <Button
                        size="sm" variant="outline"
                        className="ml-3 h-6 text-xs"
                        onClick={() => {
                          const p = matchedProspects[0];
                          update({
                            prospectus_id: p.id,
                            email: p.email, mobile: p.mobile, phone: p.phone,
                          });
                          toast.success('Prospect data loaded');
                        }}
                      >
                        Use this prospectus
                      </Button>
                    </div>
                  )}
                </>
              )}

              {form.enquiry_type === 'partner' && (
                <div>
                  <label className="text-xs font-medium">Partner</label>
                  <Select
                    value={form.partner_id ?? ''}
                    onValueChange={v => {
                      const p = dealers.find(x => x.id === v);
                      update({ partner_id: v, partner_name: p?.display_name ?? null });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select partner (agent/broker)" /></SelectTrigger>
                    <SelectContent>
                      {dealers.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.display_name} ({p.person_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium">Priority</label>
                  <Select value={form.priority} onValueChange={v => update({ priority: v as EnquiryPriority })}>
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
                  <label className="text-xs font-medium">Source</label>
                  <Select
                    value={form.enquiry_source_id ?? ''}
                    onValueChange={v => {
                      const s = enquirySources.find(x => x.id === v);
                      update({
                        enquiry_source_id: v || null,
                        enquiry_source_name: s?.source_name ?? null,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        enquirySources.length === 0
                          ? 'No sources — add in master'
                          : 'Select source'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {enquirySources.length === 0 && (
                        <SelectItem value="none" disabled>No enquiry sources configured</SelectItem>
                      )}
                      {enquirySources.filter(s => s.is_active).map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.source_name} ({s.source_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Campaign</label>
                  <Select
                    value={form.campaign ?? '__none__'}
                    onValueChange={v => update({ campaign: v === '__none__' ? null : v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select campaign…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {campaigns.filter(c => c.is_active).map(c => (
                        <SelectItem key={c.id} value={c.campaign_code}>
                          {c.campaign_code} · {c.campaign_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium">Mobile</label>
                  <Input value={form.mobile ?? ''} onChange={e => update({ mobile: e.target.value })} onKeyDown={onEnterNext} />
                </div>
                <div>
                  <label className="text-xs font-medium">Email</label>
                  <Input value={form.email ?? ''} onChange={e => update({ email: e.target.value })} onKeyDown={onEnterNext} />
                </div>
                <div>
                  <label className="text-xs font-medium">Phone</label>
                  <Input value={form.phone ?? ''} onChange={e => update({ phone: e.target.value })} onKeyDown={onEnterNext} />
                </div>
              </div>

              {cfg?.enableAgentModule && (
                <div>
                  <label className="text-xs font-medium">Dealer / Agent</label>
                  <Select
                    value={form.dealer_id ?? ''}
                    onValueChange={v => {
                      const p = dealers.find(x => x.id === v);
                      update({ dealer_id: v, dealer_name: p?.display_name ?? null });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select dealer" /></SelectTrigger>
                    <SelectContent>
                      {dealers.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {cfg?.enableReference && (
                <div>
                  <label className="text-xs font-medium">Reference</label>
                  <Select
                    value={form.reference_id ?? ''}
                    onValueChange={v => {
                      const p = references.find(x => x.id === v);
                      update({ reference_id: v, reference_name: p?.display_name ?? null });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select reference" /></SelectTrigger>
                    <SelectContent>
                      {references.map(p => <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {cfg?.enableTelecalling && (
                <div>
                  <label className="text-xs font-medium">Assigned Executive / Telecaller</label>
                  <Select
                    value={form.assigned_executive_id ?? ''}
                    onValueChange={v => {
                      const emp = employees.find(e => e.id === v);
                      update({
                        assigned_executive_id: v,
                        assigned_executive_name: emp ? `${emp.firstName} ${emp.lastName}` : null,
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select executive" /></SelectTrigger>
                    <SelectContent>
                      {employees.length === 0 && (
                        <SelectItem value="none" disabled>No employees configured</SelectItem>
                      )}
                      {employees.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2 — Product Interest */}
        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Product Interest</CardTitle>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const productLines = form.items
                  .map((it, i) => ({ it, i }))
                  .filter(({ it }) => (it.line_type ?? 'product') === 'product');
                const serviceLines = form.items
                  .map((it, i) => ({ it, i }))
                  .filter(({ it }) => it.line_type === 'service');
                return (
                  <>
                    {productLines.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No product lines added.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="w-24">Qty</TableHead>
                            <TableHead className="w-24">Unit</TableHead>
                            <TableHead className="w-32">Rate</TableHead>
                            <TableHead className="w-32">Amount</TableHead>
                            <TableHead className="w-12" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {productLines.map(({ it, i }) => (
                            <TableRow key={it.id}>
                              <TableCell>
                                <Input
                                  value={it.product_name}
                                  onChange={e => updateItem(i, { product_name: e.target.value })}
                                  onKeyDown={onEnterNext}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={it.quantity}
                                  onChange={e => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })}
                                  onKeyDown={onEnterNext}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={it.unit ?? ''}
                                  onChange={e => updateItem(i, { unit: e.target.value })}
                                  onKeyDown={onEnterNext}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={it.rate ?? ''}
                                  onChange={e => updateItem(i, { rate: parseFloat(e.target.value) || null })}
                                  onKeyDown={onEnterNext}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {it.amount != null ? `₹${it.amount.toLocaleString('en-IN')}` : '—'}
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" onClick={() => removeItem(i)}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}

                    {/* Service / Ledger Lines — VCHEnquiryBodyLed */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-medium">Service / Ledger Lines</h4>
                        <Button size="sm" variant="outline" onClick={addServiceLine}>
                          <Plus className="h-3.5 w-3.5 mr-1" />Add
                        </Button>
                      </div>
                      {serviceLines.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center">No service / ledger lines.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Ledger Name</TableHead>
                              <TableHead className="w-40">Amount</TableHead>
                              <TableHead className="w-12" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {serviceLines.map(({ it, i }) => (
                              <TableRow key={it.id}>
                                <TableCell>
                                  <Input
                                    value={it.ledger_name ?? ''}
                                    onChange={e => updateItem(i, { ledger_name: e.target.value })}
                                    onKeyDown={onEnterNext}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    value={it.amount ?? ''}
                                    onChange={e => updateItem(i, { amount: parseFloat(e.target.value) || 0, rate: parseFloat(e.target.value) || 0, quantity: 1 })}
                                    onKeyDown={onEnterNext}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Button size="sm" variant="ghost" onClick={() => removeItem(i)}>
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3 — Follow-Up & History */}
        <TabsContent value="history">
          {!editingId ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Save the enquiry first, then add follow-up notes here.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Add Follow-Up</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium">Type</label>
                      <Select value={followUp.follow_up_type} onValueChange={v => updateFollowUp({ follow_up_type: v as FollowUpType })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="tasks">Tasks</SelectItem>
                          <SelectItem value="quote">Quote</SelectItem>
                          <SelectItem value="demo">Demo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Status</label>
                      <Select value={followUp.status} onValueChange={v => updateFollowUp({ status: v as EnquiryStatus })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABEL) as EnquiryStatus[]).map(s => (
                            <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium">Executive</label>
                      <Select
                        value={followUp.executive_id ?? ''}
                        onValueChange={v => {
                          const e = employees.find(x => x.id === v);
                          updateFollowUp({
                            executive_id: v,
                            executive_name: e ? `${e.firstName} ${e.lastName}` : null,
                          });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {employees.length === 0 && (
                            <SelectItem value="none" disabled>No employees</SelectItem>
                          )}
                          {employees.map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium">Follow-Up Date</label>
                      <SmartDateInput
                        value={followUp.follow_up_date ?? ''}
                        onChange={v => updateFollowUp({ follow_up_date: v || null })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Follow-Up Time</label>
                      <Input
                        type="time"
                        value={followUp.follow_up_time ?? ''}
                        onChange={e => updateFollowUp({ follow_up_time: e.target.value || null })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">
                        Reason {(followUp.status === 'lost' || followUp.status === 'on_hold') && <span className="text-destructive">*</span>}
                      </label>
                      <Input
                        value={followUp.reason ?? ''}
                        onChange={e => updateFollowUp({ reason: e.target.value })}
                        className={cn(followUpError && 'border-destructive')}
                        onKeyDown={onEnterNext}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium">Remarks</label>
                    <Textarea
                      value={followUp.remarks}
                      onChange={e => updateFollowUp({ remarks: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleAddFollowUp} data-primary className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="h-3.5 w-3.5 mr-1" />Add Follow-Up
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    History Trail
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      {sortedFollowUps.length} follow-up record{sortedFollowUps.length === 1 ? '' : 's'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sortedFollowUps.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No follow-up history yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Executive</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedFollowUps.map(fu => (
                          <TableRow key={fu.id}>
                            <TableCell className="text-xs">{fu.date}</TableCell>
                            <TableCell className="text-xs">{fu.time}</TableCell>
                            <TableCell className="text-xs capitalize">{fu.follow_up_type}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn('text-xs', STATUS_COLOR[fu.status])}>
                                {STATUS_LABEL[fu.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{fu.executive_name ?? '—'}</TableCell>
                            <TableCell className="text-xs">{fu.remarks || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnquiryCapturePanel;
