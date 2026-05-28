/**
 * @file Sprint 75 · GSTR-4 (Composition annual) surface
 */
import ExtendedFormShell from './ExtendedFormShell';
import { aggregateOutwardSupplies, aggregateInwardSupplies } from '@/lib/comply360-gst-aggregator-engine';
import { buildGSTR4 } from '@/lib/comply360-gstr-builder-engine';

export default function GSTR4Page(): JSX.Element {
  return (
    <ExtendedFormShell
      title="Composition Annual Return"
      description="Annual return for composition taxpayers · CGST Rule 62"
      formCode="GSTR-4"
      fileTag="GSTR4"
      periodKind="fy"
      build={({ entityId, gstin, fy, refreshTick }) => {
        void refreshTick;
        const outward = aggregateOutwardSupplies({ entity_id: entityId, gstin, fy: `FY${fy}`, return_period: '04-2025' });
        const inward = aggregateInwardSupplies({ entity_id: entityId, gstin, fy: `FY${fy}`, return_period: '04-2025' });
        return buildGSTR4(outward, inward, { gstin, fy, quarter: 'Q4' });
      }}
    />
  );
}
