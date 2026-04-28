/**
 * MobileCrossDeptHandoffPage.tsx — Pipeline pulse mobile cards
 * Sprint T-Phase-1.1.1l-c
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, GitBranch } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type Enquiry, enquiriesKey } from '@/types/enquiry';
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

export default function MobileCrossDeptHandoffPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const rows = useMemo(() => {
    if (!session) return [];
    const enquiries = loadList<Enquiry>(enquiriesKey(session.entity_code));
    const quotations = loadList<Quotation>(quotationsKey(session.entity_code));
    const quotByEnq = new Map<string, Quotation[]>();
    for (const q of quotations) {
      const eId = (q as { enquiry_id?: string | null }).enquiry_id ?? null;
      if (!eId) continue;
      if (!quotByEnq.has(eId)) quotByEnq.set(eId, []);
      quotByEnq.get(eId)!.push(q);
    }
    return enquiries
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 50)
      .map(e => ({
        e,
        quots: quotByEnq.get(e.id) ?? [],
      }));
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/manager')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Cross-Dept Handoff</h1>
      </div>

      {rows.length === 0 && (
        <Card className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <GitBranch className="h-8 w-8" />
          No enquiries yet.
        </Card>
      )}

      <div className="space-y-2">
        {rows.map(r => {
          const hasQuot = r.quots.length > 0;
          const hasSO = r.quots.some(q => q.stage === 'sales_order' || q.stage === 'proforma');
          return (
            <Card key={r.e.id} className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">{(r.e as { customer_name?: string; party_name?: string }).customer_name ?? (r.e as { party_name?: string }).party_name ?? 'Enquiry'}</p>
                <Badge variant="outline" className="text-[10px]">{r.e.status}</Badge>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700">Enq</span>
                <span className="text-muted-foreground">→</span>
                <span className={`px-1.5 py-0.5 rounded ${hasQuot ? 'bg-amber-500/15 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                  Quo {hasQuot ? `(${r.quots.length})` : ''}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className={`px-1.5 py-0.5 rounded ${hasSO ? 'bg-green-500/15 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                  SO
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
