/**
 * @file        src/features/marketing-automation/MarketingAutomationPage.tsx
 * @page        First-Class Standalone #53 · MarketingAutomationPage
 * @registered  Under SalesX (SalesX EXTENSION · DP-P7-2):
 *                - SalesXModule id           : 'sx-marketing-automation'
 *                - SalesXSidebar item        : Masters group · always-available
 *                - SalesXPage renderModule   : case 'sx-marketing-automation'
 *              NO new card · NO new shell-config · existing SalesX modules 0-DIFF.
 * @sprint      Sprint 127 · T-Phase-7.D.2.2 · Arc D.2 · Lead Scoring + Automation
 * @reads       marketing-automation-engine only · no dead UI · no new runtime deps
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Flame, Snowflake, Activity, Send, Workflow, Sparkles, AlertCircle,
} from 'lucide-react';
import {
  scoreLead,
  upsertJourney,
  enrollLeadInJourney,
  fireJourneyStep,
  listJourneys,
  listLeadScores,
  listEnrollments,
  JOURNEY_CHANNELS,
  DEFERRED_CHANNELS,
  BAND_THRESHOLDS,
  type DripJourney,
  type JourneyChannel,
  type JourneyStep,
  type LeadScore,
  type LeadScoreSignal,
} from '@/lib/marketing-automation-engine';

interface Props {
  entityCode: string;
}

const DEFAULT_SIGNALS: LeadScoreSignal[] = [
  { signal: 'email_verified', weight: 10 },
  { signal: 'phone_verified', weight: 10 },
  { signal: 'product_interest_match', weight: 25 },
  { signal: 'campaign_click', weight: 15 },
  { signal: 'website_repeat_visit', weight: 10 },
];

const BAND_COLORS: Record<LeadScore['band'], string> = {
  cold: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  warm: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  hot:  'bg-orange-500/15 text-orange-700 border-orange-500/30',
};

const BAND_ICONS: Record<LeadScore['band'], React.ElementType> = {
  cold: Snowflake,
  warm: Activity,
  hot:  Flame,
};

export function MarketingAutomationPage({ entityCode }: Props) {
  // ── Lead-scoring board ───────────────────────────────────────────────
  const [leadId, setLeadId] = useState<string>('LEAD-001');
  const [signals, setSignals] = useState<LeadScoreSignal[]>(DEFAULT_SIGNALS);
  const [scores, setScores] = useState<LeadScore[]>([]);

  const refreshScores = useCallback(() => {
    setScores(listLeadScores());
  }, []);

  useEffect(() => { refreshScores(); }, [refreshScores]);

  const handleScore = useCallback(() => {
    if (!leadId.trim()) {
      toast.error('Lead ID is required');
      return;
    }
    const r = scoreLead({ lead_id: leadId.trim(), signals, entityCode });
    toast.success(`Scored ${r.lead_id} · ${r.band.toUpperCase()} (${r.score})`);
    refreshScores();
  }, [leadId, signals, entityCode, refreshScores]);

  const updateSignalWeight = useCallback((idx: number, weight: number) => {
    setSignals(prev => prev.map((s, i) => (i === idx ? { ...s, weight } : s)));
  }, []);

  const bandCounts = useMemo(() => {
    const out = { cold: 0, warm: 0, hot: 0 } as Record<LeadScore['band'], number>;
    for (const s of scores) out[s.band] += 1;
    return out;
  }, [scores]);

  // ── Journey builder ──────────────────────────────────────────────────
  const [journeyName, setJourneyName] = useState<string>('Welcome Drip');
  const [trigger, setTrigger] = useState<string>('lead_created');
  const [steps, setSteps] = useState<JourneyStep[]>([
    { step_id: 'step-1', channel: 'notification', delay_days: 0, template_ref: 'welcome_push' },
    { step_id: 'step-2', channel: 'whatsapp',     delay_days: 2, template_ref: 'welcome_wa'   },
  ]);
  const [journeys, setJourneys] = useState<DripJourney[]>([]);

  const refreshJourneys = useCallback(() => {
    setJourneys(listJourneys());
  }, []);

  useEffect(() => { refreshJourneys(); }, [refreshJourneys]);

  const updateStep = useCallback((idx: number, patch: Partial<JourneyStep>) => {
    setSteps(prev => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }, []);

  const addStep = useCallback(() => {
    setSteps(prev => [
      ...prev,
      {
        step_id: `step-${prev.length + 1}`,
        channel: 'notification',
        delay_days: prev.length,
        template_ref: `template_${prev.length + 1}`,
      },
    ]);
  }, []);

  const removeStep = useCallback((idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSaveJourney = useCallback(() => {
    if (!journeyName.trim()) {
      toast.error('Journey name is required');
      return;
    }
    if (steps.length === 0) {
      toast.error('Add at least one step');
      return;
    }
    const journey_id = `j-${journeyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    try {
      upsertJourney({
        journey_id,
        name: journeyName.trim(),
        trigger,
        steps,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      toast.success(`Saved journey · ${journeyName}`);
      refreshJourneys();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [journeyName, trigger, steps, refreshJourneys]);

  // ── Enroll + fire ────────────────────────────────────────────────────
  const [enrollLeadId, setEnrollLeadId] = useState<string>('LEAD-001');
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('');
  const [enrollments, setEnrollments] = useState(listEnrollments());

  const refreshEnrollments = useCallback(() => {
    setEnrollments(listEnrollments());
  }, []);

  useEffect(() => { refreshEnrollments(); }, [refreshEnrollments]);

  const handleEnroll = useCallback(() => {
    if (!selectedJourneyId) {
      toast.error('Select a journey');
      return;
    }
    const r = enrollLeadInJourney({
      lead_id: enrollLeadId,
      journey_id: selectedJourneyId,
      entityCode,
    });
    if (r.enrolled) {
      toast.success(`Enrolled · first step: ${r.first_step?.step_id ?? '—'}`);
      refreshEnrollments();
    } else {
      toast.error('Journey is inactive or missing');
    }
  }, [enrollLeadId, selectedJourneyId, entityCode, refreshEnrollments]);

  const handleFireStep = useCallback(
    (j: DripJourney, step: JourneyStep) => {
      const r = fireJourneyStep({
        lead_id: enrollLeadId,
        journey_id: j.journey_id,
        step_id: step.step_id,
        lead: { id: enrollLeadId, contact_name: enrollLeadId, phone: '9999999999' },
        entityCode,
      });
      if (r.dispatched) {
        toast.success(`Dispatched via ${r.rail}`);
      } else {
        toast.error(`Skipped: ${r.reason ?? 'unknown'}`);
      }
      refreshEnrollments();
    },
    [enrollLeadId, entityCode, refreshEnrollments],
  );

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-orange-500" />
            Marketing Automation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lead scoring (explainable heuristic + ML seam) + drip journeys orchestrating notification &amp; WhatsApp rails.
          </p>
        </div>
        <Badge variant="outline" className="font-mono">
          Sprint 127 · #53
        </Badge>
      </header>

      {DEFERRED_CHANNELS.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 flex items-start gap-2 text-xs">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p>
              <strong>§L · Channels deferred:</strong>{' '}
              <span className="font-mono">{DEFERRED_CHANNELS.join(', ')}</span> —
              no generic marketing email rail exists at this HEAD. Active rails:{' '}
              <span className="font-mono">{JOURNEY_CHANNELS.join(', ')}</span>.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="scoring" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scoring">Lead Scoring</TabsTrigger>
          <TabsTrigger value="journeys">Journey Builder</TabsTrigger>
          <TabsTrigger value="enroll">Enrollment &amp; Dispatch</TabsTrigger>
        </TabsList>

        {/* ── Lead Scoring ─────────────────────────────────────────── */}
        <TabsContent value="scoring" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {(['cold', 'warm', 'hot'] as const).map(b => {
              const Icon = BAND_ICONS[b];
              return (
                <Card key={b} className={BAND_COLORS[b]}>
                  <CardContent className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider">{b}</p>
                      <p className="text-2xl font-bold font-mono">{bandCounts[b]}</p>
                    </div>
                    <Icon className="h-6 w-6 opacity-80" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score a Lead (Heuristic · weighted sum)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Lead ID</Label>
                  <Input
                    value={leadId}
                    onChange={e => setLeadId(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="col-span-2 text-xs text-muted-foreground self-end pb-2">
                  Bands: cold &lt; {BAND_THRESHOLDS.warm} ≤ warm &lt; {BAND_THRESHOLDS.hot} ≤ hot
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Signal</TableHead>
                    <TableHead className="w-32">Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.map((s, i) => (
                    <TableRow key={s.signal}>
                      <TableCell className="font-mono text-xs">{s.signal}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={s.weight}
                          onChange={e => updateSignalWeight(i, Number(e.target.value))}
                          className="h-8 font-mono"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button onClick={handleScore} className="gap-1">
                <Sparkles className="h-4 w-4" /> Score Lead
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Scores</CardTitle>
            </CardHeader>
            <CardContent>
              {scores.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scores yet — score a lead above.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Band</TableHead>
                      <TableHead>Model</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map(s => (
                      <TableRow key={s.lead_id}>
                        <TableCell className="font-mono text-xs">{s.lead_id}</TableCell>
                        <TableCell className="font-mono">{s.score}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={BAND_COLORS[s.band]}>
                            {s.band}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{s.model}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Journey Builder ──────────────────────────────────────── */}
        <TabsContent value="journeys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Workflow className="h-4 w-4" /> Build Journey
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={journeyName} onChange={e => setJourneyName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Trigger</Label>
                  <Input value={trigger} onChange={e => setTrigger(e.target.value)} className="font-mono" />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Step</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Delay (days)</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {steps.map((s, i) => (
                    <TableRow key={s.step_id}>
                      <TableCell className="font-mono text-xs">{s.step_id}</TableCell>
                      <TableCell>
                        <Select
                          value={s.channel}
                          onValueChange={(v) => updateStep(i, { channel: v as JourneyChannel })}
                        >
                          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {JOURNEY_CHANNELS.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={s.delay_days}
                          onChange={e => updateStep(i, { delay_days: Number(e.target.value) })}
                          className="h-8 w-20 font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={s.template_ref}
                          onChange={e => updateStep(i, { template_ref: e.target.value })}
                          className="h-8 font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => removeStep(i)}>×</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addStep}>+ Step</Button>
                <Button onClick={handleSaveJourney}>Save Journey</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Saved Journeys</CardTitle>
            </CardHeader>
            <CardContent>
              {journeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No journeys yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Steps</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {journeys.map(j => (
                      <TableRow key={j.journey_id}>
                        <TableCell>{j.name}</TableCell>
                        <TableCell className="font-mono text-xs">{j.trigger}</TableCell>
                        <TableCell className="font-mono">{j.steps.length}</TableCell>
                        <TableCell>
                          <Badge variant={j.active ? 'default' : 'outline'}>
                            {j.active ? 'active' : 'paused'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Enrollment & Dispatch ────────────────────────────────── */}
        <TabsContent value="enroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" /> Enroll &amp; Fire (rail orchestration)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Lead ID</Label>
                  <Input
                    value={enrollLeadId}
                    onChange={e => setEnrollLeadId(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Journey</Label>
                  <Select value={selectedJourneyId} onValueChange={setSelectedJourneyId}>
                    <SelectTrigger><SelectValue placeholder="Select a journey" /></SelectTrigger>
                    <SelectContent>
                      {journeys.map(j => (
                        <SelectItem key={j.journey_id} value={j.journey_id}>{j.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleEnroll}>Enroll Lead</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enrollments &amp; Step Fire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No enrollments yet.</p>
              ) : (
                enrollments.map(e => {
                  const j = journeys.find(x => x.journey_id === e.journey_id);
                  if (!j) return null;
                  return (
                    <div key={e.enrollment_id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono">{e.lead_id} → {j.name}</span>
                        <Badge variant="outline">{e.status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {j.steps.map(s => (
                          <Button
                            key={s.step_id}
                            size="sm"
                            variant="outline"
                            onClick={() => handleFireStep(j, s)}
                            className="font-mono text-xs"
                          >
                            Fire {s.step_id} · {s.channel}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MarketingAutomationPage;
