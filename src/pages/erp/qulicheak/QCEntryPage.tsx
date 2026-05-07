/**
 * @file     QCEntryPage.tsx
 * @sprint   T-Phase-1.3-3b-pre-2 · Block C · D-628
 * @purpose  QC Entry/Exit polymorphic page (Q53=a layouts · Q54=a pass/fail · Q55=a per-scenario).
 */
import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, CheckCircle2, AlertTriangle, ClipboardList, Grid3x3, ListTodo } from 'lucide-react';
import { toast } from 'sonner';
import { ViewModeSelector } from '@/components/ViewModeSelector';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProductionConfig } from '@/hooks/useProductionConfig';
import { useItemQCParams } from '@/hooks/useItemQCParams';
import { getQaInspection, completeInspection } from '@/lib/qa-inspection-engine';
import { evaluatePassFail } from '@/lib/qa-passfail-evaluator';
import type { QaInspectionRecord } from '@/types/qa-inspection';
import type { QCEntryLayoutMode, PassFailMode } from '@/types/qc-entry-mode';
import { QCEntryTable } from '@/components/qc/QCEntryTable';
import { QCEntryGrid } from '@/components/qc/QCEntryGrid';
import { QCEntryWizard } from '@/components/qc/QCEntryWizard';
import { PassFailLogicSelector } from '@/components/qc/PassFailLogicSelector';
import { PerScenarioSection } from '@/components/qc/PerScenarioSection';

export interface QCEntryPageProps {
  inspectionId: string;
  onBack: () => void;
}

export function QCEntryPage({ inspectionId, onBack }: QCEntryPageProps): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const config = useProductionConfig();
  const { params: itemQCParams } = useItemQCParams();

  const [inspection, setInspection] = useState<QaInspectionRecord | null>(null);
  const [layoutMode, setLayoutMode] = useState<QCEntryLayoutMode>('table');
  const [passFailMode, setPassFailMode] = useState<PassFailMode>('per_param_and');
  const [finalizing, setFinalizing] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const ins = getQaInspection(inspectionId, entityCode);
    setInspection(ins);
  }, [inspectionId, entityCode, refreshTick]);

  const passFailPreview = useMemo(() => {
    if (!inspection) return null;
    return evaluatePassFail(inspection, passFailMode, itemQCParams);
  }, [inspection, passFailMode, itemQCParams]);

  const handleLineUpdate = (): void => setRefreshTick(t => t + 1);

  const handleFinalize = async (): Promise<void> => {
    if (!inspection) return;
    setFinalizing(true);
    try {
      const result = await completeInspection(
        inspectionId, entityCode, user?.id ?? 'demo-user',
        { passFailMode, productionConfig: config, itemQCParams },
      );
      if (result) {
        toast.success(`Inspection finalized · ${result.status.toUpperCase()} · mode: ${passFailMode.replace(/_/g, ' ')}`);
        if (result.status === 'failed') {
          toast.warning('Routing applied based on qcFailureRoutingRule');
        }
        onBack();
      }
    } catch (e) {
      toast.error(`Finalize failed: ${(e as Error).message}`);
    } finally {
      setFinalizing(false);
    }
  };

  if (!inspection) {
    return <div className="p-6 text-sm text-muted-foreground">Loading inspection…</div>;
  }

  const isClosed = inspection.status === 'passed' || inspection.status === 'failed' || inspection.status === 'cancelled';

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="text-sm text-muted-foreground font-mono">{inspection.qa_no}</div>
      </div>

      {/* Q55=a · per-scenario deterministic UI */}
      <PerScenarioSection inspection={inspection} />

      {/* Q53=a · polymorphic layout */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> QC Entry · {inspection.lines.length} line(s)
            </CardTitle>
            <ViewModeSelector<QCEntryLayoutMode>
              value={layoutMode}
              onChange={setLayoutMode}
              storageKey="qc_entry_layout_mode"
              label="Layout:"
              options={[
                { id: 'table', label: 'Per-Line Table', tooltip: 'Compact tabular view · best for routine inspections', icon: ClipboardList },
                { id: 'grid', label: 'Parameter Grid', tooltip: 'Parameter × line matrix · best for multi-parameter SPC', icon: Grid3x3 },
                { id: 'wizard', label: 'Wizard', tooltip: 'Step-by-step · best for first-time inspections or training', icon: ListTodo },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent>
          {layoutMode === 'table' && <QCEntryTable inspection={inspection} onLineUpdate={handleLineUpdate} />}
          {layoutMode === 'grid' && <QCEntryGrid inspection={inspection} onLineUpdate={handleLineUpdate} />}
          {layoutMode === 'wizard' && <QCEntryWizard inspection={inspection} onLineUpdate={handleLineUpdate} />}
        </CardContent>
      </Card>

      {/* Q54=a · polymorphic Pass/Fail logic preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Pass/Fail Logic</CardTitle>
            <PassFailLogicSelector value={passFailMode} onChange={setPassFailMode} />
          </div>
        </CardHeader>
        <CardContent>
          {passFailPreview && (
            <div className={`p-3 rounded-lg border ${passFailPreview.overall === 'pass' ? 'border-success/40 bg-success/5' : 'border-destructive/40 bg-destructive/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                {passFailPreview.overall === 'pass'
                  ? <CheckCircle2 className="h-4 w-4 text-success" />
                  : <AlertTriangle className="h-4 w-4 text-destructive" />}
                <span className="font-semibold">Preview: {passFailPreview.overall.toUpperCase()}</span>
                {passFailPreview.weighted_score !== undefined && (
                  <Badge variant="outline" className="font-mono">{passFailPreview.weighted_score}% weighted</Badge>
                )}
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                {passFailPreview.reasons.map((r, i) => <li key={`${i}-${r.slice(0, 16)}`}>· {r}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        <Button onClick={handleFinalize} disabled={finalizing || isClosed}>
          <Save className="h-4 w-4 mr-1" /> {finalizing ? 'Finalizing…' : 'Finalize Inspection'}
        </Button>
      </div>
    </div>
  );
}

export default QCEntryPage;
