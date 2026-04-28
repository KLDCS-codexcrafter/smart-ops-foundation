/**
 * CampaignMaster.tsx — Canvas Wave 1 · 4-tab form + register table
 * Sprint T-Phase-1.1.1b SalesX.
 */
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Plus, Save, Trash2, X, Search } from 'lucide-react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import type {
  Campaign, CampaignStatus, CampaignType, CommunicationChannel,
  CampaignBudget, OutcomeTracking, TargetFilters, FollowUpRule,
} from '@/types/campaign';
import {
  CAMPAIGN_TYPE_LABELS, CHANNEL_LABELS, computeMetrics,
  defaultBudget, defaultOutcomeTracking, defaultTargetFilters, defaultFollowUpRule,
} from '@/types/campaign';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

interface FormState {
  campaign_code: string;
  campaign_name: string;
  campaign_type: CampaignType;
  communication_channels: CommunicationChannel[];
  start_date: string;
  end_date: string;
  status: CampaignStatus;
  description: string;
  is_active: boolean;
  budget: CampaignBudget;
  target_filters: TargetFilters;
  follow_up_rule: FollowUpRule;
  outcome: OutcomeTracking;
  editingId: string | null;
}

const todayISO = () => new Date().toISOString().split('T')[0];

const blankForm = (): FormState => ({
  campaign_code: '',
  campaign_name: '',
  campaign_type: 'CALL',
  communication_channels: [],
  start_date: todayISO(),
  end_date: '',
  status: 'planned',
  description: '',
  is_active: true,
  budget: defaultBudget(),
  target_filters: defaultTargetFilters(),
  follow_up_rule: defaultFollowUpRule(),
  outcome: defaultOutcomeTracking(),
  editingId: null,
});

const STATUS_COLOR: Record<CampaignStatus, string> = {
  planned: 'bg-muted text-muted-foreground border-border',
  active: 'bg-green-500/15 text-green-700 border-green-500/30',
  completed: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

const TYPE_COLOR: Record<CampaignType, string> = {
  CALL: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
  SMS: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30',
  WA: 'bg-green-500/15 text-green-700 border-green-500/30',
  EMAIL: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  VISIT: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  MEET: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  WEB: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30',
  EXPO: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  EVENT: 'bg-pink-500/15 text-pink-700 border-pink-500/30',
  DEMO: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  XSELL: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  UPSELL: 'bg-teal-500/15 text-teal-700 border-teal-500/30',
  RET: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  WINBACK: 'bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30',
  REFER: 'bg-lime-500/15 text-lime-700 border-lime-500/30',
  SURVEY: 'bg-violet-500/15 text-violet-700 border-violet-500/30',
  PARTNER: 'bg-stone-500/15 text-stone-700 border-stone-500/30',
  CSR: 'bg-red-500/15 text-red-700 border-red-500/30',
  GEO: 'bg-blue-600/15 text-blue-800 border-blue-600/30',
  AI: 'bg-orange-600/15 text-orange-800 border-orange-600/30',
};

const CHANNEL_KEYS = Object.keys(CHANNEL_LABELS) as CommunicationChannel[];
const TYPE_KEYS = Object.keys(CAMPAIGN_TYPE_LABELS) as CampaignType[];

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const fmtINR = (n: number | null | undefined) => n != null ? `₹${inrFmt.format(n)}` : '—';

export function CampaignMasterPanel({ entityCode }: Props) {
  const { campaigns, saveCampaign, deleteCampaign } = useCampaigns(entityCode);
  const [form, setForm] = useState<FormState>(blankForm);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<CampaignType | 'all'>('all');

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return campaigns.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (typeFilter !== 'all' && c.campaign_type !== typeFilter) return false;
      if (q && !c.campaign_code.toLowerCase().includes(q) &&
          !c.campaign_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [campaigns, searchText, statusFilter, typeFilter]);

  const kpis = useMemo(() => {
    const active = campaigns.filter(c => c.status === 'active').length;
    let totalBudget = 0, totalRevenue = 0, totalEnq = 0;
    campaigns.forEach(c => {
      totalBudget += c.budget_breakdown?.total ?? c.budget ?? 0;
      totalRevenue += c.outcome_tracking?.revenue_attributed ?? 0;
      totalEnq += c.outcome_tracking?.enquiries_generated ?? 0;
    });
    return { active, totalBudget, totalRevenue, totalEnq };
  }, [campaigns]);

  const setBudgetField = (k: keyof CampaignBudget, v: number) => {
    setForm(p => {
      const next = { ...p.budget, [k]: v };
      const total = next.creative + next.media + next.events + next.incentives +
                    next.staff + next.technology + next.misc;
      return { ...p, budget: { ...next, total } };
    });
  };

  const setOutcome = (k: keyof OutcomeTracking, v: number) => {
    setForm(p => ({ ...p, outcome: { ...p.outcome, [k]: v } }));
  };

  const toggleChannel = (ch: CommunicationChannel) => {
    setForm(p => ({
      ...p,
      communication_channels: p.communication_channels.includes(ch)
        ? p.communication_channels.filter(c => c !== ch)
        : [...p.communication_channels, ch],
    }));
  };

  const handleSave = useCallback(() => {
    if (!form.campaign_code.trim()) { toast.error('Campaign code required'); return; }
    if (!form.campaign_name.trim()) { toast.error('Campaign name required'); return; }
    if (!form.start_date) { toast.error('Start date required'); return; }
    if (form.end_date && form.end_date < form.start_date) {
      toast.error('End date cannot be before start date'); return;
    }
    const dup = campaigns.find(c =>
      c.campaign_code.toUpperCase() === form.campaign_code.toUpperCase() && c.id !== form.editingId);
    if (dup) { toast.error(`Code ${form.campaign_code} already exists`); return; }

    const metrics = computeMetrics(form.budget, form.outcome);

    saveCampaign({
      id: form.editingId ?? undefined,
      entity_id: entityCode,
      campaign_code: form.campaign_code.toUpperCase().trim(),
      campaign_name: form.campaign_name.trim(),
      campaign_type: form.campaign_type,
      communication_channels: form.communication_channels,
      start_date: form.start_date,
      end_date: form.end_date || null,
      budget: form.budget.total || null,
      budget_breakdown: form.budget,
      target_filters: form.target_filters,
      follow_up_rule: form.follow_up_rule,
      outcome_tracking: form.outcome,
      performance_metrics: metrics,
      status: form.status,
      description: form.description.trim() || null,
      is_active: form.is_active,
    });
    toast.success(form.editingId ? 'Campaign updated' : 'Campaign added');
    setForm(blankForm());
  }, [form, campaigns, saveCampaign, entityCode]);

  const isFormActive = !!(form.campaign_name.trim() || form.editingId);
  useCtrlS(isFormActive ? handleSave : () => {});

  const handleEdit = (c: Campaign) => {
    setForm({
      campaign_code: c.campaign_code,
      campaign_name: c.campaign_name,
      campaign_type: c.campaign_type,
      communication_channels: c.communication_channels ?? [],
      start_date: c.start_date,
      end_date: c.end_date ?? '',
      status: c.status,
      description: c.description ?? '',
      is_active: c.is_active,
      budget: c.budget_breakdown ?? defaultBudget(),
      target_filters: c.target_filters ?? defaultTargetFilters(),
      follow_up_rule: c.follow_up_rule ?? defaultFollowUpRule(),
      outcome: c.outcome_tracking ?? defaultOutcomeTracking(),
      editingId: c.id,
    });
  };

  const livePreview = useMemo(
    () => computeMetrics(form.budget, form.outcome),
    [form.budget, form.outcome],
  );

  return (
    <div data-keyboard-form className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active Campaigns</p>
          <p className="text-2xl font-bold font-mono mt-1">{kpis.active}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Budget</p>
          <p className="text-2xl font-bold font-mono mt-1 text-orange-500">{fmtINR(kpis.totalBudget)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue Attributed</p>
          <p className="text-2xl font-bold font-mono mt-1 text-green-600">{fmtINR(kpis.totalRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Enquiries Generated</p>
          <p className="text-2xl font-bold font-mono mt-1">{kpis.totalEnq}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT: register */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Marketing Campaigns ({filtered.length})</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setForm(blankForm())}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="Search code / name…"
                  className="h-8 pl-7 text-xs"
                />
              </div>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={v => setTypeFilter(v as typeof typeFilter)}>
                <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">All Types</SelectItem>
                  {TYPE_KEYS.map(t => (
                    <SelectItem key={t} value={t}>{t} · {CAMPAIGN_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No campaigns match the filter.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Code</TableHead>
                    <TableHead className="text-xs">Name / Type</TableHead>
                    <TableHead className="text-xs">Period</TableHead>
                    <TableHead className="text-xs text-right">Budget / Spent</TableHead>
                    <TableHead className="text-xs text-right">Enq / Ord</TableHead>
                    <TableHead className="text-xs text-right">ROI %</TableHead>
                    <TableHead className="text-xs w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(c => {
                    const roi = c.performance_metrics?.roi_pct ?? 0;
                    const enq = c.outcome_tracking?.enquiries_generated ?? 0;
                    const ord = c.outcome_tracking?.orders_converted ?? 0;
                    const bud = c.budget_breakdown?.total ?? c.budget ?? 0;
                    const spent = c.budget_breakdown?.actual_spent ?? 0;
                    return (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => handleEdit(c)}>
                        <TableCell className="text-xs font-mono">{c.campaign_code}</TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{c.campaign_name}</div>
                          <div className="flex gap-1 mt-0.5">
                            <Badge variant="outline" className={cn('text-[9px] px-1', TYPE_COLOR[c.campaign_type])}>
                              {c.campaign_type}
                            </Badge>
                            <Badge variant="outline" className={cn('text-[9px] px-1 capitalize', STATUS_COLOR[c.status])}>
                              {c.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-[11px] font-mono">
                          {c.start_date}{c.end_date ? ` → ${c.end_date}` : ''}
                        </TableCell>
                        <TableCell className="text-[11px] text-right font-mono">
                          <div>{fmtINR(bud)}</div>
                          <div className="text-muted-foreground">{fmtINR(spent)}</div>
                        </TableCell>
                        <TableCell className="text-[11px] text-right font-mono">
                          {enq} / {ord}
                        </TableCell>
                        <TableCell className={cn(
                          'text-xs text-right font-mono font-bold',
                          roi > 0 ? 'text-green-600' : roi < 0 ? 'text-destructive' : 'text-muted-foreground',
                        )}>
                          {roi.toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); deleteCampaign(c.id); }}>
                            <Trash2 className="h-3 w-3 text-destructive" />
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

        {/* RIGHT: 4-tab form */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {form.editingId ? 'Edit Campaign' : 'New Campaign'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic">
              <TabsList className="grid grid-cols-4 h-8">
                <TabsTrigger value="basic" className="text-xs">Basic</TabsTrigger>
                <TabsTrigger value="budget" className="text-xs">Budget</TabsTrigger>
                <TabsTrigger value="rules" className="text-xs">Rules</TabsTrigger>
                <TabsTrigger value="outcome" className="text-xs">Outcome</TabsTrigger>
              </TabsList>

              {/* TAB 1 — Basic */}
              <TabsContent value="basic" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Code *</Label>
                    <Input
                      value={form.campaign_code}
                      onChange={e => setForm(p => ({ ...p, campaign_code: e.target.value.toUpperCase().slice(0, 16) }))}
                      onKeyDown={onEnterNext}
                      placeholder="DIWALI24"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as CampaignStatus }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Campaign Name *</Label>
                  <Input
                    value={form.campaign_name}
                    onChange={e => setForm(p => ({ ...p, campaign_name: e.target.value }))}
                    onKeyDown={onEnterNext}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Campaign Type</Label>
                  <Select value={form.campaign_type} onValueChange={v => setForm(p => ({ ...p, campaign_type: v as CampaignType }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {TYPE_KEYS.map(t => (
                        <SelectItem key={t} value={t}>
                          <span className="font-mono mr-2">{t}</span>{CAMPAIGN_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Start Date *</Label>
                    <SmartDateInput value={form.start_date} onChange={v => setForm(p => ({ ...p, start_date: v }))} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">End Date</Label>
                    <SmartDateInput value={form.end_date} onChange={v => setForm(p => ({ ...p, end_date: v }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Communication Channels</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {CHANNEL_KEYS.map(ch => {
                      const on = form.communication_channels.includes(ch);
                      return (
                        <label
                          key={ch}
                          className={cn(
                            'flex items-center gap-1.5 px-2 py-1 rounded-full border cursor-pointer text-[11px]',
                            on
                              ? 'bg-orange-500/15 text-orange-600 border-orange-500/40'
                              : 'bg-muted text-muted-foreground border-border',
                          )}
                        >
                          <Checkbox
                            checked={on}
                            onCheckedChange={() => toggleChannel(ch)}
                            className="h-3 w-3"
                          />
                          {CHANNEL_LABELS[ch]}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="text-xs"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Active</Label>
                  <Switch checked={form.is_active}
                    onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                </div>
              </TabsContent>

              {/* TAB 2 — Budget */}
              <TabsContent value="budget" className="space-y-2 mt-3">
                <div className="text-[11px] p-2 rounded border border-border bg-muted/40 text-muted-foreground">
                  Itemise the budget below — total auto-sums.
                </div>
                {([
                  ['creative',   'Creative & Design'],
                  ['media',      'Media / Paid Reach'],
                  ['events',     'Events & Logistics'],
                  ['incentives', 'Incentives & Gifts'],
                  ['staff',      'Staff / Manpower'],
                  ['technology', 'Technology / Tools'],
                  ['misc',       'Miscellaneous'],
                ] as Array<[keyof CampaignBudget, string]>).map(([k, label]) => (
                  <div key={k} className="grid grid-cols-2 items-center gap-2">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      type="number"
                      value={form.budget[k] || ''}
                      onChange={e => setBudgetField(k, Number(e.target.value) || 0)}
                      onKeyDown={onEnterNext}
                      className="h-8 text-xs font-mono text-right"
                    />
                  </div>
                ))}
                <div className="grid grid-cols-2 items-center gap-2 pt-2 border-t">
                  <Label className="text-xs font-bold text-orange-500">Total Budget</Label>
                  <div className="text-right font-mono text-sm font-bold text-orange-500">
                    {fmtINR(form.budget.total)}
                  </div>
                </div>
                <div className="grid grid-cols-2 items-center gap-2">
                  <Label className="text-xs text-destructive">Actual Spent</Label>
                  <Input
                    type="number"
                    value={form.budget.actual_spent || ''}
                    onChange={e => setBudgetField('actual_spent', Number(e.target.value) || 0)}
                    onKeyDown={onEnterNext}
                    className="h-8 text-xs font-mono text-right"
                  />
                </div>
              </TabsContent>

              {/* TAB 3 — Rules */}
              <TabsContent value="rules" className="space-y-4 mt-3">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Target Audience</p>
                  <div>
                    <Label className="text-xs text-muted-foreground">Customer Type</Label>
                    <Select value={form.target_filters.customer_type}
                      onValueChange={v => setForm(p => ({ ...p, target_filters: { ...p.target_filters, customer_type: v as TargetFilters['customer_type'] } }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="existing">Existing</SelectItem>
                        <SelectItem value="lapsed">Lapsed</SelectItem>
                        <SelectItem value="prospect">Prospects</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Min Purchase (₹)</Label>
                      <Input type="number"
                        value={form.target_filters.min_purchase_value ?? ''}
                        onChange={e => setForm(p => ({ ...p, target_filters: { ...p.target_filters, min_purchase_value: e.target.value ? Number(e.target.value) : null } }))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Last Purchase Days</Label>
                      <Input type="number"
                        value={form.target_filters.last_purchase_days ?? ''}
                        onChange={e => setForm(p => ({ ...p, target_filters: { ...p.target_filters, last_purchase_days: e.target.value ? Number(e.target.value) : null } }))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Segment Tags (comma-separated)</Label>
                    <Input
                      value={form.target_filters.tags.join(', ')}
                      onChange={e => setForm(p => ({ ...p, target_filters: { ...p.target_filters, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) } }))}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase text-muted-foreground">Follow-Up Rule</p>
                    <Switch checked={form.follow_up_rule.enabled}
                      onCheckedChange={v => setForm(p => ({ ...p, follow_up_rule: { ...p.follow_up_rule, enabled: v } }))} />
                  </div>
                  {form.follow_up_rule.enabled && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Auto-create Enquiry</Label>
                        <Switch checked={form.follow_up_rule.auto_create_enquiry}
                          onCheckedChange={v => setForm(p => ({ ...p, follow_up_rule: { ...p.follow_up_rule, auto_create_enquiry: v } }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Follow-up after (days)</Label>
                          <Input type="number"
                            value={form.follow_up_rule.follow_up_days}
                            onChange={e => setForm(p => ({ ...p, follow_up_rule: { ...p.follow_up_rule, follow_up_days: Number(e.target.value) || 0 } }))}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Max follow-ups</Label>
                          <Input type="number"
                            value={form.follow_up_rule.max_follow_ups}
                            onChange={e => setForm(p => ({ ...p, follow_up_rule: { ...p.follow_up_rule, max_follow_ups: Number(e.target.value) || 0 } }))}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Default reminder note</Label>
                        <Textarea
                          value={form.follow_up_rule.reminder_note ?? ''}
                          onChange={e => setForm(p => ({ ...p, follow_up_rule: { ...p.follow_up_rule, reminder_note: e.target.value || null } }))}
                          rows={2} className="text-xs"
                        />
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* TAB 4 — Outcome */}
              <TabsContent value="outcome" className="space-y-2 mt-3">
                <div className="text-[11px] p-2 rounded border border-border bg-muted/40 text-muted-foreground">
                  Track actual campaign results. Metrics auto-compute on Save.
                </div>
                {([
                  ['target_reach',         'Target Reach'],
                  ['actual_reach',         'Actual Reach'],
                  ['responses',            'Responses'],
                  ['enquiries_generated',  'Enquiries Generated'],
                  ['quotations_generated', 'Quotations Created'],
                  ['orders_converted',     'Orders Converted'],
                  ['revenue_attributed',   'Revenue Attributed (₹)'],
                ] as Array<[keyof OutcomeTracking, string]>).map(([k, label]) => (
                  <div key={k} className="grid grid-cols-2 items-center gap-2">
                    <Label className="text-xs">{label}</Label>
                    <Input type="number"
                      value={form.outcome[k] || ''}
                      onChange={e => setOutcome(k, Number(e.target.value) || 0)}
                      onKeyDown={onEnterNext}
                      className="h-8 text-xs font-mono text-right"
                    />
                  </div>
                ))}

                {form.outcome.actual_reach > 0 && (
                  <div className="rounded-lg border-2 border-orange-500/50 p-3 mt-3 space-y-1 bg-orange-500/5">
                    <p className="text-[11px] font-bold uppercase text-orange-600">Performance Preview</p>
                    <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
                      <span className="text-muted-foreground">Response Rate:</span>
                      <span className="text-right">{livePreview.response_rate}%</span>
                      <span className="text-muted-foreground">Enquiry Conv.:</span>
                      <span className="text-right">{livePreview.enquiry_conversion_rate}%</span>
                      <span className="text-muted-foreground">Order Conv.:</span>
                      <span className="text-right">{livePreview.order_conversion_rate}%</span>
                      <span className="text-muted-foreground">Cost / Enquiry:</span>
                      <span className="text-right">{fmtINR(livePreview.cost_per_enquiry)}</span>
                      <span className="text-muted-foreground">Cost / Order:</span>
                      <span className="text-right">{fmtINR(livePreview.cost_per_order)}</span>
                      <span className="text-muted-foreground font-bold">ROI:</span>
                      <span className={cn('text-right font-bold',
                        livePreview.roi_pct > 0 ? 'text-green-600' :
                        livePreview.roi_pct < 0 ? 'text-destructive' : '')}>
                        {livePreview.roi_pct}%
                      </span>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-2 pt-3 mt-3 border-t">
              <Button data-primary size="sm" onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
                <Save className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setForm(blankForm())}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CampaignMaster(props: Props) {
  return <CampaignMasterPanel {...props} />;
}
