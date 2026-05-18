/**
 * @file        RequestXPage.tsx
 * @purpose     RequestX hub entry shell · canonical Shell consumer · 17 modules render
 * @who         All department staff · HOD · Purchase team · Finance · Top management
 * @when        2026-05-18 (Sprint D Shell migration)
 * @sprint      T-Phase-1.D-RequestX-Shell-Migration · Q-LOCK 5th FR-81 application
 * @iso         ISO 25010 Maintainability · Usability
 * @whom        Audit Owner
 * @decisions   D-250 (Shell pattern lock · FR-58) · FR-81 canonical sibling pattern adoption (5th)
 * @disciplines FR-30 · FR-58 · FR-81
 * @reuses      @/shell Shell · requestx-shell-config · panels · transactions · reports · masters
 * @[JWT]       Multiple via panels (see panel files for endpoints)
 */
import { useState, useEffect } from 'react';
import { Shell } from '@/shell';
import { requestxShellConfig } from '@/apps/erp/configs/requestx-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { RequestXWelcome } from './RequestXWelcome';
import { MaterialIndentEntryPanel } from './transactions/MaterialIndentEntry';
import { ServiceRequestEntryPanel } from './transactions/ServiceRequestEntry';
import { CapitalIndentEntryPanel } from './transactions/CapitalIndentEntry';
import { IndentApprovalInboxPanel } from './transactions/IndentApprovalInbox';
import { IndentRegisterPanel } from './reports/IndentRegister';
import { IndentPendingPanel } from './reports/IndentPending';
import { IndentClosedPanel } from './reports/IndentClosed';
import { POAgainstIndentPanel } from './reports/POAgainstIndent';
import { DepartmentWiseSummaryPanel } from './reports/DepartmentWiseSummary';
import { CategoryWiseSpendEstimatePanel } from './reports/CategoryWiseSpendEstimate';
import { AgeingPendingIndentsPanel } from './reports/AgeingPendingIndents';
import { ServiceRequestRegisterPanel } from './reports/ServiceRequestRegister';
import { DepartmentMasterReadOnlyPanel } from './masters/DepartmentMasterReadOnly';
import { ApprovalMatrixTemplatesPanel } from './masters/ApprovalMatrixTemplates';
import { RequestXVoucherTypesMasterPanel } from './masters/RequestXVoucherTypesMaster';
import { PinnedTemplatesPanel } from './masters/PinnedTemplatesPanel';
import type { RequestXModule } from './RequestXSidebar.types';

function renderModule(active: RequestXModule, setActive: (m: RequestXModule) => void): JSX.Element {
  switch (active) {
    case 'welcome':              return <RequestXWelcome onNavigate={setActive} />;
    case 'tx-material-indent':   return <MaterialIndentEntryPanel />;
    case 'tx-service-request':   return <ServiceRequestEntryPanel />;
    case 'tx-capital-indent':    return <CapitalIndentEntryPanel />;
    case 'tx-approval-inbox':    return <IndentApprovalInboxPanel />;
    case 'rpt-indent-register':            return <IndentRegisterPanel />;
    case 'rpt-indent-pending':             return <IndentPendingPanel />;
    case 'rpt-indent-closed':              return <IndentClosedPanel />;
    case 'rpt-po-against-indent':          return <POAgainstIndentPanel />;
    case 'rpt-department-summary':         return <DepartmentWiseSummaryPanel />;
    case 'rpt-category-spend':             return <CategoryWiseSpendEstimatePanel />;
    case 'rpt-ageing-pending':             return <AgeingPendingIndentsPanel />;
    case 'rpt-service-request-register':   return <ServiceRequestRegisterPanel />;
    case 'master-departments':       return <DepartmentMasterReadOnlyPanel />;
    case 'master-approval-matrix':   return <ApprovalMatrixTemplatesPanel />;
    case 'master-voucher-types':     return <RequestXVoucherTypesMasterPanel />;
    case 'master-pinned-templates':  return <PinnedTemplatesPanel />;
    default:
      return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
  }
}

export default function RequestXPage(): JSX.Element {
  const [active, setActive] = useState<RequestXModule>(() => {
    const hash = window.location.hash.replace('#', '');
    const validModules: RequestXModule[] = [
      'welcome',
      'tx-material-indent', 'tx-service-request', 'tx-capital-indent', 'tx-approval-inbox',
      'rpt-indent-register', 'rpt-indent-pending', 'rpt-indent-closed',
      'rpt-po-against-indent', 'rpt-department-summary',
      'rpt-category-spend', 'rpt-ageing-pending', 'rpt-service-request-register',
      'master-departments', 'master-approval-matrix', 'master-voucher-types', 'master-pinned-templates',
    ];
    if ((validModules as string[]).includes(hash)) return hash as RequestXModule;
    return 'welcome';
  });
  const { entitlements, profile } = useCardEntitlement();

  useEffect(() => {
    if (active !== 'welcome') {
      window.history.replaceState(null, '', `#${active}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [active]);

  return (
    <Shell
      config={requestxShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      contextFlags={{ accounting_mode: 'standalone' }}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActive(item.moduleId as RequestXModule);
      }}
    >
      <div className="p-4 md:p-6 animate-fade-in">
        {renderModule(active, setActive)}
      </div>
    </Shell>
  );
}
