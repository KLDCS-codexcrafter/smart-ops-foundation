/**
 * @file     ProductionQCPendingPanel.tsx
 * @sprint   T-Phase-1.3-3b-pre-1 · Block J · D-624 · extended pre-2 Block J · D-635
 * @purpose  List of QaInspectionRecord with source_context !== 'incoming_vendor'.
 */
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Factory } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listQaInspections } from '@/lib/qa-inspection-engine';
import type { QaInspectionRecord } from '@/types/qa-inspection';

export interface ProductionQCPendingPanelProps {
  onOpenInspection?: (id: string) => void;
}

export function ProductionQCPendingPanel({ onOpenInspection }: ProductionQCPendingPanelProps = {}): JSX.Element {
  const { entityCode } = useEntityCode();
  const [rows, setRows] = useState<QaInspectionRecord[]>([]);

  useEffect(() => {
    const all = listQaInspections(entityCode);
    setRows(all.filter(r => r.source_context && r.source_context !== 'incoming_vendor'));
  }, [entityCode]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Factory className="h-5 w-5 text-primary" />
        Production QC · Pending
      </h1>
      <p className="text-sm text-muted-foreground">Inspections auto-created from PO · PC · MI · JC.</p>
      {rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No production QC inspections yet.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {rows.map(r => {
            const scenario = (r as unknown as { qc_scenario?: string | null }).qc_scenario ?? null;
            return (
              <Card
                key={r.id}
                className={onOpenInspection ? 'cursor-pointer hover:border-primary transition-colors' : ''}
                onClick={() => onOpenInspection?.(r.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="font-mono">{r.qa_no}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{r.source_context}</Badge>
                      {scenario && <Badge variant="outline">{scenario}</Badge>}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1 text-muted-foreground">
                  <div>Source: <span className="font-mono">{r.bill_no}</span></div>
                  {r.production_order_no && <div>PO: <span className="font-mono">{r.production_order_no}</span></div>}
                  {r.factory_id && <div>Factory: {r.factory_id}</div>}
                  {r.machine_id && <div>Machine: {r.machine_id}</div>}
                  <div>Lines: {r.lines.length} · Status: <Badge variant="secondary">{r.status}</Badge></div>
                  {onOpenInspection && <div className="text-primary text-xs mt-1">→ Click to enter QC results</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProductionQCPendingPanel;
