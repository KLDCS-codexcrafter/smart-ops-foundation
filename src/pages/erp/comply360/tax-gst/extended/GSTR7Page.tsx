/**
 * @file Sprint 75 · GSTR-7 (GST-TDS deductor) surface
 */
import ExtendedFormShell from './ExtendedFormShell';
import { aggregateInwardSupplies } from '@/lib/comply360-gst-aggregator-engine';
import { buildGSTR7 } from '@/lib/comply360-gstr-builder-engine';

export default function GSTR7Page(): JSX.Element {
  return (
    <ExtendedFormShell
      title="GST-TDS Deductor"
      description="Monthly return for tax deducted at source under Section 51"
      formCode="GSTR-7"
      fileTag="GSTR7"
      periodKind="period"
      build={({ entityId, gstin, period, refreshTick }) => {
        void refreshTick;
        const inward = aggregateInwardSupplies({ entity_id: entityId, gstin, fy: 'FY2024-25', return_period: period });
        return buildGSTR7(inward, { gstin, return_period: period });
      }}
    />
  );
}
