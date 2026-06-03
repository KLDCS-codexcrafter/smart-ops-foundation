/**
 * @file        src/features/abm-nps/ABMNpsPage.tsx
 * @page        First-Class Standalone #55 · ABMNpsPage · 🏁 Arc D.2 CAPSTONE
 * @registered  Under SalesX (SalesX EXTENSION · DP-P7-2):
 *                - SalesXModule id           : 'sx-abm-nps'
 *                - SalesXSidebar item        : Masters group · always-available
 *                - SalesXPage renderModule   : case 'sx-abm-nps'
 *              NO new card · NO new shell-config · existing SalesX modules 0-DIFF.
 * @sprint      Sprint 129 · T-Phase-7.D.2.4 · 🏁 Arc D.2 CAPSTONE
 * @reads       abm-nps-engine + (dashboard READ) marketing-planning + marketing-
 *              automation + attribution. No dead UI. No new runtime deps.
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
import { Building2, Gauge, LayoutDashboard, Sparkles, Star } from 'lucide-react';
import {
  scoreABMAccount,
  listABMAccounts,
  recordNPSSurvey,
  computeNPS,
  listNPSSurveys,
  buildMarketingXDashboard,
  ABM_TIERS,
  type ABMAccount,
  type ABMTier,
  type NPSResult,
  type MarketingXDashboard,
} from '@/lib/abm-nps-engine';

interface Props {
  entityCode: string;
}

export function ABMNpsPage({ entityCode }: Props) {
  // ── ABM state ────────────────────────────────────────────────────────
  const [abmAccountId, setAbmAccountId] = useState('ACC-PREMIER-001');
  const [abmTier, setAbmTier] = useState<ABMTier>('strategic');
  const [abmList, setAbmList] = useState<ABMAccount[]>(() => listABMAccounts());

  const runABM = useCallback(() => {
    try {
      const a = scoreABMAccount({
        account_id: abmAccountId.trim() || `ACC-${Date.now()}`,
        tier: abmTier,
        entity_code: entityCode,
      });
      setAbmList(listABMAccounts());
      toast.success(`ABM scored · ${a.tier} · engagement ${a.engagement_score}`);
    } catch (e) {
      toast.error(`ABM failed: ${(e as Error).message}`);
    }
  }, [abmAccountId, abmTier, entityCode]);

  // ── NPS state ────────────────────────────────────────────────────────
  const [npsRespondent, setNpsRespondent] = useState('C-001');
  const [npsScore, setNpsScore] = useState(9);
  const [npsPeriod, setNpsPeriod] = useState('FY26');
  const [npsResult, setNpsResult] = useState<NPSResult | null>(null);
  const [npsLog, setNpsLog] = useState(() => listNPSSurveys());

  const submitNPS = useCallback(() => {
    try {
      const s = recordNPSSurvey({
        respondent_id: npsRespondent.trim() || `R-${Date.now()}`,
        score: npsScore,
        period: npsPeriod,
        entity_code: entityCode,
      });
      setNpsLog(listNPSSurveys());
      toast.success(`NPS recorded · ${s.category} · ${s.score}/10`);
    } catch (e) {
      toast.error(`NPS failed: ${(e as Error).message}`);
    }
  }, [npsRespondent, npsScore, npsPeriod, entityCode]);

  const refreshNPS = useCallback(() => {
    const r = computeNPS({ period: npsPeriod, entity_code: entityCode });
    setNpsResult(r);
    toast.success(`NPS ${r.period} · ${r.nps}`);
  }, [npsPeriod, entityCode]);

  // ── MarketingX dashboard (READ-ONLY roll-up · recomputes nothing) ────
  const [dashboard, setDashboard] = useState<MarketingXDashboard | null>(null);
  const refreshDashboard = useCallback(() => {
    const d = buildMarketingXDashboard({ fy: npsPeriod, entity_code: entityCode });
    setDashboard(d);
    toast.success('MarketingX dashboard refreshed');
  }, [npsPeriod, entityCode]);

  const abmCounts = useMemo(() => {
    return {
      strategic: abmList.filter((a) => a.tier === 'strategic').length,
      target: abmList.filter((a) => a.tier === 'target').length,
      nurture: abmList.filter((a) => a.tier === 'nurture').length,
    };
  }, [abmList]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Star className="h-6 w-6 text-orange-600" />
            ABM &amp; NPS · MarketingX Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Account-Based Marketing tiering + Net Promoter Score (customer survey)
            + read-only roll-up across the D.2 engines (planning · automation ·
            attribution · ABM/NPS). 🏁 Arc D.2 capstone.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            Strategic: {abmCounts.strategic}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            Target: {abmCounts.target}
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            Nurture: {abmCounts.nurture}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="abm" className="w-full">
        <TabsList>
          <TabsTrigger value="abm"><Building2 className="h-4 w-4 mr-2" />ABM Board</TabsTrigger>
          <TabsTrigger value="nps"><Gauge className="h-4 w-4 mr-2" />NPS</TabsTrigger>
          <TabsTrigger value="dashboard"><LayoutDashboard className="h-4 w-4 mr-2" />MarketingX</TabsTrigger>
        </TabsList>

        {/* ── ABM ──────────────────────────────────────────────────── */}
        <TabsContent value="abm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score target account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Account ID</Label>
                  <Input value={abmAccountId} onChange={(e) => setAbmAccountId(e.target.value)} />
                </div>
                <div>
                  <Label>Tier</Label>
                  <Select value={abmTier} onValueChange={(v) => setAbmTier(v as ABMTier)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ABM_TIERS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={runABM} className="bg-orange-600 hover:bg-orange-700">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Score account
                  </Button>
                </div>
              </div>

              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-sm">Target accounts</CardTitle>
                </CardHeader>
                <CardContent>
                  {abmList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No accounts scored yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Account</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead className="text-right">Engagement</TableHead>
                          <TableHead className="text-right">Touchpoints</TableHead>
                          <TableHead className="text-right">Pipeline ₹</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {abmList.map((a) => (
                          <TableRow key={a.account_id}>
                            <TableCell className="font-mono text-xs">{a.account_id}</TableCell>
                            <TableCell><Badge variant="outline">{a.tier}</Badge></TableCell>
                            <TableCell className="text-right font-mono">{a.engagement_score.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono">{a.touchpoints}</TableCell>
                            <TableCell className="text-right font-mono">{a.pipeline_value.toFixed(2)}</TableCell>
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

        {/* ── NPS ──────────────────────────────────────────────────── */}
        <TabsContent value="nps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Record NPS survey · compute NPS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Respondent</Label>
                  <Input value={npsRespondent} onChange={(e) => setNpsRespondent(e.target.value)} />
                </div>
                <div>
                  <Label>Score (0–10)</Label>
                  <Input
                    type="number"
                    min={0} max={10}
                    value={npsScore}
                    onChange={(e) => setNpsScore(Number(e.target.value || 0))}
                  />
                </div>
                <div>
                  <Label>Period</Label>
                  <Input value={npsPeriod} onChange={(e) => setNpsPeriod(e.target.value)} />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={submitNPS} className="bg-orange-600 hover:bg-orange-700">
                    Record
                  </Button>
                  <Button variant="outline" onClick={refreshNPS}>Compute</Button>
                </div>
              </div>

              {npsResult && (
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-sm">
                      NPS · {npsResult.period} · {npsResult.nps} (range −100..100)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div>Total: <span className="font-mono">{npsResult.total_responses}</span></div>
                      <div>Promoters: <span className="font-mono">{npsResult.promoters}</span></div>
                      <div>Passives: <span className="font-mono">{npsResult.passives}</span></div>
                      <div>Detractors: <span className="font-mono">{npsResult.detractors}</span></div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground">
                Surveys recorded: {npsLog.length} · category mapping 9-10 promoter ·
                7-8 passive · 0-6 detractor (decimal-helpers).
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MarketingX dashboard ─────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">MarketingX roll-up (read-only · {npsPeriod})</CardTitle>
              <Button variant="outline" size="sm" onClick={refreshDashboard}>Refresh</Button>
            </CardHeader>
            <CardContent>
              {!dashboard ? (
                <p className="text-sm text-muted-foreground">
                  Click Refresh — the dashboard READS marketing-planning, marketing-automation,
                  attribution and ABM/NPS. It does not recompute any figure.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>Plans (S126): <span className="font-mono">{dashboard.plans_count}</span></div>
                  <div>Mkt budget ₹: <span className="font-mono">{dashboard.total_marketing_budget.toFixed(2)}</span></div>
                  <div>Channels: <span className="font-mono">{dashboard.channels_in_mix}</span></div>
                  <div>Scored leads (S127): <span className="font-mono">{dashboard.scored_leads}</span></div>
                  <div>Journeys: <span className="font-mono">{dashboard.journeys}</span></div>
                  <div>Enrollments: <span className="font-mono">{dashboard.enrollments}</span></div>
                  <div>Attributions (S128): <span className="font-mono">{dashboard.attributions}</span></div>
                  <div>Segments: <span className="font-mono">{dashboard.segments}</span></div>
                  <div>Channels w/ROI: <span className="font-mono">{dashboard.channels_with_roi}</span></div>
                  <div>ABM accounts: <span className="font-mono">{dashboard.abm_accounts_total}</span></div>
                  <div>NPS responses: <span className="font-mono">{dashboard.nps_total_responses}</span></div>
                  <div>NPS: <span className="font-mono">{dashboard.nps_value}</span></div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                FR-44: aggregates D.2 engines (planning · automation · attribution · ABM/NPS).
                SCOPE WALL: MarketingX-scoped only — InsightX/75-scenario aggregation is Arc D.3.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ABMNpsPage;
