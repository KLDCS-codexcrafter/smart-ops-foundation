/**
 * BillPassingSidebar.tsx — Sprint T-Phase-1.2.6f-c-2 · Block B
 * Mirrors Procure360Sidebar pattern.
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
import { Home, Inbox, AlertTriangle, CheckCircle2, FileText, FileSignature } from 'lucide-react';
import type { BillPassingModule } from './BillPassingSidebar.types';

interface Group {
  label: string;
  items: { id: BillPassingModule; label: string; icon: typeof Home }[];
}

const GROUPS: Group[] = [
  {
    label: 'Overview',
    items: [{ id: 'welcome', label: 'Welcome', icon: Home }],
  },
  {
    label: 'Bill Passing',
    items: [
      { id: 'pending-bills', label: 'Pending Bills', icon: Inbox },
      { id: 'match-review', label: 'Match Review', icon: AlertTriangle },
      { id: 'approved-for-fcpi', label: 'Approved for FCPI', icon: CheckCircle2 },
    ],
  },
  {
    label: 'Reports',
    items: [
      { id: 'bill-passing-register', label: 'Bill Passing Register', icon: FileText },
    ],
  },
  {
    label: 'Rate Contracts',
    items: [
      { id: 'rate-contract-list', label: 'Rate Contracts', icon: FileSignature },
    ],
  },
];

interface Props {
  active: BillPassingModule;
  onNavigate: (m: BillPassingModule) => void;
}

export function BillPassingSidebar({ active, onNavigate }: Props): JSX.Element {
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
