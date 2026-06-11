/**
 * @file        CrossCardDayBookPage.tsx
 * @sprint      RPT-5a · Cross-Card Day Book Surface
 * @purpose     Command-Center surface that consumes the RPT-3b
 *              getCrossCardDayBook aggregator and renders a unified,
 *              table-first chronological feed across every registered
 *              DayBook source. Filters: domain · card · date range.
 *              Integrity badge via signReport. Honest empty-state on zero rows.
 *
 * Walls: hooks-at-top-level · NO recharts · pure consumption (no engine edits).
 */
import { useMemo, useState } from 'react';
import { ShieldCheck, BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DrillBreadcrumb } from '@/components/registers/DrillBreadcrumb';
import { useDrillDown } from '@/hooks/useDrillDown';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  getCrossCardDayBook,
  type CrossCardDayBookFilter,
} from '@/lib/report-framework/daybook-aggregator';
import { listDayBookSources } from '@/lib/report-framework/daybook-source-registry';
import { signReport } from '@/lib/report-framework/integrity-sign';

function fmtINR(n: number): string {
  if (!Number.isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
  } catch {
    return String(n);
  }
}

function toggle(arr: string[], v: string): string[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function CrossCardDayBookPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const drill = useDrillDown();

  const sources = useMemo(() => listDayBookSources(), []);
  const allDomains = useMemo(
    () => Array.from(new Set(sources.map((s) => s.domain))).sort(),
    [sources],
  );
  const allCards = useMemo(
    () => Array.from(new Set(sources.map((s) => s.cardId))).sort(),
    [sources],
  );

  const [domains, setDomains] = useState<string[]>([]);
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const filter: CrossCardDayBookFilter = useMemo(() => {
    const f: CrossCardDayBookFilter = {};
    if (domains.length > 0) f.domains = domains;
    if (cardIds.length > 0) f.cardIds = cardIds;
    if (from || to) f.dateRange = { from: from || '0000-01-01', to: to || '9999-12-31' };
    return f;
  }, [domains, cardIds, from, to]);

  const entries = useMemo(
    () => getCrossCardDayBook(entityCode, filter),
    [entityCode, filter],
  );

  const integrityHash = useMemo(
    () => signReport(entries as unknown as Record<string, unknown>[]),
    [entries],
  );
  const shortHash = integrityHash.slice(0, 10);

  return (
    <div className="p-6 space-y-4 animate-fade-in" data-page="cross-card-daybook">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Day Book · All Cards
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Chronological cross-card transaction feed
            {entityCode && <> · <span className="font-mono">{entityCode}</span></>}
          </p>
        </div>
        <Badge variant="outline" className="font-mono gap-1" aria-label="Integrity signature">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          {shortHash}
        </Badge>
      </header>

      <DrillBreadcrumb
        rootLabel="Day Book · All Cards"
        trail={drill.trail}
        onGoTo={drill.goTo}
        onReset={drill.reset}
      />

      <Card className="p-3 space-y-3">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground pt-1.5 pr-1">Domain</span>
          {allDomains.length === 0 && (
            <span className="text-xs text-muted-foreground">no registered domains</span>
          )}
          {allDomains.map((d) => {
            const active = domains.includes(d);
            return (
              <Button
                key={`dom-${d}`}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => setDomains((arr) => toggle(arr, d))}
              >
                {d}
              </Button>
            );
          })}
        </div>
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground pt-1.5 pr-1">Card</span>
          {allCards.length === 0 && (
            <span className="text-xs text-muted-foreground">no registered cards</span>
          )}
          {allCards.map((c) => {
            const active = cardIds.includes(c);
            return (
              <Button
                key={`card-${c}`}
                type="button"
                size="sm"
                variant={active ? 'default' : 'outline'}
                onClick={() => setCardIds((arr) => toggle(arr, c))}
              >
                {c}
              </Button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground pr-1">Date range</span>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 w-40"
            aria-label="From date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 w-40"
            aria-label="To date"
          />
          {(domains.length > 0 || cardIds.length > 0 || from || to) && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => { setDomains([]); setCardIds([]); setFrom(''); setTo(''); }}
            >
              Clear
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground font-mono">
            {entries.length} rows
          </span>
        </div>
      </Card>

      {entries.length === 0 ? (
        <Card className="p-10 text-center" data-state="empty">
          <p className="text-sm text-muted-foreground">
            No transactions in this range
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e, idx) => (
                <TableRow
                  key={`${e.module}-${e.id}-${idx}`}
                  className="cursor-pointer"
                  onClick={() => drill.push({
                    id: `${e.module}:${e.id}`,
                    label: `${e.type} · ${e.reference || e.id}`,
                    level: 1,
                    module: e.module,
                    payload: e,
                  })}
                >
                  <TableCell className="font-mono text-xs">{e.date}</TableCell>
                  <TableCell className="font-mono text-xs">{e.time}</TableCell>
                  <TableCell>{e.type}</TableCell>
                  <TableCell className="font-mono text-xs">{e.reference}</TableCell>
                  <TableCell className="truncate max-w-[200px]">{e.party}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{e.module}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{e.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">{fmtINR(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

export default CrossCardDayBookPage;
