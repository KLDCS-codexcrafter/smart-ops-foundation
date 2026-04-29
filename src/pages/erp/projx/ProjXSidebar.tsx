/**
 * ProjXSidebar.tsx — ProjX left sidebar
 * Sprint T-Phase-1.1.2-a · Tier 1 Card #1 · mirrors FineCoreSidebar pattern
 * Indigo color scheme. Masters section LINKS OUT to Command Center.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Briefcase, FolderKanban, ChevronRight, ExternalLink,
  Milestone, Users, Clock, FileText, BarChart3, TrendingUp, PieChart, Activity,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { ProjXModule } from './ProjXSidebar.types';

const LIVE_MODULES: ProjXModule[] = [
  'welcome', 't-project-entry', 'm-project-centres',
  't-milestone-tracker', 't-resource-allocation', 't-time-entry', 't-invoice-scheduling',
  'r-project-pnl', 'r-resource-utilization', 'r-milestone-status', 'r-project-margin',
];

interface SidebarItem {
  id: ProjXModule;
  label: string;
  icon: React.ElementType;
}

interface LinkOutItem {
  label: string;
  icon: React.ElementType;
  hash: string;
}

const MASTERS_LINKS: LinkOutItem[] = [
  { label: 'Project Centres', icon: FolderKanban, hash: '#projx-project-centres' },
];

const TXN_ITEMS: SidebarItem[] = [
  { id: 't-project-entry', label: 'Project Entry', icon: Briefcase },
  { id: 't-milestone-tracker', label: 'Milestone Tracker', icon: Milestone },
  { id: 't-resource-allocation', label: 'Resource Allocation', icon: Users },
  { id: 't-time-entry', label: 'Time Entry', icon: Clock },
  { id: 't-invoice-scheduling', label: 'Invoice Scheduling', icon: FileText },
];

const RPT_ITEMS: SidebarItem[] = [
  { id: 'r-project-pnl', label: 'Project P&L', icon: PieChart },
  { id: 'r-resource-utilization', label: 'Resource Utilization', icon: Activity },
  { id: 'r-milestone-status', label: 'Milestone Status', icon: BarChart3 },
  { id: 'r-project-margin', label: 'Project Margin', icon: TrendingUp },
];

interface ProjXSidebarProps {
  active: ProjXModule;
  onNavigate: (m: ProjXModule) => void;
}

export function ProjXSidebar({ active, onNavigate }: ProjXSidebarProps) {
  const navigate = useNavigate();
  const [mastersOpen, setMastersOpen] = useState(false);
  const [txnOpen, setTxnOpen] = useState(true);
  const [rptOpen, setRptOpen] = useState(false);

  useEffect(() => {
    if (active.startsWith('t-')) setTxnOpen(true);
    else if (active.startsWith('r-')) setRptOpen(true);
    else if (active.startsWith('m-')) setMastersOpen(true);
  }, [active]);

  const isLive = (id: ProjXModule) => LIVE_MODULES.includes(id);

  const renderItem = (item: SidebarItem) => {
    const live = isLive(item.id);
    const isActive = active === item.id;
    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          onClick={() => live && onNavigate(item.id)}
          className={cn(
            'text-xs h-8 gap-2 transition-all',
            isActive && 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30',
            !live && 'opacity-50 cursor-not-allowed',
            live && !isActive && 'hover:bg-indigo-500/10 cursor-pointer',
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
    title: string, items: SidebarItem[], open: boolean, setOpen: (v: boolean) => void,
  ) => (
    <Collapsible open={open} onOpenChange={setOpen} className="px-2">
      <CollapsibleTrigger className="flex items-center gap-1 w-full px-2 py-1.5 group">
        <ChevronRight className={cn('h-3 w-3 text-muted-foreground/90 transition-transform', open && 'rotate-90')} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenu className="px-1 space-y-0.5">{items.map(renderItem)}</SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="h-1 w-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 mb-3" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <Briefcase className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="font-bold text-sm">ProjX</p>
            <p className="text-[10px] text-muted-foreground">Project Management</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2 space-y-2">
        <SidebarMenu className="px-3">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Welcome"
              onClick={() => onNavigate('welcome')}
              className={cn(
                'text-xs h-8 gap-2',
                active === 'welcome' && 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30',
                active !== 'welcome' && 'hover:bg-indigo-500/10',
              )}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span>Welcome</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Masters — link-outs */}
        <Collapsible open={mastersOpen} onOpenChange={setMastersOpen} className="px-2">
          <CollapsibleTrigger className="flex items-center gap-1 w-full px-2 py-1.5 group">
            <ChevronRight className={cn('h-3 w-3 text-muted-foreground/90 transition-transform', mastersOpen && 'rotate-90')} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/90">Masters</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenu className="px-1 space-y-0.5">
              {MASTERS_LINKS.map(link => (
                <SidebarMenuItem key={link.hash}>
                  <SidebarMenuButton
                    onClick={() => navigate(`/erp/command-center${link.hash}`)}
                    className="text-xs h-8 gap-2 hover:bg-indigo-500/10 cursor-pointer"
                  >
                    <link.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{link.label}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>

        {renderSection('Transactions', TXN_ITEMS, txnOpen, setTxnOpen)}
        {renderSection('Reports', RPT_ITEMS, rptOpen, setRptOpen)}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="h-6 w-6 rounded bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
            <Briefcase className="h-3 w-3 text-indigo-500" />
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
