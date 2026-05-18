/**
 * @file        src/apps/erp/configs/requestx-sidebar-config.ts
 * @purpose     Sidebar data config for RequestX (Internal request hub) · canonical pattern · D-NEW-CC compliance
 * @who         All department staff · HOD · Purchase team · Finance · Top management
 * @when        2026-05-18
 * @sprint      T-Phase-1.D-RequestX-Shell-Migration · Q-LOCK 5th FR-81 application
 * @iso         ISO 25010 Maintainability · Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-CC canonical (sidebar keyboard uniqueness) · D-250 (Shell pattern lock · FR-58) ·
 *              FR-81 canonical sibling pattern adoption (5th application post-promotion at TXUI arc closure)
 * @disciplines FR-30 · FR-58 · FR-81
 * @reuses      @/shell/types SidebarItem · lucide-react icons · existing RequestXModule type from
 *              src/pages/erp/requestx/RequestXSidebar.types.ts (preserved verbatim · 0-diff per D-NEW-CC)
 * @[JWT]       N/A (config only)
 *
 * Keyboard namespace: 'r *' prefix · D-NEW-CC uniqueness preserved
 *   (existing prefixes in use: 'd' / 'e' / 'g' / 'm' / 'q' / 's' / 'x' · 'r' is FREE)
 */
import {
  Home, ClipboardList, FileText, Building2, Inbox, ListChecks, BarChart3,
  Briefcase, AlertCircle, Clock, TrendingDown, FolderTree,
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const requestxSidebarItems: SidebarItem[] = [
  {
    id: 'welcome',
    type: 'item',
    label: 'Welcome',
    icon: Home,
    moduleId: 'welcome',
    requiredCards: ['requestx'],
    keyboard: 'r w',
  },
  {
    id: 'transactions-group',
    type: 'group',
    label: 'Transactions',
    icon: ClipboardList,
    collapsibleByDefault: false,
    children: [
      { id: 'tx-material-indent', type: 'item', label: 'Material Indent', icon: ClipboardList, moduleId: 'tx-material-indent', requiredCards: ['requestx'], keyboard: 'r m' },
      { id: 'tx-service-request', type: 'item', label: 'Service Request', icon: FileText, moduleId: 'tx-service-request', requiredCards: ['requestx'], keyboard: 'r s' },
      { id: 'tx-capital-indent', type: 'item', label: 'Capital Indent', icon: Building2, moduleId: 'tx-capital-indent', requiredCards: ['requestx'], keyboard: 'r c' },
      { id: 'tx-approval-inbox', type: 'item', label: 'Approval Inbox', icon: Inbox, moduleId: 'tx-approval-inbox', requiredCards: ['requestx'], keyboard: 'r i' },
    ],
  },
  {
    id: 'reports-group',
    type: 'group',
    label: 'Reports',
    icon: BarChart3,
    collapsibleByDefault: true,
    children: [
      { id: 'rpt-indent-register', type: 'item', label: 'Indent Register', icon: ListChecks, moduleId: 'rpt-indent-register', requiredCards: ['requestx'], keyboard: 'r r' },
      { id: 'rpt-indent-pending', type: 'item', label: 'Pending', icon: AlertCircle, moduleId: 'rpt-indent-pending', requiredCards: ['requestx'], keyboard: 'r p' },
      { id: 'rpt-indent-closed', type: 'item', label: 'Closed', icon: FileText, moduleId: 'rpt-indent-closed', requiredCards: ['requestx'], keyboard: 'r l' },
      { id: 'rpt-po-against-indent', type: 'item', label: 'PO against Indent', icon: Briefcase, moduleId: 'rpt-po-against-indent', requiredCards: ['requestx'], keyboard: 'r o' },
      { id: 'rpt-department-summary', type: 'item', label: 'Department-wise', icon: BarChart3, moduleId: 'rpt-department-summary', requiredCards: ['requestx'], keyboard: 'r d' },
      { id: 'rpt-category-spend', type: 'item', label: 'Category Spend', icon: TrendingDown, moduleId: 'rpt-category-spend', requiredCards: ['requestx'], keyboard: 'r g' },
      { id: 'rpt-ageing-pending', type: 'item', label: 'Ageing of Pending', icon: Clock, moduleId: 'rpt-ageing-pending', requiredCards: ['requestx'], keyboard: 'r a' },
      { id: 'rpt-service-request-register', type: 'item', label: 'Service Request Register', icon: FileText, moduleId: 'rpt-service-request-register', requiredCards: ['requestx'], keyboard: 'r e' },
    ],
  },
  {
    id: 'masters-group',
    type: 'group',
    label: 'Masters',
    icon: FolderTree,
    collapsibleByDefault: true,
    children: [
      { id: 'master-departments', type: 'item', label: 'Department Master', icon: Building2, moduleId: 'master-departments', requiredCards: ['requestx'], keyboard: 'r t' },
      { id: 'master-approval-matrix', type: 'item', label: 'Approval Matrix', icon: ListChecks, moduleId: 'master-approval-matrix', requiredCards: ['requestx'], keyboard: 'r x' },
      { id: 'master-voucher-types', type: 'item', label: 'Voucher Types', icon: FileText, moduleId: 'master-voucher-types', requiredCards: ['requestx'], keyboard: 'r v' },
      { id: 'master-pinned-templates', type: 'item', label: 'Pinned Templates', icon: FileText, moduleId: 'master-pinned-templates', requiredCards: ['requestx'], keyboard: 'r n' },
    ],
  },
];
