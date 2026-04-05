import {
  LayoutDashboard, ShoppingCart, Package, CheckSquare,
  DoorOpen, Factory, Wrench, ClipboardList, TrendingUp,
  Landmark, Users, Building2, Headphones, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, ShoppingCart, Package, CheckSquare,
  DoorOpen, Factory, Wrench, ClipboardList, TrendingUp,
  Landmark, Users, Building2, Headphones, BarChart3,
};

type HealthStatus = "healthy" | "warning" | "offline";

function getModuleHealth(_id: string): HealthStatus {
  // All healthy — mock. Backend wires real health checks later.
  return "healthy";
}

const STATUS_CONFIG = {
  healthy: {
    dot: "bg-emerald-500",
    label: "Healthy",
    labelClass: "text-emerald-400",
    pulse: true,
  },
  warning: {
    dot: "bg-amber-500",
    label: "Warning",
    labelClass: "text-amber-400",
    pulse: false,
  },
  offline: {
    dot: "bg-destructive",
    label: "Offline",
    labelClass: "text-destructive",
    pulse: false,
  },
};

// All 13 modules excluding command-center — defined here to avoid circular imports
const HEALTH_MODULES = [
  { id: "procure360", name: "Procure360", icon: "ShoppingCart" },
  { id: "inventory-hub", name: "Inventory Hub", icon: "Package" },
  { id: "qulicheak", name: "Qulicheak", icon: "CheckSquare" },
  { id: "gateflow", name: "GateFlow", icon: "DoorOpen" },
  { id: "production", name: "Production", icon: "Factory" },
  { id: "maintainpro", name: "MaintainPro", icon: "Wrench" },
  { id: "requestx", name: "RequestX", icon: "ClipboardList" },
  { id: "salesx", name: "SalesX Hub", icon: "TrendingUp" },
  { id: "finecore", name: "FineCore", icon: "Landmark" },
  { id: "peoplepay", name: "PeoplePay", icon: "Users" },
  { id: "backoffice", name: "Back Office Pro", icon: "Building2" },
  { id: "servicedesk", name: "ServiceDesk", icon: "Headphones" },
  { id: "insightx", name: "InsightX", icon: "BarChart3" },
];

export function ModuleHealthMatrix() {
  const healthyCount = HEALTH_MODULES.filter(
    (m) => getModuleHealth(m.id) === "healthy"
  ).length;

  return (
    <div className="glass-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Module Health Matrix
        </p>
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-0.5">
          {healthyCount}/{HEALTH_MODULES.length} Operational
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
        {HEALTH_MODULES.map((mod) => {
          const health = getModuleHealth(mod.id);
          const config = STATUS_CONFIG[health];
          const Icon = ICON_MAP[mod.icon] ?? LayoutDashboard;
          return (
            <div
              key={mod.id}
              className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="relative flex-shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span
                  className={cn(
                    "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full",
                    config.dot,
                    config.pulse && "animate-pulse"
                  )}
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{mod.name}</p>
                <p className={cn("text-[10px]", config.labelClass)}>{config.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
