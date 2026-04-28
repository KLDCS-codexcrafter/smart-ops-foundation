/**
 * MobileCoverageMapPage.tsx — Last-known location per salesman
 * Sprint T-Phase-1.1.1l-c
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, ExternalLink } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type LocationBreadcrumb, locationBreadcrumbsKey } from '@/types/location-breadcrumb';

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

function relTime(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export default function MobileCoverageMapPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const latestPerUser = useMemo(() => {
    if (!session) return [];
    const all = loadList<LocationBreadcrumb>(locationBreadcrumbsKey(session.entity_code));
    const m = new Map<string, LocationBreadcrumb>();
    for (const b of all) {
      const ex = m.get(b.user_id);
      if (!ex || new Date(b.captured_at).getTime() > new Date(ex.captured_at).getTime()) {
        m.set(b.user_id, b);
      }
    }
    return Array.from(m.values()).sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime());
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/supervisor')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Coverage Map</h1>
      </div>

      {latestPerUser.length === 0 && (
        <Card className="p-6 text-center text-xs text-muted-foreground">
          No location data yet. Salesmen must enable tracking on their device.
        </Card>
      )}

      <div className="space-y-2">
        {latestPerUser.map(b => (
          <Card key={b.id} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{b.user_name}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{b.user_role}</p>
              </div>
              <span className="text-[10px] text-muted-foreground">{relTime(b.captured_at)}</span>
            </div>
            <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {b.latitude.toFixed(5)}, {b.longitude.toFixed(5)}
              {b.accuracy_meters !== null && ` · ±${Math.round(b.accuracy_meters)}m`}
            </div>
            <a
              href={`https://www.google.com/maps?q=${b.latitude},${b.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Open in Maps
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
