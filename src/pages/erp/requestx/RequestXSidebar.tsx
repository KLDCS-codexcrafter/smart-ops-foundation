/**
 * @file        RequestXSidebar.tsx
 * @sprint      T-Phase-1.2.6f-pre-1
 * @purpose     Left sidebar for RequestX hub.
 */
import { useState } from 'react';
import { ChevronRight, ClipboardList, Inbox, FileText, Building2, ListChecks } from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { REQUESTX_GROUPS } from './RequestXSidebar.groups';
import type { RequestXModule } from './RequestXSidebar.types';

const ICONS: Record<RequestXModule, React.ElementType> = {
  'welcome':                ListChecks,
  'tx-material-indent':     ClipboardList,
  'tx-service-request':     FileText,
  'tx-capital-indent':      Building2,
  'tx-approval-inbox':      Inbox,
  'rpt-indent-register':    FileText,
  'rpt-indent-pending':     FileText,
  'rpt-indent-closed':      FileText,
  'rpt-po-against-indent':  FileText,
  'rpt-department-summary': FileText,
  'rpt-category-spend':     FileText,
  'rpt-ageing-pending':     FileText,
  'master-departments':     Building2,
  'master-approval-matrix': ListChecks,
  'master-voucher-types':   FileText,
  'master-pinned-templates':FileText,
};

interface Props {
  active: RequestXModule;
  onNavigate: (m: RequestXModule) => void;
}

export function RequestXSidebar({ active, onNavigate }: Props): JSX.Element {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    transactions: true, reports: false, masters: false,
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-3 border-b">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">RequestX</span>
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

        {REQUESTX_GROUPS.map(group => (
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
