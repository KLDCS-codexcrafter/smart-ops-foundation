/**
 * @file        src/pages/erp/comply360/Comply360Page.tsx
 * @purpose     Comply360 main page · Shell pattern · 23 mega-menu router · Block 1 scaffolding
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 1 · Q1 Card scaffolding
 * @decisions   D-250 Shell pattern · D-S69-1 100% native · D-S69-2 23 mega-menus · FR-74 'c *'
 * @iso         Usability + Maintainability
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { comply360ShellConfig } from '@/apps/erp/configs/comply360-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { ComingSoonPanel } from '@/components/fincore/ComingSoonPanel';
import { Comply360Welcome } from './Comply360Welcome';
import TaxGstPage from './tax-gst/TaxGstPage';
import TdsPage from './tds/TdsPage';
import EInvoiceEWayPage from './exim/EInvoiceEWayPage';
import MSMEForm1Page from './vendor/MSMEForm1Page';
import Section393Page from './roc/Section393Page';
import ExternalAuditPage from './external-audit/ExternalAuditPage';
import LegalNoticesPage from './legal/LegalNoticesPage';
import type { Comply360Module } from './Comply360Sidebar.types';

export default function Comply360Page(): JSX.Element {
  const [activeModule, setActiveModule] = useState<Comply360Module>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  const renderModule = (): JSX.Element => {
    switch (activeModule) {
      case 'welcome':
      case 'home':
        return <Comply360Welcome onNavigate={setActiveModule} />;
      case 'tax-gst':
        return <TaxGstPage />;
      case 'tds':
        return <TdsPage />;
      case 'exim':
        return <EInvoiceEWayPage />;
      case 'vendor':
        return <MSMEForm1Page />;
      case 'roc':
        return <Section393Page />;
      case 'external-audit':
        return <ExternalAuditPage />;
      case 'legal':
        return <LegalNoticesPage />;
      // 18 remaining mega-menus · modules light up in later sprints per Q-LOCK
      default:
        return <ComingSoonPanel module={`c360-${activeModule}`} />;
    }
  };

  return (
    <Shell
      config={comply360ShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[{ label: 'ERP', href: '/erp/dashboard' }, { label: 'Comply360' }]}
      onSidebarItemClick={(item) => {
        if (item.id) setActiveModule(item.id as Comply360Module);
      }}
    >
      {renderModule()}
    </Shell>
  );
}
