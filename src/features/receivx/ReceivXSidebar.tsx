/**
 * ReceivXSidebar.tsx — ReceivX Hub left sidebar
 * Amber-500 accent. Hub / Masters / Transactions / Reports.
 */
import { useState } from 'react';
import { TrendingUp, LayoutDashboard, Bell, MessageCircle, Mail, ClipboardCheck, AlertTriangle, Shield, Users, Settings, CalendarClock, BadgeIndianRupee, Activity, ChevronRight, CreditCard, MailWarning } from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type ReceivXModule =
  | 'rx-hub'
  | 'rx-m-reminder-template' | 'rx-m-collection-exec'
  | 'rx-m-incentive-scheme' | 'rx-m-config'
  | 'rx-t-task-board' | 'rx-t-ptp-tracker' | 'rx-t-reminder-console'
  | 'rx-t-payment-links' | 'rx-t-dunning'
  | 'rx-r-aging-salesman' | 'rx-r-aging-agent'
  | 'rx-r-aging-broker' | 'rx-r-aging-telecaller'
  | 'rx-r-collection-eff' | 'rx-r-comm-log' | 'rx-r-credit-risk';

export const LIVE_RECEIVX_MODULES: ReceivXModule[] = [
  'rx-hub','rx-m-reminder-template','rx-m-collection-exec',
  'rx-m-incentive-scheme','rx-m-config',
  'rx-t-task-board','rx-t-ptp-tracker','rx-t-reminder-console',
  'rx-t-payment-links','rx-t-dunning',
  'rx-r-aging-salesman','rx-r-aging-agent',
  'rx-r-aging-broker','rx-r-aging-telecaller',
  'rx-r-collection-eff','rx-r-comm-log','rx-r-credit-risk',
];

interface Props {
  activeModule: ReceivXModule;
  onModuleChange: (m: ReceivXModule) => void;
  entityCode: string;
}

export function ReceivXSidebar({ activeModule, onModuleChange }: Props) {
  const [mastersOpen, setMastersOpen] = useState(true);
  const [txnOpen, setTxnOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(false);

  const masterItems: Array<{ id: ReceivXModule; label: string; icon: React.ElementType }> = [
    { id: 'rx-m-reminder-template', label: 'Reminder Templates', icon: Bell },
    { id: 'rx-m-collection-exec',   label: 'Collection Execs',   icon: Users },
    { id: 'rx-m-incentive-scheme',  label: 'Incentive Schemes',  icon: BadgeIndianRupee },
    { id: 'rx-m-config',            label: 'ReceivX Config',     icon: Settings },
  ];

  const txnItems: Array<{ id: ReceivXModule; label: string; icon: React.ElementType }> = [
    { id: 'rx-t-task-board',       label: 'Outstanding Tasks',  icon: ClipboardCheck },
    { id: 'rx-t-ptp-tracker',      label: 'PTP Tracker',        icon: CalendarClock },
    { id: 'rx-t-reminder-console', label: 'Reminder Console',   icon: MessageCircle },
    { id: 'rx-t-payment-links',    label: 'Payment Links',      icon: CreditCard },
    { id: 'rx-t-dunning',          label: 'Dunning Console',    icon: MailWarning },
  ];

  const reportItems: Array<{ id: ReceivXModule; label: string; icon: React.ElementType }> = [
    { id: 'rx-r-aging-salesman',   label: 'Aging — Salesman',   icon: Users },
    { id: 'rx-r-aging-agent',      label: 'Aging — Agent',      icon: Users },
    { id: 'rx-r-aging-broker',     label: 'Aging — Broker',     icon: Users },
    { id: 'rx-r-aging-telecaller', label: 'Aging — Telecaller', icon: Users },
    { id: 'rx-r-collection-eff',   label: 'Collection Eff.',    icon: Activity },
    { id: 'rx-r-comm-log',         label: 'Communication Log',  icon: Mail },
    { id: 'rx-r-credit-risk',      label: 'Credit Risk',        icon: AlertTriangle },
  ];

  const btn = (id: ReceivXModule, label: string, Icon: React.ElementType) => (
    <SidebarMenuItem key={id}>
      <SidebarMenuButton
        tooltip={label}
        onClick={() => onModuleChange(id)}
        className={cn(
          'text-xs h-8 gap-2',
          activeModule === id &&
            'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
          activeModule !== id && 'hover:bg-amber-500/10 cursor-pointer',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="h-1 w-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 mb-3" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="font-bold text-sm">ReceivX Hub</p>
            <p className="text-[10px] text-muted-foreground">Collections</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2 space-y-2">
        <SidebarMenu className="px-3">
          {btn('rx-hub', 'Hub Overview', LayoutDashboard)}
          {btn('rx-t-task-board', 'Task Board', ClipboardCheck)}
        </SidebarMenu>

        <Collapsible open={mastersOpen} onOpenChange={setMastersOpen} className="px-2">
          <CollapsibleTrigger className="flex items-center gap-1 w-full px-2 py-1.5 group">
            <ChevronRight className={cn(
              'h-3 w-3 text-muted-foreground/90 transition-transform',
              mastersOpen && 'rotate-90',
            )} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
              Masters
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenu className="px-1 space-y-0.5">
              {masterItems.map(it => btn(it.id, it.label, it.icon))}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={txnOpen} onOpenChange={setTxnOpen} className="px-2">
          <CollapsibleTrigger className="flex items-center gap-1 w-full px-2 py-1.5 group">
            <ChevronRight className={cn(
              'h-3 w-3 text-muted-foreground/90 transition-transform',
              txnOpen && 'rotate-90',
            )} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
              Transactions
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenu className="px-1 space-y-0.5">
              {txnItems.map(it => btn(it.id, it.label, it.icon))}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={reportsOpen} onOpenChange={setReportsOpen} className="px-2">
          <CollapsibleTrigger className="flex items-center gap-1 w-full px-2 py-1.5 group">
            <ChevronRight className={cn(
              'h-3 w-3 text-muted-foreground/90 transition-transform',
              reportsOpen && 'rotate-90',
            )} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">
              Reports
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenu className="px-1 space-y-0.5">
              {reportItems.map(it => btn(it.id, it.label, it.icon))}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="h-6 w-6 rounded bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Shield className="h-3 w-3 text-amber-500" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] font-semibold leading-tight">
              <span style={{ color: 'hsl(45 93% 47%)' }}>Made</span>{' '}
              <span className="text-foreground">in</span>{' '}
              <span style={{ color: 'hsl(145 63% 42%)' }}>India</span>
            </p>
            <p className="text-[9px] text-muted-foreground/60 leading-tight">4DSmartOps v0.1.0</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
