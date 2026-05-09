/**
 * @file        src/pages/erp/docvault/DocVaultPage.tsx
 * @sprint      T-Phase-1.A.8.α-a-DocVault-Foundation · Block B.2 · page shell
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
