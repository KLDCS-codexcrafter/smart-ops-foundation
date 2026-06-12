/**
 * @file        ReportBuilder.tsx
 * @sprint      RPT-9a · User Report Builder · ONE embeddable component
 * @purpose     The per-card × per-role builder. Two modes:
 *                - Embedded:    cardId prop set (e.g. <ReportBuilder cardId="fincore" />)
 *                - Centralized: no cardId (lists all entitled sources)
 *
 *              Composes the FOUR governance locks:
 *                1. Cross-card lock      via allowedSourcesFor(layer, entitled)
 *                2. Entitlement lock     via useCardEntitlement + cardId check
 *                3. Role→scope lock      via allowedSaveScopesFor in the Save dialog
 *                4. Integrity lock       via the hash badge from runQuery
 *
 *              No recharts import — preview goes through TableChartToggle.
 *              Honest empty-state when read() returns zero rows.
 */
import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ShieldCheck, Save, Trash2, FolderOpen, Lock, Download, Wand2 } from 'lucide-react';
import { TableChartToggle, type TableChartColumn } from './TableChartToggle';
import { PivotMatrix } from './PivotMatrix';
import {
  runQuery,
  allowedSourcesFor,
  ReportBuilderQueryError,
  type QuerySpec,
  type AggOp,
  type FilterOp,
} from '@/lib/report-framework/report-builder-engine';
import {
  saveDefinition,
  listDefinitions,
  deleteDefinition,
  allowedSaveScopesFor,
  ReportDefinitionScopeError,
  type ReportDefinition,
  type ReportScope,
} from '@/lib/report-framework/report-definitions';
import { layerCeilingFor } from '@/lib/report-framework/role-layer';
import { matchIntent } from '@/lib/report-framework/intent-match';
import { describeReport } from '@/lib/report-framework/narrative';
import { downloadCsv } from '@/lib/report-framework/export-csv';
import type { DataSource } from '@/lib/report-framework/data-source-catalog';
import type { ReportChartConfig } from '@/lib/report-framework/chart-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { toast } from 'sonner';

export interface ReportBuilderProps {
  cardId?: string;
}

const AGG_OPS: AggOp[] = ['sum', 'count', 'avg', 'min', 'max'];
const FILTER_OPS: FilterOp[] = ['eq', 'neq', 'contains', 'gt', 'lt'];

export default function ReportBuilder({ cardId }: ReportBuilderProps) {
  const { role, allowedCards, entityCode, userId } = useCardEntitlement();
  const layer = layerCeilingFor(role);

  // Entitlement lock (embedded mode)
  const entitledCardIds = useMemo(
    () => allowedCards.map((c) => c as unknown as string),
    [allowedCards],
  );
  const isNotEntitled = !!cardId && !entitledCardIds.includes(cardId);

  const sources: DataSource[] = useMemo(() => {
    if (isNotEntitled) return [];
    const scope = cardId ? [cardId] : entitledCardIds;
    return allowedSourcesFor(layer, scope);
  }, [cardId, entitledCardIds, layer, isNotEntitled]);

  const [sourceId, setSourceId] = useState<string>('');
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [measures, setMeasures] = useState<{ field: string; agg: AggOp }[]>([]);
  const [filters, setFilters] = useState<{ field: string; op: FilterOp; value: string }[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveScope, setSaveScope] = useState<ReportScope>('private');
  const [savedTick, setSavedTick] = useState(0); // re-render trigger

  // Block 4 · NL intent input
  const [intentText, setIntentText] = useState('');
  const [intentNoMatch, setIntentNoMatch] = useState(false);
  const [intentLastMatch, setIntentLastMatch] = useState<{ sourceId: string } | null>(null);

  // Block 1 · Pivot tab measure-key selection
  const [pivotMeasureKey] = useState<string | null>(null);

  const activeSource = useMemo(
    () => sources.find((s) => s.id === sourceId),
    [sources, sourceId],
  );
  const dimensionFields = activeSource?.fields.filter((f) => f.kind === 'dimension') ?? [];
  const measureFields = activeSource?.fields.filter((f) => f.kind === 'measure') ?? [];

  const spec: QuerySpec = useMemo(
    () => ({
      filters: filters
        .filter((f) => f.field)
        .map((f) => ({ field: f.field, op: f.op, value: coerce(f.value) })),
      groupBy,
      measures,
    }),
    [filters, groupBy, measures],
  );

  const result = useMemo(() => {
    if (!activeSource || measures.length === 0) return null;
    try {
      return runQuery(activeSource.id, spec, entityCode);
    } catch (err) {
      if (err instanceof ReportBuilderQueryError) {
        return { error: err.message } as const;
      }
      throw err;
    }
  }, [activeSource, spec, entityCode, measures.length]);

  const tableColumns: TableChartColumn<Record<string, unknown>>[] = useMemo(() => {
    if (!result || 'error' in result || result.rows.length === 0) return [];
    return Object.keys(result.rows[0]).map((k) => ({ key: k, label: k }));
  }, [result]);

  const chartConfig: ReportChartConfig = useMemo(() => {
    const xKey = groupBy[0] ?? 'value';
    const series = measures.map((m) => ({
      key: m.agg === 'count' ? 'count' : `${m.agg}_${m.field}`,
      label: m.agg === 'count' ? 'count' : `${m.agg}(${m.field})`,
    }));
    return { chartType: 'column', xKey, series: series.length ? series : [{ key: 'count', label: 'count' }] };
  }, [groupBy, measures]);

  const savedAllowedScopes = useMemo(() => allowedSaveScopesFor(role, layer), [role, layer]);
  const definitions = useMemo<ReportDefinition[]>(() => {
    // savedTick forces re-eval after save/delete
    void savedTick;
    return listDefinitions(cardId, layer, userId);
  }, [cardId, layer, userId, savedTick]);

  const handleSave = useCallback(() => {
    if (!activeSource || !saveName.trim() || measures.length === 0) return;
    try {
      saveDefinition({
        name: saveName.trim(),
        sourceId: activeSource.id,
        spec,
        chartConfig,
        scope: saveScope,
        cardId: cardId ?? activeSource.card,
        role,
        layer,
        userId,
      });
      toast.success('Report saved');
      setSaveName('');
      setSaveOpen(false);
      setSavedTick((t) => t + 1);
    } catch (err) {
      if (err instanceof ReportDefinitionScopeError) {
        toast.error(err.message);
      } else {
        toast.error('Save failed');
      }
    }
  }, [activeSource, saveName, measures.length, spec, chartConfig, saveScope, cardId, role, layer, userId]);

  const handleLoad = useCallback((def: ReportDefinition) => {
    setSourceId(def.sourceId);
    setGroupBy(def.spec.groupBy);
    setMeasures(def.spec.measures.map((m) => ({ field: m.field, agg: m.agg })));
    setFilters((def.spec.filters ?? []).map((f) => ({ field: f.field, op: f.op, value: String(f.value ?? '') })));
    toast.success(`Loaded: ${def.name}`);
  }, []);

  const handleDelete = useCallback((id: string) => {
    try {
      deleteDefinition(id, layer, userId);
      toast.success('Report deleted');
      setSavedTick((t) => t + 1);
    } catch (err) {
      if (err instanceof ReportDefinitionScopeError) toast.error(err.message);
    }
  }, [layer, userId]);

  const handleIntentApply = useCallback(() => {
    const m = matchIntent(intentText);
    if (!m) {
      setIntentNoMatch(true);
      setIntentLastMatch(null);
      return;
    }
    setIntentNoMatch(false);
    setSourceId(m.sourceId);
    setGroupBy(m.spec.groupBy);
    setMeasures(m.spec.measures.map((mm) => ({ field: mm.field, agg: mm.agg })));
    setFilters([]);
    setIntentLastMatch({ sourceId: m.sourceId });
  }, [intentText]);

  if (isNotEntitled) {
    return (
      <Card data-testid="rb-not-entitled">
        <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
          <Lock className="h-8 w-8" />
          <p className="text-sm">You don't have access to <span className="font-mono">{cardId}</span>. Ask an admin to enable this card.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="report-builder">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Report Builder
            <Badge variant="outline" className="text-[10px] font-mono">
              {cardId ? `card:${cardId}` : 'centralized'} · layer:{layer}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Intent input (Block 4) — modest, client-side, honest */}
          <div className="grid gap-2" data-testid="rb-intent-row">
            <Label className="text-xs flex items-center gap-1"><Wand2 className="h-3 w-3" /> Describe the report (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                value={intentText}
                onChange={(e) => { setIntentText(e.target.value); setIntentNoMatch(false); }}
                placeholder='e.g. "total amount by party for receivx"'
                data-testid="rb-intent-input"
              />
              <Button size="sm" variant="outline" type="button" data-testid="rb-intent-apply" onClick={handleIntentApply}>
                Match
              </Button>
            </div>
            {intentNoMatch && (
              <p className="text-xs text-muted-foreground" data-testid="rb-intent-nomatch">
                Couldn't match that — pick a source below.
              </p>
            )}
            {intentLastMatch && (
              <p className="text-xs text-muted-foreground" data-testid="rb-intent-prefilled">
                Pre-filled from <span className="font-mono">{intentLastMatch.sourceId}</span>. Review and run.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label className="text-xs">Source</Label>
            <Select value={sourceId} onValueChange={(v) => { setSourceId(v); setGroupBy([]); setMeasures([]); setFilters([]); }}>
              <SelectTrigger data-testid="rb-source-trigger"><SelectValue placeholder="Pick a data source…" /></SelectTrigger>
              <SelectContent>
                {sources.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">No entitled sources</div>
                ) : sources.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-mono text-xs">{s.id}</span> — {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeSource && (
            <>
              {/* GroupBy picker (dimensions only) */}
              <div className="grid gap-2">
                <Label className="text-xs">Group By (dimensions only)</Label>
                <div className="flex flex-wrap gap-2">
                  {dimensionFields.map((f) => {
                    const on = groupBy.includes(f.key);
                    return (
                      <Button
                        key={f.key}
                        size="sm"
                        variant={on ? 'default' : 'outline'}
                        type="button"
                        data-testid={`rb-dim-${f.key}`}
                        onClick={() =>
                          setGroupBy((prev) =>
                            on ? prev.filter((g) => g !== f.key) : [...prev, f.key],
                          )
                        }
                      >
                        {f.label}
                      </Button>
                    );
                  })}
                  {dimensionFields.length === 0 && (
                    <span className="text-xs text-muted-foreground">No dimension fields</span>
                  )}
                </div>
              </div>

              {/* Measures picker */}
              <div className="grid gap-2">
                <Label className="text-xs">Measures</Label>
                <div className="space-y-2">
                  {measures.map((m, i) => (
                    <div key={`m-${i}`} className="flex items-center gap-2">
                      <Select value={m.field} onValueChange={(v) => updateMeasure(setMeasures, i, { field: v })}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="field" /></SelectTrigger>
                        <SelectContent>
                          {(m.agg === 'count' ? activeSource.fields : measureFields).map((f) => (
                            <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={m.agg} onValueChange={(v) => updateMeasure(setMeasures, i, { agg: v as AggOp })}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {AGG_OPS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => setMeasures((p) => p.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    data-testid="rb-add-measure"
                    onClick={() => {
                      const first = measureFields[0] ?? activeSource.fields[0];
                      if (first) setMeasures((p) => [...p, { field: first.key, agg: first.kind === 'measure' ? 'sum' : 'count' }]);
                    }}
                  >
                    + Add measure
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid gap-2">
                <Label className="text-xs">Filters (optional)</Label>
                <div className="space-y-2">
                  {filters.map((f, i) => (
                    <div key={`f-${i}`} className="flex items-center gap-2">
                      <Select value={f.field} onValueChange={(v) => updateFilter(setFilters, i, { field: v })}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="field" /></SelectTrigger>
                        <SelectContent>
                          {activeSource.fields.map((af) => <SelectItem key={af.key} value={af.key}>{af.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={f.op} onValueChange={(v) => updateFilter(setFilters, i, { op: v as FilterOp })}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FILTER_OPS.map((op) => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input className="w-48" value={f.value} onChange={(e) => updateFilter(setFilters, i, { value: e.target.value })} placeholder="value" />
                      <Button size="sm" variant="ghost" onClick={() => setFilters((p) => p.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" type="button" onClick={() => setFilters((p) => [...p, { field: activeSource.fields[0]?.key ?? '', op: 'eq', value: '' }])}>
                    + Add filter
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {activeSource && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Preview</CardTitle>
            <div className="flex items-center gap-2">
              {result && !('error' in result) && result.rows.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  data-testid="rb-csv-export"
                  onClick={() => downloadCsv(
                    `report-${activeSource.id}-${Date.now()}`,
                    result.rows as Record<string, unknown>[],
                  )}
                >
                  <Download className="h-3 w-3 mr-1" /> CSV
                </Button>
              )}
              {result && !('error' in result) && (
                <Badge variant="outline" className="font-mono text-[10px] flex items-center gap-1" data-testid="rb-integrity-badge">
                  <ShieldCheck className="h-3 w-3" />
                  {result.integrityHash.slice(0, 12)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!result && (
              <p className="text-xs text-muted-foreground" data-testid="rb-no-measures">Pick at least one measure to preview.</p>
            )}
            {result && 'error' in result && (
              <p className="text-xs text-destructive" data-testid="rb-error">{result.error}</p>
            )}
            {result && !('error' in result) && result.rows.length === 0 && (
              <p className="text-xs text-muted-foreground" data-testid="rb-empty">No rows for the current spec.</p>
            )}
            {result && !('error' in result) && result.rows.length > 0 && (
              <>
                {/* Block 5 · Narrative line — numbers computed from real rows */}
                <p className="text-xs text-muted-foreground mb-2" data-testid="rb-narrative">
                  {describeReport(result.rows as Record<string, unknown>[], spec)}
                </p>
                {spec.groupBy.length === 2 ? (
                  <Tabs defaultValue="table">
                    <TabsList className="h-8">
                      <TabsTrigger value="table" className="text-xs h-7" data-testid="rb-tab-table">Table</TabsTrigger>
                      <TabsTrigger value="chart" className="text-xs h-7" data-testid="rb-tab-chart">Chart</TabsTrigger>
                      <TabsTrigger value="pivot" className="text-xs h-7" data-testid="rb-tab-pivot">Pivot</TabsTrigger>
                    </TabsList>
                    <TabsContent value="table">
                      <TableChartToggle
                        rows={result.rows as Record<string, unknown>[]}
                        columns={tableColumns}
                        chartConfig={chartConfig}
                      />
                    </TabsContent>
                    <TabsContent value="chart">
                      <TableChartToggle
                        rows={result.rows as Record<string, unknown>[]}
                        columns={tableColumns}
                        chartConfig={chartConfig}
                        defaultView="chart"
                      />
                    </TabsContent>
                    <TabsContent value="pivot">
                      {(() => {
                        const m0 = measures[0];
                        const alias = m0 ? (m0.agg === 'count' ? 'count' : `${m0.agg}_${m0.field}`) : 'count';
                        const key = pivotMeasureKey ?? alias;
                        return (
                          <PivotMatrix
                            rows={result.rows as Record<string, unknown>[]}
                            groupBy={[spec.groupBy[0], spec.groupBy[1]] as [string, string]}
                            measureKey={key}
                            measureLabel={key}
                          />
                        );
                      })()}
                    </TabsContent>
                  </Tabs>
                ) : (
                  <TableChartToggle
                    rows={result.rows as Record<string, unknown>[]}
                    columns={tableColumns}
                    chartConfig={chartConfig}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}


      {/* Save / Load */}
      {activeSource && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Saved Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!saveOpen && (
              <Button size="sm" variant="outline" type="button" data-testid="rb-save-toggle" onClick={() => setSaveOpen(true)} disabled={measures.length === 0}>
                <Save className="h-4 w-4 mr-1" /> Save current
              </Button>
            )}
            {saveOpen && (
              <div className="flex flex-wrap items-center gap-2" data-testid="rb-save-form">
                <Input className="w-56" placeholder="Report name" value={saveName} onChange={(e) => setSaveName(e.target.value)} />
                <Select value={saveScope} onValueChange={(v) => setSaveScope(v as ReportScope)}>
                  <SelectTrigger className="w-32" data-testid="rb-scope-trigger"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {savedAllowedScopes.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" data-testid="rb-save-confirm" onClick={handleSave}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setSaveOpen(false); setSaveName(''); }}>Cancel</Button>
              </div>
            )}

            {definitions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No saved reports yet.</p>
            ) : (
              <ul className="space-y-1">
                {definitions.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 text-xs border rounded-md px-2 py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{d.name}</span>
                      <Badge variant="outline" className="text-[10px]">{d.scope}</Badge>
                      <span className="font-mono text-[10px] text-muted-foreground truncate">{d.sourceId}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleLoad(d)}>Load</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(d.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function coerce(v: string): unknown {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v !== '' && Number.isFinite(Number(v))) return Number(v);
  return v;
}

function updateMeasure(
  setter: React.Dispatch<React.SetStateAction<{ field: string; agg: AggOp }[]>>,
  i: number,
  patch: Partial<{ field: string; agg: AggOp }>,
) {
  setter((prev) => prev.map((m, j) => (j === i ? { ...m, ...patch } : m)));
}
function updateFilter(
  setter: React.Dispatch<React.SetStateAction<{ field: string; op: FilterOp; value: string }[]>>,
  i: number,
  patch: Partial<{ field: string; op: FilterOp; value: string }>,
) {
  setter((prev) => prev.map((f, j) => (j === i ? { ...f, ...patch } : f)));
}
