/**
 * @file        src/pages/erp/comply360/ai-control-center/AIControlCenterPage.tsx
 * @purpose     AI Control Center · 11-module orchestrator · OOB-2 ROI + OOB-9 Tutor
 * @sprint      Sprint 87 · T-Phase-5.D.4.2 · DP-S87-14 · FLOOR 4 CLOSES
 * @note        Fixed grid-cols-4 (with multi-row wrap) avoids dynamic class generation for the 11-module list.
 */
import { memo, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain } from 'lucide-react';
import {
  getAIModules, listAIModuleExecutions, listROICalculations,
  listTutorSessions, listRecommendations,
} from '@/lib/comply360-ai-control-center-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';

type SubTab = 'modules' | 'roi' | 'tutor' | 'recommendations';

export default function AIControlCenterPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('modules');
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());
  const modules = useMemo(() => getAIModules(), []);

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">AI Control Center</h1>
        <span className="ml-2 text-sm text-muted-foreground">11-module orchestrator · OOB-2 + OOB-9 · BAP {bap}</span>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="modules">Modules ({modules.length})</TabsTrigger>
          <TabsTrigger value="roi">ROI (OOB-2)</TabsTrigger>
          <TabsTrigger value="tutor">Tutor (OOB-9)</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="modules">
          <div className="p-6 grid grid-cols-4 gap-3">
            {modules.map((m) => (
              <AIModuleCard key={m.module_type} module={m} runs={listAIModuleExecutions({ module_type: m.module_type }).length} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roi">
          <Card className="m-6 p-4">
            <h3 className="font-semibold mb-2">Compliance ROI Calculations ({listROICalculations().length})</h3>
            <p className="text-xs text-muted-foreground">OOB-2 · cost savings / time savings / payback months.</p>
          </Card>
        </TabsContent>

        <TabsContent value="tutor">
          <Card className="m-6 p-4">
            <h3 className="font-semibold mb-2">AI Tutor Sessions ({listTutorSessions().length})</h3>
            <p className="text-xs text-muted-foreground">OOB-9 · context-aware compliance Q&amp;A with citations.</p>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card className="m-6 p-4">
            <h3 className="font-semibold mb-2">AI Recommendations ({listRecommendations().length})</h3>
            <p className="text-xs text-muted-foreground">Cross-module priorities · open / acted-upon / dismissed.</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// DP-S88-3 · React.memo perf refactor · functional logic 0-DIFF
interface AIModuleCardProps {
  module: { module_type: string; label: string; description: string; oob_ref: string | null };
  runs: number;
}

const AIModuleCard = memo(function AIModuleCard({ module: m, runs }: AIModuleCardProps): JSX.Element {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm">{m.label}</span>
        {m.oob_ref && <Badge variant="secondary">{m.oob_ref}</Badge>}
      </div>
      <div className="text-xs text-muted-foreground">{m.description}</div>
      <div className="mt-2 text-xs font-mono">runs: {runs}</div>
    </Card>
  );
});
