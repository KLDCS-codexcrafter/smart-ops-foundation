/**
 * @file        alerts-panels.tsx
 * @purpose     GateFlow alert panels · Vehicle Expiry · Driver Expiry · Gate Dwell (color-coded urgency)
 * @who         Security supervisors · Compliance officers · Dispatch supervisors
 * @when        Phase 1.A.1.a · GateFlow Patterns + Features sprint
 * @sprint      T-Phase-1.A.1.a-GateFlow-Patterns-Features (was T-Phase-1.2.6f-d-2-card4-4-pre-3)
 * @iso         Maintainability · Reliability
 * @decisions   D-314 (3 alerts) · D-NEW · canonical useEntityCode
 * @reuses      useEntityCode · gateflow-engine (read-only)
 * @[JWT]       GET /api/gateflow/alerts/vehicle-expiry · GET /api/gateflow/alerts/driver-expiry · GET /api/gateflow/alerts/gate-dwell
 *
 * Pattern: NO [tick, setTick] + useMemo anti-pattern. Uses [list, setList] + refresh().
 * Urgency RED: < 7 days expiry · OR > 4h dwell (240 min)
 * Urgency AMBER: < 30 days expiry · OR > 2h dwell (120 min)
 */
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarX, UserCheck, Clock, RefreshCw, Truck } from 'lucide-react';
import {
  getExpiringVehicleDocs, type VehicleExpiryAlert, DEFAULT_EXPIRY_WINDOW_DAYS,
} from '@/lib/oob/vehicle-expiry-alerts';
import {
  getExpiringDriverLicenses, type DriverExpiryAlert,
} from '@/lib/oob/driver-expiry-alerts';
import {
  getDwellingGatePasses, type GateDwellAlert, DEFAULT_DWELL_THRESHOLD_MIN,
} from '@/lib/oob/gate-dwell-alerts';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import { useEntityCode } from '@/hooks/useEntityCode';

function expiryBadge(days: number): { label: string; cls: string } {
  if (days < 7) return { label: `${days}d`, cls: 'bg-destructive/15 text-destructive border-destructive/30' };
  if (days < 30) return { label: `${days}d`, cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' };
  return { label: `${days}d`, cls: 'bg-muted text-muted-foreground' };
}

function dwellBadge(min: number): { label: string; cls: string } {
  const label = min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`;
  if (min > 240) return { label, cls: 'bg-destructive/15 text-destructive border-destructive/30' };
  if (min > 120) return { label, cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30' };
  return { label, cls: 'bg-muted text-muted-foreground' };
}

export function VehicleExpiryAlertsPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const ENTITY = entityCode || DEFAULT_ENTITY_SHORTCODE;
  const [list, setList] = useState<VehicleExpiryAlert[]>([]);
  const refresh = useCallback(() => setList(getExpiringVehicleDocs(ENTITY, DEFAULT_EXPIRY_WINDOW_DAYS)), [ENTITY]);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarX className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Vehicle Document Expiry</h2>
          <Badge variant="outline">{list.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-1" />Refresh
        </Button>
      </header>
      <p className="text-xs text-muted-foreground">RC · Insurance · Permit expiring within {DEFAULT_EXPIRY_WINDOW_DAYS} days · sorted most-urgent-first.</p>
      {list.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No vehicle documents expiring soon.</Card>
      ) : (
        <div className="space-y-2">
          {list.map((a) => {
            const b = expiryBadge(a.days_remaining);
            return (
              <Card key={`${a.vehicle_id}-${a.doc_type}`} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="font-mono text-sm truncate">{a.vehicle_no}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.doc_type.toUpperCase()} {a.doc_no ? `· ${a.doc_no}` : ''} · expires <span className="font-mono">{a.expires_on}</span>
                    </div>
                  </div>
                </div>
                <Badge className={b.cls}>{b.label}</Badge>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DriverExpiryAlertsPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const ENTITY = entityCode || DEFAULT_ENTITY_SHORTCODE;
  const [list, setList] = useState<DriverExpiryAlert[]>([]);
  const refresh = useCallback(() => setList(getExpiringDriverLicenses(ENTITY, DEFAULT_EXPIRY_WINDOW_DAYS)), [ENTITY]);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Driver License Expiry</h2>
          <Badge variant="outline">{list.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-1" />Refresh
        </Button>
      </header>
      <p className="text-xs text-muted-foreground">Licenses expiring within {DEFAULT_EXPIRY_WINDOW_DAYS} days · sorted most-urgent-first.</p>
      {list.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No driver licenses expiring soon.</Card>
      ) : (
        <div className="space-y-2">
          {list.map((a) => {
            const b = expiryBadge(a.days_remaining);
            return (
              <Card key={a.driver_id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{a.driver_name}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {a.driver_license_no} · expires {a.expires_on}
                    </div>
                  </div>
                </div>
                <Badge className={b.cls}>{b.label}</Badge>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function GateDwellAlertsPanel(): JSX.Element {
  const { entityCode } = useEntityCode();
  const ENTITY = entityCode || DEFAULT_ENTITY_SHORTCODE;
  const [list, setList] = useState<GateDwellAlert[]>([]);
  const refresh = useCallback(() => setList(getDwellingGatePasses(ENTITY, DEFAULT_DWELL_THRESHOLD_MIN)), [ENTITY]);
  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 30000);
    return () => clearInterval(i);
  }, [refresh]);

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Gate Dwell Alerts</h2>
          <Badge variant="outline">{list.length}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={refresh}>
          <RefreshCw className="h-4 w-4 mr-1" />Refresh
        </Button>
      </header>
      <p className="text-xs text-muted-foreground">
        Open gate passes with dwell &gt; {DEFAULT_DWELL_THRESHOLD_MIN} min · sorted longest-first.
      </p>
      {list.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No vehicles dwelling beyond threshold.</Card>
      ) : (
        <div className="space-y-2">
          {list.map((a) => {
            const b = dwellBadge(a.dwell_minutes);
            return (
              <Card key={a.gate_pass_id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm truncate">
                      <span className="font-mono">{a.vehicle_no}</span> · {a.counterparty_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {a.direction} · {a.status} · <span className="font-mono">{a.gate_pass_no}</span>
                    </div>
                  </div>
                </div>
                <Badge className={b.cls}>{b.label}</Badge>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
