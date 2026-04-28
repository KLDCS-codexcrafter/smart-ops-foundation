/**
 * MobileManagerHome.tsx — Sales Manager 8-tile executive dashboard
 * Sprint T-Phase-1.1.1l-c
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity, Sparkles, Target, TrendingUp, Megaphone,
  GitBranch, BarChart3, AlertTriangle, LogOut,
  CheckSquare, Receipt,
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
  { label: 'Pipeline Health',      icon: Activity,      to: '/mobile/manager/pipeline-health',      color: 'text-blue-600' },
  { label: 'Smart Insights',       icon: Sparkles,      to: '/mobile/manager/smart-insights',       color: 'text-orange-600' },
  { label: 'Team Targets',         icon: Target,        to: '/mobile/manager/targets',              color: 'text-red-600' },
  { label: 'Revenue Trend',        icon: TrendingUp,    to: '/mobile/manager/revenue-trend',        color: 'text-green-600' },
  { label: 'Campaign Performance', icon: Megaphone,     to: '/mobile/manager/campaign-performance', color: 'text-amber-600' },
  { label: 'Cross-Dept Handoff',   icon: GitBranch,     to: '/mobile/manager/cross-dept-handoff',   color: 'text-purple-600' },
  { label: 'Team Stats',           icon: BarChart3,     to: '/mobile/manager/team-stats',           color: 'text-cyan-600' },
  { label: 'Compliance Alerts',    icon: AlertTriangle, to: '/mobile/manager/compliance-alerts',    color: 'text-rose-600' },
  { label: 'Attendance',           icon: CheckSquare,   to: '/mobile/shared/attendance',            color: 'text-sky-600' },
  { label: 'Expenses',             icon: Receipt,       to: '/mobile/shared/expenses',              color: 'text-violet-600' },
];

export default function MobileManagerHome() {
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
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Sales Manager</p>
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
