/**
 * SchemeSimulator.tsx — Dry-run scheme across distributor base
 * Sprint 12. Module id: dh-t-scheme-simulator. Violet-500 accent.
 */

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { FlaskConical, Users, TrendingDown, Percent } from 'lucide-react';
import { schemesKey, type Scheme } from '@/types/scheme';
import { distributorsKey } from '@/types/distributor';
import type { Distributor } from '@/types/distributor';
import { distributorOrdersKey } from '@/types/distributor-order';
import type { DistributorOrder } from '@/types/distributor-order';
import { simulateSchemeImpact } from '@/lib/scheme-impact-engine';
import { formatINR } from '@/lib/india-validations';

const ENTITY = 'SMRT';

function readList<T>(key: string): T[] {
  try {
    // [JWT] GET /api/{key}
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

export function SchemeSimulatorPanel() {
  const [selectedId, setSelectedId] = useState<string>('');

  const schemes = useMemo(() => readList<Scheme>(schemesKey(ENTITY)), []);
  const distributors = useMemo(() => readList<Distributor>(distributorsKey(ENTITY)), []);
  const orders = useMemo(() => readList<DistributorOrder>(distributorOrdersKey(ENTITY)), []);

  const summary = useMemo(() => {
    const scheme = schemes.find(s => s.id === selectedId);
    if (!scheme) return null;
    return simulateSchemeImpact(scheme, distributors, orders);
  }, [selectedId, schemes, distributors, orders]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-violet-500" />
        <div>
          <h2 className="text-xl font-bold">Scheme Simulator</h2>
          <p className="text-sm text-muted-foreground">
            Dry-run a scheme against your distributor base — see projected cost &amp; impact.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <label className="text-xs font-semibold uppercase text-muted-foreground block mb-2">
            Select scheme
          </label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Choose a scheme to simulate" />
            </SelectTrigger>
            <SelectContent>
              {schemes.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.code} — {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Eligible</span>
                  <Users className="h-3.5 w-3.5 text-violet-500" />
                </div>
                <p className="text-2xl font-bold mt-1">
                  {summary.eligible_count} / {distributors.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Projected cost</span>
                  <TrendingDown className="h-3.5 w-3.5 text-violet-500" />
                </div>
                <p className="text-2xl font-bold mt-1 text-destructive font-mono">
                  {formatINR(summary.total_discount_paise)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Avg impact</span>
                  <Percent className="h-3.5 w-3.5 text-violet-500" />
                </div>
                <p className="text-2xl font-bold mt-1">{summary.avg_impact_pct}%</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs">
                  <tr>
                    <th className="text-left p-2">Distributor</th>
                    <th className="text-center p-2">Tier</th>
                    <th className="text-right p-2">Recent value</th>
                    <th className="text-right p-2">Projected discount</th>
                    <th className="text-right p-2">Impact %</th>
                    <th className="text-left p-2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map(r => (
                    <tr key={r.distributor_id} className="border-t border-border">
                      <td className="p-2">{r.distributor_name}</td>
                      <td className="p-2 text-center capitalize">{r.tier}</td>
                      <td className="p-2 text-right font-mono">{formatINR(r.recent_order_value_paise)}</td>
                      <td className="p-2 text-right font-mono">
                        {r.eligible ? formatINR(r.projected_discount_paise) : '—'}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {r.eligible ? `${r.projected_impact_pct}%` : '—'}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {!summary && schemes.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No schemes yet. Create one from Command Center → Sales Masters → Sales Schemes.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SchemeSimulatorPanel;
