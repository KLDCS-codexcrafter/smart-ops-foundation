import {
  Building2, Globe, Package, Landmark, Shield,
  TrendingUp, Users, Settings, Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MasterGroup {
  id: string;
  name: string;
  icon: React.ElementType;
  masters: { name: string; icon: React.ElementType }[];
}

const MASTER_GROUPS: MasterGroup[] = [
  {
    id: "org",
    name: "Org Structure",
    icon: Building2,
    masters: [
      { name: "Company Group", icon: Building2 },
      { name: "Company", icon: Building2 },
      { name: "Entity", icon: Building2 },
      { name: "Branch Office", icon: Building2 },
      { name: "Division", icon: Building2 },
      { name: "Department", icon: Building2 },
    ],
  },
  {
    id: "geo",
    name: "Geography",
    icon: Globe,
    masters: [
      { name: "Country", icon: Globe },
      { name: "State", icon: Globe },
      { name: "District", icon: Globe },
      { name: "City / Town", icon: Globe },
      { name: "Zone", icon: Globe },
      { name: "Region", icon: Globe },
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    icon: Package,
    masters: [
      { name: "Item Templates", icon: Package },
      { name: "Unit of Measure", icon: Package },
      { name: "Storage Matrix", icon: Package },
      { name: "Godown", icon: Package },
      { name: "Brand Matrix", icon: Package },
    ],
  },
  {
    id: "financial",
    name: "Financial",
    icon: Landmark,
    masters: [
      { name: "Chart of Accounts", icon: Landmark },
      { name: "Ledger Accounts", icon: Landmark },
      { name: "Cost Centres", icon: Landmark },
      { name: "Currency", icon: Landmark },
      { name: "Exchange Rates", icon: Landmark },
    ],
  },
  {
    id: "tax",
    name: "Tax & Compliance",
    icon: Shield,
    masters: [
      { name: "GST Classification", icon: Shield },
      { name: "HSN / SAC", icon: Shield },
      { name: "TDS Sections", icon: Shield },
      { name: "TCS Sections", icon: Shield },
      { name: "Payroll Statutory", icon: Shield },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    icon: TrendingUp,
    masters: [
      { name: "Customer", icon: TrendingUp },
      { name: "Distributor", icon: TrendingUp },
      { name: "Sales Team", icon: TrendingUp },
      { name: "Territory", icon: TrendingUp },
      { name: "Incentive Structure", icon: TrendingUp },
    ],
  },
  {
    id: "hr",
    name: "HR & Payroll",
    icon: Users,
    masters: [
      { name: "Employee Master", icon: Users },
      { name: "Salary Structure", icon: Users },
      { name: "Leave Types", icon: Users },
      { name: "Shift Master", icon: Users },
      { name: "Holiday Calendar", icon: Users },
    ],
  },
  {
    id: "system",
    name: "System Config",
    icon: Settings,
    masters: [
      { name: "Voucher Types", icon: Settings },
      { name: "Transaction Classification", icon: Settings },
      { name: "Module Settings", icon: Settings },
      { name: "Workflow Config", icon: Settings },
    ],
  },
];

export function FoundationModule() {
  return (
    <div className="space-y-6">
      {/* Note */}
      <div className="glass-card rounded-2xl border border-border p-4 flex items-start gap-3">
        <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Masters are being designed</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            These masters will be configured as each module is designed and handed over to the developer.
            Select a module from the sidebar to get started with live features.
          </p>
        </div>
      </div>

      {/* Master groups grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MASTER_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div key={group.id} className="glass-card rounded-2xl border border-border overflow-hidden">
              {/* Group header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/50 bg-muted/20">
                <GroupIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{group.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                  {group.masters.length} masters
                </span>
              </div>
              {/* Master tiles */}
              <div className="p-3 grid grid-cols-3 gap-2">
                {group.masters.map((master) => {
                  const MIcon = master.icon;
                  return (
                    <div
                      key={master.name}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-muted/20 border border-border/40 text-center"
                    >
                      <MIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground leading-tight">{master.name}</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                        Soon
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
