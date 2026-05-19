/**
 * @file        src/lib/eximx-pulse-publisher.ts
 * @purpose     EximX pulse publishers · IEC expiry · LUT expiry · APR deadline · per D-NEW-ET pattern
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   D-NEW-ET pulse publisher pattern · v10 FINAL
 */

import { summarizeIECValidity } from './iec-engine';
import { summarizeLUTExpiry, listLUTs } from './lut-engine';

export interface EximXPulseEvent {
  kind: 'iec-expiry' | 'lut-expiry' | 'apr-deadline';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  entity_id: string;
  emitted_at: string;
  data: Record<string, unknown>;
}

const PULSE_STORAGE_KEY = (entityId: string): string => `erp_${entityId}_eximx_pulses`;

const emit = (entityId: string, event: EximXPulseEvent): void => {
  const raw = localStorage.getItem(PULSE_STORAGE_KEY(entityId));
  const existing: EximXPulseEvent[] = raw ? (JSON.parse(raw) as EximXPulseEvent[]) : [];
  existing.push(event);
  if (existing.length > 50) existing.splice(0, existing.length - 50);
  localStorage.setItem(PULSE_STORAGE_KEY(entityId), JSON.stringify(existing));
};

export const publishIECExpiryPulse = (entityId: string): EximXPulseEvent[] => {
  const s = summarizeIECValidity(entityId);
  const events: EximXPulseEvent[] = [];
  const now = new Date().toISOString();
  if (s.expired > 0) {
    const ev: EximXPulseEvent = {
      kind: 'iec-expiry', severity: 'critical',
      message: `${s.expired} IEC record(s) expired · re-register required`,
      entity_id: entityId, emitted_at: now, data: { expired_count: s.expired },
    };
    emit(entityId, ev); events.push(ev);
  }
  if (s.expiring > 0) {
    const ev: EximXPulseEvent = {
      kind: 'iec-expiry', severity: 'warning',
      message: `${s.expiring} IEC record(s) expiring within 90 days`,
      entity_id: entityId, emitted_at: now, data: { expiring_count: s.expiring },
    };
    emit(entityId, ev); events.push(ev);
  }
  return events;
};

export const publishLUTExpiryPulse = (entityId: string): EximXPulseEvent[] => {
  const s = summarizeLUTExpiry(entityId);
  const events: EximXPulseEvent[] = [];
  const now = new Date().toISOString();
  if (s.renewalDue > 0) {
    const ev: EximXPulseEvent = {
      kind: 'lut-expiry', severity: 'critical',
      message: `${s.renewalDue} LUT(s) renewal due within 30 days`,
      entity_id: entityId, emitted_at: now, data: { renewal_due_count: s.renewalDue },
    };
    emit(entityId, ev); events.push(ev);
  }
  if (s.expiring > 0) {
    const ev: EximXPulseEvent = {
      kind: 'lut-expiry', severity: 'warning',
      message: `${s.expiring} LUT(s) expiring within 90 days`,
      entity_id: entityId, emitted_at: now, data: { expiring_count: s.expiring },
    };
    emit(entityId, ev); events.push(ev);
  }
  return events;
};

export const publishAPRDeadlinePulse = (entityId: string): EximXPulseEvent[] => {
  const luts = listLUTs(entityId);
  const events: EximXPulseEvent[] = [];
  const now = new Date();
  for (const lut of luts) {
    const aprDate = new Date(lut.apr_due_date);
    const daysToAPR = Math.floor((aprDate.getTime() - now.getTime()) / 86400000);
    if (daysToAPR >= 0 && daysToAPR <= 30) {
      const ev: EximXPulseEvent = {
        kind: 'apr-deadline', severity: daysToAPR <= 7 ? 'critical' : 'warning',
        message: `APR for LUT ${lut.lut_number} due in ${daysToAPR} days`,
        entity_id: entityId, emitted_at: now.toISOString(),
        data: { lut_number: lut.lut_number, days_remaining: daysToAPR },
      };
      emit(entityId, ev); events.push(ev);
    }
  }
  return events;
};

export const readEximXPulses = (entityId: string): EximXPulseEvent[] => {
  const raw = localStorage.getItem(PULSE_STORAGE_KEY(entityId));
  return raw ? (JSON.parse(raw) as EximXPulseEvent[]) : [];
};
