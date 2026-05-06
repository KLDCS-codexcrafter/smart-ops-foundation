/**
 * @file     ProductionSidebar.tsx
 * @sprint   T-Phase-1.3-3a-pre-1
 */
import { useState } from 'react';
import { ChevronRight, Factory, ListChecks, FileText, Layers, PackageMinus, CheckCircle, Truck, PackagePlus, ClipboardList } from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { PRODUCTION_GROUPS } from './ProductionSidebar.groups';
import type { ProductionModule } from './ProductionSidebar.types';

const ICONS: Record<ProductionModule, React.ElementType> = {
  'welcome': ListChecks,
  'tx-production-plan-entry': ClipboardList,
  'tx-production-order-entry': Factory,
  'tx-material-issue': PackageMinus,
  'tx-production-confirmation': CheckCircle,
  'tx-job-work-out': Truck,
  'tx-job-work-receipt': PackagePlus,
  'rpt-production-order-register': FileText,
  'rpt-production-plan-register': ClipboardList,
  'rpt-variance-dashboard': FileText,
  'rpt-plan-actual-rolling': FileText,
  'rpt-itc04-export': FileText,
  'rpt-wip': Layers,
};

interface Props {
  active: ProductionModule;
  onNavigate: (m: ProductionModule) => void;
}

export function ProductionSidebar({ active, onNavigate }: Props): JSX.Element {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    transactions: true, reports: true,
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-3 border-b">
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Production</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => onNavigate('welcome')}
              className={cn(active === 'welcome' && 'bg-primary/10 text-primary')}
            >
              <ListChecks className="h-4 w-4" />
              Welcome
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {PRODUCTION_GROUPS.map(group => (
          <Collapsible
            key={group.id}
            open={openGroups[group.id]}
            onOpenChange={v => setOpenGroups(s => ({ ...s, [group.id]: v }))}
          >
            <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:bg-muted/40">
              {group.label}
              <ChevronRight className={cn('h-3 w-3 transition-transform', openGroups[group.id] && 'rotate-90')} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu>
                {group.modules.map(m => {
                  const Icon = ICONS[m.id];
                  return (
                    <SidebarMenuItem key={m.id}>
                      <SidebarMenuButton
                        onClick={() => onNavigate(m.id)}
                        className={cn(active === m.id && 'bg-primary/10 text-primary')}
                      >
                        <Icon className="h-4 w-4" />
                        {m.label}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
