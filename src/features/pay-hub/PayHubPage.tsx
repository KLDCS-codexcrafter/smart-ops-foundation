/**
 * PayHubPage.tsx — Main Pay Hub container
 * Mirrors CommandCenterPage — SidebarProvider + own sidebar + content area.
 */
import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { PayHubSidebar, type PayHubModule } from './PayHubSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { OnboardingPanel } from '@/pages/erp/pay-hub/transactions/Onboarding';
import { PerformanceAndTalentPanel } from '@/pages/erp/pay-hub/transactions/PerformanceAndTalent';
import { LearningAndDevelopmentPanel } from '@/pages/erp/pay-hub/transactions/LearningAndDevelopment';

function ComingSoonPanel({ module }: { module: PayHubModule }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <p className="text-lg font-semibold">Coming Soon</p>
      <p className="text-sm mt-1">{module} — will be built in a future sprint</p>
    </div>
  );
}

function renderModule(mod: PayHubModule): React.ReactElement {
  switch (mod) {
    case 'ph-dashboard': return <PayHubDashboardPanel />;
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
    case 'ph-onboarding':      return <OnboardingPanel />;
    case 'ph-performance':     return <PerformanceAndTalentPanel defaultTab="reviews" />;
    case 'ph-9box':            return <PerformanceAndTalentPanel defaultTab="9box" />;
    case 'ph-succession':      return <PerformanceAndTalentPanel defaultTab="succession" />;
    case 'ph-compensation':    return <PerformanceAndTalentPanel defaultTab="compensation" />;
    case 'ph-training-catalog': return <LearningAndDevelopmentPanel defaultTab="catalog" />;
    case 'ph-training-enroll':  return <LearningAndDevelopmentPanel defaultTab="enrollments" />;
    case 'ph-skill-matrix':     return <LearningAndDevelopmentPanel defaultTab="skills" />;
    case 'ph-certifications':   return <LearningAndDevelopmentPanel defaultTab="certifications" />;
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
  'ph-onboarding': 'Onboarding',
  'ph-performance': 'Performance Reviews',
  'ph-9box': '9-Box Grid',
  'ph-succession': 'Succession Planning',
  'ph-compensation': 'Compensation Actions',
  'ph-training-catalog': 'Training Catalog',
  'ph-training-enroll':  'Enrollments',
  'ph-skill-matrix':     'Skill Matrix',
  'ph-certifications':   'Certifications',
};

export default function PayHubPage() {
  const [activeModule, setActiveModule] = useState<PayHubModule>('ph-dashboard');

  useEffect(() => {
    const handler = (e: Event) => {
      const target = (e as CustomEvent<PayHubModule>).detail;
      if (target) setActiveModule(target);
    };
    window.addEventListener('ph-navigate', handler);
    return () => window.removeEventListener('ph-navigate', handler);
  }, []);

  return (
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
          showCompany={false}
        />
        <ScrollArea className="flex-1">
          <div className="p-6 max-w-7xl mx-auto">
            {renderModule(activeModule)}
          </div>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
