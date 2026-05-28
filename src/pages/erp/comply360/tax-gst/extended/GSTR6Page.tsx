/**
 * @file Sprint 75 · GSTR-6 (ISD return) surface
 */
import ExtendedFormShell from './ExtendedFormShell';
import { aggregateInwardSupplies } from '@/lib/comply360-gst-aggregator-engine';
import { buildGSTR6 } from '@/lib/comply360-gstr-builder-engine';

export default function GSTR6Page(): JSX.Element {
  return (
    <ExtendedFormShell
      title="Input Service Distributor"
      description="Monthly ITC distribution return for ISD-registered taxpayers"
      formCode="GSTR-6"
      fileTag="GSTR6"
      periodKind="period"
      build={({ entityId, gstin, period, refreshTick }) => {
        void refreshTick;
        const inward = aggregateInwardSupplies({ entity_id: entityId, gstin, fy: 'FY2024-25', return_period: period });
        return buildGSTR6(inward, { gstin, return_period: period });
      }}
    />
  );
}
