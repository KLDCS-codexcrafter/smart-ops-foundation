/**
 * @file        src/apps/erp/configs/maintainpro-sidebar-config.ts
 * @purpose     MaintainPro canonical sidebar · 8 groups · ~38 modules · 11th card on Shell · Q-LOCK-9
 * @who         Maintenance teams · Plant Head · Safety · QC
 * @when        2026-05-12
 * @sprint      T-Phase-1.A.16a · Block C.1
 * @whom        Audit Owner
 * @decisions   D-NEW-CC 'm *' namespace 7th consumer · D-NEW-CT 11th sidebar
 * @disciplines FR-30 · FR-58 Shell · FR-72 candidate
 * @reuses      SidebarItem from @/shell/types
 * @[JWT]       N/A (config only)
 */

import {
  Home,
  Wrench,
  Settings,
  FileText,
  ClipboardList,
  AlertTriangle,
  Calendar,
  BookOpen,
  Activity,
  Package,
  Truck,
  ShieldAlert,
  FlaskConical,
  Flame,
  Building,
  Receipt,
  BarChart3,
  TrendingUp,
  GitBranch,
  Zap,
  Award,
  ListChecks,
  AlertOctagon,
  CheckCircle2,
  Inbox,
  Send,
  Stamp,
  BookCheck,
  Layers,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const maintainproSidebarItems: SidebarItem[] = [
  {
    id: 'welcome',
    type: 'item',
    label: 'Welcome',
    icon: Home,
    moduleId: 'welcome',
    requiredCards: ['maintainpro'],
  },
  {
    id: 'asset-master-group',
    type: 'group',
    label: 'Asset Master',
    icon: Wrench,
    children: [
      { id: 'equipment-list', type: 'item', label: 'Equipment List', icon: ListChecks, moduleId: 'equipment-list', requiredCards: ['maintainpro'] },
      { id: 'equipment-detail', type: 'item', label: 'Equipment Detail', icon: FileText, moduleId: 'equipment-detail', requiredCards: ['maintainpro'] },
      { id: 'spare-parts', type: 'item', label: 'Spare Parts (Inventory Hub replica)', icon: Package, moduleId: 'spare-parts', requiredCards: ['maintainpro'] },
      { id: 'calibration-instruments', type: 'item', label: 'Calibration Instruments', icon: FlaskConical, moduleId: 'calibration-instruments', requiredCards: ['maintainpro'] },
      { id: 'fire-safety', type: 'item', label: 'Fire Safety & Emergency', icon: Flame, moduleId: 'fire-safety', requiredCards: ['maintainpro'] },
      { id: 'maintenance-vendor', type: 'item', label: 'Maintenance Vendor (CC replica)', icon: Building, moduleId: 'maintenance-vendor', requiredCards: ['maintainpro'] },
    ],
  },
  {
    id: 'pm-schedules-group',
    type: 'group',
    label: 'PM Schedules',
    icon: Calendar,
    children: [
      { id: 'pm-template-master', type: 'item', label: 'PM Schedule Template Master', icon: BookOpen, moduleId: 'pm-template-master', requiredCards: ['maintainpro'] },
      { id: 'active-schedules', type: 'item', label: 'Active PM Schedules', icon: Calendar, moduleId: 'active-schedules', requiredCards: ['maintainpro'] },
      { id: 'pm-calendar', type: 'item', label: 'PM Calendar View', icon: Calendar, moduleId: 'pm-calendar', requiredCards: ['maintainpro'] },
      { id: 'overdue-pm', type: 'item', label: 'Overdue PM', icon: AlertOctagon, moduleId: 'overdue-pm', requiredCards: ['maintainpro'] },
    ],
  },
  {
    id: 'breakdowns-wo-group',
    type: 'group',
    label: 'Breakdowns & Work Orders',
    icon: AlertTriangle,
    children: [
      { id: 'raise-breakdown', type: 'item', label: 'Raise Breakdown', icon: AlertTriangle, moduleId: 'raise-breakdown', requiredCards: ['maintainpro'] },
      { id: 'work-orders', type: 'item', label: 'Work Orders', icon: ClipboardList, moduleId: 'work-orders', requiredCards: ['maintainpro'] },
      { id: 'wo-inbox', type: 'item', label: 'WO Inbox (Assigned to Me)', icon: Inbox, moduleId: 'wo-inbox', requiredCards: ['maintainpro'] },
      { id: 'completed-wo', type: 'item', label: 'Completed Work Orders', icon: CheckCircle2, moduleId: 'completed-wo', requiredCards: ['maintainpro'] },
      { id: 'equipment-history', type: 'item', label: 'Equipment History (TDL Day Book)', icon: BookCheck, moduleId: 'equipment-history', requiredCards: ['maintainpro'] },
    ],
  },
  {
    id: 'spare-parts-movement-group',
    type: 'group',
    label: 'Spare Parts Movement',
    icon: Package,
    children: [
      { id: 'spares-issue', type: 'item', label: 'Spares Issue (TDL)', icon: Send, moduleId: 'spares-issue', requiredCards: ['maintainpro'] },
      { id: 'equipment-movement', type: 'item', label: 'Equipment Movement', icon: Truck, moduleId: 'equipment-movement', requiredCards: ['maintainpro'] },
      { id: 'amc-out-to-vendor', type: 'item', label: 'AMC Out-to-Vendor', icon: GitBranch, moduleId: 'amc-out-to-vendor', requiredCards: ['maintainpro'] },
      { id: 'spare-reorder-alerts', type: 'item', label: 'Spare Reorder Alerts (OOB-M7)', icon: AlertOctagon, moduleId: 'spare-reorder-alerts', requiredCards: ['maintainpro'] },
    ],
  },
  {
    id: 'internal-helpdesk-group',
    type: 'group',
    label: 'Internal Helpdesk',
    icon: Inbox,
    children: [
      { id: 'raise-ticket', type: 'item', label: 'Raise Ticket', icon: Inbox, moduleId: 'raise-ticket', requiredCards: ['maintainpro'] },
      { id: 'ticket-inbox', type: 'item', label: 'Ticket Inbox', icon: Inbox, moduleId: 'ticket-inbox', requiredCards: ['maintainpro'] },
      { id: 'open-tickets', type: 'item', label: 'Open Tickets', icon: AlertTriangle, moduleId: 'open-tickets', requiredCards: ['maintainpro'] },
      { id: 'sla-dashboard', type: 'item', label: 'SLA Performance Dashboard', icon: BarChart3, moduleId: 'sla-dashboard', requiredCards: ['maintainpro'] },
      { id: 'ticket-categories-master', type: 'item', label: 'Ticket Categories Master', icon: Settings, moduleId: 'ticket-categories-master', requiredCards: ['maintainpro'] },
    ],
  },
  {
    id: 'compliance-group',
    type: 'group',
    label: 'Compliance',
    icon: ShieldAlert,
    children: [
      { id: 'calibration-due', type: 'item', label: 'Calibration Due Alerts', icon: FlaskConical, moduleId: 'calibration-due', requiredCards: ['maintainpro'] },
      { id: 'fire-safety-expiry', type: 'item', label: 'Fire Safety Expiry Register', icon: Flame, moduleId: 'fire-safety-expiry', requiredCards: ['maintainpro'] },
      { id: 'warranty-tracker', type: 'item', label: 'Warranty Tracker (OOB-M8)', icon: Award, moduleId: 'warranty-tracker', requiredCards: ['maintainpro'] },
      { id: 'asset-capitalization', type: 'item', label: 'Asset Capitalization', icon: Stamp, moduleId: 'asset-capitalization', requiredCards: ['maintainpro'] },
    ],
  },
  {
    id: 'reports-group',
    type: 'group',
    label: 'Reports',
    icon: BarChart3,
    children: [
      { id: 'equipment-master-list', type: 'item', label: 'Equipment Master List', icon: ListChecks, moduleId: 'equipment-master-list', requiredCards: ['maintainpro'] },
      { id: 'spares-stock-summary', type: 'item', label: 'Spares Stock Summary', icon: Package, moduleId: 'spares-stock-summary', requiredCards: ['maintainpro'] },
      { id: 'breakdown-register', type: 'item', label: 'Breakdown Register', icon: AlertTriangle, moduleId: 'breakdown-register', requiredCards: ['maintainpro'] },
      { id: 'maintenance-graph', type: 'item', label: 'Maintenance Graph', icon: TrendingUp, moduleId: 'maintenance-graph', requiredCards: ['maintainpro'] },
      { id: 'pm-compliance', type: 'item', label: 'PM Compliance', icon: CheckCircle2, moduleId: 'pm-compliance', requiredCards: ['maintainpro'] },
      { id: 'mtbf-mttr', type: 'item', label: 'MTBF / MTTR', icon: Activity, moduleId: 'mtbf-mttr', requiredCards: ['maintainpro'] },
      { id: 'production-capacity-feedback', type: 'item', label: 'Production Capacity Feedback', icon: Zap, moduleId: 'production-capacity-feedback', requiredCards: ['maintainpro'] },
      { id: 'spare-consumption', type: 'item', label: 'Spare Consumption by Equipment', icon: Package, moduleId: 'spare-consumption', requiredCards: ['maintainpro'] },
      { id: 'equipment-tco', type: 'item', label: 'Equipment Cost-to-Date (TCO)', icon: Receipt, moduleId: 'equipment-tco', requiredCards: ['maintainpro'] },
      { id: 'open-tickets-report', type: 'item', label: 'Open Tickets Report', icon: Inbox, moduleId: 'open-tickets-report', requiredCards: ['maintainpro'] },
      { id: 'amc-out-status-report', type: 'item', label: 'AMC Out-to-Vendor Status', icon: GitBranch, moduleId: 'amc-out-status-report', requiredCards: ['maintainpro'] },
      { id: 'energy-esg', type: 'item', label: 'Energy / ESG (OOB-M12)', icon: Layers, moduleId: 'energy-esg', requiredCards: ['maintainpro'] },
    ],
  },
];
