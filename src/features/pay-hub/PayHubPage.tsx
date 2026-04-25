/**
 * PayHubPage.tsx — Main Pay Hub container
 * Mirrors CommandCenterPage — SidebarProvider + own sidebar + content area.
 */
import { useState, useEffect } from 'react';
import { useEntityList } from '@/hooks/useEntityList';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { PayHubSidebar, type PayHubModule } from './PayHubSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { logAudit } from '@/lib/card-audit-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';
import { rememberModule } from '@/lib/breadcrumb-memory';
import { GuidedTourOverlay } from '@/components/layout/GuidedTourOverlay';
import { PayHubDashboardPanel } from '@/pages/erp/pay-hub/PayHubDashboard';
import { PayHeadMasterPanel } from '@/pages/erp/pay-hub/masters/PayHeadMaster';
import { SalaryStructureMasterPanel } from '@/pages/erp/pay-hub/masters/SalaryStructureMaster';
import { PayGradeMasterPanel } from '@/pages/erp/pay-hub/masters/PayGradeMaster';
import { EmployeeMasterPanel } from '@/pages/erp/pay-hub/masters/EmployeeMaster';
import { ShiftMasterPanel } from '@/pages/erp/pay-hub/masters/ShiftMaster';
import { LeaveTypesMasterPanel } from '@/pages/erp/pay-hub/masters/LeaveTypesMaster';
import { HolidayCalendarMasterPanel } from '@/pages/erp/pay-hub/masters/HolidayCalendarMaster';
import { AttendanceTypesMasterPanel } from '@/pages/erp/pay-hub/masters/AttendanceTypesMaster';
import { OvertimeRulesMasterPanel } from '@/pages/erp/pay-hub/masters/OvertimeRulesMaster';
import { LoanTypesMasterPanel } from '@/pages/erp/pay-hub/masters/LoanTypesMaster';
import { BonusConfigMasterPanel } from '@/pages/erp/pay-hub/masters/BonusConfigMaster';
import { GratuityNPSPanel } from '@/pages/erp/pay-hub/masters/GratuityNPSConfig';
import { AssetMasterPanel } from '@/pages/erp/pay-hub/masters/AssetMaster';
import { AttendanceEntryPanel } from '@/pages/erp/pay-hub/transactions/AttendanceEntry';
import { LeaveRequestsPanel } from '@/pages/erp/pay-hub/transactions/LeaveRequests';
import { PayrollProcessingPanel } from '@/pages/erp/pay-hub/transactions/PayrollProcessing';
import { PayslipGenerationPanel } from '@/pages/erp/pay-hub/transactions/PayslipGeneration';
import { StatutoryReturnsPanel } from '@/pages/erp/pay-hub/transactions/StatutoryReturns';
import { EmployeeFinancePanel } from '@/pages/erp/pay-hub/transactions/EmployeeFinance';
import { RecruitmentPanel } from '@/pages/erp/pay-hub/transactions/Recruitment';
import { DocumentsAndPoliciesPanel } from '@/pages/erp/pay-hub/transactions/DocumentsAndPolicies';
import { DocumentManagementPanel } from '@/pages/erp/pay-hub/transactions/DocumentManagement';
import { OnboardingPanel } from '@/pages/erp/pay-hub/transactions/Onboarding';
import { PerformanceAndTalentPanel } from '@/pages/erp/pay-hub/transactions/PerformanceAndTalent';
import { LearningAndDevelopmentPanel } from '@/pages/erp/pay-hub/transactions/LearningAndDevelopment';
import { EmployeeExperiencePanel } from '@/pages/erp/pay-hub/transactions/EmployeeExperience';
import { AdminAndMonitoringPanel } from '@/pages/erp/pay-hub/transactions/AdminAndMonitoring';
import { ExitAndFnFPanel } from '@/pages/erp/pay-hub/transactions/ExitAndFnF';
import { ContractManpowerPanel } from '@/pages/erp/pay-hub/transactions/ContractManpower';
import { PayHubDayBookPanel } from '@/pages/erp/pay-hub/transactions/PayHubDayBook';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

function ComingSoonPanel({ module }: { module: PayHubModule }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-lg font-semibold">Coming Soon</p>
      <p className="text-sm mt-1">{module} — will be built in a future sprint</p>
    </div>
  );
}

function renderModule(mod: PayHubModule, selectedEntityId?: string): React.ReactElement {
  switch (mod) {
    case 'ph-dashboard': return <PayHubDashboardPanel selectedEntityId={selectedEntityId} />;
    case 'ph-pay-heads': return <PayHeadMasterPanel />;
    case 'ph-salary-structures': return <SalaryStructureMasterPanel />;
    case 'ph-pay-grades': return <PayGradeMasterPanel />;
    case 'ph-employees': return <EmployeeMasterPanel />;
    case 'ph-shifts': return <ShiftMasterPanel />;
    case 'ph-leave-types': return <LeaveTypesMasterPanel />;
    case 'ph-holiday-calendar': return <HolidayCalendarMasterPanel />;
    case 'ph-attendance-types': return <AttendanceTypesMasterPanel />;
    case 'ph-overtime-rules': return <OvertimeRulesMasterPanel />;
    case 'ph-loan-types': return <LoanTypesMasterPanel />;
    case 'ph-bonus-config': return <BonusConfigMasterPanel />;
    case 'ph-gratuity-nps': return <GratuityNPSPanel />;
    case 'ph-asset-master': return <AssetMasterPanel />;
    case 'ph-attendance-entry': return <AttendanceEntryPanel />;
    case 'ph-leave-requests': return <LeaveRequestsPanel />;
    case 'ph-payroll-processing': return <PayrollProcessingPanel />;
    case 'ph-payslip-gen': return <PayslipGenerationPanel />;
    case 'ph-daybook': return <PayHubDayBookPanel entityCode={selectedEntityId ?? DEFAULT_ENTITY_SHORTCODE} onNavigate={mod => window.dispatchEvent(new CustomEvent('ph-navigate', { detail: mod }))} />;
    case 'ph-pf-ecr':              return <StatutoryReturnsPanel defaultTab="pf-ecr" />;
    case 'ph-esi-returns':         return <StatutoryReturnsPanel defaultTab="esi" />;
    case 'ph-pt-returns':          return <StatutoryReturnsPanel defaultTab="pt" />;
    case 'ph-tds-24q':             return <StatutoryReturnsPanel defaultTab="tds-24q" />;
    case 'ph-form16':              return <StatutoryReturnsPanel defaultTab="form16" />;
    case 'ph-statutory-calendar':  return <StatutoryReturnsPanel defaultTab="calendar" />;
    case 'ph-loans':           return <EmployeeFinancePanel defaultTab="loans" />;
    case 'ph-salary-advance':  return <EmployeeFinancePanel defaultTab="salary-advance" />;
    case 'ph-expense-claims':  return <EmployeeFinancePanel defaultTab="expenses" />;
    case 'ph-flexi-benefits':  return <EmployeeFinancePanel defaultTab="flexi" />;
    case 'ph-recruitment':     return <RecruitmentPanel />;
    case 'ph-documents':       return <DocumentsAndPoliciesPanel />;
    case 'ph-policies':        return <DocumentsAndPoliciesPanel />;
    case 'ph-doc-vault':       return <DocumentManagementPanel defaultTab="vault" />;
    case 'ph-doc-templates':   return <DocumentManagementPanel defaultTab="templates" />;
    case 'ph-onboarding':      return <OnboardingPanel />;
    case 'ph-performance':     return <PerformanceAndTalentPanel defaultTab="reviews" />;
    case 'ph-9box':            return <PerformanceAndTalentPanel defaultTab="9box" />;
    case 'ph-succession':      return <PerformanceAndTalentPanel defaultTab="succession" />;
    case 'ph-compensation':    return <PerformanceAndTalentPanel defaultTab="compensation" />;
    case 'ph-training-catalog': return <LearningAndDevelopmentPanel defaultTab="catalog" />;
    case 'ph-training-enroll':  return <LearningAndDevelopmentPanel defaultTab="enrollments" />;
    case 'ph-skill-matrix':     return <LearningAndDevelopmentPanel defaultTab="skills" />;
    case 'ph-certifications':   return <LearningAndDevelopmentPanel defaultTab="certifications" />;
    case 'ph-directory':     return <EmployeeExperiencePanel defaultTab="directory" />;
    case 'ph-inbox':         return <EmployeeExperiencePanel defaultTab="inbox" />;
    case 'ph-collaboration': return <EmployeeExperiencePanel defaultTab="collaboration" />;
    case 'ph-total-rewards': return <EmployeeExperiencePanel defaultTab="total-rewards" />;
    case 'ph-ess':              return <AdminAndMonitoringPanel defaultTab="ess" />;
    case 'ph-access-control':   return <AdminAndMonitoringPanel defaultTab="access" />;
    case 'ph-email-templates':  return <AdminAndMonitoringPanel defaultTab="templates" />;
    case 'ph-activity':         return <AdminAndMonitoringPanel defaultTab="activity" />;
    case 'ph-exit': return <ExitAndFnFPanel defaultTab="exit" />;
    case 'ph-fnf':  return <ExitAndFnFPanel defaultTab="fnf" />;
    case 'ph-contract-workers':    return <ContractManpowerPanel defaultTab="workers" />;
    case 'ph-contract-orders':     return <ContractManpowerPanel defaultTab="orders" />;
    case 'ph-contract-compliance': return <ContractManpowerPanel defaultTab="compliance" />;
    default: return <ComingSoonPanel module={mod} />;
  }
}

const breadcrumbLabels: Record<PayHubModule, string> = {
  'ph-dashboard': 'Dashboard',
  'ph-pay-heads': 'Pay Heads',
  'ph-salary-structures': 'Salary Structures',
  'ph-pay-grades': 'Pay Grades',
  'ph-employees': 'Employee Master',
  'ph-shifts': 'Shift Master',
  'ph-leave-types': 'Leave Types',
  'ph-holiday-calendar': 'Holiday Calendar',
  'ph-attendance-types': 'Attendance Types',
  'ph-overtime-rules': 'Overtime Rules',
  'ph-loan-types': 'Loan Types',
  'ph-bonus-config': 'Bonus Config',
  'ph-gratuity-nps': 'Gratuity & NPS',
  'ph-asset-master': 'Asset Master',
  'ph-attendance-entry': 'Attendance Entry',
  'ph-leave-requests': 'Leave Requests',
  'ph-payroll-processing': 'Payroll Processing',
  'ph-payslip-gen': 'Payslip Generation',
  'ph-daybook': 'Day Book',
  'ph-pf-ecr':             'PF ECR',
  'ph-esi-returns':        'ESI Returns',
  'ph-pt-returns':         'PT Returns',
  'ph-tds-24q':            'Form 24Q',
  'ph-form16':             'Form 16',
  'ph-statutory-calendar': 'Statutory Calendar',
  'ph-loans':          'Loans & Advances',
  'ph-salary-advance': 'Salary Advance',
  'ph-expense-claims': 'Expense Claims',
  'ph-flexi-benefits': 'Flexi Benefits',
  'ph-recruitment': 'Recruitment',
  'ph-documents': 'Document Vault',
  'ph-policies': 'Policy Library',
  'ph-doc-vault': 'Document Vault',
  'ph-doc-templates': 'Template Library',
  'ph-onboarding': 'Onboarding',
  'ph-performance': 'Performance Reviews',
  'ph-9box': '9-Box Grid',
  'ph-succession': 'Succession Planning',
  'ph-compensation': 'Compensation Actions',
  'ph-training-catalog': 'Training Catalog',
  'ph-training-enroll':  'Enrollments',
  'ph-skill-matrix':     'Skill Matrix',
  'ph-certifications':   'Certifications',
  'ph-directory':     'Employee Directory',
  'ph-inbox':         'Inbox',
  'ph-collaboration': 'Collaboration',
  'ph-total-rewards': 'Total Rewards',
  'ph-ess':             'ESS Portal',
  'ph-access-control':  'Access Control',
  'ph-email-templates': 'Email Templates',
  'ph-activity':        'Activity Monitoring',
  'ph-exit': 'Exit Management',
  'ph-fnf':  'F&F Settlement',
  'ph-contract-workers':    'Contract Workers',
  'ph-contract-orders':     'Work Orders',
  'ph-contract-compliance': 'Compliance Register',
};

export function PayHubPagePanel() {
  return <PayHubPage />;
}

export default function PayHubPage() {
  const [activeModule, setActiveModule] = useState<PayHubModule>('ph-dashboard');
  const { entities, selectedEntityId, setSelectedEntityId: _setSelectedEntityId,
    selectedEntity: _selectedEntity, isMultiEntity } = useEntityList();
  const { entityCode, userId } = useCardEntitlement();

  useEffect(() => {
    const handler = (e: Event) => {
      const target = (e as CustomEvent<PayHubModule>).detail;
      if (target) setActiveModule(target);
    };
    window.addEventListener('ph-navigate', handler);
    return () => window.removeEventListener('ph-navigate', handler);
  }, []);

  useEffect(() => {
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'peoplepay',
      action: 'card_open',
    });
  }, [entityCode, userId]);

  useEffect(() => {
    rememberModule('peoplepay', activeModule);
    logAudit({
      entityCode, userId, userName: userId,
      cardId: 'peoplepay',
      moduleId: activeModule,
      action: 'module_open',
    });
    recordActivity(entityCode, userId, {
      card_id: 'peoplepay',
      kind: 'module',
      ref_id: activeModule,
      title: `PeoplePay · ${activeModule}`,
      subtitle: null,
      deep_link: `/erp/pay-hub#${activeModule}`,
    });
  }, [activeModule, entityCode, userId]);

  return (
    <>
      <GuidedTourOverlay cardId='peoplepay' />
      <SidebarProvider defaultOpen>
        <PayHubSidebar activeModule={activeModule} onModuleChange={setActiveModule} />
        <SidebarInset>
          <ERPHeader
            breadcrumbs={[
              { label: 'Operix Core', href: '/erp/dashboard' },
              { label: 'Pay Hub' },
              { label: breadcrumbLabels[activeModule] ?? activeModule },
            ]}
            showDatePicker={false}
            showCompany={isMultiEntity}
            companies={entities}
          />
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-7xl mx-auto">
              {renderModule(activeModule, selectedEntityId)}
            </div>
          </ScrollArea>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
