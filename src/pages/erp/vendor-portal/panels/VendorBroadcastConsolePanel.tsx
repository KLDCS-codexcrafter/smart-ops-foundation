/**
 * @file        VendorBroadcastConsolePanel.tsx
 * @sprint      T-Phase-1.A-b.2-VendorPortal-Communications-Categories
 * @decisions   D-NEW-DN · D-NEW-DU · A-b-Q3=A · A-b-Q8=C Saathi badge · A-b-Q9=C status colors
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Send, Users, Building2, ListChecks, Bot, CheckCircle, Clock } from 'lucide-react';
import {
  createBroadcast, listBroadcasts, resolveBroadcastTargets, segmentLabel,
  type BroadcastSegment, type VendorBroadcast,
} from '@/lib/vendor-broadcast-engine';
import type { VendorPortalNotificationType, NotificationPriority } from '@/types/vendor-portal-accounts';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const NOTIFICATION_TYPES: { value: VendorPortalNotificationType; label: string }[] = [
  { value: 'system', label: 'System Announcement' },
  { value: 'rfq_new', label: 'RFQ Opportunity' },
  { value: 'msme_43bh_alert', label: 'MSME-43BH Reminder' },
  { value: 'kyc_renewal', label: 'KYC Renewal Reminder' },
  { value: 'message_received', label: 'General Message' },
];

const PRIORITIES: { value: NotificationPriority; label: string; color: string }[] = [
  { value: 'low',    label: 'Low',    color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  { value: 'normal', label: 'Normal', color: 'bg-slate-500/10 text-slate-700 border-slate-500/30' },
  { value: 'high',   label: 'High',   color: 'bg-orange-500/10 text-orange-700 border-orange-500/30' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500/10 text-red-700 border-red-500/30' },
];

function priorityClass(p: NotificationPriority): string {
  return PRIORITIES.find(x => x.value === p)?.color ?? PRIORITIES[1].color;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function VendorBroadcastConsolePanel(): JSX.Element {
  const entityCode = useMemo(() => {
    try {
      return localStorage.getItem('active_entity_code') ?? DEFAULT_ENTITY_SHORTCODE;
    } catch { return DEFAULT_ENTITY_SHORTCODE; }
  }, []);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [segment, setSegment] = useState<BroadcastSegment>('all_active');
  const [notificationType, setNotificationType] = useState<VendorPortalNotificationType>('system');
  const [priority, setPriority] = useState<NotificationPriority>('normal');
  const [customIdsRaw, setCustomIdsRaw] = useState('');
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [lastSent, setLastSent] = useState<VendorBroadcast | null>(null);

  const customIds = useMemo(
    () => customIdsRaw.split(',').map(s => s.trim()).filter(Boolean),
    [customIdsRaw],
  );

  const targetCount = useMemo(
    () => resolveBroadcastTargets(entityCode, segment, customIds),
    [entityCode, segment, customIds],
  );

  const broadcasts = useMemo(
    () => listBroadcasts(entityCode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, refreshCounter],
  );

  const canSend = title.trim().length > 0 && message.trim().length > 0 && targetCount > 0;

  const handleSend = (): void => {
    if (!canSend) return;
    const broadcast = createBroadcast({
      entity_code: entityCode,
      sender_id: 'admin',
      title: title.trim(),
      message: message.trim(),
      notification_type: notificationType,
      priority,
      segment,
      custom_vendor_ids: segment === 'custom_list' ? customIds : undefined,
    });
    setLastSent(broadcast);
    setTitle('');
    setMessage('');
    setCustomIdsRaw('');
    setRefreshCounter(c => c + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-500/15 flex items-center justify-center">
            <Megaphone className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Vendor Broadcast Console
              <Badge variant="outline" className="text-[10px]">Segment Targeting</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Compose announcements · target all-active · MSME-only · custom list · priority-tagged
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Bot className="h-3 w-3" />Saathi · auto-translate to vendor language · Phase 2
        </Badge>
      </div>

      {lastSent && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Broadcast sent</p>
              <p className="text-xs text-muted-foreground">
                "{lastSent.title}" delivered to {lastSent.target_count} vendor(s) · {segmentLabel(lastSent.segment)}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLastSent(null)}>Dismiss</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Compose</CardTitle>
            <CardDescription>Subject · message body · type · priority · segment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 GST Filing Reminder"
                maxLength={120}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Compose your message · vendors see this in their portal notifications · 1000 chars max"
                maxLength={1000}
                rows={5}
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">{message.length}/1000</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <Select value={notificationType} onValueChange={(v) => setNotificationType(v as VendorPortalNotificationType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select value={priority} onValueChange={(v) => setPriority(v as NotificationPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Target Segment</CardTitle>
            <CardDescription>Resolved count: <span className="font-mono font-bold">{targetCount}</span> vendor(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {([
                { value: 'all_active', label: 'All Active Vendors', icon: Users, desc: 'Every vendor with active status in this entity' },
                { value: 'msme_only',  label: 'MSME Vendors Only',  icon: Building2, desc: 'Only vendors flagged msmeRegistered = true' },
                { value: 'custom_list', label: 'Custom List',       icon: ListChecks, desc: 'Comma-separated vendor IDs below' },
              ] as const).map(opt => {
                const Icon = opt.icon;
                const active = segment === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSegment(opt.value)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                      active
                        ? 'border-slate-500 bg-slate-500/10'
                        : 'border-border/50 hover:border-slate-500/40 hover:bg-slate-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
            {segment === 'custom_list' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Vendor IDs (comma-separated)</label>
                <Input
                  value={customIdsRaw}
                  onChange={(e) => setCustomIdsRaw(e.target.value)}
                  placeholder="VEND0001, VEND0042, VEND0099"
                />
              </div>
            )}
            <Button onClick={handleSend} disabled={!canSend} className="w-full gap-2">
              <Send className="h-4 w-4" />
              Send to {targetCount} vendor(s)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Broadcast History
          </CardTitle>
          <CardDescription>{broadcasts.length} broadcast(s) sent · most recent first</CardDescription>
        </CardHeader>
        <CardContent>
          {broadcasts.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No broadcasts yet · send your first announcement above
            </div>
          ) : (
            <div className="space-y-2">
              {broadcasts.map(b => (
                <div key={b.id} className="rounded-lg border border-border/50 p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{b.message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(b.sent_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <Badge variant="outline" className={`text-[9px] ${priorityClass(b.priority)}`}>
                      {b.priority}
                    </Badge>
                    <Badge variant="outline" className="text-[9px]">
                      {segmentLabel(b.segment)} · {b.target_count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
