/**
 * @file        src/pages/erp/docvault/DocVaultPage.tsx
 * @purpose     DocVault entry shell · canonical sidebar consumer · 4 modules render
 * @who         All departments · Document Controller · per-card sub-module consumers (Phase 2 sprints)
 * @when        2026-05-09 (T1 backfill)
 * @sprint      T-Phase-1.A.8.α-a-T1-Audit-Fix · Block C · F-4 backfill
 * @iso         ISO 9001:2015 §7.5 (document control) · ISO 25010 Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-CJ-docvault-file-metadata-schema (CANONICAL · A.8 Foundation) ·
 *              D-NEW-CC sidebar keyboard uniqueness (4th consumer with 'd *' namespace) ·
 *              D-NEW-BV Phase 1 mock pattern ·
 *              FR-30 11/11 header standard (T1 backfill per A.6.α-a-T1 institutional pattern)
 * @disciplines FR-30 (this header) · FR-67 broad-stem grep verified
 * @reuses      DocVaultSidebar canonical config consumer · DocVaultModule type
 * @[JWT]       N/A (page shell · routes handled by App.tsx)
 */
import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { DocVaultSidebar } from './DocVaultSidebar';
import { DocVaultWelcome } from './DocVaultWelcome';
import { DocumentEntry } from './transactions/DocumentEntry';
import { DocumentRegister } from './transactions/DocumentRegister';
import { ApprovalsPendingPanel } from './approvals/ApprovalsPendingPanel';
import type { DocVaultModule } from './DocVaultSidebar.types';

export default function DocVaultPage(): JSX.Element {
  const [active, setActive] = useState<DocVaultModule>('welcome');

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome':            return <DocVaultWelcome onNavigate={setActive} />;
      case 'documents-register': return <DocumentRegister />;
      case 'document-entry':     return <DocumentEntry />;
      case 'approvals-pending':  return <ApprovalsPendingPanel />;
      default:                   return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <div className="flex-1 flex w-full overflow-hidden">
          <DocVaultSidebar active={active} onNavigate={setActive} />
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">{render()}</ScrollArea>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
