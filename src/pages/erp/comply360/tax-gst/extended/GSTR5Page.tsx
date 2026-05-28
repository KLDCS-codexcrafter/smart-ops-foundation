/**
 * @file Sprint 75 · GSTR-5 (Non-resident) surface
 */
import ExtendedFormShell from './ExtendedFormShell';
import { aggregateOutwardSupplies, aggregateInwardSupplies } from '@/lib/comply360-gst-aggregator-engine';
import { buildGSTR5 } from '@/lib/comply360-gstr-builder-engine';

export default function GSTR5Page(): JSX.Element {
  return (
    <ExtendedFormShell
      title="Non-Resident Taxable Person"
      description="Monthly return for non-resident taxable persons · Section 27"
      formCode="GSTR-5"
      fileTag="GSTR5"
      periodKind="period"
      build={({ entityId, gstin, period, refreshTick }) => {
        void refreshTick;
        const outward = aggregateOutwardSupplies({ entity_id: entityId, gstin, fy: 'FY2024-25', return_period: period });
        const imports = aggregateInwardSupplies({ entity_id: entityId, gstin, fy: 'FY2024-25', return_period: period });
        return buildGSTR5(outward, imports, { gstin, return_period: period });
      }}
    />
  );
}
