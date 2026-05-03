/**
 * Procure360Sidebar.tsx — Sprint T-Phase-1.2.6f-a
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
import {
  Home, FileText, Send, BarChart3, Award, TrendingUp, Users, Activity, ListChecks,
  ShoppingCart, Truck, PackageCheck, Clock,
} from 'lucide-react';
import type { Procure360Module } from './Procure360Sidebar.types';

interface Group {
  label: string;
  items: { id: Procure360Module; label: string; icon: typeof Home }[];
}

const GROUPS: Group[] = [
  {
    label: 'Overview',
    items: [{ id: 'welcome', label: 'Welcome', icon: Home }],
  },
  {
    label: 'Transactions',
    items: [
      { id: 'enquiry-entry', label: 'New Enquiry', icon: FileText },
      { id: 'enquiry-list', label: 'Enquiry List', icon: ListChecks },
      { id: 'rfq-list', label: 'RFQ List', icon: Send },
      { id: 'quotation-comparison', label: 'Compare Quotations', icon: BarChart3 },
      { id: 'award-history', label: 'Awards', icon: Award },
    ],
  },
  // Sprint T-Phase-1.2.6f-c-1 · Block G · Purchase Orders + GIT groups
  {
    label: 'Purchase Orders',
    items: [
      { id: 'po-list', label: 'PO List', icon: ShoppingCart },
      { id: 'po-followup-register', label: 'PO Followup Register', icon: Activity },
    ],
  },
  {
    label: 'Goods in Transit',
    items: [
      { id: 'git-in-transit', label: 'In Transit', icon: Truck },
      { id: 'git-received', label: 'Received at Gate', icon: PackageCheck },
      { id: 'aged-git-procure', label: 'Aged GIT (Procure View)', icon: Clock },
    ],
  },
  {
    label: 'Reports',
    items: [
      { id: 'rfq-register-report', label: 'RFQ Register', icon: ListChecks },
      { id: 'pending-rfq-report', label: 'Pending RFQs', icon: Activity },
      { id: 'comparison-report', label: 'Quotation Comparison', icon: BarChart3 },
      { id: 'award-history-report', label: 'Award History', icon: Award },
      { id: 'vendor-perf-report', label: 'Vendor Performance', icon: TrendingUp },
      { id: 'best-price-report', label: 'Best Price Analysis', icon: TrendingUp },
      { id: 'spend-by-vendor-report', label: 'Spend by Vendor', icon: BarChart3 },
      { id: 'rfq-followup-register-report', label: 'Follow-up Register', icon: Activity },
      { id: 'cross-dept-procurement-handoff', label: 'Cross-Dept Handoff', icon: Users },
    ],
  },
  {
    label: 'Vendor Scoring',
    items: [{ id: 'vendor-scoring-dashboard', label: 'Scoring Dashboard', icon: TrendingUp }],
  },
];

interface Props {
  active: Procure360Module;
  onNavigate: (m: Procure360Module) => void;
}

export function Procure360Sidebar({ active, onNavigate }: Props): JSX.Element {
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
