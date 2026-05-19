/**
 * @file        src/pages/vendor-portal/VendorEnquiryResponse.tsx
 * @purpose     Modernized RFQ list + per-RFQ detail view (Inbox v2).
 * @sprint      T-Phase-1.A-c.2-VendorPortal-RFQ-Bid-PO-Flows
 * @decisions   D-272 self-contained · D-271 · A-c-Q10=B · A-c-Q11=A
 * @reuses      vendor-portal-auth-engine · vendor-portal-scope · vendor-quotation-engine
 */
import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import VendorPortalLayout from './VendorPortalLayout';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  FileText, Send, Clock, CheckCircle, XCircle, AlertCircle, Search,
  ChevronRight, ExternalLink, Bot, Calendar,
} from 'lucide-react';
import { getVendorSession, recordVendorActivity } from '@/lib/vendor-portal-auth-engine';
import { scopeRfqsForVendor } from '@/lib/vendor-portal-scope';
import { getQuotationsByRfq } from '@/lib/vendor-quotation-engine';
import { rfqsKey, type RFQ, type RFQStatus } from '@/types/rfq';
import {
  procurementEnquiriesKey, type ProcurementEnquiry,
} from '@/types/procurement-enquiry';
import { useT } from '@/lib/i18n-engine';

type FilterTab = 'pending' | 'quoted' | 'declined' | 'all';

const STATUS_DISPLAY: Record<RFQStatus, { label: string; className: string; icon: typeof Clock }> = {
  draft:             { label: 'Draft',             className: 'bg-slate-500/10 text-slate-700 border-slate-500/30',         icon: Clock },
  sent:              { label: 'Sent',              className: 'bg-blue-500/10 text-blue-700 border-blue-500/30',            icon: Send },
  received_by_vendor:{ label: 'Received',          className: 'bg-blue-500/10 text-blue-700 border-blue-500/30',            icon: CheckCircle },
  opened:            { label: 'Opened',            className: 'bg-amber-500/10 text-amber-700 border-amber-500/30',         icon: Clock },
  quoted:            { label: 'Quoted',            className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',   icon: CheckCircle },
  partial_quoted:    { label: 'Partially Quoted',  className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',   icon: CheckCircle },
  declined:          { label: 'Declined',          className: 'bg-red-500/10 text-red-700 border-red-500/30',               icon: XCircle },
  timeout:           { label: 'Timeout',           className: 'bg-red-500/10 text-red-700 border-red-500/30',               icon: AlertCircle },
  cancelled:         { label: 'Cancelled',         className: 'bg-slate-500/10 text-slate-700 border-slate-500/30',         icon: XCircle },
  awarded:           { label: 'Awarded',           className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',   icon: CheckCircle },
};

function loadRfqs(entityCode: string): RFQ[] {
  try {
    const raw = localStorage.getItem(rfqsKey(entityCode));
    return raw ? (JSON.parse(raw) as RFQ[]) : [];
  } catch { return []; }
}

function loadEnquiries(entityCode: string): ProcurementEnquiry[] {
  try {
    const raw = localStorage.getItem(procurementEnquiriesKey(entityCode));
    return raw ? (JSON.parse(raw) as ProcurementEnquiry[]) : [];
  } catch { return []; }
}

function daysRemaining(timeoutAt: string | null): number | null {
  if (!timeoutAt) return null;
  const ms = new Date(timeoutAt).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN');
}

function classifyTab(status: RFQStatus): FilterTab {
  if (status === 'quoted' || status === 'partial_quoted' || status === 'awarded') return 'quoted';
  if (status === 'declined' || status === 'timeout' || status === 'cancelled') return 'declined';
  return 'pending';
}

export default function VendorEnquiryResponse(): JSX.Element {
  const navigate = useNavigate();
  const session = getVendorSession();
  const t = useT();
  const [tab, setTab] = useState<FilterTab>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);

  const data = useMemo(() => {
    if (!session) return { rfqs: [] as RFQ[], enquiriesById: new Map<string, ProcurementEnquiry>() };
    const all = loadRfqs(session.entity_code);
    const scoped = scopeRfqsForVendor(all, session);
    const enquiries = loadEnquiries(session.entity_code);
    const map = new Map<string, ProcurementEnquiry>();
    enquiries.forEach(e => map.set(e.id, e));
    return { rfqs: scoped, enquiriesById: map };
  }, [session]);

  const filtered = useMemo(() => {
    const byTab = tab === 'all' ? data.rfqs : data.rfqs.filter(r => classifyTab(r.status) === tab);
    if (!searchQuery) return byTab;
    const q = searchQuery.toLowerCase();
    return byTab.filter(r => r.rfq_no.toLowerCase().includes(q));
  }, [data, tab, searchQuery]);

  const selectedRfq = useMemo(
    () => filtered.find(r => r.id === selectedRfqId) ?? null,
    [filtered, selectedRfqId]
  );

  const selectedEnquiry = useMemo(
    () => selectedRfq ? data.enquiriesById.get(selectedRfq.parent_enquiry_id) ?? null : null,
    [selectedRfq, data.enquiriesById]
  );

  const selectedQuotations = useMemo(() => {
    if (!selectedRfq || !session) return [];
    return getQuotationsByRfq(selectedRfq.id, session.entity_code);
  }, [selectedRfq, session]);

  const counts = useMemo(() => ({
    pending: data.rfqs.filter(r => classifyTab(r.status) === 'pending').length,
    quoted: data.rfqs.filter(r => classifyTab(r.status) === 'quoted').length,
    declined: data.rfqs.filter(r => classifyTab(r.status) === 'declined').length,
    all: data.rfqs.length,
  }), [data]);

  if (!session) return <Navigate to="/vendor-portal/login" replace />;

  const handleSubmitBid = (rfq: RFQ): void => {
    recordVendorActivity(session.vendor_id, session.entity_code, 'rfq_view');
    navigate(`/vendor-portal/bids/${rfq.id}`);
  };

  return (
    <VendorPortalLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              {t('vendor.rfq.title', 'Enquiries')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('vendor.rfq.subtitle', 'Active RFQs from buyer · click row to view detail')}
            </p>
          </div>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Bot className="h-3 w-3" /> {t('vendor.saathi.rfq_prioritize', 'Saathi · Auto-prioritize urgent RFQs · Phase 2')}
          </Badge>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('vendor.rfq.search_placeholder', 'Search RFQ number')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => { setTab(v as FilterTab); setSelectedRfqId(null); }}>
          <TabsList>
            <TabsTrigger value="pending">{t('vendor.rfq.tab_pending', 'Pending')} <span className="ml-1 opacity-70">({counts.pending})</span></TabsTrigger>
            <TabsTrigger value="quoted">{t('vendor.rfq.tab_quoted', 'Quoted')} <span className="ml-1 opacity-70">({counts.quoted})</span></TabsTrigger>
            <TabsTrigger value="declined">{t('vendor.rfq.tab_declined', 'Declined')} <span className="ml-1 opacity-70">({counts.declined})</span></TabsTrigger>
            <TabsTrigger value="all">{t('vendor.rfq.tab_all', 'All')} <span className="ml-1 opacity-70">({counts.all})</span></TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-0">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    {data.rfqs.length === 0 ? t('vendor.rfq.empty_state', 'No RFQs yet · waiting for first invitation') : 'No RFQs match this filter'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>{t('vendor.rfq.col_rfq_no', 'RFQ No')}</TableHead>
                        <TableHead>{t('vendor.rfq.col_sent', 'Sent')}</TableHead>
                        <TableHead>{t('vendor.rfq.col_status', 'Status')}</TableHead>
                        <TableHead className="text-center">{t('vendor.rfq.col_days_left', 'Days Left')}</TableHead>
                        <TableHead className="text-right">{t('vendor.rfq.col_action', 'Action')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r) => {
                        const status = STATUS_DISPLAY[r.status];
                        const StatusIcon = status.icon;
                        const days = daysRemaining(r.timeout_at);
                        const isSelected = selectedRfqId === r.id;
                        return (
                          <TableRow
                            key={r.id}
                            className={`cursor-pointer ${isSelected ? 'bg-slate-500/10' : ''}`}
                            onClick={() => setSelectedRfqId(isSelected ? null : r.id)}
                          >
                            <TableCell><ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? 'rotate-90' : ''}`} /></TableCell>
                            <TableCell className="font-mono font-medium text-sm">{r.rfq_no}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{formatDate(r.sent_at)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[9px] gap-1 ${status.className}`}>
                                <StatusIcon className="h-3 w-3" /> {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-center text-sm font-mono ${
                              days !== null && days <= 1 ? 'text-red-600 font-bold' :
                              days !== null && days <= 3 ? 'text-amber-600' : ''
                            }`}>
                              {days !== null ? (days > 0 ? days : 'Overdue') : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {(r.status === 'sent' || r.status === 'received_by_vendor' || r.status === 'opened') && (
                                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleSubmitBid(r); }}>
                                  <Send className="h-3 w-3 mr-1" /> {t('vendor.rfq.action_submit_bid', 'Submit Bid')}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {selectedRfq && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">RFQ Detail · {selectedRfq.rfq_no}</CardTitle>
                      <CardDescription>
                        {selectedEnquiry?.enquiry_no ? `Linked Enquiry: ${selectedEnquiry.enquiry_no}` : 'Standalone RFQ'} ·{' '}
                        {selectedRfq.line_item_ids.length} line item(s)
                      </CardDescription>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedRfqId(null)}>
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedEnquiry && selectedEnquiry.lines.length > 0 ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">Line Items</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead>UoM</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedEnquiry.lines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell className="text-sm">{line.item_name}</TableCell>
                              <TableCell className="text-right font-mono">{line.required_qty}</TableCell>
                              <TableCell className="text-xs">{line.uom}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Enquiry line items not available · contact buyer</p>
                  )}

                  {selectedQuotations.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
                        Your Submitted Quotations ({selectedQuotations.length})
                      </p>
                      <div className="space-y-2">
                        {selectedQuotations.map((q) => (
                          <div key={q.id} className="flex items-center justify-between rounded border border-border/50 p-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium font-mono">{q.quotation_no}</p>
                              <p className="text-[11px] text-muted-foreground">
                                Submitted {formatDate(q.submitted_at)} ·{' '}
                                Status: <Badge variant="outline" className="text-[9px]">{q.status}</Badge>
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Deadline: <span className="font-mono">{formatDate(selectedRfq.timeout_at)}</span>
                    </div>
                    {(selectedRfq.status === 'sent' || selectedRfq.status === 'received_by_vendor' || selectedRfq.status === 'opened') && (
                      <Button size="sm" onClick={() => handleSubmitBid(selectedRfq)} className="gap-1">
                        <Send className="h-3 w-3" /> Submit Bid
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </VendorPortalLayout>
  );
}
