/**
 * @file        src/pages/erp/comply360/external-audit/ExternalAuditPage.tsx
 * @purpose     Comply360 External Audit shell · S82 extended to 7 tabs
 * @sprint      Sprint 82 · T-Phase-5.B.2.3 · FR-106 13th scenario
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Form3CAPage from './Form3CAPage';
import Form3CBPage from './Form3CBPage';
import Form3CDPage from './Form3CDPage';
import {
  generateEngagementLetter, calculateMateriality, compileFinalAuditPack,
  listEngagementLetters, listFinalAuditPacks, listMaterialityCalculations,
} from '@/lib/comply360-external-audit-engine';
import {
  generateSurvivalKit, listChecklistItems, listLikelyQuestions, listSurvivalKits,
} from '@/lib/comply360-survival-kit-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';

type SubTab = '3ca' | '3cb' | '3cd' | 'engagement' | 'materiality' | 'survival-kit' | 'final-pack';

const DEMO_ENGAGEMENT = 'demo-engagement-s82';
const DEMO_FY = 'FY 2025-26';
const DEMO_ENTITY = 'Operix Demo Pvt Ltd';

export default function ExternalAuditPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('3cd');
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="3ca">Form 3CA</TabsTrigger>
          <TabsTrigger value="3cb">Form 3CB</TabsTrigger>
          <TabsTrigger value="3cd">Form 3CD</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="materiality">Materiality</TabsTrigger>
          <TabsTrigger value="survival-kit">Survival Kit</TabsTrigger>
          <TabsTrigger value="final-pack">Final Audit Pack</TabsTrigger>
        </TabsList>
        <TabsContent value="3ca"><Form3CAPage /></TabsContent>
        <TabsContent value="3cb"><Form3CBPage /></TabsContent>
        <TabsContent value="3cd"><Form3CDPage /></TabsContent>
        <TabsContent value="engagement"><EngagementPanel bap={bap} /></TabsContent>
        <TabsContent value="materiality"><MaterialityPanel bap={bap} /></TabsContent>
        <TabsContent value="survival-kit"><SurvivalKitPanel bap={bap} /></TabsContent>
        <TabsContent value="final-pack"><FinalAuditPackPanel bap={bap} /></TabsContent>
      </Tabs>
    </div>
  );
}

function EngagementPanel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [count, setCount] = useState(listEngagementLetters(DEMO_ENGAGEMENT).length);
  return (
    <div className="space-y-3 p-2">
      <h3 className="text-lg font-semibold">Engagement Letter</h3>
      <Button onClick={() => {
        generateEngagementLetter({
          engagement_id: DEMO_ENGAGEMENT,
          ca_firm_name: 'Demo & Co. Chartered Accountants',
          auditor_name: 'CA Demo',
          icai_membership_no: '000000',
          entity_name: DEMO_ENTITY,
          fy: DEMO_FY,
          scope_of_engagement: 'Statutory audit under Companies Act 2013',
          fees_inr: 500000,
          estimated_completion_weeks: 8,
          generated_by_bap: bap,
        });
        setCount((c) => c + 1);
      }}>Generate Engagement Letter</Button>
      <p className="text-sm text-muted-foreground">Letters on file: <span className="font-mono">{count}</span></p>
    </div>
  );
}

function MaterialityPanel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [count, setCount] = useState(listMaterialityCalculations(DEMO_ENGAGEMENT).length);
  return (
    <div className="space-y-3 p-2">
      <h3 className="text-lg font-semibold">Materiality Calculator</h3>
      <Button onClick={() => {
        calculateMateriality({
          engagement_id: DEMO_ENGAGEMENT,
          benchmark: 'profit_before_tax',
          benchmark_value_inr: 5_00_00_000,
          overall_materiality_pct: 5,
          performance_materiality_pct: 75,
          specific_materiality_items: [],
          computed_by_bap: bap,
        });
        setCount((c) => c + 1);
      }}>Calculate Materiality (5% PBT)</Button>
      <p className="text-sm text-muted-foreground">Calculations on file: <span className="font-mono">{count}</span></p>
    </div>
  );
}

function SurvivalKitPanel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [kits, setKits] = useState(listSurvivalKits(DEMO_ENGAGEMENT));
  const latest = kits[kits.length - 1] ?? null;
  return (
    <div className="space-y-3 p-2">
      <h3 className="text-lg font-semibold">Auditor Pre-Audit Survival Kit (OOB-4)</h3>
      <Button onClick={() => {
        generateSurvivalKit({ engagement_id: DEMO_ENGAGEMENT, fy: DEMO_FY, generated_by_bap: bap });
        setKits(listSurvivalKits(DEMO_ENGAGEMENT));
      }}>Generate Survival Kit</Button>
      {latest && (
        <div className="rounded-lg border border-border p-3 text-sm">
          <p>Readiness: <span className="font-mono">{latest.readiness_percentage}%</span> · <span className="uppercase">{latest.readiness_band}</span></p>
          <p>Checklist items: <span className="font-mono">{latest.total_checklist_items}</span> · Ready: <span className="font-mono">{latest.ready_items_count}</span></p>
          <p>Likely auditor questions: <span className="font-mono">{latest.total_likely_questions}</span></p>
          <p className="text-muted-foreground">Areas covered: <span className="font-mono">{new Set(listChecklistItems(latest.id).map((i) => i.document_area)).size}</span> · Critical Qs: <span className="font-mono">{listLikelyQuestions(latest.id, { priority: 'critical' }).length}</span></p>
        </div>
      )}
    </div>
  );
}

function FinalAuditPackPanel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [packs, setPacks] = useState(listFinalAuditPacks(DEMO_ENGAGEMENT));
  const latest = packs[packs.length - 1] ?? null;
  return (
    <div className="space-y-3 p-2">
      <h3 className="text-lg font-semibold">Final Audit Pack Compiler (THE HEADLINE)</h3>
      <Button onClick={() => {
        compileFinalAuditPack({
          engagement_id: DEMO_ENGAGEMENT,
          fy: DEMO_FY,
          entity_name: DEMO_ENTITY,
          generated_by_bap: bap,
        });
        setPacks(listFinalAuditPacks(DEMO_ENGAGEMENT));
      }}>Compile Final Audit Pack</Button>
      {latest && (
        <div className="rounded-lg border border-border p-3 text-sm space-y-1">
          <p>Pack ID: <span className="font-mono">{latest.id}</span> · {latest.size_bytes} bytes</p>
          <p>Rule 11(g) report: <span className="font-mono">{latest.artifacts.rule_11g_report_id ?? '—'}</span></p>
          <p>IA handoff: <span className="font-mono">{latest.artifacts.ia_handoff_package_id ?? '—'}</span></p>
          <p>Form 3CD: <span className="font-mono">{latest.artifacts.form_3cd_id ?? '—'}</span></p>
          <p>Survival Kit: <span className="font-mono">{latest.artifacts.survival_kit_id ?? '—'}</span></p>
          <p>Risk assessments: <span className="font-mono">{latest.artifacts.risk_assessment_count}</span></p>
        </div>
      )}
    </div>
  );
}
