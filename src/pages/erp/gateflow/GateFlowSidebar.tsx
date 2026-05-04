/**
 * GateFlowSidebar.tsx — Sprint T-Phase-1.2.6f-d-2-card4-4-pre-1 · Block D
 * Mirrors BillPassingSidebar pattern (FR-58 · D-250).
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
import { Home, LogIn, LogOut, FileText, Truck, IdCard, UserCheck, Weight } from 'lucide-react';
import type { GateFlowModule } from './GateFlowSidebar.types';

interface Group {
  label: string;
  items: { id: GateFlowModule; label: string; icon: typeof Home }[];
}

const GROUPS: Group[] = [
  {
    label: 'Overview',
    items: [{ id: 'welcome', label: 'Welcome', icon: Home }],
  },
  {
    label: 'Gate Operations',
    items: [
      { id: 'gate-inward-queue', label: 'Inward Queue', icon: LogIn },
      { id: 'gate-outward-queue', label: 'Outward Queue', icon: LogOut },
    ],
  },
  // Sprint 4-pre-2 · Block H · NEW
  {
    label: 'Vehicle Operations',
    items: [
      { id: 'vehicle-inward', label: 'Vehicle Inward', icon: Truck },
      { id: 'vehicle-outward', label: 'Vehicle Outward', icon: Truck },
    ],
  },
  {
    label: 'Masters',
    items: [
      { id: 'vehicle-master', label: 'Vehicle Master', icon: IdCard },
      { id: 'driver-master', label: 'Driver Master', icon: UserCheck },
    ],
  },
  {
    label: 'Reports',
    items: [
      { id: 'gate-pass-register', label: 'Gate Pass Register', icon: FileText },
      { id: 'weighbridge-register', label: 'Weighbridge Tickets', icon: Weight },
    ],
  },
];

interface Props {
  active: GateFlowModule;
  onNavigate: (m: GateFlowModule) => void;
}

export function GateFlowSidebar({ active, onNavigate }: Props): JSX.Element {
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
