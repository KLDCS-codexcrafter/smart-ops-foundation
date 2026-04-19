/**
 * ERPSidebar.tsx — Tenant-facing sidebar for /erp/* pages
 * Sprint 11a patch. Renders apps from applications.ts grouped by category.
 *
 * This is the TENANT sidebar. It must never show KLDCS-internal surfaces
 * (Control Tower, Bridge Console, Partner Panel, Customer Panel).
 */
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  applications,
  ALL_CATEGORIES,
  type AppCategory,
  type AppDefinition,
} from '@/components/operix-core/applications';
import {
  LayoutDashboard, ShoppingCart, Package, CheckSquare, DoorOpen, Factory,
  Wrench, ClipboardList, TrendingUp, Store, Heart, Calculator, Wallet,
  Users, Building2, Headphones, BarChart3, Zap,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, ShoppingCart, Package, CheckSquare, DoorOpen, Factory,
  Wrench, ClipboardList, TrendingUp, Store, Heart, Calculator, Wallet,
  Users, Building2, Headphones, BarChart3,
};

export function ERPSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  const groups = ALL_CATEGORIES.map(cat => ({
    label: cat,
    items: applications.filter(a => a.category === cat),
  })).filter(g => g.items.length > 0);

  const renderItem = (app: AppDefinition) => {
    const Icon = ICON_MAP[app.icon] ?? Package;
    const isComingSoon = app.status === 'coming_soon';
    const isPlaceholder = app.route === '#' || isComingSoon;
    const active = !isPlaceholder && location.pathname.startsWith(app.route);

    if (isPlaceholder) {
      return (
        <SidebarMenuItem key={app.id}>
          <SidebarMenuButton asChild>
            <div
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm cursor-not-allowed',
                'text-muted-foreground/50',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{app.name}</span>
                  <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0 border-muted-foreground/30">
                    Soon
                  </Badge>
                </>
              )}
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={app.id}>
        <SidebarMenuButton asChild>
          <NavLink
            to={app.route}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
              active
                ? 'bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-600/30'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', active && 'text-indigo-600 dark:text-indigo-400')} />
            {!collapsed && <span className="truncate">{app.name}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-4">
        <NavLink to="/erp/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/15">
            <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <p className="text-sm font-semibold text-foreground tracking-tight">Operix ERP</p>
              <p className="text-[10px] text-muted-foreground">Tenant Workspace</p>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <Separator className="mx-4 w-auto bg-sidebar-border" />

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/erp/dashboard"
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
                      location.pathname === '/erp/dashboard' || location.pathname === '/erp'
                        ? 'bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-600/30'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Dashboard</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {groups.map(group => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60 px-3">
              {!collapsed && group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground/50 text-center">
            Operix ERP · Sprint 11a
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export default ERPSidebar;
