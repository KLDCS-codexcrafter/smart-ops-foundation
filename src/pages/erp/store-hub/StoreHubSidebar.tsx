/**
 * StoreHubSidebar.tsx — Card #7 Block E · D-380
 * Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1
 *
 * Module-based sidebar matching DispatchHubSidebar (Card #4/#6) pattern.
 * 6 modules: 3 reports (sh-r-*) + 3 transactions (sh-t-*).
 * Indigo-500 accent (Stores theme).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Warehouse, BarChart3, ChevronRight, ArrowLeft,
  Boxes, Layers, TrendingUp, Package, ClipboardCheck, ArrowDown,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type StoreHubModule =
  | 'sh-welcome'
  // Reports (existing 3 panels preserved as modules · D-298)
  | 'sh-r-stock-check'
  | 'sh-r-reorder-suggestions'
  | 'sh-r-demand-forecast'
  // Transactions (NEW · Card #7 · D-381 + D-382)
  | 'sh-t-stock-issue-entry'
  | 'sh-t-stock-issue-register'
  | 'sh-t-receipt-ack';

interface StoreHubSidebarProps {
  activeModule: StoreHubModule;
  onModuleChange: (m: StoreHubModule) => void;
}

interface MenuItem {
  label: string;
  module: StoreHubModule;
  icon: React.ComponentType<{ className?: string }>;
}

const REPORTS_ITEMS: MenuItem[] = [
  { label: 'Stock Check',         module: 'sh-r-stock-check',         icon: Boxes },
  { label: 'Reorder Suggestions', module: 'sh-r-reorder-suggestions', icon: Layers },
  { label: 'Demand Forecast',     module: 'sh-r-demand-forecast',     icon: TrendingUp },
];

const TRANSACTIONS_ITEMS: MenuItem[] = [
  { label: 'Stock Issue Entry',    module: 'sh-t-stock-issue-entry',    icon: Package },
  { label: 'Stock Issue Register', module: 'sh-t-stock-issue-register', icon: ArrowDown },
  { label: 'Receipt Ack',          module: 'sh-t-receipt-ack',          icon: ClipboardCheck },
];

export function StoreHubSidebar(props: StoreHubSidebarProps) {
  const navigate = useNavigate();
  const { activeModule, onModuleChange } = props;
  const [reportsOpen, setReportsOpen] = useState(activeModule.startsWith('sh-r-'));
  const [txOpen, setTxOpen] = useState(activeModule.startsWith('sh-t-'));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-indigo-500/15">
            <Warehouse className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold text-foreground leading-tight">Store Hub</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Issue · Receipt · Reorder</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Welcome */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeModule === 'sh-welcome'}
              onClick={() => onModuleChange('sh-welcome')}
              className={cn(activeModule === 'sh-welcome' && 'bg-indigo-500/15 text-indigo-600')}
            >
              <Home className="h-4 w-4" />
              <span>Welcome</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Transactions */}
        <Collapsible open={txOpen} onOpenChange={setTxOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={activeModule.startsWith('sh-t-')}
                  className={cn(activeModule.startsWith('sh-t-') && 'bg-indigo-500/15 text-indigo-600')}
                >
                  <Package className="h-4 w-4" />
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
                      className={cn('pl-8', activeModule === i.module && 'bg-indigo-500/15 text-indigo-600')}
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

        {/* Reports */}
        <Collapsible open={reportsOpen} onOpenChange={setReportsOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={activeModule.startsWith('sh-r-')}
                  className={cn(activeModule.startsWith('sh-r-') && 'bg-indigo-500/15 text-indigo-600')}
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
                      className={cn('pl-8', activeModule === i.module && 'bg-indigo-500/15 text-indigo-600')}
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

export default StoreHubSidebar;
