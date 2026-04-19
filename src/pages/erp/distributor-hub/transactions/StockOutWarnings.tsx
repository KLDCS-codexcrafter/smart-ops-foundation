/**
 * StockOutWarnings.tsx — Stock-out early warning + cross-distributor transfer suggestions
 * Module id: dh-t-stock-out
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  stockLevelsKey, stockOutAlertsKey,
  type StockLevelSnapshot, type StockOutAlert, type StockOutSeverity,
} from '@/types/stock-out';
import { computeStockOutAlerts, seedDemoStockLevels } from '@/lib/stock-out-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';

const SEVERITY_COLOURS: Record<StockOutSeverity, string> = {
  critical: 'bg-red-500/15 text-red-700 border-red-500/30',
  warning:  'bg-amber-500/15 text-amber-700 border-amber-500/30',
  info:     'bg-slate-500/15 text-slate-600 border-slate-400/30',
};

const ENTITY = 'SMRT';

function readSnapshots(): StockLevelSnapshot[] {
  try {
    // [JWT] GET /api/distributor/stock-levels
    const raw = localStorage.getItem(stockLevelsKey(ENTITY));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function readDismissals(): Record<string, string> {
  try {
    const raw = localStorage.getItem(stockOutAlertsKey(ENTITY));
    if (!raw) return {};
    const list = JSON.parse(raw) as { id: string; dismissed_at: string | null }[];
    return list.reduce<Record<string, string>>((acc, a) => {
      if (a.dismissed_at) acc[a.id] = a.dismissed_at;
      return acc;
    }, {});
  } catch { return {}; }
}

function writeDismissal(alertId: string): void {
  try {
    const raw = localStorage.getItem(stockOutAlertsKey(ENTITY));
    const list: { id: string; dismissed_at: string | null }[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(a => a.id === alertId);
    const stamp = new Date().toISOString();
    if (idx >= 0) list[idx].dismissed_at = stamp;
    else list.push({ id: alertId, dismissed_at: stamp });
    // [JWT] POST /api/stock/alerts/dismiss
    localStorage.setItem(stockOutAlertsKey(ENTITY), JSON.stringify(list));
  } catch { /* ignore */ }
}

export function StockOutWarningsPanel() {
  const [rev, setRev] = useState(0);
  const [dismissed, setDismissed] = useState<Record<string, string>>(() => readDismissals());

  useEffect(() => {
    let snaps = readSnapshots();
    if (snaps.length === 0) {
      snaps = seedDemoStockLevels(ENTITY);
      try { localStorage.setItem(stockLevelsKey(ENTITY), JSON.stringify(snaps)); }
      catch { /* ignore */ }
      setRev(r => r + 1);
    }
  }, []);

  const alerts: StockOutAlert[] = useMemo(() => {
    void rev;
    const snaps = readSnapshots();
    return computeStockOutAlerts(snaps);
  }, [rev]);

  const visible = alerts.filter(a => !dismissed[a.id]);

  const counts = {
    critical: visible.filter(a => a.severity === 'critical').length,
    warning:  visible.filter(a => a.severity === 'warning').length,
    healthy:  Math.max(0, alerts.length - visible.length),
  };

  const handleAccept = (alert: StockOutAlert, fromName: string, qty: number) => {
    toast.success('Transfer request sent');
    recordActivity(ENTITY, 'tenant-admin', {
      card_id: 'distributor-hub',
      kind: 'voucher',
      ref_id: alert.id,
      title: `Transfer ${qty} ${alert.item_name}`,
      subtitle: `From ${fromName} -> ${alert.distributor_name}`,
      deep_link: '/erp/distributor-hub#dh-t-stock-out',
    });
  };

  const handleDismiss = (id: string) => {
    writeDismissal(id);
    setDismissed(prev => ({ ...prev, [id]: new Date().toISOString() }));
  };

  const handleRefresh = () => {
    setRev(r => r + 1);
    toast.success('Refreshed');
  };

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-indigo-600" />
            Stock-Out Warnings
            <span className="text-xs font-normal px-2 py-0.5 rounded border bg-indigo-600/10 text-indigo-600 border-indigo-600/30">
              {visible.length} live
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            30-day demand vs available stock; cross-distributor transfer hints.
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Critical</span>
          <p className="text-2xl font-bold text-red-600">{counts.critical}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Warning</span>
          <p className="text-2xl font-bold text-amber-600">{counts.warning}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Dismissed</span>
          <p className="text-2xl font-bold text-emerald-600">{counts.healthy}</p>
        </CardContent></Card>
      </div>

      {visible.length === 0 && (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          No active stock-out warnings.
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {visible.map(alert => (
          <Card key={alert.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{alert.item_name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{alert.distributor_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded border ${SEVERITY_COLOURS[alert.severity]}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <div className="text-right">
                    <p className="text-2xl font-bold leading-none font-mono">{alert.days_of_cover}</p>
                    <p className="text-[10px] text-muted-foreground">days cover</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDismiss(alert.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                Available <span className="font-mono">{alert.available_qty}</span> · suggested transfers:
              </p>
              {alert.suggested_transfers.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No surplus distributor found nearby.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {alert.suggested_transfers.map(t => (
                  <div
                    key={t.from_distributor_id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded border bg-muted/30 text-xs"
                  >
                    <span className="font-medium">{t.from_distributor_name}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-mono">{t.surplus_qty}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{t.note}</span>
                    <Button
                      size="sm"
                      className="h-6 px-2 ml-1 bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => handleAccept(alert, t.from_distributor_name, t.surplus_qty)}
                    >
                      Accept
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default StockOutWarningsPanel;
