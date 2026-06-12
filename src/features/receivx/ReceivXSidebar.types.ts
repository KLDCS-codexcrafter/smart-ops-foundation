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
  // S148 · T-ReceivX-CF.1 · Collections Follow-Up surfaces
  | 'rx-t-followups-today' | 'rx-t-planned-reminders'
  | 'rx-r-aging-salesman' | 'rx-r-aging-agent'
  | 'rx-r-aging-broker' | 'rx-r-aging-telecaller'
  | 'rx-r-collection-eff' | 'rx-r-comm-log' | 'rx-r-credit-risk'
  // RPT-9b · User Report Builder · embedded mount
  | 'rx-rpt-report-builder'
  // RPT-10a · Credit X-Ray executive cockpit
  | 'rx-credit-xray';

export const LIVE_RECEIVX_MODULES: ReceivXModule[] = [
  'rx-hub','rx-m-reminder-template','rx-m-collection-exec',
  'rx-m-incentive-scheme','rx-m-config',
  'rx-t-task-board','rx-t-ptp-tracker','rx-t-reminder-console',
  'rx-t-payment-links','rx-t-dunning',
  'rx-t-followups-today','rx-t-planned-reminders',
  'rx-r-aging-salesman','rx-r-aging-agent',
  'rx-r-aging-broker','rx-r-aging-telecaller',
  'rx-r-collection-eff','rx-r-comm-log','rx-r-credit-risk',
  // RPT-9b
  'rx-rpt-report-builder',
  // RPT-10a
  'rx-credit-xray',
];
