/**
 * @file        GroupConsolidationPage.tsx
 * @purpose     Standalone Page #37 — Group Consolidation viewer.
 *              FY selector · per-entity method/ownership table ·
 *              Consolidated Trial Balance (with balanced indicator) ·
 *              Consolidated P&L · eliminations-applied count.
 * @reads       group-consolidation-engine (consolidate · buildConsolidatedPnL ·
 *              getConsolidationSummary)
 * @sprint      T-Phase-6.C.2.1 · Sprint 109 · 🎬 Arc 3 Opener · Block 5
 * @scope-wall  DP-A3-9 · P&L + TB only · NO BS/CF/NCI/Goodwill/FX/disclosure
 *
 * NOT A SIBLING — First-Class Standalone Page that READS the
 * group-consolidation-engine via its published API. No dead UI.
 */
import { useMemo, useState } from 'react';
import { CalculatorIcon, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  consolidate,
  buildConsolidatedPnL,
  getConsolidationSummary,
} from '@/lib/group-consolidation-engine';

const fmtINR = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function defaultFy(): string {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

export default function GroupConsolidationPage() {
  const [fy, setFy] = useState<string>(defaultFy());
  const [tick, setTick] = useState(0);

  const tb = useMemo(() => consolidate({ fy }), [fy]);
  const pnl = useMemo(() => buildConsolidatedPnL({ fy }), [fy]);
  const summary = useMemo(() => getConsolidationSummary(fy), [fy]);
  void tick;

  const refresh = () => setTick((t) => t + 1);

  const totalDr = tb.lines.reduce((s, l) => s + l.debit, 0);
  const totalCr = tb.lines.reduce((s, l) => s + l.credit, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalculatorIcon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Group Consolidation</h1>
            <p className="text-sm text-muted-foreground">
              Sprint 109 · 🎬 Arc 3 Opener · Consolidated P&amp;L + Trial Balance · 3 methods · post-eliminations.
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="fy" className="text-xs">Financial Year</Label>
            <Input
              id="fy"
              value={fy}
              onChange={(e) => setFy(e.target.value)}
              className="h-9 w-32 font-mono"
              placeholder="2026-27"
            />
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1" />Refresh
          </Button>
        </div>
      </header>

      {/* KPI strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Entities consolidated</div>
          <div className="text-2xl font-mono">{tb.entity_count}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">TB lines</div>
          <div className="text-2xl font-mono">{tb.lines.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Eliminations applied</div>
          <div className="text-2xl font-mono">{tb.eliminations_applied}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Trial Balance</div>
          <div className="flex items-center gap-2 mt-1">
            {tb.balanced ? (
              <Badge variant="default" className="bg-success/15 text-success">
                <CheckCircle2 className="h-3 w-3 mr-1" />Balanced
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />Unbalanced
              </Badge>
            )}
          </div>
        </CardContent></Card>
      </div>

      {/* Per-entity contribution */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Per-Entity Method &amp; Contribution</h2>
          {summary.length === 0 ? (
            <p className="text-sm text-muted-foreground">No group structure rows yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity ID</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Contribution (P&amp;L net)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((row) => (
                  <TableRow key={row.entity_id}>
                    <TableCell className="font-mono text-xs">{row.entity_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono uppercase">{row.method}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{fmtINR(row.contribution)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Consolidated P&L */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Consolidated Profit &amp; Loss</h2>
          <Table>
            <TableBody>
              <TableRow><TableCell>Revenue from Operations</TableCell><TableCell className="text-right font-mono">{fmtINR(pnl.revenue)}</TableCell></TableRow>
              <TableRow><TableCell>Cost of Goods Sold</TableCell><TableCell className="text-right font-mono">({fmtINR(pnl.cogs)})</TableCell></TableRow>
              <TableRow className="bg-muted/30 font-semibold"><TableCell>Gross Profit</TableCell><TableCell className="text-right font-mono">{fmtINR(pnl.gross_profit)}</TableCell></TableRow>
              <TableRow><TableCell>Operating &amp; Finance Expenses + Depreciation</TableCell><TableCell className="text-right font-mono">({fmtINR(pnl.expenses)})</TableCell></TableRow>
              <TableRow className="bg-muted/30 font-semibold"><TableCell>Operating Profit</TableCell><TableCell className="text-right font-mono">{fmtINR(pnl.operating_profit)}</TableCell></TableRow>
              <TableRow><TableCell>Other Income</TableCell><TableCell className="text-right font-mono">{fmtINR(pnl.other_income)}</TableCell></TableRow>
              <TableRow className="bg-primary/10 font-semibold"><TableCell>Profit Before Tax</TableCell><TableCell className="text-right font-mono">{fmtINR(pnl.profit_before_tax)}</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Consolidated Trial Balance */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Consolidated Trial Balance · post-elimination</h2>
          {tb.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No voucher activity in the selected FY.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ledger Group</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tb.lines.map((l) => (
                  <TableRow key={l.ledger_group_code}>
                    <TableCell className="font-mono text-xs">{l.ledger_group_code}</TableCell>
                    <TableCell><Badge variant="outline" className="uppercase">{l.classification}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{fmtINR(l.debit)}</TableCell>
                    <TableCell className="text-right font-mono">{fmtINR(l.credit)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={2}>Totals</TableCell>
                  <TableCell className="text-right font-mono">{fmtINR(totalDr)}</TableCell>
                  <TableCell className="text-right font-mono">{fmtINR(totalCr)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
