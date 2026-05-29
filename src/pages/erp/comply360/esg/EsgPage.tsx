/**
 * @file        src/pages/erp/comply360/esg/EsgPage.tsx
 * @purpose     Sprint 77b · ESG / Environment / Safety mega-menu shell (was Coming Soon since S69).
 *              Single BRSR tab now · extensible for S79 ESG/Safety surfaces.
 * @sprint      Sprint 77b · T-Phase-5.A.1.9-PASS-B · Block 4 · PATTERN-S76b
 * @decisions   D-S69-1 (NATIVE) · DP-S77-1 (esg hosts BRSR Comprehensive)
 * @disciplines FR-7 · FR-13 · FR-106
 */
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import BRSRComprehensivePage from './BRSRComprehensivePage';

type SubTab = 'brsr';

export default function EsgPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('brsr');
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="brsr">BRSR Comprehensive (9 principles)</TabsTrigger>
        </TabsList>
        <TabsContent value="brsr"><BRSRComprehensivePage /></TabsContent>
      </Tabs>
    </div>
  );
}
