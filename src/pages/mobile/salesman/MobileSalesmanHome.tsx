/**
 * MobileSalesmanHome.tsx — Salesman role landing (9-tile mobile CRM)
 * Sprint T-Phase-1.1.1l-a
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Navigation, MapPin, PhoneIncoming, Briefcase, Users,
  ClipboardList, ShoppingBag, Target, IndianRupee, LogOut,
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
  { label: "Today's Beat",    icon: Navigation,    to: '/mobile/salesman/beat' },
  { label: 'Visit Check-In',  icon: MapPin,        to: '/mobile/salesman/check-in' },
  { label: 'Quick Enquiry',   icon: PhoneIncoming, to: '/mobile/salesman/quick-enquiry' },
  { label: 'My Pipeline',     icon: Briefcase,     to: '/mobile/salesman/pipeline' },
  { label: 'My Customers',    icon: Users,         to: '/mobile/salesman/customers' },
  { label: 'Visit Log',       icon: ClipboardList, to: '/mobile/salesman/visit-log' },
  { label: 'Secondary Sales', icon: ShoppingBag,   to: '/mobile/salesman/secondary-sales' },
  { label: 'My Targets',      icon: Target,        to: '/mobile/salesman/targets' },
  { label: 'Commission',      icon: IndianRupee,   to: '/mobile/salesman/commission' },
];

export default function MobileSalesmanHome() {
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
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Salesman</p>
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
            <t.icon className="h-7 w-7 text-slate-700" />
            <p className="text-[11px] text-center leading-tight font-medium">{t.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
