/**
 * @file        GroupEliminationsPage.tsx
 * @purpose     Standalone Page #36 — IC Matching + Group Eliminations
 *              register. Surfaces (1) IC matching summary + break taxonomy,
 *              (2) per-E-type (E1–E7) elimination register with drill-down.
 * @reads       intercompany-matching-engine · group-eliminations-engine
 * @sprint      T-Phase-6.C.1.4 · Sprint 108 · Block 5 · 🏁 Arc 2 Capstone
 * @scope-wall  DP-A2-9 · ENTRIES only. NO consolidated P&L / BS / CF.
 *
 * NOT A SIBLING — this is a First-Class Standalone Page that READS the
 * two new sibling engines via their published API.
 */
import { useMemo, useState } from 'react';
import { ScaleIcon, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  runICMatching,
  getMatchBreaks,
  getMatchSummary,
  type ICMatchResult,
  type ICMatchSummary,
} from '@/lib/intercompany-matching-engine';
import {
  ELIMINATION_TYPES,
  generateEliminationsByType,
  getEliminationSummary,
  type EliminationEntry,
  type EliminationType,
} from '@/lib/group-eliminations-engine';

const fmtINR = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const E_LABELS: Record<EliminationType, string> = {
  E1_ic_sales_purchases: 'E1 · IC Sales / Purchases',
  E2_ic_balances: 'E2 · IC Balances',
  E3_unrealized_profit_inventory: 'E3 · Unrealized Profit · Inventory',
  E4_ic_dividends: 'E4 · IC Dividends',
  E5_ic_loans_interest: 'E5 · IC Loans & Interest',
  E6_investment_vs_equity: 'E6 · Investment vs Equity',
  E7_unrealized_profit_fixed_assets: 'E7 · Unrealized Profit · Fixed Assets',
};

function defaultFy(): string {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

export default function GroupEliminationsPage() {
  const [fy, setFy] = useState<string>(defaultFy());
  const [tick, setTick] = useState(0);
  const [selectedType, setSelectedType] = useState<EliminationType | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- tick is intentional refresh trigger
  useMemo<ICMatchResult[]>(() => runICMatching(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- tick is intentional refresh trigger
  const matchSummary = useMemo<ICMatchSummary>(() => getMatchSummary(), [tick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- tick is intentional refresh trigger
  const breaks = useMemo<ICMatchResult[]>(() => getMatchBreaks(), [tick]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- tick is intentional refresh trigger
  const elimSummary = useMemo(() => getEliminationSummary(fy), [fy, tick]);

  const drillEntries = useMemo<EliminationEntry[]>(() => {
    if (!selectedType) return [];
    return generateEliminationsByType({ fy, type: selectedType });
  }, [fy, selectedType]);

  const refresh = () => setTick((t) => t + 1);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ScaleIcon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Group Eliminations & IC Matching</h1>
            <p className="text-sm text-muted-foreground">
              Sprint 108 · 🏁 Arc 2 Capstone · 7-type E1–E7 entries · scope wall: entries only.
            </p>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <Label htmlFor="fy" className="text-xs">Financial Year</Label>
            <Input
              id="fy"
              className="w-32 font-mono"
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              placeholder="2026-27"
            />
          </div>
          <Button onClick={refresh} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </header>

      {/* Matching summary */}
      <Card className="glass-card rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" /> IC Matching Summary
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <SummaryStat label="Total IC Txns" value={String(matchSummary.total)} />
            <SummaryStat label="Matched" value={String(matchSummary.matched)} tone="success" />
            <SummaryStat label="Breaks" value={String(matchSummary.breaks)} tone="destructive" />
            <SummaryStat label="Match Rate" value={`${matchSummary.match_rate_pct}%`} tone="primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Breaks ({breaks.length})
            </h3>
            {breaks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No breaks detected — all posted IC transactions reconcile across reciprocal vouchers.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IC Txn</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>From → To</TableHead>
                    <TableHead className="text-right font-mono">From Amt</TableHead>
                    <TableHead className="text-right font-mono">To Amt</TableHead>
                    <TableHead className="text-right font-mono">Variance</TableHead>
                    <TableHead>Break Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breaks.map((b) => (
                    <TableRow key={b.ic_txn_id}>
                      <TableCell className="font-mono text-xs">{b.ic_txn_id}</TableCell>
                      <TableCell>{b.txn_type}</TableCell>
                      <TableCell className="text-xs">{b.from_entity} → {b.to_entity}</TableCell>
                      <TableCell className="text-right font-mono">{fmtINR(b.amount_from)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtINR(b.amount_to)}</TableCell>
                      <TableCell className="text-right font-mono">{fmtINR(b.variance)}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{b.break_reason}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Eliminations register */}
      <Card className="glass-card rounded-2xl">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-lg font-semibold">Eliminations Register · FY {fy}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right font-mono">Total</TableHead>
                <TableHead className="text-right">Drill</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {elimSummary.map((row) => (
                <TableRow key={row.type}>
                  <TableCell className="font-mono text-xs">{row.type}</TableCell>
                  <TableCell>{E_LABELS[row.type]}</TableCell>
                  <TableCell className="text-right">{row.count}</TableCell>
                  <TableCell className="text-right font-mono">{fmtINR(row.total)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={selectedType === row.type ? 'default' : 'outline'}
                      onClick={() => setSelectedType(row.type)}
                      disabled={row.count === 0}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {selectedType && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">
                {E_LABELS[selectedType]} · {drillEntries.length} entries
              </h3>
              {drillEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Zero-source category for FY {fy} — no fabrication (FR-91 · §L-noted).
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Elim ID</TableHead>
                      <TableHead>From → To</TableHead>
                      <TableHead>Dr / Cr</TableHead>
                      <TableHead className="text-right font-mono">Amount</TableHead>
                      <TableHead className="text-right font-mono">Minority</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drillEntries.map((e) => (
                      <TableRow key={e.elimination_id}>
                        <TableCell className="font-mono text-xs">{e.elimination_id.slice(0, 24)}…</TableCell>
                        <TableCell className="text-xs">{e.from_entity} → {e.to_entity}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {e.debit_account} / {e.credit_account}
                        </TableCell>
                        <TableCell className="text-right font-mono">{fmtINR(e.amount)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {e.minority_share !== undefined ? fmtINR(e.minority_share) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.note}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        ELIMINATION_TYPES locked at {ELIMINATION_TYPES.length} (E1–E7) · scope wall DP-A2-9
        upheld: this page surfaces elimination ENTRIES only — consolidated P&L / Balance-Sheet /
        Cash-Flow, NCI rollup, Goodwill, and multi-currency translation are Arc 3 (S109–S112).
      </p>
    </div>
  );
}

interface SummaryStatProps {
  label: string;
  value: string;
  tone?: 'success' | 'destructive' | 'primary';
}
function SummaryStat({ label, value, tone }: SummaryStatProps) {
  const toneClass =
    tone === 'success' ? 'text-success'
    : tone === 'destructive' ? 'text-destructive'
    : tone === 'primary' ? 'text-primary'
    : 'text-foreground';
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-mono font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
