/**
 * @file        src/pages/erp/servicedesk/ServiceDeskPage.tsx
 * @purpose     ServiceDesk main page · Shell pattern · 12th card · activeModule switch
 * @sprint      T-Phase-1.C.1a · Block F.1 · v2 spec
 * @decisions   D-250 Shell pattern · FR-58 · D-NEW-CC 'd *' (FR-74 keyboard namespace) · D-NEW-CT 12th card already seeded
 * @iso        Usability
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { servicedeskShellConfig } from '@/apps/erp/configs/servicedesk-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { ServiceDeskModule } from './ServiceDeskSidebar.types';
import { ServiceDeskWelcome } from './ServiceDeskWelcome';

export default function ServiceDeskPage(): JSX.Element {
  const [activeModule, setActiveModule] = useState<ServiceDeskModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  const renderModule = (): JSX.Element => {
    switch (activeModule) {
      case 'welcome':
        return <ServiceDeskWelcome onNavigate={setActiveModule} />;
      // Future modules land in C.1b-C.1f
      default:
        return <ServiceDeskWelcome onNavigate={setActiveModule} />;
    }
  };

  return (
    <Shell
      config={servicedeskShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[{ label: 'ERP', href: '/erp/dashboard' }, { label: 'ServiceDesk' }]}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActiveModule(item.moduleId as ServiceDeskModule);
      }}
    >
      {renderModule()}
    </Shell>
  );
}
