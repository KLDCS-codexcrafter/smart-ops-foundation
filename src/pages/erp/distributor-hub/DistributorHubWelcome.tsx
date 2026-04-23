/**
 * DistributorHubWelcome.tsx — Distributor Hub welcome page
 * Greeting + 4 pulse metrics + 6 quick actions + recent activity feed
 * + Portal Branding card (moved from old DistributorHub tile-grid page).
 * Indigo-600 accent via tailwind classes only — no raw HSL values.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Users2, ShoppingBag, IndianRupee, FileCheck,
  TrendingUp, AlertOctagon, Megaphone, Network, TrendingDown,
  Palette, Save, Copy, Activity, Truck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatINR } from '@/lib/india-validations';
import { distributorsKey, type Distributor } from '@/types/distributor';
import {
  distributorOrdersKey, distributorIntimationsKey,
  type DistributorOrder, type DistributorPaymentIntimation,
} from '@/types/distributor-order';
import { creditRequestsKey, type CreditIncreaseRequest } from '@/types/credit-increase-request';
import { disputesKey, type InvoiceDispute } from '@/types/invoice-dispute';
import type { DistributorHubModule } from './DistributorHubSidebar';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/{key}
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T[]) : [];
  } catch { return []; }
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getUserName(): string {
  try {
    // [JWT] GET /api/auth/me
    const raw = localStorage.getItem('4ds_login_credential');
    if (raw) {
      const parsed = JSON.parse(raw) as { username?: string; email?: string };
      return parsed.username ?? parsed.email?.split('@')[0] ?? 'Operator';
    }
  } catch { /* noop */ }
  return 'Operator';
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} d ago`;
}

function setHash(mod: DistributorHubModule) {
  window.location.hash = mod;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

interface BrandingState {
  subdomain_enabled: boolean;
  subdomain_prefix: string;
  logo_url: string;
  primary_colour: string;
  contact_email: string;
  support_whatsapp: string;
}

export function DistributorHubWelcomePanel() {
  const userName = useMemo(() => getUserName(), []);
  const greeting = useMemo(() => getGreeting(), []);

  const entityCode = useMemo(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('erp_distributors_'));
    return keys[0]?.replace('erp_distributors_', '') ?? DEFAULT_ENTITY_SHORTCODE;
  }, []);

  const distributors = useMemo(() => ls<Distributor>(distributorsKey(entityCode)), [entityCode]);
  const orders = useMemo(() => ls<DistributorOrder>(distributorOrdersKey(entityCode)), [entityCode]);
  const intimations = useMemo(() => ls<DistributorPaymentIntimation>(distributorIntimationsKey(entityCode)), [entityCode]);
  const creditReqs = useMemo(() => ls<CreditIncreaseRequest>(creditRequestsKey(entityCode)), [entityCode]);
  const disputes = useMemo(() => ls<InvoiceDispute>(disputesKey(entityCode)), [entityCode]);

  // ── Pulse metrics ─────────────────────────────────────────────
  const activeCount = distributors.filter(d => d.status === 'active').length;
  const monthOrders = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return orders.filter(o => new Date(o.created_at).getTime() >= cutoff).length;
  }, [orders]);
  const outstandingAR = distributors.reduce((s, d) => s + d.outstanding_paise, 0);
  const pendingIntimations = intimations.filter(
    i => i.status === 'submitted' || i.status === 'verifying',
  ).length;

  // Static 7-day sparkline (visual only — MVP)
  const spark = (seed: number) =>
    Array.from({ length: 7 }, (_, i) => 4 + ((seed * (i + 1)) % 7));

  const metrics = [
    { label: 'Active Distributors', value: String(activeCount),
      icon: Users2, sparkSeed: 3 },
    { label: 'Orders (30d)', value: String(monthOrders),
      icon: ShoppingBag, sparkSeed: 5 },
    { label: 'Outstanding AR', value: formatINR(outstandingAR),
      icon: IndianRupee, sparkSeed: 2 },
    { label: 'Pending Intimations', value: String(pendingIntimations),
      icon: FileCheck, sparkSeed: 4 },
  ];

  // ── Quick actions ─────────────────────────────────────────────
  const quickActions: { label: string; icon: React.ElementType; module: DistributorHubModule }[] = [
    { label: 'Review Credit Approvals', icon: TrendingUp,    module: 'dh-t-credit-approvals' },
    { label: 'Review Disputes',          icon: AlertOctagon, module: 'dh-t-disputes' },
    { label: 'Verify Intimations',       icon: FileCheck,    module: 'dh-t-intimations' },
    { label: 'Fire Broadcast',           icon: Megaphone,    module: 'dh-t-broadcast' },
    { label: 'Edit Hierarchy',           icon: Network,      module: 'dh-m-hierarchy' },
    { label: 'Manage Price Lists',       icon: TrendingDown, module: 'dh-m-price-list' },
  ];

  // ── Activity feed ─────────────────────────────────────────────
  type Activity = { id: string; title: string; sub: string; iso: string;
    icon: React.ElementType; module: DistributorHubModule };

  const distributorNameById = useMemo(() => {
    const m = new Map<string, string>();
    distributors.forEach(d => m.set(d.id, d.legal_name));
    return m;
  }, [distributors]);

  const activity = useMemo<Activity[]>(() => {
    const items: Activity[] = [];
    orders.slice(-5).forEach(o => items.push({
      id: `ord-${o.id}`,
      title: `New order ${o.order_no}`,
      sub: `by ${o.partner_name ?? distributorNameById.get(o.partner_id) ?? 'Distributor'}`,
      iso: o.created_at, icon: ShoppingBag, module: 'dh-hub',
    }));
    intimations.slice(-5).forEach(i => items.push({
      id: `int-${i.id}`,
      title: `Intimation ${formatINR(i.amount_paise)}`,
      sub: `by ${i.partner_name ?? distributorNameById.get(i.partner_id) ?? 'Distributor'}`,
      iso: i.created_at, icon: FileCheck, module: 'dh-t-intimations',
    }));
    creditReqs.slice(-3).forEach(c => items.push({
      id: `cr-${c.id}`,
      title: `Credit request ${formatINR(c.requested_limit_paise)}`,
      sub: `by ${distributorNameById.get(c.distributor_id) ?? 'Distributor'}`,
      iso: c.created_at, icon: TrendingUp, module: 'dh-t-credit-approvals',
    }));
    disputes.slice(-3).forEach(d => items.push({
      id: `dp-${d.id}`,
      title: `Dispute on ${d.voucher_no}`,
      sub: `Reason: ${d.reason}`,
      iso: d.created_at, icon: AlertOctagon, module: 'dh-t-disputes',
    }));
    return items
      .sort((a, b) => new Date(b.iso).getTime() - new Date(a.iso).getTime())
      .slice(0, 10);
  }, [orders, intimations, creditReqs, disputes, distributorNameById]);

  // ── Portal Branding ───────────────────────────────────────────
  const brandingKey = `erp_distributor_portal_branding_${entityCode}`;
  const [branding, setBranding] = useState<BrandingState>(() => {
    try {
      // [JWT] GET /api/distributor/portal-branding
      const raw = localStorage.getItem(brandingKey);
      if (raw) return JSON.parse(raw) as BrandingState;
    } catch { /* noop */ }
    return {
      subdomain_enabled: false,
      subdomain_prefix: '',
      logo_url: '',
      primary_colour: '#4F46E5',
      contact_email: '',
      support_whatsapp: '',
    };
  });
  const saveBranding = () => {
    try {
      // [JWT] POST /api/distributor/portal-branding
      localStorage.setItem(brandingKey, JSON.stringify(branding));
      toast.success('Portal branding saved');
    } catch { toast.error('Failed to save'); }
  };

  // Last visited
  const lastVisitKey = `erp_dh_last_visit_${entityCode}`;
  const [lastVisitLabel, setLastVisitLabel] = useState<string>('first visit');
  useEffect(() => {
    try {
      // [JWT] GET /api/distributor/last-visit
      const raw = localStorage.getItem(lastVisitKey);
      if (raw) setLastVisitLabel(`Last visited ${relativeTime(raw)}`);
      // [JWT] POST /api/distributor/last-visit
      localStorage.setItem(lastVisitKey, new Date().toISOString());
    } catch { /* noop */ }
  }, [lastVisitKey]);

  return (
    <div className="space-y-6">
      {/* 1. GREETING BAR */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl border border-indigo-600/20 bg-indigo-600/5 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-indigo-600/15">
            <Truck className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {greeting}, {userName}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[10px] border-indigo-600/30 text-indigo-600">
                {entityCode}
              </Badge>
              <span className="text-xs text-muted-foreground">Distributor Hub</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{lastVisitLabel}</p>
      </div>

      {/* 2. 4 PULSE METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(m => {
          const points = spark(m.sparkSeed);
          const max = Math.max(...points);
          return (
            <Card key={m.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{m.label}</p>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center bg-indigo-600/15">
                    <m.icon className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                </div>
                <p className="text-lg font-bold font-mono text-foreground">{m.value}</p>
                <div className="flex items-end gap-0.5 h-6 mt-2">
                  {points.map((p, i) => (
                    <div
                      key={`${m.label}-${i}`}
                      className="flex-1 rounded-sm bg-indigo-600/40"
                      style={{ height: `${(p / max) * 100}%` }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 3. 6 QUICK ACTIONS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickActions.map(a => (
              <button
                key={a.module}
                onClick={() => setHash(a.module)}
                className="group flex items-center gap-3 rounded-lg border border-border/50 p-3 text-left hover:border-indigo-600/40 hover:bg-indigo-600/5 transition-colors"
              >
                <div className="h-8 w-8 rounded-md flex items-center justify-center bg-indigo-600/15 flex-shrink-0">
                  <a.icon className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-indigo-600">
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. RECENT ACTIVITY */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4 text-indigo-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No activity yet — orders, intimations and disputes will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {activity.map(a => (
                <li key={a.id}>
                  <button
                    onClick={() => setHash(a.module)}
                    className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-muted/30 px-2 rounded transition-colors"
                  >
                    <div className="h-8 w-8 rounded-md flex items-center justify-center bg-indigo-600/15 flex-shrink-0">
                      <a.icon className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{a.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{a.sub}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono">{relativeTime(a.iso)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 5. PORTAL BRANDING */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-indigo-600" />
            Portal Branding
          </CardTitle>
          <CardDescription>Customize how your distributors experience the portal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm">Enable branded subdomain</Label>
              <p className="text-xs text-muted-foreground">Your distributors get a dedicated URL</p>
            </div>
            <Switch
              checked={branding.subdomain_enabled}
              onCheckedChange={v => setBranding({ ...branding, subdomain_enabled: v })}
            />
          </div>

          {branding.subdomain_enabled && (
            <div className="space-y-2">
              <Label className="text-xs">Subdomain Prefix</Label>
              <Input
                value={branding.subdomain_prefix}
                onChange={e => setBranding({ ...branding, subdomain_prefix: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="distributors.sharma"
              />
              {branding.subdomain_prefix && (
                <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Partner URL:</span>
                  <span className="text-xs font-mono text-foreground flex-1 truncate">
                    {branding.subdomain_prefix}.prudent360.net.in
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://${branding.subdomain_prefix}.prudent360.net.in`);
                      toast.success('Copied');
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Primary Colour (hex)</Label>
              <Input
                type="color"
                value={branding.primary_colour}
                onChange={e => setBranding({ ...branding, primary_colour: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Support WhatsApp</Label>
              <Input
                value={branding.support_whatsapp}
                onChange={e => setBranding({ ...branding, support_whatsapp: e.target.value })}
                placeholder="9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Contact Email</Label>
              <Input
                type="email"
                value={branding.contact_email}
                onChange={e => setBranding({ ...branding, contact_email: e.target.value })}
                placeholder="support@example.com"
              />
            </div>
          </div>

          <Button
            data-primary
            onClick={saveBranding}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          >
            <Save className="h-4 w-4" /> Save Branding
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DistributorHubWelcome() {
  return <DistributorHubWelcomePanel />;
}
