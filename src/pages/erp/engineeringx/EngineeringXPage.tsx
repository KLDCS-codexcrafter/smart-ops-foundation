/**
 * @file        src/pages/erp/engineeringx/EngineeringXPage.tsx
 * @purpose     EngineeringX entry shell · canonical Shell consumer · 7 modules render
 * @who         Engineering Lead · Document Controller · Production · Procurement · QualiCheck
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.10 EngineeringX Foundation · Q-LOCK-4a + Q-LOCK-7a · Block C
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Maintainability + Usability
 * @whom        Audit Owner
 * @decisions   D-250 (Shell pattern lock · FR-58) · D-NEW-CC keyboard uniqueness ('e *' namespace) ·
 *              D-NEW-BV Phase 1 mock pattern · FR-30 11/11 header standard
 * @disciplines FR-30 · FR-58 · FR-67
 * @reuses      @/shell Shell · engineeringx-shell-config · EngineeringXModule type
 * @[JWT]       N/A (page shell · routes handled by App.tsx)
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { engineeringxShellConfig } from '@/apps/erp/configs/engineeringx-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { EngineeringXModule } from './EngineeringXSidebar.types';
import { EngineeringXWelcome } from './EngineeringXWelcome';
import { DrawingRegisterPlaceholder } from './placeholders/DrawingRegisterPlaceholder';
import { DrawingEntryPlaceholder } from './placeholders/DrawingEntryPlaceholder';
import { ReferenceProjectsPlaceholder } from './placeholders/ReferenceProjectsPlaceholder';

export default function EngineeringXPage(): JSX.Element {
  const [activeModule, setActiveModule] = useState<EngineeringXModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  const renderModule = (): JSX.Element => {
    switch (activeModule) {
      case 'welcome':
        return <EngineeringXWelcome onNavigate={setActiveModule} />;
      case 'drawing-register-placeholder':
        return <DrawingRegisterPlaceholder onNavigate={setActiveModule} />;
      case 'drawing-entry-placeholder':
        return <DrawingEntryPlaceholder onNavigate={setActiveModule} />;
      case 'reference-projects-placeholder':
        return <ReferenceProjectsPlaceholder onNavigate={setActiveModule} />;
      case 'bom-placeholder':
      case 'similarity-placeholder':
      case 'reports-placeholder':
        return (
          <div className="p-6 text-sm text-muted-foreground">
            Coming in subsequent sprints (A.12 · A.13).
          </div>
        );
      default:
        return <EngineeringXWelcome onNavigate={setActiveModule} />;
    }
  };

  return (
    <Shell
      config={engineeringxShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[{ label: 'ERP', href: '/erp/dashboard' }, { label: 'EngineeringX' }]}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActiveModule(item.moduleId as EngineeringXModule);
      }}
    >
      {renderModule()}
    </Shell>
  );
}
