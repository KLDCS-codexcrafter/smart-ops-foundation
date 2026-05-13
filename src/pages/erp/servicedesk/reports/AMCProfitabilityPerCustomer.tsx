/**
 * @file        src/pages/erp/servicedesk/reports/AMCProfitabilityPerCustomer.tsx
 * @purpose     C.1e · Carry-forward UI from C.1d T2 · per-AMC margin pill
 * @sprint      T-Phase-1.C.1e · Block D
 * @iso         Functional Suitability + Usability
 */
import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  computeAMCProfitability,
  getAMCsByLifecycleStage,
} from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

function inrFromPaise(p: number): string {
  return `₹${(p / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

interface ProfitRow {
  amc_id: string;
  amc_code: string;
  customer_id: string;
  oem: string;
  revenue_paise: number;
  cost_paise: number;
  margin_paise: number;
  margin_pct: number;
}

interface AMCRecordLite {
  id: string;
  amc_code: string;
  customer_id: string;
  oem_name: string;
}

export function AMCProfitabilityPerCustomer({ customerId }: { customerId?: string } = {}): JSX.Element {
  const rows = useMemo<ProfitRow[]>(() => {
    const stages = ['active', 'service_delivery', 'renewal_window'] as const;
    const all: AMCRecordLite[] = [];
    for (const s of stages) {
      for (const a of getAMCsByLifecycleStage(s, ENTITY)) {
        if (customerId && a.customer_id !== customerId) continue;
        all.push({ id: a.id, amc_code: a.amc_code, customer_id: a.customer_id, oem_name: a.oem_name });
      }
    }
    return all
      .map((a) => {
        const p = computeAMCProfitability(a.id, ENTITY);
        if (!p) return null;
        return {
          amc_id: a.id,
          amc_code: a.amc_code,
          customer_id: a.customer_id,
          oem: a.oem_name,
          revenue_paise: p.revenue_paise,
          cost_paise: p.cost_paise,
          margin_paise: p.margin_paise,
          margin_pct: p.margin_pct,
        };
      })
      .filter((x): x is ProfitRow => x !== null)
      .sort((a, b) => a.margin_paise - b.margin_paise);
  }, [customerId]);

  const totalMargin = rows.reduce((s, r) => s + r.margin_paise, 0);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">AMC Profitability · Per Customer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {rows.length} active AMCs · Portfolio margin <span className="font-mono">{inrFromPaise(totalMargin)}</span>
        </p>
      </div>

      {rows.length === 0 ? (
        <Card className="glass-card p-12 text-center text-muted-foreground">No active AMCs</Card>
      ) : (
        <Card className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-left">
                <th className="p-3 font-medium">AMC</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">OEM</th>
                <th className="p-3 font-medium text-right">Revenue</th>
                <th className="p-3 font-medium text-right">Cost</th>
                <th className="p-3 font-medium text-right">Margin</th>
                <th className="p-3 font-medium text-right">Margin %</th>
                <th className="p-3 font-medium">Health</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const variant: 'default' | 'secondary' | 'destructive' =
                  r.margin_pct > 10 ? 'default' : r.margin_pct >= 0 ? 'secondary' : 'destructive';
                const label = r.margin_pct > 10 ? 'Healthy' : r.margin_pct >= 0 ? 'Thin' : 'Loss';
                return (
                  <tr key={r.amc_id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{r.amc_code}</td>
                    <td className="p-3 font-mono text-xs">{r.customer_id}</td>
                    <td className="p-3 text-xs">{r.oem}</td>
                    <td className="p-3 text-right font-mono">{inrFromPaise(r.revenue_paise)}</td>
                    <td className="p-3 text-right font-mono">{inrFromPaise(r.cost_paise)}</td>
                    <td className="p-3 text-right font-mono">{inrFromPaise(r.margin_paise)}</td>
                    <td className="p-3 text-right font-mono">{r.margin_pct}%</td>
                    <td className="p-3"><Badge variant={variant}>{label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
