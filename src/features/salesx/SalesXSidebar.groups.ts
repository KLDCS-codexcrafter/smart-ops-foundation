/**
 * SalesXSidebar.groups.ts — 4-tab top-level grouping · Canvas Wave 7 (T-Phase-1.1.1k)
 * Purpose: organize existing 40+ SalesXModule items into 4 functional groups
 * URL slug → group mapping for deep-linking
 */
import type { SalesXModule } from './SalesXSidebar.types';

export type SalesXGroup = 'master' | 'telecaller' | 'crm' | 'report';

export const SALESX_GROUP_LABELS: Record<SalesXGroup, string> = {
  master:     'Masters',
  telecaller: 'Telecaller',
  crm:        'CRM',
  report:     'Reports',
};

export const SALESX_GROUP_ORDER: SalesXGroup[] = ['master', 'telecaller', 'crm', 'report'];

// Module → group mapping. Keep in sync with SalesXSidebar.types LIVE_SALESX_MODULES.
export const SALESX_MODULE_GROUP: Record<SalesXModule, SalesXGroup> = {
  // Hub (special — appears in all groups but landing page is master)
  'sx-hub':                    'master',

  // Masters
  'sx-m-hierarchy':            'master',
  'sx-m-salesman':             'master',
  'sx-m-agent':                'master',
  'sx-m-broker':               'master',
  'sx-m-receiver':             'master',
  'sx-m-reference':            'master',
  'sx-m-enquiry-source':       'master',
  'sx-m-campaign':             'master',
  'sx-m-territory':            'master',
  'sx-m-beat':                 'master',
  'sx-m-target':               'master',

  // Telecaller workspace + supporting tools
  'sx-t-telecaller':           'telecaller',
  'sx-t-call-quality':         'telecaller',
  'sx-t-lead-distribution':    'telecaller',

  // CRM transactions
  'sx-t-enquiry':              'crm',
  'sx-t-pipeline':             'crm',
  'sx-t-quotation':            'crm',
  'sx-t-supply-memo':          'crm',
  'sx-t-invoice-memo':         'crm',
  'sx-t-sample-outward':       'crm',
  'sx-t-demo-outward':         'crm',
  'sx-t-return-memo':          'crm',
  'sx-t-visit':                'crm',
  'sx-t-secondary':            'crm',
  'sx-t-lead-agg':             'crm',
  'sx-t-exhibition':           'crm',
  'sx-t-webinar':              'crm',
  'sx-t-smart-insights':       'crm',
  'sx-t-campaign-templates':   'crm',

  // Reports
  'sx-r-commission':           'report',
  'sx-r-enquiry-register':     'report',
  'sx-r-pipeline-summary':     'report',
  'sx-r-quotation-register':   'report',
  'sx-r-return-memo-register': 'report',
  'sx-r-beat-productivity':    'report',
  'sx-r-coverage':             'report',
  'sx-r-secondary-sales':      'report',
  'sx-r-followup':             'report',
  'sx-r-target':               'report',
  'sx-r-so-tracker':           'report',
  'sx-r-handoff-tracker':      'report',
  'sx-r-campaign-performance': 'report',
  'sx-r-exhibition-report':    'report',
  'sx-r-webinar-report':       'report',
  'sx-analytics':              'report',
};

/** Default landing module per group when user clicks the tab */
export const SALESX_GROUP_DEFAULT_MODULE: Record<SalesXGroup, SalesXModule> = {
  master:     'sx-m-enquiry-source',
  telecaller: 'sx-t-telecaller',
  crm:        'sx-t-pipeline',
  report:     'sx-r-pipeline-summary',
};

export function getModuleGroup(module: SalesXModule): SalesXGroup {
  return SALESX_MODULE_GROUP[module] ?? 'master';
}
