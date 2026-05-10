/**
 * @file        src/pages/erp/engineeringx/EngineeringXPage.tsx
 * @sprint      T-Phase-1.A.12 · Q-LOCK-7a · Block F.1 · activeModule extension (additive · NO App.tsx changes)
 * @decisions   D-250 Shell pattern lock · FR-58 · D-NEW-CC `'e *'` keyboard namespace ·
 *              FR-73 5th consumer · D-NEW-CP institutional pattern · D-NEW-CE 16th consumer
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { engineeringxShellConfig } from '@/apps/erp/configs/engineeringx-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { EngineeringXModule } from './EngineeringXSidebar.types';
import { EngineeringXWelcome } from './EngineeringXWelcome';
import { DrawingRegister } from './transactions/DrawingRegister';
import { DrawingEntry } from './transactions/DrawingEntry';
import { DrawingApprovalsPending } from './approvals/DrawingApprovalsPending';
import { DrawingVersionHistory } from './registers/DrawingVersionHistory';
import { BomExtractor } from './transactions/BomExtractor';
import { BomRegister } from './registers/BomRegister';
import { ReferenceProjectLibrary } from './registers/ReferenceProjectLibrary';
import { CloneDrawing } from './transactions/CloneDrawing';

export default function EngineeringXPage(): JSX.Element {
  const [activeModule, setActiveModule] = useState<EngineeringXModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  const renderModule = (): JSX.Element => {
    switch (activeModule) {
      case 'welcome':                  return <EngineeringXWelcome onNavigate={setActiveModule} />;
      case 'drawing-register':         return <DrawingRegister onNavigate={setActiveModule} />;
      case 'drawing-entry':            return <DrawingEntry onNavigate={setActiveModule} />;
      case 'drawing-approvals':        return <DrawingApprovalsPending onNavigate={setActiveModule} />;
      case 'drawing-version-history':  return <DrawingVersionHistory onNavigate={setActiveModule} />;
      case 'bom-extractor':            return <BomExtractor onNavigate={setActiveModule} />;
      case 'bom-register':             return <BomRegister onNavigate={setActiveModule} />;
      case 'reference-library':        return <ReferenceProjectLibrary onNavigate={setActiveModule} />;
      case 'clone-drawing':            return <CloneDrawing onNavigate={setActiveModule} />;
      case 'similarity-placeholder':
      case 'reports-placeholder':
        return (
          <div className="p-6 text-sm text-muted-foreground">
            Coming in subsequent sprint (A.13 Closeout).
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
