/**
 * @file        MultiCurrencyTranslationPage.tsx
 * @purpose     Standalone Page #38 — Ind AS 21 Multi-Currency Translation viewer.
 *              FY + foreign-entity selector · rate-set (closing/average/historical) display ·
 *              translated TB (per-line rate_type + INR) · FCTR (OCI) · balanced indicator.
 * @reads       fx-translation-engine (getFunctionalCurrency · getFXRateSet ·
 *              translateForeignEntity · listTranslations)
 * @sprint      T-Phase-6.C.2.2 · Sprint 110 · Arc 3 · Block 5
 * @scope-wall  DP-A3-9 · translation only · NO BS/CF/NCI/Goodwill/disclosure/scenario
 * NOT A SIBLING — First-Class Standalone Page that READS the engine via its published API.
 */
import { useMemo, useState } from 'react';
import { Globe, CheckCircle2, AlertTriangle, RefreshCw, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  getFunctionalCurrency,
  getFXRateSet,
  translateForeignEntity,
  listTranslations,
} from '@/lib/fx-translation-engine';
import { loadEntities } from '@/data/mock-entities';

const fmtINR = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function defaultFy(): string {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

export default function MultiCurrencyTranslationPage() {
  const entities = useMemo(() => loadEntities(), []);
  const [fy, setFy] = useState<string>(defaultFy());
  const [entityId, setEntityId] = useState<string>(entities[0]?.id ?? '');
  const [, setTick] = useState(0);
  const refresh = () => setTick((t) => t + 1);

  const fromCurrency = useMemo(() => entityId ? getFunctionalCurrency(entityId) : 'INR', [entityId]);
  const rateSet = useMemo(() => getFXRateSet({ fy, from_currency: fromCurrency }), [fy, fromCurrency]);
  const runs = useMemo(() => listTranslations(fy), [fy]);
  const current = useMemo(() => runs.find((r) => r.entity_id === entityId) ?? null, [runs, entityId]);

  const runNow = () => {
    if (!entityId) return;
    translateForeignEntity({ entity_id: entityId, fy });
    refresh();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Multi-Currency Translation</h1>
            <p className="text-sm text-muted-foreground">
              Sprint 110 · Arc 3 · Ind AS 21 · Current Rate method · closing → BS, average → P&amp;L, historical → equity · FCTR → OCI.
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label htmlFor="fy" className="text-xs">Financial Year</Label>
            <Input id="fy" value={fy} onChange={(e) => setFy(e.target.value)}
              className="h-9 w-32 font-mono" placeholder="2026-27" />
          </div>
          <div>
            <Label htmlFor="ent" className="text-xs">Entity</Label>
            <select id="ent" value={entityId} onChange={(e) => setEntityId(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm">
              {entities.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.shortCode})</option>
              ))}
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-1" />Refresh
          </Button>
          <Button size="sm" onClick={runNow}>
            <Play className="h-4 w-4 mr-1" />Translate
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Functional Currency</div>
          <div className="text-2xl font-mono">{fromCurrency}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Closing Rate</div>
          <div className="text-2xl font-mono">{rateSet.closing_rate.toFixed(4)}</div>
          <div className="text-[10px] text-muted-foreground">{rateSet.source.closing}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Average Rate (P&amp;L)</div>
          <div className="text-2xl font-mono">{rateSet.average_rate.toFixed(4)}</div>
          <div className="text-[10px] text-muted-foreground">{rateSet.source.average}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Historical Rate (Equity)</div>
          <div className="text-2xl font-mono">{rateSet.historical_rate.toFixed(4)}</div>
          <div className="text-[10px] text-muted-foreground">{rateSet.source.historical}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Translated Trial Balance</h2>
            {current ? (
              current.balanced_pre_fctr ? (
                <Badge variant="default" className="bg-success/15 text-success">
                  <CheckCircle2 className="h-3 w-3 mr-1" />Balanced pre-FCTR
                </Badge>
              ) : (
                <Badge variant="outline">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  FCTR (OCI): {fmtINR(current.fctr_amount)}
                </Badge>
              )
            ) : null}
          </div>
          {!current ? (
            <p className="text-sm text-muted-foreground">
              No translation run yet for this entity/FY. Click <span className="font-medium">Translate</span> to run.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ledger Group</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Rate Type</TableHead>
                  <TableHead className="text-right">INR Debit</TableHead>
                  <TableHead className="text-right">INR Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.lines.map((l) => (
                  <TableRow key={l.ledger_group_code}>
                    <TableCell className="font-mono text-xs">{l.ledger_group_code}</TableCell>
                    <TableCell><Badge variant="outline" className="uppercase">{l.classification}</Badge></TableCell>
                    <TableCell className="font-mono">{l.rate_applied.toFixed(4)}</TableCell>
                    <TableCell><Badge variant="outline" className="uppercase">{l.rate_type}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{fmtINR(l.inr_debit)}</TableCell>
                    <TableCell className="text-right font-mono">{fmtINR(l.inr_credit)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={4}>FCTR (OCI) residual</TableCell>
                  <TableCell colSpan={2} className="text-right font-mono">{fmtINR(current.fctr_amount)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
