/**
 * @file        procure360-sidebar-config.ts
 * @purpose     Procure360 sidebar items · 5-section regroup · 31 entries (1 route + 30 module) · entitlement-filtered
 * @who         Procurement department
 * @when        Phase 1.A.3.b · Procure360 Bill Passing Integration sprint
 * @sprint      T-Phase-1.A.3.a-Procure360-Shell-Migration · T-Phase-1.A.3.b-Procure360-Bill-Passing-Integration (Outstandings group + 5 Reports entries · D-NEW-AG)
 * @iso         Usability · Maintainability (ISO 25010)
 * @decisions   D-NEW-AD (Procure360 sidebar 4-section regroup · 23 items) · D-NEW-AG (Outstandings group + 5 Reports · 31 items)
 * @reuses      @/shell/types SidebarItem · lucide-react icons
 * @[JWT]       N/A (config only)
 */

import {
  Home, FileText, Send, BarChart3, Award, TrendingUp, Users, Activity,
  ListChecks, ShoppingCart, Truck, PackageCheck, Clock, Receipt,
  Wallet, AlertTriangle,   // NEW · A.3.b
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const procure360SidebarItems: SidebarItem[] = [
  {
    id: 'welcome', type: 'item', label: 'Welcome', icon: Home,
    moduleId: 'welcome', requiredCards: ['procure360'],
  },
  {
    id: 'procurement-group', type: 'group', label: 'Procurement', icon: FileText,
    children: [
      { id: 'enquiry-entry', type: 'item', label: 'New Enquiry',
        icon: FileText, moduleId: 'enquiry-entry', requiredCards: ['procure360'] },
      { id: 'enquiry-list', type: 'item', label: 'Enquiry List',
        icon: ListChecks, moduleId: 'enquiry-list', requiredCards: ['procure360'] },
      { id: 'rfq-list', type: 'item', label: 'RFQ List',
        icon: Send, moduleId: 'rfq-list', requiredCards: ['procure360'] },
      { id: 'quotation-comparison', type: 'item', label: 'Compare Quotations',
        icon: BarChart3, moduleId: 'quotation-comparison', requiredCards: ['procure360'] },
      { id: 'award-history', type: 'item', label: 'Awards',
        icon: Award, moduleId: 'award-history', requiredCards: ['procure360'] },
      { id: 'po-list', type: 'item', label: 'PO List',
        icon: ShoppingCart, moduleId: 'po-list', requiredCards: ['procure360'] },
      { id: 'po-followup-register', type: 'item', label: 'PO Followup Register',
        icon: Activity, moduleId: 'po-followup-register', requiredCards: ['procure360'] },
    ],
  },
  {
    id: 'receipt-group', type: 'group', label: 'Receipt', icon: PackageCheck,
    children: [
      { id: 'git-in-transit', type: 'item', label: 'GIT In Transit',
        icon: Truck, moduleId: 'git-in-transit', requiredCards: ['procure360'] },
      { id: 'git-received', type: 'item', label: 'GIT Received at Gate',
        icon: PackageCheck, moduleId: 'git-received', requiredCards: ['procure360'] },
      { id: 'aged-git-procure', type: 'item', label: 'Aged GIT (Procure View)',
        icon: Clock, moduleId: 'aged-git-procure', requiredCards: ['procure360'] },
      { id: 'bill-passing-pi-status', type: 'item', label: 'Bill Passing & PI Status',
        icon: Receipt, moduleId: 'bill-passing-pi-status', requiredCards: ['procure360'] },
    ],
  },
  {
    id: 'outstandings-group', type: 'group', label: 'Outstandings', icon: Wallet,
    children: [
      // Route-based deep-link · Shell handles route navigation (no moduleId)
      { id: 'outstandings-payables', type: 'item', label: 'Payables (Bill Passing)',
        icon: Receipt, route: '/erp/bill-passing', requiredCards: ['procure360'] },
      { id: 'supplier-wise-outstanding', type: 'item', label: 'Supplier-Wise Outstanding',
        icon: Users, moduleId: 'supplier-wise-outstanding', requiredCards: ['procure360'] },
      { id: 'group-wise-outstanding', type: 'item', label: 'Group-Wise Outstanding',
        icon: BarChart3, moduleId: 'group-wise-outstanding', requiredCards: ['procure360'] },
      { id: 'goods-inward-day-book', type: 'item', label: 'Goods Inward Day Book',
        icon: PackageCheck, moduleId: 'goods-inward-day-book', requiredCards: ['procure360'] },
    ],
  },
  {
    id: 'reports-group', type: 'group', label: 'Reports', icon: BarChart3,
    children: [
      { id: 'rfq-register-report', type: 'item', label: 'RFQ Register',
        icon: ListChecks, moduleId: 'rfq-register-report', requiredCards: ['procure360'] },
      { id: 'pending-rfq-report', type: 'item', label: 'Pending RFQs',
        icon: Activity, moduleId: 'pending-rfq-report', requiredCards: ['procure360'] },
      { id: 'comparison-report', type: 'item', label: 'Quotation Comparison',
        icon: BarChart3, moduleId: 'comparison-report', requiredCards: ['procure360'] },
      { id: 'award-history-report', type: 'item', label: 'Award History',
        icon: Award, moduleId: 'award-history-report', requiredCards: ['procure360'] },
      { id: 'vendor-perf-report', type: 'item', label: 'Vendor Performance',
        icon: TrendingUp, moduleId: 'vendor-perf-report', requiredCards: ['procure360'] },
      { id: 'best-price-report', type: 'item', label: 'Best Price Analysis',
        icon: TrendingUp, moduleId: 'best-price-report', requiredCards: ['procure360'] },
      { id: 'spend-by-vendor-report', type: 'item', label: 'Spend by Vendor',
        icon: BarChart3, moduleId: 'spend-by-vendor-report', requiredCards: ['procure360'] },
      { id: 'rfq-followup-register-report', type: 'item', label: 'Follow-up Register',
        icon: Activity, moduleId: 'rfq-followup-register-report', requiredCards: ['procure360'] },
      { id: 'cross-dept-procurement-handoff', type: 'item', label: 'Cross-Dept Handoff',
        icon: Users, moduleId: 'cross-dept-procurement-handoff', requiredCards: ['procure360'] },
      { id: 'vendor-scoring-dashboard', type: 'item', label: 'Scoring Dashboard',
        icon: TrendingUp, moduleId: 'vendor-scoring-dashboard', requiredCards: ['procure360'] },
      { id: 'pi-pending-report', type: 'item', label: 'PI Pending',
        icon: Clock, moduleId: 'pi-pending-report', requiredCards: ['procure360'] },
      { id: 'three-way-match-status', type: 'item', label: '3-Way Match Status',
        icon: ListChecks, moduleId: 'three-way-match-status', requiredCards: ['procure360'] },
      { id: 'variance-audit-report', type: 'item', label: 'Variance Audit',
        icon: AlertTriangle, moduleId: 'variance-audit-report', requiredCards: ['procure360'] },
      { id: 'tds-deduction-report', type: 'item', label: 'TDS Deduction',
        icon: FileText, moduleId: 'tds-deduction-report', requiredCards: ['procure360'] },
      { id: 'rcm-liability-report', type: 'item', label: 'RCM Liability',
        icon: FileText, moduleId: 'rcm-liability-report', requiredCards: ['procure360'] },
    ],
  },
];
