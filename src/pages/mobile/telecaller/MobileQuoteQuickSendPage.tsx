/**
 * MobileQuoteQuickSendPage.tsx — Browse + share own quotations via WhatsApp
 * Sprint T-Phase-1.1.1l-b
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Printer, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import { type Quotation, quotationsKey, QUOTATION_STAGE_LABELS } from '@/types/quotation';
import { type Enquiry, enquiriesKey } from '@/types/enquiry';

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

const SHAREABLE_STAGES = new Set(['confirmed', 'proforma']);

export default function MobileQuoteQuickSendPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const quotations = useMemo(() => session ? loadList<Quotation>(quotationsKey(session.entity_code)) : [], [session]);
  const enquiries = useMemo(() => session ? loadList<Enquiry>(enquiriesKey(session.entity_code)) : [], [session]);

  const myEnquiryMap = useMemo(() => {
    const m = new Map<string, Enquiry>();
    for (const e of enquiries) {
      if (e.assigned_executive_id === session?.user_id) m.set(e.id, e);
    }
    return m;
  }, [enquiries, session]);

  const myQuotes = useMemo(() =>
    quotations
      .filter(q => SHAREABLE_STAGES.has(q.quotation_stage))
      .filter(q => q.enquiry_id && myEnquiryMap.has(q.enquiry_id))
      .sort((a, b) => b.quotation_date.localeCompare(a.quotation_date)),
    [quotations, myEnquiryMap],
  );

  const handlePrint = (q: Quotation) => {
    navigate(`/erp/salesx/proforma-print/${q.id}`);
  };

  const handleShareWA = (q: Quotation) => {
    const enq = q.enquiry_id ? myEnquiryMap.get(q.enquiry_id) : null;
    const phone = (enq?.mobile ?? '').replace(/[^\d]/g, '');
    if (!phone) { toast.error('No mobile number on enquiry'); return; }
    const link = `${window.location.origin}/erp/salesx/proforma-print/${q.id}`;
    const msg =
      `Hello ${enq?.contact_person ?? 'Sir/Madam'},\n\n` +
      `Please find your quotation ${q.quotation_no} for ₹${q.total_amount.toLocaleString('en-IN')}.\n\n` +
      `View: ${link}\n\n` +
      `— ${session?.display_name ?? ''}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    toast.success('Opening WhatsApp');
  };

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/telecaller')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">Quote Quick-Send</h1>
        <Badge variant="outline" className="text-[10px] ml-auto">{myQuotes.length}</Badge>
      </div>

      {myQuotes.length === 0 ? (
        <Card className="p-6 text-center">
          <Send className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No shareable quotations</p>
          <p className="text-xs text-muted-foreground mt-1">
            Confirmed or Proforma quotations from your enquiries appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {myQuotes.map(q => (
            <Card key={q.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-muted-foreground">{q.quotation_no}</p>
                  <p className="text-sm font-medium truncate">{q.customer_name ?? '—'}</p>
                  <p className="text-[10px] text-orange-600 font-mono">₹{q.total_amount.toLocaleString('en-IN')}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{QUOTATION_STAGE_LABELS[q.quotation_stage]}</Badge>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => handlePrint(q)}>
                  <Printer className="h-3 w-3 mr-1" /> View
                </Button>
                <Button size="sm" className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700" onClick={() => handleShareWA(q)}>
                  <Share2 className="h-3 w-3 mr-1" /> Share WA
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
