/**
 * @file        src/apps/erp/configs/servicedesk-sidebar-config.ts
 * @purpose     ServiceDesk canonical sidebar · 8 groups + IV group · FR-74 'd' keyboard namespace
 * @sprint      T-Phase-1.C.1a · Block F.5 · v2 spec · EXTENDED at C.1b (8 comingSoon flips + IV group)
 * @decisions   D-NEW-CC 'd *' namespace · D-NEW-CT 12th sidebar
 * @iso        Usability + Maintainability
 */
import {
  Home,
  Headphones,
  ListChecks,
  Users,
  BarChart3,
  ShieldCheck,
  MessageSquare,
  Building,
  Settings,
  ClipboardCheck,
  Wrench,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const servicedeskSidebarItems: SidebarItem[] = [
  {
    id: 'welcome',
    type: 'item',
    label: 'Welcome',
    icon: Home,
    moduleId: 'welcome',
    requiredCards: ['servicedesk'],
    keyboard: 'd w',
  },
  {
    id: 'amc-pipeline-group',
    type: 'group',
    label: 'AMC Pipeline',
    icon: ListChecks,
    children: [
      { id: 'amc-applicability', type: 'item', label: 'Applicability Decision', moduleId: 'amc-applicability-decision', requiredCards: ['servicedesk'], keyboard: 'd a a' },
      { id: 'amc-proposal', type: 'item', label: 'Proposals', moduleId: 'amc-proposal-list', requiredCards: ['servicedesk'], keyboard: 'd a p' },
      { id: 'amc-active', type: 'item', label: 'Active AMCs', moduleId: 'amc-active-list', requiredCards: ['servicedesk'], keyboard: 'd a v' },
      { id: 'amc-expiring', type: 'item', label: 'Expiring Soon', moduleId: 'amc-expiring-list', requiredCards: ['servicedesk'], keyboard: 'd a e' },
      { id: 'amc-lapsed', type: 'item', label: 'Lapsed', moduleId: 'amc-lapsed-list', requiredCards: ['servicedesk'], keyboard: 'd a l' },
    ],
  },
  {
    id: 'installation-verification-group',
    type: 'group',
    label: 'Installation Verification',
    icon: ClipboardCheck,
    children: [
      { id: 'iv-list', type: 'item', label: 'All Verifications', moduleId: 'installation-verification-list', requiredCards: ['servicedesk'], keyboard: 'd i l' },
      { id: 'iv-detail', type: 'item', label: 'Verification Detail', moduleId: 'installation-verification-detail', requiredCards: ['servicedesk'], keyboard: 'd i d' },
    ],
  },
  {
    id: 'service-tickets-group',
    type: 'group',
    label: 'Service Tickets',
    icon: MessageSquare,
    children: [
      { id: 'ticket-inbox', type: 'item', label: 'Inbox', moduleId: 'ticket-inbox', requiredCards: ['servicedesk'], keyboard: 'd t i' },
      { id: 'ticket-raise', type: 'item', label: 'Raise Ticket', moduleId: 'ticket-raise', requiredCards: ['servicedesk'], keyboard: 'd t r' },
      { id: 'ticket-completion', type: 'item', label: 'Completion (OTP gate)', moduleId: 'ticket-completion', requiredCards: ['servicedesk'], keyboard: 'd t c' },
      { id: 'standby-loans', type: 'item', label: 'Standby Loans', moduleId: 'standby-loans', requiredCards: ['servicedesk'], keyboard: 'd t s' },
    ],
  },
  {
    id: 'repair-routing-group',
    type: 'group',
    label: 'Repair Routing',
    icon: Wrench,
    children: [
      { id: 'repair-routes', type: 'item', label: 'Repair Routes', moduleId: 'repair-routes', requiredCards: ['servicedesk'], keyboard: 'd p r' },
      { id: 'spares-issued', type: 'item', label: 'Spares Issued (Field)', moduleId: 'spares-issued', requiredCards: ['servicedesk'], keyboard: 'd p s' },
    ],
  },
  {
    id: 'engineers-group',
    type: 'group',
    label: 'Service Engineers',
    icon: Users,
    children: [
      { id: 'engineer-list', type: 'item', label: 'Engineer List', moduleId: 'engineer-list', requiredCards: ['servicedesk'], keyboard: 'd e l', comingSoon: true },
      { id: 'engineer-roster', type: 'item', label: 'Roster', moduleId: 'engineer-roster', requiredCards: ['servicedesk'], keyboard: 'd e r', comingSoon: true },
      { id: 'engineer-capacity', type: 'item', label: 'Capacity', moduleId: 'engineer-capacity', requiredCards: ['servicedesk'], keyboard: 'd e c', comingSoon: true },
    ],
  },
  {
    id: 'reports-group',
    type: 'group',
    label: 'Reports',
    icon: BarChart3,
    children: [
      { id: 'amc-renewal-forecast', type: 'item', label: 'Renewal Forecast', moduleId: 'amc-renewal-forecast', requiredCards: ['servicedesk'], keyboard: 'd r f' },
      { id: 'sla-performance', type: 'item', label: 'SLA Performance', moduleId: 'sla-performance', requiredCards: ['servicedesk'], keyboard: 'd r s' },
      { id: 'csat-happy-code', type: 'item', label: 'CSAT · HappyCode', moduleId: 'csat-happy-code', requiredCards: ['servicedesk'], keyboard: 'd r h' },
      { id: 'service-day-book', type: 'item', label: 'Service Day Book', moduleId: 'service-day-book', requiredCards: ['servicedesk'], keyboard: 'd r d' },
      { id: 'promised-vs-actual-variance', type: 'item', label: 'Promised vs Actual', moduleId: 'promised-vs-actual-variance', requiredCards: ['servicedesk'], keyboard: 'd r v' },
      { id: 'amc-profitability-per-customer', type: 'item', label: 'AMC Profitability', moduleId: 'amc-profitability-per-customer', requiredCards: ['servicedesk'], keyboard: 'd r p' },
    ],
  },
  {
    id: 'sla-group',
    type: 'group',
    label: 'SLA + Escalation',
    icon: ShieldCheck,
    children: [
      { id: 'sla-matrix', type: 'item', label: 'SLA Matrix', moduleId: 'sla-matrix', requiredCards: ['servicedesk'], keyboard: 'd s m' },
      { id: 'escalation-tree', type: 'item', label: 'Escalation Tree', moduleId: 'escalation-tree', requiredCards: ['servicedesk'], keyboard: 'd s e' },
    ],
  },
  {
    id: 'oem-claims-group',
    type: 'group',
    label: 'OEM Claims',
    icon: Headphones,
    children: [
      { id: 'oem-claim-list', type: 'item', label: 'Claims', moduleId: 'oem-claim-list', requiredCards: ['servicedesk'], keyboard: 'd o l' },
      { id: 'oem-claim-detail', type: 'item', label: 'Claim Detail', moduleId: 'oem-claim-detail', requiredCards: ['servicedesk'], keyboard: 'd o d' },
    ],
  },
  {
    id: 'customer-hub-group',
    type: 'group',
    label: 'Customer Hub',
    icon: Building,
    children: [
      { id: 'customer-360', type: 'item', label: 'Customer 360', moduleId: 'customer-360', requiredCards: ['servicedesk'], keyboard: 'd c h' },
      { id: 'customer-tier', type: 'item', label: 'Service Tier', moduleId: 'customer-tier', requiredCards: ['servicedesk'], keyboard: 'd c t' },
      { id: 'customer-sla-enquiry', type: 'item', label: 'SLA Enquiry', moduleId: 'customer-sla-enquiry', requiredCards: ['servicedesk'], keyboard: 'd c s' },
      { id: 'customer-reminders', type: 'item', label: 'Reminders', moduleId: 'customer-reminders', requiredCards: ['servicedesk'], keyboard: 'd c r' },
      { id: 'service-availed', type: 'item', label: 'Service Availed', moduleId: 'service-availed', requiredCards: ['servicedesk'], keyboard: 'd c v' },
      { id: 'customer-comm-log', type: 'item', label: 'Comm Log', moduleId: 'customer-comm-log', requiredCards: ['servicedesk'], keyboard: 'd c m' },
    ],
  },
  {
    id: 'settings-group',
    type: 'group',
    label: 'Settings',
    icon: Settings,
    children: [
      { id: 'risk-engine-settings', type: 'item', label: 'Risk Engine', moduleId: 'risk-engine-settings', requiredCards: ['servicedesk'], keyboard: 'd g r' },
      { id: 'commission-settings', type: 'item', label: 'Commission Rates', moduleId: 'commission-settings', requiredCards: ['servicedesk'], keyboard: 'd g c', comingSoon: true },
      { id: 'renewal-cascade-settings', type: 'item', label: 'Renewal Cascade', moduleId: 'renewal-cascade-settings', requiredCards: ['servicedesk'], keyboard: 'd g n' },
      { id: 'email-templates', type: 'item', label: 'Email Templates', moduleId: 'email-templates', requiredCards: ['servicedesk'], keyboard: 'd g e', comingSoon: true },
      { id: 'tellicaller-triggers', type: 'item', label: 'Tellicaller Triggers', moduleId: 'tellicaller-triggers', requiredCards: ['servicedesk'], keyboard: 'd g t', comingSoon: true },
      { id: 'call-type-master', type: 'item', label: 'Call Type Master', moduleId: 'call-type-master', requiredCards: ['servicedesk'], keyboard: 'd g m', comingSoon: true },
    ],
  },
];
