/**
 * @file     SmartAPHub.tsx
 * @purpose  5-tab Smart AP hub · Bulk Pay · Auto-Pay Rules · Cash-Flow ·
 *           Forecast · Bank Files. Each tab routes to a sub-screen via in-place
 *           render (kept under the PayOut shell · Outlet sub-routes also work).
 * @sprint   T-T8.7-SmartAP (Group B Sprint B.7)
 * @whom     Routed from PayOutSidebar "Smart AP" entry.
 *
 * Pure presentation · IMPORTS engine query/orchestration functions only.
 * No engine modifications · no new exports added back to engines.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Zap, Layers, Repeat, TrendingUp, BarChart3, Building2,
  IndianRupee, FileSpreadsheet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

import BulkPayBuilder from './BulkPayBuilder';
import AutoPayRulesEditor from './AutoPayRulesEditor';
import CashFlowDashboard from './CashFlowDashboard';

import { listBatches, getApprovedRequisitions } from '@/lib/bulk-pay-engine';
import { listRules, evaluateRulesNow } from '@/lib/auto-pay-engine';
import {
  computeCashFlowProjection, forecastByWeek, getCurrentBankBalances,
} from '@/lib/cash-flow-engine';
import { listSupportedBanks } from '@/lib/bank-file-engine';
import {
  BULK_BATCH_STATUS_COLORS, BULK_BATCH_STATUS_LABEL,
} from '@/types/smart-ap';

const inr = (n: number): string =>
  '₹' + Math.abs(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const TAB_FROM_PATH = (p: string): string => {
  if (p.endsWith('/bulk-pay')) return 'bulk-pay';
  if (p.endsWith('/auto-pay-rules')) return 'auto-pay';
  if (p.endsWith('/cash-flow')) return 'cash-flow';
  if (p.endsWith('/forecast')) return 'forecast';
  if (p.endsWith('/bank-files')) return 'bank-files';
  return 'overview';
};

const PATH_FROM_TAB: Record<string, string> = {
  overview:   '/erp/payout/smart-ap',
  'bulk-pay': '/erp/payout/smart-ap/bulk-pay',
  'auto-pay': '/erp/payout/smart-ap/auto-pay-rules',
  'cash-flow':'/erp/payout/smart-ap/cash-flow',
  forecast:   '/erp/payout/smart-ap/forecast',
  'bank-files':'/erp/payout/smart-ap/bank-files',
};

interface PanelProps { entityCode: string; }

function SmartAPHubPanel({ entityCode }: PanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const tab = TAB_FROM_PATH(location.pathname);
  const [refreshTick, setRefreshTick] = useState(0);

  // Re-read after sub-screen actions (post-message based · cheap)
  useEffect(() => {
    const t = setInterval(() => setRefreshTick(x => x + 1), 4000);
    return () => clearInterval(t);
  }, []);

  const overviewKpis = useMemo(() => {
    void refreshTick;
    const batches = listBatches(entityCode);
    const rules   = listRules(entityCode);
    const candidates = evaluateRulesNow(entityCode);
    const reqs    = getApprovedRequisitions(entityCode);
    const balances = getCurrentBankBalances(entityCode);
    const totalBank = balances.reduce((s, b) => s + b.balance, 0);

    const pending = batches.filter(b =>
      ['draft', 'maker_signed'].includes(b.status));
    const executed = batches.filter(b => b.status === 'executed');
    return { batches, rules, candidates, reqs, totalBank, pending, executed };
  }, [entityCode, refreshTick]);

  const projectionPreview = useMemo(() => {
    void refreshTick;
    return computeCashFlowProjection(entityCode, 30);
  }, [entityCode, refreshTick]);
  const minProjected = projectionPreview.length
    ? Math.min(...projectionPreview.map(p => p.closing_balance))
    : 0;

  const forecastPreview = useMemo(() => {
    void refreshTick;
    return forecastByWeek(entityCode, 13);
  }, [entityCode, refreshTick]);
  const negWeeks = forecastPreview.filter(w => w.is_negative).length;

  const banks = useMemo(() => listSupportedBanks(), []);

  const switchTab = (next: string): void => {
    const path = PATH_FROM_TAB[next] ?? PATH_FROM_TAB.overview;
    if (path !== location.pathname) navigate(path);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Zap className="h-6 w-6 text-violet-500" />
            Smart AP
          </h1>
          <p className="text-sm text-muted-foreground">
            Bulk pay · Maker-checker · Auto-pay rules · Cash-flow optimizer · 12-bank file generator
          </p>
        </div>
        <Badge variant="outline" className="border-violet-500/30 text-violet-700 dark:text-violet-300">
          Sprint B.7 · 5 industry firsts
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={switchTab}>
        <TabsList>
          <TabsTrigger value="overview"><Layers className="h-3.5 w-3.5 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="bulk-pay"><Layers className="h-3.5 w-3.5 mr-1" />Bulk Pay</TabsTrigger>
          <TabsTrigger value="auto-pay"><Repeat className="h-3.5 w-3.5 mr-1" />Auto-Pay Rules</TabsTrigger>
          <TabsTrigger value="cash-flow"><TrendingUp className="h-3.5 w-3.5 mr-1" />Cash-Flow</TabsTrigger>
          <TabsTrigger value="forecast"><BarChart3 className="h-3.5 w-3.5 mr-1" />Forecast</TabsTrigger>
          <TabsTrigger value="bank-files"><FileSpreadsheet className="h-3.5 w-3.5 mr-1" />Bank Files</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <IndianRupee className="h-3.5 w-3.5" />Bank Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-2xl font-semibold">{inr(overviewKpis.totalBank)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Across {getCurrentBankBalances(entityCode).length} bank ledgers
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />Approved Reqs Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-2xl font-semibold">{overviewKpis.reqs.length}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {inr(overviewKpis.reqs.reduce((s, r) => s + r.amount, 0))} ready to bulk-pay
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Repeat className="h-3.5 w-3.5" />Auto-Pay Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-mono text-2xl font-semibold">{overviewKpis.rules.length}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {overviewKpis.candidates.length} ready to fire now
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />Min Projected (30d)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`font-mono text-2xl font-semibold ${minProjected < 0 ? 'text-destructive' : ''}`}>
                  {inr(minProjected)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {negWeeks > 0 ? `${negWeeks} negative weeks (13w)` : 'All forecast weeks healthy'}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-violet-500" />Recent Bulk Pay Batches
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overviewKpis.batches.length === 0
                  ? <p className="text-xs text-muted-foreground">No batches yet · use Bulk Pay tab to create one.</p>
                  : (
                    <ul className="space-y-2">
                      {overviewKpis.batches.slice(0, 5).map(b => (
                        <li key={b.id} className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
                          <div>
                            <div className="font-mono font-medium">{b.batch_no}</div>
                            <div className="text-muted-foreground">{b.count} reqs · {inr(b.total_amount)}</div>
                          </div>
                          <Badge variant="outline" className={BULK_BATCH_STATUS_COLORS[b.status]}>
                            {BULK_BATCH_STATUS_LABEL[b.status]}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                <Button size="sm" variant="outline" className="mt-3 w-full"
                  onClick={() => switchTab('bulk-pay')}>Go to Bulk Pay →</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-violet-500" />Supported Banks ({banks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {banks.map(b => (
                    <Badge key={b.bank_code} variant="outline" className="text-[10px]">
                      {b.bank_code}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  NEFT/RTGS/IMPS file generation · download CSV/TXT · upload to bank portal manually.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk-pay" className="mt-6">
          <BulkPayBuilder entityCode={entityCode} />
        </TabsContent>
        <TabsContent value="auto-pay" className="mt-6">
          <AutoPayRulesEditor entityCode={entityCode} />
        </TabsContent>
        <TabsContent value="cash-flow" className="mt-6">
          <CashFlowDashboard entityCode={entityCode} mode="cash-flow" />
        </TabsContent>
        <TabsContent value="forecast" className="mt-6">
          <CashFlowDashboard entityCode={entityCode} mode="forecast" />
        </TabsContent>
        <TabsContent value="bank-files" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Bank File Formats ({banks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left p-2">Bank</th>
                      <th className="text-left p-2">Code</th>
                      <th className="text-left p-2">Formats</th>
                      <th className="text-left p-2">Delimiter</th>
                      <th className="text-left p-2">Columns</th>
                      <th className="text-left p-2">Ext</th>
                    </tr>
                  </thead>
                  <tbody>
                    {banks.map(b => (
                      <tr key={b.bank_code} className="border-b border-border/40">
                        <td className="p-2">{b.bank_name}</td>
                        <td className="p-2 font-mono">{b.bank_code}</td>
                        <td className="p-2">{b.supported_formats.join(' · ')}</td>
                        <td className="p-2 font-mono">
                          {b.delimiter === ',' ? 'CSV' : b.delimiter === '|' ? 'PIPE' : 'TAB'}
                        </td>
                        <td className="p-2 font-mono">{b.column_order.length}</td>
                        <td className="p-2 font-mono">.{b.file_extension ?? 'csv'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Generate bank files from inside any Bulk Pay batch · this tab is a reference matrix.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function SmartAPHubScreen() { return <SmartAPHub />; }

export default function SmartAPHub() {
  const { entityCode } = useEntityCode();
  if (!entityCode) {
    return (
      <SelectCompanyGate
        title="Select a company to use Smart AP"
        description="Smart AP is scoped to a specific company. Pick one from the header to continue."
      />
    );
  }
  return <SmartAPHubPanel entityCode={entityCode} />;
}
