/**
 * @file Sprint 75 · CMP-08 (Composition quarterly payment) surface
 */
import ExtendedFormShell from './ExtendedFormShell';
import { aggregateOutwardSupplies, aggregateInwardSupplies } from '@/lib/comply360-gst-aggregator-engine';
import { buildCMP08 } from '@/lib/comply360-gstr-builder-engine';

export default function CMP08Page(): JSX.Element {
  return (
    <ExtendedFormShell
      title="Composition Quarterly Payment"
      description="Quarterly self-assessed tax statement for composition dealers"
      formCode="CMP-08"
      fileTag="CMP08"
      periodKind="quarter"
      build={({ entityId, gstin, fy, quarter, refreshTick }) => {
        void refreshTick;
        const outward = aggregateOutwardSupplies({ entity_id: entityId, gstin, fy: `FY${fy}`, return_period: '04-2025' });
        const inward = aggregateInwardSupplies({ entity_id: entityId, gstin, fy: `FY${fy}`, return_period: '04-2025' });
        return buildCMP08(outward, inward, { gstin, fy, quarter });
      }}
    />
  );
}
