/**
 * MobileTelecallerCustomersPage.tsx — Read-only customers known by this telecaller
 * Sprint T-Phase-1.1.1l-b · Derived from enquiries the telecaller owns
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users } from 'lucide-react';
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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

interface CustomerRow {
  key: string;
  name: string;
  mobile: string | null;
  lastTouch: string;
  enquiryCount: number;
  quoteCount: number;
}

export default function MobileTelecallerCustomersPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);

  const enquiries = useMemo(
    () => session ? loadList<Enquiry>(enquiriesKey(session.entity_code)) : [],
    [session],
  );
  const quotations = useMemo(
    () => session ? loadList<Quotation>(quotationsKey(session.entity_code)) : [],
    [session],
  );

  const customers = useMemo<CustomerRow[]>(() => {
    if (!session) return [];
    const map = new Map<string, CustomerRow>();
    for (const e of enquiries) {
      if (e.assigned_executive_id !== session.user_id) continue;
      const key = e.customer_id ?? e.mobile ?? e.id;
      const name = e.customer_name ?? e.contact_person ?? 'Unknown';
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          key,
          name,
          mobile: e.mobile,
          lastTouch: e.updated_at,
          enquiryCount: 1,
          quoteCount: 0,
        });
      } else {
        existing.enquiryCount += 1;
        if (e.updated_at > existing.lastTouch) existing.lastTouch = e.updated_at;
      }
    }
    const myEnquiryIds = new Set(
      enquiries.filter(e => e.assigned_executive_id === session.user_id).map(e => e.id),
    );
    for (const q of quotations) {
      if (!q.enquiry_id || !myEnquiryIds.has(q.enquiry_id)) continue;
      const enq = enquiries.find(e => e.id === q.enquiry_id);
      if (!enq) continue;
      const key = enq.customer_id ?? enq.mobile ?? enq.id;
      const c = map.get(key);
      if (c) c.quoteCount += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.lastTouch.localeCompare(a.lastTouch));
  }, [enquiries, quotations, session]);

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/telecaller')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">My Customers</h1>
        <Badge variant="outline" className="text-[10px] ml-auto">{customers.length}</Badge>
      </div>

      {customers.length === 0 ? (
        <Card className="p-6 text-center">
          <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No customers yet</p>
          <p className="text-xs text-muted-foreground mt-1">Convert leads to enquiries to populate this list.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <Card key={c.key} className="p-3">
              <p className="text-sm font-medium truncate">{c.name}</p>
              {c.mobile && <p className="text-[11px] text-muted-foreground font-mono">{c.mobile}</p>}
              <div className="flex items-center justify-between mt-1 gap-1">
                <p className="text-[11px] text-muted-foreground">Last: {fmtDate(c.lastTouch)}</p>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[10px]">{c.enquiryCount} enq</Badge>
                  <Badge variant="outline" className="text-[10px]">{c.quoteCount} qt</Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
