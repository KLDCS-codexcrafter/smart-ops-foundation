/**
 * @file        src/pages/erp/comply360/esg/EsgPage.tsx
 * @purpose     Sprint 79b · ESG / Environment / Safety mega-menu shell · 3-tab (Welcome promoted at S77b; S79b adds ESG/Safety per FR-106 9th scenario).
 * @sprint      Sprint 79b · T-Phase-5.A.1.11-PASS-B · Block 6 (extension of S77b shell)
 * @decisions   D-S69-1 (NATIVE) · DP-S77-1 · DP-S79-6 (ESG / Safety tab consumes esg-aggregator + deep-links)
 */
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import BRSRComprehensivePage from './BRSRComprehensivePage';
import ESGSafetyPage from './ESGSafetyPage';

type SubTab = 'brsr' | 'esg-safety';

export default function EsgPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('brsr');
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="brsr">BRSR Comprehensive (9 principles)</TabsTrigger>
          <TabsTrigger value="esg-safety">ESG / Safety</TabsTrigger>
        </TabsList>
        <TabsContent value="brsr"><BRSRComprehensivePage /></TabsContent>
        <TabsContent value="esg-safety"><ESGSafetyPage /></TabsContent>
      </Tabs>
    </div>
  );
}
