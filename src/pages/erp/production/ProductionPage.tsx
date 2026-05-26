/**
 * @file        ProductionPage.tsx
 * @purpose     Production Hub card page using canonical Shell pattern
 * @sprint      T-Phase-1.A.2.c-Job-Work-Tally-Parity (was T-Phase-1.A.2.a-Production-Structural · A.2.b/c added 4 + 7 case statements)
 * @iso         Maintainability · Usability
 * @decisions   D-250 · D-NEW-I · D-NEW-J
 * @reuses      @/shell Shell · production-shell-config · useCardEntitlement
 * @[JWT]       Multiple via panels
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Shell } from '@/shell';
import { productionShellConfig } from '@/apps/erp/configs/production-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { ProductionWelcome } from './ProductionWelcome';
import { ProductionOrderEntryPanel } from './transactions/ProductionOrderEntry';
import { ProductionPlanEntryPanel } from './transactions/ProductionPlanEntry';
import { MaterialIssueEntryPanel } from './transactions/MaterialIssueEntry';
import { ProductionConfirmationEntryPanel } from './transactions/ProductionConfirmationEntry';
import { JobWorkOutEntryPanel } from './transactions/JobWorkOutEntry';
import { JobWorkReceiptEntryPanel } from './transactions/JobWorkReceiptEntry';
import { JobCardEntryPanel } from './transactions/JobCardEntry';
import { DailyWorkRegisterReportPanel } from './reports/DailyWorkRegisterReport';
import { CapacityPlanningDashboardPanel } from './reports/CapacityPlanningDashboard';
import { OEEDashboardPanel } from './reports/OEEDashboard';
import { WastageDashboardPanel } from './reports/WastageDashboard';
import { SchedulingBoardPanel } from './reports/SchedulingBoard';
import { ProductionOrderRegisterPanel } from './reports/ProductionOrderRegister';
import { ProductionPlanRegisterPanel } from './reports/ProductionPlanRegister';
import { ProductionVarianceDashboardPanel } from './reports/ProductionVarianceDashboard';
import { PlanActualRollingPanel } from './reports/PlanActualRolling';
import { ITC04ExportPanel } from './reports/ITC04Export';
import { WIPReportPanel } from './reports/WIPReport';
import { ShiftwiseProductionReportPanel } from './reports/ShiftwiseProductionReport';
import { ManpowerProductionReportPanel } from './reports/ManpowerProductionReport';
import { ProductionTraceRegisterPanel } from './reports/ProductionTraceRegister';
import { JobWorkOutRegisterPanel } from './reports/JobWorkOutRegister';
import { StockWithJobWorkerPanel } from './reports/StockWithJobWorker';
import { JobWorkVarianceAnalysisPanel } from './reports/JobWorkVarianceAnalysis';
import { JobWorkAgeingAnalysisPanel } from './reports/JobWorkAgeingAnalysis';
import { JobWorkInRegisterPanel } from './reports/JobWorkInRegister';
import { JobWorkComponentsOrderSummaryPanel } from './reports/JobWorkComponentsOrderSummary';
import { JobWorkMaterialMovementRegisterPanel } from './reports/JobWorkMaterialMovementRegister';
import { JobCardRegisterPanel } from './reports/JobCardRegister';
import { ProductionConfirmationRegisterPanel } from './reports/ProductionConfirmationRegister';
import { MaterialIssueNoteRegisterPanel } from './reports/MaterialIssueNoteRegister';
// ST12 · PASS 3 · Process Mfg pages
import { ProcessBatchEntryPanel } from './transactions/ProcessBatchEntry';
import { RecipeMasterPanel } from './masters/RecipeMaster';
import { ProcessBatchRegisterPanel } from './reports/ProcessBatchRegister';
import { ProcessGenealogyTrackerPanel } from './reports/ProcessGenealogyTracker';
// Sprint 61 PROD-4 · AI & Predictive pages
import DemandForecastEntry from './transactions/DemandForecastEntry';
import DemandForecastDashboard from './reports/DemandForecastDashboard';
import ForecastVsActual from './reports/ForecastVsActual';
// 🆕 Sprint 62 PROD-4.5 · Theme A + B
import RepetitiveLineRunEntry from './transactions/RepetitiveLineRunEntry';
import RepetitiveLineOEEReport from './reports/RepetitiveLineOEEReport';
import MixedModeBUDashboard from './reports/MixedModeBUDashboard';
// 🆕 Sprint 63 PROD-5 · ESG + Carbon + Closeout
import CarbonAwareProductionPlannerPanel from './reports/CarbonAwareProductionPlanner';
import ProductionCarbonDashboardPanel from './reports/ProductionCarbonDashboard';
import Phase3v2ClosureDashboardPanel from './reports/Phase3v2ClosureDashboard';
// 🆕 Sprint 66 FAR-2 · Block 5 · FK-CAP-6
import FALinkedMachinesPanel from './reports/FALinkedMachinesPanel';
import type { ProductionModule } from './ProductionSidebar.types';

export default function ProductionPage(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = (searchParams.get('m') as ProductionModule | null) ?? 'welcome';
  const [activeModule, setActiveModule] = useState<ProductionModule>(initial);
  const { entitlements, profile } = useCardEntitlement();

  useEffect(() => {
    const m = searchParams.get('m') as ProductionModule | null;
    if (m && m !== activeModule) setActiveModule(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const navigate = (m: ProductionModule): void => {
    setActiveModule(m);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('m', m);
      return next;
    }, { replace: true });
  };

  function renderModule(): JSX.Element {
    switch (activeModule) {
      case 'welcome': return <ProductionWelcome onNavigate={(m) => navigate(m as ProductionModule)} />;
      case 'tx-production-plan-entry': return <ProductionPlanEntryPanel />;
      case 'tx-production-order-entry': return <ProductionOrderEntryPanel />;
      case 'tx-material-issue': return <MaterialIssueEntryPanel />;
      case 'tx-production-confirmation': return <ProductionConfirmationEntryPanel />;
      case 'tx-job-work-out': return <JobWorkOutEntryPanel />;
      case 'tx-job-work-receipt': return <JobWorkReceiptEntryPanel />;
      case 'tx-job-card-entry': return <JobCardEntryPanel />;
      case 'rpt-daily-work-register': return <DailyWorkRegisterReportPanel />;
      case 'rpt-capacity-planning': return <CapacityPlanningDashboardPanel />;
      case 'rpt-oee-dashboard': return <OEEDashboardPanel />;
      case 'rpt-wastage-dashboard': return <WastageDashboardPanel />;
      case 'rpt-scheduling-board': return <SchedulingBoardPanel />;
      case 'rpt-production-order-register': return <ProductionOrderRegisterPanel />;
      case 'rpt-production-plan-register': return <ProductionPlanRegisterPanel />;
      case 'rpt-variance-dashboard': return <ProductionVarianceDashboardPanel />;
      case 'rpt-plan-actual-rolling': return <PlanActualRollingPanel />;
      case 'rpt-itc04-export': return <ITC04ExportPanel />;
      case 'rpt-wip': return <WIPReportPanel />;
      case 'rpt-shiftwise-production': return <ShiftwiseProductionReportPanel />;
      case 'rpt-manpower-production': return <ManpowerProductionReportPanel />;
      case 'rpt-production-trace': return <ProductionTraceRegisterPanel />;
      case 'rpt-jw-out-register': return <JobWorkOutRegisterPanel />;
      case 'rpt-jw-stock-with-worker': return <StockWithJobWorkerPanel />;
      case 'rpt-jw-variance': return <JobWorkVarianceAnalysisPanel />;
      case 'rpt-jw-ageing': return <JobWorkAgeingAnalysisPanel />;
      case 'rpt-jw-in-register': return <JobWorkInRegisterPanel />;
      case 'rpt-jw-components-summary': return <JobWorkComponentsOrderSummaryPanel />;
      case 'rpt-jw-material-movement': return <JobWorkMaterialMovementRegisterPanel />;
      case 'rpt-job-card-register': return <JobCardRegisterPanel />;
      case 'rpt-production-confirmation-register': return <ProductionConfirmationRegisterPanel />;
      case 'rpt-material-issue-note-register': return <MaterialIssueNoteRegisterPanel />;
      // ST12 · PASS 3 · Process Mfg
      case 'tx-process-batch-entry': return <ProcessBatchEntryPanel />;
      case 'mst-recipe-master': return <RecipeMasterPanel />;
      case 'rpt-process-batch-register': return <ProcessBatchRegisterPanel />;
      case 'rpt-process-genealogy-tracker': return <ProcessGenealogyTrackerPanel />;
      // Sprint 61 PROD-4 · AI & Predictive
      case 'demand-forecast-entry': return <DemandForecastEntry />;
      case 'demand-forecast-dashboard': return <DemandForecastDashboard />;
      case 'forecast-vs-actual': return <ForecastVsActual />;
      // 🆕 Sprint 62 PROD-4.5
      case 'prod-t-repetitive-line-run-entry': return <RepetitiveLineRunEntry />;
      case 'prod-r-repetitive-line-oee': return <RepetitiveLineOEEReport />;
      case 'prod-r-mixed-mode-bu-dashboard': return <MixedModeBUDashboard />;
      // 🆕 Sprint 63 PROD-5 · ESG + Carbon + Closeout
      case 'carbon-aware-production-planner': return <CarbonAwareProductionPlannerPanel />;
      case 'production-carbon-dashboard': return <ProductionCarbonDashboardPanel />;
      case 'phase3v2-closure-dashboard': return <Phase3v2ClosureDashboardPanel />;
      default: return <ProductionWelcome onNavigate={(m) => navigate(m as ProductionModule)} />;
    }
  }

  return (
    <Shell
      config={productionShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      contextFlags={{ accounting_mode: 'standalone' }}
      onSidebarItemClick={(item) => {
        if (item.moduleId) navigate(item.moduleId as ProductionModule);
      }}
    >
      {renderModule()}
    </Shell>
  );
}
