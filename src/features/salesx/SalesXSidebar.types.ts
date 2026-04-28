/**
 * @file     SalesXSidebar.types.ts
 * @purpose  SalesXModule type and LIVE_SALESX_MODULES constant extracted from
 *           SalesXSidebar.tsx to satisfy react-refresh/only-export-components.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-a
 * @iso      Maintainability (HIGH+ component file scope cleaned)
 *           Performance (HIGH+ HMR fast-refresh works correctly)
 * @whom     SalesXSidebar.tsx · SalesX module routers
 * @depends  none
 */
export type SalesXModule =
  | 'sx-hub'
  | 'sx-m-hierarchy'
  | 'sx-m-salesman'
  | 'sx-m-agent'
  | 'sx-m-broker'
  | 'sx-m-receiver'
  | 'sx-m-reference'
  | 'sx-m-enquiry-source'
  | 'sx-m-campaign'
  | 'sx-m-territory'
  | 'sx-m-beat'
  | 'sx-t-enquiry'
  | 'sx-t-pipeline'
  | 'sx-t-telecaller'
  | 'sx-t-quotation'
  | 'sx-t-supply-memo'
  | 'sx-t-invoice-memo'
  | 'sx-t-sample-outward'
  | 'sx-t-demo-outward'
  | 'sx-t-return-memo'
  | 'sx-t-visit'
  | 'sx-t-secondary'
  | 'sx-r-commission'
  | 'sx-r-enquiry-register'
  | 'sx-r-pipeline-summary'
  | 'sx-r-quotation-register'
  | 'sx-r-return-memo-register'
  | 'sx-r-beat-productivity'
  | 'sx-r-coverage'
  | 'sx-r-secondary-sales'
  | 'sx-m-target'
  | 'sx-r-followup'
  | 'sx-r-target'
  | 'sx-analytics'
  | 'sx-r-so-tracker'
  | 'sx-r-handoff-tracker'
  | 'sx-r-campaign-performance'
  | 'sx-t-webinar'
  | 'sx-r-webinar-report';

export const LIVE_SALESX_MODULES: SalesXModule[] = [
  'sx-hub',
  'sx-m-hierarchy',
  'sx-m-salesman',
  'sx-m-agent',
  'sx-m-broker',
  'sx-m-receiver',
  'sx-m-reference',
  'sx-m-enquiry-source',
  'sx-m-campaign',
  'sx-m-territory',
  'sx-m-beat',
  'sx-t-enquiry',
  'sx-t-pipeline',
  'sx-t-telecaller',
  'sx-t-quotation',
  'sx-t-supply-memo',
  'sx-t-invoice-memo',
  'sx-t-sample-outward',
  'sx-t-demo-outward',
  'sx-t-return-memo',
  'sx-t-visit',
  'sx-t-secondary',
  'sx-r-commission',
  'sx-r-enquiry-register',
  'sx-r-pipeline-summary',
  'sx-r-quotation-register',
  'sx-r-return-memo-register',
  'sx-r-beat-productivity',
  'sx-r-coverage',
  'sx-r-secondary-sales',
  'sx-m-target',
  'sx-r-followup',
  'sx-r-target',
  'sx-analytics',
  'sx-r-so-tracker',
  'sx-r-handoff-tracker',
  'sx-r-campaign-performance',
  'sx-t-webinar',
  'sx-r-webinar-report',
];
