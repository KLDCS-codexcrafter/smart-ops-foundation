/**
 * @file        src/pages/vendor-portal/VendorDashboard.tsx
 * @purpose     Vendor home at /vendor-portal · KPI tiles · quick actions · A-c roadmap · legacy access
 * @who         External vendor users · authenticated via VendorPortalSession
 * @when        2026-05-18 (Sprint A-c.1)
 * @sprint      T-Phase-1.A-c.1-VendorPortal-Layout-Dashboard-Login
 * @iso         ISO 25010 Usability · Functional Suitability
 * @whom        Audit Owner
 * @decisions   D-272 · A-c-Q3=B · A-c-Q10=B Saathi badges where automation planned · A-c-Q12=C
 * @disciplines FR-30 · FR-50 · FR-58
 * @reuses      vendor-portal-auth-engine · vendor-portal-scope · rfqsKey · shadcn/ui
 * @[JWT]       N/A
 */
import { useMemo } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText, Send, ShoppingCart, FileUp, Shield, BarChart, MessageSquare,
  Clock, CheckCircle, TrendingUp, Calendar, Bot, AlertCircle, User, Sparkles,
} from 'lucide-react';
import VendorPortalLayout from './VendorPortalLayout';
import { getVendorSession } from '@/lib/vendor-portal-auth-engine';
import { scopeRfqsForVendor } from '@/lib/vendor-portal-scope';
import { rfqsKey, type RFQ } from '@/types/rfq';
import { useT } from '@/lib/i18n-engine';

function loadRfqs(entityCode: string): RFQ[] {
  try {
    const raw = localStorage.getItem(rfqsKey(entityCode));
    return raw ? (JSON.parse(raw) as RFQ[]) : [];
  } catch { return []; }
}

export default function VendorDashboard(): JSX.Element {
  const navigate = useNavigate();
  const session = getVendorSession();
  const t = useT();

  const counts = useMemo(() => {
    if (!session) return { pending: 0, quoted: 0, declined: 0, total: 0 };
    const all = loadRfqs(session.entity_code);
    const scoped = scopeRfqsForVendor(all, session);
    const pending = scoped.filter((r) =>
      r.status === 'sent' || r.status === 'received_by_vendor' || r.status === 'opened'
    ).length;
    const quoted = scoped.filter((r) =>
      r.status === 'quoted' || r.status === 'partial_quoted' || r.status === 'awarded'
    ).length;
    const declined = scoped.filter((r) =>
      r.status === 'declined' || r.status === 'timeout' || r.status === 'cancelled'
    ).length;
    return { pending, quoted, declined, total: scoped.length };
  }, [session]);

  if (!session) {
    return <Navigate to="/vendor-portal/login" replace />;
  }

  const stats = [
    { label: t('vendor.dashboard.kpi_open', 'Open RFQs'),  value: counts.pending,  icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-500/10' },
    { label: t('vendor.dashboard.kpi_quoted', 'Quoted'),     value: counts.quoted,   icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { label: t('vendor.dashboard.kpi_declined', 'Declined'),   value: counts.declined, icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-500/10' },
    { label: t('vendor.dashboard.kpi_lifetime', 'Lifetime'),   value: counts.total,    icon: TrendingUp,    color: 'text-blue-600',    bg: 'bg-blue-500/10' },
  ];

  return (
    <VendorPortalLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t('vendor.dashboard.welcome', 'Welcome, {name}', { name: session.party_name })}</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{session.party_code}</span> · Entity{' '}
              <span className="font-mono">{session.entity_code}</span> ·{' '}
              {t('vendor.dashboard.session_expires', 'Session valid until {date}', { date: new Date(session.expires_at).toLocaleString('en-IN') })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {session.must_change_password && (
              <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1">
                <AlertCircle className="h-3 w-3" /> {t('vendor.dashboard.set_password_alert', 'Set password in Profile')}
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" /> {new Date().toLocaleDateString('en-IN')}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{s.label}</p>
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${s.bg}`}>
                      <Icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold font-mono">{s.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('vendor.dashboard.quick_actions', 'Quick Actions')}</CardTitle>
            <CardDescription>Jump to common workflows</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => navigate('/vendor-portal/inbox')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <FileText className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium">View Enquiries</span>
              <Badge variant="outline" className="text-[9px]">{counts.pending} open</Badge>
            </button>
            <div className="relative flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border/50">
              <Send className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Submit Bids</span>
              <Badge variant="outline" className="text-[9px]">A-c.2</Badge>
              <Badge variant="outline" className="absolute top-1 right-1 gap-1 text-[9px]">
                <Bot className="h-3 w-3" /> Saathi
              </Badge>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border/50">
              <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">View POs</span>
              <Badge variant="outline" className="text-[9px]">A-c.2</Badge>
            </div>
            <div className="relative flex flex-col items-center gap-2 p-4 rounded-lg border border-dashed border-border/50">
              <FileUp className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Upload Invoice</span>
              <Badge variant="outline" className="text-[9px]">A-c.3</Badge>
              <Badge variant="outline" className="absolute top-1 right-1 gap-1 text-[9px]">
                <Bot className="h-3 w-3" /> Saathi
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('vendor.dashboard.coming_soon', 'Coming Soon')}</CardTitle>
            <CardDescription>External portal expansion · Sprint A-c.2 + A-c.3</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex flex-col items-center gap-1 p-2 rounded border border-border/50">
              <Shield className="h-4 w-4 text-slate-600" />
              <span className="text-center">KYC Management</span>
              <Badge variant="outline" className="text-[9px]">A-c.3</Badge>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded border border-border/50">
              <BarChart className="h-4 w-4 text-slate-600" />
              <span className="text-center">Your Performance</span>
              <Badge variant="outline" className="text-[9px]">A-c.3</Badge>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded border border-border/50">
              <MessageSquare className="h-4 w-4 text-slate-600" />
              <span className="text-center">Messages</span>
              <Badge variant="outline" className="text-[9px]">A-c.3</Badge>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded border border-emerald-500/30 bg-emerald-500/5">
              <p className="text-sm font-medium flex items-center justify-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-600" />
                {t('vendor.dashboard.coach_card_title', 'AI Quote Coach')}
              </p>
              <Badge variant="outline" className="text-[9px] bg-emerald-500/15 text-emerald-700 border-emerald-500/30">
                {t('vendor.dashboard.coach_live', 'Live')}
              </Badge>
              <p className="text-[10px] text-muted-foreground text-center">
                {t('vendor.dashboard.coach_summary', 'Real-time bid coaching · peer rates · win-rate insights')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('vendor.dashboard.legacy_access', 'Legacy Access')}</CardTitle>
            <CardDescription>Existing flows · being modernized in Sprint A-d</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/vendor-portal/profile">
                <User className="h-4 w-4 mr-2" /> Profile
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/vendor-portal/commlog">
                <MessageSquare className="h-4 w-4 mr-2" /> Legacy CommLog
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </VendorPortalLayout>
  );
}
