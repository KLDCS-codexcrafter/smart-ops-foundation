/**
 * AutoSendRulesPage.tsx — Sprint W1C-4 · Block 2 · CC Admin Surface
 *
 * "Auto-Send Rules" module in the Command Center governance area.
 * Rule CRUD + per-rule last-5 enqueue log. Admin-gated by sidebar
 * placement under the CC governance group (mirrors CommunicationConsole +
 * RetentionConsole sibling pattern · no in-component role gate).
 *
 * Honest UI:
 *   - Rules are CC-editable data rows under autoSendRulesKey(entityCode).
 *   - No "send" button — this surface configures rules only.
 *   - The last-5 log reads from the existing outbox (queued_for_wave2).
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Trash2, Plus, ShieldCheck, Info } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listTemplates } from '@/lib/communication-engine';
import {
  listAutoSendRules,
  upsertAutoSendRule,
  deleteAutoSendRule,
  recentEnqueuesForRule,
  STARTER_RULES_UNAVAILABLE,
  type AutoSendRule,
  type RecipientResolver,
} from '@/lib/auto-send-rules-engine';

export default function AutoSendRulesPage() {
  const { entityCode } = useEntityCode();
  const [rev, setRev] = useState(0);
  const bump = () => setRev((r) => r + 1);

  const rules = useMemo(
    () => (entityCode ? listAutoSendRules(entityCode) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, rev],
  );
  const templates = useMemo(
    () => (entityCode ? listTemplates(entityCode).filter((t) => t.active && t.channel === 'email') : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, rev],
  );

  if (!entityCode) {
    return <div className="p-6 text-muted-foreground">Select a company to continue.</div>;
  }

  const onToggle = (rule: AutoSendRule, enabled: boolean) => {
    upsertAutoSendRule(entityCode, { ...rule, enabled });
    bump();
  };
  const onField = <K extends keyof AutoSendRule>(rule: AutoSendRule, k: K, v: AutoSendRule[K]) => {
    upsertAutoSendRule(entityCode, { ...rule, [k]: v });
    bump();
  };
  const onDelete = (rule: AutoSendRule) => {
    deleteAutoSendRule(entityCode, rule.id);
    bump();
  };
  const onAdd = () => {
    upsertAutoSendRule(entityCode, {
      event: '',
      enabled: false,
      templateId: templates[0]?.id ?? '',
      templateObjectType: templates[0]?.object_type ?? '',
      recipientResolver: 'fixed',
      recipientValue: '',
      senderClass: 'system',
      channel: 'email',
      lang: 'en',
      description: '',
    });
    bump();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Auto-Send Rules</h1>
          <p className="text-sm text-muted-foreground">
            Tally-style auto-email on event. Rules render via Template Master and queue on the
            outbox — never sent directly from the browser.
          </p>
        </div>
        <Button onClick={onAdd} size="sm"><Plus className="h-4 w-4 mr-1" /> Add rule</Button>
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-start gap-3">
          <Info className="h-4 w-4 mt-1 text-muted-foreground" />
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Starter rules are seeded <b>disabled</b>. Enable per rule after setting recipient + sender class.</div>
            <div>
              Suggested events NOT yet emitted by the notification spine (no rule seeded):
              {' '}
              <span className="font-mono">{STARTER_RULES_UNAVAILABLE.join(' · ')}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Rules ({rules.length})</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {rules.length === 0 && (
            <div className="text-sm text-muted-foreground">No rules yet. Click Add rule.</div>
          )}
          {rules.map((rule) => {
            const last = recentEnqueuesForRule(entityCode, rule.id, 5);
            return (
              <div key={rule.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Switch checked={rule.enabled} onCheckedChange={(v) => onToggle(rule, !!v)} />
                  <Badge variant={rule.enabled ? 'default' : 'outline'}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">{rule.channel}</Badge>
                  <Badge variant="outline" className="font-mono text-xs">{rule.senderClass}</Badge>
                  <div className="ml-auto">
                    <Button variant="ghost" size="sm" onClick={() => onDelete(rule)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Spine event</Label>
                    <Input
                      value={rule.event}
                      placeholder="e.g. approval.pending"
                      onChange={(e) => onField(rule, 'event', e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Template</Label>
                    <Select
                      value={rule.templateId}
                      onValueChange={(v) => {
                        const tpl = templates.find((t) => t.id === v);
                        if (!tpl) return;
                        upsertAutoSendRule(entityCode, {
                          ...rule, templateId: tpl.id, templateObjectType: tpl.object_type,
                        });
                        bump();
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Pick a template" /></SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.object_type} — {t.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Recipient resolver</Label>
                    <Select
                      value={rule.recipientResolver}
                      onValueChange={(v) => onField(rule, 'recipientResolver', v as RecipientResolver)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed email</SelectItem>
                        <SelectItem value="department">Department (card id)</SelectItem>
                        <SelectItem value="party">Party (from source record)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Recipient value</Label>
                    <Input
                      value={rule.recipientValue ?? ''}
                      placeholder={rule.recipientResolver === 'department' ? 'card_id (e.g. payout)' : 'email or ID'}
                      onChange={(e) => onField(rule, 'recipientValue', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sender class</Label>
                    <Select
                      value={rule.senderClass}
                      onValueChange={(v) => onField(rule, 'senderClass', v as 'department' | 'system')}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">system (noreply)</SelectItem>
                        <SelectItem value="department">department (queue)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 lg:col-span-3">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={rule.description ?? ''}
                      onChange={(e) => onField(rule, 'description', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" /> Last 5 enqueues (queued_for_wave2)
                  </div>
                  {last.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No enqueues yet.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>When</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {last.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-mono text-xs">{m.created_at.slice(0, 19).replace('T', ' ')}</TableCell>
                            <TableCell className="font-mono text-xs">{m.to_resolved.join(', ')}</TableCell>
                            <TableCell className="text-xs">{m.subject}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{m.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
