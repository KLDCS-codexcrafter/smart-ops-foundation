/**
 * @file        src/pages/erp/comply360/exim/EInvoiceEWayPage.tsx
 * @purpose     Comply360 e-invoice + e-way bill tab-shell · hosted under exim mega-menu
 * @sprint      Sprint 73b · T-Phase-5.A.1.5-PASS-B · Block 3 · PATTERN-S70b (tab-shell)
 * @decisions   D-S69-1 · DP-S73b-1 (3 surfaces under existing mega-menus · no sidebar/union mutation)
 * @disciplines FR-7 · FR-13 · FR-106
 */
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import EInvoicePage from './EInvoicePage';
import EWayBillPage from './EWayBillPage';
import EWB02Page from './EWB02Page';
import ForeignTaxPage from './foreign-tax/ForeignTaxPage';

type SubTab = 'einvoice' | 'eway' | 'ewb02' | 'foreigntax';

export default function EInvoiceEWayPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('einvoice');
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="einvoice">E-Invoice (IRN)</TabsTrigger>
          <TabsTrigger value="eway">E-Way Bill</TabsTrigger>
          <TabsTrigger value="ewb02">EWB-02 Consolidated</TabsTrigger>
          <TabsTrigger value="foreigntax">Foreign Tax</TabsTrigger>
        </TabsList>
        <TabsContent value="einvoice"><EInvoicePage /></TabsContent>
        <TabsContent value="eway"><EWayBillPage /></TabsContent>
        <TabsContent value="ewb02"><EWB02Page /></TabsContent>
        <TabsContent value="foreigntax"><ForeignTaxPage /></TabsContent>
      </Tabs>
    </div>
  );
}
