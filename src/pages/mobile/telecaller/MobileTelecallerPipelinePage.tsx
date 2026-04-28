/**
 * MobileTelecallerPipelinePage.tsx — Read-only own pipeline (enquiries, quotations, SOs)
 * Sprint T-Phase-1.1.1l-b
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, ClipboardList, Package } from 'lucide-react';
import type { MobileSession } from '../MobileRouter';
import { type Enquiry, enquiriesKey } from '@/types/enquiry';
import { type Quotation, quotationsKey, QUOTATION_STAGE_LABELS } from '@/types/quotation';
import { type Order, ordersKey } from '@/types/order';

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

export default function MobileTelecallerPipelinePage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const [tab, setTab] = useState<'enquiry' | 'quotation' | 'so'>('enquiry');

  const enquiries = useMemo(
    () => session ? loadList<Enquiry>(enquiriesKey(session.entity_code)) : [],
    [session],
  );
  const quotations = useMemo(
    () => session ? loadList<Quotation>(quotationsKey(session.entity_code)) : [],
    [session],
  );
  const orders = useMemo(
    () => session ? loadList<Order>(ordersKey(session.entity_code)) : [],
    [session],
  );

  const myEnquiries = useMemo(
    () => enquiries
      .filter(e => e.assigned_executive_id === session?.user_id)
      .sort((a, b) => b.enquiry_date.localeCompare(a.enquiry_date)),
    [enquiries, session],
  );
  const myEnquiryIds = useMemo(() => new Set(myEnquiries.map(e => e.id)), [myEnquiries]);
  const myQuotations = useMemo(
    () => quotations
      .filter(q => q.enquiry_id && myEnquiryIds.has(q.enquiry_id))
      .sort((a, b) => b.quotation_date.localeCompare(a.quotation_date)),
    [quotations, myEnquiryIds],
  );
  const myQuoteRefs = useMemo(() => new Set(myQuotations.map(q => q.quotation_no)), [myQuotations]);
  const mySOs = useMemo(
    () => orders
      .filter(o => o.base_voucher_type === 'Sales Order' && o.ref_no && myQuoteRefs.has(o.ref_no))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [orders, myQuoteRefs],
  );

  if (!session) return null;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/telecaller')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">My Pipeline</h1>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as 'enquiry' | 'quotation' | 'so')}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="enquiry" className="text-xs">
            <FileText className="h-3 w-3 mr-1" /> Enq ({myEnquiries.length})
          </TabsTrigger>
          <TabsTrigger value="quotation" className="text-xs">
            <ClipboardList className="h-3 w-3 mr-1" /> Quote ({myQuotations.length})
          </TabsTrigger>
          <TabsTrigger value="so" className="text-xs">
            <Package className="h-3 w-3 mr-1" /> SO ({mySOs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enquiry" className="space-y-2 mt-3">
          {myEnquiries.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">No enquiries</p>
          ) : myEnquiries.slice(0, 50).map(e => (
            <Card key={e.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-muted-foreground">{e.enquiry_no}</p>
                  <p className="text-sm font-medium truncate">{e.contact_person ?? e.customer_name ?? '—'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{e.mobile ?? '—'}</p>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize shrink-0">{e.status}</Badge>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="quotation" className="space-y-2 mt-3">
          {myQuotations.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">No quotations</p>
          ) : myQuotations.slice(0, 50).map(q => (
            <Card key={q.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-muted-foreground">{q.quotation_no}</p>
                  <p className="text-sm font-medium truncate">{q.customer_name ?? '—'}</p>
                  <p className="text-[10px] text-orange-600 font-mono">₹{q.total_amount.toLocaleString('en-IN')}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{QUOTATION_STAGE_LABELS[q.quotation_stage]}</Badge>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="so" className="space-y-2 mt-3">
          {mySOs.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">No sales orders</p>
          ) : mySOs.slice(0, 50).map(o => (
            <Card key={o.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] text-muted-foreground">{o.order_no}</p>
                  <p className="text-sm font-medium truncate">{o.party_name}</p>
                  <p className="text-[10px] text-orange-600 font-mono">₹{o.net_amount.toLocaleString('en-IN')}</p>
                </div>
                <Badge variant="outline" className="text-[10px] capitalize shrink-0">{o.status}</Badge>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
