/**
 * @file        RequestXPage.tsx
 * @sprint      T-Phase-1.2.6f-pre-1
 * @purpose     RequestX hub container · mirrors InventoryHubPage shell pattern.
 */
import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { RequestXSidebar } from './RequestXSidebar';
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
import { DepartmentMasterReadOnlyPanel } from './masters/DepartmentMasterReadOnly';
import { ApprovalMatrixTemplatesPanel } from './masters/ApprovalMatrixTemplates';
import { RequestXVoucherTypesMasterPanel } from './masters/RequestXVoucherTypesMaster';
import { PinnedTemplatesPanel } from './masters/PinnedTemplatesPanel';
import type { RequestXModule } from './RequestXSidebar.types';

export default function RequestXPage(): JSX.Element {
  const [active, setActive] = useState<RequestXModule>('welcome');

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome':              return <RequestXWelcome onNavigate={setActive} />;
      case 'tx-material-indent':   return <MaterialIndentEntryPanel />;
      case 'tx-service-request':   return <ServiceRequestEntryPanel />;
      case 'tx-capital-indent':    return <CapitalIndentEntryPanel />;
      case 'tx-approval-inbox':    return <IndentApprovalInboxPanel />;
      case 'rpt-indent-register':    return <IndentRegisterPanel />;
      case 'rpt-indent-pending':     return <IndentPendingPanel />;
      case 'rpt-indent-closed':      return <IndentClosedPanel />;
      case 'rpt-po-against-indent':  return <POAgainstIndentPanel />;
      case 'rpt-department-summary': return <DepartmentWiseSummaryPanel />;
      case 'rpt-category-spend':     return <CategoryWiseSpendEstimatePanel />;
      case 'rpt-ageing-pending':     return <AgeingPendingIndentsPanel />;
      case 'master-departments':       return <DepartmentMasterReadOnlyPanel />;
      case 'master-approval-matrix':   return <ApprovalMatrixTemplatesPanel />;
      case 'master-voucher-types':     return <RequestXVoucherTypesMasterPanel />;
      case 'master-pinned-templates':  return <PinnedTemplatesPanel />;
      default:
        return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <div className="flex-1 flex w-full overflow-hidden">
          <RequestXSidebar active={active} onNavigate={setActive} />
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">{render()}</ScrollArea>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
