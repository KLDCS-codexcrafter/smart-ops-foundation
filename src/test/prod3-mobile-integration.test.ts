/**
 * prod3-mobile-integration.test.ts — Sprint T-Phase-3.PROD-3 · ST5+ST6+ST7+ST8
 */
import { describe, it, expect } from 'vitest';

describe('PROD-3 mobile integration · Sprint 59', () => {
  it('Machine type module loads', async () => {
    const m = await import('@/types/machine');
    expect(m.machinesKey).toBeDefined();
  });

  it('offline-queue-engine loads with extended QueuedWriteKind', async () => {
    const q = await import('@/lib/offline-queue-engine');
    expect(q.enqueueWrite).toBeDefined();
  });

  it('iot-machine-bridge module loads', async () => {
    const b = await import('@/lib/iot-machine-bridge');
    expect(b.ingestTelemetry).toBeDefined();
    expect(b.computeEnergyCostForPO).toBeDefined();
  });

  it('OEE engine loads with computeOEEFromTelemetry export', async () => {
    const o = await import('@/lib/oee-engine');
    expect(o.computeOEEFromTelemetry).toBeDefined();
  });

  it('MobileShopFloorOperatorPage loads as React component', async () => {
    const c = await import('@/pages/mobile/MobileShopFloorOperatorPage');
    expect(c.default).toBeDefined();
  });

  it('camera-bridge still loads with capturePhoto export', async () => {
    const c = await import('@/lib/camera-bridge');
    expect(c.capturePhoto).toBeDefined();
  });
});
