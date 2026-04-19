/**
 * DistributorHubSidebar.tsx — Distributor Hub left sidebar
 * Mirrors PayHubSidebar structure. Indigo-600 accent.
 * MTR structure: Masters / Transactions / Reports.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Network, TrendingDown, Users2,
  TrendingUp, AlertOctagon, FileCheck, Megaphone,
  BarChart3, IndianRupee, PieChart, ChevronRight,
  Database, Truck, Home, ArrowLeft,
  AlertTriangle, FileSpreadsheet, Star, Sparkles, LineChart,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type DistributorHubModule =
  | 'dh-welcome' | 'dh-hub'
  | 'dh-m-customer' | 'dh-m-price-list' | 'dh-m-hierarchy'
  | 'dh-t-credit-approvals' | 'dh-t-disputes' | 'dh-t-intimations'
  | 'dh-t-broadcast'
  | 'dh-t-stock-out' | 'dh-t-excel-sync' | 'dh-t-ratings'
  | 'dh-t-scheme-simulator'
  | 'dh-r-engagement' | 'dh-r-credit-util' | 'dh-r-dispute-stats'
  | 'dh-r-scheme-effectiveness';

interface DistributorHubSidebarProps {
  activeModule: DistributorHubModule;
  onModuleChange: (m: DistributorHubModule) => void;
}

const MASTERS_ITEMS: { label: string; module: DistributorHubModule;
  icon: React.ComponentType<{ className?: string }>; fromCC?: boolean }[] = [
  { label: 'Customer Master',        module: 'dh-m-customer',   icon: Users2,       fromCC: true },
  { label: 'Price Lists',            module: 'dh-m-price-list', icon: TrendingDown, fromCC: true },
  { label: 'Distributor Hierarchy',  module: 'dh-m-hierarchy',  icon: Network,      fromCC: true },
];

const TRANSACTIONS_ITEMS: { label: string; module: DistributorHubModule;
  icon: React.ComponentType<{ className?: string }> }[] = [
  { label: 'Hub Overview',       module: 'dh-hub',                icon: LayoutDashboard },
  { label: 'Credit Approvals',   module: 'dh-t-credit-approvals', icon: TrendingUp },
  { label: 'Dispute Queue',      module: 'dh-t-disputes',         icon: AlertOctagon },
  { label: 'Intimation Queue',   module: 'dh-t-intimations',      icon: FileCheck },
  { label: 'Broadcast Console',  module: 'dh-t-broadcast',        icon: Megaphone },
  { label: 'Stock-Out Warnings', module: 'dh-t-stock-out',        icon: AlertTriangle },
  { label: 'Excel / API Sync',   module: 'dh-t-excel-sync',       icon: FileSpreadsheet },
  { label: 'Ratings & Score',    module: 'dh-t-ratings',          icon: Star },
  { label: 'Scheme Simulator',   module: 'dh-t-scheme-simulator', icon: Sparkles },
];

const REPORTS_ITEMS: { label: string; module: DistributorHubModule;
  icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
  { label: 'Engagement Analytics', module: 'dh-r-engagement',           icon: BarChart3 },
  { label: 'Credit Utilisation',   module: 'dh-r-credit-util',          icon: IndianRupee },
  { label: 'Dispute Statistics',   module: 'dh-r-dispute-stats',        icon: PieChart },
  { label: 'Scheme Effectiveness', module: 'dh-r-scheme-effectiveness', icon: LineChart },
];

export function DistributorHubSidebar(props: DistributorHubSidebarProps) {
  const navigate = useNavigate();
  const { activeModule, onModuleChange } = props;
  const [mastersOpen, setMastersOpen] = useState(activeModule.startsWith('dh-m-'));
  const [txOpen, setTxOpen] = useState(
    activeModule.startsWith('dh-t-') || activeModule === 'dh-hub',
  );
  const [reportsOpen, setReportsOpen] = useState(activeModule.startsWith('dh-r-'));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-600/15">
            <Truck className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold text-foreground leading-tight">Distributor Hub</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Multi-tier distribution</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Welcome — fixed top entry */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeModule === 'dh-welcome'}
              onClick={() => onModuleChange('dh-welcome')}
              className={cn(
                activeModule === 'dh-welcome' && 'bg-indigo-600/15 text-indigo-600',
              )}
            >
              <Home className="h-4 w-4" />
              <span>Welcome</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* MASTERS SECTION — CC replicas */}
        <Collapsible open={mastersOpen} onOpenChange={setMastersOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={activeModule.startsWith('dh-m-')}
                  className={cn(
                    activeModule.startsWith('dh-m-') && 'bg-indigo-600/15 text-indigo-600',
                  )}
                >
                  <Database className="h-4 w-4" />
                  <span>Masters</span>
                  <Badge variant="outline" className="ml-auto text-[9px] h-4 px-1">CC</Badge>
                  <ChevronRight className={`h-3 w-3 transition-transform ${mastersOpen ? 'rotate-90' : ''}`} />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {MASTERS_ITEMS.map(i => (
                  <SidebarMenuItem key={i.module}>
                    <SidebarMenuButton
                      onClick={() => onModuleChange(i.module)}
                      isActive={activeModule === i.module}
                      className={cn(
                        'pl-8',
                        activeModule === i.module && 'bg-indigo-600/15 text-indigo-600',
                      )}
                    >
                      <i.icon className="h-3.5 w-3.5" />
                      <span className="text-[13px]">{i.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </CollapsibleContent>
            </SidebarMenuItem>
          </SidebarMenu>
        </Collapsible>

        {/* TRANSACTIONS SECTION */}
        <Collapsible open={txOpen} onOpenChange={setTxOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={activeModule === 'dh-hub' || activeModule.startsWith('dh-t-')}
                  className={cn(
                    (activeModule === 'dh-hub' || activeModule.startsWith('dh-t-')) &&
                      'bg-indigo-600/15 text-indigo-600',
                  )}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Transactions</span>
                  <ChevronRight className={`ml-auto h-3 w-3 transition-transform ${txOpen ? 'rotate-90' : ''}`} />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {TRANSACTIONS_ITEMS.map(i => (
                  <SidebarMenuItem key={i.module}>
                    <SidebarMenuButton
                      onClick={() => onModuleChange(i.module)}
                      isActive={activeModule === i.module}
                      className={cn(
                        'pl-8',
                        activeModule === i.module && 'bg-indigo-600/15 text-indigo-600',
                      )}
                    >
                      <i.icon className="h-3.5 w-3.5" />
                      <span className="text-[13px]">{i.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </CollapsibleContent>
            </SidebarMenuItem>
          </SidebarMenu>
        </Collapsible>

        {/* REPORTS SECTION */}
        <Collapsible open={reportsOpen} onOpenChange={setReportsOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={activeModule.startsWith('dh-r-')}
                  className={cn(
                    activeModule.startsWith('dh-r-') && 'bg-indigo-600/15 text-indigo-600',
                  )}
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Reports</span>
                  <ChevronRight className={`ml-auto h-3 w-3 transition-transform ${reportsOpen ? 'rotate-90' : ''}`} />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {REPORTS_ITEMS.map(i => (
                  <SidebarMenuItem key={i.module}>
                    <SidebarMenuButton
                      onClick={() => onModuleChange(i.module)}
                      isActive={activeModule === i.module}
                      className="pl-8"
                    >
                      <i.icon className="h-3.5 w-3.5" />
                      <span className="text-[13px]">{i.label}</span>
                      {i.badge && (
                        <Badge variant="outline" className="ml-auto text-[9px] h-4 px-1">
                          {i.badge}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </CollapsibleContent>
            </SidebarMenuItem>
          </SidebarMenu>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => window.history.back()} tooltip="Back">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate('/erp/dashboard')} tooltip="ERP Dashboard">
              <Home className="h-4 w-4" />
              <span>ERP Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default DistributorHubSidebar;
