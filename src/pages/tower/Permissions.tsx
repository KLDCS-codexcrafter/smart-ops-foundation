import { useState } from "react";
import {
  Shield, Key, LayoutGrid, Settings2, CheckCircle2,
  X, ShieldCheck,
} from "lucide-react";
import { TowerLayout } from "@/components/layout/TowerLayout";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────
type Role = "super_admin" | "tenant_admin" | "manager" | "operator" | "viewer";

interface PermissionKey {
  key: string;
  label: string;
  group: "voucher" | "masters" | "reports" | "admin";
  description: string;
}

// ── Data ───────────────────────────────────────────────
const PERMISSION_KEYS: PermissionKey[] = [
  { key: "create",  label: "Create",  group: "voucher", description: "Create new vouchers/entries" },
  { key: "read",    label: "Read",    group: "voucher", description: "View vouchers and entries" },
  { key: "edit",    label: "Edit",    group: "voucher", description: "Edit existing vouchers" },
  { key: "delete",  label: "Delete",  group: "voucher", description: "Delete vouchers" },
  { key: "approve", label: "Approve", group: "voucher", description: "Approve pending entries" },
  { key: "reject",  label: "Reject",  group: "voucher", description: "Reject pending entries" },
  { key: "post",    label: "Post",    group: "voucher", description: "Post/finalise entries" },
  { key: "cancel",  label: "Cancel",  group: "voucher", description: "Cancel posted entries" },
  { key: "master_create", label: "Master Create", group: "masters", description: "Create master records" },
  { key: "master_edit",   label: "Master Edit",   group: "masters", description: "Edit master records" },
  { key: "report_view",   label: "Report View",   group: "reports", description: "View reports" },
  { key: "report_export", label: "Report Export",  group: "reports", description: "Export reports" },
  { key: "settings", label: "Settings", group: "admin", description: "Access module settings" },
  { key: "audit",    label: "Audit",    group: "admin", description: "View audit logs" },
];

const GROUP_CONFIG: Record<string, { label: string; color: string }> = {
  voucher: { label: "Voucher (8)",  color: "text-primary bg-primary/10" },
  masters: { label: "Masters (2)",  color: "text-accent bg-accent/10" },
  reports: { label: "Reports (2)",  color: "text-info bg-info/10" },
  admin:   { label: "Admin (2)",    color: "text-warning bg-warning/10" },
};

const ROLE_LABELS: Record<Role, string> = {
  super_admin:  "Super Admin",
  tenant_admin: "Tenant Admin",
  manager:      "Manager",
  operator:     "Operator",
  viewer:       "Viewer",
};

const DISPLAY_ROLES: Role[] = ["tenant_admin", "manager", "operator", "viewer"];
const ALL_ROLES: Role[] = ["super_admin", "tenant_admin", "manager", "operator", "viewer"];

function buildDefaults(): Record<string, boolean> {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k.key, false]));
}

const DEFAULT_MATRIX: Record<Role, Record<string, boolean>> = {
  super_admin: Object.fromEntries(PERMISSION_KEYS.map((k) => [k.key, true])),
  tenant_admin: {
    ...buildDefaults(),
    create: true, read: true, edit: true, delete: false,
    approve: true, reject: true, post: true, cancel: false,
    master_create: true, master_edit: true,
    report_view: true, report_export: true,
    settings: true, audit: false,
  },
  manager: {
    ...buildDefaults(),
    create: true, read: true, edit: true, delete: false,
    approve: true, reject: true, post: true, cancel: false,
    master_create: false, master_edit: false,
    report_view: true, report_export: true,
    settings: false, audit: false,
  },
  operator: {
    ...buildDefaults(),
    create: true, read: true, edit: true, delete: false,
    approve: false, reject: false, post: false, cancel: false,
    master_create: false, master_edit: false,
    report_view: true, report_export: false,
    settings: false, audit: false,
  },
  viewer: {
    ...buildDefaults(),
    create: false, read: true, edit: false, delete: false,
    approve: false, reject: false, post: false, cancel: false,
    master_create: false, master_edit: false,
    report_view: true, report_export: false,
    settings: false, audit: false,
  },
};

const MODULES = [
  "Sales & CRM",
  "Accounts & Finance",
  "Inventory Management",
  "Purchase & Procurement",
  "HR & Payroll",
  "Reports & Analytics",
];

const GROUPS: Array<"voucher" | "masters" | "reports" | "admin"> = ["voucher", "masters", "reports", "admin"];

// ── Helpers ────────────────────────────────────────────
function countEnabled(role: Role): number {
  return PERMISSION_KEYS.filter((k) => DEFAULT_MATRIX[role][k.key]).length;
}

// ── Component ──────────────────────────────────────────
const Permissions = () => {
  const [view, setView] = useState<"matrix" | "role">("matrix");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [selectedPermission, setSelectedPermission] = useState<PermissionKey | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const openDetail = (perm: PermissionKey) => {
    setSelectedPermission(perm);
    setShowDetail(true);
  };

  return (
    <TowerLayout title="Permissions" subtitle="14-key RBAC permission model across all modules">
      {/* ── Stats Row ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Shield} label="Total Roles" value="5" color="text-primary" />
        <StatCard icon={Key} label="Permission Keys" value="14" color="text-accent" sub="Per module" />
        <StatCard icon={LayoutGrid} label="Modules Covered" value="6" color="text-info" />
        <StatCard icon={Settings2} label="Custom Overrides" value="0" color="text-warning" sub="All using defaults" />
      </div>

      {/* ── View Toggle + Module Selector ─────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex rounded-lg overflow-hidden border border-border">
          <button
            onClick={() => setView("matrix")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium transition-colors",
              view === "matrix"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            Matrix View
          </button>
          <button
            onClick={() => setView("role")}
            className={cn(
              "px-4 py-1.5 text-sm font-medium transition-colors",
              view === "role"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            Role View
          </button>
        </div>

        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All Modules" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {MODULES.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Matrix View ──────────────────────────── */}
      {view === "matrix" && <MatrixView onSelect={openDetail} />}

      {/* ── Role View ────────────────────────────── */}
      {view === "role" && <RoleView />}

      {/* ── Detail Sheet ─────────────────────────── */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent side="right" className="w-[420px]">
          {selectedPermission && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">{selectedPermission.label}</SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-5">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md", GROUP_CONFIG[selectedPermission.group].color)}>
                    {GROUP_CONFIG[selectedPermission.group].label}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">{selectedPermission.description}</p>

                <div className="text-xs font-mono text-muted-foreground/60 bg-muted/30 px-3 py-1.5 rounded-md inline-block">
                  {selectedPermission.key}
                </div>

                <div className="h-px bg-border" />

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Access by Role</h4>
                  <div className="space-y-2">
                    {ALL_ROLES.map((role) => {
                      const granted = DEFAULT_MATRIX[role][selectedPermission.key];
                      return (
                        <div key={role} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/20">
                          <span className="text-sm text-foreground">{ROLE_LABELS[role]}</span>
                          <div className="flex items-center gap-2">
                            {granted ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-success" />
                                <span className="text-xs text-success font-medium">Granted</span>
                              </>
                            ) : (
                              <>
                                <X className="h-4 w-4 text-muted-foreground/30" />
                                <span className="text-xs text-muted-foreground">Denied</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Applied to Modules</h4>
                  <div className="space-y-2">
                    {MODULES.map((m) => (
                      <div key={m} className="flex items-center gap-2">
                        <Checkbox checked disabled className="data-[state=checked]:bg-primary" />
                        <span className="text-sm text-foreground">{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  Permission changes take effect immediately for active sessions.
                </p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </TowerLayout>
  );
};

// ── StatCard ───────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </div>
      <div className="font-mono text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Matrix View ────────────────────────────────────────
function MatrixView({ onSelect }: { onSelect: (p: PermissionKey) => void }) {
  return (
    <div>
      {/* Super Admin note */}
      <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-4 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-accent flex-shrink-0" />
        <p className="text-sm text-foreground">
          <span className="font-medium">Super Admin</span>{" "}
          <span className="text-muted-foreground">has all 14 permissions enabled across all modules by default.</span>
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="w-48">Permission</TableHead>
              <TableHead className="w-32">Group</TableHead>
              {DISPLAY_ROLES.map((role) => (
                <TableHead key={role} className="text-center min-w-[80px]">
                  <span className="text-xs">{ROLE_LABELS[role]}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {GROUPS.map((group, gi) => {
              const groupKeys = PERMISSION_KEYS.filter((k) => k.group === group);
              return (
                <>{/* Group separator */}
                  {gi > 0 && (
                    <TableRow key={`sep-${group}`} className="border-0 hover:bg-transparent">
                      <TableCell colSpan={6} className="py-1 px-4 bg-muted/30">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {GROUP_CONFIG[group].label}
                        </span>
                      </TableCell>
                    </TableRow>
                  )}
                  {gi === 0 && (
                    <TableRow key={`sep-${group}`} className="border-0 hover:bg-transparent">
                      <TableCell colSpan={6} className="py-1 px-4 bg-muted/30">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {GROUP_CONFIG[group].label}
                        </span>
                      </TableCell>
                    </TableRow>
                  )}
                  {groupKeys.map((perm) => (
                    <TableRow
                      key={perm.key}
                      className="hover:bg-muted/30 cursor-pointer transition-colors border-border"
                      onClick={() => onSelect(perm)}
                    >
                      <TableCell className="py-3">
                        <div className="text-sm font-medium text-foreground">{perm.label}</div>
                        <div className="text-xs text-muted-foreground">{perm.description}</div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md", GROUP_CONFIG[perm.group].color)}>
                          {GROUP_CONFIG[perm.group].label}
                        </span>
                      </TableCell>
                      {DISPLAY_ROLES.map((role) => (
                        <TableCell key={role} className="text-center">
                          {DEFAULT_MATRIX[role][perm.key] ? (
                            <CheckCircle2 className="h-4 w-4 text-success inline-block" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/30 inline-block" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Role View ──────────────────────────────────────────
function RoleView() {
  return (
    <div className="space-y-4">
      {ALL_ROLES.map((role) => {
        const count = countEnabled(role);
        const pct = (count / 14) * 100;

        return (
          <div key={role} className="bg-card border border-border rounded-xl p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-foreground">{ROLE_LABELS[role]}</h3>
              <span className="text-xs text-muted-foreground font-mono">{count}/14 permissions</span>
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-4">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>

            {/* Groups */}
            <div className="space-y-3">
              {GROUPS.map((group) => {
                const groupKeys = PERMISSION_KEYS.filter((k) => k.group === group);
                return (
                  <div key={group}>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
                      {GROUP_CONFIG[group].label}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {groupKeys.map((perm) => {
                        const enabled = DEFAULT_MATRIX[role][perm.key];
                        return (
                          <span
                            key={perm.key}
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-md border",
                              enabled
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-muted text-muted-foreground/50 border-transparent line-through"
                            )}
                          >
                            {perm.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Permissions;
