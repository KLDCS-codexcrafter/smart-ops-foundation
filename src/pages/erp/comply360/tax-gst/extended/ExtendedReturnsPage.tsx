/**
 * @file        src/pages/erp/comply360/tax-gst/extended/ExtendedReturnsPage.tsx
 * @purpose     Extended Returns sub-shell · nested 9-tab shell on TaxGstPage
 * @sprint      Sprint 75 · T-Phase-5.A.1.7 · Q28 Part 1
 * @decisions   DP-S75-1 (Option A · sub-shell) · FR-106 recursive nav
 * @disciplines FR-7 · FR-13
 */
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import GSTR4Page from './GSTR4Page';
import CMP08Page from './CMP08Page';
import GSTR5Page from './GSTR5Page';
import GSTR6Page from './GSTR6Page';
import GSTR7Page from './GSTR7Page';
import GSTR8Page from './GSTR8Page';
import GSTR10Page from './GSTR10Page';
import ITC03Page from './ITC03Page';
import DRC03Page from './DRC03Page';
import ITC04Page from './ITC04Page';
import REG01Page from './REG01Page';
import REG31Page from './REG31Page';

type ExtendedTab = 'gstr4' | 'cmp08' | 'gstr5' | 'gstr6' | 'gstr7' | 'gstr8' | 'gstr10' | 'itc03' | 'drc03' | 'itc04' | 'reg01' | 'reg31';

export default function ExtendedReturnsPage(): JSX.Element {
  const [tab, setTab] = useState<ExtendedTab>('gstr4');
  return (
    <div className="p-2">
      <Tabs value={tab} onValueChange={(v) => setTab(v as ExtendedTab)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="gstr4">GSTR-4</TabsTrigger>
          <TabsTrigger value="cmp08">CMP-08</TabsTrigger>
          <TabsTrigger value="gstr5">GSTR-5</TabsTrigger>
          <TabsTrigger value="gstr6">GSTR-6</TabsTrigger>
          <TabsTrigger value="gstr7">GSTR-7</TabsTrigger>
          <TabsTrigger value="gstr8">GSTR-8</TabsTrigger>
          <TabsTrigger value="gstr10">GSTR-10</TabsTrigger>
          <TabsTrigger value="itc03">ITC-03</TabsTrigger>
          <TabsTrigger value="drc03">DRC-03</TabsTrigger>
          <TabsTrigger value="itc04">ITC-04</TabsTrigger>
          <TabsTrigger value="reg01">REG-01</TabsTrigger>
          <TabsTrigger value="reg31">REG-31</TabsTrigger>
        </TabsList>
        <TabsContent value="gstr4"><GSTR4Page /></TabsContent>
        <TabsContent value="cmp08"><CMP08Page /></TabsContent>
        <TabsContent value="gstr5"><GSTR5Page /></TabsContent>
        <TabsContent value="gstr6"><GSTR6Page /></TabsContent>
        <TabsContent value="gstr7"><GSTR7Page /></TabsContent>
        <TabsContent value="gstr8"><GSTR8Page /></TabsContent>
        <TabsContent value="gstr10"><GSTR10Page /></TabsContent>
        <TabsContent value="itc03"><ITC03Page /></TabsContent>
        <TabsContent value="drc03"><DRC03Page /></TabsContent>
        <TabsContent value="itc04"><ITC04Page /></TabsContent>
        <TabsContent value="reg01"><REG01Page /></TabsContent>
        <TabsContent value="reg31"><REG31Page /></TabsContent>
      </Tabs>
    </div>
  );
}
