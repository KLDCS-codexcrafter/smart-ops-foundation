/**
 * @file        src/pages/erp/comply360/tax-gst/TaxGstPage.tsx
 * @purpose     Comply360 Tax & GST module shell · sub-tabs for GSTR-1 · GSTR-1A · GSTR-2B · IMS
 * @sprint      Sprint 70b · T-Phase-5.A.1.2-PASS-B · Block 5 (wiring) · Q-LOCK-3-P1-D
 * @decisions   D-S69-1 (100% native) · DP-S70-4 (4 NEW surfaces)
 * @iso         Usability · Maintainability
 * @disciplines FR-7 · FR-13
 */
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import GSTR1NativePage from './GSTR1NativePage';
import GSTR1ANativePage from './GSTR1ANativePage';
import GSTR2BNativePage from './GSTR2BNativePage';
import IMSPanelPage from './IMSPanelPage';

type SubTab = 'gstr1' | 'gstr1a' | 'gstr2b' | 'ims';

export default function TaxGstPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('gstr1');
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="gstr1">GSTR-1</TabsTrigger>
          <TabsTrigger value="gstr1a">GSTR-1A</TabsTrigger>
          <TabsTrigger value="gstr2b">GSTR-2B</TabsTrigger>
          <TabsTrigger value="ims">IMS</TabsTrigger>
        </TabsList>
        <TabsContent value="gstr1"><GSTR1NativePage /></TabsContent>
        <TabsContent value="gstr1a"><GSTR1ANativePage /></TabsContent>
        <TabsContent value="gstr2b"><GSTR2BNativePage /></TabsContent>
        <TabsContent value="ims"><IMSPanelPage /></TabsContent>
      </Tabs>
    </div>
  );
}
