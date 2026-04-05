import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Building2, Terminal, ChevronDown, Cpu,
  ShoppingCart, Package, CheckSquare, DoorOpen, Factory,
  Wrench, ClipboardList, TrendingUp, Landmark, Users,
  Headphones, BarChart3,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarHeader, SidebarFooter, SidebarSeparator,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { CommandCenterModule } from "../pages/CommandCenterPage";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, ShoppingCart, Package, CheckSquare, DoorOpen,
  Factory, Wrench, ClipboardList, TrendingUp, Landmark, Users,
  Building2, Headphones, BarChart3,
};

const MODULE_ITEMS: { id: CommandCenterModule; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "core", label: "Foundation & Core", icon: Building2 },
  { id: "console", label: "Security Console", icon: Terminal },
];

const QUICK_SWITCH_APPS = [
  { id: "procure360", name: "Procure360", icon: "ShoppingCart", route: "/erp/procure-hub" },
  { id: "inventory-hub", name: "Inventory Hub", icon: "Package", route: "/erp/inventory-hub" },
  { id: "qulicheak", name: "Qulicheak", icon: "CheckSquare", route: "/erp/qulicheak" },
  { id: "gateflow", name: "GateFlow", icon: "DoorOpen", route: "/erp/gateflow" },
  { id: "production", name: "Production", icon: "Factory", route: "/erp/production" },
  { id: "maintainpro", name: "MaintainPro", icon: "Wrench", route: "/erp/maintainpro" },
  { id: "requestx", name: "RequestX", icon: "ClipboardList", route: "/erp/requestx" },
  { id: "salesx", name: "SalesX Hub", icon: "TrendingUp", route: "/erp/salesx" },
  { id: "finecore", name: "FineCore", icon: "Landmark", route: "/erp/finecore" },
  { id: "peoplepay", name: "PeoplePay", icon: "Users", route: "/erp/peoplepay" },
  { id: "backoffice", name: "Back Office Pro", icon: "Building2", route: "/erp/backoffice" },
  { id: "servicedesk", name: "ServiceDesk", icon: "Headphones", route: "/erp/servicedesk" },
  { id: "insightx", name: "InsightX", icon: "BarChart3", route: "/erp/insightx" },
];

interface CommandCenterSidebarProps {
  activeModule: CommandCenterModule;
  onModuleChange: (module: CommandCenterModule) => void;
}

export function CommandCenterSidebar({ activeModule, onModuleChange }: CommandCenterSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [appsOpen, setAppsOpen] = useState(true);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Cpu className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-bold text-foreground leading-tight">4DSmartOps</p>
            <p className="text-[10px] text-muted-foreground leading-tight">Command Center</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MODULE_ITEMS.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeModule === item.id}
                    onClick={() => onModuleChange(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <Collapsible open={appsOpen} onOpenChange={setAppsOpen}>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:text-foreground transition-colors flex items-center">
                <span className="flex-1">Quick Switch</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !appsOpen && "-rotate-90")} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {QUICK_SWITCH_APPS.map((app) => {
                    const Icon = ICON_MAP[app.icon] ?? LayoutDashboard;
                    const isActive = location.pathname === app.route;
                    return (
                      <SidebarMenuItem key={app.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => navigate(app.route)}
                          tooltip={app.name}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="truncate">{app.name}</span>
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] font-semibold leading-tight">
              <span style={{ color: "hsl(24 95% 53%)" }}>Made</span>{" "}
              <span className="text-foreground">in</span>{" "}
              <span style={{ color: "hsl(145 63% 42%)" }}>India</span>
            </p>
            <p className="text-[9px] text-muted-foreground/60 leading-tight">4DSmartOps v0.1.0</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
