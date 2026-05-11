/**
 * @file        src/apps/erp/configs/sitex-sidebar-config.ts
 * @purpose     SiteX canonical sidebar · 9 groups · ~40 modules · 10th card on Shell pattern · Q-LOCK-10a
 * @who         Site Manager · Site Engineer · Project Manager · Operations Lead
 * @when        2026-05-11
 * @sprint      T-Phase-1.A.14 SiteX Foundation · Q-LOCK-10a + Q-LOCK-13a · Block C.1 · NEW canonical
 * @iso         ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-CC `'s *'` keyboard namespace 6th consumer · D-NEW-CT 17th canonical · D-NEW-CU POSSIBLE
 * @disciplines FR-1 · FR-30 · FR-58 Shell pattern · FR-67 broad-stem · FR-72 candidate
 * @reuses      SidebarItem from @/shell/types · CardId 'sitex' from @/types/card-entitlement
 * @[JWT]       N/A (config only)
 */

import {
  Home, MapPin, FileText, ClipboardList, AlertTriangle, Calendar, BookOpen, ListChecks,
  HardHat, UserCheck, Shield, Stamp, ScrollText, Activity,
  Package, Warehouse, ArrowDownToLine, ArrowUpFromLine, Trash2,
  ShoppingCart, FileStack, Wallet, Receipt, PiggyBank, FileSpreadsheet,
  FlaskConical, AlertOctagon, CheckCircle2, BellRing,
  Truck, DoorOpen, DoorClosed, Forklift,
  FileCheck, Signature, FileCog, Send, Cog, BarChart3,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const sitexSidebarItems: SidebarItem[] = [
  {
    id: 'welcome',
    type: 'item',
    label: 'Welcome',
    icon: Home,
    moduleId: 'welcome',
    requiredCards: ['sitex'],
    keyboard: 's w',
  },
  {
    id: 'site-setup-group',
    type: 'group',
    label: 'Site Setup & Master',
    icon: MapPin,
    children: [
      { id: 'site-list', type: 'item', label: 'Site List', icon: ListChecks, moduleId: 'site-list', requiredCards: ['sitex'], keyboard: 's l' },
      { id: 'mobilize-site', type: 'item', label: 'Mobilize New Site', icon: MapPin, moduleId: 'mobilize-site', requiredCards: ['sitex'], keyboard: 's m' },
      { id: 'site-detail', type: 'item', label: 'Site Detail', icon: FileText, moduleId: 'site-detail', requiredCards: ['sitex'], keyboard: 's d' },
      { id: 'subcontractor-master', type: 'item', label: 'Sub-Contractor Master', icon: HardHat, moduleId: 'subcontractor-master', requiredCards: ['sitex'], keyboard: 's c' },
      { id: 'local-vendor-submaster', type: 'item', label: 'Local Vendor Sub-Master', icon: UserCheck, moduleId: 'local-vendor-submaster', requiredCards: ['sitex'] },
    ],
  },
  {
    id: 'daily-operations-group',
    type: 'group',
    label: 'Daily Operations',
    icon: Activity,
    children: [
      { id: 'dpr', type: 'item', label: 'DPR (Daily Progress Report)', icon: FileText, moduleId: 'dpr', requiredCards: ['sitex'], keyboard: 's p' },
      { id: 'snag-register', type: 'item', label: 'Snag Register', icon: AlertTriangle, moduleId: 'snag-register', requiredCards: ['sitex'], keyboard: 's n' },
      { id: 'look-ahead-plan', type: 'item', label: 'Look-Ahead Plan (14-day)', icon: Calendar, moduleId: 'look-ahead-plan', requiredCards: ['sitex'] },
      { id: 'sop-compliance', type: 'item', label: 'SOP Compliance', icon: BookOpen, moduleId: 'sop-compliance', requiredCards: ['sitex'] },
      { id: 'task-allocation', type: 'item', label: 'Task Allocation', icon: ClipboardList, moduleId: 'task-allocation', requiredCards: ['sitex'] },
    ],
  },
  {
    id: 'workforce-safety-group',
    type: 'group',
    label: 'Workforce & Safety',
    icon: Shield,
    children: [
      { id: 'labour-roster', type: 'item', label: 'Labour Roster', icon: HardHat, moduleId: 'labour-roster', requiredCards: ['sitex'] },
      { id: 'attendance', type: 'item', label: 'Attendance (biometric)', icon: UserCheck, moduleId: 'attendance', requiredCards: ['sitex'], keyboard: 's a' },
      { id: 'ppe-log', type: 'item', label: 'PPE Issue Log', icon: Shield, moduleId: 'ppe-log', requiredCards: ['sitex'] },
      { id: 'toolbox-talks', type: 'item', label: 'Toolbox Talks', icon: ScrollText, moduleId: 'toolbox-talks', requiredCards: ['sitex'] },
      { id: 'ptw', type: 'item', label: 'Permit-to-Work (PTW)', icon: Stamp, moduleId: 'ptw', requiredCards: ['sitex'] },
      { id: 'jsa', type: 'item', label: 'Job Safety Analysis (JSA)', icon: FileCheck, moduleId: 'jsa', requiredCards: ['sitex'] },
      { id: 'safety-incidents', type: 'item', label: 'Safety Incidents', icon: AlertOctagon, moduleId: 'safety-incidents', requiredCards: ['sitex'] },
    ],
  },
  {
    id: 'materials-stock-group',
    type: 'group',
    label: 'Materials & Stock',
    icon: Package,
    children: [
      { id: 'site-stock', type: 'item', label: 'Site Stock View', icon: Warehouse, moduleId: 'site-stock', requiredCards: ['sitex'] },
      { id: 'material-receipts', type: 'item', label: 'Material Receipts (GRN)', icon: ArrowDownToLine, moduleId: 'material-receipts', requiredCards: ['sitex'] },
      { id: 'material-issues', type: 'item', label: 'Material Issues', icon: ArrowUpFromLine, moduleId: 'material-issues', requiredCards: ['sitex'], keyboard: 's i' },
      { id: 'returns-to-ho', type: 'item', label: 'Returns to HO', icon: ArrowUpFromLine, moduleId: 'returns-to-ho', requiredCards: ['sitex'] },
      { id: 'wastage-register', type: 'item', label: 'Wastage Register', icon: Trash2, moduleId: 'wastage-register', requiredCards: ['sitex'] },
    ],
  },
  {
    id: 'procurement-finance-group',
    type: 'group',
    label: 'Procurement & Site Finance',
    icon: Wallet,
    children: [
      { id: 'site-pr', type: 'item', label: 'Site PR (Purchase Requisition)', icon: ShoppingCart, moduleId: 'site-pr', requiredCards: ['sitex'] },
      { id: 'site-po', type: 'item', label: 'Site PO (delegated)', icon: FileStack, moduleId: 'site-po', requiredCards: ['sitex'] },
      { id: 'imprest-receipt', type: 'item', label: 'Imprest Receipt', icon: PiggyBank, moduleId: 'imprest-receipt', requiredCards: ['sitex'], keyboard: 's f' },
      { id: 'site-payments', type: 'item', label: 'Site Payments', icon: Receipt, moduleId: 'site-payments', requiredCards: ['sitex'] },
      { id: 'petty-cash', type: 'item', label: 'Petty Cash Log', icon: Wallet, moduleId: 'petty-cash', requiredCards: ['sitex'] },
      { id: 'site-reconciliation', type: 'item', label: 'Site Reconciliation', icon: FileSpreadsheet, moduleId: 'site-reconciliation', requiredCards: ['sitex'] },
      { id: 'boq', type: 'item', label: 'BOQ (Bill of Quantities)', icon: FileSpreadsheet, moduleId: 'boq', requiredCards: ['sitex'] },
      { id: 'ra-bills', type: 'item', label: 'Sub-Contractor RA Bills', icon: Receipt, moduleId: 'ra-bills', requiredCards: ['sitex'] },
    ],
  },
  {
    id: 'quality-group',
    type: 'group',
    label: 'Quality',
    icon: FlaskConical,
    children: [
      { id: 'site-inspections', type: 'item', label: 'Site Inspections', icon: FlaskConical, moduleId: 'site-inspections', requiredCards: ['sitex'] },
      { id: 'site-ncr', type: 'item', label: 'Site NCR', icon: AlertOctagon, moduleId: 'site-ncr', requiredCards: ['sitex'] },
      { id: 'pre-commissioning-tests', type: 'item', label: 'Pre-Commissioning Tests', icon: CheckCircle2, moduleId: 'pre-commissioning-tests', requiredCards: ['sitex'] },
      { id: 'drawing-currency-alerts', type: 'item', label: 'Drawing Currency Alerts', icon: BellRing, moduleId: 'drawing-currency-alerts', requiredCards: ['sitex'] },
    ],
  },
  {
    id: 'equipment-group',
    type: 'group',
    label: 'Equipment',
    icon: Forklift,
    children: [
      { id: 'equipment-deployed', type: 'item', label: 'Equipment Deployed Register', icon: Forklift, moduleId: 'equipment-deployed', requiredCards: ['sitex'] },
      { id: 'equipment-log', type: 'item', label: 'Daily Equipment Log', icon: Activity, moduleId: 'equipment-log', requiredCards: ['sitex'] },
      { id: 'fuel-maintenance', type: 'item', label: 'Fuel & Maintenance', icon: Cog, moduleId: 'fuel-maintenance', requiredCards: ['sitex'] },
    ],
  },
  {
    id: 'logistics-group',
    type: 'group',
    label: 'Logistics',
    icon: Truck,
    children: [
      { id: 'site-inward-gate', type: 'item', label: 'Site Inward Gate', icon: DoorOpen, moduleId: 'site-inward-gate', requiredCards: ['sitex'] },
      { id: 'site-outward-gate', type: 'item', label: 'Site Outward Gate', icon: DoorClosed, moduleId: 'site-outward-gate', requiredCards: ['sitex'] },
      { id: 'vehicle-movement', type: 'item', label: 'Vehicle Movement Log', icon: Truck, moduleId: 'vehicle-movement', requiredCards: ['sitex'] },
    ],
  },
  {
    id: 'closeout-reports-group',
    type: 'group',
    label: 'Closeout & Reports',
    icon: FileCheck,
    children: [
      { id: 'customer-signoff', type: 'item', label: 'Customer Signoff', icon: Signature, moduleId: 'customer-signoff', requiredCards: ['sitex'] },
      { id: 'commissioning-report', type: 'item', label: 'Commissioning Report', icon: FileCog, moduleId: 'commissioning-report', requiredCards: ['sitex'] },
      { id: 'servicedesk-handoff', type: 'item', label: 'ServiceDesk Handoff', icon: Send, moduleId: 'servicedesk-handoff', requiredCards: ['sitex'] },
      { id: 'maintainpro-handoff', type: 'item', label: 'MaintainPro Handoff', icon: Send, moduleId: 'maintainpro-handoff', requiredCards: ['sitex'] },
      { id: 'asset-capitalization', type: 'item', label: 'Asset Capitalization', icon: PiggyBank, moduleId: 'asset-capitalization', requiredCards: ['sitex'] },
      { id: 'turnkey-checklist', type: 'item', label: 'Turnkey Checklist', icon: ClipboardList, moduleId: 'turnkey-checklist', requiredCards: ['sitex'] },
      { id: 'surplus-returns', type: 'item', label: 'Surplus Material Returns', icon: ArrowUpFromLine, moduleId: 'surplus-returns', requiredCards: ['sitex'] },
      { id: 'final-reconciliation', type: 'item', label: 'Final Site Reconciliation', icon: FileSpreadsheet, moduleId: 'final-reconciliation', requiredCards: ['sitex'] },
      { id: 'close-certificate', type: 'item', label: 'Close Certificate', icon: FileCheck, moduleId: 'close-certificate', requiredCards: ['sitex'] },
      { id: 'sitex-reports', type: 'item', label: 'Site Reports', icon: BarChart3, moduleId: 'sitex-reports', requiredCards: ['sitex'], keyboard: 's r' },
    ],
  },
];
