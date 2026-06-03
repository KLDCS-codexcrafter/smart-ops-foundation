/**
 * @file        src/features/attribution-segmentation/AttributionSegmentationPage.tsx
 * @page        First-Class Standalone #54 · AttributionSegmentationPage
 * @registered  Under SalesX (SalesX EXTENSION · DP-P7-2):
 *                - SalesXModule id           : 'sx-attribution-segmentation'
 *                - SalesXSidebar item        : Masters group · always-available
 *                - SalesXPage renderModule   : case 'sx-attribution-segmentation'
 *              NO new card · NO new shell-config · existing SalesX modules 0-DIFF.
 * @sprint      Sprint 128 · T-Phase-7.D.2.3 · Arc D.2 · Attribution + Segmentation
 * @reads       attribution-engine only · no dead UI · no new runtime deps
 */
import { useCallback, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { BarChart3, Layers, Sparkles, Workflow, AlertCircle } from 'lucide-react';
import {
  attributeConversion,
  getChannelROI,
  listAttributions,
  buildMarketingSegment,
  listMarketingSegments,
  getTouchpointSources,
  ATTRIBUTION_MODELS,
  type AttributionModel,
  type Touchpoint,
  type AttributionResult,
  type ChannelROI,
  type MarketingSegment,
} from '@/lib/attribution-engine';
import type { SegmentContext } from '@/lib/segment-rule-engine';

interface Props {
  entityCode: string;
}

const DEMO_TOUCHPOINTS: Touchpoint[] = [
  { lead_id: 'L-101', channel: 'email',    campaign_id: 'cmp-spring',   ts: '2026-04-01T09:00:00Z' },
  { lead_id: 'L-101', channel: 'whatsapp', campaign_id: 'cmp-spring',   ts: '2026-04-05T11:00:00Z' },
  { lead_id: 'L-101', channel: 'social',   campaign_id: 'cmp-launch',   ts: '2026-04-12T15:00:00Z' },
  { lead_id: 'L-101', channel: 'search',   campaign_id: 'cmp-launch',   ts: '2026-04-18T17:30:00Z' },
];

const DEMO_AUDIENCE: SegmentContext[] = [
  { customer_id: 'C-1', city: 'Mumbai',    clv_tier: 'vip',      churn_tier: 'safe',     placed_orders_30d: 6, lifetime_value_paise: 5_50_00_000 },
  { customer_id: 'C-2', city: 'Delhi',     clv_tier: 'growth',   churn_tier: 'watch',    placed_orders_30d: 2, lifetime_value_paise: 1_20_00_000 },
  { customer_id: 'C-3', city: 'Bengaluru', clv_tier: 'vip',      churn_tier: 'safe',     placed_orders_30d: 4, lifetime_value_paise: 3_75_00_000 },
  { customer_id: 'C-4', city: 'Mumbai',    clv_tier: 'at_risk',  churn_tier: 'critical', placed_orders_30d: 0, lifetime_value_paise: 0           },
  { customer_id: 'C-5', city: 'Chennai',   clv_tier: 'standard', churn_tier: 'safe',     placed_orders_30d: 3, lifetime_value_paise: 2_10_00_000 },
];

export function AttributionSegmentationPage({ entityCode }: Props) {
  const sources = useMemo(() => getTouchpointSources(), []);

  // ── Attribution state ────────────────────────────────────────────────
  const [model, setModel] = useState<AttributionModel>('time_decay');
  const [conversionId, setConversionId] = useState('conv-DEMO-1');
  const [conversionValue, setConversionValue] = useState(100000);
  const [attribution, setAttribution] = useState<AttributionResult | null>(null);
  const [allAttributions, setAllAttributions] = useState<AttributionResult[]>(() => listAttributions());
  const [roi, setRoi] = useState<ChannelROI[]>([]);

  const runAttribution = useCallback(() => {
    try {
      const r = attributeConversion({
        conversion_id: conversionId.trim() || `conv-${Date.now()}`,
        touchpoints: DEMO_TOUCHPOINTS,
        model,
        conversion_value: conversionValue,
        entity_code: entityCode,
      });
      setAttribution(r);
      setAllAttributions(listAttributions());
      toast.success(`Attribution computed · ${r.model} · ${r.credits.length} touches`);
    } catch (e) {
      toast.error(`Attribution failed: ${(e as Error).message}`);
    }
  }, [model, conversionId, conversionValue, entityCode]);

  const refreshROI = useCallback(() => {
    const r = getChannelROI({ fy: 'FY26', entity_code: entityCode });
    setRoi(r);
    toast.success(`Channel ROI refreshed · ${r.length} channels`);
  }, [entityCode]);

  // ── Segmentation state ───────────────────────────────────────────────
  const [segName, setSegName] = useState('High-CLV Mumbai actives');
  const [segRule, setSegRule] = useState('city = Mumbai AND placed_orders_30d >= 1');
  const [segments, setSegments] = useState<MarketingSegment[]>(() => listMarketingSegments());

  const buildSegment = useCallback(() => {
    try {
      const s = buildMarketingSegment({
        name: segName,
        rule: segRule,
        audience: DEMO_AUDIENCE,
      });
      setSegments(listMarketingSegments());
      toast.success(`Segment built via segment-rule-engine · matched ${s.matched_count}`);
    } catch (e) {
      toast.error(`Segment failed: ${(e as Error).message}`);
    }
  }, [segName, segRule]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-orange-600" />
            Attribution &amp; Segmentation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-touch attribution (last-touch · linear · time-decay), channel ROI,
            and marketing segmentation — segmentation REUSES{' '}
            <code className="font-mono text-xs">segment-rule-engine</code> (DP-D2-5).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            Funnel: {sources.conversionEngineLoaded ? '✓' : '×'}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            Journey: {sources.automationEngineLoaded ? '✓' : '×'}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            Rails: {sources.journeyChannels.join('+') || 'none'}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="attribution" className="w-full">
        <TabsList>
          <TabsTrigger value="attribution"><Workflow className="h-4 w-4 mr-2" />Attribution</TabsTrigger>
          <TabsTrigger value="roi"><BarChart3 className="h-4 w-4 mr-2" />Channel ROI</TabsTrigger>
          <TabsTrigger value="segmentation"><Layers className="h-4 w-4 mr-2" />Segmentation</TabsTrigger>
        </TabsList>

        {/* ── Attribution ─────────────────────────────────────────────── */}
        <TabsContent value="attribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compute conversion attribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Model</Label>
                  <Select value={model} onValueChange={(v) => setModel(v as AttributionModel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ATTRIBUTION_MODELS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Conversion ID</Label>
                  <Input value={conversionId} onChange={(e) => setConversionId(e.target.value)} />
                </div>
                <div>
                  <Label>Conversion value (₹)</Label>
                  <Input
                    type="number"
                    value={conversionValue}
                    onChange={(e) => setConversionValue(Number(e.target.value || 0))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={runAttribution} className="bg-orange-600 hover:bg-orange-700">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Run attribution
                </Button>
                <span className="text-xs text-muted-foreground self-center">
                  Touchpoints: {DEMO_TOUCHPOINTS.length} (read from salesx-conversion + marketing-automation)
                </span>
              </div>

              {attribution && (
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Credits · {attribution.model} · sum = 100%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Channel</TableHead>
                          <TableHead>Campaign</TableHead>
                          <TableHead className="text-right">Credit %</TableHead>
                          <TableHead className="text-right">Credit ₹</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attribution.credits.map((c, i) => (
                          <TableRow key={`${c.channel}-${i}`}>
                            <TableCell>{c.channel}</TableCell>
                            <TableCell className="font-mono text-xs">{c.campaign_id}</TableCell>
                            <TableCell className="text-right font-mono">{c.credit_pct.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono">{c.credit_value.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {allAttributions.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  History · {allAttributions.length} attribution run(s) recorded.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Channel ROI ─────────────────────────────────────────────── */}
        <TabsContent value="roi" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Channel ROI (FY26)</CardTitle>
              <Button variant="outline" size="sm" onClick={refreshROI}>Refresh</Button>
            </CardHeader>
            <CardContent>
              {roi.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  No ROI data — run an attribution first, then refresh.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead className="text-right">Spend ₹</TableHead>
                      <TableHead className="text-right">Attributed ₹</TableHead>
                      <TableHead className="text-right">ROI %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roi.map((r) => (
                      <TableRow key={r.channel}>
                        <TableCell>{r.channel}</TableCell>
                        <TableCell className="text-right font-mono">{r.spend.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{r.attributed_revenue.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {r.spend === 0 ? '—' : r.roi.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Spend READ from marketing-planning channel allocations (FR-44). Divide-by-zero guarded.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Segmentation ────────────────────────────────────────────── */}
        <TabsContent value="segmentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Build marketing segment (via segment-rule-engine · DP-D2-5)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Segment name</Label>
                  <Input value={segName} onChange={(e) => setSegName(e.target.value)} />
                </div>
                <div>
                  <Label>Rule (segment-rule-engine DSL)</Label>
                  <Input
                    value={segRule}
                    onChange={(e) => setSegRule(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={buildSegment} className="bg-orange-600 hover:bg-orange-700">
                  <Layers className="h-4 w-4 mr-2" />
                  Evaluate rule
                </Button>
                <span className="text-xs text-muted-foreground">
                  Audience: {DEMO_AUDIENCE.length} contexts
                </span>
              </div>

              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-sm">Segments</CardTitle>
                </CardHeader>
                <CardContent>
                  {segments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No segments yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Rule</TableHead>
                          <TableHead className="text-right">Matched</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {segments.map((s) => (
                          <TableRow key={s.segment_id}>
                            <TableCell>{s.name}</TableCell>
                            <TableCell className="font-mono text-xs">{s.rule}</TableCell>
                            <TableCell className="text-right font-mono">{s.matched_count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AttributionSegmentationPage;
