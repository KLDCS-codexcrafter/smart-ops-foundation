/**
 * InventoryHubWelcome.tsx — Inventory Hub landing dashboard
 * Sprint T-Phase-1.2.1 · Tier 1 Card #2 sub-sprint 1/3
 *
 * The departmental accountability strip is the MOAT feature — it makes
 * "who holds what stock" visible at a glance, solving the consumption
 * accountability problem that no Indian ERP solves today.
 */
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package, Warehouse, ArrowDownToLine, IndianRupee, Plus, AlertTriangle,
  ListOrdered, UserCircle2, CheckCircle2,
} from 'lucide-react';
import { useInventoryItems } from '@/hooks/useInventoryItems';
import { useGodowns } from '@/hooks/useGodowns';
import { useMaterialIssueNotes } from '@/hooks/useMaterialIssueNotes';
import { useConsumptionEntries } from '@/hooks/useConsumptionEntries';
import { runConsumptionIntelligence } from '@/lib/consumption-intelligence-engine';
import { DEPARTMENT_LABELS, DEPARTMENT_BADGE_COLORS } from '@/types/godown';
import { grnsKey, stockBalanceKey, type GRN, type StockBalanceEntry } from '@/types/grn';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { dSum } from '@/lib/decimal-helpers';
import type { InventoryHubModule } from './InventoryHubSidebar.types';

const fmtINR = (n: number): string =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`;

function loadJson<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

interface InventoryHubWelcomeProps {
  onNavigate: (m: InventoryHubModule) => void;
}

export function InventoryHubWelcomePanel({ onNavigate }: InventoryHubWelcomeProps) {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const { items } = useInventoryItems();
  const { godowns } = useGodowns();

  const grns = useMemo<GRN[]>(() => loadJson<GRN>(grnsKey(safeEntity)), [safeEntity]);
  const stockBalance = useMemo<StockBalanceEntry[]>(
    () => loadJson<StockBalanceEntry>(stockBalanceKey(safeEntity)), [safeEntity]);

  const stats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const grnsThisMonth = grns.filter(g =>
      g.posted_at && new Date(g.posted_at).getTime() >= monthStart.getTime()).length;
    const stockValue = dSum(stockBalance, e => e.value);
    return {
      totalItems: items.length,
      stockValue,
      godowns: godowns.length,
      grnsThisMonth,
    };
  }, [items, godowns, grns, stockBalance]);

  /** Departmental accountability strip — group godowns by department + responsible person */
  const deptStrip = useMemo(() => {
    const valueByGodown = new Map<string, number>();
    for (const e of stockBalance) {
      valueByGodown.set(e.godown_id, (valueByGodown.get(e.godown_id) ?? 0) + e.value);
    }
    return godowns
      .filter(g => g.status === 'active' && g.department_code)
      .map(g => ({
        godown: g,
        deptLabel: DEPARTMENT_LABELS[g.department_code!],
        deptColor: DEPARTMENT_BADGE_COLORS[g.department_code!],
        person: g.responsible_person_name ?? '—',
        value: valueByGodown.get(g.id) ?? 0,
        isVirtual: !!g.is_virtual,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [godowns, stockBalance]);

  const draftAlerts = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return grns.filter(g =>
      g.status === 'draft' &&
      new Date(g.created_at).getTime() < oneDayAgo).length;
  }, [grns]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-cyan-500" />
            Store Hub — Inventory Operations
          </h1>
          <p className="text-sm text-muted-foreground">
            Departmental accountability · live stock balances · GRN-driven receipts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onNavigate('r-stock-ledger')}>
            <ListOrdered className="h-4 w-4" /> Stock Ledger
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => onNavigate('t-grn-entry')}>
            <Plus className="h-4 w-4" /> New GRN
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Items</CardDescription>
            <CardTitle className="text-2xl font-mono text-cyan-600">{stats.totalItems}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">In Item Master</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stock Value</CardDescription>
            <CardTitle className="text-2xl font-mono">{fmtINR(stats.stockValue)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Across all godowns</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Godowns</CardDescription>
            <CardTitle className="text-2xl font-mono text-emerald-600">{stats.godowns}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {godowns.filter(g => g.is_virtual).length} virtual
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>GRNs This Month</CardDescription>
            <CardTitle className="text-2xl font-mono text-blue-600">{stats.grnsThisMonth}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">Posted receipts</CardContent>
        </Card>
      </div>

      {/* Departmental Accountability Strip — the MOAT feature */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-cyan-500" />
                Departmental Custody
              </CardTitle>
              <CardDescription>Who holds what stock — the accountability picture</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('m-godown-master')}>
              Manage Godowns →
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {deptStrip.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Warehouse className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold text-foreground mb-1">No departmental godowns</p>
              <p className="text-xs mb-4">Tag godowns with a department to see custody balances.</p>
              <Button size="sm" onClick={() => onNavigate('m-godown-master')}>
                <Plus className="h-4 w-4 mr-1" /> Add Godown
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {deptStrip.map(d => (
                <div key={d.godown.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{d.godown.code}</code>
                      <Badge className={`text-[10px] ${d.deptColor}`}>{d.deptLabel}</Badge>
                      {d.isVirtual && (
                        <Badge variant="outline" className="text-[9px] border-dashed">Virtual</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{d.godown.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <UserCircle2 className="h-3 w-3" /> {d.person}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-mono font-semibold flex items-center gap-1 justify-end">
                      <IndianRupee className="h-3 w-3" />{fmtINR(d.value).slice(1)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">in custody</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert + Quick action strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Open Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <p>{draftAlerts} GRN{draftAlerts === 1 ? '' : 's'} in draft over 1 day</p>
            <p>Reorder alerts available in Reports</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => onNavigate('r-reorder-alerts')}>
              View Reorder Alerts
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-cyan-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onNavigate('t-grn-entry')}>
              <Plus className="h-4 w-4 mr-1" /> New GRN
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('r-stock-ledger')}>
              Stock Ledger
            </Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate('r-grn-register')}>
              GRN Register
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
