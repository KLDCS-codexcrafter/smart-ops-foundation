/**
 * @file        src/features/insightx-report-viewer/ReportViewerPage.tsx
 * @page        First-Class Standalone Page #58 · Report Viewer.
 * @sprint      Sprint 131 · T-Phase-7.D.3.2 · Arc D.3 · the founder's report-dropdown +
 *              IN-SESSION view-config (table/chart toggle · chart-type · sort · column
 *              show/hide · group-by · filters).
 * @decisions   View-config is React state ONLY · §O NO localStorage / sessionStorage /
 *              storage API. Resets on reload. NO save · NO share · NO schedule —
 *              that's Phase 8 (DP-D3-8). Reads insightx-aggregator-engine for data.
 *              NOT a sibling. Registered as InsightXModule 'ix-viewer'.
 */
import React, { useMemo, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  BarChart3, Table as TableIcon, FileBarChart,
} from 'lucide-react';
import {
  INSIGHT_LENSES,
  getScenarioRegistry,
  aggregateInsight,
  type InsightLens,
} from '@/lib/insightx-aggregator-engine';

const LENS_LABELS: Record<InsightLens, string> = {
  cfo_finance:      'CFO / Finance',
  operations_plant: 'Operations / Plant',
  maintenance:      'Maintenance',
  compliance_grc:   'Compliance / GRC',
  esg:              'ESG',
  hr:               'HR',
  procurement:      'Procurement',
  insurance_risk:   'Insurance / Risk',
  cross_card:       'Cross-Card',
  ai_predictive:    'AI / Predictive',
  differentiation:  'Differentiation',
};

type ViewMode = 'table' | 'chart';
type SortDir  = 'asc' | 'desc';
type ColumnId = 'scenario_id' | 'lens' | 'value' | 'source_ref';

const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: 'scenario_id', label: 'Scenario' },
  { id: 'lens',        label: 'Lens' },
  { id: 'value',       label: 'Value' },
  { id: 'source_ref',  label: 'Source' },
];

export default function ReportViewerPage(): JSX.Element {
  const registry = useMemo(() => getScenarioRegistry(), []);

  // ── IN-SESSION VIEW STATE (§O · React state ONLY · NO storage API) ────────
  const [selectedId, setSelectedId] = useState<string>(registry[0]?.scenario_id ?? '');
  const [view, setView]             = useState<ViewMode>('table');
  const [sortDir, setSortDir]       = useState<SortDir>('asc');
  const [groupBy, setGroupBy]       = useState<'lens' | 'none'>('lens');
  const [lensFilter, setLensFilter] = useState<InsightLens | 'all'>('all');
  const [visibleCols, setVisibleCols] = useState<Record<ColumnId, boolean>>({
    scenario_id: true, lens: true, value: true, source_ref: true,
  });

  // Rows: registry filtered + sorted in-memory.
  const rows = useMemo(() => {
    const filtered = lensFilter === 'all'
      ? registry
      : registry.filter((e) => e.lens === lensFilter);
    const sorted = [...filtered].sort((a, b) => {
      const cmp = a.scenario_id.localeCompare(b.scenario_id);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [registry, lensFilter, sortDir]);

  const selectedEntry  = registry.find((e) => e.scenario_id === selectedId) ?? null;
  const selectedInsight = useMemo(() => {
    if (!selectedEntry || !selectedEntry.backed) return null;
    try { return aggregateInsight(selectedEntry.scenario_id); } catch { return null; }
  }, [selectedEntry]);

  const groupedRows = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', rows }];
    const map = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = map.get(r.lens) ?? [];
      arr.push(r);
      map.set(r.lens, arr);
    }
    return [...map.entries()].map(([key, rs]) => ({ key, rows: rs }));
  }, [rows, groupBy]);

  return (
    <div className="min-h-full bg-background p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <FileBarChart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold">Report Viewer</h1>
            <Badge variant="outline" className="ml-2">In-session view · resets on reload</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Pick any of the {registry.length} reports from the 75-registry. View controls are
            client-side React state — no save · no share · no schedule (Phase 8 · DP-D3-8).
          </p>
        </header>

        {/* ── Report dropdown · grouped by lens ─────────────────────────── */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Select Report</CardTitle>
            <CardDescription>Dropdown over the full 75-scenario registry.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full md:w-[480px]">
                <SelectValue placeholder="Choose a report…" />
              </SelectTrigger>
              <SelectContent className="max-h-[480px]">
                {INSIGHT_LENSES.map((lens) => {
                  const items = registry.filter((e) => e.lens === lens);
                  if (items.length === 0) return null;
                  return (
                    <SelectGroup key={lens}>
                      <SelectLabel>{LENS_LABELS[lens]}</SelectLabel>
                      {items.map((e) => (
                        <SelectItem key={e.scenario_id} value={e.scenario_id}>
                          {e.title} {!e.backed && '· deferred'}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>

            {selectedEntry && (
              <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/30">
                <div className="font-medium">{selectedEntry.title}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  lens: {LENS_LABELS[selectedEntry.lens]} · source: {selectedEntry.source_engine ?? '—'}
                </div>
                {selectedInsight ? (
                  <div className="font-mono text-sm pt-1">
                    value: {String(selectedInsight.value)}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    Deferred — source engine lands in S131–S135.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── In-session view-config ───────────────────────────────────── */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">View Controls (in-session)</CardTitle>
            <CardDescription>
              Table ⇄ chart toggle · sort · column show/hide · group-by · filters. React state ONLY.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Table/Chart toggle */}
              <div className="flex gap-1 rounded-md border p-1">
                <Button
                  variant={view === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('table')}
                  aria-label="Table view"
                >
                  <TableIcon className="h-4 w-4 mr-1" /> Table
                </Button>
                <Button
                  variant={view === 'chart' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('chart')}
                  aria-label="Chart view"
                >
                  <BarChart3 className="h-4 w-4 mr-1" /> Chart
                </Button>
              </div>

              {/* Sort */}
              <Select value={sortDir} onValueChange={(v) => setSortDir(v as SortDir)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Sort · A → Z</SelectItem>
                  <SelectItem value="desc">Sort · Z → A</SelectItem>
                </SelectContent>
              </Select>

              {/* Group-by */}
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'lens' | 'none')}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lens">Group by lens</SelectItem>
                  <SelectItem value="none">No grouping</SelectItem>
                </SelectContent>
              </Select>

              {/* Lens filter */}
              <Select
                value={lensFilter}
                onValueChange={(v) => setLensFilter(v as InsightLens | 'all')}
              >
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All lenses</SelectItem>
                  {INSIGHT_LENSES.map((l) => (
                    <SelectItem key={l} value={l}>{LENS_LABELS[l]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Column show/hide */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">Columns:</span>
              {COLUMNS.map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={visibleCols[c.id]}
                    onCheckedChange={(v) =>
                      setVisibleCols((prev) => ({ ...prev, [c.id]: v === true }))
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>

            {/* Render */}
            {view === 'table' ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {COLUMNS.filter((c) => visibleCols[c.id]).map((c) => (
                        <TableHead key={c.id}>{c.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedRows.map((g) => (
                      <React.Fragment key={`grp-${g.key}`}>
                        {groupBy === 'lens' && (
                          <TableRow key={`hdr-${g.key}`}>
                            <TableCell
                              colSpan={COLUMNS.filter((c) => visibleCols[c.id]).length}
                              className="bg-muted/30 font-medium text-xs"
                            >
                              {LENS_LABELS[g.key as InsightLens] ?? g.key} · {g.rows.length}
                            </TableCell>
                          </TableRow>
                        )}
                        {g.rows.map((r) => {
                          let valueStr = '—';
                          if (r.backed) {
                            try { valueStr = String(aggregateInsight(r.scenario_id).value); }
                            catch { valueStr = '—'; }
                          }
                          return (
                            <TableRow key={r.scenario_id}>
                              {visibleCols.scenario_id && (
                                <TableCell className="font-mono text-xs">{r.title}</TableCell>
                              )}
                              {visibleCols.lens && <TableCell>{LENS_LABELS[r.lens]}</TableCell>}
                              {visibleCols.value && (
                                <TableCell className="font-mono">{valueStr}</TableCell>
                              )}
                              {visibleCols.source_ref && (
                                <TableCell className="text-xs text-muted-foreground">
                                  {r.source_engine ?? '—'}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 text-primary" />
                Chart view · {rows.length} row(s) ready for visualization.
                <div className="text-xs mt-2">
                  Stacked bar by lens · in-session render only · Phase 8 wires recharts.
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground italic pt-2">
              In-session view-config · saveable / shareable / scheduled views deferred to Phase 8 (DP-D3-8 · §O).
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
