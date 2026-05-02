/**
 * DispatchOpsPage.tsx — Dispatch Hub (internal ops) · Orange-500 accent
 * Sprint T-Phase-1.1.1p-v2.
 */

import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DispatchOpsSidebar, type DispatchOpsModule } from './DispatchOpsSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';
import { PackageCheck } from 'lucide-react';

import { DeliveryMemoEntryPanel } from './transactions/DeliveryMemoEntry';
import { PackingSlipPrintPanel } from './transactions/PackingSlipPrint';
import { DispatchExceptionsPanel } from './transactions/DispatchExceptions';
import { PackingMaterialMasterPanel } from './masters/PackingMaterialMaster';
import { PackingBOMMasterPanel } from './masters/PackingBOMMaster';
import { PackingConsumptionReportPanel } from './reports/PackingConsumptionReport';
import { PackerPerformanceReportPanel } from './reports/PackerPerformanceReport';
import { SampleOutwardIssuePanel } from './transactions/SampleOutwardIssue';
import { DemoOutwardIssuePanel } from './transactions/DemoOutwardIssue';
import { OutwardMovementReportPanel } from './reports/OutwardMovementReport';
import { DeliveryMemoRegisterPanel } from './reports/DeliveryMemoRegister';

function ComingSoonPanel({ module }: { module: DispatchOpsModule }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-lg font-semibold">Coming Soon</p>
      <p className="text-sm mt-1">{module}</p>
    </div>
  );
}

function DispatchOpsWelcome() {
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-xl bg-orange-500/15 flex items-center justify-center">
          <PackageCheck className="h-6 w-6 text-orange-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dispatch Hub</h1>
          <p className="text-sm text-muted-foreground">Internal department operations — inward & outward goods movement</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        <div className="rounded-xl border border-border p-4 bg-card/50">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Transactions</p>
          <p className="text-sm">Delivery Memo · Sample/Demo Issue · Packing Slip · Exceptions</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-card/50">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Masters</p>
          <p className="text-sm">Packing Materials · Packing BOM</p>
        </div>
        <div className="rounded-xl border border-border p-4 bg-card/50">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Reports</p>
          <p className="text-sm">Outward Movement · Packing Consumption · Packer Performance</p>
        </div>
      </div>
    </div>
  );
}

function renderModule(mod: DispatchOpsModule, entityCode: string): React.ReactElement {
  switch (mod) {
    case 'dops-welcome':                 return <DispatchOpsWelcome />;
    case 'dops-t-delivery-memo':         return <DeliveryMemoEntryPanel entityCode={entityCode} />;
    case 'dops-t-sample-outward-issue':  return <SampleOutwardIssuePanel entityCode={entityCode} />;
    case 'dops-t-demo-outward-issue':    return <DemoOutwardIssuePanel entityCode={entityCode} />;
    case 'dops-t-packing-slip':          return <PackingSlipPrintPanel />;
    case 'dops-t-exceptions':            return <DispatchExceptionsPanel />;
    case 'dops-m-packing-material':      return <PackingMaterialMasterPanel />;
    case 'dops-m-packing-bom':           return <PackingBOMMasterPanel />;
    case 'dops-r-outward-movement':      return <OutwardMovementReportPanel entityCode={entityCode} />;
    case 'dops-r-packing-consumption':   return <PackingConsumptionReportPanel />;
    case 'dops-r-packer-performance':    return <PackerPerformanceReportPanel />;
    default:                             return <ComingSoonPanel module={mod} />;
  }
}

export default function DispatchOpsPage() {
  const [activeModule, setActiveModule] = useState<DispatchOpsModule>(() => {
    const hash = window.location.hash.replace('#', '').split('?')[0];
    if (hash.startsWith('dops-')) return hash as DispatchOpsModule;
    return 'dops-welcome';
  });

  const { entityCode, userId } = useCardEntitlement();

  useEffect(() => {
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'dispatch-ops' as never, action: 'card_open',
    });
  }, [entityCode, userId]);

  useEffect(() => {
    rememberModule('dispatch-ops' as never, activeModule);
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'dispatch-ops' as never, moduleId: activeModule,
      action: 'module_open',
    });
    recordActivity(entityCode, userId, {
      card_id: 'dispatch-ops' as never, kind: 'module',
      ref_id: activeModule,
      title: `Dispatch Hub · ${activeModule}`,
      subtitle: null,
      deep_link: `/erp/dispatch#${activeModule}`,
    });
  }, [activeModule, entityCode, userId]);

  useEffect(() => {
    if (activeModule !== 'dops-welcome') {
      window.history.replaceState(null, '', `#${activeModule}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [activeModule]);

  return (
    <SidebarProvider defaultOpen>
      <DispatchOpsSidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      />
      <SidebarInset>
        <ERPHeader />
        <ScrollArea className="flex-1 h-[calc(100vh-var(--erp-header-height,112px))]">
          <div className="p-4 md:p-6 animate-fade-in">
            {renderModule(activeModule, entityCode)}
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
