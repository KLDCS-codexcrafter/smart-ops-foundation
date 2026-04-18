/**
 * PartnerDashboard.tsx — Distributor home: credit, monthly target, activity.
 * Sprint 10. Indigo-600 accent. Reads partner from localStorage scoped by session.
 * [JWT] Replace localStorage with GET /api/partner/dashboard.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee, TrendingUp, AlertTriangle, ShoppingCart,
  Package, FileText, Megaphone, ArrowRight, CircleDollarSign,
} from 'lucide-react';
import { PartnerLayout } from '@/components/layout/PartnerLayout';
import { getPartnerSession, loadPartners } from '@/lib/partner-auth-engine';
import { partnerActivityKey, type PartnerActivity } from '@/types/partner';
import { formatINR } from '@/lib/india-validations';

const INDIGO = 'hsl(231 48% 58%)';
const INDIGO_BG = 'hsl(231 48% 48% / 0.12)';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}

export function PartnerDashboardPanel() { return <PartnerDashboard />; }

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const session = getPartnerSession();

  const partner = useMemo(() => {
    if (!session) return null;
    return loadPartners(session.entity_code).find(p => p.id === session.partner_id) ?? null;
  }, [session]);

  const activity = useMemo<PartnerActivity[]>(() => {
    if (!session) return [];
    const all = ls<PartnerActivity>(partnerActivityKey(session.entity_code));
    return all.filter(a => a.partner_id === session.partner_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);
  }, [session]);

  if (!session || !partner) {
    return (
      <PartnerLayout title="Dashboard">
        <div className="rounded-2xl border border-border/50 p-8 text-center text-sm text-muted-foreground">
          Partner profile unavailable. Please sign in again.
        </div>
      </PartnerLayout>
    );
  }

  const creditUsedPct = partner.credit_limit_paise > 0
    ? Math.min(100, Math.round((partner.outstanding_paise / partner.credit_limit_paise) * 100))
    : 0;
  const targetPct = partner.monthly_target_paise > 0
    ? Math.min(100, Math.round((partner.monthly_achieved_paise / partner.monthly_target_paise) * 100))
    : 0;
  const available = Math.max(0, partner.credit_limit_paise - partner.outstanding_paise);
  const overdue = partner.overdue_paise;

  const kpis = [
    { label: 'Available Credit', value: formatINR(available), icon: CircleDollarSign, accent: 'hsl(142 71% 45%)' },
    { label: 'Outstanding', value: formatINR(partner.outstanding_paise), icon: IndianRupee, accent: INDIGO },
    { label: 'Overdue', value: formatINR(overdue), icon: AlertTriangle, accent: overdue > 0 ? 'hsl(0 72% 51%)' : 'hsl(215 16% 47%)' },
    { label: 'MTD Achieved', value: formatINR(partner.monthly_achieved_paise), icon: TrendingUp, accent: 'hsl(38 92% 50%)' },
  ];

  const quickActions = [
    { label: 'Browse Catalog', icon: Package, url: '/partner/catalog' },
    { label: 'View Cart', icon: ShoppingCart, url: '/partner/cart' },
    { label: 'My Invoices', icon: FileText, url: '/partner/invoices' },
    { label: 'Pay Now', icon: IndianRupee, url: '/partner/payments' },
  ];

  return (
    <PartnerLayout
      title={`Welcome, ${partner.legal_name.split(' ')[0]}`}
      subtitle={`${partner.partner_code} • ${session.entity_code}`}
    >
      <div className="space-y-6 animate-fade-in">
        {/* KPI grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  {k.label}
                </p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'hsl(231 48% 48% / 0.12)' }}>
                  <k.icon className="h-4 w-4" style={{ color: k.accent }} />
                </div>
              </div>
              <p className="text-xl font-bold font-mono text-foreground">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Credit & Target */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Credit Utilization</h3>
              <span className="text-xs font-mono text-muted-foreground">{creditUsedPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full transition-all"
                style={{ width: `${creditUsedPct}%`, background: creditUsedPct > 85 ? 'hsl(0 72% 51%)' : INDIGO }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Limit</p>
                <p className="font-mono font-semibold text-foreground">{formatINR(partner.credit_limit_paise)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Available</p>
                <p className="font-mono font-semibold" style={{ color: 'hsl(142 71% 45%)' }}>
                  {formatINR(available)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Monthly Target</h3>
              <span className="text-xs font-mono text-muted-foreground">{targetPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full transition-all"
                style={{ width: `${targetPct}%`, background: targetPct >= 100 ? 'hsl(142 71% 45%)' : INDIGO }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Target</p>
                <p className="font-mono font-semibold text-foreground">{formatINR(partner.monthly_target_paise)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Achieved</p>
                <p className="font-mono font-semibold text-foreground">{formatINR(partner.monthly_achieved_paise)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map(a => (
              <button
                key={a.url}
                onClick={() => navigate(a.url)}
                className="rounded-2xl border border-border/50 bg-card p-4 text-left hover:border-border transition-all hover:shadow-sm group"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: INDIGO_BG }}>
                  <a.icon className="h-4 w-4" style={{ color: INDIGO }} />
                </div>
                <p className="text-sm font-medium text-foreground">{a.label}</p>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-1 group-hover:translate-x-1 transition-transform" />
              </button>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </div>
          {activity.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No recent activity. New invoices, payments and broadcasts will appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map(a => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border/30 px-3 py-2.5">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: INDIGO_BG }}>
                    <ActivityIcon kind={a.kind} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.detail}</p>
                  </div>
                  {typeof a.amount_paise === 'number' && a.amount_paise > 0 && (
                    <p className="text-xs font-mono font-semibold text-foreground shrink-0">
                      {formatINR(a.amount_paise)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PartnerLayout>
  );
}

function ActivityIcon({ kind }: { kind: PartnerActivity['kind'] }) {
  const map: Record<PartnerActivity['kind'], typeof FileText> = {
    invoice_posted: FileText,
    payment_received: IndianRupee,
    order_approved: ShoppingCart,
    order_rejected: AlertTriangle,
    broadcast_received: Megaphone,
    credit_limit_changed: CircleDollarSign,
  };
  const Icon = map[kind] ?? FileText;
  return <Icon className="h-3.5 w-3.5" style={{ color: INDIGO }} />;
}
