/**
 * @file     PayOutSidebar.tsx
 * @purpose  PayOut left sidebar — Dashboard · Vendor Payment · Payment Register +
 *           B.3-B.7 stubs marked "Coming in B.x".
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.2-Foundation (Group B Sprint B.2)
 * @sprint   T-T8.2-Foundation
 * @whom     PayOutPage container
 * @consumers Routes /erp/payout/*
 *
 * Mirrors FineCoreSidebar.tsx pattern · violet color scheme matches PayOut card.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Wallet, ClipboardList, Receipt, FileText,
  AlertTriangle, BarChart3, Zap,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PayOutMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  route?: string;
  comingSoon?: string;
}

const PAYOUT_MENU: PayOutMenuItem[] = [
  { id: 'po-dashboard',         label: 'Dashboard',           icon: LayoutDashboard, route: '/erp/payout/dashboard' },
  { id: 'po-vendor-payment',    label: 'Vendor Payment',      icon: Wallet,          route: '/erp/payout/vendor-payment' },
  { id: 'po-payment-register',  label: 'Payment Register',    icon: ClipboardList,   route: '/erp/payout/payment-register' },
  // [T-T8.3-AdvanceIntel] Bill Settlement · post-hoc advance allocation · ACTIVATED
  { id: 'po-bill-settlement',   label: 'Bill Settlement',     icon: Receipt,         route: '/erp/payout/bill-settlement' },
  // [T-T8.4-Requisition-Universal] Universal Payment Requisition · ACTIVATED
  { id: 'po-requisition',       label: 'Payment Requisition', icon: FileText,        route: '/erp/payout/requisition' },
  { id: 'po-requisition-inbox', label: 'Requisition Inbox',   icon: FileText,        route: '/erp/payout/requisition-inbox' },
  { id: 'po-requisition-hist',  label: 'Requisition History', icon: FileText,        route: '/erp/payout/requisition-history' },
  // [T-T8.5-MSME-Compliance] MSME 43B(h) compliance · ACTIVATED
  { id: 'po-msme',              label: 'MSME Compliance',     icon: AlertTriangle,   route: '/erp/payout/msme-alerts' },
  // [B.6 stub] 5-tier Vendor Analytics
  { id: 'po-vendor-analytics',  label: 'Vendor Analytics',    icon: BarChart3,       comingSoon: 'B.6' },
  // [B.7 stub] Bulk Pay · maker-checker · Smart AP
  { id: 'po-smart-ap',          label: 'Smart AP',            icon: Zap,             comingSoon: 'B.7' },
];

export function PayOutSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/50">
        <div className="h-1 w-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 mb-3" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Wallet className="h-4 w-4 text-violet-500" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="font-bold text-sm">PayOut</p>
            <p className="text-[10px] text-muted-foreground">Vendor Payments & AP</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarMenu className="px-2 space-y-0.5">
          {PAYOUT_MENU.map(item => {
            const live = !item.comingSoon && !!item.route;
            const isActive = live && currentPath === item.route;
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  tooltip={item.comingSoon ? `Coming in Sprint ${item.comingSoon}` : item.label}
                  onClick={() => live && item.route && navigate(item.route)}
                  className={cn(
                    'text-xs h-8 gap-2 transition-all',
                    isActive && 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30',
                    !live && 'opacity-50 cursor-not-allowed',
                    live && !isActive && 'hover:bg-violet-500/10 cursor-pointer',
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate flex-1">{item.label}</span>
                  {item.comingSoon && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-muted-foreground/30 text-muted-foreground/60 shrink-0">
                      {item.comingSoon}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="h-6 w-6 rounded bg-violet-500/15 flex items-center justify-center flex-shrink-0">
            <Wallet className="h-3 w-3 text-violet-500" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] font-semibold leading-tight">
              <span style={{ color: 'hsl(24 95% 53%)' }}>Made</span>{' '}
              <span className="text-foreground">in</span>{' '}
              <span style={{ color: 'hsl(145 63% 42%)' }}>India</span>
            </p>
            <p className="text-[9px] text-muted-foreground/60 leading-tight">PayOut · B.2</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default PayOutSidebar;
