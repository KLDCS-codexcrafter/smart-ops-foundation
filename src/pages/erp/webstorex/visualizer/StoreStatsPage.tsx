/**
 * @file        src/pages/erp/webstorex/visualizer/StoreStatsPage.tsx
 * @purpose     S152 Store Stats · DP-WS-21 read-only aggregation surface.
 * @sprint      Sprint 152 · T-WebStoreX-A11.4 · ARC CLOSER
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { buildStoreStats } from '@/lib/webstorex-visualizer-engine';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Tag, Star, FileText, Package } from 'lucide-react';

function fmtINR(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function StoreStatsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const stats = useMemo(() => entityCode ? buildStoreStats(entityCode) : null, [entityCode]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;
  if (!stats) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Store Stats
        </h1>
        <p className="text-xs text-muted-foreground">
          Read-only aggregation across catalog · orders · schemes · loyalty · quotes.
        </p>
      </div>

      {/* Catalog */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Package className="h-4 w-4" /> Catalog
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatCell label="Total" value={stats.catalog.total} />
            <StatCell label="Published" value={stats.catalog.published} tone="success" />
            <StatCell label="Draft" value={stats.catalog.draft} tone="muted" />
            <StatCell label="Hidden" value={stats.catalog.hidden} tone="muted" />
            <StatCell label="With variants" value={stats.catalog.withVariants} />
            <StatCell label="With cutout" value={stats.catalog.withCutout} />
          </div>
        </CardContent>
      </Card>

      {/* Orders */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4" /> Orders
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCell label="Count" value={stats.orders.count} />
            <StatCell label="Total payable" value={fmtINR(stats.orders.totalPayable)} mono />
            <StatCell label="Via storefront" value={stats.orders.byVia.storefront} />
            <StatCell label="Via quick order" value={stats.orders.byVia.quick_order} />
            <StatCell label="Via reorder" value={stats.orders.byVia.reorder} />
          </div>
        </CardContent>
      </Card>

      {/* Top items */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Star className="h-4 w-4" /> Top items
          </div>
          {stats.topItems.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">No orders yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {stats.topItems.map((t, i) => (
                <div key={`ti-${i}-${t.storeItemId}`} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono w-7 justify-center">{i + 1}</Badge>
                    <span className="truncate">{t.title}</span>
                  </div>
                  <span className="font-mono text-xs">{t.orderedQty} units</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schemes */}
      <Card className="glass-card">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Tag className="h-4 w-4" /> Schemes applied (from order snapshots)
          </div>
          {stats.schemes.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">No schemes applied yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {stats.schemes.map((s, i) => (
                <div key={`sch-${i}-${s.schemeId}`} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate">{s.name}</span>
                  <span className="font-mono text-xs">{s.appliedCount}×</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loyalty + Quotes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Star className="h-4 w-4" /> Loyalty
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCell label="Earned" value={stats.loyalty.totalEarned} mono />
              <StatCell label="Redeemed" value={stats.loyalty.totalRedeemed} mono />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="h-4 w-4" /> Quotes
            </div>
            <StatCell label="Requests" value={stats.quotes.count} mono />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCellProps { label: string; value: number | string; mono?: boolean; tone?: 'success' | 'muted' }
function StatCell({ label, value, mono, tone }: StatCellProps): JSX.Element {
  const toneCls = tone === 'success' ? 'text-success' : tone === 'muted' ? 'text-muted-foreground' : 'text-foreground';
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg ${mono ? 'font-mono' : 'font-semibold'} ${toneCls}`}>{value}</div>
    </div>
  );
}
