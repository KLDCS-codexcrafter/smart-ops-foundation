/**
 * @file        src/pages/erp/comply360/tds/TdsPage.tsx
 * @purpose     Comply360 TDS module shell · sub-tabs for 194Q · 194-O · SFT · Form 26AS Reco
 * @sprint      Sprint 72 · T-Phase-5.A.1.4 · Block 7 · PATTERN-S70b (tab-shell, ratified)
 * @decisions   D-S69-1 (100% native) · DP-S72-1 (Option C · NEW 24th mega-menu)
 * @disciplines FR-7 · FR-13
 */
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import TDS194QPage from './TDS194QPage';
import TDS194OPage from './TDS194OPage';
import SFTPage from './SFTPage';
import Form26ASRecoPage from './Form26ASRecoPage';

type SubTab = 'tds194q' | 'tds194o' | 'sft' | 'form26as';

export default function TdsPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('tds194q');
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="tds194q">194Q</TabsTrigger>
          <TabsTrigger value="tds194o">194-O</TabsTrigger>
          <TabsTrigger value="sft">SFT (61A)</TabsTrigger>
          <TabsTrigger value="form26as">26AS Reco</TabsTrigger>
        </TabsList>
        <TabsContent value="tds194q"><TDS194QPage /></TabsContent>
        <TabsContent value="tds194o"><TDS194OPage /></TabsContent>
        <TabsContent value="sft"><SFTPage /></TabsContent>
        <TabsContent value="form26as"><Form26ASRecoPage /></TabsContent>
      </Tabs>
    </div>
  );
}
