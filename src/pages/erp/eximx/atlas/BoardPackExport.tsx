/**
 * @file        src/pages/erp/eximx/atlas/BoardPackExport.tsx
 * @purpose     Board Pack PDF generation UI · button + preview · jspdf precedent
 * @sprint      T-Phase-1.EX-11-Atlas-FULL-BCD-FXWhatIf-BoardPack
 * @decisions   EX-11-Q4=a + Q14=a · jspdf + jspdf-autotable already installed
 * @disciplines FR-30 · FR-50 · FR-58 · FR-9
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { downloadBoardPackPDF } from '@/lib/board-pack-pdf-engine';

export function BoardPackExport(): JSX.Element {
  const handleDownload = (): void => {
    downloadBoardPackPDF({
      entity_id: 'sinha-trading',
      entity_name: 'Sinha Trading Pvt Ltd',
      fy: 'FY 2025-26',
      generated_at: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-bold"><FileText className="w-5 h-5 inline mr-2" />Board Pack PDF Export</h2>
        <p className="text-sm text-muted-foreground">7-section institutional deliverable · Cover · KPIs · 21 Moats · Top BoEs · Realisations · Vendors · DGFT Scrips · EWS signals</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Generate Board Pack</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>The Board Pack PDF compiles EximX state-of-the-arc for board review:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Section 1 · Cover (entity · FY · generated_at)</li>
            <li>Section 2 · KPI Summary (Moats · v7 Gaps · Superpowers · sprints · D-NEW)</li>
            <li>Section 3 · 21 Moat Status Grid (FULL · PRIMARY · LIVE)</li>
            <li>Section 4 · Top BoEs (latest 10 with lane + duty + status)</li>
            <li>Section 5 · Top Realisations (latest 10 with FEMA state + days since dispatch)</li>
            <li>Section 6 · Vendor Reliability Scorecard (composite scores + classification)</li>
            <li>Section 7 · DGFT Scrip Wallet (scrip register + utilization status)</li>
          </ul>
          <p className="text-xs text-muted-foreground italic">PDF library: jspdf + jspdf-autotable · already installed · institutional precedent: voucher-export-engine.ts + universal-export-engine.ts</p>
          <Button onClick={handleDownload} size="lg" className="w-full"><Download className="w-4 h-4 mr-2" />Download Board Pack PDF</Button>
        </CardContent>
      </Card>
    </div>
  );
}
