/**
 * @file     ReceivXSidebar.types.ts
 * @purpose  ReceivXModule type and LIVE_RECEIVX_MODULES constant extracted from
 *           ReceivXSidebar.tsx to satisfy react-refresh/only-export-components.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-a
 * @iso      Maintainability (HIGH+ component file scope cleaned)
 *           Performance (HIGH+ HMR fast-refresh works correctly)
 * @whom     ReceivXSidebar.tsx · ReceivX module routers
 * @depends  none
 */
export type ReceivXModule =
  | 'rx-hub'
  | 'rx-m-reminder-template' | 'rx-m-collection-exec'
  | 'rx-m-incentive-scheme' | 'rx-m-config'
  | 'rx-t-task-board' | 'rx-t-ptp-tracker' | 'rx-t-reminder-console'
  | 'rx-t-payment-links' | 'rx-t-dunning'
  | 'rx-r-aging-salesman' | 'rx-r-aging-agent'
  | 'rx-r-aging-broker' | 'rx-r-aging-telecaller'
  | 'rx-r-collection-eff' | 'rx-r-comm-log' | 'rx-r-credit-risk';

export const LIVE_RECEIVX_MODULES: ReceivXModule[] = [
  'rx-hub','rx-m-reminder-template','rx-m-collection-exec',
  'rx-m-incentive-scheme','rx-m-config',
  'rx-t-task-board','rx-t-ptp-tracker','rx-t-reminder-console',
  'rx-t-payment-links','rx-t-dunning',
  'rx-r-aging-salesman','rx-r-aging-agent',
  'rx-r-aging-broker','rx-r-aging-telecaller',
  'rx-r-collection-eff','rx-r-comm-log','rx-r-credit-risk',
];
