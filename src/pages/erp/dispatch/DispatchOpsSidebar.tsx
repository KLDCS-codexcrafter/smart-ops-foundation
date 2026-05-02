/**
 * DispatchOpsSidebar.tsx — Orange-500 accent · Dispatch Hub (internal ops)
 * Sprint T-Phase-1.1.1p-v2.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Truck, ChevronRight, ArrowLeft, BarChart3, Database,
  Package, ListChecks, TrendingUp, Users, AlertTriangle, Printer,
  PackageCheck, ArrowUpRight, GitMerge, Route,
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

export type DispatchOpsModule =
  | 'dops-welcome'
  | 'dops-t-delivery-memo'
  | 'dops-t-sample-outward-issue'
  | 'dops-t-demo-outward-issue'
  | 'dops-t-packing-slip'
  | 'dops-t-exceptions'
  | 'dops-m-packing-material'
  | 'dops-m-packing-bom'
  | 'dops-r-outward-movement'
  | 'dops-r-packing-consumption'
  | 'dops-r-packer-performance'
  | 'dops-r-dispatch-summary'
  | 'dops-r-delivery-memo-register'
  | 'dops-link-som-register'
  | 'dops-link-dom-register';

interface DispatchOpsSidebarProps {
  activeModule: DispatchOpsModule;
  onModuleChange: (m: DispatchOpsModule) => void;
}

interface MenuItem {
  label: string;
  module: DispatchOpsModule;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const TRANSACTIONS_ITEMS: MenuItem[] = [
  { label: 'Delivery Memo',         module: 'dops-t-delivery-memo',        icon: Truck },
  { label: 'Sample Outward Issue',  module: 'dops-t-sample-outward-issue', icon: ArrowUpRight },
  { label: 'Demo Outward Issue',    module: 'dops-t-demo-outward-issue',   icon: ArrowUpRight },
  { label: 'Packing Slip Print',    module: 'dops-t-packing-slip',         icon: Printer },
  { label: 'Dispatch Exceptions',   module: 'dops-t-exceptions',           icon: AlertTriangle },
];

const MASTERS_ITEMS: MenuItem[] = [
  { label: 'Packing Materials', module: 'dops-m-packing-material', icon: Package },
  { label: 'Packing BOM',       module: 'dops-m-packing-bom',      icon: ListChecks },
];

const REPORTS_ITEMS: MenuItem[] = [
  { label: 'Delivery Memo Register', module: 'dops-r-delivery-memo-register', icon: Truck },
  { label: 'Outward Movement Report', module: 'dops-r-outward-movement',     icon: GitMerge },
  { label: 'Packing Consumption',     module: 'dops-r-packing-consumption',  icon: TrendingUp },
  { label: 'Packer Performance',      module: 'dops-r-packer-performance',   icon: Users },
  { label: 'Dispatch Summary',        module: 'dops-r-dispatch-summary',     icon: BarChart3, badge: 'Soon' },
  { label: 'SOM Register (SalesX) ↗', module: 'dops-link-som-register',      icon: ArrowUpRight },
  { label: 'DOM Register (SalesX) ↗', module: 'dops-link-dom-register',      icon: ArrowUpRight },
];

export function DispatchOpsSidebar(props: DispatchOpsSidebarProps) {
  const navigate = useNavigate();
  const { activeModule, onModuleChange } = props;
  const [mastersOpen, setMastersOpen] = useState(activeModule.startsWith('dops-m-'));
  const [txOpen, setTxOpen] = useState(activeModule.startsWith('dops-t-'));
  const [reportsOpen, setReportsOpen] = useState(activeModule.startsWith('dops-r-'));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-orange-500/15">
            <PackageCheck className="h-4 w-4 text-orange-500" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold text-foreground leading-tight">Dispatch Hub</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Inward · Outward · Packing</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeModule === 'dops-welcome'}
              onClick={() => onModuleChange('dops-welcome')}
              className={cn(activeModule === 'dops-welcome' && 'bg-orange-500/15 text-orange-500')}
            >
              <Home className="h-4 w-4" />
              <span>Welcome</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <Collapsible open={mastersOpen} onOpenChange={setMastersOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton>
                  <Database className="h-4 w-4" />
                  <span>Masters</span>
                  <ChevronRight className={`ml-auto h-3 w-3 transition-transform ${mastersOpen ? 'rotate-90' : ''}`} />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {MASTERS_ITEMS.map(i => (
                  <SidebarMenuItem key={i.module}>
                    <SidebarMenuButton
                      onClick={() => onModuleChange(i.module)}
                      isActive={activeModule === i.module}
                      className={cn('pl-8', activeModule === i.module && 'bg-orange-500/15 text-orange-500')}
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

        <Collapsible open={txOpen} onOpenChange={setTxOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={activeModule.startsWith('dops-t-')}
                  className={cn(activeModule.startsWith('dops-t-') && 'bg-orange-500/15 text-orange-500')}
                >
                  <Route className="h-4 w-4" />
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
                      className={cn('pl-8', activeModule === i.module && 'bg-orange-500/15 text-orange-500')}
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

        <Collapsible open={reportsOpen} onOpenChange={setReportsOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={activeModule.startsWith('dops-r-')}
                  className={cn(activeModule.startsWith('dops-r-') && 'bg-orange-500/15 text-orange-500')}
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
                      className={cn('pl-8', activeModule === i.module && 'bg-orange-500/15 text-orange-500')}
                    >
                      <i.icon className="h-3.5 w-3.5" />
                      <span className="text-[13px]">{i.label}</span>
                      {i.badge && <Badge variant="outline" className="ml-auto text-[9px] h-4 px-1">{i.badge}</Badge>}
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

export default DispatchOpsSidebar;
