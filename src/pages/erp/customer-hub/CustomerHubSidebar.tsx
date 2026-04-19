/**
 * CustomerHubSidebar.tsx — Teal-500 accent · MTR structure
 * Follows DistributorHubSidebar pattern exactly.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home, Heart, Users, Tag, ShoppingBag, Package, History,
  Award, Gift, Sparkles, AlertTriangle, Repeat2,
  Trophy, Mic, PackageOpen, Database, BarChart3,
  ChevronRight, ArrowLeft,
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

export type CustomerHubModule =
  | 'ch-welcome'
  // Masters (CC replicas)
  | 'ch-m-customer' | 'ch-m-segment'
  // Transactions — Sprint 13b
  | 'ch-t-catalog' | 'ch-t-cart' | 'ch-t-orders'
  | 'ch-t-rewards' | 'ch-t-voice-complaint'
  // Transactions — Sprint 13c
  | 'ch-t-family-wallet' | 'ch-t-sample-kits'
  // Reports — Sprint 13c
  | 'ch-r-loyalty' | 'ch-r-clv' | 'ch-r-churn' | 'ch-r-social-proof';

interface CustomerHubSidebarProps {
  activeModule: CustomerHubModule;
  onModuleChange: (m: CustomerHubModule) => void;
}

interface MenuItem {
  label: string;
  module: CustomerHubModule;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  fromCC?: boolean;
}

const MASTERS_ITEMS: MenuItem[] = [
  { label: 'Customer Master',   module: 'ch-m-customer', icon: Users, fromCC: true },
  { label: 'Customer Segments', module: 'ch-m-segment',  icon: Tag,   fromCC: true },
];

const TRANSACTIONS_ITEMS: MenuItem[] = [
  { label: 'Catalog',          module: 'ch-t-catalog',         icon: ShoppingBag },
  { label: 'Cart',             module: 'ch-t-cart',            icon: Package },
  { label: 'Orders',           module: 'ch-t-orders',          icon: History },
  { label: 'Loyalty Rewards',  module: 'ch-t-rewards',         icon: Gift },
  { label: 'Voice Complaint',  module: 'ch-t-voice-complaint', icon: Mic },
  { label: 'Family Wallet',    module: 'ch-t-family-wallet',   icon: Repeat2,     badge: 'Sprint 13c' },
  { label: 'Sample Kits',      module: 'ch-t-sample-kits',     icon: PackageOpen, badge: 'Sprint 13c' },
];

const REPORTS_ITEMS: MenuItem[] = [
  { label: 'Loyalty Performance',   module: 'ch-r-loyalty',      icon: Award,         badge: 'Sprint 13c' },
  { label: 'CLV Rankings',          module: 'ch-r-clv',          icon: Trophy,        badge: 'Sprint 13c' },
  { label: 'Churn Risk',            module: 'ch-r-churn',        icon: AlertTriangle, badge: 'Sprint 13c' },
  { label: 'Social Proof Dashboard',module: 'ch-r-social-proof', icon: Sparkles,      badge: 'Sprint 13c' },
];

export function CustomerHubSidebar(props: CustomerHubSidebarProps) {
  const navigate = useNavigate();
  const { activeModule, onModuleChange } = props;
  const [mastersOpen, setMastersOpen] = useState(activeModule.startsWith('ch-m-'));
  const [txOpen, setTxOpen] = useState(activeModule.startsWith('ch-t-'));
  const [reportsOpen, setReportsOpen] = useState(activeModule.startsWith('ch-r-'));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-teal-500/15">
            <Heart className="h-4 w-4 text-teal-500" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold text-foreground leading-tight">Customer Hub</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Loyalty · CLV · Cross-sell</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Welcome */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeModule === 'ch-welcome'}
              onClick={() => onModuleChange('ch-welcome')}
              className={cn(activeModule === 'ch-welcome' && 'bg-teal-500/15 text-teal-600')}
            >
              <Home className="h-4 w-4" />
              <span>Welcome</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Masters */}
        <Collapsible open={mastersOpen} onOpenChange={setMastersOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={activeModule.startsWith('ch-m-')}
                  className={cn(activeModule.startsWith('ch-m-') && 'bg-teal-500/15 text-teal-600')}
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
                      className={cn('pl-8', activeModule === i.module && 'bg-teal-500/15 text-teal-600')}
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

        {/* Transactions */}
        <Collapsible open={txOpen} onOpenChange={setTxOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={activeModule.startsWith('ch-t-')}
                  className={cn(activeModule.startsWith('ch-t-') && 'bg-teal-500/15 text-teal-600')}
                >
                  <ShoppingBag className="h-4 w-4" />
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
                      className={cn('pl-8', activeModule === i.module && 'bg-teal-500/15 text-teal-600')}
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

        {/* Reports */}
        <Collapsible open={reportsOpen} onOpenChange={setReportsOpen} className="mt-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={activeModule.startsWith('ch-r-')}
                  className={cn(activeModule.startsWith('ch-r-') && 'bg-teal-500/15 text-teal-600')}
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
                      className={cn('pl-8', activeModule === i.module && 'bg-teal-500/15 text-teal-600')}
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

export default CustomerHubSidebar;
