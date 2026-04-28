/**
 * MobileTelecallerHome.tsx — Telecaller role landing (10-tile mobile WFH cycle)
 * Sprint T-Phase-1.1.1l-b
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Phone, PhoneIncoming, Briefcase, Send, Users,
  Inbox, Bell, MessageSquare, BarChart3, History, LogOut,
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
  { label: 'Call Queue',     icon: Phone,         to: '/mobile/telecaller/queue',         color: 'text-blue-600' },
  { label: 'Quick Enquiry',  icon: PhoneIncoming, to: '/mobile/telecaller/quick-enquiry', color: 'text-orange-600' },
  { label: 'My Pipeline',    icon: Briefcase,     to: '/mobile/telecaller/pipeline',      color: 'text-purple-600' },
  { label: 'Quote Send',     icon: Send,          to: '/mobile/telecaller/quote-send',    color: 'text-teal-600' },
  { label: 'My Customers',   icon: Users,         to: '/mobile/telecaller/customers',     color: 'text-cyan-600' },
  { label: 'Lead Inbox',     icon: Inbox,         to: '/mobile/telecaller/leads',         color: 'text-indigo-600' },
  { label: 'Reminders',      icon: Bell,          to: '/mobile/telecaller/reminders',     color: 'text-amber-600' },
  { label: 'WA Templates',   icon: MessageSquare, to: '/mobile/telecaller/wa-templates',  color: 'text-emerald-600' },
  { label: 'My Stats',       icon: BarChart3,     to: '/mobile/telecaller/stats',         color: 'text-red-600' },
  { label: 'Call Log',       icon: History,       to: '/mobile/telecaller/call-log',      color: 'text-slate-600' },
  { label: 'Attendance',     icon: CheckSquare,   to: '/mobile/shared/attendance',        color: 'text-sky-600' },
  { label: 'Expenses',       icon: Receipt,       to: '/mobile/shared/expenses',          color: 'text-violet-600' },
];

export default function MobileTelecallerHome() {
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
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Telecaller</p>
          <p className="font-semibold text-sm">{session.display_name}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
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
