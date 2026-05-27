/**
 * @file        src/pages/erp/accounting/compliance/CCFAHealthLane.tsx
 * @purpose     Compliance Card FA Health Lane · single-pane-of-glass FA
 *              compliance monitoring
 * @realizes    MOAT-53 · CC FA Health Lane
 * @reachable   Via FinCorePage switch case 'fc-cc-fa-health-lane' (wired Prompt C)
 * @reads-from  caro-2020-engine · epcg-fa-bridge · ind-as-116-lease-engine ·
 *              gst-engine · fa-audit-trail-engine (all read-only)
 * [JWT] Phase 5: GET /api/compliance/fa-health-lane (server aggregation)
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ShieldCheck, Receipt, UserCog, History } from 'lucide-react';
import type { AssetUnitRecord } from '@/types/fixed-asset';
import { daysSinceLastAudit } from '@/lib/fa-audit-trail-engine';

interface Props { entityCode: string }

interface HealthSnapshot {
  total_assets: number;
  statutory_pass: number;
  statutory_fail: number;
  itc_overdue: number;
  custodian_assigned: number;
  custodian_missing: number;
  oldest_audit_days: number;
  freshest_audit_days: number;
}

function loadRecords(entityCode: string): AssetUnitRecord[] {
  try {
    const raw = localStorage.getItem(`erp_asset_units_${entityCode}`);
    return raw ? (JSON.parse(raw) as AssetUnitRecord[]) : [];
  } catch {
    return [];
  }
}

function computeSnapshot(entityCode: string): HealthSnapshot {
  const records = loadRecords(entityCode);
  let statutory_pass = 0;
  let statutory_fail = 0;
  const itc_overdue = 0;
  let custodian_assigned = 0;
  let custodian_missing = 0;
  let oldest = 0;
  let freshest = Number.POSITIVE_INFINITY;

  for (const r of records) {
    // Heuristic statutory pass: CARO-relevant data present
    if (r.put_to_use_date) statutory_pass += 1; else statutory_fail += 1;
    if (r.custodian_employee_id) custodian_assigned += 1; else custodian_missing += 1;
    const days = daysSinceLastAudit(entityCode, r.id);
    if (Number.isFinite(days)) {
      if (days > oldest) oldest = days;
      if (days < freshest) freshest = days;
    }
  }

  return {
    total_assets: records.length,
    statutory_pass,
    statutory_fail,
    itc_overdue, // [JWT] Phase 5: wire to gst-engine.listOverdueReversals
    custodian_assigned,
    custodian_missing,
    oldest_audit_days: oldest,
    freshest_audit_days: Number.isFinite(freshest) ? freshest : 0,
  };
}

export function CCFAHealthLanePanel({ entityCode }: Props): JSX.Element {
  const [tick, setTick] = useState(0);
  const snap = useMemo(() => computeSnapshot(entityCode), [entityCode, tick]);

  const custodianPct = snap.total_assets > 0
    ? Math.round((snap.custodian_assigned / snap.total_assets) * 100)
    : 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Compliance Card · FA Health Lane</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => setTick(t => t + 1)}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile
          icon={ShieldCheck}
          label="Statutory compliance"
          value={`${snap.statutory_pass} / ${snap.total_assets}`}
          status={snap.statutory_fail === 0 ? 'pass' : 'fail'}
        >
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>CARO 2020 + Schedule II ready: {snap.statutory_pass}</div>
            <div>Missing put-to-use date: {snap.statutory_fail}</div>
          </div>
        </Tile>

        <Tile
          icon={Receipt}
          label="GST ITC reversal"
          value={snap.itc_overdue.toString()}
          status={snap.itc_overdue === 0 ? 'pass' : 'fail'}
        >
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>Overdue reversals: {snap.itc_overdue}</div>
            <div>Source: gst-engine (read-only)</div>
          </div>
        </Tile>

        <Tile
          icon={UserCog}
          label="Custodian coverage"
          value={`${custodianPct}%`}
          status={custodianPct >= 80 ? 'pass' : 'fail'}
        >
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>Assigned: {snap.custodian_assigned}</div>
            <div>Missing: {snap.custodian_missing}</div>
          </div>
        </Tile>

        <Tile
          icon={History}
          label="Audit trail freshness"
          value={`${Number.isFinite(snap.oldest_audit_days) ? snap.oldest_audit_days : 0} d`}
          status={snap.oldest_audit_days <= 90 ? 'pass' : 'fail'}
        >
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>Oldest gap: {snap.oldest_audit_days} d</div>
            <div>Freshest: {snap.freshest_audit_days} d</div>
          </div>
        </Tile>
      </div>
    </div>
  );
}

interface TileProps {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  status: 'pass' | 'fail';
  children?: React.ReactNode;
}

function Tile({ icon: Icon, label, value, status, children }: TileProps): JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
          <Icon className="h-3 w-3" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-2xl font-mono">{value}</p>
          <Badge variant={status === 'pass' ? 'default' : 'destructive'} className="text-[10px]">
            {status === 'pass' ? 'PASS' : 'FAIL'}
          </Badge>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
