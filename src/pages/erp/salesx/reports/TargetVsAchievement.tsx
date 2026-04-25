/**
 * TargetVsAchievement.tsx — Target vs Achievement report (Sprint 4)
 * Read-only. Reads targets + 4 actuals sources (vouchers, receipts, customers, orders).
 * [JWT] GET /api/salesx/targets, /api/accounting/vouchers
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import { targetsKey } from '@/pages/erp/salesx/masters/TargetMaster.types';
import type { SalesTarget } from '@/pages/erp/salesx/masters/TargetMaster.types';
import { vouchersKey } from '@/lib/finecore-engine';
import type { Voucher } from '@/types/voucher';
import { cn } from '@/lib/utils';

interface Props { entityCode: string }

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

function loadTargets(e: string): SalesTarget[] {
  try {
    // [JWT] GET /api/salesx/targets
    return JSON.parse(localStorage.getItem(targetsKey(e)) || '[]');
  } catch { return []; }
}
function loadVouchers(e: string): Voucher[] {
  try {
    // [JWT] GET /api/accounting/vouchers
    return JSON.parse(localStorage.getItem(vouchersKey(e)) || '[]');
  } catch { return []; }
}

interface Row {
  target: SalesTarget;
  actual: number;
  pct: number;
  status: 'Achieved' | 'On Track' | 'At Risk' | 'Missed';
}

function computeStatus(pct: number): Row['status'] {
  if (pct >= 100) return 'Achieved';
  if (pct >= 75) return 'On Track';
  if (pct >= 50) return 'At Risk';
  return 'Missed';
}

const STATUS_COLOR: Record<Row['status'], string> = {
  Achieved: 'bg-success/15 text-success border-success/30',
  'On Track': 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'At Risk': 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  Missed: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function TargetVsAchievementPanel({ entityCode }: Props) {
  const [search, setSearch] = useState('');

  const rows = useMemo<Row[]>(() => {
    const targets = loadTargets(entityCode).filter(t => t.is_active);
    const vouchers = loadVouchers(entityCode);

    return targets.map(t => {
      let actual = 0;
      if (t.dimension === 'sales_value') {
        actual = vouchers
          .filter(v => v.base_voucher_type === 'Sales' && v.status === 'posted')
          .reduce((s, v) => s + (v.net_amount ?? 0), 0);
      } else if (t.dimension === 'collection') {
        actual = vouchers
          .filter(v => v.base_voucher_type === 'Receipt' && v.status === 'posted')
          .reduce((s, v) => s + (v.net_amount ?? 0), 0);
      } else if (t.dimension === 'new_customers') {
        const customers = new Set(
          vouchers
            .filter(v => v.base_voucher_type === 'Sales')
            .map(v => v.party_name),
        );
        actual = customers.size;
      } else if (t.dimension === 'order_volume') {
        actual = vouchers.filter(v => v.base_voucher_type === 'Sales' && v.status === 'posted').length;
      }
      const pct = t.target_value > 0 ? +(actual / t.target_value * 100).toFixed(2) : 0;
      return { target: t, actual, pct, status: computeStatus(pct) };
    });
  }, [entityCode]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(r =>
      (r.target.person_name ?? 'company').toLowerCase().includes(q) ||
      r.target.period_label.toLowerCase().includes(q) ||
      r.target.dimension.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const summary = useMemo(() => {
    const totalTarget = filtered.reduce((s, r) => s + r.target.target_value, 0);
    const totalActual = filtered.reduce((s, r) => s + r.actual, 0);
    const totalPct = totalTarget > 0 ? +(totalActual / totalTarget * 100).toFixed(2) : 0;
    return { totalTarget, totalActual, totalPct };
  }, [filtered]);

  return (
    <div className="space-y-4" data-keyboard-form>
      <div>
        <h1 className="text-2xl font-bold">Target vs Achievement</h1>
        <p className="text-sm text-muted-foreground">Live progress against active sales targets</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Target</p>
            <p className="text-lg font-bold font-mono mt-1">₹{inrFmt.format(summary.totalTarget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Achieved</p>
            <p className="text-lg font-bold font-mono mt-1">₹{inrFmt.format(summary.totalActual)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overall %</p>
            <p className="text-lg font-bold font-mono mt-1">{summary.totalPct}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={onEnterNext}
              placeholder="Search person / period / dimension"
              className="pl-9"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground text-sm">
              No active targets found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Person</TableHead>
                  <TableHead className="text-xs">Period</TableHead>
                  <TableHead className="text-xs">Dimension</TableHead>
                  <TableHead className="text-xs text-right">Target</TableHead>
                  <TableHead className="text-xs text-right">Actual</TableHead>
                  <TableHead className="text-xs">Progress</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.target.id}>
                    <TableCell className="text-xs capitalize">{r.target.target_type}</TableCell>
                    <TableCell className="text-xs">{r.target.person_name ?? 'Company'}</TableCell>
                    <TableCell className="text-xs">{r.target.period_label}</TableCell>
                    <TableCell className="text-xs capitalize">{r.target.dimension.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{inrFmt.format(r.target.target_value)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{inrFmt.format(r.actual)}</TableCell>
                    <TableCell className="w-40">
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(r.pct, 100)} className="h-2" />
                        <span className="text-[10px] font-mono">{r.pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]', STATUS_COLOR[r.status])}>
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function TargetVsAchievement(props: Props) { return <TargetVsAchievementPanel {...props} />; }
