/**
 * PayHubSidebar.tsx — Pay Hub left sidebar
 * Mirrors CommandCenterSidebar structure. Violet color scheme.
 */
import { useState } from 'react';
import {
  Users2, LayoutDashboard, IndianRupee, Calculator, Award,
  Users, Clock, Palmtree, Calendar, Timer, Coins, Gift, Heart, Box,
  ClipboardList, FileText, BarChart3, ChevronRight,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu,
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
  | 'ph-payslip-gen';

const LIVE_MODULES: PayHubModule[] = [
  'ph-dashboard', 'ph-pay-heads', 'ph-salary-structures', 'ph-pay-grades', 'ph-employees',
  'ph-shifts', 'ph-leave-types', 'ph-holiday-calendar', 'ph-attendance-types',
  'ph-overtime-rules', 'ph-loan-types', 'ph-bonus-config', 'ph-gratuity-nps',
  'ph-asset-master',
  'ph-attendance-entry',
  'ph-leave-requests',
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
];

interface PayHubSidebarProps {
  activeModule: PayHubModule;
  onModuleChange: (m: PayHubModule) => void;
}

export function PayHubSidebar({ activeModule, onModuleChange }: PayHubSidebarProps) {
  const [mastersOpen, setMastersOpen] = useState(true);
  const [txnOpen, setTxnOpen] = useState(false);

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
          'h-3 w-3 text-muted-foreground/60 transition-transform',
          open && 'rotate-90',
        )} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
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
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="h-1 w-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 mb-3" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Users2 className="h-4 w-4 text-violet-500" />
          </div>
          <div>
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

        {renderSection('Masters', MASTERS_ITEMS, mastersOpen, setMastersOpen)}
        {renderSection('Transactions', TRANSACTIONS_ITEMS, txnOpen, setTxnOpen)}

        {/* Reports placeholder */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-1">
            <BarChart3 className="h-3 w-3 text-muted-foreground/40" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
              Reports & ESS
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground/40 ml-4 mt-1">Sprint 9+</p>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
