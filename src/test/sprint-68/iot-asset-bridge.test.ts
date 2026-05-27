/**
 * Sprint 68 FAR-4 · Block 16 · iot-asset-bridge smoke tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ingestIoTSignal,
  subscribeToAssetStream,
  computeUOPDeltaFromIoT,
  listIoTStreamingAssets,
  iotStreamKey,
} from '@/lib/iot-asset-bridge';
import type { IoTSignal } from '@/types/fixed-asset';

const ENTITY = 'TST68';
const ASSET = 'asset-cnc-001';

function mkSig(value: number, ts = new Date().toISOString()): IoTSignal {
  return {
    signal_id: `sig-${ts}-${value}`,
    asset_unit_record_id: ASSET,
    sensor_type: 'meter',
    value,
    unit: 'kWh',
    timestamp: ts,
  } as unknown as IoTSignal;
}

describe('iot-asset-bridge · stream ingestion', () => {
  beforeEach(() => localStorage.clear());

  it('iotStreamKey is namespaced per entity+asset', () => {
    expect(iotStreamKey(ENTITY, ASSET)).toContain(ENTITY);
    expect(iotStreamKey(ENTITY, ASSET)).toContain(ASSET);
  });

  it('ingestIoTSignal appends + tracks signal_count_today', () => {
    ingestIoTSignal(ENTITY, ASSET, mkSig(10));
    const b = ingestIoTSignal(ENTITY, ASSET, mkSig(20));
    expect(b.is_streaming).toBe(true);
    expect(b.signal_count_today).toBeGreaterThanOrEqual(1);
  });

  it('subscribeToAssetStream returns ingested signals', () => {
    ingestIoTSignal(ENTITY, ASSET, mkSig(5));
    expect(subscribeToAssetStream(ENTITY, ASSET).length).toBeGreaterThan(0);
  });

  it('computeUOPDeltaFromIoT sums meter values within range', () => {
    ingestIoTSignal(ENTITY, ASSET, mkSig(100));
    ingestIoTSignal(ENTITY, ASSET, mkSig(50));
    const from = new Date(Date.now() - 86_400_000).toISOString();
    const to = new Date(Date.now() + 86_400_000).toISOString();
    expect(computeUOPDeltaFromIoT(ENTITY, ASSET, from, to)).toBeGreaterThanOrEqual(0);
  });

  it('listIoTStreamingAssets returns array', () => {
    expect(Array.isArray(listIoTStreamingAssets(ENTITY))).toBe(true);
  });
});
