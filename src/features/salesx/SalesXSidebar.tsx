/**
 * SalesXSidebar.tsx — SalesX Hub left sidebar
 * Orange-500 accent. Config-driven Masters + Reports sections.
 * [JWT] SAMConfig read from comply360SAMKey(entityCode)
 */
import { useState, useMemo } from 'react';
import {
  TrendingUp, LayoutDashboard, Users, UserCheck, Briefcase,
  Network, Star, Target, Phone, FileText,
  ChevronRight, UserPlus, Award, Megaphone, Compass,
  Wallet, ListChecks, GitBranch, FileBarChart,
  CalendarClock, Trophy, BarChart3, ClipboardList,
  FileMinus, MapPin, Route, Navigation, ListTree, MapPinned, GitMerge,
  Package, Presentation, Video, Store, Inbox, ClipboardCheck,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { comply360SAMKey } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { SAMConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { SalesXModule } from './SalesXSidebar.types';


interface Props {
  activeModule: SalesXModule;
  onModuleChange: (m: SalesXModule) => void;
  entityCode: string;
}

function loadSAMConfig(entityCode: string): SAMConfig | null {
  try {
    // [JWT] GET /api/compliance/comply360/sam/:entityCode
    const raw = localStorage.getItem(comply360SAMKey(entityCode));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function SalesXSidebar({ activeModule, onModuleChange, entityCode }: Props) {
  const [mastersOpen, setMastersOpen] = useState(true);
  const [txnOpen, setTxnOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const cfg = useMemo(() => loadSAMConfig(entityCode), [entityCode]);

  const masterItems = useMemo(() => {
    if (!cfg?.enableSalesActivityModule) return [];
    const items: Array<{ id: SalesXModule; label: string; icon: React.ElementType }> = [];
    if (cfg.enableHierarchyMaster)
      items.push({ id: 'sx-m-hierarchy', label: 'Hierarchy Master', icon: Network });
    if (cfg.enableCompanySalesMan)
      items.push({ id: 'sx-m-salesman', label: 'Salesman Master', icon: UserCheck });
    if (cfg.enableAgentModule) {
      items.push({ id: 'sx-m-agent', label: 'Agent Master', icon: Briefcase });
      items.push({ id: 'sx-m-broker', label: 'Broker Master', icon: Award });
    }
    if (cfg.enableReceiver)
      items.push({ id: 'sx-m-receiver', label: 'Receiver Master', icon: Star });
    if (cfg.enableReference)
      items.push({ id: 'sx-m-reference', label: 'Reference Master', icon: UserPlus });
    // Always available CRM masters
    items.push({ id: 'sx-m-enquiry-source', label: 'Enquiry Sources', icon: Compass });
    items.push({ id: 'sx-m-campaign', label: 'Campaigns', icon: Megaphone });
    // Field Force masters (Sprint 7)
    items.push({ id: 'sx-m-territory', label: 'Territory Master', icon: MapPin });
    items.push({ id: 'sx-m-beat', label: 'Beat Routes', icon: Route });
    if (cfg.enableSLSMTarget || cfg.enableCompanyTarget) {
      items.push({ id: 'sx-m-target' as SalesXModule, label: 'Targets', icon: Target });
    }
    return items;
  }, [cfg]);

  const txnItems = [
    {
      id: 'sx-t-enquiry' as SalesXModule,
      label: 'Enquiry',
      icon: Users,
      live: !!cfg?.enableSalesActivityModule,
    },
    {
      id: 'sx-t-pipeline' as SalesXModule,
      label: 'CRM Pipeline',
      icon: Target,
      live: !!cfg?.enableCRM,
    },
    {
      id: 'sx-t-telecaller' as SalesXModule,
      label: 'Telecaller',
      icon: Phone,
      live: !!cfg?.enableTelecalling,
    },
    {
      id: 'sx-t-quotation' as SalesXModule,
      label: 'Quotation',
      icon: FileText,
      live: true,
    },
    {
      id: 'sx-t-supply-memo' as SalesXModule,
      label: 'Supply Request Memo',
      icon: ClipboardList,
      live: true,
    },
    {
      id: 'sx-t-invoice-memo' as SalesXModule,
      label: 'Invoice Memo',
      icon: FileText,
      live: true,
    },
    {
      id: 'sx-t-sample-outward' as SalesXModule,
      label: 'Sample Outward',
      icon: Package,
      live: true,
    },
    {
      id: 'sx-t-demo-outward' as SalesXModule,
      label: 'Demo Outward',
      icon: Presentation,
      live: true,
    },
    {
      id: 'sx-t-return-memo' as SalesXModule,
      label: 'Sales Return Memo',
      icon: FileMinus,
      live: true,
    },
    {
      id: 'sx-t-visit' as SalesXModule,
      label: 'Visit Tracking',
      icon: Navigation,
      live: true,
    },
    {
      id: 'sx-t-secondary' as SalesXModule,
      label: 'Secondary Sales',
      icon: ListTree,
      live: true,
    },
    {
      id: 'sx-t-lead-agg' as SalesXModule,
      label: 'Lead Inbox',
      icon: Inbox,
      live: true,
    },
    {
      id: 'sx-t-exhibition' as SalesXModule,
      label: 'Exhibition Manager',
      icon: Store,
      live: true,
    },
    {
      id: 'sx-t-webinar' as SalesXModule,
      label: 'Webinar Manager',
      icon: Video,
      live: true,
    },
    {
      id: 'sx-t-call-quality' as SalesXModule,
      label: 'Call Quality',
      icon: ClipboardCheck,
      live: true,
    },
    {
      id: 'sx-t-lead-distribution' as SalesXModule,
      label: 'Lead Distribution',
      icon: Network,
      live: true,
    },
    {
      id: 'sx-analytics' as SalesXModule,
      label: 'Analytics',
      icon: BarChart3,
      live: true,
    },
  ];

  const reportItems: Array<{ id: SalesXModule; label: string; icon: React.ElementType; live: boolean }> = [
    { id: 'sx-r-commission',          label: 'Commission Register',  icon: Wallet,        live: true },
    { id: 'sx-r-enquiry-register',    label: 'Enquiry Register',     icon: ListChecks,    live: true },
    { id: 'sx-r-pipeline-summary',    label: 'Pipeline Summary',     icon: GitBranch,     live: true },
    { id: 'sx-r-quotation-register',  label: 'Quotation Register',   icon: FileBarChart,  live: true },
    { id: 'sx-r-return-memo-register',label: 'Return Memo Register', icon: ClipboardList, live: true },
    { id: 'sx-r-beat-productivity',   label: 'Beat Productivity',    icon: Route,         live: true },
    { id: 'sx-r-coverage',            label: 'Coverage Report',      icon: MapPinned,     live: true },
    { id: 'sx-r-secondary-sales',     label: 'Secondary Sales',      icon: ListTree,      live: true },
    { id: 'sx-r-followup',            label: 'Follow-Up Register',   icon: CalendarClock, live: !!cfg?.enableSalesActivityModule },
    { id: 'sx-r-target',              label: 'Target vs Achievement',icon: Trophy,        live: !!(cfg?.enableSLSMTarget || cfg?.enableCompanyTarget) },
    { id: 'sx-r-so-tracker',          label: 'Sales Order Tracker',  icon: ClipboardList, live: true },
    { id: 'sx-r-handoff-tracker',     label: 'Handoff Tracker',      icon: GitMerge,      live: true },
    { id: 'sx-r-campaign-performance',label: 'Campaign Performance', icon: Megaphone,     live: true },
    { id: 'sx-r-exhibition-report',   label: 'Exhibition Report',    icon: Store,         live: true },
    { id: 'sx-r-webinar-report',      label: 'Webinar Report',       icon: Video,         live: true },
  ];

  const btn = (
    id: SalesXModule, label: string, Icon: React.ElementType,
    live: boolean, tooltip?: string,
  ) => (
    <SidebarMenuItem key={id}>
      <SidebarMenuButton
        tooltip={tooltip ?? label}
        onClick={() => live && onModuleChange(id)}
        className={cn(
          'text-xs h-8 gap-2',
          activeModule === id &&
            'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30',
          activeModule !== id && live && 'hover:bg-orange-500/10 cursor-pointer',
          !live && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
        {!live && <Badge variant="outline" className="ml-auto text-[9px] py-0">Soon</Badge>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="h-1 w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 mb-3" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="font-bold text-sm">SalesX Hub</p>
            <p className="text-[10px] text-muted-foreground">Sales & CRM</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2 space-y-2">
        <SidebarMenu className="px-3">
          {btn('sx-hub', 'Hub Overview', LayoutDashboard, true, 'Hub Overview')}
        </SidebarMenu>

        {masterItems.length > 0 && (
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
                {masterItems.map(item => btn(item.id, item.label, item.icon, true))}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        )}

        {!cfg?.enableSalesActivityModule && (
          <div className="px-3 py-2 text-[10px] text-muted-foreground/70 group-data-[collapsible=icon]:hidden">
            Configure SAM in Comply360 to unlock SAM masters.
          </div>
        )}

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
              {txnItems.map(item => btn(item.id, item.label, item.icon, item.live))}
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
              {reportItems.map(item => btn(item.id, item.label, item.icon, item.live))}
            </SidebarMenu>
          </CollapsibleContent>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="h-6 w-6 rounded bg-orange-500/15 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-3 w-3 text-orange-500" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] font-semibold leading-tight">
              <span style={{ color: 'hsl(24 95% 53%)' }}>Made</span>{' '}
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
