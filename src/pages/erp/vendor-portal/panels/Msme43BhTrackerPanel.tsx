/**
 * @file        src/pages/erp/vendor-portal/panels/Msme43BhTrackerPanel.tsx
 * @purpose     MSME-43BH Compliance Tracker · aggregate KPIs + per-invoice countdown
 * @sprint      T-Phase-1.A-b.1-VendorPortal-Performance-Triad
 * @decisions   D-NEW-DN · A-b-Q2=A · A-b-Q6=C · A-b-Q8=C · A-b-Q9=C
 * @reuses      msme-43bh-engine (consume only · 0-diff)
 * @[JWT]       N/A (panel reads via engine)
 */
import { useMemo, useState } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle, CheckCircle, Clock, XCircle, IndianRupee, Calendar,
  Bot, Building2, Search,
} from 'lucide-react';
import {
  compute43BhSummary, getMSMEBreaches, disallowedAmountForFY,
  type MSMEBreach,
} from '@/lib/msme-43bh-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

type StatusKind = 'safe' | 'caution' | 'warning' | 'overdue';

function classifyBreach(b: MSMEBreach): StatusKind {
  if (b.status === 'breached' || b.days_overdue > 0) return 'overdue';
  const daysSinceInvoice = Math.floor(
    (Date.now() - new Date(b.invoice_date).getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysRemaining = b.deadline.days_allowed - daysSinceInvoice;
  if (daysRemaining <= 4) return 'warning';
  if (daysRemaining <= 15) return 'caution';
  return 'safe';
}

function statusBadge(status: StatusKind): JSX.Element {
  switch (status) {
    case 'safe':
      return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1">
        <CheckCircle className="h-3 w-3" />Safe
      </Badge>;
    case 'caution':
      return <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 gap-1">
        <Clock className="h-3 w-3" />Caution
      </Badge>;
    case 'warning':
      return <Badge className="bg-orange-500/15 text-orange-700 border-orange-500/30 gap-1">
        <AlertTriangle className="h-3 w-3" />Warning
      </Badge>;
    case 'overdue':
      return <Badge className="bg-red-500/15 text-red-700 border-red-500/30 gap-1">
        <XCircle className="h-3 w-3" />Overdue
      </Badge>;
  }
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount);
}

function getCurrentFy(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month < 3) return `${year - 1}-${String(year).slice(2)}`;
  return `${year}-${String(year + 1).slice(2)}`;
}

export function Msme43BhTrackerPanel(): JSX.Element {
  const entityCode = useMemo(() => {
    try {
      return localStorage.getItem('active_entity_code') ?? DEFAULT_ENTITY_SHORTCODE;
    } catch { return DEFAULT_ENTITY_SHORTCODE; }
  }, []);

  const summary = useMemo(() => compute43BhSummary(entityCode), [entityCode]);
  const breaches = useMemo(() => getMSMEBreaches(entityCode), [entityCode]);
  const fyDisallowed = useMemo(() => disallowedAmountForFY(entityCode, getCurrentFy()), [entityCode]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusKind | 'all'>('all');

  const filteredBreaches = useMemo(() => {
    const rankWeight: Record<StatusKind, number> = { overdue: 0, warning: 1, caution: 2, safe: 3 };
    return breaches
      .map(b => ({ breach: b, status: classifyBreach(b) }))
      .filter(({ breach, status }) => {
        if (statusFilter !== 'all' && status !== statusFilter) return false;
        if (searchQuery && !breach.vendor_name.toLowerCase().includes(searchQuery.toLowerCase())
          && !breach.invoice_no.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => rankWeight[a.status] - rankWeight[b.status]);
  }, [breaches, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-500/15 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              MSME-43BH Compliance Tracker
              <Badge variant="outline" className="text-[10px]">15/45-day rule · Sec 43B(h)</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Indian Income Tax · pay MSME (micro/small) suppliers within deadline · failure → expense disallowed
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Bot className="h-3 w-3" />Saathi · auto-reminder to vendor · Phase 2
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">MSME Vendors</p>
              <Building2 className="h-4 w-4 text-slate-600" />
            </div>
            <p className="text-2xl font-bold font-mono">{summary.total_msme_vendors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Open Bills</p>
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold font-mono">{summary.open_msme_bills_count}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">₹{formatINR(summary.open_msme_bills_amount)}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Breaching Soon</p>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold font-mono text-orange-700">{summary.breaching_soon_count}</p>
            <p className="text-[10px] text-muted-foreground mt-1">&lt; 5 days remaining</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Breached</p>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold font-mono text-red-700">{summary.breached_count}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono">₹{formatINR(summary.breached_amount)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-red-500/40 bg-gradient-to-br from-red-500/5 to-transparent">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-500/15 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium flex items-center gap-2">
                FY {getCurrentFy()} Disallowed Amount
                <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-700 border-red-500/30">
                  Tax Impact
                </Badge>
              </p>
              <p className="text-sm text-muted-foreground">
                Total invoice amount disallowed under Sec 43B(h) this fiscal year · this amount is added back to taxable income
              </p>
            </div>
          </div>
          <p className="text-2xl font-bold font-mono text-red-700">₹{formatINR(fyDisallowed)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Open MSME Bills · Per-Invoice Countdown</CardTitle>
              <CardDescription>
                Sorted by criticality · overdue first · {filteredBreaches.length} of {breaches.length} shown
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendor or invoice"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 pl-8 h-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusKind | 'all')}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="caution">Caution</SelectItem>
                  <SelectItem value="safe">Safe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredBreaches.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {breaches.length === 0
                ? 'No open MSME bills · all clear'
                : 'No bills match filter'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>MSME</TableHead>
                  <TableHead>Inv Date</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Unpaid (₹)</TableHead>
                  <TableHead className="text-center">Days</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBreaches.map(({ breach: b, status }) => {
                  const daysSinceInvoice = Math.floor(
                    (Date.now() - new Date(b.invoice_date).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  const daysDisplay = status === 'overdue'
                    ? `+${b.days_overdue}`
                    : `${b.deadline.days_allowed - daysSinceInvoice}`;
                  return (
                    <TableRow key={b.invoice_id}>
                      <TableCell className="font-medium text-sm">{b.vendor_name}</TableCell>
                      <TableCell className="font-mono text-xs">{b.invoice_no}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] capitalize">
                          {b.msme_category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(b.invoice_date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(b.deadline.deadline_date).toLocaleDateString('en-IN')}
                        <span className="ml-1 text-[10px]">({b.deadline.days_allowed}d)</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ₹{formatINR(b.unpaid_amount)}
                      </TableCell>
                      <TableCell className={`text-center text-sm font-mono font-bold ${
                        status === 'overdue' ? 'text-red-700' :
                        status === 'warning' ? 'text-orange-700' :
                        status === 'caution' ? 'text-amber-700' : 'text-emerald-700'
                      }`}>
                        {daysDisplay}
                      </TableCell>
                      <TableCell>{statusBadge(status)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
