/**
 * @file        src/pages/erp/servicedesk/ServiceDeskSidebar.types.ts
 * @purpose     ServiceDesk discriminated module union · maps to sidebar moduleId
 * @sprint      T-Phase-1.C.1a · Block F.2 · v2 spec · EXTENDED at C.1b for IV
 * @iso        Usability
 */

export type ServiceDeskModule =
  | 'welcome'
  // AMC Pipeline (`d a*`)
  | 'amc-applicability-decision'
  | 'amc-proposal-list'
  | 'amc-proposal-detail'
  | 'amc-active-list'
  | 'amc-expiring-list'
  | 'amc-lapsed-list'
  // Installation Verification (`d i*`) · C.1b NEW
  | 'installation-verification-list'
  | 'installation-verification-detail'
  // Service Tickets (`d t*`)
  | 'ticket-inbox'
  | 'ticket-raise'
  | 'ticket-detail'
  | 'ticket-completion'
  | 'standby-loans'
  // Repair Routing (`d p*`) · C.1c NEW
  | 'repair-routes'
  | 'spares-issued'
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
  // Customer Hub extensions · C.1e NEW
  | 'customer-sla-enquiry'
  | 'customer-reminders'
  | 'service-availed'
  | 'customer-comm-log'
  // Reports · C.1e carry-forward from C.1d T2
  | 'promised-vs-actual-variance'
  | 'amc-profitability-per-customer'
  // Settings (`d g*`)
  | 'risk-engine-settings'
  | 'commission-settings'
  | 'renewal-cascade-settings'
  | 'email-templates'
  | 'tellicaller-triggers'
  | 'call-type-master';
