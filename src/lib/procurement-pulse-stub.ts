/**
 * @file        procurement-pulse-stub.ts
 * @sprint      T-Phase-1.2.6f-pre-2 · Block I · OOB-18 · SD-14 stub
 *              T-Phase-1.2.6f-a-fix · FIX-3 · D-261 · D-263 single emit pipeline
 * @purpose     Procurement Pulse · setInterval mock + engine publish API.
 * @[JWT]       WSS /ws/procurement-pulse
 */

export type PulseSeverity = 'info' | 'warning' | 'critical';

export interface PulseAlert {
  id: string;
  severity: PulseSeverity;
  message: string;
  emitted_at: string;
}

const SAMPLE_ALERTS: Array<Omit<PulseAlert, 'id' | 'emitted_at'>> = [
  { severity: 'warning', message: 'HOD approval queue exceeded 2-day SLA' },
  { severity: 'info', message: 'New indent submitted by Production' },
  { severity: 'critical', message: 'Capital indent above ₹5L pending Finance gate' },
];

export interface PulseHandle {
  stop: () => void;
}

// FIX-3 · D-263 Option B · single emit pipeline
const subscribers = new Set<(alert: PulseAlert) => void>();

export function publishProcurementPulse(
  alert: Omit<PulseAlert, 'id' | 'emitted_at'> & Partial<Pick<PulseAlert, 'id' | 'emitted_at'>>,
): void {
  const full: PulseAlert = {
    id: alert.id ?? `pulse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    emitted_at: alert.emitted_at ?? new Date().toISOString(),
    severity: alert.severity,
    message: alert.message,
  };
  subscribers.forEach((cb) => cb(full));
}

export function subscribeProcurementPulse(
  onAlert: (alert: PulseAlert) => void,
  intervalMs: number = 30000,
): PulseHandle {
  // [JWT] WSS /ws/procurement-pulse
  subscribers.add(onAlert);
  let i = 0;
  const tick = (): void => {
    const sample = SAMPLE_ALERTS[i % SAMPLE_ALERTS.length];
    i += 1;
    publishProcurementPulse(sample);
  };
  const handle = setInterval(tick, intervalMs);
  return {
    stop: () => {
      clearInterval(handle);
      subscribers.delete(onAlert);
    },
  };
}
