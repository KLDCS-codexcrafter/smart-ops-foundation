/**
 * @file        src/pages/erp/maintainpro/MaintainProSidebar.types.ts
 * @purpose     MaintainProModule discriminated union · maps to sidebar moduleId
 * @sprint      T-Phase-1.A.16a · Block C.5
 * @whom        Audit Owner
 */

export type MaintainProModule =
  // Welcome
  | 'welcome'
  // Asset Master
  | 'equipment-list'
  | 'equipment-detail'
  | 'spare-parts'
  | 'calibration-instruments'
  | 'fire-safety'
  | 'maintenance-vendor'
  // PM Schedules
  | 'pm-template-master'
  | 'active-schedules'
  | 'pm-calendar'
  | 'overdue-pm'
  // Breakdowns & Work Orders
  | 'raise-breakdown'
  | 'work-orders'
  | 'wo-inbox'
  | 'completed-wo'
  | 'equipment-history'
  // Spare Parts Movement
  | 'spares-issue'
  | 'equipment-movement'
  | 'amc-out-to-vendor'
  | 'spare-reorder-alerts'
  // Internal Helpdesk
  | 'raise-ticket'
  | 'ticket-inbox'
  | 'open-tickets'
  | 'sla-dashboard'
  | 'ticket-categories-master'
  // Compliance
  | 'calibration-due'
  | 'fire-safety-expiry'
  | 'warranty-tracker'
  | 'asset-capitalization'
  // Reports
  | 'equipment-master-list'
  | 'spares-stock-summary'
  | 'breakdown-register'
  | 'maintenance-graph'
  | 'pm-compliance'
  | 'mtbf-mttr'
  | 'production-capacity-feedback'
  | 'spare-consumption'
  | 'equipment-tco'
  | 'open-tickets-report'
  | 'amc-out-status-report'
  | 'energy-esg'
  // A.16c reports + dashboard (NEW)
  | 'maint-entry-day-book'
  | 'calibration-status'
  | 'fire-safety-expiry-report'
  | 'spares-issue-day-book'
  | 'open-wo-status'
  | 'open-tickets-live'
  | 'sla-performance'
  | 'aging-tickets'
  | 'top-reporters'
  | 'production-capacity-dashboard';
