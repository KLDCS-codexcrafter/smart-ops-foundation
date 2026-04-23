/**
 * DistributorHub.tsx — Tenant-internal hub for managing the distributor programme.
 * Sprint 10. Indigo-600 accent. Peer of SalesX/ReceivX/FineCore hubs.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users2, FileCheck, Megaphone, Layers, BarChart3, UserPlus,
  ArrowRight, IndianRupee, ShoppingBag, Palette, Copy, Save,
  Network, TrendingUp, AlertOctagon,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatINR } from '@/lib/india-validations';
import { distributorsKey, type Distributor } from '@/types/distributor';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  distributorOrdersKey, distributorIntimationsKey,
  type DistributorOrder, type DistributorPaymentIntimation,
} from '@/types/distributor-order';

const INDIGO = 'hsl(231 48% 58%)';
const INDIGO_BG = 'hsl(231 48% 48% / 0.12)';

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/{key}
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T[]) : [];
  } catch { return []; }
}

export function DistributorHubPanel() { return <DistributorHub />; }

export default function DistributorHub() {
  const navigate = useNavigate();

  const entityCode = useMemo(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('erp_distributors_'));
    return keys[0]?.replace('erp_distributors_', '') ?? DEFAULT_ENTITY_SHORTCODE;
  }, []);

  const distributors = useMemo(() => ls<Distributor>(distributorsKey(entityCode)), [entityCode]);
  const orders = useMemo(() => ls<DistributorOrder>(distributorOrdersKey(entityCode)), [entityCode]);
  const intimations = useMemo(() => ls<DistributorPaymentIntimation>(distributorIntimationsKey(entityCode)), [entityCode]);

  // ── Portal Branding (Sprint 10 Part D · Feature #1) ──
  interface BrandingState {
    subdomain_enabled: boolean;
    subdomain_prefix: string;
    logo_url: string;
    primary_colour: string;
    contact_email: string;
    support_whatsapp: string;
  }
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

  const activeCount = distributors.filter(d => d.status === 'active').length;
  const monthOrders = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return orders.filter(o => new Date(o.created_at).getTime() >= cutoff).length;
  }, [orders]);
  const outstandingAR = distributors.reduce((s, d) => s + d.outstanding_paise, 0);
  const pendingIntimations = intimations.filter(i => i.status === 'submitted' || i.status === 'verifying').length;

  const kpis = [
    { label: 'Active Distributors', value: String(activeCount), icon: Users2 },
    { label: 'Orders (30d)', value: String(monthOrders), icon: ShoppingBag },
    { label: 'Outstanding AR', value: formatINR(outstandingAR), icon: IndianRupee },
    { label: 'Pending Intimations', value: String(pendingIntimations), icon: FileCheck },
  ];

  const tiles = [
    { title: 'Enrolled Distributors', icon: Users2,
      description: 'View, edit, suspend distributor accounts',
      route: '/erp/masters/customer?filter=portal_enabled' },
    { title: 'Invitations Queue', icon: UserPlus,
      description: 'Send portal invitations to new distributors',
      route: '/erp/distributor-hub/invitations',
      badge: 'Soon' },
    { title: 'Intimation Queue', icon: FileCheck,
      description: 'Verify payment intimations and convert to receipts',
      route: '/erp/finecore/distributor-intimations' },
    { title: 'Broadcast Console', icon: Megaphone,
      description: 'Fire WhatsApp / Email / In-portal messages by tier',
      route: '/erp/salesx/distributor-broadcast' },
    { title: 'Catalog Layers', icon: Layers,
      description: 'Manage tier-priced item lists for distributors',
      route: '/erp/inventory-hub/price-lists' },
    // Sprint 11a — hierarchy, credit, disputes
    { title: 'Distribution Hierarchy', icon: Network,
      description: 'Super Stockist → Distributor → Sub-Dealer → Retailer tree',
      route: '/erp/distributor/hierarchy' },
    { title: 'Credit Approvals', icon: TrendingUp,
      description: 'Review credit-limit increase requests from distributors',
      route: '/erp/distributor-hub/credit-approvals' },
    { title: 'Dispute Queue', icon: AlertOctagon,
      description: 'Short supply, damage and rate-mismatch claims',
      route: '/erp/distributor-hub/disputes' },
    { title: 'Analytics', icon: BarChart3,
      description: 'Distributor engagement, sentiment, mood-of-month — Sprint 12',
      route: '#',
      badge: 'Planned' },
  ];

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(k => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{k.label}</p>
                  <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: INDIGO_BG }}>
                    <k.icon className="h-3.5 w-3.5" style={{ color: INDIGO }} />
                  </div>
                </div>
                <p className="text-lg font-bold font-mono text-foreground">{k.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map(tile => {
            const disabled = tile.route === '#';
            return (
              <Card
                key={tile.title}
                className={disabled ? 'opacity-60' : 'hover:shadow-md transition-shadow cursor-pointer'}
                onClick={() => { if (!disabled) navigate(tile.route); }}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: INDIGO_BG }}>
                      <tile.icon className="h-4 w-4" style={{ color: INDIGO }} />
                    </div>
                    {tile.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {tile.badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{tile.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tile.description}</p>
                  </div>
                  {!disabled && (
                    <div className="flex items-center text-xs" style={{ color: INDIGO }}>
                      Open <ArrowRight className="h-3 w-3 ml-1" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Portal Branding (Sprint 10 Part D · Feature #1) ───────────────── */}
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
              onClick={saveBranding}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <Save className="h-4 w-4" /> Save Branding
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
