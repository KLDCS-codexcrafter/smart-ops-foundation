/**
 * @file        src/features/marketing-planning/MarketingPlanningPage.tsx
 * @page        First-Class Standalone #52 · MarketingPlanningPage
 * @registered  Under SalesX (SalesX EXTENSION · DP-P7-2 · DP-D2-1):
 *                - SalesXModule id           : 'sx-marketing-planning'
 *                - SalesXSidebar.groups item : 'sx-marketing-planning' → 'master' tab
 *                - SalesXPage renderModule   : case 'sx-marketing-planning'
 *              NO new card, NO new shell-config. Existing SalesX modules 0-DIFF.
 * @sprint      Sprint 126 · T-Phase-7.D.2.1 · 🎬 Arc D.2 Opener · MarketingX
 * @reads       marketing-planning-engine only · no dead UI · no new runtime deps
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Megaphone, Calendar, PieChart, Wallet } from 'lucide-react';
import {
  allocateChannelBudget,
  getCampaignCalendar,
  listMarketingPlans,
  MARKETING_CHANNELS,
  type MarketingChannel,
  type MarketingPlan,
  type CampaignCalendarEntry,
} from '@/lib/marketing-planning-engine';

interface Props {
  entityCode: string;
}

const DEFAULT_MIX: Record<MarketingChannel, number> = {
  email: 15, whatsapp: 15, social: 20, search: 20,
  events: 15, content: 10, referral: 5,
};

export function MarketingPlanningPage({ entityCode }: Props) {
  const [fy, setFy] = useState<string>('FY26');
  const [totalBudget, setTotalBudget] = useState<number>(1000000);
  const [mix, setMix] = useState<Record<MarketingChannel, number>>({ ...DEFAULT_MIX });
  const [plan, setPlan] = useState<MarketingPlan | null>(null);
  const [calendar, setCalendar] = useState<CampaignCalendarEntry[]>([]);

  const mixSum = useMemo(
    () => MARKETING_CHANNELS.reduce((s, c) => s + (mix[c] ?? 0), 0),
    [mix],
  );

  const refresh = useCallback(() => {
    const plans = listMarketingPlans({ fy, entity_code: entityCode });
    setPlan(plans[0] ?? null);
    setCalendar(getCampaignCalendar({ fy, entity_code: entityCode }));
  }, [fy, entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAllocate = useCallback(() => {
    try {
      const result = allocateChannelBudget({
        fy, entity_code: entityCode, total_budget: totalBudget,
        mix: MARKETING_CHANNELS.map((c) => ({ channel: c, pct: mix[c] ?? 0 })),
      });
      setPlan(result);
      toast.success(`Plan saved · ₹${result.total_budget.toLocaleString('en-IN')} across ${result.channel_allocations.length} channels`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [fy, entityCode, totalBudget, mix]);

  const setChannelPct = (c: MarketingChannel, v: number) => {
    setMix((prev) => ({ ...prev, [c]: Math.max(0, Math.min(100, v)) }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-orange-500" />
            Marketing Planning
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            FY budget · channel mix · campaign calendar · ties to FP&amp;A budget · Sprint 126 · Arc D.2 opener
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">SalesX · MarketingX</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wallet className="h-4 w-4" /> FY &amp; Total Budget (FP&amp;A tie)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="fy" className="text-xs">FY</Label>
            <Input id="fy" value={fy} onChange={(e) => setFy(e.target.value)} className="font-mono" />
          </div>
          <div>
            <Label htmlFor="tb" className="text-xs">Total Marketing Budget (₹)</Label>
            <Input
              id="tb" type="number" inputMode="numeric"
              value={totalBudget}
              onChange={(e) => setTotalBudget(Number(e.target.value) || 0)}
              className="font-mono"
            />
          </div>
          <div className="flex items-end">
            <div className="text-xs space-y-1">
              <div>FP&amp;A reference: <span className="font-mono">
                {plan?.fpa_budget_reference != null
                  ? `₹${plan.fpa_budget_reference.toLocaleString('en-IN')}`
                  : '— (no FP&A operating budget on file)'}
              </span></div>
              <div>Reconciles to FP&amp;A: {plan
                ? <Badge variant={plan.reconciles_to_fpa ? 'default' : 'destructive'}>
                    {plan.reconciles_to_fpa ? 'Yes' : 'No'}
                  </Badge>
                : <span className="text-muted-foreground">—</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="mix">
        <TabsList>
          <TabsTrigger value="mix" className="gap-2"><PieChart className="h-3.5 w-3.5" /> Channel Mix</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2"><Calendar className="h-3.5 w-3.5" /> Campaign Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="mix" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Channel Allocation · {MARKETING_CHANNELS.length} channels · pcts must sum to 100
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {MARKETING_CHANNELS.map((c) => (
                  <div key={c}>
                    <Label className="text-xs capitalize">{c}</Label>
                    <Input
                      type="number" inputMode="numeric" min={0} max={100}
                      value={mix[c]}
                      onChange={(e) => setChannelPct(c, Number(e.target.value) || 0)}
                      className="font-mono"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs">
                  Sum: <span className={`font-mono ${mixSum === 100 ? 'text-success' : 'text-destructive'}`}>{mixSum}</span> / 100
                </div>
                <Button size="sm" onClick={handleAllocate} disabled={mixSum !== 100}>Allocate &amp; Save Plan</Button>
              </div>
            </CardContent>
          </Card>

          {plan && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Saved Plan · {plan.fy}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Budget (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.channel_allocations.map((a) => (
                      <TableRow key={a.channel}>
                        <TableCell className="capitalize">{a.channel}</TableCell>
                        <TableCell className="text-right font-mono">{a.pct}</TableCell>
                        <TableCell className="text-right font-mono">{a.budget.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Campaign Calendar · {fy} · {calendar.length} entries (reads Campaign data)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {calendar.length === 0 ? (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  No campaigns matched {fy}. Create campaigns in SalesX → Masters → Campaigns.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead className="text-right">Budget (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calendar.map((e) => (
                      <TableRow key={e.campaign_id}>
                        <TableCell>{e.name}</TableCell>
                        <TableCell className="capitalize">{e.channel}</TableCell>
                        <TableCell className="font-mono text-xs">{e.start_date}</TableCell>
                        <TableCell className="font-mono text-xs">{e.end_date}</TableCell>
                        <TableCell className="text-right font-mono">{e.budget.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MarketingPlanningPage;
