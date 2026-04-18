/**
 * DistributorBroadcast.tsx — Sales-team composer that fires WhatsApp/email/in-portal
 * messages to a distributor audience. Sprint 10. Reuses MAS infrastructure.
 * [JWT] POST /api/sales/broadcasts
 */
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Megaphone, Send, Loader2, MessageSquare, Mail, Bell, Users, CheckCircle2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { loadDistributors } from '@/lib/distributor-auth-engine';
import { formatINR } from '@/lib/india-validations';
import {
  distributorBroadcastsKey,
  type BroadcastAudience, type BroadcastChannel, type BroadcastMessage,
} from '@/types/distributor-order';
import type { Distributor, DistributorTier } from '@/types/distributor';

const INDIGO = 'hsl(231 48% 58%)';
const INDIGO_BG = 'hsl(231 48% 48% / 0.12)';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}
function setLs<T>(k: string, v: T[]): void { localStorage.setItem(k, JSON.stringify(v)); }

const schema = z.object({
  title: z.string().min(3, 'Title is required'),
  body: z.string().min(5, 'Message body is required'),
  channel_whatsapp: z.boolean(),
  channel_email: z.boolean(),
  channel_portal: z.boolean(),
  audience_kind: z.enum(['all_partners', 'tier']),
  tier: z.enum(['gold', 'silver', 'bronze']).optional(),
  scheduled_for: z.string().optional(),
}).refine(d => d.channel_whatsapp || d.channel_email || d.channel_portal, {
  message: 'Pick at least one channel',
  path: ['channel_whatsapp'],
});

type FormValues = z.infer<typeof schema>;

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function DistributorBroadcastPanel() { return <DistributorBroadcast />; }

export default function DistributorBroadcast() {
  // Default to first known entity (sales rep is multi-entity — keep simple here).
  const entityCode = useMemo(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('erp_partners_'));
    return keys[0]?.replace('erp_partners_', '') ?? 'SMRT';
  }, []);

  const partners = useMemo<Distributor[]>(() => loadDistributors(entityCode), [entityCode]);
  const [submitting, setSubmitting] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const broadcasts = useMemo<BroadcastMessage[]>(
    () => ls<BroadcastMessage>(distributorBroadcastsKey(entityCode))
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [entityCode, refresh],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      body: '',
      channel_whatsapp: true,
      channel_email: false,
      channel_portal: true,
      audience_kind: 'all_partners',
      tier: 'gold',
      scheduled_for: '',
    },
  });

  const audienceKind = form.watch('audience_kind');
  const tierWatch = form.watch('tier');

  const recipientCount = useMemo(() => {
    if (audienceKind === 'all_partners') return partners.length;
    return partners.filter(p => p.tier === tierWatch).length;
  }, [audienceKind, tierWatch, partners]);

  const onSubmit = async (v: FormValues) => {
    setSubmitting(true);
    try {
      const channels: BroadcastChannel[] = [];
      if (v.channel_whatsapp) channels.push('whatsapp');
      if (v.channel_email) channels.push('email');
      if (v.channel_portal) channels.push('in_portal');

      const audience: BroadcastAudience =
        v.audience_kind === 'all_partners'
          ? { kind: 'all_partners' }
          : { kind: 'tier', tier: (v.tier ?? 'gold') as DistributorTier };

      const now = new Date().toISOString();
      const isScheduled = !!v.scheduled_for;
      const broadcast: BroadcastMessage = {
        id: `bc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        entity_code: entityCode,
        title: v.title,
        body: v.body,
        channels,
        audience,
        scheduled_for: isScheduled ? v.scheduled_for ?? null : null,
        sent_at: isScheduled ? null : now,
        recipient_count: recipientCount,
        delivered_count: isScheduled ? 0 : recipientCount,
        read_count: 0,
        status: isScheduled ? 'scheduled' : 'sent',
        composed_by: 'sales_user',
        created_at: now,
        updated_at: now,
      };
      // [JWT] POST /api/sales/broadcasts
      setLs(distributorBroadcastsKey(entityCode), [broadcast, ...broadcasts]);
      toast.success(isScheduled ? 'Broadcast scheduled' : `Sent to ${recipientCount} partner${recipientCount === 1 ? '' : 's'}`);
      form.reset({ ...form.getValues(), title: '', body: '', scheduled_for: '' });
      setRefresh(x => x + 1);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Distributor Broadcast"
      breadcrumbs={[{ label: 'SalesX', href: '/erp/salesx' }, { label: 'Distributor Broadcast' }]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
        {/* Composer */}
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: INDIGO_BG }}>
              <Megaphone className="h-4 w-4" style={{ color: INDIGO }} />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Compose Message</h3>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Title</FormLabel>
                  <FormControl><Input {...field} className="rounded-lg" placeholder="e.g. Diwali offer — extra 5% off" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="body" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Message</FormLabel>
                  <FormControl><Textarea rows={4} {...field} className="rounded-lg text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Channels</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { name: 'channel_whatsapp', label: 'WhatsApp', Icon: MessageSquare },
                    { name: 'channel_email', label: 'Email', Icon: Mail },
                    { name: 'channel_portal', label: 'In-Portal', Icon: Bell },
                  ] as const).map(c => {
                    const checked = form.watch(c.name);
                    return (
                      <button
                        type="button"
                        key={c.name}
                        onClick={() => form.setValue(c.name, !checked)}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors"
                        style={checked
                          ? { background: INDIGO_BG, color: INDIGO, borderColor: INDIGO }
                          : { borderColor: 'hsl(0 0% 50% / 0.2)', color: 'hsl(215 16% 47%)' }}
                      >
                        <c.Icon className="h-3 w-3" /> {c.label}
                      </button>
                    );
                  })}
                </div>
                {form.formState.errors.channel_whatsapp && (
                  <p className="text-[11px] text-destructive mt-1">{form.formState.errors.channel_whatsapp.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="audience_kind" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Audience</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="all_partners">All Partners</SelectItem>
                        <SelectItem value="tier">By Tier</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                {audienceKind === 'tier' && (
                  <FormField control={form.control} name="tier" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Tier</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="gold">Gold</SelectItem>
                          <SelectItem value="silver">Silver</SelectItem>
                          <SelectItem value="bronze">Bronze</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                )}
              </div>

              <FormField control={form.control} name="scheduled_for" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Schedule (optional)</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} className="rounded-lg" /></FormControl>
                </FormItem>
              )} />

              <div className="rounded-lg border border-border/50 p-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" style={{ color: INDIGO }} />
                Will reach <span className="font-mono font-semibold text-foreground">{recipientCount}</span> partner{recipientCount === 1 ? '' : 's'}
              </div>

              <Button
                type="submit"
                disabled={submitting || recipientCount === 0}
                className="w-full rounded-lg gap-2"
                style={{ background: INDIGO, color: 'white' }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {form.watch('scheduled_for') ? 'Schedule' : 'Send Now'}
              </Button>
            </form>
          </Form>
        </div>

        {/* History */}
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent Broadcasts</h3>
          {broadcasts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No broadcasts yet.</p>
          ) : (
            <div className="space-y-2">
              {broadcasts.slice(0, 12).map(b => (
                <div key={b.id} className="rounded-lg border border-border/30 p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{b.title}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: INDIGO_BG, color: INDIGO }}>
                      {b.status === 'sent' && <CheckCircle2 className="h-3 w-3" />}
                      {b.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mb-1.5">{b.body}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>{b.channels.join(' • ').toUpperCase()}</span>
                    <span className="font-mono">{b.recipient_count} recipients</span>
                    {b.sent_at && <span>{formatDate(b.sent_at)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {partners.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50 text-[11px] text-muted-foreground">
              <p>Outstanding across audience: <span className="font-mono text-foreground">
                {formatINR(partners.reduce((s, p) => s + p.outstanding_paise, 0))}
              </span></p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
