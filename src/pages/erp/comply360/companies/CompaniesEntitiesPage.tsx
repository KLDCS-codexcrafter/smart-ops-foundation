/**
 * @file        src/pages/erp/comply360/companies/CompaniesEntitiesPage.tsx
 * @purpose     Sprint 77b · Companies & Entities mega-menu shell (was Coming Soon since S69).
 *              Tabs: Schedule M · CARO Extended · CFR Part 11 (deep-link to QualiCheck).
 * @sprint      Sprint 77b · T-Phase-5.A.1.9-PASS-B · Block 3 · PATTERN-S76b
 * @decisions   D-S69-1 (NATIVE) · DP-S77-1 (companies hosts Schedule-M / CARO-Ext / CFR-Part-11)
 * @disciplines FR-7 · FR-13 · FR-106
 */
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ScheduleMPage from './ScheduleMPage';
import CAROExtendedPage from './CAROExtendedPage';
import CFRPart11DeeplinkPage from './CFRPart11DeeplinkPage';

type SubTab = 'schedule-m' | 'caro-extended' | 'cfr-part-11';

export default function CompaniesEntitiesPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('schedule-m');
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="schedule-m">Schedule M (GMP)</TabsTrigger>
          <TabsTrigger value="caro-extended">CARO Extended (3(ii)–3(xxi))</TabsTrigger>
          <TabsTrigger value="cfr-part-11">CFR Part 11</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule-m"><ScheduleMPage /></TabsContent>
        <TabsContent value="caro-extended"><CAROExtendedPage /></TabsContent>
        <TabsContent value="cfr-part-11"><CFRPart11DeeplinkPage /></TabsContent>
      </Tabs>
    </div>
  );
}
