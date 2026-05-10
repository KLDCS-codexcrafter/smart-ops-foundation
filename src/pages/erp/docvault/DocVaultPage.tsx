/**
 * @file        src/pages/erp/docvault/DocVaultPage.tsx
 * @purpose     DocVault entry shell · canonical Shell consumer · 10 modules render
 * @who         All departments · Document Controller · per-card sub-module consumers (Phase 2 sprints)
 * @when        2026-05-09 (T1 Shell retrofit)
 * @sprint      T-Phase-1.A.9.T1 · Q-LOCK-T1-F1 · Block A.3 · Shell retrofit
 * @iso         ISO 9001:2015 §7.5 (document control) · ISO 25010 Maintainability
 * @whom        Audit Owner
 * @decisions   D-250 (Shell pattern lock · FR-58) · D-NEW-CJ-docvault-file-metadata-schema ·
 *              D-NEW-CC sidebar keyboard uniqueness ('d *' namespace) · D-NEW-BV Phase 1 mock pattern ·
 *              Q-LOCK-T1-F1 · Shell retrofit (A.9.T1 · canonical pattern lock per FR-58) ·
 *              FR-30 11/11 header standard
 * @disciplines FR-30 · FR-58 · FR-67 broad-stem grep verified
 * @reuses      @/shell Shell · docvault-shell-config · DocVaultModule type
 * @[JWT]       N/A (page shell · routes handled by App.tsx)
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { docvaultShellConfig } from '@/apps/erp/configs/docvault-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { DocVaultWelcome } from './DocVaultWelcome';
import { DocumentEntry } from './transactions/DocumentEntry';
import { DocumentRegister } from './transactions/DocumentRegister';
import { ApprovalsPendingPanel } from './approvals/ApprovalsPendingPanel';
import { DrawingRegisterTree } from './registers/DrawingRegisterTree';
import { TagIndex } from './registers/TagIndex';
import { SimilarityViewer } from './registers/SimilarityViewer';
import { DocumentsByDeptReport } from './reports/DocumentsByDeptReport';
import { ApprovalLatencyReport } from './reports/ApprovalLatencyReport';
import { VersionVelocityReport } from './reports/VersionVelocityReport';
import type { DocVaultModule } from './DocVaultSidebar.types';

export default function DocVaultPage(): JSX.Element {
  const [active, setActive] = useState<DocVaultModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome':            return <DocVaultWelcome onNavigate={setActive} />;
      case 'documents-register': return <DocumentRegister />;
      case 'document-entry':     return <DocumentEntry />;
      case 'approvals-pending':  return <ApprovalsPendingPanel />;
      case 'drawing-register-tree': return <DrawingRegisterTree />;
      case 'tag-index':          return <TagIndex />;
      case 'similarity-viewer':  return <SimilarityViewer />;
      case 'documents-by-dept':  return <DocumentsByDeptReport />;
      case 'approval-latency':   return <ApprovalLatencyReport />;
      case 'version-velocity':   return <VersionVelocityReport />;
      default:                   return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
    }
  };

  return (
    <Shell
      config={docvaultShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      contextFlags={{ accounting_mode: 'standalone' }}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActive(item.moduleId as DocVaultModule);
      }}
    >
      {render()}
    </Shell>
  );
}
