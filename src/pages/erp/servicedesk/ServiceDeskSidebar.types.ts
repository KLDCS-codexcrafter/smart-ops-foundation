/**
 * @file        src/pages/erp/servicedesk/ServiceDeskSidebar.types.ts
 * @purpose     ServiceDesk discriminated module union · maps to sidebar moduleId
 * @sprint      T-Phase-1.C.1a · Block F.2 · v2 spec
 * @iso        Usability
 */

export type ServiceDeskModule =
  | 'welcome'
  // AMC Pipeline (`d a*`)
  | 'amc-applicability-decision'
  | 'amc-proposal-list'
  | 'amc-active-list'
  | 'amc-expiring-list'
  | 'amc-lapsed-list'
  // Service Tickets (`d t*`)
  | 'ticket-inbox'
  | 'ticket-raise'
  | 'ticket-detail'
  | 'ticket-completion'
  // Service Engineers (`d e*`)
  | 'engineer-list'
  | 'engineer-roster'
  | 'engineer-capacity'
  // Reports (`d r*`)
  | 'amc-renewal-forecast'
  | 'sla-performance'
  | 'csat-happy-code'
  | 'service-day-book'
  // SLA + Escalation (`d s*`)
  | 'sla-matrix'
  | 'escalation-tree'
  // OEM Claims (`d o*`)
  | 'oem-claim-list'
  | 'oem-claim-detail'
  // Customer Hub (`d c*`)
  | 'customer-360'
  | 'customer-tier'
  // Settings (`d g*`)
  | 'risk-engine-settings'
  | 'commission-settings'
  | 'renewal-cascade-settings'
  | 'email-templates'
  | 'tellicaller-triggers'
  | 'call-type-master';
