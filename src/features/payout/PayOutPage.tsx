/**
 * @file     PayOutPage.tsx
 * @purpose  PayOut hub container — sidebar shell wrapping route children.
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.2-Foundation (Group B Sprint B.2)
 * @sprint   T-T8.2-Foundation
 * @whom     /erp/payout/* nested routes
 * @consumers App.tsx route tree
 *
 * Mirrors FinCorePage.tsx pattern · uses Outlet for child rendering ·
 * SelectCompanyGate when no entity selected.
 */
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Outlet } from 'react-router-dom';
import { PayOutSidebar } from './PayOutSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEntityCode } from '@/hooks/useEntityCode';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';

export function PayOutPagePanel() {
  const { entityCode } = useEntityCode();

  if (!entityCode) {
    return (
      <SidebarProvider defaultOpen={false}>
        <div className="min-h-screen bg-background flex flex-col w-full">
          <ERPHeader
            breadcrumbs={[{ label: 'PayOut', href: '/erp/payout' }]}
            showDatePicker={false}
          />
          <main className="flex-1">
            <SelectCompanyGate
              title="Select a company to use PayOut"
              description="Vendor payments are scoped to a specific company. Pick one from the header to continue."
            />
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <PayOutSidebar />
      <SidebarInset>
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'PayOut' },
          ]}
          showDatePicker={false}
          showCompany={false}
        />
        <ScrollArea className="flex-1">
          <div className="p-0"><Outlet /></div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function PayOutPage() {
  return <PayOutPagePanel />;
}
