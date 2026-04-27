/**
 * @file     AutoPayRulesEditor.tsx
 * @purpose  Auto-Pay Rules CRUD · 3 trigger types (recurring · threshold ·
 *           on_invoice_post) · "Run Auto-Pay Now" displays evaluateRulesNow
 *           candidates. Phase 1 manual trigger only · NO cron · NO setTimeout.
 * @sprint   T-T8.7-SmartAP (Group B Sprint B.7)
 *
 * Pure presentation · IMPORTS engine functions only.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Repeat, Power, PowerOff, Trash2, Play, Edit2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import {
  listRules, createRule, deleteRule, toggleRule, evaluateRulesNow,
  markRuleExecuted, updateRule,
} from '@/lib/auto-pay-engine';
import type {
  AutoPayRule, AutoPayTriggerType, RecurringSchedule, AutoPayCandidate,
} from '@/types/smart-ap';
import type { PaymentRequisition } from '@/types/payment-requisition';
import { paymentRequisitionsKey } from '@/types/payment-requisition';

const inr = (n: number): string =>
  '₹' + Math.abs(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const TRIGGER_LABEL: Record<AutoPayTriggerType, string> = {
  recurring:        'Recurring schedule',
  threshold:        'Threshold amount',
  on_invoice_post:  'On invoice post',
};

interface Props { entityCode: string; }

function loadRequisitions(entityCode: string): PaymentRequisition[] {
  try {
    const raw = localStorage.getItem(paymentRequisitionsKey(entityCode));
    return raw ? (JSON.parse(raw) as PaymentRequisition[]) : [];
  } catch { return []; }
}

function AutoPayRulesEditorPanel({ entityCode }: Props) {
  const [refreshTick, setRefreshTick] = useState(0);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form state for new/edit
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<AutoPayTriggerType>('recurring');
  const [cadence, setCadence] = useState<RecurringSchedule['cadence']>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [thresholdAmount, setThresholdAmount] = useState<number>(50000);
  const [templateId, setTemplateId] = useState<string>('');
  const [vendorId, setVendorId] = useState<string>('');

  const refresh = (): void => setRefreshTick(x => x + 1);

  const rules = useMemo(() => {
    void refreshTick;
    return listRules(entityCode);
  }, [entityCode, refreshTick]);

  const reqs = useMemo(() => {
    void refreshTick;
    return loadRequisitions(entityCode);
  }, [entityCode, refreshTick]);

  const approvedReqs = useMemo(() => reqs.filter(r => r.status === 'approved'), [reqs]);
  const allReqs = reqs;

  const [candidates, setCandidates] = useState<AutoPayCandidate[]>([]);

  const resetForm = (): void => {
    setEditingRuleId(null);
    setName('');
    setTrigger('recurring');
    setCadence('monthly');
    setDayOfMonth(1);
    setDayOfWeek(1);
    setThresholdAmount(50000);
    setTemplateId('');
    setVendorId('');
  };

  const handleEdit = (r: AutoPayRule): void => {
    setEditingRuleId(r.id);
    setName(r.name);
    setTrigger(r.trigger_type);
    if (r.recurring_schedule) {
      setCadence(r.recurring_schedule.cadence);
      setDayOfMonth(r.recurring_schedule.day_of_month ?? 1);
      setDayOfWeek(r.recurring_schedule.day_of_week ?? 1);
    }
    setThresholdAmount(r.threshold_amount ?? 50000);
    setTemplateId(r.payment_template_id ?? '');
    setVendorId(r.vendor_id ?? '');
  };

  const handleSubmit = (): void => {
    if (!name.trim()) { toast.error('Rule name required'); return; }
    try {
      const schedule: RecurringSchedule | undefined = trigger === 'recurring'
        ? { cadence,
            day_of_month: cadence === 'monthly' ? dayOfMonth : undefined,
            day_of_week: cadence === 'weekly' ? (dayOfWeek as RecurringSchedule['day_of_week']) : undefined }
        : undefined;
      const template = allReqs.find(r => r.id === templateId);
      if (editingRuleId) {
        updateRule(entityCode, editingRuleId, {
          name,
          trigger_type: trigger,
          recurring_schedule: schedule,
          threshold_amount: trigger === 'threshold' ? thresholdAmount : undefined,
          payment_template_id: templateId || undefined,
          payment_template_label: template ? `${template.vendor_name ?? template.requested_by_name} · ${inr(template.amount)}` : undefined,
          vendor_id: vendorId || undefined,
          vendor_name: template?.vendor_name,
        });
        toast.success('Rule updated');
      } else {
        createRule({
          entityCode,
          name,
          trigger_type: trigger,
          recurring_schedule: schedule,
          threshold_amount: trigger === 'threshold' ? thresholdAmount : undefined,
          payment_template_id: templateId || undefined,
          payment_template_label: template ? `${template.vendor_name ?? template.requested_by_name} · ${inr(template.amount)}` : undefined,
          vendor_id: vendorId || undefined,
          vendor_name: template?.vendor_name,
        });
        toast.success('Rule created');
      }
      resetForm();
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = (id: string): void => {
    deleteRule(entityCode, id);
    if (editingRuleId === id) resetForm();
    refresh();
    toast.success('Rule deleted');
  };

  const handleToggle = (id: string, on: boolean): void => {
    toggleRule(entityCode, id, on);
    refresh();
  };

  const handleEvaluate = (): void => {
    const found = evaluateRulesNow(entityCode);
    setCandidates(found);
    toast.success(`${found.length} rule(s) ready to fire`);
  };

  const handleMarkExecuted = (id: string): void => {
    markRuleExecuted(entityCode, id);
    setCandidates(prev => prev.filter(c => c.rule.id !== id));
    refresh();
    toast.success('Rule marked executed · next_run_at advanced');
  };

  // Pre-evaluate on load + every refresh
  useEffect(() => {
    setCandidates(evaluateRulesNow(entityCode));
  }, [entityCode, refreshTick]);

  // Distinct vendor list from all requisitions
  const vendorOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of allReqs) {
      if (r.vendor_id) map.set(r.vendor_id, r.vendor_name ?? r.vendor_id);
    }
    return [...map.entries()];
  }, [allReqs]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {editingRuleId
                ? <><Edit2 className="h-4 w-4 text-violet-500" />Edit Rule</>
                : <><Plus className="h-4 w-4 text-violet-500" />New Rule</>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)}
                className="text-xs h-8" placeholder="e.g. Monthly rent · GST · ESI" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Trigger Type</label>
              <Select value={trigger} onValueChange={(v) => setTrigger(v as AutoPayTriggerType)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring" className="text-xs">Recurring schedule</SelectItem>
                  <SelectItem value="threshold" className="text-xs">Threshold amount</SelectItem>
                  <SelectItem value="on_invoice_post" className="text-xs">On invoice post</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {trigger === 'recurring' && (
              <>
                <div>
                  <label className="text-xs font-medium mb-1 block">Cadence</label>
                  <Select value={cadence} onValueChange={(v) => setCadence(v as RecurringSchedule['cadence'])}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                      <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                      <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {cadence === 'monthly' && (
                  <div>
                    <label className="text-xs font-medium mb-1 block">Day of Month (1-28)</label>
                    <Input type="number" min={1} max={28} value={dayOfMonth}
                      onChange={e => setDayOfMonth(Math.max(1, Math.min(28, parseInt(e.target.value, 10) || 1)))}
                      className="text-xs h-8" />
                  </div>
                )}
                {cadence === 'weekly' && (
                  <div>
                    <label className="text-xs font-medium mb-1 block">Day of Week</label>
                    <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(parseInt(v, 10))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                          <SelectItem key={i} value={String(i)} className="text-xs">{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {trigger === 'threshold' && (
              <div>
                <label className="text-xs font-medium mb-1 block">Threshold Amount (₹)</label>
                <Input type="number" min={0} value={thresholdAmount}
                  onChange={e => setThresholdAmount(parseFloat(e.target.value) || 0)}
                  className="text-xs h-8 font-mono" />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Auto-pay any approved requisition ≤ this amount.
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium mb-1 block">Payment Template (optional)</label>
              <Select value={templateId || '__none__'} onValueChange={(v) => setTemplateId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick a requisition as template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">None</SelectItem>
                  {approvedReqs.slice(0, 50).map(r => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.vendor_name ?? r.requested_by_name} · {inr(r.amount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Vendor scope (optional)</label>
              <Select value={vendorId || '__none__'} onValueChange={(v) => setVendorId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All vendors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">All vendors</SelectItem>
                  {vendorOptions.map(([id, n]) => (
                    <SelectItem key={id} value={id} className="text-xs">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} size="sm" className="flex-1">
                {editingRuleId ? 'Update Rule' : 'Create Rule'}
              </Button>
              {editingRuleId && (
                <Button onClick={resetForm} size="sm" variant="outline">Cancel</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rules table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-violet-500" />
                Auto-Pay Rules ({rules.length})
              </span>
              <Button size="sm" variant="outline" onClick={handleEvaluate}>
                <Play className="h-3.5 w-3.5 mr-1" />Run Auto-Pay Now
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rules.length === 0
              ? <p className="text-xs text-muted-foreground">No rules yet · create one on the left.</p>
              : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">On</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Detail</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map(r => (
                      <TableRow key={r.id} className="text-xs">
                        <TableCell>
                          <Switch checked={r.enabled} onCheckedChange={(v) => handleToggle(r.id, v)} />
                        </TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px]">
                            {TRIGGER_LABEL[r.trigger_type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.trigger_type === 'recurring' && r.recurring_schedule
                            ? `${r.recurring_schedule.cadence}${r.recurring_schedule.day_of_month ? ` · day ${r.recurring_schedule.day_of_month}` : ''}`
                            : r.trigger_type === 'threshold'
                              ? `≤ ${inr(r.threshold_amount ?? 0)}`
                              : 'Any new approved req'}
                        </TableCell>
                        <TableCell className="font-mono text-[10px]">
                          {r.next_run_at ? new Date(r.next_run_at).toLocaleString('en-IN', { hour12: false }) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(r)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>
      </div>

      {/* Candidates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {candidates.length > 0
              ? <Power className="h-4 w-4 text-emerald-600" />
              : <PowerOff className="h-4 w-4 text-muted-foreground" />}
            Candidates Ready to Fire ({candidates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length === 0
            ? <p className="text-xs text-muted-foreground">
                No rules are currently due. Click "Run Auto-Pay Now" to re-evaluate.
              </p>
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Matched Requisition</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map(c => (
                    <TableRow key={c.rule.id} className="text-xs">
                      <TableCell className="font-medium">{c.rule.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.reason}</TableCell>
                      <TableCell className="font-mono">{c.matched_requisition_id ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline"
                          onClick={() => handleMarkExecuted(c.rule.id)}>
                          Mark Executed
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

interface ExternalProps { entityCode?: string; }

export function AutoPayRulesEditorScreen() { return <AutoPayRulesEditor />; }

export default function AutoPayRulesEditor({ entityCode: passed }: ExternalProps = {}) {
  const { entityCode: ctx } = useEntityCode();
  const entityCode = passed ?? ctx;
  if (!entityCode) {
    return <SelectCompanyGate
      title="Select a company to manage Auto-Pay Rules"
      description="Auto-Pay Rules are scoped to a specific company." />;
  }
  return <AutoPayRulesEditorPanel entityCode={entityCode} />;
}
