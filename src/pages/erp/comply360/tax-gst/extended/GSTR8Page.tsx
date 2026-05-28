/**
 * @file Sprint 75 · GSTR-8 (E-commerce TCS) surface
 */
import ExtendedFormShell from './ExtendedFormShell';
import { aggregateOutwardSupplies } from '@/lib/comply360-gst-aggregator-engine';
import { buildGSTR8 } from '@/lib/comply360-gstr-builder-engine';

export default function GSTR8Page(): JSX.Element {
  return (
    <ExtendedFormShell
      title="E-commerce TCS Collector"
      description="Monthly return for tax collected at source under Section 52"
      formCode="GSTR-8"
      fileTag="GSTR8"
      periodKind="period"
      build={({ entityId, gstin, period, refreshTick }) => {
        void refreshTick;
        const outward = aggregateOutwardSupplies({ entity_id: entityId, gstin, fy: 'FY2024-25', return_period: period });
        return buildGSTR8(outward, { gstin, return_period: period });
      }}
    />
  );
}
