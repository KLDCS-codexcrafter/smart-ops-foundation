/**
 * DistributorDownstreamView.tsx — Portal · sub-dealers + secondary-sales view
 * Sprint 11a. Route: /erp/distributor/downstream
 * Indigo-600 accent. DistributorLayout shell.
 * [JWT] GET /api/distributor/downstream
 */
import { useMemo } from 'react';
import { DistributorLayout } from '@/features/distributor/DistributorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users2, MapPin, ShoppingBag, IndianRupee, Activity, Network, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDistributorSession } from '@/lib/distributor-auth-engine';
import { getChildren, getDescendants } from '@/lib/hierarchy-engine';
import { hierarchyNodesKey, type HierarchyNode } from '@/types/distributor-hierarchy';
import { formatINR } from '@/lib/india-validations';

interface SecondarySale { id: string; distributor_id?: string; customer_id?: string; date: string; amount_paise: number; }
interface VisitLog { id: string; salesman_person_id?: string; customer_id?: string; check_in_at?: string; }

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/{key}
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T[]) : [];
  } catch { return []; }
}

export function DistributorDownstreamViewPanel() { return <DistributorDownstreamView />; }

export default function DistributorDownstreamView() {
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

  const children = useMemo(
    () => myNode ? getChildren(myNode.id, allNodes) : [],
    [myNode, allNodes],
  );
  const descendantCustomerIds = useMemo(
    () => myNode ? new Set(getDescendants(myNode.id, allNodes).map(n => n.customer_id)) : new Set<string>(),
    [myNode, allNodes],
  );

  const secondarySales = useMemo<SecondarySale[]>(
    () => session ? ls<SecondarySale>(`erp_secondary_sales_${session.entity_code}`) : [],
    [session],
  );
  const visits = useMemo<VisitLog[]>(
    () => session ? ls<VisitLog>(`erp_visit_logs_${session.entity_code}`) : [],
    [session],
  );

  const last30Days = useMemo(() => Date.now() - 30 * 24 * 60 * 60 * 1000, []);
  const last7Days = useMemo(() => Date.now() - 7 * 24 * 60 * 60 * 1000, []);

  const sales30dValue = useMemo(() =>
    secondarySales
      .filter(s => (s.distributor_id === session?.distributor_id || (s.customer_id && descendantCustomerIds.has(s.customer_id))) && new Date(s.date).getTime() >= last30Days)
      .reduce((sum, s) => sum + s.amount_paise, 0),
    [secondarySales, session, descendantCustomerIds, last30Days],
  );

  const activeVisits = useMemo(() =>
    visits.filter(v =>
      v.check_in_at && new Date(v.check_in_at).getTime() >= last7Days &&
      (v.salesman_person_id === session?.distributor_id || (v.customer_id && descendantCustomerIds.has(v.customer_id))),
    ).length,
    [visits, session, descendantCustomerIds, last7Days],
  );

  if (!session) return null;

  if (!session.hierarchy_node_id || !myNode) {
    return (
      <DistributorLayout title="Downstream" subtitle="Your sub-dealers and their activity">
        <div className="p-6">
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="p-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Not in distribution tree</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ask your sales rep to add you to the distribution tree to view your downstream.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DistributorLayout>
    );
  }

  const kpis = [
    { label: 'Immediate Downstream', value: String(children.length), icon: Users2 },
    { label: '30d Secondary Sales', value: formatINR(sales30dValue), icon: ShoppingBag },
    { label: 'Outstanding (downstream)', value: '—', icon: IndianRupee, hint: 'Configure in Sprint 13' },
    { label: 'Active Visits (7d)', value: String(activeVisits), icon: Activity },
  ];

  return (
    <DistributorLayout title="Downstream" subtitle="Your sub-dealers and their activity">
      <div className="p-4 lg:p-6 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(k => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    {k.label}
                  </p>
                  <div className="w-7 h-7 rounded-md bg-indigo-600/15 flex items-center justify-center">
                    <k.icon className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                </div>
                <p className="text-base font-bold font-mono text-foreground">{k.value}</p>
                {k.hint && <p className="text-[9px] text-muted-foreground mt-1">{k.hint}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Network className="h-4 w-4 text-indigo-600" />Sub-Dealers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {children.length === 0
              ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  You have no sub-dealers assigned under you yet.
                </p>
              )
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 px-2 font-medium">Name</th>
                        <th className="py-2 px-2 font-medium">Territory</th>
                        <th className="py-2 px-2 font-medium">30d Orders</th>
                        <th className="py-2 px-2 font-medium">Status</th>
                        <th className="py-2 px-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {children.map(child => {
                        const childOrders = secondarySales.filter(s =>
                          s.customer_id === child.customer_id && new Date(s.date).getTime() >= last30Days,
                        );
                        return (
                          <tr key={child.id} className="border-b hover:bg-muted/40">
                            <td className="py-2 px-2 font-medium">{child.display_name}</td>
                            <td className="py-2 px-2">
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3" />{child.territory_id ?? '—'}
                              </span>
                            </td>
                            <td className="py-2 px-2 font-mono">{childOrders.length}</td>
                            <td className="py-2 px-2">
                              <Badge variant="outline" className={child.is_active
                                ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 text-[9px]'
                                : 'bg-slate-500/15 text-slate-700 border-slate-500/30 text-[9px]'
                              }>
                                {child.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="py-2 px-2 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[10px] text-indigo-600 hover:text-indigo-700"
                                onClick={() => navigate('/erp/distributor/crm/visit/new')}
                              >Visit</Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[10px] text-indigo-600 hover:text-indigo-700"
                                onClick={() => navigate('/erp/distributor/crm')}
                              >CRM</Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </DistributorLayout>
  );
}
