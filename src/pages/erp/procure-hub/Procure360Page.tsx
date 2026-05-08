/**
 * @file        Procure360Page.tsx
 * @purpose     Procure360 hub page · canonical Shell pattern (4th card after CC + GateFlow + Production)
 * @who         Procurement department
 * @when        Phase 1.A.3.b · Procure360 Bill Passing Integration sprint
 * @sprint      T-Phase-1.A.3.a-Procure360-Shell-Migration · T-Phase-1.A.3.b-Procure360-Bill-Passing-Integration (8 modules · Outstandings group · 5 reports · D-NEW-AG · D-NEW-AK)
 * @iso         Maintainability · Usability (ISO 25010)
 * @decisions   D-250 · D-NEW-AC · D-NEW-AD · D-NEW-AF · D-NEW-AG · D-NEW-AK
 * @reuses      @/shell Shell · procure360-shell-config · useCardEntitlement · logAudit · recordActivity · rememberModule · GuidedTourOverlay · journalKey · 22+8 panel exports
 * @[JWT]       activeModule (state) · entityCode + userId via useCardEntitlement (localStorage [JWT])
 */

import { useState, useEffect } from 'react';
import { Shell } from '@/shell';
import { procure360ShellConfig } from '@/apps/erp/configs/procure360-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';
import { GuidedTourOverlay } from '@/components/layout/GuidedTourOverlay';
import { journalKey } from '@/lib/finecore-engine';
import type { BreadcrumbEntry } from '@/components/layout/ERPHeader';
import type { Procure360Module } from './Procure360Sidebar.types';
import {
  Procure360Welcome,
  ProcurementEnquiryEntryPanel,
  EnquiryListPanel,
  RfqListPanel,
  QuotationComparisonPanel,
  AwardHistoryPanel,
  RfqRegisterReportPanel,
  PendingRfqReportPanel,
  ComparisonReportPanel,
  AwardHistoryReportPanel,
  VendorPerfReportPanel,
  BestPriceReportPanel,
  SpendByVendorReportPanel,
  RfqFollowupRegisterReportPanel,
  CrossDeptHandoffPanel,
  VendorScoringDashboardPanel,
  PoListPanel,
  PoFollowupRegisterPanel,
  GitInTransitPanel,
  GitReceivedPanel,
  AgedGitProcurePanel,
  BillPassingPiStatusPanel,
} from './panels';

// NEW · A.3.b · 8 reports from /reports/ folder
import {
  PiPendingPanel,
  ThreeWayMatchStatusPanel,
  VarianceAuditPanel,
  TdsDeductionReportPanel,
  RcmLiabilityReportPanel,
  GoodsInwardDayBookPanel,
  SupplierWiseOutstandingPanel,
  GroupWiseOutstandingPanel,
} from './reports';

const HASH_ALLOWLIST: Procure360Module[] = [
  'welcome',
  'enquiry-entry', 'enquiry-list', 'rfq-list', 'quotation-comparison', 'award-history',
  'rfq-register-report', 'pending-rfq-report', 'comparison-report',
  'award-history-report', 'vendor-perf-report', 'best-price-report',
  'spend-by-vendor-report', 'rfq-followup-register-report',
  'cross-dept-procurement-handoff', 'vendor-scoring-dashboard',
  'po-list', 'po-followup-register',
  'git-in-transit', 'git-received', 'aged-git-procure',
  'bill-passing-pi-status',
];

const GROUP_LABELS: Partial<Record<Procure360Module, string>> = {
  welcome: 'Overview',
  'enquiry-entry': 'Procurement',
  'enquiry-list': 'Procurement',
  'rfq-list': 'Procurement',
  'quotation-comparison': 'Procurement',
  'award-history': 'Procurement',
  'po-list': 'Procurement',
  'po-followup-register': 'Procurement',
  'git-in-transit': 'Receipt',
  'git-received': 'Receipt',
  'aged-git-procure': 'Receipt',
  'bill-passing-pi-status': 'Receipt',
};

function getGroupLabel(m: Procure360Module): string {
  if (m.endsWith('-report') || m === 'cross-dept-procurement-handoff' || m === 'vendor-scoring-dashboard') {
    return 'Reports';
  }
  return GROUP_LABELS[m] ?? '';
}

function getModuleLabel(m: Procure360Module): string {
  const known: Partial<Record<Procure360Module, string>> = {
    welcome: 'Welcome',
    'enquiry-entry': 'New Enquiry',
    'enquiry-list': 'Enquiry List',
    'rfq-list': 'RFQ List',
    'quotation-comparison': 'Compare Quotations',
    'award-history': 'Awards',
    'rfq-register-report': 'RFQ Register',
    'pending-rfq-report': 'Pending RFQs',
    'comparison-report': 'Quotation Comparison',
    'award-history-report': 'Award History',
    'vendor-perf-report': 'Vendor Performance',
    'best-price-report': 'Best Price Analysis',
    'spend-by-vendor-report': 'Spend by Vendor',
    'rfq-followup-register-report': 'Follow-up Register',
    'cross-dept-procurement-handoff': 'Cross-Dept Handoff',
    'vendor-scoring-dashboard': 'Scoring Dashboard',
    'po-list': 'PO List',
    'po-followup-register': 'PO Followup Register',
    'git-in-transit': 'GIT In Transit',
    'git-received': 'GIT Received at Gate',
    'aged-git-procure': 'Aged GIT (Procure View)',
    'bill-passing-pi-status': 'Bill Passing & PI Status',
  };
  return known[m] ?? m.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildBreadcrumbs(activeModule: Procure360Module): BreadcrumbEntry[] {
  const group = getGroupLabel(activeModule);
  const moduleLabel = getModuleLabel(activeModule);
  const crumbs: BreadcrumbEntry[] = [
    { label: 'Operix Core', href: '/erp/dashboard' },
    { label: 'Procure 360', href: '/erp/procure-hub' },
  ];
  if (group && group !== moduleLabel) crumbs.push({ label: group });
  if (moduleLabel) crumbs.push({ label: moduleLabel });
  return crumbs;
}

function computeLastEntryLabel(entityCode: string): string | undefined {
  try {
    // [JWT] GET /api/finecore/journal — localStorage-backed in Phase 1
    const raw = localStorage.getItem(journalKey(entityCode));
    if (!raw) return undefined;
    const entries: Array<{ created_at: string }> = JSON.parse(raw);
    if (!entries.length) return undefined;
    const latest = entries.reduce((a, b) => (a.created_at > b.created_at ? a : b));
    const d = new Date(latest.created_at);
    return (
      'Last entry: ' +
      d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
      ' ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    );
  } catch {
    return undefined;
  }
}

export default function Procure360Page(): JSX.Element {
  const [activeModule, setActiveModule] = useState<Procure360Module>(() => {
    const hash = window.location.hash.replace('#', '');
    if (HASH_ALLOWLIST.includes(hash as Procure360Module)) {
      return hash as Procure360Module;
    }
    return 'welcome';
  });

  const { entityCode, userId, profile, entitlements } = useCardEntitlement();

  useEffect(() => {
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'procure360',
      action: 'card_open',
    });
  }, [entityCode, userId]);

  useEffect(() => {
    rememberModule('procure360', activeModule);
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'procure360',
      moduleId: activeModule,
      action: 'module_open',
    });
    recordActivity(entityCode, userId, {
      card_id: 'procure360',
      kind: 'module',
      ref_id: activeModule,
      title: `Procure 360 · ${activeModule}`,
      subtitle: null,
      deep_link: `/erp/procure-hub#${activeModule}`,
    });
  }, [activeModule, entityCode, userId]);

  useEffect(() => {
    const hash = activeModule === 'welcome' ? '' : `#${activeModule}`;
    window.history.replaceState(null, '', window.location.pathname + hash);
  }, [activeModule]);

  function handleNavigate(module: Procure360Module) {
    setActiveModule(module);
  }

  const renderModule = (): JSX.Element => {
    switch (activeModule) {
      case 'welcome':                        return <Procure360Welcome onNavigate={handleNavigate} />;
      case 'enquiry-entry':                  return <ProcurementEnquiryEntryPanel />;
      case 'enquiry-list':                   return <EnquiryListPanel />;
      case 'rfq-list':                       return <RfqListPanel />;
      case 'quotation-comparison':           return <QuotationComparisonPanel />;
      case 'award-history':                  return <AwardHistoryPanel />;
      case 'rfq-register-report':            return <RfqRegisterReportPanel />;
      case 'pending-rfq-report':             return <PendingRfqReportPanel />;
      case 'comparison-report':              return <ComparisonReportPanel />;
      case 'award-history-report':           return <AwardHistoryReportPanel />;
      case 'vendor-perf-report':             return <VendorPerfReportPanel />;
      case 'best-price-report':              return <BestPriceReportPanel />;
      case 'spend-by-vendor-report':         return <SpendByVendorReportPanel />;
      case 'rfq-followup-register-report':   return <RfqFollowupRegisterReportPanel />;
      case 'cross-dept-procurement-handoff': return <CrossDeptHandoffPanel />;
      case 'vendor-scoring-dashboard':       return <VendorScoringDashboardPanel />;
      case 'po-list':                        return <PoListPanel />;
      case 'po-followup-register':           return <PoFollowupRegisterPanel />;
      case 'git-in-transit':                 return <GitInTransitPanel />;
      case 'git-received':                   return <GitReceivedPanel />;
      case 'aged-git-procure':               return <AgedGitProcurePanel />;
      case 'bill-passing-pi-status':         return <BillPassingPiStatusPanel />;
      default:
        return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
    }
  };

  const lastEntryLabel = computeLastEntryLabel(entityCode);

  return (
    <>
      <GuidedTourOverlay cardId="procure360" />
      <Shell
        config={procure360ShellConfig}
        userProfile={profile}
        tenantEntitlements={entitlements}
        breadcrumbs={buildBreadcrumbs(activeModule)}
        lastEntryLabel={lastEntryLabel}
        contextFlags={{ accounting_mode: 'standalone' }}
        onSidebarItemClick={(item) => {
          if (item.moduleId) setActiveModule(item.moduleId as Procure360Module);
        }}
      >
        {renderModule()}
      </Shell>
    </>
  );
}
