/**
 * PayHubPage.tsx — Main Pay Hub container
 * Mirrors CommandCenterPage — SidebarProvider + own sidebar + content area.
 */
import { useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { PayHubSidebar, type PayHubModule } from './PayHubSidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PayHubDashboardPanel } from '@/pages/erp/pay-hub/PayHubDashboard';
import { PayHeadMasterPanel } from '@/pages/erp/pay-hub/masters/PayHeadMaster';
import { SalaryStructureMasterPanel } from '@/pages/erp/pay-hub/masters/SalaryStructureMaster';
import { PayGradeMasterPanel } from '@/pages/erp/pay-hub/masters/PayGradeMaster';
import { EmployeeMasterPanel } from '@/pages/erp/pay-hub/masters/EmployeeMaster';

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
};

export default function PayHubPage() {
  const [activeModule, setActiveModule] = useState<PayHubModule>('ph-dashboard');

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
