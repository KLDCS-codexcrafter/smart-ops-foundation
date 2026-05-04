/**
 * GateFlowPage.tsx — Sprint T-Phase-1.2.6f-d-2-card4-4-pre-1 · Block D
 * NEW /erp/gateflow page · 4-module layout · Mirrors BillPassingPage pattern (FR-58 · D-250).
 */
import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { GateFlowSidebar } from './GateFlowSidebar';
import {
  GateFlowWelcome, GateInwardQueuePanel, GateOutwardQueuePanel, GatePassRegisterPanel,
} from './panels';
// Sprint 4-pre-2 · Block H · 5 NEW panels
import {
  VehicleInwardPanel, VehicleOutwardPanel, VehicleMasterPanel,
  DriverMasterPanel, WeighbridgeTicketRegisterPanel,
} from './vehicle-panels';
import type { GateFlowModule } from './GateFlowSidebar.types';

export default function GateFlowPage(): JSX.Element {
  const [active, setActive] = useState<GateFlowModule>('welcome');

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome':              return <GateFlowWelcome onNavigate={setActive} />;
      case 'gate-inward-queue':    return <GateInwardQueuePanel />;
      case 'gate-outward-queue':   return <GateOutwardQueuePanel />;
      case 'gate-pass-register':   return <GatePassRegisterPanel />;
      // Sprint 4-pre-2 · Block H
      case 'vehicle-inward':       return <VehicleInwardPanel />;
      case 'vehicle-outward':      return <VehicleOutwardPanel />;
      case 'vehicle-master':       return <VehicleMasterPanel />;
      case 'driver-master':        return <DriverMasterPanel />;
      case 'weighbridge-register': return <WeighbridgeTicketRegisterPanel />;
      default:                     return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <div className="flex-1 flex w-full overflow-hidden">
          <GateFlowSidebar active={active} onNavigate={setActive} />
          <main className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">{render()}</ScrollArea>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
