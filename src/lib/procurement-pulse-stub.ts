/**
 * @file        procurement-pulse-stub.ts
 * @sprint      T-Phase-1.2.6f-pre-2 · Block I · OOB-18 · SD-14 stub
 * @purpose     Procurement Pulse · setInterval mock real-time alerts.
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

export function subscribeProcurementPulse(
  onAlert: (alert: PulseAlert) => void,
  intervalMs: number = 30000,
): PulseHandle {
  // [JWT] WSS /ws/procurement-pulse
  let i = 0;
  const tick = (): void => {
    const sample = SAMPLE_ALERTS[i % SAMPLE_ALERTS.length];
    i += 1;
    onAlert({
      id: `pulse-${Date.now()}-${i}`,
      severity: sample.severity,
      message: sample.message,
      emitted_at: new Date().toISOString(),
    });
  };
  const handle = setInterval(tick, intervalMs);
  return { stop: () => clearInterval(handle) };
}
