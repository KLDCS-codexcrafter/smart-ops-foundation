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
  ListChecks, ShoppingCart, Truck, PackageCheck, Clock, Receipt, Plus,
  Wallet, AlertTriangle,   // NEW · A.3.b
  Package,                  // UPRA-3 Phase A Step 2
  FileCheck,                // NEW · B.1
  ShieldCheck,              // NEW · HK-5 Block A
} from 'lucide-react';
import type { SidebarItem } from '@/shell/types';

export const procure360SidebarItems: SidebarItem[] = [
  {
    id: 'welcome', type: 'item', label: 'Welcome', icon: Home,
    moduleId: 'welcome', requiredCards: ['procure360'], keyboard: 'p w',
  },
  {
    id: 'procurement-group', type: 'group', label: 'Procurement', icon: FileText,
    children: [
      { id: 'enquiry-entry', type: 'item', label: 'New Enquiry',
        icon: FileText, moduleId: 'enquiry-entry', requiredCards: ['procure360'] },
      { id: 'enquiry-list', type: 'item', label: 'Enquiry List',
        icon: ListChecks, moduleId: 'enquiry-list', requiredCards: ['procure360'], keyboard: 'p e' },
      { id: 'rfq-list', type: 'item', label: 'RFQ List',
        icon: Send, moduleId: 'rfq-list', requiredCards: ['procure360'], keyboard: 'p q' },
      { id: 'quotation-comparison', type: 'item', label: 'Compare Quotations',
        icon: BarChart3, moduleId: 'quotation-comparison', requiredCards: ['procure360'], keyboard: 'p k' },
      { id: 'award-history', type: 'item', label: 'Awards',
        icon: Award, moduleId: 'award-history', requiredCards: ['procure360'] },
      { id: 'po-list', type: 'item', label: 'PO List',
        icon: ShoppingCart, moduleId: 'po-list', requiredCards: ['procure360'], keyboard: 'p p' },
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
        icon: Receipt, moduleId: 'bill-passing-pi-status', requiredCards: ['procure360'], keyboard: 'p i' },
      // ─── NEW · B.1 ───
      { id: 'pi-admin-review', type: 'item', label: 'Vendor Invoice Review',
        icon: FileCheck, moduleId: 'pi-admin-review', requiredCards: ['procure360'] },
    ],
  },
  {
    id: 'outstandings-group', type: 'group', label: 'Outstandings', icon: Wallet,
    children: [
      // Route-based deep-link · Shell handles route navigation (no moduleId)
      { id: 'outstandings-payables', type: 'item', label: 'Payables (Bill Passing)',
        icon: Receipt, route: '/erp/bill-passing', requiredCards: ['procure360'] },
      { id: 'supplier-wise-outstanding', type: 'item', label: 'Supplier-Wise Outstanding',
        icon: Users, moduleId: 'supplier-wise-outstanding', requiredCards: ['procure360'], keyboard: 'p o' },
      { id: 'group-wise-outstanding', type: 'item', label: 'Group-Wise Outstanding',
        icon: BarChart3, moduleId: 'group-wise-outstanding', requiredCards: ['procure360'] },
      { id: 'goods-inward-day-book', type: 'item', label: 'Goods Inward Day Book',
        icon: PackageCheck, moduleId: 'goods-inward-day-book', requiredCards: ['procure360'] },
    ],
  },
  // ─── NEW · SM.Procure360-Vendor-Agreements · D-NEW-CJ Hub-and-Spoke 3rd consumer ───
  {
    id: 'vendor-documents-group', type: 'group', label: 'Vendor Documents', icon: FileText,
    children: [
      { id: 'vendor-agreements-register', type: 'item', label: 'Vendor Agreements',
        icon: FileText, moduleId: 'vendor-agreements-register', requiredCards: ['procure360'], keyboard: 'p a' },
      { id: 'vendor-agreement-entry', type: 'item', label: 'New Agreement',
        icon: Plus, moduleId: 'vendor-agreement-entry', requiredCards: ['procure360'] },
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
        icon: TrendingUp, moduleId: 'best-price-report', requiredCards: ['procure360'], keyboard: 'p b' },
      { id: 'spend-by-vendor-report', type: 'item', label: 'Spend by Vendor',
        icon: BarChart3, moduleId: 'spend-by-vendor-report', requiredCards: ['procure360'] },
      { id: 'rfq-followup-register-report', type: 'item', label: 'Follow-up Register',
        icon: Activity, moduleId: 'rfq-followup-register-report', requiredCards: ['procure360'], keyboard: 'p u' },
      { id: 'cross-dept-procurement-handoff', type: 'item', label: 'Cross-Dept Handoff',
        icon: Users, moduleId: 'cross-dept-procurement-handoff', requiredCards: ['procure360'] },
      { id: 'vendor-scoring-dashboard', type: 'item', label: 'Scoring Dashboard',
        icon: TrendingUp, moduleId: 'vendor-scoring-dashboard', requiredCards: ['procure360'], keyboard: 'p s' },
      { id: 'pi-pending-report', type: 'item', label: 'PI Pending',
        icon: Clock, moduleId: 'pi-pending-report', requiredCards: ['procure360'] },
      { id: 'three-way-match-status', type: 'item', label: '3-Way Match Status',
        icon: ListChecks, moduleId: 'three-way-match-status', requiredCards: ['procure360'], keyboard: 'p 3' },
      { id: 'variance-audit-report', type: 'item', label: 'Variance Audit',
        icon: AlertTriangle, moduleId: 'variance-audit-report', requiredCards: ['procure360'], keyboard: 'p z' },
      { id: 'tds-deduction-report', type: 'item', label: 'TDS Deduction',
        icon: FileText, moduleId: 'tds-deduction-report', requiredCards: ['procure360'] },
      { id: 'rcm-liability-report', type: 'item', label: 'RCM Liability',
        icon: FileText, moduleId: 'rcm-liability-report', requiredCards: ['procure360'] },
      // ─── α-c additions ───
      { id: 'multi-source-recommendations', type: 'item', label: 'Multi-Source Recs',
        icon: TrendingUp, moduleId: 'multi-source-recommendations', requiredCards: ['procure360'], keyboard: 'p m' },
      { id: 'pre-close-pending', type: 'item', label: 'Pre-Close Pending',
        icon: Clock, moduleId: 'pre-close-pending', requiredCards: ['procure360'] },
      { id: 'po-aging-cross-dept', type: 'item', label: 'PO Aging Cross-Dept',
        icon: Users, moduleId: 'po-aging-cross-dept', requiredCards: ['procure360'] },
      { id: 'vendor-reliability', type: 'item', label: 'Vendor Reliability',
        icon: Award, moduleId: 'vendor-reliability', requiredCards: ['procure360'], keyboard: 'p y' },
      { id: 'peq-followup-register', type: 'item', label: 'PEQ Followup Register',
        icon: ListChecks, moduleId: 'peq-followup-register', requiredCards: ['procure360'] },
      { id: 'peq-followup', type: 'item', label: 'PEQ Followup (Action)',
        icon: Activity, moduleId: 'peq-followup', requiredCards: ['procure360'], keyboard: 'p f' },
      { id: 'purchase-enquiry-form-report', type: 'item', label: 'Purchase Enquiry Form Report',
        icon: FileText, moduleId: 'purchase-enquiry-form-report', requiredCards: ['procure360'] },
      // ─── α-d additions · Variance Trident Polish ───
      { id: 'purchase-cost-variance-item', type: 'item', label: 'Cost Variance · Item',
        icon: AlertTriangle, moduleId: 'purchase-cost-variance-item', requiredCards: ['procure360'], keyboard: 'p c' },
      { id: 'purchase-cost-variance-group', type: 'item', label: 'Cost Variance · Group',
        icon: AlertTriangle, moduleId: 'purchase-cost-variance-group', requiredCards: ['procure360'] },
      { id: 'purchase-cost-variance-category', type: 'item', label: 'Cost Variance · Category',
        icon: AlertTriangle, moduleId: 'purchase-cost-variance-category', requiredCards: ['procure360'] },
      { id: 'rate-variance-graph', type: 'item', label: 'Rate Variance Graph',
        icon: TrendingUp, moduleId: 'rate-variance-graph', requiredCards: ['procure360'] },
      { id: 'po-itemwise', type: 'item', label: 'PO Item-Wise',
        icon: ShoppingCart, moduleId: 'po-itemwise', requiredCards: ['procure360'] },
      { id: 'po-status-by-enquiry', type: 'item', label: 'PO Status by Enquiry',
        icon: ListChecks, moduleId: 'po-status-by-enquiry', requiredCards: ['procure360'] },
      { id: 'enquiry-details-report', type: 'item', label: 'Enquiry Details',
        icon: FileText, moduleId: 'enquiry-details-report', requiredCards: ['procure360'], keyboard: 'p l' },
      { id: 'material-rfq-print', type: 'item', label: 'Material RFQ Print',
        icon: Send, moduleId: 'material-rfq-print', requiredCards: ['procure360'] },
      // ─── UPRA-3 Phase A Step 2 · Tier-1 NEW ───
      { id: 'git-register', type: 'item', label: 'GIT Register',
        icon: Package, moduleId: 'git-register', requiredCards: ['procure360'], keyboard: 'p g' },
      // ─── UPRA-4 Phase B · Tier-1 NEW ───
      { id: 'po-register', type: 'item', label: 'Purchase Order Register',
        icon: ShoppingCart, moduleId: 'po-register', requiredCards: ['procure360'], keyboard: 'p r' },
      // ─── NEW · 45b-i Blocks A-E ───
      { id: 'vendor-auto-rank', type: 'item', label: 'Vendor Auto-Rank',
        icon: Award, moduleId: 'vendor-auto-rank', requiredCards: ['procure360'] },
      { id: 'enquiry-template-library', type: 'item', label: 'Enquiry Template Library',
        icon: FileText, moduleId: 'enquiry-template-library', requiredCards: ['procure360'] },
      { id: 'price-benchmark', type: 'item', label: 'Price Benchmark',
        icon: TrendingUp, moduleId: 'price-benchmark', requiredCards: ['procure360'] },
      { id: 'alternate-vendor-suggest', type: 'item', label: 'Alternate Vendor Suggest',
        icon: AlertTriangle, moduleId: 'alternate-vendor-suggest', requiredCards: ['procure360'] },
      { id: 'contract-expiry-dashboard', type: 'item', label: 'Contract Expiry Dashboard',
        icon: AlertTriangle, moduleId: 'contract-expiry-dashboard', requiredCards: ['procure360'] },
      // ─── NEW · 45b-ii-2 Block C · D-NEW-GF · Rate Contract surface (founder explicit) ───
      // 21st `p *` shortcut · `p t` for "conTracT" mnemonic (5th ratified spec deviation: `p k` was bound to quotation-comparison)
      { id: 'rate-contract-list', type: 'item', label: 'Rate Contracts',
        icon: FileText, moduleId: 'rate-contract-list', requiredCards: ['procure360'], keyboard: 'p t' },
      { id: 'rate-contract-entry', type: 'item', label: 'New Rate Contract',
        icon: Plus, moduleId: 'rate-contract-entry', requiredCards: ['procure360'] },
      // ─── NEW · HK-5 Block A · D-NEW-GK · C1 Approval Matrix wiring ───
      { id: 'approver-dashboard', type: 'item', label: 'Approver Dashboard',
        icon: ShieldCheck, moduleId: 'approver-dashboard', requiredCards: ['procure360'] },
      // ─── NEW · HK-5 Block B · D-NEW-GL · C2 Budget Control wiring ───
      { id: 'budget-allocation-master', type: 'item', label: 'Budget Allocation Master',
        icon: Wallet, moduleId: 'budget-allocation-master', requiredCards: ['procure360'] },
      { id: 'budget-utilization-dashboard', type: 'item', label: 'Budget Utilization',
        icon: BarChart3, moduleId: 'budget-utilization-dashboard', requiredCards: ['procure360'] },
    ],
  },
];
