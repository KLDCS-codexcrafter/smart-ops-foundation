/**
 * CampaignPerformanceReport.tsx — Sprint T-Phase-1.1.1b
 * KPIs · Avg ROI by type · Enquiries by type · Top 5 by Revenue · Detail table.
 * [JWT] GET /api/salesx/campaigns
 * [JWT] GET /api/salesx/enquiries
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { Search } from 'lucide-react';
import { campaignsKey } from '@/types/campaign';
import type {
  Campaign, CampaignType, CampaignStatus,
} from '@/types/campaign';
import { CAMPAIGN_TYPE_LABELS } from '@/types/campaign';
import { enquiriesKey } from '@/types/enquiry';
import type { Enquiry } from '@/types/enquiry';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

const TYPE_HEX: Record<CampaignType, string> = {
  CALL: '#0ea5e9', SMS: '#06b6d4', WA: '#22c55e', EMAIL: '#3b82f6',
  VISIT: '#f59e0b', MEET: '#f97316', WEB: '#6366f1', EXPO: '#a855f7',
  EVENT: '#ec4899', DEMO: '#f43f5e', XSELL: '#10b981', UPSELL: '#14b8a6',
  RET: '#eab308', WINBACK: '#d946ef', REFER: '#84cc16', SURVEY: '#8b5cf6',
  PARTNER: '#78716c', CSR: '#ef4444', GEO: '#1d4ed8', AI: '#c2410c',
};

const STATUS_COLOR: Record<CampaignStatus, string> = {
  planned: 'bg-muted text-muted-foreground border-border',
  active: 'bg-green-500/15 text-green-700 border-green-500/30',
  completed: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
};

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const fmtINR = (n: number) => `₹${inrFmt.format(n || 0)}`;

function readList<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) || '[]'); }
  catch { return []; }
}

type SortKey = 'roi' | 'revenue' | 'enquiries' | 'orders';

export function CampaignPerformanceReportPanel({ entityCode }: Props) {
  const campaigns = readList<Campaign>(campaignsKey(entityCode));
  const enquiries = readList<Enquiry>(enquiriesKey(entityCode));

  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<CampaignType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('roi');

  // live enquiry count by campaign code
  const liveEnqCount = useMemo(() => {
    const m = new Map<string, number>();
    enquiries.forEach(e => {
      const code = e.campaign;
      if (code) m.set(code, (m.get(code) ?? 0) + 1);
    });
    return m;
  }, [enquiries]);

  const kpis = useMemo(() => {
    let totalBudget = 0, totalRevenue = 0, totalEnq = 0;
    const completed = campaigns.filter(c => c.status === 'completed');
    let roiSum = 0, roiN = 0;
    campaigns.forEach(c => {
      totalBudget += c.budget_breakdown?.total ?? c.budget ?? 0;
      totalRevenue += c.outcome_tracking?.revenue_attributed ?? 0;
      totalEnq += c.outcome_tracking?.enquiries_generated ?? 0;
    });
    completed.forEach(c => {
      const r = c.performance_metrics?.roi_pct;
      if (typeof r === 'number') { roiSum += r; roiN += 1; }
    });
    const avgRoi = roiN ? Math.round((roiSum / roiN) * 10) / 10 : 0;
    return { totalBudget, totalRevenue, totalEnq, avgRoi };
  }, [campaigns]);

  // Avg ROI by type (completed only)
  const roiByType = useMemo(() => {
    const grouped = new Map<CampaignType, { sum: number; n: number }>();
    campaigns.filter(c => c.status === 'completed').forEach(c => {
      const r = c.performance_metrics?.roi_pct ?? 0;
      const cur = grouped.get(c.campaign_type) ?? { sum: 0, n: 0 };
      grouped.set(c.campaign_type, { sum: cur.sum + r, n: cur.n + 1 });
    });
    return Array.from(grouped.entries()).map(([type, v]) => ({
      type, roi: Math.round((v.sum / v.n) * 10) / 10,
    }));
  }, [campaigns]);

  // Enquiries by type (sum from outcome_tracking across all campaigns)
  const enqByType = useMemo(() => {
    const grouped = new Map<CampaignType, number>();
    campaigns.forEach(c => {
      const v = c.outcome_tracking?.enquiries_generated ?? 0;
      grouped.set(c.campaign_type, (grouped.get(c.campaign_type) ?? 0) + v);
    });
    return Array.from(grouped.entries())
      .filter(([, v]) => v > 0)
      .map(([type, value]) => ({ type, value, name: type }));
  }, [campaigns]);

  // Top 5 by revenue
  const top5 = useMemo(() => {
    return [...campaigns]
      .sort((a, b) =>
        (b.outcome_tracking?.revenue_attributed ?? 0) -
        (a.outcome_tracking?.revenue_attributed ?? 0))
      .slice(0, 5);
  }, [campaigns]);
  const top5Max = top5.reduce((m, c) =>
    Math.max(m, c.outcome_tracking?.revenue_attributed ?? 0), 0) || 1;

  // Filtered + sorted detail table
  const detail = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const filtered = campaigns.filter(c => {
      if (typeFilter !== 'all' && c.campaign_type !== typeFilter) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (q && !c.campaign_code.toLowerCase().includes(q) &&
          !c.campaign_name.toLowerCase().includes(q)) return false;
      return true;
    });
    const getKey = (c: Campaign): number => {
      switch (sortKey) {
        case 'roi':       return c.performance_metrics?.roi_pct ?? 0;
        case 'revenue':   return c.outcome_tracking?.revenue_attributed ?? 0;
        case 'enquiries': return c.outcome_tracking?.enquiries_generated ?? 0;
        case 'orders':    return c.outcome_tracking?.orders_converted ?? 0;
      }
    };
    return filtered.sort((a, b) => getKey(b) - getKey(a));
  }, [campaigns, searchText, typeFilter, statusFilter, sortKey]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Budget</p>
          <p className="text-2xl font-bold font-mono mt-1 text-orange-500">{fmtINR(kpis.totalBudget)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue Attributed</p>
          <p className="text-2xl font-bold font-mono mt-1 text-green-600">{fmtINR(kpis.totalRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Enquiries Generated</p>
          <p className="text-2xl font-bold font-mono mt-1">{kpis.totalEnq}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg ROI (Completed)</p>
          <p className={cn('text-2xl font-bold font-mono mt-1',
            kpis.avgRoi > 0 ? 'text-green-600' : kpis.avgRoi < 0 ? 'text-destructive' : '')}>
            {kpis.avgRoi}%
          </p>
        </CardContent></Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg ROI % by Campaign Type (Completed)</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            {roiByType.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-12">No completed campaigns.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roiByType}>
                  <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip />
                  <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
                    {roiByType.map(d => (
                      <Cell key={d.type} fill={TYPE_HEX[d.type]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Enquiries by Campaign Type</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            {enqByType.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-12">No enquiry data.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={enqByType} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 10 }}
                  >
                    {enqByType.map(d => <Cell key={d.type} fill={TYPE_HEX[d.type]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 5 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Top 5 Campaigns by Revenue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {top5.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No data.</p>
          ) : top5.map(c => {
            const rev = c.outcome_tracking?.revenue_attributed ?? 0;
            const pct = (rev / top5Max) * 100;
            return (
              <div key={c.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.campaign_name}</span>
                    <Badge variant="outline" className="text-[9px]" style={{
                      backgroundColor: `${TYPE_HEX[c.campaign_type]}26`,
                      color: TYPE_HEX[c.campaign_type],
                      borderColor: `${TYPE_HEX[c.campaign_type]}66`,
                    }}>{c.campaign_type}</Badge>
                  </div>
                  <span className="font-mono text-green-600 font-bold">{fmtINR(rev)}</span>
                </div>
                <div className="h-2 rounded bg-muted overflow-hidden">
                  <div className="h-full rounded"
                    style={{ width: `${pct}%`, backgroundColor: TYPE_HEX[c.campaign_type] }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Campaign Detail ({detail.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={searchText} onChange={e => setSearchText(e.target.value)}
                placeholder="Search…" className="h-8 pl-7 text-xs" />
            </div>
            <Select value={typeFilter} onValueChange={v => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All Types</SelectItem>
                {(Object.keys(CAMPAIGN_TYPE_LABELS) as CampaignType[]).map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortKey} onValueChange={v => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="roi">Sort: ROI</SelectItem>
                <SelectItem value="revenue">Sort: Revenue</SelectItem>
                <SelectItem value="enquiries">Sort: Enquiries</SelectItem>
                <SelectItem value="orders">Sort: Orders</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Campaign</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs text-right">Budget</TableHead>
                <TableHead className="text-xs text-right">Spent</TableHead>
                <TableHead className="text-xs text-right">Reach</TableHead>
                <TableHead className="text-xs text-right">Resp%</TableHead>
                <TableHead className="text-xs text-right">Enq</TableHead>
                <TableHead className="text-xs text-right">Orders</TableHead>
                <TableHead className="text-xs text-right">Revenue</TableHead>
                <TableHead className="text-xs text-right">ROI%</TableHead>
                <TableHead className="text-xs text-right">Cost/Enq</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.map(c => {
                const o = c.outcome_tracking;
                const m = c.performance_metrics;
                const b = c.budget_breakdown;
                const liveEnq = liveEnqCount.get(c.campaign_code) ?? 0;
                const roi = m?.roi_pct ?? 0;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">
                      <div className="font-medium">{c.campaign_name}</div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono text-muted-foreground">{c.campaign_code}</span>
                        <Badge variant="outline" className={cn('text-[9px] capitalize', STATUS_COLOR[c.status])}>
                          {c.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px]" style={{
                        backgroundColor: `${TYPE_HEX[c.campaign_type]}26`,
                        color: TYPE_HEX[c.campaign_type],
                        borderColor: `${TYPE_HEX[c.campaign_type]}66`,
                      }}>{c.campaign_type}</Badge>
                    </TableCell>
                    <TableCell className="text-[11px] text-right font-mono">{fmtINR(b?.total ?? c.budget ?? 0)}</TableCell>
                    <TableCell className="text-[11px] text-right font-mono">{fmtINR(b?.actual_spent ?? 0)}</TableCell>
                    <TableCell className="text-[11px] text-right font-mono">{o?.actual_reach ?? 0}</TableCell>
                    <TableCell className="text-[11px] text-right font-mono">{m?.response_rate ?? 0}%</TableCell>
                    <TableCell className="text-[11px] text-right font-mono">
                      {o?.enquiries_generated ?? 0}
                      {liveEnq > 0 && (
                        <span className="ml-1 text-[9px] text-muted-foreground">({liveEnq})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[11px] text-right font-mono">{o?.orders_converted ?? 0}</TableCell>
                    <TableCell className="text-[11px] text-right font-mono text-green-600">{fmtINR(o?.revenue_attributed ?? 0)}</TableCell>
                    <TableCell className={cn('text-xs text-right font-mono font-bold',
                      roi > 0 ? 'text-green-600' : roi < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                      {roi.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-[11px] text-right font-mono">{fmtINR(m?.cost_per_enquiry ?? 0)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CampaignPerformanceReport(props: Props) {
  return <CampaignPerformanceReportPanel {...props} />;
}
