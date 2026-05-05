/**
 * QualiCheckSidebar.tsx — Sprint T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block E · D-326
 * Mirrors GateFlowSidebar pattern (Card #4 4-pre-1).
 */
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Home, ClipboardCheck, FileText, Beaker, ListChecks,
  ShieldCheck, Award, FileCheck, AlertTriangle, Layers,
} from 'lucide-react';
import type { QualiCheckModule } from './QualiCheckSidebar.types';

interface Group {
  label: string;
  items: { id: QualiCheckModule; label: string; icon: typeof Home }[];
}

const GROUPS: Group[] = [
  { label: 'Overview', items: [{ id: 'welcome', label: 'Welcome', icon: Home }] },
  {
    label: 'Operations',
    items: [
      { id: 'pending-inspections', label: 'Pending Inspections', icon: ClipboardCheck },
      { id: 'pending-alerts', label: 'Pending Alerts', icon: AlertTriangle },
      { id: 'closure-log', label: 'Closure Log', icon: ShieldCheck },
    ],
  },
  {
    label: 'Masters',
    items: [
      { id: 'quality-plans', label: 'Quality Plans', icon: FileText },
      { id: 'quality-specs', label: 'Quality Specs', icon: Beaker },
      { id: 'bulk-plan-assignment', label: 'Bulk Plan Assignment', icon: Layers },
    ],
  },
  {
    label: 'Reports',
    items: [
      { id: 'inspection-register', label: 'Inspection Register', icon: ListChecks },
      { id: 'vendor-scorecard', label: 'Vendor Scorecard', icon: Award },
      { id: 'coa-register', label: 'CoA Register', icon: FileCheck },
    ],
  },
];

interface Props {
  active: QualiCheckModule;
  onNavigate: (m: QualiCheckModule) => void;
}

export function QualiCheckSidebar({ active, onNavigate }: Props): JSX.Element {
  return (
    <Sidebar>
      <SidebarContent>
        {GROUPS.map(g => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map(it => (
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
