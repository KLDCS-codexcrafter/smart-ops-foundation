/**
 * MobileCustomerVoiceComplaintPage.tsx — Mobile voice/text complaint capture
 * Sprint T-Phase-1.1.1l-d · Writes to erp_customer_complaints_{entity}.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mic, Send, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';

interface CustomerComplaint {
  id: string;
  customer_id: string;
  customer_name: string;
  entity_code: string;
  body: string;
  status: 'submitted' | 'in_progress' | 'resolved';
  created_at: string;
}
const complaintsKey = (e: string) => `erp_customer_complaints_${e}`;

function readSession(): MobileSession | null {
  try { const raw = sessionStorage.getItem('opx_mobile_session'); return raw ? (JSON.parse(raw) as MobileSession) : null; } catch { return null; }
}
function loadList<T>(key: string): T[] { try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; } catch { return []; } }

export default function MobileCustomerVoiceComplaintPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const myComplaints = useMemo<CustomerComplaint[]>(() => {
    if (!session) return [];
    return loadList<CustomerComplaint>(complaintsKey(session.entity_code))
      .filter(c => c.customer_id === session.user_id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, reloadKey]);

  const handleSubmit = useCallback(() => {
    if (!session) return;
    if (!body.trim()) { toast.error('Please describe the issue'); return; }
    setBusy(true);
    const all = loadList<CustomerComplaint>(complaintsKey(session.entity_code));
    const c: CustomerComplaint = {
      id: `cc-${Date.now()}`,
      customer_id: session.user_id ?? '',
      customer_name: session.display_name,
      entity_code: session.entity_code,
      body: body.trim(),
      status: 'submitted',
      created_at: new Date().toISOString(),
    };
    // [JWT] POST /api/customer/complaints
    localStorage.setItem(complaintsKey(session.entity_code), JSON.stringify([c, ...all]));
    setBody('');
    setBusy(false);
    setReloadKey(k => k + 1);
    toast.success('Complaint submitted');
  }, [session, body]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Voice / Text Complaint</h1>
      </div>

      <Card className="p-3 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Describe the issue</Label>
          <Textarea rows={4} value={body} onChange={e => setBody(e.target.value)} placeholder="What happened? Order #, product, etc." />
        </div>
        <Button className="w-full" disabled={busy} onClick={handleSubmit}>
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Submit Complaint
        </Button>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Mic className="h-3 w-3" /> Use your keyboard's voice-to-text mic to dictate
        </p>
      </Card>

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        My Complaints ({myComplaints.length})
      </p>
      {myComplaints.length === 0 ? (
        <Card className="p-6 text-center">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No complaints yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {myComplaints.map(c => (
            <Card key={c.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm flex-1 line-clamp-3">{c.body}</p>
                <Badge variant="outline" className="text-[9px] shrink-0">{c.status}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">{c.created_at.slice(0, 10)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
