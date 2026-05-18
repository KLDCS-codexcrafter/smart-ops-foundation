/**
 * @file        VendorPortalWelcome.tsx
 * @sprint      T-Phase-1.A.1-VendorPortal-Foundation
 * @decisions   D-NEW-DN · D-NEW-DQ · A-Q9=B
 */
import { useMemo, useEffect, useState } from 'react';
import {
  Building2, FileSignature, UserPlus, AlertTriangle,
  Activity, Award, MessageSquare, Bot, Megaphone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import type { VendorPortalModule } from './VendorPortalSidebar.types';

interface VendorPortalWelcomeProps {
  onNavigate: (m: VendorPortalModule) => void;
}

function ls<T>(k: string): T[] {
  try {
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
    const raw = localStorage.getItem('4ds_login_credential');
    if (raw) {
      const parsed = JSON.parse(raw) as { username?: string; email?: string };
      return parsed.username ?? parsed.email?.split('@')[0] ?? 'Operator';
    }
  } catch { /* noop */ }
  return 'Operator';
}

export function VendorPortalWelcome({ onNavigate }: VendorPortalWelcomeProps): JSX.Element {
  const userName = useMemo(() => getUserName(), []);
  const greeting = useMemo(() => getGreeting(), []);

  const entityCode = useMemo(() => {
    try {
      const raw = localStorage.getItem('active_entity_code');
      return raw ?? DEFAULT_ENTITY_SHORTCODE;
    } catch { return DEFAULT_ENTITY_SHORTCODE; }
  }, []);

  // [JWT] GET /api/parties?entity={entityCode}&type=vendor
  const partiesRaw = useMemo(() => ls<{ id: string; party_type: string; status: string }>(`erp_parties_${entityCode}`), [entityCode]);
  const activeVendorsCount = useMemo(
    () => partiesRaw.filter(p => (p.party_type === 'vendor' || p.party_type === 'both') && p.status === 'active').length,
    [partiesRaw],
  );

  const onboardingsCount = useMemo(() => {
    try {
      const raw = localStorage.getItem('erp_vendor_onboarding_state');
      if (!raw) return 0;
      const state = JSON.parse(raw) as { stage?: string };
      return state.stage && state.stage !== 'complete' ? 1 : 0;
    } catch { return 0; }
  }, []);

  const agreementsCount = useMemo(() => {
    const all = ls<{ status: string }>(`erp_vendor_agreements_${entityCode}`);
    return all.filter(a => a.status === 'active' || a.status === 'pending').length;
  }, [entityCode]);

  const msmeAtRiskCount = 0;

  const metrics = [
    { label: 'Active Vendors', value: String(activeVendorsCount), icon: Building2 },
    { label: 'Pending Onboardings', value: String(onboardingsCount), icon: UserPlus },
    { label: 'Open Agreements', value: String(agreementsCount), icon: FileSignature },
    { label: 'MSME-43BH At-Risk', value: String(msmeAtRiskCount), icon: AlertTriangle },
  ];

  const quickActions: { label: string; icon: React.ElementType; module: VendorPortalModule }[] = [
    { label: 'Vendor Master',           icon: Building2,    module: 'vendor-master' },
    { label: 'Review Agreements',       icon: FileSignature, module: 'vendor-agreements' },
    { label: 'Onboarding Inbox',        icon: UserPlus,     module: 'vendor-onboarding-inbox' },
    { label: 'Vendor Scoring',          icon: Award,        module: 'vendor-scoring' },
    { label: 'MSME Compliance',         icon: AlertTriangle, module: 'msme-compliance' },
    { label: 'Vendor Broadcast',        icon: Megaphone,    module: 'vendor-broadcast' },
  ];

  const lastVisitKey = `erp_vp_last_visit_${entityCode}`;
  const [lastVisitLabel, setLastVisitLabel] = useState<string>('first visit');
  useEffect(() => {
    try {
      const raw = localStorage.getItem(lastVisitKey);
      if (raw) {
        const diff = Date.now() - new Date(raw).getTime();
        const mins = Math.floor(diff / 60000);
        let label = 'just now';
        if (mins >= 60) {
          const hrs = Math.floor(mins / 60);
          if (hrs >= 24) label = `${Math.floor(hrs / 24)} d ago`;
          else label = `${hrs} hr ago`;
        } else if (mins >= 1) label = `${mins} min ago`;
        setLastVisitLabel(`Last visited ${label}`);
      }
      localStorage.setItem(lastVisitKey, new Date().toISOString());
    } catch { /* noop */ }
  }, [lastVisitKey]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl border border-slate-500/20 bg-slate-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-slate-500/15">
            <Building2 className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">{greeting}, {userName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[10px] border-slate-500/30 text-slate-600">{entityCode}</Badge>
              <span className="text-xs text-muted-foreground">Vendor Portal · Tenant-Internal Hub</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{lastVisitLabel}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map(m => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{m.label}</p>
                <div className="w-7 h-7 rounded-md flex items-center justify-center bg-slate-500/15">
                  <m.icon className="h-3.5 w-3.5 text-slate-600" />
                </div>
              </div>
              <p className="text-lg font-bold font-mono text-foreground">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickActions.map(a => (
              <button
                key={a.module}
                onClick={() => onNavigate(a.module)}
                className="group flex items-center gap-3 rounded-lg border border-border/50 p-3 text-left hover:border-slate-500/40 hover:bg-slate-500/5 transition-colors"
              >
                <div className="h-8 w-8 rounded-md flex items-center justify-center bg-slate-500/15 flex-shrink-0">
                  <a.icon className="h-4 w-4 text-slate-600" />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-slate-600">{a.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. SAATHI TILE (D-NEW-DQ · admin command surface ACTIVE post-Sprint A.2 · Phase 2 functionality) */}
      <Card
        className="border-slate-500/50 bg-gradient-to-br from-slate-500/5 to-transparent hover:border-slate-500/70 hover:bg-slate-500/10 transition-colors cursor-pointer"
        onClick={() => onNavigate('saathi-admin')}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-slate-600" />
            <div>
              <p className="font-medium flex items-center gap-2">
                Saathi · Vendor AI Co-Pilot
                <Badge variant="default" className="text-[9px] bg-slate-600">Admin Surface Active</Badge>
                <Badge variant="outline" className="text-[9px]">Phase 2 functionality</Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                WhatsApp-native AI · drafts quotes · negotiates · tracks payments · multi-lingual (Hindi · Tamil · Bengali · Gujarati) · click to explore admin command surface
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ROADMAP CARD · Sprint A-b complete · all 5 internal panels live */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-600" />
            Internal Panels · Sprint A-b Complete
            <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
              5 of 5 live
            </Badge>
          </CardTitle>
          <CardDescription>All Phase 1 admin surfaces live · Sprint A-c next (External Portal Expansion)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <button
              onClick={() => onNavigate('vendor-scoring')}
              className="flex flex-col items-center gap-1 p-2 rounded border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors cursor-pointer"
            >
              <Award className="h-4 w-4 text-emerald-600" />
              <span className="text-center">Scoring Dashboard</span>
              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Live</Badge>
            </button>
            <button
              onClick={() => onNavigate('msme-compliance')}
              className="flex flex-col items-center gap-1 p-2 rounded border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors cursor-pointer"
            >
              <AlertTriangle className="h-4 w-4 text-emerald-600" />
              <span className="text-center">MSME-43BH Tracker</span>
              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Live</Badge>
            </button>
            <button
              onClick={() => onNavigate('vendor-activity-monitor')}
              className="flex flex-col items-center gap-1 p-2 rounded border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors cursor-pointer"
            >
              <Activity className="h-4 w-4 text-emerald-600" />
              <span className="text-center">Activity Monitor</span>
              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Live</Badge>
            </button>
            <button
              onClick={() => onNavigate('vendor-communication-log')}
              className="flex flex-col items-center gap-1 p-2 rounded border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              <span className="text-center">Communication Log</span>
              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Live</Badge>
            </button>
            <button
              onClick={() => onNavigate('vendor-broadcast')}
              className="flex flex-col items-center gap-1 p-2 rounded border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors cursor-pointer"
            >
              <Megaphone className="h-4 w-4 text-emerald-600" />
              <span className="text-center">Broadcast Console</span>
              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Live</Badge>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
