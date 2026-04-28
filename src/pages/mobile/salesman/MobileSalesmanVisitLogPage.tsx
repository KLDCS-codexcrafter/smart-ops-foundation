/**
 * MobileSalesmanVisitLogPage.tsx — Reverse-chrono visits by this salesman
 * Sprint T-Phase-1.1.1l-a
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ClipboardList, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type VisitLog, visitLogsKey, VISIT_OUTCOME_LABELS } from '@/types/visit-log';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

export default function MobileSalesmanVisitLogPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [expanded, setExpanded] = useState<string | null>(null);

  const myVisits = useMemo(() => {
    if (!session) return [];
    try {
      const raw = localStorage.getItem(visitLogsKey(session.entity_code));
      const all = raw ? (JSON.parse(raw) as VisitLog[]) : [];
      return all
        .filter(v => v.salesman_id === session.user_id)
        .sort((a, b) => b.check_in_time.localeCompare(a.check_in_time));
    } catch { return []; }
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/salesman')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Visit Log</h1>
        <Badge variant="outline" className="text-[10px] ml-auto">{myVisits.length}</Badge>
      </div>

      {myVisits.length === 0 ? (
        <Card className="p-6 text-center">
          <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No visits logged yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {myVisits.map(v => {
            const isOpen = expanded === v.id;
            return (
              <Card key={v.id} className="p-3">
                <button
                  type="button"
                  className="w-full flex items-start justify-between gap-2 text-left"
                  onClick={() => setExpanded(isOpen ? null : v.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{v.customer_name}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDateTime(v.check_in_time)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-[10px]">{VISIT_OUTCOME_LABELS[v.outcome]}</Badge>
                      {v.signature_data_url && (
                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-700 border-green-500/30">✓ Signed</Badge>
                      )}
                      {v.photo_urls.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          <Camera className="h-3 w-3 mr-0.5" />{v.photo_urls.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 mt-1" /> : <ChevronDown className="h-4 w-4 shrink-0 mt-1" />}
                </button>
                {isOpen && (
                  <div className="mt-3 pt-3 border-t space-y-2 text-[11px]">
                    {v.notes && <p className="text-muted-foreground"><span className="font-medium text-foreground">Notes:</span> {v.notes}</p>}
                    {v.order_captured_value > 0 && (
                      <p className="font-mono text-orange-600">Order: ₹{v.order_captured_value.toLocaleString('en-IN')}</p>
                    )}
                    {v.signature_data_url && (
                      <img src={v.signature_data_url} alt="Signature" className="border rounded bg-white max-w-[160px]" />
                    )}
                    {v.photo_urls.length > 0 && (
                      <div className="grid grid-cols-3 gap-1">
                        {v.photo_urls.map((u, i) => (
                          <img key={`p-${v.id}-${i}`} src={u} alt={`Photo ${i + 1}`} className="aspect-square w-full object-cover rounded border" />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
