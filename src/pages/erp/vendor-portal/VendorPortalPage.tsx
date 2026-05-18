/**
 * @file        VendorPortalPage.tsx
 * @sprint      T-Phase-1.A.1-VendorPortal-Foundation · 6th FR-81 application
 * @decisions   D-250 · FR-81 · D-282-REV · D-NEW-DN · D-NEW-DO · D-NEW-DQ
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
import type { VendorPortalModule } from './VendorPortalSidebar.types';

function ComingSoonPanel({ module }: { module: VendorPortalModule }): JSX.Element {
  const labels: Record<string, string> = {
    'vendor-categories': 'Vendor Categories',
    'vendor-communication-log': 'Vendor Communication Log',
    'vendor-broadcast': 'Vendor Broadcast Console',
  };
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-lg font-semibold">{labels[module] ?? module}</p>
      <p className="text-sm mt-1">Coming in Sprint A-b · Internal Panel Build</p>
    </div>
  );
}

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
    case 'vendor-categories':
    case 'vendor-communication-log':
    case 'vendor-broadcast':
      return <ComingSoonPanel module={active} />;
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
