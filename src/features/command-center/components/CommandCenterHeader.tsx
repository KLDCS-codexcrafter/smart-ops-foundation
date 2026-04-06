import { useNavigate } from "react-router-dom";
import {
  Grid3X3, RefreshCw, Sparkles, Home, ChevronRight, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserProfileDropdown } from "@/components/auth/UserProfileDropdown";
import { ThemeToggle } from "@/components/theme";
import { useDishani } from "@/components/ask-dishani";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { CommandCenterModule } from "../pages/CommandCenterPage";

const MODULE_LABELS: Record<CommandCenterModule, string> = {
  overview: "Overview",
  core: "Foundation & Core",
  console: "Security Console",
};

function getFY(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  return `FY ${String(startYear).slice(2)}-${String(endYear).slice(2)}`;
}

interface CommandCenterHeaderProps {
  activeModule: CommandCenterModule;
  onModuleChange: (module: CommandCenterModule) => void;
}

export function CommandCenterHeader({ activeModule, onModuleChange }: CommandCenterHeaderProps) {
  const navigate = useNavigate();
  const { openDishani } = useDishani();

  return (
    <div className="border-b border-border bg-card/60 backdrop-blur-xl flex-shrink-0">
      {/* Row 1 */}
      <div className="flex items-center gap-3 px-4 h-14">
        <SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground" />

        {/* Center */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Module selector */}
          <Select value={activeModule} onValueChange={(v) => onModuleChange(v as CommandCenterModule)}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-muted/30 border-border hidden sm:flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(MODULE_LABELS) as [CommandCenterModule, string][]).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Company selector */}
          <Select defaultValue="all">
            <SelectTrigger className="w-[160px] h-8 text-xs bg-muted/30 border-border hidden md:flex">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
            </SelectContent>
          </Select>

          {/* FY badge */}
          <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-md bg-muted/30 border border-border text-xs text-muted-foreground font-mono">
            {getFY()}
          </span>

          {/* Search */}
          <div className="flex-1 max-w-xs">
            <Input
              placeholder="Search..."
              className="h-8 text-xs bg-muted/30 border-border/50"
            />
          </div>
        </div>

        {/* Right icons */}
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/erp/dashboard")}>
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>App Launcher</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:flex" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative group" onClick={openDishani}>
                <Sparkles className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ask Dishani</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>

          <ThemeToggle />
          <UserProfileDropdown variant="app" />
        </div>
      </div>

      {/* Row 2 — Breadcrumb */}
      <div className="flex items-center justify-between px-4 h-8 border-t border-border/50 bg-muted/20">
        <Breadcrumb>
          <BreadcrumbList className="text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink
                onClick={() => navigate("/erp/dashboard")}
                className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
              >
                <Home className="h-3 w-3" />
                <span className="hidden sm:inline">Operix Core</span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator><ChevronRight className="h-3 w-3" /></BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Command Center</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator><ChevronRight className="h-3 w-3" /></BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-primary">{MODULE_LABELS[activeModule]}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground hidden sm:inline">Operational</span>
        </div>
      </div>
    </div>
  );
}
