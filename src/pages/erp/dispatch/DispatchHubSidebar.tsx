/**
 * DispatchHubSidebar.tsx — Blue-600 accent · MTR structure
 * Mirrors CustomerHubSidebar pattern.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Truck, Route, ClipboardEdit,
  BarChart3, Database, ChevronRight, ArrowLeft, Send,
  TrendingUp,
  FileSpreadsheet, AlertCircle, Scale,
  FileUp, Award,
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

export type DispatchHubModule =
  | 'dh-welcome'
  | 'dh-t-lr-tracker' | 'dh-t-lr-update'
  // Sprint 15c-1
  | 'dh-t-transporter-invoice'
  | 'dh-t-dispute-queue'
  | 'dh-r-reconciliation-summary'
  // Sprint 15c-3
  | 'dh-t-pdf-invoice-upload'
  | 'dh-r-transporter-scorecard'
  | 'dh-r-savings-roi';

interface DispatchHubSidebarProps {
  activeModule: DispatchHubModule;
  onModuleChange: (m: DispatchHubModule) => void;
}

interface MenuItem {
  label: string;
  module: DispatchHubModule;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const TRANSACTIONS_ITEMS: MenuItem[] = [
  { label: 'LR Tracker',           module: 'dh-t-lr-tracker',          icon: Route },
  { label: 'LR Update',            module: 'dh-t-lr-update',           icon: ClipboardEdit },
  { label: 'Transporter Invoices', module: 'dh-t-transporter-invoice', icon: FileSpreadsheet },
  { label: 'PDF Invoice Upload',   module: 'dh-t-pdf-invoice-upload',  icon: FileUp },
  { label: 'Dispute Queue',        module: 'dh-t-dispute-queue',       icon: AlertCircle },
];

const REPORTS_ITEMS: MenuItem[] = [
  { label: 'Reconciliation Summary', module: 'dh-r-reconciliation-summary', icon: Scale },
  { label: 'Transporter Scorecard',  module: 'dh-r-transporter-scorecard',  icon: Award },
  { label: 'Savings ROI',            module: 'dh-r-savings-roi',            icon: TrendingUp },
];

export function DispatchHubSidebar(props: DispatchHubSidebarProps) {
  const navigate = useNavigate();
  const { activeModule, onModuleChange } = props;
  const [mastersOpen, setMastersOpen] = useState(activeModule.startsWith('dh-m-'));
  const [txOpen, setTxOpen] = useState(activeModule.startsWith('dh-t-'));
  const [reportsOpen, setReportsOpen] = useState(activeModule.startsWith('dh-r-'));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500/15">
            <Send className="h-4 w-4 text-blue-600" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold text-foreground leading-tight">Dispatch Hub</p>
            <p className="text-[10px] text-muted-foreground leading-tight">LR · POD · Packing</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Welcome */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeModule === 'dh-welcome'}
              onClick={() => onModuleChange('dh-welcome')}
              className={cn(activeModule === 'dh-welcome' && 'bg-blue-500/15 text-blue-600')}
            >
              <Home className="h-4 w-4" />
              <span>Welcome</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Masters (external link to Command Center) */}
        <Collapsible open={mastersOpen} onOpenChange={setMastersOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton>
                  <Database className="h-4 w-4" />
                  <span>Masters</span>
                  <Badge variant="outline" className="ml-auto text-[9px] h-4 px-1">CC</Badge>
                  <ChevronRight className={`h-3 w-3 transition-transform ${mastersOpen ? 'rotate-90' : ''}`} />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/erp/masters/logistic')}
                    className="pl-8"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span className="text-[13px]">Transporter Master</span>
                    <Badge variant="outline" className="ml-auto text-[9px] h-4 px-1">CC</Badge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </CollapsibleContent>
            </SidebarMenuItem>
          </SidebarMenu>
        </Collapsible>

        {/* Transactions */}
        <Collapsible open={txOpen} onOpenChange={setTxOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={activeModule.startsWith('dh-t-')}
                  className={cn(activeModule.startsWith('dh-t-') && 'bg-blue-500/15 text-blue-600')}
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
                      className={cn('pl-8', activeModule === i.module && 'bg-blue-500/15 text-blue-600')}
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
                  isActive={activeModule.startsWith('dh-r-')}
                  className={cn(activeModule.startsWith('dh-r-') && 'bg-blue-500/15 text-blue-600')}
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
                      className={cn('pl-8', activeModule === i.module && 'bg-blue-500/15 text-blue-600')}
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

export default DispatchHubSidebar;
