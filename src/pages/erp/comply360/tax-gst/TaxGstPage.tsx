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
import GSTR3BNativePage from './GSTR3BNativePage';
import GSTR9NativePage from './GSTR9NativePage';
import GSTR9CNativePage from './GSTR9CNativePage';
import IMSPanelPage from './IMSPanelPage';
import ReconciliationPanel from './ReconciliationPanel';
import ExtendedReturnsPage from './extended/ExtendedReturnsPage';

type SubTab = 'gstr1' | 'gstr1a' | 'gstr2b' | 'gstr3b' | 'gstr9' | 'gstr9c' | 'ims' | 'recon' | 'extended';

export default function TaxGstPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('gstr1');
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="gstr1">GSTR-1</TabsTrigger>
          <TabsTrigger value="gstr1a">GSTR-1A</TabsTrigger>
          <TabsTrigger value="gstr2b">GSTR-2B</TabsTrigger>
          <TabsTrigger value="gstr3b">GSTR-3B</TabsTrigger>
          <TabsTrigger value="gstr9">GSTR-9</TabsTrigger>
          <TabsTrigger value="gstr9c">GSTR-9C</TabsTrigger>
          <TabsTrigger value="ims">IMS</TabsTrigger>
          <TabsTrigger value="recon">Reconciliation</TabsTrigger>
          <TabsTrigger value="extended">Extended Returns</TabsTrigger>
        </TabsList>
        <TabsContent value="gstr1"><GSTR1NativePage /></TabsContent>
        <TabsContent value="gstr1a"><GSTR1ANativePage /></TabsContent>
        <TabsContent value="gstr2b"><GSTR2BNativePage /></TabsContent>
        <TabsContent value="gstr3b"><GSTR3BNativePage /></TabsContent>
        <TabsContent value="gstr9"><GSTR9NativePage /></TabsContent>
        <TabsContent value="gstr9c"><GSTR9CNativePage /></TabsContent>
        <TabsContent value="ims"><IMSPanelPage /></TabsContent>
        <TabsContent value="recon"><ReconciliationPanel /></TabsContent>
        <TabsContent value="extended"><ExtendedReturnsPage /></TabsContent>
      </Tabs>
    </div>
  );
}
