/**
 * MobileLeadDistributionPage.tsx — Per-telecaller open lead summary
 * Sprint T-Phase-1.1.1l-c
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Network } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type Lead, leadsKey } from '@/types/lead';

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

interface Bucket {
  telecallerId: string;
  telecallerName: string;
  total: number;
  byPlatform: Record<string, number>;
  lastAssigned: string | null;
}

export default function MobileLeadDistributionPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const buckets = useMemo(() => {
    if (!session) return [];
    const leads = loadList<Lead>(leadsKey(session.entity_code));
    const m = new Map<string, Bucket>();
    for (const l of leads) {
      if (!l.assigned_telecaller_id) continue;
      const id = l.assigned_telecaller_id;
      let b = m.get(id);
      if (!b) {
        b = { telecallerId: id, telecallerName: id, total: 0, byPlatform: {}, lastAssigned: null };
        m.set(id, b);
      }
      b.total += 1;
      b.byPlatform[l.platform] = (b.byPlatform[l.platform] ?? 0) + 1;
      const cAt = l.created_at ?? null;
      if (cAt && (!b.lastAssigned || new Date(cAt).getTime() > new Date(b.lastAssigned).getTime())) {
        b.lastAssigned = cAt;
      }
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/supervisor')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Lead Distribution</h1>
      </div>

      {buckets.length === 0 && (
        <Card className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <Network className="h-8 w-8" />
          No leads assigned yet.
        </Card>
      )}

      <div className="space-y-2">
        {buckets.map(b => (
          <Card key={b.telecallerId} className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium font-mono">{b.telecallerName}</p>
              <span className="text-xs font-semibold">{b.total} open</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(b.byPlatform).map(([p, c]) => (
                <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {p}: {c}
                </span>
              ))}
            </div>
            {b.lastAssigned && (
              <p className="text-[10px] text-muted-foreground">Last assigned: {new Date(b.lastAssigned).toLocaleDateString('en-IN')}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
