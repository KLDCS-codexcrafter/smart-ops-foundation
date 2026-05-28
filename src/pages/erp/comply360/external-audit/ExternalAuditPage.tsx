/**
 * @file        src/pages/erp/comply360/external-audit/ExternalAuditPage.tsx
 * @purpose     Comply360 External Audit shell · sub-tabs for 3CA · 3CB · 3CD
 * @sprint      Sprint 74a · T-Phase-5.A.1.6-PASS-A · Block 7 · Q19 Tax Audit
 * @decisions   D-S69-1 (100% native) · DP-S74-3 (3CD reads caro-2020 · FR-19 · 0-DIFF)
 * @disciplines FR-7 · FR-13 · FR-19
 */
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Form3CAPage from './Form3CAPage';
import Form3CBPage from './Form3CBPage';
import Form3CDPage from './Form3CDPage';

type SubTab = '3ca' | '3cb' | '3cd';

export default function ExternalAuditPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('3cd');
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="3ca">Form 3CA</TabsTrigger>
          <TabsTrigger value="3cb">Form 3CB</TabsTrigger>
          <TabsTrigger value="3cd">Form 3CD</TabsTrigger>
        </TabsList>
        <TabsContent value="3ca"><Form3CAPage /></TabsContent>
        <TabsContent value="3cb"><Form3CBPage /></TabsContent>
        <TabsContent value="3cd"><Form3CDPage /></TabsContent>
      </Tabs>
    </div>
  );
}
