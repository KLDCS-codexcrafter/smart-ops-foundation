/**
 * SupplyXSidebar.tsx — Sprint T-Phase-1.2.6f-b-2-fix-2 · Block O · D-282
 * Hand-rolled sidebar (pre-Shell) · Procure360 has migrated to canonical Shell in A.3.a · read-only navigation · SupplyX scheduled for Shell migration in a later sprint.
 */
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Home, Send, FileText, Award } from 'lucide-react';
import type { SupplyXModule } from './SupplyXSidebar.types';

interface Group {
  label: string;
  items: { id: SupplyXModule; label: string; icon: typeof Home }[];
}

const GROUPS: Group[] = [
  {
    label: 'Overview',
    items: [{ id: 'welcome', label: 'Welcome', icon: Home }],
  },
  {
    label: 'Internal Procurement',
    items: [
      { id: 'open-rfqs', label: 'Open RFQs', icon: Send },
      { id: 'pending-quotations', label: 'Pending Quotations', icon: FileText },
      { id: 'pending-awards', label: 'Pending Awards', icon: Award },
    ],
  },
];

interface Props {
  active: SupplyXModule;
  onNavigate: (m: SupplyXModule) => void;
}

export function SupplyXSidebar({ active, onNavigate }: Props): JSX.Element {
  return (
    <Sidebar>
      <SidebarContent>
        {GROUPS.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((it) => (
                  <SidebarMenuItem key={it.id}>
                    <SidebarMenuButton
                      isActive={active === it.id}
                      onClick={() => onNavigate(it.id)}
                    >
                      <it.icon className="h-4 w-4" />
                      <span>{it.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
