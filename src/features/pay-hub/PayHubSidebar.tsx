/**
 * PayHubSidebar.tsx — Pay Hub left sidebar
 * Mirrors CommandCenterSidebar structure. Violet color scheme.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users2, LayoutDashboard, IndianRupee, Calculator, Award, Users, Clock, Palmtree, Calendar, Timer, Coins, Gift, Heart, Box, ClipboardList, FileText, ChevronRight, Shield, HardHat, CreditCard, Wallet, Receipt, Briefcase, BookOpen, FolderOpen, Rocket, Star, Grid3X3, TrendingUp, GraduationCap, Bell, UserCog, Mail, Monitor, LogOut, ExternalLink } from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type PayHubModule =
  | 'ph-dashboard'
  | 'ph-pay-heads'
  | 'ph-salary-structures'
  | 'ph-pay-grades'
  | 'ph-employees'
  | 'ph-shifts'
  | 'ph-leave-types'
  | 'ph-holiday-calendar'
  | 'ph-attendance-types'
  | 'ph-overtime-rules'
  | 'ph-loan-types'
  | 'ph-bonus-config'
  | 'ph-gratuity-nps'
  | 'ph-asset-master'
  | 'ph-attendance-entry'
  | 'ph-leave-requests'
  | 'ph-payroll-processing'
  | 'ph-payslip-gen'
  | 'ph-daybook'
  | 'ph-pf-ecr'
  | 'ph-esi-returns'
  | 'ph-pt-returns'
  | 'ph-tds-24q'
  | 'ph-form16'
  | 'ph-statutory-calendar'
  | 'ph-loans'
  | 'ph-salary-advance'
  | 'ph-expense-claims'
  | 'ph-flexi-benefits'
  | 'ph-recruitment'
  | 'ph-documents'
  | 'ph-policies'
  | 'ph-onboarding'
  | 'ph-performance'
  | 'ph-9box'
  | 'ph-succession'
  | 'ph-compensation'
  | 'ph-training-catalog'
  | 'ph-training-enroll'
  | 'ph-skill-matrix'
  | 'ph-certifications'
  | 'ph-directory'
  | 'ph-inbox'
  | 'ph-collaboration'
  | 'ph-total-rewards'
  | 'ph-ess'
  | 'ph-access-control'
  | 'ph-email-templates'
  | 'ph-activity'
  | 'ph-exit'
  | 'ph-fnf'
  | 'ph-doc-vault'
  | 'ph-doc-templates'
  | 'ph-contract-workers'
  | 'ph-contract-orders'
  | 'ph-contract-compliance';
const LIVE_MODULES: PayHubModule[] = [
  'ph-dashboard', 'ph-pay-heads', 'ph-salary-structures', 'ph-pay-grades', 'ph-employees',
  'ph-shifts', 'ph-leave-types', 'ph-holiday-calendar', 'ph-attendance-types',
  'ph-overtime-rules', 'ph-loan-types', 'ph-bonus-config', 'ph-gratuity-nps',
  'ph-asset-master',
  'ph-attendance-entry',
  'ph-leave-requests',
  'ph-payroll-processing',
  'ph-payslip-gen',
  'ph-daybook',
  'ph-pf-ecr', 'ph-esi-returns', 'ph-pt-returns',
  'ph-tds-24q', 'ph-form16', 'ph-statutory-calendar',
  'ph-loans', 'ph-salary-advance', 'ph-expense-claims', 'ph-flexi-benefits',
  'ph-recruitment',
  'ph-onboarding',
  'ph-performance', 'ph-9box', 'ph-succession', 'ph-compensation',
  'ph-training-catalog', 'ph-training-enroll', 'ph-skill-matrix', 'ph-certifications',
  'ph-directory', 'ph-inbox', 'ph-collaboration', 'ph-total-rewards',
  'ph-ess', 'ph-access-control', 'ph-email-templates', 'ph-activity',
  'ph-exit', 'ph-fnf',
  'ph-doc-vault', 'ph-doc-templates',
  'ph-documents', 'ph-policies',
  'ph-contract-workers', 'ph-contract-orders', 'ph-contract-compliance',
];

interface SidebarItem {
  id: PayHubModule;
  label: string;
  icon: React.ElementType;
}

const MASTERS_ITEMS: SidebarItem[] = [
  { id: 'ph-pay-heads', label: 'Pay Heads', icon: IndianRupee },
  { id: 'ph-salary-structures', label: 'Salary Structures', icon: Calculator },
  { id: 'ph-pay-grades', label: 'Pay Grades', icon: Award },
  { id: 'ph-employees', label: 'Employee Master', icon: Users },
  { id: 'ph-shifts', label: 'Shift Master', icon: Clock },
  { id: 'ph-leave-types', label: 'Leave Types', icon: Palmtree },
  { id: 'ph-holiday-calendar', label: 'Holiday Calendar', icon: Calendar },
  { id: 'ph-attendance-types', label: 'Attendance Types', icon: Timer },
  { id: 'ph-overtime-rules', label: 'Overtime Rules', icon: Clock },
  { id: 'ph-loan-types', label: 'Loan Types', icon: Coins },
  { id: 'ph-bonus-config', label: 'Bonus Config', icon: Gift },
  { id: 'ph-gratuity-nps', label: 'Gratuity & NPS', icon: Heart },
  { id: 'ph-asset-master', label: 'Asset Master', icon: Box },
];

const TRANSACTIONS_ITEMS: SidebarItem[] = [
  { id: 'ph-attendance-entry', label: 'Attendance Entry', icon: ClipboardList },
  { id: 'ph-leave-requests', label: 'Leave Requests', icon: FileText },
  { id: 'ph-payroll-processing', label: 'Payroll Processing', icon: Calculator },
  { id: 'ph-payslip-gen', label: 'Payslip Generation', icon: FileText },
  { id: 'ph-daybook', label: 'Day Book', icon: BookOpen },
];

const STATUTORY_ITEMS: SidebarItem[] = [
  { id: 'ph-pf-ecr',             label: 'PF ECR',             icon: Shield },
  { id: 'ph-esi-returns',        label: 'ESI Returns',        icon: Shield },
  { id: 'ph-pt-returns',         label: 'PT Returns',         icon: IndianRupee },
  { id: 'ph-tds-24q',            label: 'Form 24Q',           icon: FileText },
  { id: 'ph-form16',             label: 'Form 16',            icon: FileText },
  { id: 'ph-statutory-calendar', label: 'Statutory Calendar',  icon: Calendar },
];

const FINANCE_ITEMS: SidebarItem[] = [
  { id: 'ph-loans',           label: 'Loans & Advances',  icon: CreditCard },
  { id: 'ph-salary-advance',  label: 'Salary Advance',    icon: Wallet },
  { id: 'ph-expense-claims',  label: 'Expense Claims',    icon: Receipt },
  { id: 'ph-flexi-benefits',  label: 'Flexi Benefits',    icon: Gift },
];

const RECRUITMENT_ITEMS: SidebarItem[] = [
  { id: 'ph-recruitment',   label: 'Recruitment',     icon: Briefcase },
  { id: 'ph-doc-vault',     label: 'Document Vault',  icon: FolderOpen },
  { id: 'ph-doc-templates', label: 'Template Library', icon: FileText },
  { id: 'ph-onboarding',    label: 'Onboarding',      icon: Rocket },
];

const PERFORMANCE_ITEMS: SidebarItem[] = [
  { id: 'ph-performance',   label: 'Performance Reviews', icon: Star },
  { id: 'ph-9box',          label: '9-Box Grid',          icon: Grid3X3 },
  { id: 'ph-succession',    label: 'Succession Planning', icon: Users },
  { id: 'ph-compensation',  label: 'Compensation Actions', icon: TrendingUp },
];

const LEARNING_ITEMS: SidebarItem[] = [
  { id: 'ph-training-catalog', label: 'Training Catalog', icon: BookOpen },
  { id: 'ph-training-enroll',  label: 'Enrollments',      icon: GraduationCap },
  { id: 'ph-skill-matrix',     label: 'Skill Matrix',     icon: Grid3X3 },
  { id: 'ph-certifications',   label: 'Certifications',   icon: Award },
];

const EXPERIENCE_ITEMS: SidebarItem[] = [
  { id: 'ph-directory',     label: 'Employee Directory', icon: Users },
  { id: 'ph-inbox',         label: 'Inbox',              icon: Bell },
  { id: 'ph-collaboration', label: 'Collaboration',      icon: Heart },
  { id: 'ph-total-rewards', label: 'Total Rewards',      icon: Gift },
];

const ADMIN_ITEMS: SidebarItem[] = [
  { id: 'ph-ess',             label: 'ESS Portal',          icon: UserCog },
  { id: 'ph-access-control',  label: 'Access Control',      icon: Shield },
  { id: 'ph-email-templates', label: 'Email Templates',     icon: Mail },
  { id: 'ph-activity',        label: 'Activity Monitoring', icon: Monitor },
];

const EXIT_ITEMS: SidebarItem[] = [
  { id: 'ph-exit', label: 'Exit Management', icon: LogOut },
  { id: 'ph-fnf',  label: 'F&F Settlement',  icon: Receipt },
];

const CONTRACT_ITEMS: SidebarItem[] = [
  { id: 'ph-contract-workers',    label: 'Contract Workers',    icon: HardHat },
  { id: 'ph-contract-orders',     label: 'Work Orders',         icon: FileText },
  { id: 'ph-contract-compliance', label: 'Compliance Register', icon: Shield },
];

interface PayHubSidebarProps {
  activeModule: PayHubModule;
  onModuleChange: (m: PayHubModule) => void;
}

export function PayHubSidebar({ activeModule, onModuleChange }: PayHubSidebarProps) {
  const navigate = useNavigate();
  const [mastersOpen, setMastersOpen] = useState(true);
  const [txnOpen, setTxnOpen] = useState(false);
  const [statutoryOpen, setStatutoryOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [recruitmentOpen, setRecruitmentOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [learningOpen, setLearningOpen] = useState(false);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);

  const isLive = (id: PayHubModule) => LIVE_MODULES.includes(id);

  const renderItem = (item: SidebarItem) => {
    const live = isLive(item.id);
    const active = activeModule === item.id;
    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          onClick={() => live && onModuleChange(item.id)}
          className={cn(
            'text-xs h-8 gap-2 transition-all',
            active && 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30',
            !live && 'opacity-50 cursor-not-allowed',
            live && !active && 'hover:bg-violet-500/10 cursor-pointer',
          )}
        >
          <item.icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate flex-1">{item.label}</span>
          {!live && (
            <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-muted-foreground/30 text-muted-foreground/60 shrink-0">
              Soon
            </Badge>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderSection = (
    title: string,
    items: SidebarItem[],
    open: boolean,
    setOpen: (v: boolean) => void,
  ) => (
    <Collapsible open={open} onOpenChange={setOpen} className="px-2">
      <CollapsibleTrigger className="flex items-center gap-1 w-full px-2 py-1.5 group">
        <ChevronRight className={cn(
          'h-3 w-3 text-muted-foreground/90 transition-transform',
          open && 'rotate-90',
        )} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
          {title}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenu className="px-1 space-y-0.5">
          {items.map(renderItem)}
        </SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="h-1 w-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 mb-3" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Users2 className="h-4 w-4 text-violet-500" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="font-bold text-sm">Pay Hub</p>
            <p className="text-[10px] text-muted-foreground">People & Payroll</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2 space-y-2">
        {/* Dashboard */}
        <SidebarMenu className="px-3">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Dashboard"
              onClick={() => onModuleChange('ph-dashboard')}
              className={cn(
                'text-xs h-8 gap-2',
                activeModule === 'ph-dashboard' && 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30',
                activeModule !== 'ph-dashboard' && 'hover:bg-violet-500/10',
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <Collapsible open={mastersOpen} onOpenChange={setMastersOpen} className="px-2">
          <CollapsibleTrigger className="flex items-center gap-1 w-full px-2 py-1.5 group">
            <ChevronRight className={cn('h-3 w-3 text-muted-foreground/90 transition-transform', mastersOpen && 'rotate-90')} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">Masters</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenu className="px-1 space-y-0.5">
              {MASTERS_ITEMS.map(item => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => navigate(`/erp/command-center#${item.id}`)}
                    className="text-xs h-8 gap-2 hover:bg-violet-500/10 cursor-pointer"
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{item.label}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>
        {renderSection('Transactions', TRANSACTIONS_ITEMS, txnOpen, setTxnOpen)}
        {renderSection('STATUTORY & COMPLIANCE', STATUTORY_ITEMS, statutoryOpen, setStatutoryOpen)}
        {renderSection('EMPLOYEE FINANCE', FINANCE_ITEMS, financeOpen, setFinanceOpen)}

        {renderSection('CONTRACT MANPOWER', CONTRACT_ITEMS, contractOpen, setContractOpen)}
        {renderSection('RECRUITMENT', RECRUITMENT_ITEMS, recruitmentOpen, setRecruitmentOpen)}
        {renderSection('PERFORMANCE & TALENT', PERFORMANCE_ITEMS, performanceOpen, setPerformanceOpen)}
        {renderSection('LEARNING & DEVELOPMENT', LEARNING_ITEMS, learningOpen, setLearningOpen)}
        {renderSection('EMPLOYEE EXPERIENCE', EXPERIENCE_ITEMS, experienceOpen, setExperienceOpen)}
        {renderSection('ADMIN & CONFIG', ADMIN_ITEMS, adminOpen, setAdminOpen)}
        {renderSection('EXIT & SEPARATION', EXIT_ITEMS, exitOpen, setExitOpen)}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="h-6 w-6 rounded bg-violet-500/15 flex items-center justify-center flex-shrink-0">
            <Users2 className="h-3 w-3 text-violet-500" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] font-semibold leading-tight">
              <span style={{ color: "hsl(24 95% 53%)" }}>Made</span>{" "}
              <span className="text-foreground">in</span>{" "}
              <span style={{ color: "hsl(145 63% 42%)" }}>India</span>
            </p>
            <p className="text-[9px] text-muted-foreground/60 leading-tight">4DSmartOps v0.1.0</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
