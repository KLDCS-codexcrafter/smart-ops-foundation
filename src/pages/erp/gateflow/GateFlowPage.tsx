/**
 * @file        GateFlowPage.tsx
 * @purpose     GateFlow card page using canonical Shell pattern (FR-58 · CC reference)
 * @who         Operations · Security guards · Gatekeepers · Dispatch supervisors
 * @when        Phase 1.A.1.pre · Shell Migration sprint
 * @sprint      T-Phase-1.A.1.pre-GateFlow-Shell-Migration
 * @iso         Maintainability · Usability
 * @decisions   D-250 (Shell pattern lock) · D-NEW-A (CC pattern adoption) ·
 *              D-NEW-B (GateFlowSidebar.tsx deleted · sidebar data in config)
 * @reuses      @/shell Shell · gateflow-shell-config · panels · vehicle-panels · alerts-panels
 * @[JWT]       Multiple via panels (see panel files for endpoints)
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { gateflowShellConfig } from '@/apps/erp/configs/gateflow-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { GateFlowModule } from './GateFlowSidebar.types';
import {
  GateFlowWelcome,
  GateInwardQueuePanel,
  GateOutwardQueuePanel,
  GatePassRegisterPanel,
} from './panels';
import {
  VehicleInwardPanel,
  VehicleOutwardPanel,
  VehicleMasterPanel,
  DriverMasterPanel,
  WeighbridgeTicketRegisterPanel,
} from './vehicle-panels';
import {
  VehicleExpiryAlertsPanel,
  DriverExpiryAlertsPanel,
  GateDwellAlertsPanel,
} from './alerts-panels';

export default function GateFlowPage(): JSX.Element {
  const [activeModule, setActiveModule] = useState<GateFlowModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  function renderModule(): JSX.Element {
    switch (activeModule) {
      case 'welcome':                  return <GateFlowWelcome onNavigate={setActiveModule} />;
      case 'gate-inward-queue':        return <GateInwardQueuePanel />;
      case 'gate-outward-queue':       return <GateOutwardQueuePanel />;
      case 'gate-pass-register':       return <GatePassRegisterPanel />;
      case 'vehicle-inward':           return <VehicleInwardPanel />;
      case 'vehicle-outward':          return <VehicleOutwardPanel />;
      case 'vehicle-master':           return <VehicleMasterPanel />;
      case 'driver-master':            return <DriverMasterPanel />;
      case 'weighbridge-register':     return <WeighbridgeTicketRegisterPanel />;
      case 'alert-vehicle-expiry':     return <VehicleExpiryAlertsPanel />;
      case 'alert-driver-expiry':      return <DriverExpiryAlertsPanel />;
      case 'alert-gate-dwell':         return <GateDwellAlertsPanel />;
      default:                         return <GateFlowWelcome onNavigate={setActiveModule} />;
    }
  }

  return (
    <Shell
      config={gateflowShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      contextFlags={{ accounting_mode: 'standalone' }}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActiveModule(item.moduleId as GateFlowModule);
      }}
    >
      {renderModule()}
    </Shell>
  );
}
