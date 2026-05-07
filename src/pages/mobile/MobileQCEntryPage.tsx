/**
 * @file     MobileQCEntryPage.tsx
 * @sprint   T-Phase-1.3-3b-pre-3 · Block G · D-645
 * @purpose  Mobile-optimized QC entry · table layout only · QR scan stub.
 *
 * NOTE: QR scan is a STUB · no working QR scanner utility in the codebase
 * (mirrors Q43=a drag-drop stub pattern from Card 3-PlantOps pre-3b).
 */
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, QrCode, Save } from 'lucide-react';
import { toast } from 'sonner';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { getQaInspection, completeInspection, updateInspectionLine } from '@/lib/qa-inspection-engine';
import type { QaInspectionRecord } from '@/types/qa-inspection';
import type { PassFailMode } from '@/types/qc-entry-mode';
import type { ProductionConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import { useProductionConfig } from '@/hooks/useProductionConfig';
import { PassFailLogicSelector } from '@/components/qc/PassFailLogicSelector';

export interface MobileQCEntryPageProps {
  inspectionId: string;
  onBack: () => void;
  entityCode: string;
  userId: string;
}

export default function MobileQCEntryPage({
  inspectionId, onBack, entityCode, userId,
}: MobileQCEntryPageProps): JSX.Element {
  const productionConfig: ProductionConfig = useProductionConfig();
  const [inspection, setInspection] = useState<QaInspectionRecord | null>(null);
  const [passFailMode, setPassFailMode] = useState<PassFailMode>('per_param_and');
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    setInspection(getQaInspection(inspectionId, entityCode));
  }, [inspectionId, entityCode]);

  const handleQrScan = (): void => {
    toast.info('QR scan · Coming in Phase 2 · Use line list for now');
  };

  const handleLineUpdate = async (lineId: string, qtyPassed: number, qtyFailed: number): Promise<void> => {
    await updateInspectionLine(inspectionId, lineId, qtyPassed, qtyFailed, null, entityCode, userId);
    setInspection(getQaInspection(inspectionId, entityCode));
  };

  const handleFinalize = async (): Promise<void> => {
    if (!inspection) return;
    setFinalizing(true);
    try {
      const result = await completeInspection(inspectionId, entityCode, userId, {
        passFailMode,
        productionConfig,
        itemQCParams: [],
      });
      if (result) {
        toast.success(`Finalized · ${result.status.toUpperCase()}`);
        onBack();
      }
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    } finally {
      setFinalizing(false);
    }
  };

  if (!inspection) return <div className="p-4">Loading…</div>;

  const scenario = (inspection as unknown as { qc_scenario?: string | null }).qc_scenario ?? 'unknown';

  return (
    <div className="min-h-screen bg-background">
      <OfflineIndicator />
      <div className="p-4 space-y-3 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={handleQrScan}>
            <QrCode className="h-4 w-4 mr-1" /> Scan QR
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="font-mono text-sm">{inspection.qa_no}</div>
            {inspection.production_order_no && (
              <div className="text-xs text-muted-foreground">PO: {inspection.production_order_no}</div>
            )}
            <Badge variant="outline" className="mt-2">{scenario}</Badge>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {inspection.lines.map(line => (
            <Card key={line.id}>
              <CardContent className="p-3 space-y-2">
                <div className="text-sm font-medium">{line.item_name}</div>
                <div className="text-xs text-muted-foreground">Qty inspected: {line.qty_inspected}</div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Pass"
                    className="h-8 w-24 text-sm font-mono"
                    defaultValue={line.qty_passed || ''}
                    onBlur={(e) => handleLineUpdate(line.id, Number(e.target.value), line.qty_failed)}
                  />
                  <Input
                    type="number"
                    placeholder="Fail"
                    className="h-8 w-24 text-sm font-mono"
                    defaultValue={line.qty_failed || ''}
                    onBlur={(e) => handleLineUpdate(line.id, line.qty_passed, Number(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <PassFailLogicSelector value={passFailMode} onChange={setPassFailMode} />

        <Button className="w-full" onClick={handleFinalize} disabled={finalizing}>
          <Save className="h-4 w-4 mr-1" /> {finalizing ? 'Finalizing…' : 'Finalize'}
        </Button>
      </div>
    </div>
  );
}
