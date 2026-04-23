/**
 * SchemeEffectivenessReport.tsx — Post-scheme analytics
 * Sprint 12. Module id: dh-r-scheme-effect. Violet-500 accent.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sparkles, IndianRupee, ShoppingCart, Percent, BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { schemesKey, appliedSchemesKey, type Scheme, type AppliedScheme } from '@/types/scheme';
import { formatINR } from '@/lib/india-validations';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;

interface AppliedRecord {
  order_id: string;
  order_date: string;
  distributor_id: string;
  order_value_paise: number;
  discount_paise: number;
  applied: AppliedScheme[];
}

function readList<T>(key: string): T[] {
  try {
    // [JWT] GET /api/{key}
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

export function SchemeEffectivenessReportPanel() {
  const schemes = useMemo(() => readList<Scheme>(schemesKey(ENTITY)), []);
  const applied = useMemo(() => readList<AppliedRecord>(appliedSchemesKey(ENTITY)), []);

  const activeCount = schemes.filter(s => s.status === 'active').length;
  const totalDiscount = applied.reduce((t, a) => t + a.discount_paise, 0);
  const ordersTouched = applied.length;
  const avgDiscPct = useMemo(() => {
    if (applied.length === 0) return 0;
    const pcts = applied
      .filter(a => a.order_value_paise > 0)
      .map(a => (a.discount_paise / a.order_value_paise) * 100);
    if (pcts.length === 0) return 0;
    return Math.round(pcts.reduce((t, p) => t + p, 0) / pcts.length * 100) / 100;
  }, [applied]);

  // Per-scheme aggregation
  const perScheme = useMemo(() => {
    const byId = new Map<string, { code: string; name: string; orders: number; discount: number }>();
    for (const rec of applied) {
      for (const a of rec.applied) {
        const cur = byId.get(a.scheme_id) ??
          { code: a.scheme_code, name: a.scheme_name, orders: 0, discount: 0 };
        cur.orders += 1;
        cur.discount += a.discount_paise;
        byId.set(a.scheme_id, cur);
      }
    }
    return Array.from(byId.entries())
      .map(([id, v]) => ({ id, ...v, avgPct: v.orders > 0 ? Math.round((v.discount / v.orders) / 100) / 100 : 0 }))
      .sort((a, b) => b.discount - a.discount);
  }, [applied]);

  // Monthly trend
  const trend = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const r of applied) {
      const key = r.order_date.slice(0, 7); // YYYY-MM
      buckets.set(key, (buckets.get(key) ?? 0) + r.discount_paise);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, val]) => ({ month, discount: val / 100 }));
  }, [applied]);

  const kpis = [
    { label: 'Active Schemes',         value: String(activeCount),  icon: Sparkles },
    { label: 'Total Discount Given',   value: formatINR(totalDiscount), icon: IndianRupee },
    { label: 'Orders Using Schemes',   value: String(ordersTouched), icon: ShoppingCart },
    { label: 'Avg Discount per Order', value: `${avgDiscPct}%`,       icon: Percent },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-violet-500" />
        <div>
          <h2 className="text-xl font-bold">Scheme Effectiveness</h2>
          <p className="text-sm text-muted-foreground">
            Last 90 days · all schemes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  {k.label}
                </p>
                <k.icon className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <p className="text-lg font-bold font-mono">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {applied.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Scheme data starts accumulating from next order. Place a distributor order
            with eligible items to see effectiveness here.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs">
                  <tr>
                    <th className="text-left p-2">Code</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-right p-2">Orders</th>
                    <th className="text-right p-2">Discount Given</th>
                    <th className="text-right p-2">Avg Discount/Order</th>
                  </tr>
                </thead>
                <tbody>
                  {perScheme.map(r => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-2 font-mono text-xs">{r.code}</td>
                      <td className="p-2">{r.name}</td>
                      <td className="p-2 text-right font-mono">{r.orders}</td>
                      <td className="p-2 text-right font-mono">{formatINR(r.discount)}</td>
                      <td className="p-2 text-right font-mono">{formatINR(Math.round(r.discount / r.orders))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">
                Monthly Discount Trend
              </p>
              <div style={{ width: '100%', height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Line type="monotone" dataKey="discount" stroke="hsl(258 90% 66%)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default SchemeEffectivenessReportPanel;
