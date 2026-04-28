/**
 * MobileSalesmanBeatPage.tsx — Today's beat for the logged-in salesman
 * Sprint T-Phase-1.1.1l-a · Reuses BeatRoute + VisitLog
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Clock, ChevronRight, Navigation } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type BeatRoute, beatRoutesKey } from '@/types/beat-route';
import { type VisitLog, visitLogsKey } from '@/types/visit-log';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

interface CustomerLite {
  id: string;
  name: string;
  address?: string;
}

function loadCustomers(): Record<string, CustomerLite> {
  try {
    const raw = localStorage.getItem('erp_group_customer_master');
    if (!raw) return {};
    const list = JSON.parse(raw) as Array<{ id: string; name?: string; legal_name?: string; address?: string }>;
    const map: Record<string, CustomerLite> = {};
    for (const c of list) {
      map[c.id] = { id: c.id, name: c.name ?? c.legal_name ?? 'Customer', address: c.address };
    }
    return map;
  } catch { return {}; }
}

function daysAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export default function MobileSalesmanBeatPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const beats = useMemo(
    () => session ? loadList<BeatRoute>(beatRoutesKey(session.entity_code)) : [],
    [session],
  );
  const visits = useMemo(
    () => session ? loadList<VisitLog>(visitLogsKey(session.entity_code)) : [],
    [session],
  );
  const customerMap = useMemo(() => loadCustomers(), []);

  const myBeats = useMemo(
    () => session ? beats.filter(b => b.salesman_id === session.user_id && b.is_active) : [],
    [beats, session],
  );

  const lastVisitByCustomer = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of visits) {
      if (v.salesman_id !== session?.user_id) continue;
      if (!map[v.customer_id] || v.check_in_time > map[v.customer_id]) {
        map[v.customer_id] = v.check_in_time;
      }
    }
    return map;
  }, [visits, session]);

  const allStops = useMemo(() => {
    return myBeats.flatMap(b =>
      [...b.stops]
        .sort((a, z) => a.sequence - z.sequence)
        .map(stop => ({
          stop_id: stop.id,
          customer_id: stop.customer_id,
          customer_name: customerMap[stop.customer_id]?.name ?? stop.customer_id,
          address: customerMap[stop.customer_id]?.address,
          beat_id: b.id,
          beat_name: b.beat_name,
        })),
    );
  }, [myBeats, customerMap]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/salesman')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Today&apos;s Beat</h1>
        <Badge variant="outline" className="text-[10px] ml-auto">{allStops.length} stops</Badge>
      </div>

      {allStops.length === 0 ? (
        <Card className="p-6 text-center">
          <Navigation className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No beat assigned</p>
          <p className="text-xs text-muted-foreground mt-1">
            Contact your supervisor to assign a beat for today.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {allStops.map((stop, idx) => (
            <Card
              key={`${stop.beat_id}-${stop.stop_id}-${idx}`}
              className="p-3 cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => navigate(`/mobile/salesman/check-in?customerId=${stop.customer_id}`)}
            >
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-[11px] shrink-0">
                  {idx + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{stop.customer_name}</p>
                  {stop.address && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{stop.address}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3 shrink-0" />
                    Last visit: {daysAgo(lastVisitByCustomer[stop.customer_id] ?? null)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
