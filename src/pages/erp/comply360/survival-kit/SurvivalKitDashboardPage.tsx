/**
 * @file        src/pages/erp/comply360/survival-kit/SurvivalKitDashboardPage.tsx
 * @purpose     Auditor Survival Kit dashboard · OOB-4 · readiness % · checklist · likely Q&A · 30th Standalone Page
 * @sprint      Sprint 103 · T-Phase-6.A.1.2 · Arc 1 UX surfacing · DP-PH6-6A
 * @reads-from  comply360-survival-kit-engine (FR-44 · USE-SITE READ · engine 0-DIFF)
 *              · computeReadinessPercentage · generateSurvivalKit · listChecklistItems · listLikelyQuestions
 * [JWT] Phase 8: GET /api/comply360/survival-kit/* (engine wraps; surface unchanged)
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LifeBuoy, ListChecks, HelpCircle } from 'lucide-react';
import {
  listSurvivalKits,
  listChecklistItems,
  listLikelyQuestions,
  computeReadinessPercentage,
  mapReadinessBand,
  generateSurvivalKit,
} from '@/lib/comply360-survival-kit-engine';

const ENGAGEMENT = 'ENG-DEMO-FY26';
const FY = '2025-26';

function bandColor(band: ReturnType<typeof mapReadinessBand>): 'default' | 'secondary' | 'destructive' {
  if (band === 'audit_ready') return 'default';
  if (band === 'not_ready') return 'destructive';
  return 'secondary';
}

export default function SurvivalKitDashboardPage(): JSX.Element {
  const [tab, setTab] = useState<'overview' | 'checklist' | 'questions'>('overview');

  const kits = useMemo(() => listSurvivalKits(ENGAGEMENT), []);
  const kit = kits[0] ?? null;
  const items = useMemo(() => (kit ? listChecklistItems(kit.id) : []), [kit]);
  const questions = useMemo(() => (kit ? listLikelyQuestions(kit.id) : []), [kit]);
  const pct = useMemo(() => computeReadinessPercentage(items), [items]);
  const band = mapReadinessBand(pct);

  const handleGenerate = (): void => {
    if (kit) return;
    // [JWT] POST /api/comply360/survival-kit/generate — wraps engine.generateSurvivalKit
    generateSurvivalKit({ engagement_id: ENGAGEMENT, fy: FY, generated_by_bap: 'mr-b-auditor-1' });
  };

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <LifeBuoy className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Auditor Survival Kit · OOB-4</h1>
          <p className="text-sm text-muted-foreground">
            Standalone Page #30 · reads <span className="font-mono">comply360-survival-kit-engine</span> · pre-audit checklist · likely auditor Q&amp;A
          </p>
        </div>
        <Badge variant={bandColor(band)}>{band.replace(/_/g, ' ')}</Badge>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Readiness</div>
          <div className="text-2xl font-bold font-mono">{pct}%</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Checklist items</div>
          <div className="text-2xl font-bold font-mono">{items.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Ready</div>
          <div className="text-2xl font-bold font-mono text-success">
            {items.filter((i) => i.status === 'ready').length}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Likely Q&amp;A</div>
          <div className="text-2xl font-bold font-mono">{questions.length}</div>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="questions">Likely questions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="p-4">
            {kit ? (
              <div className="text-xs text-muted-foreground space-y-1 font-mono">
                <div>Kit ID: {kit.id}</div>
                <div>Engagement: {kit.engagement_id} · FY {kit.fy}</div>
                <div>Generated: {kit.generated_at.slice(0, 10)}</div>
                <div>Ready / Pending: {kit.ready_items_count} / {kit.pending_items_count}</div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No Survival Kit generated for engagement {ENGAGEMENT}.{' '}
                <button type="button" className="underline text-primary" onClick={handleGenerate}>
                  Generate now
                </button>
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
          <Card className="p-4">
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">No checklist items · generate the kit first.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="text-left p-2"><ListChecks className="inline h-3 w-3 mr-1" />Document</th>
                    <th className="text-left p-2">Area</th>
                    <th className="text-left p-2">CARO</th>
                    <th className="text-left p-2">Priority</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id} className="border-t border-border">
                      <td className="p-2">{i.document_name}</td>
                      <td className="p-2 text-muted-foreground">{i.document_area.replace(/_/g, ' ')}</td>
                      <td className="p-2 font-mono">{i.caro_clause_ref ?? '—'}</td>
                      <td className="p-2">{i.priority}</td>
                      <td className="p-2">
                        <Badge variant={i.status === 'ready' ? 'default' : 'secondary'}>{i.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="questions">
          <div className="space-y-2">
            {questions.length === 0 ? (
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">No likely-question bank · generate the kit first.</p>
              </Card>
            ) : (
              questions.map((q) => (
                <Card key={q.id} className="p-4">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{q.question_text}</p>
                      <p className="text-xs text-muted-foreground mt-1">CARO ref: <span className="font-mono">{q.caro_clause_ref ?? '—'}</span> · priority <span className="font-mono">{q.priority}</span></p>
                      <p className="text-xs text-muted-foreground mt-2"><span className="font-semibold">Suggested:</span> {q.suggested_response}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
