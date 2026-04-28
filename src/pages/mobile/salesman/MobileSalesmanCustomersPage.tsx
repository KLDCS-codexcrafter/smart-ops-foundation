/**
 * MobileSalesmanCustomersPage.tsx — Read-only customers visited by this salesman
 * Sprint T-Phase-1.1.1l-a
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type VisitLog, visitLogsKey } from '@/types/visit-log';
import { type Quotation, quotationsKey } from '@/types/quotation';

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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MobileSalesmanCustomersPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const visits = useMemo(
    () => session ? loadList<VisitLog>(visitLogsKey(session.entity_code)) : [],
    [session],
  );
  const quotations = useMemo(
    () => session ? loadList<Quotation>(quotationsKey(session.entity_code)) : [],
    [session],
  );

  const customers = useMemo(() => {
    if (!session) return [];
    const map = new Map<string, { id: string; name: string; lastVisit: string; quoteCount: number }>();
    for (const v of visits) {
      if (v.salesman_id !== session.user_id) continue;
      const existing = map.get(v.customer_id);
      if (!existing || v.check_in_time > existing.lastVisit) {
        map.set(v.customer_id, {
          id: v.customer_id,
          name: v.customer_name,
          lastVisit: v.check_in_time,
          quoteCount: existing?.quoteCount ?? 0,
        });
      }
    }
    for (const q of quotations) {
      const c = map.get(q.customer_id ?? '');
      if (c) c.quoteCount += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));
  }, [visits, quotations, session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/salesman')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">My Customers</h1>
        <Badge variant="outline" className="text-[10px] ml-auto">{customers.length}</Badge>
      </div>

      {customers.length === 0 ? (
        <Card className="p-6 text-center">
          <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No customers visited yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <Card key={c.id} className="p-3">
              <p className="text-sm font-medium truncate">{c.name}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-muted-foreground">Last visit: {fmtDate(c.lastVisit)}</p>
                <Badge variant="outline" className="text-[10px]">{c.quoteCount} quotes</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
