/**
 * @file        src/pages/erp/maintainpro/MaintainProPage.tsx
 * @purpose     MaintainPro main page · Shell pattern · 11th card · activeModule switch
 * @sprint      T-Phase-1.A.16a · Block C.3
 * @whom        Audit Owner
 * @decisions   D-250 Shell pattern · FR-58 · D-NEW-CC 'm *'
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { maintainproShellConfig } from '@/apps/erp/configs/maintainpro-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { MaintainProModule } from './MaintainProSidebar.types';
import { MaintainProWelcome } from './MaintainProWelcome';
import { EquipmentMaster } from './masters/EquipmentMaster';
import { CalibrationMaster } from './masters/CalibrationMaster';
import { FireSafetyMaster } from './masters/FireSafetyMaster';
import { PMScheduleTemplateMaster } from './masters/PMScheduleTemplateMaster';
import { SparePartsView } from './masters/SparePartsView';
import { MaintenanceVendorView } from './masters/MaintenanceVendorView';

export default function MaintainProPage(): JSX.Element {
  const [activeModule, setActiveModule] = useState<MaintainProModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  const renderModule = (): JSX.Element => {
    const nav = (m: string): void => setActiveModule(m as MaintainProModule);
    switch (activeModule) {
      case 'welcome':
        return <MaintainProWelcome onNavigate={setActiveModule} />;
      case 'equipment-list':
      case 'equipment-detail':
        return <EquipmentMaster onNavigate={nav} />;
      case 'spare-parts':
        return <SparePartsView onNavigate={nav} />;
      case 'calibration-instruments':
      case 'calibration-due':
        return <CalibrationMaster onNavigate={nav} />;
      case 'fire-safety':
      case 'fire-safety-expiry':
        return <FireSafetyMaster onNavigate={nav} />;
      case 'pm-template-master':
        return <PMScheduleTemplateMaster onNavigate={nav} />;
      case 'maintenance-vendor':
        return <MaintenanceVendorView onNavigate={nav} />;
      default:
        return <MaintainProWelcome onNavigate={setActiveModule} />;
    }
  };

  return (
    <Shell
      config={maintainproShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      breadcrumbs={[{ label: 'ERP', href: '/erp/dashboard' }, { label: 'MaintainPro' }]}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActiveModule(item.moduleId as MaintainProModule);
      }}
    >
      {renderModule()}
    </Shell>
  );
}
