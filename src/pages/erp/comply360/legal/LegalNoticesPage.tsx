/**
 * @file        src/pages/erp/comply360/legal/LegalNoticesPage.tsx
 * @purpose     Sprint 76b · Legal & Notices mega-menu shell · ITR-6 + Stamp Duty sub-tabs.
 *              First live surface under the 'legal' sidebar group (was Coming Soon since S69).
 * @sprint      Sprint 76b · T-Phase-5.A.1.8-PASS-B · Block 6 · PATTERN-S70b
 * @decisions   D-S69-1 (NATIVE) · DP-S76-3 (Pass B wires legal mega-menu)
 * @disciplines FR-7 · FR-13 · FR-106
 */
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ITR6Page from './ITR6Page';
import StampDutyPage from './StampDutyPage';

type SubTab = 'itr6' | 'stamp';

export default function LegalNoticesPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('itr6');
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="itr6">ITR-6 (Company Return)</TabsTrigger>
          <TabsTrigger value="stamp">Stamp Duty Register</TabsTrigger>
        </TabsList>
        <TabsContent value="itr6"><ITR6Page /></TabsContent>
        <TabsContent value="stamp"><StampDutyPage /></TabsContent>
      </Tabs>
    </div>
  );
}
