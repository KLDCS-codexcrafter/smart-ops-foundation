/**
 * @file        VendorPortalPage.tsx
 * @sprint      T-Phase-1.A-b.2-VendorPortal-Communications-Categories (A-b arc closure)
 * @decisions   D-250 · FR-81 · D-282-REV · D-NEW-DN · D-NEW-DO · D-NEW-DQ · D-NEW-DU · D-NEW-DV · D-NEW-DW
 */
import { useState, useEffect } from 'react';
import { Shell } from '@/shell';
import { vendorPortalShellConfig } from '@/apps/erp/configs/vendor-portal-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { VendorPortalWelcome } from './VendorPortalWelcome';
import { VendorMasterPanel } from './panels/VendorMasterPanel';
import { VendorAgreementsPanel } from './panels/VendorAgreementsPanel';
import { VendorOnboardingInboxPanel } from './panels/VendorOnboardingInboxPanel';
import { SaathiAdminPanel } from './panels/SaathiAdminPanel';
import { VendorScoringPanel } from './panels/VendorScoringPanel';
import { Msme43BhTrackerPanel } from './panels/Msme43BhTrackerPanel';
import { VendorActivityMonitorPanel } from './panels/VendorActivityMonitorPanel';
import { VendorCategoriesPanel } from './panels/VendorCategoriesPanel';
import { VendorCommunicationLogAdminPanel } from './panels/VendorCommunicationLogAdminPanel';
import { VendorBroadcastConsolePanel } from './panels/VendorBroadcastConsolePanel';
import { VendorZonesPanel } from './panels/VendorZonesPanel';
import { VendorRiskMonitorPanel } from './panels/VendorRiskMonitorPanel';
import { VendorComplianceChecklistsPanel } from './panels/VendorComplianceChecklistsPanel';
import { VendorDcnPanel } from './panels/VendorDcnPanel';
import { VendorDocumentRequestsPanel } from './panels/VendorDocumentRequestsPanel';
import { VendorPaymentBatchesPanel } from './panels/VendorPaymentBatchesPanel';
import type { VendorPortalModule } from './VendorPortalSidebar.types';

function renderModule(active: VendorPortalModule, setActive: (m: VendorPortalModule) => void): JSX.Element {
  switch (active) {
    case 'welcome':                    return <VendorPortalWelcome onNavigate={setActive} />;
    case 'vendor-master':              return <VendorMasterPanel />;
    case 'vendor-agreements':          return <VendorAgreementsPanel />;
    case 'vendor-onboarding-inbox':    return <VendorOnboardingInboxPanel />;
    case 'saathi-admin':               return <SaathiAdminPanel />;
    case 'vendor-scoring':             return <VendorScoringPanel />;
    case 'msme-compliance':            return <Msme43BhTrackerPanel />;
    case 'vendor-activity-monitor':    return <VendorActivityMonitorPanel />;
    case 'vendor-categories':          return <VendorCategoriesPanel />;
    case 'vendor-communication-log':   return <VendorCommunicationLogAdminPanel />;
    case 'vendor-broadcast':           return <VendorBroadcastConsolePanel />;
    case 'vendor-zones':                   return <VendorZonesPanel />;
    case 'vendor-risk-monitor':            return <VendorRiskMonitorPanel />;
    case 'vendor-compliance-checklists':   return <VendorComplianceChecklistsPanel />;
    case 'vendor-dcn':                     return <VendorDcnPanel />;
    case 'vendor-document-requests':       return <VendorDocumentRequestsPanel />;
    case 'vendor-payment-batches':         return <VendorPaymentBatchesPanel />;
    default:
      return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
  }
}

export default function VendorPortalPage(): JSX.Element {
  const [active, setActive] = useState<VendorPortalModule>(() => {
    const hash = window.location.hash.replace('#', '');
    const validModules: VendorPortalModule[] = [
      'welcome', 'vendor-master', 'vendor-agreements', 'vendor-onboarding-inbox',
      'vendor-categories', 'vendor-scoring', 'vendor-activity-monitor', 'msme-compliance',
      'vendor-communication-log', 'vendor-broadcast', 'saathi-admin',
      'vendor-zones', 'vendor-risk-monitor', 'vendor-compliance-checklists',
      'vendor-dcn', 'vendor-document-requests', 'vendor-payment-batches',
    ];
    if ((validModules as string[]).includes(hash)) return hash as VendorPortalModule;
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
      config={vendorPortalShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      contextFlags={{ accounting_mode: 'standalone' }}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActive(item.moduleId as VendorPortalModule);
      }}
    >
      <div className="p-4 md:p-6 animate-fade-in">
        {renderModule(active, setActive)}
      </div>
    </Shell>
  );
}
