/**
 * @file        src/pages/erp/comply360/exim/foreign-tax/ForeignTaxPage.tsx
 * @purpose     Sprint 77b · Foreign Tax sub-shell (5 sub-tabs) · exim 4th tab.
 *              FR-106 recursive nav · pattern-match ExtendedReturnsPage.
 * @sprint      Sprint 77b · T-Phase-5.A.1.9-PASS-B · Block 5
 * @decisions   DP-S77-1 (Foreign-Tax cluster → exim 4th tab sub-shell)
 * @disciplines FR-7 · FR-13 · FR-106
 */
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Form3CEBPage from './Form3CEBPage';
import Form15CAPage from './Form15CAPage';
import MasterFilePage from './MasterFilePage';
import CbCRPage from './CbCRPage';
import EqualisationLevyPage from './EqualisationLevyPage';

type SubTab = '3ceb' | '15ca' | 'master' | 'cbcr' | 'eqlevy';

export default function ForeignTaxPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('3ceb');
  return (
    <div className="p-2">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="3ceb">Form 3CEB</TabsTrigger>
          <TabsTrigger value="15ca">Form 15CA / 15CB</TabsTrigger>
          <TabsTrigger value="master">Master File (3CEAA)</TabsTrigger>
          <TabsTrigger value="cbcr">CbCR (3CEAD)</TabsTrigger>
          <TabsTrigger value="eqlevy">Equalisation Levy</TabsTrigger>
        </TabsList>
        <TabsContent value="3ceb"><Form3CEBPage /></TabsContent>
        <TabsContent value="15ca"><Form15CAPage /></TabsContent>
        <TabsContent value="master"><MasterFilePage /></TabsContent>
        <TabsContent value="cbcr"><CbCRPage /></TabsContent>
        <TabsContent value="eqlevy"><EqualisationLevyPage /></TabsContent>
      </Tabs>
    </div>
  );
}
