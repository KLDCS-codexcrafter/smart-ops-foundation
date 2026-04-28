/**
 * MobileVisitLogReviewPage.tsx — All-team visit log feed
 * Sprint T-Phase-1.1.1l-c
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type VisitLog, visitLogsKey, VISIT_OUTCOME_LABELS } from '@/types/visit-log';

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

export default function MobileVisitLogReviewPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [salesmanFilter, setSalesmanFilter] = useState<string>('');

  const visits = useMemo(() => {
    if (!session) return [];
    return loadList<VisitLog>(visitLogsKey(session.entity_code))
      .sort((a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime());
  }, [session]);

  const salesmen = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of visits) m.set(v.salesman_id, v.salesman_name);
    return Array.from(m.entries());
  }, [visits]);

  const filtered = useMemo(() => {
    if (!salesmanFilter) return visits;
    return visits.filter(v => v.salesman_id === salesmanFilter);
  }, [visits, salesmanFilter]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/supervisor')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Visit Log Review</h1>
      </div>

      <select
        value={salesmanFilter}
        onChange={(e) => setSalesmanFilter(e.target.value)}
        className="w-full text-xs border rounded px-2 py-1.5 bg-background"
      >
        <option value="">All salesmen</option>
        {salesmen.map(([id, name]) => (
          <option key={id} value={id}>{name}</option>
        ))}
      </select>

      {filtered.length === 0 && (
        <Card className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <ClipboardList className="h-8 w-8" />
          No visits recorded.
        </Card>
      )}

      <div className="space-y-2">
        {filtered.slice(0, 100).map(v => (
          <Card key={v.id} className="p-3 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{v.salesman_name}</p>
              <Badge variant="outline" className="text-[10px]">{VISIT_OUTCOME_LABELS[v.outcome]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">@ {v.customer_name}</p>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{new Date(v.check_in_time).toLocaleString('en-IN')}</span>
              {v.signature_data_url && <span className="text-green-700">✓ Signed</span>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
