/**
 * @file        src/lib/iot-asset-bridge.ts
 * @sibling     NEW @ Sprint 68 FAR-4 · 49th SIBLING
 * @realizes    MOAT-49 · IoT/RFID Bidirectional FA Bridge (IoT side)
 * @flips       FAR-CAP-21 (IoT meter ingest for UOP depreciation) to FULL
 * @approach    Q-LOCK-5 A · UI/state-only with stub · localStorage stream · Phase 5 → WebSocket
 * @reads-from  physical-asset-unit-bridge.ts (PRESERVE LIST · do NOT modify)
 * [JWT] Phase 5: WebSocket /api/iot/stream/:asset_id (real-time signal subscription)
 */
import type { IoTSignal } from '@/types/fixed-asset';
import { findPhysicalAssetUnit } from './physical-asset-unit-bridge';

export const iotStreamKey = (entityCode: string, asset_id: string): string =>
  `erp_iot_stream_${entityCode}_${asset_id}`;

const IOT_STREAM_PREFIX = (entityCode: string): string => `erp_iot_stream_${entityCode}_`;

export interface IoTBridgeState {
  asset_unit_record_id: string;
  last_signal?: IoTSignal;
  signal_count_today: number;
  is_streaming: boolean;
}

function readStream(entityCode: string, asset_id: string): IoTSignal[] {
  try {
    const raw = localStorage.getItem(iotStreamKey(entityCode, asset_id));
    return raw ? (JSON.parse(raw) as IoTSignal[]) : [];
  } catch {
    return [];
  }
}

function writeStream(entityCode: string, asset_id: string, signals: IoTSignal[]): void {
  try {
    localStorage.setItem(iotStreamKey(entityCode, asset_id), JSON.stringify(signals));
  } catch {
    // localStorage full / unavailable · skip
  }
}

function isSameDay(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}

/**
 * Ingest a single IoT signal · appends to stream · validates asset exists
 * via physical-asset-unit-bridge.findPhysicalAssetUnit (read-only).
 */
export function ingestIoTSignal(
  entityCode: string,
  asset_id: string,
  signal: IoTSignal,
): IoTBridgeState {
  const unit = findPhysicalAssetUnit(entityCode, asset_id);
  const stream = readStream(entityCode, asset_id);
  stream.push(signal);
  // Cap stream at last 500 signals to prevent unbounded growth
  const capped = stream.length > 500 ? stream.slice(-500) : stream;
  writeStream(entityCode, asset_id, capped);

  const today = new Date().toISOString();
  const signal_count_today = capped.filter((s) => isSameDay(s.timestamp, today)).length;

  return {
    asset_unit_record_id: unit?.asset_unit_record_id ?? asset_id,
    last_signal: signal,
    signal_count_today,
    is_streaming: true,
  };
}

/**
 * Subscribe to an asset's IoT stream · returns signals since the given ISO timestamp.
 * Stub for Phase 5 WebSocket real-time subscription.
 */
export function subscribeToAssetStream(
  entityCode: string,
  asset_id: string,
  since?: string,
): IoTSignal[] {
  const stream = readStream(entityCode, asset_id);
  if (!since) return stream;
  const sinceMs = Date.parse(since);
  if (Number.isNaN(sinceMs)) return stream;
  return stream.filter((s) => Date.parse(s.timestamp) >= sinceMs);
}

/**
 * Sum 'meter' sensor values in a date range · feeds UOP depreciation engine
 * (PRESERVE LIST · read-only consumption).
 */
export function computeUOPDeltaFromIoT(
  entityCode: string,
  asset_id: string,
  from_date: string,
  to_date: string,
): number {
  const stream = readStream(entityCode, asset_id);
  const fromMs = Date.parse(from_date);
  const toMs = Date.parse(to_date);
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return 0;
  return stream
    .filter((s) => s.sensor_type === 'meter')
    .filter((s) => {
      const t = Date.parse(s.timestamp);
      return t >= fromMs && t <= toMs;
    })
    .reduce((sum, s) => sum + (Number.isFinite(s.value) ? s.value : 0), 0);
}

/**
 * Scan localStorage for active IoT-streaming assets for an entity.
 */
export function listIoTStreamingAssets(entityCode: string): IoTBridgeState[] {
  const prefix = IOT_STREAM_PREFIX(entityCode);
  const out: IoTBridgeState[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const asset_id = key.slice(prefix.length);
      const stream = readStream(entityCode, asset_id);
      if (stream.length === 0) continue;
      const last_signal = stream[stream.length - 1];
      const today = new Date().toISOString();
      const signal_count_today = stream.filter((s) => isSameDay(s.timestamp, today)).length;
      const unit = findPhysicalAssetUnit(entityCode, asset_id);
      out.push({
        asset_unit_record_id: unit?.asset_unit_record_id ?? asset_id,
        last_signal,
        signal_count_today,
        is_streaming: signal_count_today > 0,
      });
    }
  } catch {
    // ignore
  }
  return out;
}
