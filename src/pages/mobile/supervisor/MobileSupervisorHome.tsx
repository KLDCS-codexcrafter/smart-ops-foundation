/**
 * MobileSupervisorHome.tsx — Supervisor 8-tile oversight dashboard
 * Sprint T-Phase-1.1.1l-c
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users2, ShieldCheck, Map, Star, Network,
  ClipboardList, AlertTriangle, BarChart3, LogOut,
} from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { logMobileTileClick } from '@/lib/mobile-audit';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

const TILES = [
  { label: 'Team Live View',    icon: Users2,        to: '/mobile/supervisor/team-live',         color: 'text-blue-600' },
  { label: 'Approvals',         icon: ShieldCheck,   to: '/mobile/supervisor/approvals',         color: 'text-orange-600' },
  { label: 'Coverage Map',      icon: Map,           to: '/mobile/supervisor/coverage-map',      color: 'text-green-600' },
  { label: 'Quality Reviews',   icon: Star,          to: '/mobile/supervisor/quality-reviews',   color: 'text-amber-600' },
  { label: 'Lead Distribution', icon: Network,       to: '/mobile/supervisor/lead-distribution', color: 'text-purple-600' },
  { label: 'Visit Log Review',  icon: ClipboardList, to: '/mobile/supervisor/visit-log-review',  color: 'text-cyan-600' },
  { label: 'Compliance Alerts', icon: AlertTriangle, to: '/mobile/supervisor/compliance-alerts', color: 'text-red-600' },
  { label: 'Team Stats',        icon: BarChart3,     to: '/mobile/supervisor/team-stats',        color: 'text-emerald-600' },
];

export default function MobileSupervisorHome() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  if (!session) return null;

  const handleTile = (to: string, label: string) => {
    logMobileTileClick(session.entity_code, session.user_id ?? '', session.role, label, to);
    navigate(to);
  };

  const handleLogout = () => {
    try { sessionStorage.removeItem('opx_mobile_session'); } catch { /* ignore */ }
    navigate('/mobile/login', { replace: true });
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Supervisor</p>
          <p className="font-semibold text-sm">{session.display_name}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TILES.map(t => (
          <Card
            key={t.to}
            className="aspect-square p-3 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-orange-500/40 active:scale-95 transition-transform"
            onClick={() => handleTile(t.to, t.label)}
          >
            <t.icon className={`h-7 w-7 ${t.color}`} />
            <p className="text-[11px] text-center leading-tight font-medium">{t.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
