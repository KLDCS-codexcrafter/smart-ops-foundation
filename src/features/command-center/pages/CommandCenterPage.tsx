import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Settings, Shield, Users, Database, Building2,
  Calendar, Hash, Globe, Key, Smartphone,
  FileText, AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ── Foundation & Core items ───────────────────────────────────────── */
const foundationItems = [
  { icon: Building2, label: "Organisation Structure", desc: "Company, branches, departments and cost centres" },
  { icon: Calendar, label: "Fiscal Year & Periods", desc: "Financial year setup, period locking" },
  { icon: Hash, label: "Numbering Series", desc: "Auto-numbering for PO, SO, invoices and more" },
  { icon: Globe, label: "Currency & Exchange Rates", desc: "Multi-currency support and rate management" },
  { icon: Database, label: "Unit of Measure", desc: "UoM definitions, conversions and groups" },
  { icon: FileText, label: "Document Templates", desc: "Print layouts, email templates, PDF formats" },
];

/* ── Security Console items ────────────────────────────────────────── */
const securityItems = [
  { icon: Key, label: "Roles & Permissions", desc: "Role definitions, module-level access" },
  { icon: Users, label: "User Management", desc: "Invite, deactivate, reset passwords" },
  { icon: Smartphone, label: "MFA Settings", desc: "Two-factor authentication policies" },
  { icon: Globe, label: "IP Whitelisting", desc: "Restrict access by IP range or geo-fence" },
  { icon: AlertTriangle, label: "Audit & Compliance", desc: "Audit trail, data retention policies" },
  { icon: Shield, label: "Session Policies", desc: "Timeout, concurrent sessions, device trust" },
];

function ConfigGrid({ items }: { items: typeof foundationItems }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-border bg-card hover:border-primary/40 p-4 transition-all cursor-pointer group"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted shrink-0">
              <item.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground block group-hover:text-primary transition-colors">
                {item.label}
              </span>
              <span className="text-xs text-muted-foreground">{item.desc}</span>
              <Badge variant="outline" className="mt-2 text-[10px] border-amber-500/40 text-amber-500">
                Coming Soon
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommandCenterPage() {
  const [tab, setTab] = useState("foundation");

  return (
    <AppLayout
      title="Command Center Hub"
      breadcrumbs={[
        { label: "ERP", href: "/erp" },
        { label: "Command Center", href: "/erp/command-center" },
        { label: "Hub" },
      ]}
    >
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="foundation" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Foundation & Core
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Security Console
          </TabsTrigger>
        </TabsList>

        <TabsContent value="foundation">
          <ConfigGrid items={foundationItems} />
        </TabsContent>

        <TabsContent value="security">
          <ConfigGrid items={securityItems} />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
