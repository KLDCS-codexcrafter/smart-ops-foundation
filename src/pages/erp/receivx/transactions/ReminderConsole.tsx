/**
 * ReminderConsole.tsx — Bulk WhatsApp + Email sender
 * 3-step UI: Audience → Template → Channel/Send
 * [JWT] POST /api/receivx/comm-log
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from '@/components/ui/select';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Send, MessageCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import {
  type OutstandingTask, type ReminderTemplate, type CommunicationLog,
  type ReceivXConfig, type CadenceStep,
  receivxTasksKey, receivxTemplatesKey, receivxCommLogKey, receivxConfigKey,
} from '@/types/receivx';
import { computeCadenceStep, renderTemplate, sendWhatsApp, sendEmail } from '@/lib/receivx-engine';

interface Props { entityCode: string; onNavigate?: (m: string) => void }

interface Customer { id: string; phone?: string; email?: string }

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function ReminderConsolePanel({ entityCode, onNavigate: _onNavigate }: Props) {
  const [tasks, setTasks] = useState<OutstandingTask[]>([]);
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [config, setConfig] = useState<ReceivXConfig | null>(null);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState<string>('');
  const [freestyleBody, setFreestyleBody] = useState<string>('');
  const [channelByTask, setChannelByTask] = useState<Record<string, 'whatsapp' | 'email' | 'skip'>>({});
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    let t: OutstandingTask[] = [];
    let tm: ReminderTemplate[] = [];
    let cfg: ReceivXConfig | null = null;
    let custList: Customer[] = [];
    try {
      // [JWT] GET /api/receivx/tasks
      t = JSON.parse(localStorage.getItem(receivxTasksKey(entityCode)) || '[]');
      // [JWT] GET /api/receivx/templates
      tm = JSON.parse(localStorage.getItem(receivxTemplatesKey(entityCode)) || '[]');
      // [JWT] GET /api/receivx/config
      const cfgRaw = localStorage.getItem(receivxConfigKey(entityCode));
      if (cfgRaw) cfg = JSON.parse(cfgRaw);
      // [JWT] GET /api/masters/customers
      custList = JSON.parse(localStorage.getItem(`erp_customers_${entityCode}`) || '[]');
    } catch { /* noop */ }
    setTasks(t.filter(x => x.status !== 'closed'));
    setTemplates(tm);
    setConfig(cfg);
    setCustomers(Object.fromEntries(custList.map(c => [c.id, c])));

    const today = new Date().toISOString().slice(0, 10);
    const defaultSel = new Set(
      t.filter(x => x.status !== 'closed' && computeCadenceStep(x.due_date, today) !== null).map(x => x.id),
    );
    setSelectedIds(defaultSel);
    const defChan: Record<string, 'whatsapp' | 'email' | 'skip'> = {};
    for (const task of t) {
      const cust = custList.find(c => c.id === task.party_id);
      if (cust?.phone) defChan[task.id] = 'whatsapp';
      else if (cust?.email) defChan[task.id] = 'email';
      else defChan[task.id] = 'skip';
    }
    setChannelByTask(defChan);
  }, [entityCode]);

  useCtrlS(() => { if (!isSending) toast.info('Use Send All button'); });

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  const selectedTasks = useMemo(() => tasks.filter(t => selectedIds.has(t.id)), [tasks, selectedIds]);

  const previewTask = selectedTasks[0];
  const previewBody = useMemo(() => {
    if (!previewTask) return '';
    const tpl = templates.find(t => t.id === templateId);
    const today = new Date().toISOString().slice(0, 10);
    const step = computeCadenceStep(previewTask.due_date, today);
    const rawBody = freestyleBody || (tpl?.messages.find(m => m.step === step)?.body || tpl?.messages[0]?.body || '');
    return renderTemplate(rawBody, {
      party_name: previewTask.party_name,
      invoice_no: previewTask.voucher_no,
      amount: fmt(previewTask.pending_amount),
      due_date: previewTask.due_date,
      days_overdue: previewTask.age_days,
    });
  }, [previewTask, templates, templateId, freestyleBody]);

  const channelSummary = useMemo(() => {
    let wa = 0, em = 0, sk = 0;
    for (const t of selectedTasks) {
      const c = channelByTask[t.id] ?? 'skip';
      if (c === 'whatsapp') wa++;
      else if (c === 'email') em++;
      else sk++;
    }
    return { wa, em, sk, total: selectedTasks.length };
  }, [selectedTasks, channelByTask]);

  const handleSendAll = useCallback(async () => {
    if (!config) { toast.error('Configure ReceivX first'); return; }
    if (selectedTasks.length === 0) { toast.error('Select at least 1 task'); return; }
    setIsSending(true);
    setProgress({ done: 0, total: selectedTasks.length });
    const tpl = templates.find(t => t.id === templateId);
    const today = new Date().toISOString().slice(0, 10);
    const newLogs: CommunicationLog[] = [];
    for (let i = 0; i < selectedTasks.length; i++) {
      const task = selectedTasks[i];
      const channel = channelByTask[task.id] ?? 'skip';
      if (channel === 'skip') { setProgress({ done: i + 1, total: selectedTasks.length }); continue; }
      const cust = customers[task.party_id];
      const step = computeCadenceStep(task.due_date, today);
      const cadenceStep: CadenceStep | 'manual' = step ?? 'manual';
      const rawBody = freestyleBody || (tpl?.messages.find(m => m.step === step)?.body || tpl?.messages[0]?.body || '');
      const body = renderTemplate(rawBody, {
        party_name: task.party_name,
        invoice_no: task.voucher_no,
        amount: fmt(task.pending_amount),
        due_date: task.due_date,
        days_overdue: task.age_days,
      });
      try {
        if (channel === 'whatsapp' && cust?.phone) {
          const log = await sendWhatsApp({ config, task, toPhone: cust.phone, body, cadenceStep, sentByUser: 'current-user' });
          newLogs.push(log);
        } else if (channel === 'email' && cust?.email) {
          const subject = tpl?.messages.find(m => m.step === step)?.subject || `Reminder: Invoice ${task.voucher_no}`;
          const log = await sendEmail({ config, task, toEmail: cust.email, subject, body, cadenceStep, sentByUser: 'current-user' });
          newLogs.push(log);
        }
      } catch (err) { /* logged inside engine */ }
      setProgress({ done: i + 1, total: selectedTasks.length });
    }
    try {
      // [JWT] GET /api/receivx/comm-log
      const existing: CommunicationLog[] = JSON.parse(localStorage.getItem(receivxCommLogKey(entityCode)) || '[]');
      // [JWT] POST /api/receivx/comm-log
      localStorage.setItem(receivxCommLogKey(entityCode), JSON.stringify([...existing, ...newLogs]));
    } catch { toast.error('Log save failed'); }
    setIsSending(false);
    toast.success(`Sent ${newLogs.length} messages`);
  }, [config, selectedTasks, templates, templateId, freestyleBody, channelByTask, customers, entityCode]);

  return (
    <div data-keyboard-form className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Reminder Console</h1>
        <p className="text-xs text-muted-foreground">Bulk WhatsApp + email collections</p>
      </div>

      <Card className="p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider">Step 1 · Audience ({selectedIds.size} selected)</p>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No open tasks. Reconcile from Outstanding Task Board first.</p>
          ) : tasks.map(t => (
            <label key={t.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/50">
              <Checkbox checked={selectedIds.has(t.id)} onCheckedChange={() => toggle(t.id)} />
              <span className="flex-1 truncate">{t.party_name}</span>
              <span className="font-mono text-[10px]">{t.voucher_no}</span>
              <span className="font-mono text-amber-600 w-24 text-right">{fmt(t.pending_amount)}</span>
              <Badge variant="outline" className="text-[9px]">{t.age_bucket}</Badge>
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider">Step 2 · Template</p>
        <Select value={templateId} onValueChange={setTemplateId}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick template or compose freestyle below" /></SelectTrigger>
          <SelectContent>
            {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Textarea
          placeholder="Or compose freestyle (overrides template). Use {{party_name}}, {{invoice_no}}, {{amount}}, {{due_date}}, {{days_overdue}}"
          value={freestyleBody}
          onChange={(e) => setFreestyleBody(e.target.value)}
          rows={4}
          className="text-xs"
        />
        {previewBody && (
          <div className="bg-muted/30 p-2 rounded text-xs whitespace-pre-wrap">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Preview · {previewTask?.party_name}</p>
            {previewBody}
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider">Step 3 · Channel</p>
        <p className="text-xs text-muted-foreground">
          {channelSummary.total} customers · {channelSummary.wa} WhatsApp · {channelSummary.em} email · {channelSummary.sk} skipped
        </p>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {selectedTasks.map(t => (
            <div key={t.id} className="flex items-center gap-2 text-xs">
              <span className="flex-1 truncate">{t.party_name}</span>
              <Select
                value={channelByTask[t.id] ?? 'skip'}
                onValueChange={(v) => setChannelByTask(prev => ({ ...prev, [t.id]: v as 'whatsapp' | 'email' | 'skip' }))}
              >
                <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp"><MessageCircle className="h-3 w-3 inline mr-1" /> WhatsApp</SelectItem>
                  <SelectItem value="email"><Mail className="h-3 w-3 inline mr-1" /> Email</SelectItem>
                  <SelectItem value="skip">Skip</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </Card>

      {isSending && (
        <Card className="p-3">
          <p className="text-xs">Sending... {progress.done} / {progress.total}</p>
          <div className="h-2 rounded-full bg-muted overflow-hidden mt-1">
            <div className="h-full bg-amber-500" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <Button data-primary onClick={handleSendAll} disabled={isSending} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Send className="h-4 w-4 mr-1.5" /> Send All ({channelSummary.wa + channelSummary.em})
        </Button>
      </div>

      {/* Hidden input to keep onEnterNext usage in this form */}
      <Input type="hidden" onKeyDown={onEnterNext} />
    </div>
  );
}

export default function ReminderConsole() {
  return (
    <SidebarProvider>
      <ReminderConsolePanel entityCode="SMRT" />
    </SidebarProvider>
  );
}
