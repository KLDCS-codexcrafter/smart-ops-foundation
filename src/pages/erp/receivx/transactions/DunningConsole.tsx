/**
 * DunningConsole.tsx — Progressive escalation console
 * Sprint 8 · Amber-500 accent · suggests next stage per overdue customer
 * [JWT] POST /api/receivx/dunning/send
 */
import { useState, useMemo, useCallback } from 'react';
import {
  MailWarning, Send, RefreshCw, Clock, IndianRupee, Users, History,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  STAGE_LABELS, STAGE_COLOURS, dunningSentKey,
  type DunningEmail, type DunningStage,
} from '@/types/dunning';
import { receivxConfigKey, type ReceivXConfig } from '@/types/receivx';
import {
  aggregateOverdueForParty, lastSentStageFor, selectStage, renderDunningTemplate,
  type PartyOverdueAggregate,
} from '@/lib/dunning-engine';
import type { OutstandingEntry } from '@/types/voucher';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface Props { entityCode: string }

function loadConfig(entityCode: string): ReceivXConfig | null {
  try {
    // [JWT] GET /api/receivx/config
    const raw = localStorage.getItem(receivxConfigKey(entityCode));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function loadOutstanding(entityCode: string): OutstandingEntry[] {
  try {
    // [JWT] GET /api/accounting/outstanding
    const raw = localStorage.getItem(`erp_outstanding_${entityCode}`);
    const all: OutstandingEntry[] = raw ? JSON.parse(raw) : [];
    return all.filter(o => o.party_type === 'debtor' && (o.status === 'open' || o.status === 'partial'));
  } catch { return []; }
}

function loadSent(entityCode: string): DunningEmail[] {
  try {
    // [JWT] GET /api/receivx/dunning/sent
    return JSON.parse(localStorage.getItem(dunningSentKey(entityCode)) || '[]');
  } catch { return []; }
}

function saveSent(entityCode: string, items: DunningEmail[]) {
  // [JWT] POST /api/receivx/dunning/sent
  localStorage.setItem(dunningSentKey(entityCode), JSON.stringify(items));
}

interface RowVM extends PartyOverdueAggregate {
  last_sent: DunningStage | null;
  next_stage: DunningStage | null;
}

export function DunningConsolePanel({ entityCode }: Props) {
  const [config] = useState(() => loadConfig(entityCode));
  const [outstanding, setOutstanding] = useState(() => loadOutstanding(entityCode));
  const [sent, setSent] = useState(() => loadSent(entityCode));
  const [previewRow, setPreviewRow] = useState<RowVM | null>(null);
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewBody, setPreviewBody] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendWa, setSendWa] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('');

  const rows: RowVM[] = useMemo(() => {
    const aggregated = aggregateOverdueForParty(outstanding);
    if (!config) return aggregated.map(a => ({ ...a, last_sent: null, next_stage: null }));
    return aggregated.map(a => {
      const last = lastSentStageFor(a.party_id, sent);
      const next = selectStage(a.max_days_overdue, config.dunning_templates, last);
      return { ...a, last_sent: last, next_stage: next };
    });
  }, [outstanding, sent, config]);

  const kpis = useMemo(() => {
    const totalCustomers = rows.length;
    const totalAmount = rows.reduce((s, r) => s + r.total_overdue, 0);
    const oneWeekMs = Date.now() - 7 * 86400000;
    const sentThisWeek = sent.filter(s => new Date(s.sent_at).getTime() > oneWeekMs).length;
    const byStage: Record<DunningStage, number> = { polite: 0, firm: 0, final: 0, legal: 0 };
    sent.filter(s => new Date(s.sent_at).getTime() > oneWeekMs).forEach(s => { byStage[s.stage]++; });
    return { totalCustomers, totalAmount, sentThisWeek, byStage };
  }, [rows, sent]);

  const refresh = () => {
    setOutstanding(loadOutstanding(entityCode));
    setSent(loadSent(entityCode));
  };

  const openPreview = useCallback((row: RowVM, stage: DunningStage) => {
    if (!config) { toast.error('Config not loaded'); return; }
    const tpl = config.dunning_templates.find(t => t.stage === stage);
    if (!tpl) { toast.error(`No template for ${stage}`); return; }
    const rendered = renderDunningTemplate(tpl, {
      party_name: row.party_name,
      voucher_nos: row.voucher_nos.join(', '),
      total_overdue: row.total_overdue,
      days_overdue: row.max_days_overdue,
      payment_link: '(generated on send)',
      sender_name: config.email_from_name || 'Accounts Team',
    });
    setPreviewRow({ ...row, next_stage: stage });
    setPreviewSubject(rendered.subject);
    setPreviewBody(rendered.body);
    setSendEmail(true);
    setSendWa(false);
  }, [config]);

  const confirmSend = () => {
    if (!previewRow || !previewRow.next_stage) return;
    const now = new Date().toISOString();
    const email: DunningEmail = {
      id: `dun-${Date.now()}-${previewRow.party_id}`,
      entity_id: entityCode,
      party_id: previewRow.party_id,
      party_name: previewRow.party_name,
      voucher_ids: previewRow.voucher_ids,
      total_overdue: previewRow.total_overdue,
      stage: previewRow.next_stage,
      subject: previewSubject,
      body_rendered: previewBody,
      sent_to_email: '',
      sent_at: now,
      sent_by_user: 'current-user',
      delivery_status: 'sent',
      created_at: now,
    };
    const next = [email, ...sent];
    saveSent(entityCode, next);
    setSent(next);
    setPreviewRow(null);
    toast.success(`${STAGE_LABELS[email.stage]} sent`);
  };

  const filteredHistory = useMemo(() => {
    if (!historyFilter) return sent;
    const s = historyFilter.toLowerCase();
    return sent.filter(d =>
      d.party_name.toLowerCase().includes(s) || d.subject.toLowerCase().includes(s),
    );
  }, [sent, historyFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><MailWarning className="h-5 w-5 text-amber-500" />Dunning Console</h1>
          <p className="text-xs text-muted-foreground">Progressive escalation per customer</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-amber-500" /><p className="text-xs text-muted-foreground">Overdue Customers</p></div>
          <p className="text-xl font-bold mt-1 font-mono">{kpis.totalCustomers}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-amber-500" /><p className="text-xs text-muted-foreground">Total Overdue</p></div>
          <p className="text-xl font-bold mt-1 font-mono">₹{kpis.totalAmount.toLocaleString('en-IN')}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2"><Send className="h-4 w-4 text-amber-500" /><p className="text-xs text-muted-foreground">Sent This Week</p></div>
          <p className="text-xl font-bold mt-1 font-mono">{kpis.sentThisWeek}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /><p className="text-xs text-muted-foreground">By Stage (7d)</p></div>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {(Object.keys(kpis.byStage) as DunningStage[]).map(st => (
              <Badge key={st} variant="outline" className={`${STAGE_COLOURS[st]} text-[10px]`}>
                {st}: {kpis.byStage[st]}
              </Badge>
            ))}
          </div>
        </Card>
      </div>

      <Tabs defaultValue="suggested" className="w-full">
        <TabsList>
          <TabsTrigger value="suggested" className="text-xs">Suggested Sends</TabsTrigger>
          <TabsTrigger value="history" className="text-xs"><History className="h-3 w-3 mr-1" />History</TabsTrigger>
        </TabsList>

        <TabsContent value="suggested">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs text-right">Total Overdue</TableHead>
                  <TableHead className="text-xs text-right">Max Days</TableHead>
                  <TableHead className="text-xs">Last Sent</TableHead>
                  <TableHead className="text-xs">Next Stage</TableHead>
                  <TableHead className="text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No overdue customers.</TableCell></TableRow>
                ) : rows.map(r => (
                  <TableRow key={r.party_id}>
                    <TableCell className="text-sm">{r.party_name}</TableCell>
                    <TableCell className="font-mono text-xs text-right">₹{r.total_overdue.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="font-mono text-xs text-right">{r.max_days_overdue} d</TableCell>
                    <TableCell>
                      {r.last_sent ? (
                        <Badge variant="outline" className={STAGE_COLOURS[r.last_sent]}>{STAGE_LABELS[r.last_sent]}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.next_stage ? (
                        <Badge variant="outline" className={STAGE_COLOURS[r.next_stage]}>{STAGE_LABELS[r.next_stage]}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm" variant="outline"
                        disabled={!r.next_stage}
                        className="h-7 text-xs"
                        onClick={() => r.next_stage && openPreview(r, r.next_stage)}
                      >
                        <Send className="h-3 w-3 mr-1" />Send {r.next_stage ? STAGE_LABELS[r.next_stage] : ''}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-3 mb-2">
            <Input
              className="h-9 text-xs max-w-sm"
              placeholder="Filter by customer or subject"
              value={historyFilter}
              onChange={e => setHistoryFilter(e.target.value)}
            />
          </Card>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Sent At</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Stage</TableHead>
                  <TableHead className="text-xs">Subject</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No dunning history.</TableCell></TableRow>
                ) : filteredHistory.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs text-muted-foreground">{new Date(d.sent_at).toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-sm">{d.party_name}</TableCell>
                    <TableCell><Badge variant="outline" className={STAGE_COLOURS[d.stage]}>{STAGE_LABELS[d.stage]}</Badge></TableCell>
                    <TableCell className="text-xs">{d.subject}</TableCell>
                    <TableCell className="font-mono text-xs text-right">₹{d.total_overdue.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-xs">{d.delivery_status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview dialog */}
      <Dialog open={!!previewRow} onOpenChange={(open) => { if (!open) setPreviewRow(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {previewRow?.next_stage ? STAGE_LABELS[previewRow.next_stage] : ''} — {previewRow?.party_name}
            </DialogTitle>
            <DialogDescription>
              Review and edit before sending. ₹{previewRow?.total_overdue.toLocaleString('en-IN')} across {previewRow?.voucher_nos.length} invoice(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Subject</Label>
              <Input className="text-xs mt-1" value={previewSubject} onChange={e => setPreviewSubject(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Body</Label>
              <Textarea rows={10} className="text-xs mt-1 font-mono" value={previewBody} onChange={e => setPreviewBody(e.target.value)} />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={sendEmail} onCheckedChange={setSendEmail} />Email
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={sendWa} onCheckedChange={setSendWa} />WhatsApp
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewRow(null)}>Cancel</Button>
            <Button data-primary className="bg-amber-500 hover:bg-amber-600" onClick={confirmSend}>Confirm Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DunningConsolePage() {
  return <DunningConsolePanel entityCode={DEFAULT_ENTITY_SHORTCODE} />;
}
