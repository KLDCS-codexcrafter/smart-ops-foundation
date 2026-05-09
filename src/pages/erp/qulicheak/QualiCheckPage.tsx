/**
 * @file        QualiCheckPage.tsx
 * @purpose     Qulicheak card page using canonical Shell pattern (FR-58 · GateFlow precedent)
 * @who         Quality Inspector · QA Manager · Vendor Manager
 * @when        Phase 1.A.5.a · Shell Migration sprint
 * @sprint      T-Phase-1.A.5.a-Qulicheak-Shell-Migration
 * @iso         Maintainability · Usability
 * @decisions   D-250 (Shell pattern lock) · D-NEW-AY (Outcome C split) ·
 *              D-NEW-AZ (QualiCheckSidebar.tsx DELETED · sidebar data in config)
 * @reuses      @/shell Shell · qulicheak-shell-config · panels · operational-panels
 * @[JWT]       Multiple via panels (see panel files for endpoints)
 */
import { useEffect, useState } from 'react';
import { Shell } from '@/shell';
import { qulicheakShellConfig } from '@/apps/erp/configs/qulicheak-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { QualiCheckModule } from './QualiCheckSidebar.types';
import {
  QualiCheckWelcome, PendingInspectionsPanel, QualityPlansPanel,
  QualitySpecsPanel, InspectionRegisterPanel,
} from './panels';
import {
  ClosureLogPanel, VendorScorecardPanel, CoARegisterPanel,
  PendingAlertsPanel, BulkPlanAssignmentPanel,
} from './operational-panels';
import { ProductionQCPendingPanel } from './ProductionQCPendingPanel';
import { QCEntryPage } from './QCEntryPage';
import { QualiCheckDashboard } from './QualiCheckDashboard';
import { NcrCapture } from './NcrCapture';
import { NcrRegister } from './reports/NcrRegister';
import { CapaCapture } from './CapaCapture';
import { CapaRegister } from './reports/CapaRegister';
import { CapaDetail } from './CapaDetail';
import type { CapaId } from '@/types/capa';
import { MtcCapture } from './MtcCapture';
import { MtcRegister } from './reports/MtcRegister';
import { FaiCapture } from './FaiCapture';
import { FaiRegister } from './reports/FaiRegister';
import { EffectivenessVerificationDuePanel } from './reports/EffectivenessVerificationDuePanel';
import { WelderQualification } from './WelderQualification';
import { WelderRegister } from './reports/WelderRegister';
import { WpqExpiryDashboard } from './reports/WpqExpiryDashboard';
import { Iso9001Capture } from './Iso9001Capture';
import { Iso9001Register } from './reports/Iso9001Register';
import { IqcEntryPage } from './IqcEntryPage';
import { mountQulicheakBridges, subscribeQaForVendorScoring } from '@/lib/qulicheak-bridges';

export default function QualiCheckPage(): JSX.Element {
  const [activeModule, setActiveModule] = useState<QualiCheckModule>('welcome');
  // Sprint 3b-pre-2 · Block J · D-635 · QC entry overlay (priority over module switch).
  const [activeInspectionId, setActiveInspectionId] = useState<string | null>(null);
  // α-c · Block F · D-NEW-BR · CAPA detail overlay (priority over capa-register module).
  const [activeCapaId, setActiveCapaId] = useState<CapaId | null>(null);
  const { entitlements, profile } = useCardEntitlement();

  // α-a-bis · D-NEW-AW · mount Procure360 → Qulicheak QA handoff listener
  useEffect(() => {
    const unmount = mountQulicheakBridges();
    const unsub = subscribeQaForVendorScoring();
    return () => { unmount(); unsub(); };
  }, []);

  function renderModule(): JSX.Element {
    if (activeInspectionId) {
      return <QCEntryPage inspectionId={activeInspectionId} onBack={() => setActiveInspectionId(null)} />;
    }
    if (activeCapaId) {
      return <CapaDetail capaId={activeCapaId} onBack={() => setActiveCapaId(null)} />;
    }
    switch (activeModule) {
      case 'welcome':              return <QualiCheckWelcome onNavigate={setActiveModule} />;
      case 'pending-inspections':  return <PendingInspectionsPanel />;
      case 'quality-plans':        return <QualityPlansPanel />;
      case 'quality-specs':        return <QualitySpecsPanel />;
      case 'inspection-register':  return <InspectionRegisterPanel />;
      case 'closure-log':          return <ClosureLogPanel />;
      case 'vendor-scorecard':     return <VendorScorecardPanel />;
      case 'coa-register':         return <CoARegisterPanel />;
      case 'pending-alerts':       return <PendingAlertsPanel />;
      case 'bulk-plan-assignment': return <BulkPlanAssignmentPanel />;
      case 'production-qc-pending':
        return <ProductionQCPendingPanel onOpenInspection={setActiveInspectionId} />;
      case 'qc-dashboard':         return <QualiCheckDashboard />;
      case 'qc-entry':
        return <div className="p-6 text-sm text-muted-foreground">Open a pending inspection to enter QC.</div>;
      case 'ncr-capture':
        return <NcrCapture onSaved={() => setActiveModule('ncr-register')} onCancel={() => setActiveModule('welcome')} />;
      case 'ncr-register':
        return <NcrRegister />;
      case 'capa-capture':
        return <CapaCapture onSaved={() => setActiveModule('capa-register')} onCancel={() => setActiveModule('welcome')} />;
      case 'capa-register':
        return <CapaRegister onOpen={(id) => setActiveCapaId(id)} />;
      case 'mtc-capture':
        return <MtcCapture onSaved={() => setActiveModule('mtc-register')} onCancel={() => setActiveModule('welcome')} />;
      case 'mtc-register':
        return <MtcRegister />;
      case 'fai-capture':
        return <FaiCapture onSaved={() => setActiveModule('fai-register')} onCancel={() => setActiveModule('welcome')} />;
      case 'fai-register':
        return <FaiRegister />;
      case 'effectiveness-verification-due':
        return <EffectivenessVerificationDuePanel />;
      case 'welder-qualification':
        return <WelderQualification />;
      case 'welder-register':
        return <WelderRegister />;
      case 'wpq-expiry-dashboard':
        return <WpqExpiryDashboard />;
      case 'iso9001-capture':
        return <Iso9001Capture onSaved={() => setActiveModule('iso9001-register')} onCancel={() => setActiveModule('welcome')} />;
      case 'iso9001-register':
        return <Iso9001Register />;
      case 'iqc-entry-page':
        return <IqcEntryPage />;
      default:
        return <QualiCheckWelcome onNavigate={setActiveModule} />;
    }
  }

  return (
    <Shell
      config={qulicheakShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      contextFlags={{ accounting_mode: 'standalone' }}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActiveModule(item.moduleId as QualiCheckModule);
      }}
    >
      {renderModule()}
    </Shell>
  );
}
