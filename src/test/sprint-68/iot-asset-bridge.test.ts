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
  } as IoTSignal;
}

describe('iot-asset-bridge · stream ingestion', () => {
  beforeEach(() => localStorage.clear());

  it('iotStreamKey is namespaced per entity+asset', () => {
    expect(iotStreamKey(ENTITY, ASSET)).toContain(ENTITY);
    expect(iotStreamKey(ENTITY, ASSET)).toContain(ASSET);
  });

  it('ingestIoTSignal appends + tracks signal_count_today', () => {
    const a = ingestIoTSignal(ENTITY, ASSET, mkSig(10));
    const b = ingestIoTSignal(ENTITY, ASSET, mkSig(20));
    expect(b.is_streaming).toBe(true);
    expect(b.signal_count_today).toBeGreaterThanOrEqual(a.signal_count_today);
  });

  it('subscribeToAssetStream returns ingested signals', () => {
    ingestIoTSignal(ENTITY, ASSET, mkSig(5));
    const signals = subscribeToAssetStream(ENTITY, ASSET);
    expect(signals.length).toBeGreaterThan(0);
  });

  it('computeUOPDeltaFromIoT aggregates meter values', () => {
    ingestIoTSignal(ENTITY, ASSET, mkSig(100));
    ingestIoTSignal(ENTITY, ASSET, mkSig(50));
    const delta = computeUOPDeltaFromIoT(ENTITY, ASSET);
    expect(delta).toBeGreaterThanOrEqual(0);
  });

  it('listIoTStreamingAssets returns array (possibly empty)', () => {
    expect(Array.isArray(listIoTStreamingAssets(ENTITY))).toBe(true);
  });
});
