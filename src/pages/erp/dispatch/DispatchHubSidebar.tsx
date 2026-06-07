/**
 * DispatchHubSidebar.tsx — Blue-600 accent · MTR structure
 * Mirrors CustomerHubSidebar pattern.
 *
 * @sprint   HK-6.T1 · §18 closure · FR-93 (CANDIDATE) doctrine codified
 * @pattern  21 of 26 dispatch files use the inline ls<T>() helper · all FR-26 entity-scoped ·
 *           all engine-side compliant per FR-93. See audit_workspace/HK_6_T1_close_evidence/
 *           FR_93_CANDIDATE_ls_helper_doctrine.md
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Truck, Route, ClipboardEdit,
  BarChart3, Database, ChevronRight, ArrowLeft, Send,
  TrendingUp,
  FileSpreadsheet, AlertCircle, Scale,
  FileUp, Award,
  // Sprint 6-pre-1 · Card #6 Inward Logistic
  PackageOpen, ShieldAlert, Undo2, Inbox,
  // Sprint 6-pre-2 · D-362
  PackageX,
  // UPRA-1 Phase A
  PackageCheck, ClipboardList, FileCheck2,
  // UPRA-3 Phase A Step 2
  Receipt,
  // Sprint WMS1 · Warehouse · Pick & Pack
  Boxes, PackageSearch,

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
  | 'dh-r-savings-roi'
  // Sprint 6-pre-1 · Card #6 Inward Logistic FOUNDATION
  | 'dh-i-inward-receipt-entry'
  | 'dh-i-inward-receipt-register'
  | 'dh-i-quarantine-queue'
  | 'dh-i-vendor-return'
  // Sprint 6-pre-2 · D-362
  | 'dh-i-stock-hold-report'
  // UPRA-1 Phase A
  | 'dh-r-dispatch-receipt-register'
  | 'dh-r-packing-slip-register'
  | 'dh-r-pod-register'
  // UPRA-3 Phase A Step 2 · Tier-1 NEW
  | 'dh-r-transporter-invoice-register'
  // Sprint 46 Pass 1 · Theme A §1.4 · Inward EWB Monitor (re-scoped per Q1=A1)
  | 'dh-r-ewb-monitor'
  // Sprint WMS1 · Warehouse · Pick & Pack (additive registration · §H allowlist)
  | 'dh-w-picking-console'
  | 'dh-w-packing-console';


interface DispatchHubSidebarProps {
  activeModule: DispatchHubModule;
  onModuleChange: (m: DispatchHubModule) => void;
}

interface MenuItem {
  label: string;
  module: DispatchHubModule;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  /** Sprint HK-6 Pass 2 · Theme 6 · FR-74 dispatch keyboard namespace · 'l' prefix for Logistics Hub */
  keyboard?: string;
}

const TRANSACTIONS_ITEMS: MenuItem[] = [
  { label: 'LR Tracker',           module: 'dh-t-lr-tracker',          icon: Route,           keyboard: 'l t' },
  { label: 'LR Update',            module: 'dh-t-lr-update',           icon: ClipboardEdit,   keyboard: 'l u' },
  { label: 'Transporter Invoices', module: 'dh-t-transporter-invoice', icon: FileSpreadsheet, keyboard: 'l i' },
  { label: 'PDF Invoice Upload',   module: 'dh-t-pdf-invoice-upload',  icon: FileUp,          keyboard: 'l p' },
  { label: 'Dispute Queue',        module: 'dh-t-dispute-queue',       icon: AlertCircle,     keyboard: 'l q' },
];

const REPORTS_ITEMS: MenuItem[] = [
  { label: 'Reconciliation Summary', module: 'dh-r-reconciliation-summary', icon: Scale,         keyboard: 'l r s' },
  { label: 'Transporter Scorecard',  module: 'dh-r-transporter-scorecard',  icon: Award,         keyboard: 'l r c' },
  { label: 'Savings ROI',            module: 'dh-r-savings-roi',            icon: TrendingUp,    keyboard: 'l r o' },
  { label: 'Dispatch Receipt Register', module: 'dh-r-dispatch-receipt-register', icon: PackageCheck, keyboard: 'l r d' },
  { label: 'Packing Slip Register',     module: 'dh-r-packing-slip-register',     icon: ClipboardList, keyboard: 'l r k' },
  { label: 'POD Register',              module: 'dh-r-pod-register',              icon: FileCheck2,    keyboard: 'l r p' },
  { label: 'Transporter Invoice Register', module: 'dh-r-transporter-invoice-register', icon: Receipt, keyboard: 'l r i' },
  { label: 'EWB Monitor',                  module: 'dh-r-ewb-monitor',                  icon: ShieldAlert, keyboard: 'l r e' },
];

// Sprint WMS1 · Warehouse · Pick & Pack
const WAREHOUSE_ITEMS: MenuItem[] = [
  { label: 'Picking Console', module: 'dh-w-picking-console', icon: PackageSearch, keyboard: 'l w p' },
  { label: 'Packing Console', module: 'dh-w-packing-console', icon: Boxes,         keyboard: 'l w k' },
];

// Sprint 6-pre-1 · Card #6 Inward Logistic FOUNDATION
const INWARD_ITEMS: MenuItem[] = [
  { label: 'Inward Receipt Entry',    module: 'dh-i-inward-receipt-entry',    icon: PackageOpen,  keyboard: 'l i e' },
  { label: 'Inward Receipt Register', module: 'dh-i-inward-receipt-register', icon: Inbox,        keyboard: 'l i r' },
  { label: 'Quarantine Queue',        module: 'dh-i-quarantine-queue',        icon: ShieldAlert,  keyboard: 'l i q' },
  { label: 'Stock Hold Report',       module: 'dh-i-stock-hold-report',       icon: PackageX,     keyboard: 'l i h' },
  { label: 'Vendor Return',           module: 'dh-i-vendor-return',           icon: Undo2,        keyboard: 'l i v' },
];

export function DispatchHubSidebar(props: DispatchHubSidebarProps) {
  const navigate = useNavigate();
  const { activeModule, onModuleChange } = props;
  const [mastersOpen, setMastersOpen] = useState(activeModule.startsWith('dh-m-'));
  const [txOpen, setTxOpen] = useState(activeModule.startsWith('dh-t-'));
  const [reportsOpen, setReportsOpen] = useState(activeModule.startsWith('dh-r-'));
  const [inwardOpen, setInwardOpen] = useState(activeModule.startsWith('dh-i-'));
  const [warehouseOpen, setWarehouseOpen] = useState(activeModule.startsWith('dh-w-'));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-500/15">
            <Send className="h-4 w-4 text-blue-600" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold text-foreground leading-tight">Logistics Hub</p>
            <p className="text-[10px] text-muted-foreground leading-tight">LR · POD · Transporter</p>
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

        {/* Inward (Sprint 6-pre-1 · Card #6) */}
        <Collapsible open={inwardOpen} onOpenChange={setInwardOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={activeModule.startsWith('dh-i-')}
                  className={cn(activeModule.startsWith('dh-i-') && 'bg-blue-500/15 text-blue-600')}
                >
                  <PackageOpen className="h-4 w-4" />
                  <span>Inward</span>
                  <ChevronRight className={`ml-auto h-3 w-3 transition-transform ${inwardOpen ? 'rotate-90' : ''}`} />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {INWARD_ITEMS.map(i => (
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
