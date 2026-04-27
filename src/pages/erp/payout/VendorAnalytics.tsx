/**
 * @file     VendorAnalytics.tsx
 * @purpose  5-tier vendor performance analytics dashboard.
 *           Filters: Entity (required) · Branch · Business Unit · Division · Department.
 *           5 KPIs · Top-10 BarChart · Distribution PieChart · drill-to-vendor table · CSV export.
 * @sprint   T-T8.6-VendorAnalytics (Group B Sprint B.6)
 * @whom     Routed from PayOutSidebar "Vendor Analytics" entry.
 *
 * Reads exclusively via vendor-analytics-engine (pure query). No mutations.
 * Recharts already imported in 5+ existing reports · NO new dep.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Users, IndianRupee, Clock, AlertOctagon, ShieldCheck, Download,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { exportCSV } from '@/pages/erp/finecore/reports/reportUtils';
import {
  getTopVendorsBySpend,
  getVendorAnalyticsForSlice,
  getVendorCountByDimension,
  type VendorMetrics,
  type VendorSlice,
  type TopVendorRow,
  type DimensionDistribution,
} from '@/lib/vendor-analytics-engine';
import type { BranchOffice } from '@/types/branch-office';
import type { Division, Department } from '@/types/org-structure';

const inr = (n: number): string =>
  '₹' + Math.abs(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const PIE_COLORS = [
  'hsl(258 90% 66%)',  // violet
  'hsl(220 90% 60%)',  // blue
  'hsl(160 65% 45%)',  // emerald
  'hsl(35  92% 55%)',  // amber
  'hsl(0   75% 60%)',  // red
  'hsl(290 70% 60%)',  // purple
  'hsl(190 80% 50%)',  // cyan
  'hsl(50  95% 55%)',  // yellow
];

interface BUSummary { id: string; name: string }

function readJSON<T>(key: string, fallback: T): T {
  // [JWT] GET /api/foundation/<master>
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

interface PanelProps { entityCode: string; entityId: string }

function VendorAnalyticsPanel({ entityCode, entityId }: PanelProps) {
  // Tier filters (entity required · others optional · independent dropdowns Phase 1)
  const [branchId, setBranchId] = useState<string>('all');
  const [buId, setBuId] = useState<string>('all');
  const [divisionId, setDivisionId] = useState<string>('all');
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [topMetric, setTopMetric] = useState<'spend' | 'cycle' | 'breach'>('spend');
  const [pieDimension, setPieDimension] =
    useState<'department' | 'division' | 'branch' | 'business_unit'>('department');
  const [sortKey, setSortKey] = useState<keyof VendorMetrics>('total_spend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Master option lists (read-only)
  const branches = useMemo(() =>
    readJSON<BranchOffice[]>('erp_branch_offices', []), []);
  const businessUnits = useMemo(() =>
    readJSON<BUSummary[]>('erp_group_business_unit_master', []), []);
  const divisions = useMemo(() =>
    readJSON<Division[]>('erp_divisions', []), []);
  const departments = useMemo(() =>
    readJSON<Department[]>('erp_departments', []), []);

  const slice: VendorSlice = useMemo(() => ({
    entity_id: entityId,
    branch_id: branchId === 'all' ? undefined : branchId,
    business_unit_id: buId === 'all' ? undefined : buId,
    division_id: divisionId === 'all' ? undefined : divisionId,
    department_id: departmentId === 'all' ? undefined : departmentId,
  }), [entityId, branchId, buId, divisionId, departmentId]);

  const [topVendors, setTopVendors] = useState<TopVendorRow[]>([]);
  const [vendorMetrics, setVendorMetrics] = useState<VendorMetrics[]>([]);
  const [distribution, setDistribution] = useState<DimensionDistribution[]>([]);

  useEffect(() => {
    setTopVendors(getTopVendorsBySpend(entityCode, slice, 10));
    setVendorMetrics(getVendorAnalyticsForSlice(entityCode, slice));
    setDistribution(getVendorCountByDimension(entityCode, pieDimension, slice));
  }, [entityCode, slice, pieDimension]);

  // KPI computations
  const totalVendors = vendorMetrics.length;
  const totalSpend = vendorMetrics.reduce((s, v) => s + v.total_spend, 0);
  const avgCycle = useMemo(() => {
    const valid = vendorMetrics.filter(v => v.avg_payment_cycle_days !== null);
    if (valid.length === 0) return null;
    const sum = valid.reduce((s, v) => s + (v.avg_payment_cycle_days ?? 0), 0);
    return Math.round(sum / valid.length);
  }, [vendorMetrics]);
  const topBreachVendor = useMemo(() => {
    return [...vendorMetrics]
      .filter(v => v.msme_breach_rate_pct > 0)
      .sort((a, b) => b.msme_breach_rate_pct - a.msme_breach_rate_pct)[0];
  }, [vendorMetrics]);
  const avgTDSCompliance = useMemo(() => {
    if (vendorMetrics.length === 0) return null;
    const sum = vendorMetrics.reduce((s, v) => s + v.tds_compliance_pct, 0);
    return Math.round(sum / vendorMetrics.length);
  }, [vendorMetrics]);

  // Top-N chart data — toggleable metric
  const topChartData = useMemo(() => {
    if (topMetric === 'spend') {
      return topVendors.map(t => ({ name: t.vendor_name, value: t.total_spend }));
    }
    const sortedMetrics = [...vendorMetrics];
    if (topMetric === 'cycle') {
      sortedMetrics.sort((a, b) =>
        (b.avg_payment_cycle_days ?? 0) - (a.avg_payment_cycle_days ?? 0));
      return sortedMetrics.slice(0, 10).map(v => ({
        name: v.vendor_name, value: v.avg_payment_cycle_days ?? 0,
      }));
    }
    sortedMetrics.sort((a, b) => b.msme_breach_rate_pct - a.msme_breach_rate_pct);
    return sortedMetrics.slice(0, 10).map(v => ({
      name: v.vendor_name, value: v.msme_breach_rate_pct,
    }));
  }, [topMetric, topVendors, vendorMetrics]);

  // Distribution data labelling
  const dimensionLabel = (id: string): string => {
    if (id === 'unassigned') return 'Unassigned';
    switch (pieDimension) {
      case 'branch':        return branches.find(b => b.id === id)?.name ?? id;
      case 'business_unit': return businessUnits.find(b => b.id === id)?.name ?? id;
      case 'division':      return divisions.find(d => d.id === id)?.name ?? id;
      case 'department':    return departments.find(d => d.id === id)?.name ?? id;
    }
    return id;
  };

  const pieData = useMemo(() => distribution.map(d => ({
    name: dimensionLabel(d.dimension_label),
    value: d.vendor_count,
    spend: d.total_spend,
  })), [distribution, pieDimension, branches, businessUnits, divisions, departments]);

  // Sortable drill table
  const sortedRows = useMemo(() => {
    const out = [...vendorMetrics];
    out.sort((a, b) => {
      const av = a[sortKey] as number | string | null;
      const bv = b[sortKey] as number | string | null;
      const an = typeof av === 'number' ? av : (av === null ? -1 : Number(av));
      const bn = typeof bv === 'number' ? bv : (bv === null ? -1 : Number(bv));
      return sortDir === 'desc' ? bn - an : an - bn;
    });
    return out;
  }, [vendorMetrics, sortKey, sortDir]);

  const toggleSort = (key: keyof VendorMetrics) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const handleExportCSV = () => {
    exportCSV(
      `vendor-analytics-${entityCode}-${Date.now()}.csv`,
      ['Vendor Code', 'Vendor', 'Total Spend (₹)', 'Invoices', 'Avg Cycle (days)',
        'Advance Util %', 'MSME Breach %', 'TDS Compliance %'],
      sortedRows.map(r => [
        r.vendor_code ?? '',
        r.vendor_name,
        String(r.total_spend),
        String(r.invoice_count),
        r.avg_payment_cycle_days === null ? '—' : String(r.avg_payment_cycle_days),
        String(r.advance_utilization_pct),
        String(r.msme_breach_rate_pct),
        String(r.tds_compliance_pct),
      ]),
    );
  };

  const kpiCards = [
    {
      label: 'Total Vendors',
      value: String(totalVendors),
      icon: Users,
      tone: 'text-violet-500',
      sub: 'Distinct vendors in slice',
    },
    {
      label: 'Total Spend',
      value: inr(totalSpend),
      icon: IndianRupee,
      tone: 'text-emerald-500',
      sub: 'Purchase + Payment net',
    },
    {
      label: 'Avg Cycle Time',
      value: avgCycle === null ? '—' : `${avgCycle}d`,
      icon: Clock,
      tone: 'text-blue-500',
      sub: 'Invoice → settlement',
    },
    {
      label: 'Top MSME Breach',
      value: topBreachVendor
        ? `${topBreachVendor.msme_breach_rate_pct}%`
        : '0%',
      icon: AlertOctagon,
      tone: 'text-destructive',
      sub: topBreachVendor?.vendor_name ?? 'No breaches',
    },
    {
      label: 'Avg TDS Compliance',
      value: avgTDSCompliance === null ? '—' : `${avgTDSCompliance}%`,
      icon: ShieldCheck,
      tone: 'text-amber-500',
      sub: 'Across vendors in slice',
    },
  ];

  const tierFilters: Array<{
    label: string; value: string; setter: (v: string) => void;
    options: Array<{ id: string; name: string }>;
  }> = [
    { label: 'Branch', value: branchId, setter: setBranchId,
      options: branches.map(b => ({ id: b.id, name: b.name })) },
    { label: 'Business Unit', value: buId, setter: setBuId,
      options: businessUnits.map(b => ({ id: b.id, name: b.name })) },
    { label: 'Division', value: divisionId, setter: setDivisionId,
      options: divisions.map(d => ({ id: d.id, name: d.name })) },
    { label: 'Department', value: departmentId, setter: setDepartmentId,
      options: departments.map(d => ({ id: d.id, name: d.name })) },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-violet-500" />
            Vendor Analytics
            <Badge variant="outline" className="text-[9px] border-violet-500/40 text-violet-600">
              5-TIER · INDUSTRY FIRST
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            Slice vendor performance across Entity · Branch · Business Unit · Division · Department.
            Pure-query analytics powered by B.0 voucher-org-tag.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={sortedRows.length === 0}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* 5-tier filter bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
            Slice Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground">Entity</label>
              <div className="h-8 px-3 flex items-center text-xs font-mono border border-border rounded-md bg-muted/30">
                {entityCode}
              </div>
            </div>
            {tierFilters.map(f => (
              <div key={f.label}>
                <label className="text-[10px] text-muted-foreground">{f.label}</label>
                <Select value={f.value} onValueChange={f.setter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {f.options.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 5 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map(card => (
          <Card key={card.label}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.tone}`} />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold font-mono truncate">{card.value}</div>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2 charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Top 10 Vendors</CardTitle>
            <Select value={topMetric} onValueChange={v => setTopMetric(v as typeof topMetric)}>
              <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="spend">By Spend</SelectItem>
                <SelectItem value="cycle">By Cycle Time</SelectItem>
                <SelectItem value="breach">By Breach Rate</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {topChartData.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-12">
                No vendor data in slice
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topChartData} layout="vertical" margin={{ left: 24, right: 16 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                  <RTooltip
                    formatter={(val: number) =>
                      topMetric === 'spend' ? inr(val)
                      : topMetric === 'cycle' ? `${val} d`
                      : `${val}%`}
                  />
                  <Bar dataKey="value" fill="hsl(258 90% 66%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Vendor Distribution</CardTitle>
            <Select value={pieDimension} onValueChange={v => setPieDimension(v as typeof pieDimension)}>
              <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="department">By Department</SelectItem>
                <SelectItem value="division">By Division</SelectItem>
                <SelectItem value="branch">By Branch</SelectItem>
                <SelectItem value="business_unit">By Business Unit</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-12">
                No tagged vouchers in slice
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label={{ fontSize: 10 }}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip
                    formatter={(val: number, _name, props: { payload?: { spend?: number } }) => {
                      const spend = props.payload?.spend ?? 0;
                      return [`${val} vendors · ${inr(spend)}`, 'Total'];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drill-to-vendor table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Per-Vendor Performance ({sortedRows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedRows.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-10">
              No vendors found in selected slice
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs cursor-pointer" onClick={() => toggleSort('vendor_name')}>Vendor</TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('total_spend')}>Spend</TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('invoice_count')}>Invoices</TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('avg_payment_cycle_days')}>Cycle (d)</TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('advance_utilization_pct')}>Adv Util %</TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('msme_breach_rate_pct')}>MSME Breach %</TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => toggleSort('tds_compliance_pct')}>TDS Comp %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.map(r => (
                    <TableRow key={r.vendor_id}>
                      <TableCell className="text-xs">
                        <div className="font-medium">{r.vendor_name}</div>
                        {r.vendor_code && (
                          <div className="text-[10px] text-muted-foreground font-mono">{r.vendor_code}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">{inr(r.total_spend)}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{r.invoice_count}</TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {r.avg_payment_cycle_days === null ? '—' : r.avg_payment_cycle_days}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">{r.advance_utilization_pct}%</TableCell>
                      <TableCell className={`text-xs text-right font-mono ${r.msme_breach_rate_pct > 0 ? 'text-destructive font-bold' : ''}`}>
                        {r.msme_breach_rate_pct}%
                      </TableCell>
                      <TableCell className={`text-xs text-right font-mono ${r.tds_compliance_pct < 80 ? 'text-amber-600' : ''}`}>
                        {r.tds_compliance_pct}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="pt-4">
          <p className="text-[11px] text-muted-foreground">
            <strong>Note:</strong> 5-tier slicing is achieved via Set intersection of B.0
            voucher-org-tag query results · zero schema duplication. Scheduled email
            digests · vendor scorecard/grading · cross-entity consolidation are deferred
            to the Support &amp; Back Office horizon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

interface EntityRow { id: string; shortCode: string; name: string }

export default function VendorAnalytics() {
  const { entityCode } = useEntityCode();
  const entityId = useMemo(() => {
    if (!entityCode) return '';
    const entities = readJSON<EntityRow[]>('erp_group_entities', []);
    return entities.find(e => e.shortCode === entityCode)?.id ?? entityCode;
  }, [entityCode]);
  return entityCode
    ? <VendorAnalyticsPanel entityCode={entityCode} entityId={entityId} />
    : <SelectCompanyGate title="Select a company to view Vendor Analytics" />;
}
