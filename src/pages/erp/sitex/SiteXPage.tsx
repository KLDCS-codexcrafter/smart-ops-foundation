/**
 * @file        src/pages/erp/sitex/SiteXPage.tsx
 * @purpose     SiteX main page · Shell pattern · activeModule switch · matches A.13 EngineeringXPage precedent
 * @sprint      T-Phase-1.A.14 SiteX Foundation · Q-LOCK-9a + Q-LOCK-13a · Block D.1 · Shell migration · A.14 ONLY exception
 * @decisions   D-250 Shell pattern lock · FR-58 · D-NEW-CC 's *' · D-NEW-CT 17th canonical · D-NEW-CU POSSIBLE
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { sitexShellConfig } from '@/apps/erp/configs/sitex-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { SiteXModule } from './SiteXSidebar.types';
import { SiteXWelcome } from './SiteXWelcome';
import { SiteList } from './transactions/SiteList';
import { SiteImprestPanel } from './transactions/SiteImprestPanel';
import { RABillEntry } from './transactions/RABillEntry';
import { MobilizationChecklist } from './registers/MobilizationChecklist';
import { DPRRegister } from './registers/DPRRegister';
import { SnagRegister } from './registers/SnagRegister';
import { LookAheadPlan } from './registers/LookAheadPlan';
import { SiteTwinDashboard } from './reports/SiteTwinDashboard';
import { MOATCriteriaValidator } from './reports/MOATCriteriaValidator';
import { CustomerSignoffPanel } from './closeout/CustomerSignoffPanel';
import { CommissioningReportBuilder } from './closeout/CommissioningReportBuilder';
import { TurnkeyChecklist } from './closeout/TurnkeyChecklist';
import { DemobilizationWorkflow } from './closeout/DemobilizationWorkflow';

export default function SiteXPage(): JSX.Element {
  const [activeModule, setActiveModule] = useState<SiteXModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  const renderModule = (): JSX.Element => {
    const nav = (m: string): void => setActiveModule(m as SiteXModule);
    switch (activeModule) {
      case 'welcome':                 return <SiteXWelcome onNavigate={setActiveModule} />;
      case 'site-list':               return <SiteList onNavigate={setActiveModule} />;
      case 'imprest-receipt':         return <SiteImprestPanel onNavigate={nav} />;
      case 'ra-bills':                return <RABillEntry onNavigate={nav} />;
      case 'mobilize-site':           return <MobilizationChecklist onNavigate={nav} />;
      case 'dpr':                     return <DPRRegister onNavigate={nav} />;
      case 'snag-register':           return <SnagRegister onNavigate={nav} />;
      case 'look-ahead-plan':         return <LookAheadPlan onNavigate={nav} />;
      case 'sitex-reports':           return <SiteTwinDashboard onNavigate={nav} />;
      case 'close-certificate':       return <MOATCriteriaValidator onNavigate={nav} />;
      case 'customer-signoff':        return <CustomerSignoffPanel onNavigate={nav} />;
      case 'commissioning-report':    return <CommissioningReportBuilder onNavigate={nav} />;
      case 'turnkey-checklist':       return <TurnkeyChecklist onNavigate={nav} />;
      case 'final-reconciliation':
      case 'surplus-returns':         return <DemobilizationWorkflow onNavigate={nav} />;
      default:                        return <SiteXWelcome onNavigate={setActiveModule} />;
    }
  };

  return (
    <Shell
      config={sitexShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[{ label: 'ERP', href: '/erp/dashboard' }, { label: 'SiteX' }]}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActiveModule(item.moduleId as SiteXModule);
      }}
    >
      {renderModule()}
    </Shell>
  );
}
