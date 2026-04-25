import { useState } from "react";
import { toast } from "sonner";
import { Plus, Check, Minus, Download, Pencil, Lock } from "lucide-react";
import { TowerLayout } from "@/components/layout/TowerLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// [JWT] Replace with real role data from API
const ROLES = [
  {
    id: "super_admin", name: "Super Admin", badge: "SUPER ADMIN",
    badgeColor: "bg-red-900/40 text-red-400",
    desc: "Full platform access. Can modify any setting, manage all tenants, override any policy.",
    users: 1, perms: 12, total: 12, system: true,
  },
  {
    id: "platform_admin", name: "Platform Admin", badge: "ADMIN",
    badgeColor: "bg-cyan-900/40 text-cyan-400",
    desc: "Manages tenants, users, billing and most platform settings. Cannot modify security policies or impersonate users.",
    users: 3, perms: 10, total: 12, system: false,
  },
  {
    id: "support", name: "Support Agent", badge: "SUPPORT",
    badgeColor: "bg-purple-900/40 text-purple-400",
    desc: "Read access to tenant data and audit logs for support purposes. Can impersonate users (read-only).",
    users: 5, perms: 6, total: 12, system: false,
  },
  {
    id: "billing", name: "Billing Manager", badge: "BILLING",
    badgeColor: "bg-amber-900/40 text-amber-400",
    desc: "Access to billing, invoices, subscription management only.",
    users: 2, perms: 3, total: 12, system: false,
  },
  {
    id: "readonly", name: "Read-Only Observer", badge: "READ-ONLY",
    badgeColor: "bg-slate-700 text-slate-400",
    desc: "View-only access to dashboards and reports. Cannot modify any settings.",
    users: 4, perms: 2, total: 12, system: false,
  },
];

const PERMISSIONS = [
  "View Platform Dashboard",
  "Manage Tenants (create/suspend/delete)",
  "Manage All Users",
  "View Audit Logs",
  "Modify Security Policies",
  "Access Billing & Invoices",
  "Impersonate Users",
  "View System Monitoring",
  "Manage Integrations",
  "Configure API Keys",
  "Export Platform Data",
  "Access AI Insights",
];

type PermValue = boolean | "read";
const MATRIX: Record<string, PermValue[]> = {
  super_admin:    [true, true, true, true, true, true, true, true, true, true, true, true],
  platform_admin: [true, true, true, true, false, true, false, true, true, true, true, true],
  support:        [true, false, false, true, false, false, "read", true, false, false, false, false],
  billing:        [true, false, false, false, false, true, false, false, false, false, true, false],
  readonly:       [true, false, false, true, false, false, false, true, false, false, false, true],
};

const DOT_COLORS: Record<string, string> = {
  super_admin: "bg-red-400",
  platform_admin: "bg-cyan-400",
  support: "bg-purple-400",
  billing: "bg-amber-400",
  readonly: "bg-slate-400",
};

function exportCSV() {
  const header = ["Permission", ...ROLES.map(r => r.name)];
  const rows = PERMISSIONS.map((p, i) => [
    p, ...ROLES.map(r => { const v = MATRIX[r.id][i]; return v === true ? "Yes" : v === "read" ? "Read-only" : "No"; })
  ]);
  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "permission-matrix.csv"; a.click();
  URL.revokeObjectURL(url);
  toast.success("Permission matrix exported as CSV");
}

export default function Permissions() {
  const [tab, setTab] = useState<"roles" | "matrix">("roles");

  return (
    <TowerLayout title="Role Management & Permissions" subtitle="Define what each role can do across the entire platform">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-0 border-b border-slate-700">
            {(["roles", "matrix"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                  tab === t ? "border-cyan-400 text-white" : "border-transparent text-slate-400 hover:text-white"
                )}>
                {t === "roles" ? "Roles" : "Permission Matrix"}
              </button>
            ))}
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-600 text-white" onClick={() => toast("Create Role dialog coming soon")}>
            <Plus className="h-4 w-4 mr-1" /> Create Role
          </Button>
        </div>

        {tab === "roles" ? <RolesTab /> : <MatrixTab />}
      </div>
    </TowerLayout>
  );
}

function RolesTab() {
  return (
    <div className="space-y-4">
      {ROLES.map(role => (
        <div key={role.id} className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-5 flex gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", role.badgeColor)}>{role.badge}</span>
              {role.system && <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">System Role</span>}
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{role.name}</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">{role.desc}</p>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-slate-300">👤</div>
                {role.users} user{role.users !== 1 ? "s" : ""}
              </span>
              <span>
                <span className="font-mono text-cyan-400">{role.perms}</span> of {role.total} permissions
              </span>
            </div>
          </div>
          <div className="shrink-0 flex items-start">
            {role.system ? (
              <Button size="sm" variant="outline" disabled className="border-slate-600 text-slate-600">
                <Lock className="h-3 w-3 mr-1" /> Edit
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10">
                <Pencil className="h-3 w-3 mr-1" /> Edit
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function MatrixTab() {
  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10" onClick={exportCSV}>
          <Download className="h-3 w-3 mr-1" /> Export Matrix as CSV
        </Button>
      </div>
      <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-[#0D1B2A]">
              <th className="text-left p-3 text-xs font-bold text-slate-400 uppercase w-[260px]">Permission</th>
              {ROLES.map(r => (
                <th key={r.id} className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full", DOT_COLORS[r.id])} />
                    <span className="text-xs font-semibold text-white">{r.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {PERMISSIONS.map((perm, i) => (
              <tr key={perm} className={i % 2 === 0 ? "bg-[#1E3A5F]" : "bg-[#1A2E42]"}>
                <td className="p-3 text-xs text-slate-300">{perm}</td>
                {ROLES.map(r => {
                  const v = MATRIX[r.id][i];
                  return (
                    <td key={r.id} className="p-3">
                      <div className="flex items-center justify-center">
                        {v === true ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : v === "read" ? (
                          <span className="text-[10px] text-amber-400 font-mono">read</span>
                        ) : (
                          <Minus className="h-4 w-4 text-slate-600" />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
