/**
 * DistributorCRM.tsx — Distributor portal CRM-lite (4 tabs)
 * Sprint 11a. Route: /erp/distributor/crm
 * Tabs: Enquiries · My Visits · Pipeline · Conversions
 * Indigo-600 accent. Panel export.
 * [JWT] GET /api/distributor/enquiries · /api/distributor/visits
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DistributorLayout } from '@/features/distributor/DistributorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, FileText, MapPin, BarChart3, Layers3, AlertCircle } from 'lucide-react';
import { getDistributorSession } from '@/lib/distributor-auth-engine';
import { getDescendants } from '@/lib/hierarchy-engine';
import { hierarchyNodesKey, type HierarchyNode } from '@/types/distributor-hierarchy';
import { enquiriesKey, type Enquiry, type EnquiryStatus } from '@/types/enquiry';
import { formatINR } from '@/lib/india-validations';

interface VisitLog {
  id: string; date?: string; check_in_at?: string;
  customer_id?: string; customer_name?: string;
  salesman_person_id?: string; outcome?: string; remarks?: string;
}

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/{key}
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T[]) : [];
  } catch { return []; }
}

const PIPELINE_COLS: { status: EnquiryStatus; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'in_process', label: 'In Process' },
  { status: 'quote', label: 'Quote' },
  { status: 'agreed', label: 'Agreed' },
  { status: 'sold', label: 'Sold' },
  { status: 'lost', label: 'Lost' },
];

export function DistributorCRMPanel() { return <DistributorCRM />; }

export default function DistributorCRM() {
  const navigate = useNavigate();
  const session = getDistributorSession();

  const allNodes = useMemo<HierarchyNode[]>(
    () => session ? ls<HierarchyNode>(hierarchyNodesKey(session.entity_code)) : [],
    [session],
  );
  const myNode = useMemo(
    () => session?.hierarchy_node_id ? allNodes.find(n => n.id === session.hierarchy_node_id) ?? null : null,
    [session, allNodes],
  );
  const downstreamCustomerIds = useMemo(
    () => myNode ? new Set(getDescendants(myNode.id, allNodes).map(n => n.customer_id)) : new Set<string>(),
    [myNode, allNodes],
  );

  const enquiries = useMemo<Enquiry[]>(() => {
    if (!session) return [];
    const all = ls<Enquiry>(enquiriesKey(session.entity_code));
    return all.filter(e =>
      e.source_distributor_id === session.distributor_id ||
      (e.customer_id && downstreamCustomerIds.has(e.customer_id)),
    );
  }, [session, downstreamCustomerIds]);

  const visits = useMemo<VisitLog[]>(() => {
    if (!session) return [];
    const all = ls<VisitLog>(`erp_visit_logs_${session.entity_code}`);
    return all.filter(v =>
      v.salesman_person_id === session.distributor_id ||
      (v.customer_id && downstreamCustomerIds.has(v.customer_id)),
    );
  }, [session, downstreamCustomerIds]);

  const [tab, setTab] = useState<'enquiries' | 'visits' | 'pipeline' | 'conversions'>('enquiries');

  if (!session) return null;

  if (!session.hierarchy_node_id) {
    return (
      <DistributorLayout title="CRM" subtitle="Enquiries · Visits · Pipeline">
        <div className="p-6">
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="p-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm">CRM requires you to be placed in the distribution tree.</p>
            </CardContent>
          </Card>
        </div>
      </DistributorLayout>
    );
  }

  const enquiryValue = (e: Enquiry): number =>
    (e.items ?? []).reduce((s, it) => s + ((it.amount ?? 0)), 0);

  return (
    <DistributorLayout title="CRM" subtitle="Enquiries · Visits · Pipeline">
      <div className="p-4 lg:p-6">
        <Tabs value={tab} onValueChange={v => setTab(v as 'enquiries' | 'visits' | 'pipeline' | 'conversions')}>
          <TabsList className="bg-muted/40 border border-border/50">
            <TabsTrigger value="enquiries" className="data-[state=active]:bg-indigo-600/15 data-[state=active]:text-indigo-700">
              <FileText className="h-3.5 w-3.5 mr-1" />Enquiries
            </TabsTrigger>
            <TabsTrigger value="visits" className="data-[state=active]:bg-indigo-600/15 data-[state=active]:text-indigo-700">
              <MapPin className="h-3.5 w-3.5 mr-1" />My Visits
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="data-[state=active]:bg-indigo-600/15 data-[state=active]:text-indigo-700">
              <Layers3 className="h-3.5 w-3.5 mr-1" />Pipeline
            </TabsTrigger>
            <TabsTrigger value="conversions" className="data-[state=active]:bg-indigo-600/15 data-[state=active]:text-indigo-700">
              <BarChart3 className="h-3.5 w-3.5 mr-1" />Conversions
            </TabsTrigger>
          </TabsList>

          {/* TAB 1 — Enquiries */}
          <TabsContent value="enquiries" className="mt-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Enquiries from your downstream</CardTitle>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => navigate('/erp/distributor/crm')}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />New Enquiry
                </Button>
              </CardHeader>
              <CardContent>
                {enquiries.length === 0
                  ? <p className="text-xs text-muted-foreground py-6 text-center">No enquiries yet.</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-muted-foreground border-b">
                            <th className="py-2 px-2 font-medium">Enquiry No</th>
                            <th className="py-2 px-2 font-medium">Date</th>
                            <th className="py-2 px-2 font-medium">Customer</th>
                            <th className="py-2 px-2 font-medium">Status</th>
                            <th className="py-2 px-2 font-medium">Priority</th>
                            <th className="py-2 px-2 font-medium text-right">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enquiries.slice(0, 100).map(e => (
                            <tr key={e.id} className="border-b hover:bg-muted/40">
                              <td className="py-2 px-2 font-mono">{e.enquiry_no}</td>
                              <td className="py-2 px-2">{e.enquiry_date}</td>
                              <td className="py-2 px-2">{e.customer_name ?? '—'}</td>
                              <td className="py-2 px-2">
                                <Badge variant="outline" className="text-[9px] bg-indigo-600/10 text-indigo-700 border-indigo-600/30">
                                  {e.status}
                                </Badge>
                              </td>
                              <td className="py-2 px-2">{e.priority}</td>
                              <td className="py-2 px-2 font-mono text-right">
                                {enquiryValue(e) ? formatINR(enquiryValue(e) * 100) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2 — Visits */}
          <TabsContent value="visits" className="mt-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">My visits to sub-dealers</CardTitle>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => navigate('/erp/distributor/crm/visit/new')}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />Log Visit
                </Button>
              </CardHeader>
              <CardContent>
                {visits.length === 0
                  ? <p className="text-xs text-muted-foreground py-6 text-center">No visits logged yet.</p>
                  : (
                    <ul className="divide-y">
                      {visits.slice(0, 50).map(v => (
                        <li key={v.id} className="py-2 text-xs flex items-center justify-between">
                          <div>
                            <p className="font-medium">{v.customer_name ?? v.customer_id ?? '—'}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {v.check_in_at?.slice(0, 10) ?? v.date ?? '—'} · {v.outcome ?? 'Visit'}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[9px] bg-indigo-600/10 text-indigo-700 border-indigo-600/30">
                            Logged
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3 — Pipeline (Kanban) */}
          <TabsContent value="pipeline" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {PIPELINE_COLS.map(col => {
                const colEnquiries = enquiries.filter(e => e.status === col.status);
                const totalVal = colEnquiries.reduce((s, e) => s + enquiryValue(e), 0);
                return (
                  <Card key={col.status} className="border-indigo-600/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs flex items-center justify-between">
                        <span>{col.label}</span>
                        <Badge variant="outline" className="text-[9px] bg-indigo-600/10 text-indigo-700 border-indigo-600/30">
                          {colEnquiries.length}
                        </Badge>
                      </CardTitle>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {totalVal ? formatINR(totalVal * 100) : '—'}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {colEnquiries.slice(0, 8).map(e => (
                        <div key={e.id} className="text-[10px] p-1.5 rounded border border-border/40 bg-muted/20">
                          <p className="font-medium truncate">{e.customer_name ?? e.enquiry_no}</p>
                          <p className="font-mono text-[9px] text-muted-foreground">{e.enquiry_no}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* TAB 4 — Conversions */}
          <TabsContent value="conversions" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Funnel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const total = enquiries.length;
                  const quoted = enquiries.filter(e => ['quote', 'agreed', 'sold'].includes(e.status)).length;
                  const sold = enquiries.filter(e => e.status === 'sold').length;
                  const lost = enquiries.filter(e => e.status === 'lost').length;
                  const stages: { label: string; n: number; pct: number }[] = [
                    { label: 'Enquiries', n: total, pct: 100 },
                    { label: 'Quoted', n: quoted, pct: total ? (quoted / total) * 100 : 0 },
                    { label: 'Sold', n: sold, pct: total ? (sold / total) * 100 : 0 },
                    { label: 'Lost', n: lost, pct: total ? (lost / total) * 100 : 0 },
                  ];
                  return stages.map(st => (
                    <div key={st.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{st.label}</span>
                        <span className="font-mono text-muted-foreground">{st.n} · {st.pct.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded bg-muted overflow-hidden">
                        <div
                          className="h-full bg-indigo-600"
                          style={{ width: `${Math.max(2, st.pct)}%` }}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DistributorLayout>
  );
}
