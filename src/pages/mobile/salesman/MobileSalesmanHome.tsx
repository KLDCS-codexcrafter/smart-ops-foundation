/**
 * MobileSalesmanHome.tsx — Salesman role landing (9-tile mobile CRM)
 * Sprint T-Phase-1.1.1l-a · 1.1.1l-c adds live location tracking toggle
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Navigation, MapPin, PhoneIncoming, Briefcase, Users,
  ClipboardList, ShoppingBag, Target, IndianRupee, LogOut, Activity,
  CheckSquare, Receipt, Clock,
} from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { logMobileTileClick } from '@/lib/mobile-audit';
import { startTracking, stopTracking } from '@/lib/location-tracker-engine';
import { useProjectResources } from '@/hooks/useProjectResources';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

const TILES = [
  { label: "Today's Beat",    icon: Navigation,    to: '/mobile/salesman/beat',            color: 'text-blue-600' },
  { label: 'Visit Check-In',  icon: MapPin,        to: '/mobile/salesman/check-in',        color: 'text-green-600' },
  { label: 'Quick Enquiry',   icon: PhoneIncoming, to: '/mobile/salesman/quick-enquiry',   color: 'text-orange-600' },
  { label: 'My Pipeline',     icon: Briefcase,     to: '/mobile/salesman/pipeline',        color: 'text-purple-600' },
  { label: 'My Customers',    icon: Users,         to: '/mobile/salesman/customers',       color: 'text-cyan-600' },
  { label: 'Visit Log',       icon: ClipboardList, to: '/mobile/salesman/visit-log',       color: 'text-slate-600' },
  { label: 'Secondary Sales', icon: ShoppingBag,   to: '/mobile/salesman/secondary-sales', color: 'text-amber-600' },
  { label: 'My Targets',      icon: Target,        to: '/mobile/salesman/targets',         color: 'text-red-600' },
  { label: 'Commission',      icon: IndianRupee,   to: '/mobile/salesman/commission',      color: 'text-emerald-600' },
  { label: 'Attendance',      icon: CheckSquare,   to: '/mobile/shared/attendance',        color: 'text-sky-600' },
  { label: 'Expenses',        icon: Receipt,       to: '/mobile/shared/expenses',          color: 'text-violet-600' },
];

export default function MobileSalesmanHome() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [trackingOn, setTrackingOn] = useState(false);

  useEffect(() => {
    if (!session) return;
    startTracking({
      entityCode: session.entity_code,
      userId: session.user_id ?? '',
      userName: session.display_name,
      userRole: 'salesman',
    });
    setTrackingOn(true);
    return () => {
      stopTracking();
      setTrackingOn(false);
    };
  }, [session]);

  if (!session) return null;

  const handleTile = (to: string, label: string) => {
    logMobileTileClick(session.entity_code, session.user_id ?? '', session.role, label, to);
    navigate(to);
  };

  const handleLogout = () => {
    stopTracking();
    try { sessionStorage.removeItem('opx_mobile_session'); } catch { /* ignore */ }
    navigate('/mobile/login', { replace: true });
  };

  const handleToggleTracking = () => {
    if (trackingOn) {
      stopTracking();
      setTrackingOn(false);
    } else {
      startTracking({
        entityCode: session.entity_code,
        userId: session.user_id ?? '',
        userName: session.display_name,
        userRole: 'salesman',
      });
      setTrackingOn(true);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Salesman</p>
          <p className="font-semibold text-sm">{session.display_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={trackingOn ? 'default' : 'outline'}
            className={trackingOn ? 'bg-green-600 hover:bg-green-700 h-7 text-[10px] px-2' : 'h-7 text-[10px] px-2'}
            onClick={handleToggleTracking}
          >
            <Activity className="h-3 w-3 mr-1" />
            {trackingOn ? 'Tracking On' : 'Tracking Off'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
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
