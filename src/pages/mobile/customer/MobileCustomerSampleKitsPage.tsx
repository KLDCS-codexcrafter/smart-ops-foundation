/**
 * MobileCustomerSampleKitsPage.tsx — Browse + request sample kits
 * Sprint T-Phase-1.1.1l-d · Reads sampleKitTemplatesKey, writes sampleKitRequestsKey.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import {
  type SampleKitTemplate, type SampleKitRequest,
  sampleKitTemplatesKey, sampleKitRequestsKey,
} from '@/types/sample-kit';

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

const fmtINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MobileCustomerSampleKitsPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [reloadKey, setReloadKey] = useState(0);

  const templates = useMemo<SampleKitTemplate[]>(() => {
    if (!session) return [];
    return loadList<SampleKitTemplate>(sampleKitTemplatesKey(session.entity_code)).filter(t => t.active);
  }, [session]);

  const myRequests = useMemo<SampleKitRequest[]>(() => {
    if (!session) return [];
    return loadList<SampleKitRequest>(sampleKitRequestsKey(session.entity_code))
      .filter(r => r.customer_id === session.user_id)
      .sort((a, b) => b.requested_at.localeCompare(a.requested_at));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, reloadKey]);

  const handleRequest = useCallback((tpl: SampleKitTemplate) => {
    if (!session) return;
    const all = loadList<SampleKitRequest>(sampleKitRequestsKey(session.entity_code));
    const req: SampleKitRequest = {
      id: `skr-${Date.now()}`,
      entity_id: session.entity_code,
      customer_id: session.user_id ?? '',
      customer_name: session.display_name,
      template_id: tpl.id,
      template_name: tpl.name,
      status: 'requested',
      requested_at: new Date().toISOString(),
      shipped_at: null,
      delivered_at: null,
      return_deadline: null,
      closed_at: null,
      invoice_id: null,
      converted_value_paise: 0,
      notes: 'Requested via mobile',
    };
    // [JWT] POST /api/customer/sample-kits
    localStorage.setItem(sampleKitRequestsKey(session.entity_code), JSON.stringify([req, ...all]));
    setReloadKey(k => k + 1);
    toast.success(`Requested ${tpl.name}`);
  }, [session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Sample Kits</h1>
      </div>

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        Available Kits ({templates.length})
      </p>
      {templates.length === 0 ? (
        <Card className="p-6 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No sample kits available</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map(tpl => (
            <Card key={tpl.id} className="p-3">
              <p className="text-sm font-medium">{tpl.name}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-2">{tpl.description}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-[10px] font-mono">
                  {tpl.item_ids.length} items · {fmtINR(tpl.total_value_paise)}
                </p>
                <Button size="sm" variant="outline" onClick={() => handleRequest(tpl)}>
                  <Send className="h-3 w-3 mr-1" /> Request
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        My Requests ({myRequests.length})
      </p>
      {myRequests.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">No requests yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {myRequests.map(r => (
            <Card key={r.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{r.template_name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{r.requested_at.slice(0, 10)}</p>
                </div>
                <Badge variant="outline" className="text-[9px] shrink-0">{r.status}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
