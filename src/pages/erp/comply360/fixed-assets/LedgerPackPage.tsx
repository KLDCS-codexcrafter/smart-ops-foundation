/**
 * @file        src/pages/erp/comply360/fixed-assets/LedgerPackPage.tsx
 * @purpose     Sprint 79d · Fixed Assets shell · tab-shell pattern (FR-106 10th scenario).
 *              Health tab (default) hosts FixedAssetsHealthPage migrated from Dashboard.tsx.
 *              Ledger Pack tab preserves the original S79a redirect-target stub for future Sprint 80+ enrichment.
 * @sprint      Sprint 79d · T-Phase-5.A.1.11-HYGIENE-D
 * @decisions   DP-S79d-4 (tab-shell promotion) · DP-S79-2 carry-forward (stub for Floor 2-4 fill)
 */
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import FixedAssetsHealthPage from './FixedAssetsHealthPage';

export default function LedgerPackPage(): JSX.Element {
  return (
    <Tabs defaultValue="health" className="w-full p-6">
      <TabsList>
        <TabsTrigger value="health">Health</TabsTrigger>
        <TabsTrigger value="ledger-pack">Ledger Pack</TabsTrigger>
      </TabsList>
      <TabsContent value="health">
        <FixedAssetsHealthPage />
      </TabsContent>
      <TabsContent value="ledger-pack">
        <div className="p-6">
          <h1 className="text-xl font-semibold">Fixed Assets · Ledger Pack</h1>
          <p className="text-sm text-muted-foreground mt-2">
            FA Ledger Pack · stub · Floor 2-4 enrichment by owning sprint (typically S80+ FA enrichment or dedicated FA hygiene sprint).
            Redirect target from `/erp/fincore/statutory-fa-pack/FALedgerPackReport` (Sprint 79c sweep).
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
