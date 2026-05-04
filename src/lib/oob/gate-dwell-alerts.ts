/**
 * gate-dwell-alerts.ts — Sprint 4-pre-3 · Block B · D-314 (Q4=A)
 * THIN WRAPPER · delegates to gateflow-engine.listInwardQueue + listOutwardQueue.
 * Flags gate passes whose dwell time exceeds threshold · NO new storage (Q7=A).
 * Mirrors contract-expiry-alerts thin-wrapper precedent.
 *
 * Pattern note: pure function · no useMemo · no [tick, setTick] anti-pattern.
 */
import type { GatePass, GatePassDirection, GatePassStatus } from '@/types/gate-pass';
import { listInwardQueue, listOutwardQueue } from '@/lib/gateflow-engine';

export interface GateDwellAlert {
  gate_pass_id: string;
  gate_pass_no: string;
  direction: GatePassDirection;
  status: GatePassStatus;
  vehicle_no: string;
  counterparty_name: string;
  entry_time: string;
  dwell_minutes: number;
}

export const DEFAULT_DWELL_THRESHOLD_MIN = 60;

export function getDwellingGatePasses(
  entityCode: string,
  thresholdMin: number = DEFAULT_DWELL_THRESHOLD_MIN,
  now: number = Date.now(),
): GateDwellAlert[] {
  // [JWT] GET /api/gateflow/dwelling
  const all: GatePass[] = [...listInwardQueue(entityCode), ...listOutwardQueue(entityCode)];
  const out: GateDwellAlert[] = [];
  for (const gp of all) {
    const ts = new Date(gp.entry_time).getTime();
    if (Number.isNaN(ts)) continue;
    const minutes = Math.floor((now - ts) / 60000);
    if (minutes < thresholdMin) continue;
    out.push({
      gate_pass_id: gp.id,
      gate_pass_no: gp.gate_pass_no,
      direction: gp.direction,
      status: gp.status,
      vehicle_no: gp.vehicle_no,
      counterparty_name: gp.counterparty_name,
      entry_time: gp.entry_time,
      dwell_minutes: minutes,
    });
  }
  return out.sort((a, b) => b.dwell_minutes - a.dwell_minutes);
}
