/**
 * @file src/pages/erp/qualicheck/reports/RInspReportPage.tsx
 * @purpose Trident C13 · Receiving Inspection · 3-variant wrapper.
 * @who Receiving Inspector · QA Manager (3-variant IQC report)
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block D
 * @iso ISO 9001:2015 Clause 8.4 · Trident TDL RInspReport variants
 * @whom Audit Owner
 * @decisions D-NEW-BY (entity-scoped UI prefs) · D-NEW-CB · Q-LOCK-7a
 * @disciplines FR-30 · FR-50
 * @reuses useReceivingInspections hook · 3 variant components (RInspReportV1/V2/V3)
 * @[JWT] reads via useReceivingInspections · localStorage erp_qa_inspections_${entityCode} · qualicheck.rinspreport.variant.${entityCode}
 */
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ViewModeSelector } from '@/components/ViewModeSelector';
import { useReceivingInspections } from '@/hooks/useReceivingInspections';
import { RInspReportV1 } from './rinsp/RInspReportV1';
import { RInspReportV2 } from './rinsp/RInspReportV2';
import { RInspReportV3 } from './rinsp/RInspReportV3';

type Variant = 'v1' | 'v2' | 'v3';
const OPTIONS = [
  { id: 'v1' as const, label: 'Header View', tooltip: 'Inspection-level summary at GRN' },
  { id: 'v2' as const, label: 'Line View',   tooltip: 'Per-line item breakdown' },
  { id: 'v3' as const, label: 'Vendor View', tooltip: 'Grouped by vendor' },
];

export function RInspReportPage(): JSX.Element {
  const { rows, entityCode } = useReceivingInspections();
  const [variant, setVariant] = useState<Variant>('v1');

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Receiving Inspection Report</h1>
            <p className="text-sm text-muted-foreground mt-1">{rows.length} incoming inspections · Entity {entityCode}</p>
          </div>
          <Badge variant="secondary" className="font-mono">View: {variant.toUpperCase()}</Badge>
        </div>
        <ViewModeSelector<Variant>
          value={variant}
          onChange={setVariant}
          options={OPTIONS}
          storageKey={`qualicheck.rinspreport.variant.${entityCode}`}
          label="View"
        />
      </div>
      {variant === 'v1' && <RInspReportV1 rows={rows} />}
      {variant === 'v2' && <RInspReportV2 rows={rows} />}
      {variant === 'v3' && <RInspReportV3 rows={rows} />}
    </div>
  );
}
