import { useState } from "react";
import { toast } from "sonner";
import {
  FileText, AlertTriangle, AlertCircle, Eye, EyeOff,
  ShieldCheck, Shield, ShieldAlert, Search, Download,
  LogIn, LogOut, UserPlus, UserX, Key, Building2,
  Ban, CheckCircle2, IndianRupee, UserCog, LayoutGrid,
  Wrench, Bell, Lock, SearchX, Copy,
} from "lucide-react";
import { TowerLayout } from "@/components/layout/TowerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────
type AuditAction =
  | "user.login" | "user.logout" | "user.invite" | "user.suspend"
  | "user.password_reset" | "tenant.provision" | "tenant.suspend"
  | "tenant.activate" | "billing.invoice_generated"
  | "billing.payment_received" | "security.ip_blocked"
  | "security.mfa_enabled" | "security.policy_updated"
  | "permission.role_changed" | "permission.module_access"
  | "system.maintenance" | "notification.sent"
  | "impersonation.start" | "impersonation.end";

type AuditSeverity = "info" | "warning" | "critical";

interface AuditLog {
  id: string;
  action: AuditAction;
  actor: string;
  actorRole: string;
  target: string;
  targetType: "user" | "tenant" | "system" | "billing" | "security";
  tenant: string;
  tenantId: string;
  ip: string;
  location: string;
  timestamp: string;
  severity: AuditSeverity;
  details: string;
  sessionId: string;
}

// ── Mock Data ──────────────────────────────────────────
const AUDIT_LOGS: AuditLog[] = [
  { id: "AUD-0482", action: "user.login", actor: "arjun.mehta@reliancedigital.in", actorRole: "Tenant Admin", target: "Self", targetType: "user", tenant: "Reliance Digital Solutions", tenantId: "TNT-001", ip: "103.21.58.44", location: "Mumbai, MH", timestamp: "03 Apr 2026, 09:14:22 IST", severity: "info", details: "Successful login via Email method", sessionId: "SES-A4F2B1" },
  { id: "AUD-0481", action: "permission.role_changed", actor: "Platform Admin", actorRole: "Super Admin", target: "sneha.k@tatamotors.com", targetType: "user", tenant: "Tata Motors Finance", tenantId: "TNT-002", ip: "49.36.112.88", location: "Pune, MH", timestamp: "03 Apr 2026, 08:52:11 IST", severity: "warning", details: "Role changed from Operator to Manager", sessionId: "SES-B3E1C9" },
  { id: "AUD-0480", action: "tenant.provision", actor: "Platform Admin", actorRole: "Super Admin", target: "Adani Ports & SEZ", targetType: "tenant", tenant: "Platform", tenantId: "SYS", ip: "49.36.112.88", location: "Pune, MH", timestamp: "03 Apr 2026, 08:30:05 IST", severity: "info", details: "New tenant provisioned — Plan: Starter, Modules: 2", sessionId: "SES-B3E1C9" },
  { id: "AUD-0479", action: "security.ip_blocked", actor: "System Monitor", actorRole: "System", target: "185.220.101.34", targetType: "security", tenant: "Platform", tenantId: "SYS", ip: "185.220.101.34", location: "Unknown", timestamp: "03 Apr 2026, 07:58:34 IST", severity: "critical", details: "IP blocked after 10 failed login attempts", sessionId: "SYS-AUTO" },
  { id: "AUD-0478", action: "billing.payment_received", actor: "Billing System", actorRole: "System", target: "INV-2026-0064", targetType: "billing", tenant: "Wipro Enterprises", tenantId: "TNT-004", ip: "10.0.0.1", location: "Internal", timestamp: "02 Apr 2026, 18:22:00 IST", severity: "info", details: "Payment of ₹32,000 received via Razorpay", sessionId: "SYS-BILL" },
  { id: "AUD-0477", action: "impersonation.start", actor: "Platform Admin", actorRole: "Super Admin", target: "rajesh.iyer@infosysbpm.com", targetType: "user", tenant: "Infosys BPM Limited", tenantId: "TNT-003", ip: "49.36.112.88", location: "Pune, MH", timestamp: "02 Apr 2026, 15:44:18 IST", severity: "warning", details: "Reason: Customer support — troubleshooting GST module issue", sessionId: "SES-IMP-001" },
  { id: "AUD-0476", action: "impersonation.end", actor: "Platform Admin", actorRole: "Super Admin", target: "rajesh.iyer@infosysbpm.com", targetType: "user", tenant: "Infosys BPM Limited", tenantId: "TNT-003", ip: "49.36.112.88", location: "Pune, MH", timestamp: "02 Apr 2026, 16:02:44 IST", severity: "warning", details: "Impersonation session ended. Duration: 18 min 26 sec", sessionId: "SES-IMP-001" },
  { id: "AUD-0475", action: "security.policy_updated", actor: "Platform Admin", actorRole: "Super Admin", target: "MFA Policy", targetType: "security", tenant: "Platform", tenantId: "SYS", ip: "49.36.112.88", location: "Pune, MH", timestamp: "02 Apr 2026, 11:20:33 IST", severity: "warning", details: "MFA enforcement changed from Admins Only to All Roles", sessionId: "SES-B3E1C9" },
  { id: "AUD-0474", action: "user.suspend", actor: "Platform Admin", actorRole: "Super Admin", target: "sanjay.g@muthoot.com", targetType: "user", tenant: "Muthoot Finance", tenantId: "TNT-012", ip: "49.36.112.88", location: "Pune, MH", timestamp: "01 Apr 2026, 14:11:07 IST", severity: "warning", details: "User suspended — reason: suspicious_activity policy violation", sessionId: "SES-B3E1C9" },
  { id: "AUD-0473", action: "tenant.suspend", actor: "Platform Admin", actorRole: "Super Admin", target: "Godrej Industries Limited", targetType: "tenant", tenant: "Godrej Industries", tenantId: "TNT-008", ip: "49.36.112.88", location: "Pune, MH", timestamp: "01 Apr 2026, 09:05:54 IST", severity: "critical", details: "Tenant suspended — reason: non-payment (21 days overdue)", sessionId: "SES-B3E1C9" },
  { id: "AUD-0472", action: "security.mfa_enabled", actor: "meera.joshi@bajajfinserv.com", actorRole: "Tenant Admin", target: "Self", targetType: "security", tenant: "Bajaj Finserv", tenantId: "TNT-006", ip: "122.168.44.56", location: "Pune, MH", timestamp: "31 Mar 2026, 17:33:20 IST", severity: "info", details: "MFA enabled using authenticator app", sessionId: "SES-C5D4E2" },
  { id: "AUD-0471", action: "notification.sent", actor: "Platform Admin", actorRole: "Super Admin", target: "All Tenants", targetType: "system", tenant: "Platform", tenantId: "SYS", ip: "49.36.112.88", location: "Pune, MH", timestamp: "31 Mar 2026, 10:00:00 IST", severity: "info", details: "Maintenance notification sent to 12 tenants via Email + In-App", sessionId: "SES-B3E1C9" },
];

// ── Config ─────────────────────────────────────────────
const ACTION_CONFIG: Record<AuditAction, { label: string; icon: string }> = {
  "user.login":               { label: "User Login",            icon: "LogIn" },
  "user.logout":              { label: "User Logout",           icon: "LogOut" },
  "user.invite":              { label: "User Invited",          icon: "UserPlus" },
  "user.suspend":             { label: "User Suspended",        icon: "UserX" },
  "user.password_reset":      { label: "Password Reset",        icon: "Key" },
  "tenant.provision":         { label: "Tenant Provisioned",    icon: "Building2" },
  "tenant.suspend":           { label: "Tenant Suspended",      icon: "Ban" },
  "tenant.activate":          { label: "Tenant Activated",      icon: "CheckCircle2" },
  "billing.invoice_generated":{ label: "Invoice Generated",     icon: "FileText" },
  "billing.payment_received": { label: "Payment Received",      icon: "IndianRupee" },
  "security.ip_blocked":      { label: "IP Blocked",            icon: "ShieldAlert" },
  "security.mfa_enabled":     { label: "MFA Enabled",           icon: "ShieldCheck" },
  "security.policy_updated":  { label: "Policy Updated",        icon: "Shield" },
  "permission.role_changed":  { label: "Role Changed",          icon: "UserCog" },
  "permission.module_access": { label: "Module Access Changed", icon: "LayoutGrid" },
  "system.maintenance":       { label: "System Maintenance",    icon: "Wrench" },
  "notification.sent":        { label: "Notification Sent",     icon: "Bell" },
  "impersonation.start":      { label: "Impersonation Started", icon: "Eye" },
  "impersonation.end":        { label: "Impersonation Ended",   icon: "EyeOff" },
};

const SEVERITY_CONFIG = {
  info:     { color: "bg-info/10 text-info border-info/20",                       dot: "bg-info" },
  warning:  { color: "bg-warning/10 text-warning border-warning/20",             dot: "bg-warning" },
  critical: { color: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LogIn, LogOut, UserPlus, UserX, Key, Building2, Ban, CheckCircle2,
  FileText, IndianRupee, ShieldAlert, ShieldCheck, Shield, UserCog,
  LayoutGrid, Wrench, Bell, Eye, EyeOff,
};

// ── Component ──────────────────────────────────────────
const AuditLogs = () => {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const filtered = AUDIT_LOGS.filter((log) => {
    const q = search.toLowerCase();
    const matchSearch =
      log.actor.toLowerCase().includes(q) ||
      log.target.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.id.toLowerCase().includes(q);
    const matchAction =
      actionFilter === "all" ||
      (actionFilter === "user" && log.action.startsWith("user.")) ||
      (actionFilter === "tenant" && log.action.startsWith("tenant.")) ||
      (actionFilter === "billing" && log.action.startsWith("billing.")) ||
      (actionFilter === "security" && log.action.startsWith("security.")) ||
      (actionFilter === "permission" && log.action.startsWith("permission.")) ||
      (actionFilter === "impersonation" && log.action.startsWith("impersonation."));
    const matchSeverity = severityFilter === "all" || log.severity === severityFilter;
    return matchSearch && matchAction && matchSeverity;
  });

  const criticalCount = AUDIT_LOGS.filter((l) => l.severity === "critical").length;
  const warningCount = AUDIT_LOGS.filter((l) => l.severity === "warning").length;
  const impersonationCount = AUDIT_LOGS.filter((l) => l.action.includes("impersonation")).length;

  const openDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetail(true);
  };

  const ActionIcon = ({ action, className }: { action: AuditAction; className?: string }) => {
    const iconName = ACTION_CONFIG[action]?.icon;
    const Icon = ICON_MAP[iconName];
    return Icon ? <Icon className={className} /> : null;
  };

  const parseDateLine = (ts: string) => {
    const commaIdx = ts.indexOf(",");
    if (commaIdx === -1) return { date: ts, time: "" };
    return { date: ts.slice(0, commaIdx), time: ts.slice(commaIdx + 2) };
  };

  return (
    <TowerLayout title="Audit Logs" subtitle="Immutable platform activity log — CERT-In compliant">
      {/* CERT-In Banner */}
      <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-success flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-success">CERT-In Compliant Audit Log</p>
            <p className="text-xs text-muted-foreground">
              All entries are immutable and tamper-proof. Retained for 7 years as per IT Act 2000.
            </p>
          </div>
        </div>
        <span className="bg-success/20 text-success border border-success/30 text-xs font-mono px-3 py-1 rounded-full">
          Immutable
        </span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={FileText} iconColor="text-primary" label="Total Logs" value={AUDIT_LOGS.length} />
        <StatCard icon={AlertTriangle} iconColor="text-destructive" label="Critical Events" value={criticalCount} />
        <StatCard icon={AlertCircle} iconColor="text-warning" label="Warnings" value={warningCount} />
        <StatCard icon={Eye} iconColor="text-warning" label="Impersonation Sessions" value={impersonationCount} sub="All logged with reason" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="user">User Actions</SelectItem>
            <SelectItem value="tenant">Tenant Actions</SelectItem>
            <SelectItem value="billing">Billing Actions</SelectItem>
            <SelectItem value="security">Security Actions</SelectItem>
            <SelectItem value="permission">Permission Changes</SelectItem>
            <SelectItem value="impersonation">Impersonation</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="ml-auto" onClick={() => toast("Exporting audit logs as CSV...")}>
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">
          Showing {filtered.length} of {AUDIT_LOGS.length} entries
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Lock className="h-3 w-3" />
          Read-only — entries cannot be modified
        </span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <SearchX className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No audit logs found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">Log ID</TableHead>
                <TableHead className="w-[130px]">Timestamp</TableHead>
                <TableHead className="w-[160px]">Action</TableHead>
                <TableHead className="w-[150px]">Actor</TableHead>
                <TableHead className="w-[120px]">Target</TableHead>
                <TableHead className="w-[120px]">Tenant</TableHead>
                <TableHead className="w-[90px]">Severity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => {
                const { date, time } = parseDateLine(log.timestamp);
                const isImpersonation = log.action.includes("impersonation");
                const isCritical = log.severity === "critical";
                return (
                  <TableRow
                    key={log.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/20",
                      isImpersonation && "bg-warning/5",
                      isCritical && !isImpersonation && "bg-destructive/5"
                    )}
                    onClick={() => openDetail(log)}
                  >
                    <TableCell>
                      <span
                        className="text-xs font-mono text-primary hover:underline cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); openDetail(log); }}
                      >
                        {log.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs font-mono text-muted-foreground">{date}</div>
                      <div className="text-xs font-mono text-muted-foreground/60">{time}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ActionIcon action={log.action} className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-foreground">{ACTION_CONFIG[log.action].label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-foreground truncate max-w-[140px]">{log.actor}</div>
                      <div className="text-[10px] text-muted-foreground">{log.actorRole}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-foreground truncate max-w-[120px] block">{log.target}</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">{log.tenant}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{log.tenantId}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("w-2 h-2 rounded-full flex-shrink-0", SEVERITY_CONFIG[log.severity].dot)} />
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", SEVERITY_CONFIG[log.severity].color)}>
                          {log.severity.charAt(0).toUpperCase() + log.severity.slice(1)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{log.details}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent side="right" className="w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono text-lg">{selectedLog?.id}</SheetTitle>
            <p className="text-sm text-muted-foreground">
              {selectedLog && ACTION_CONFIG[selectedLog.action].label}
            </p>
            {selectedLog && (
              <span className={cn("text-xs px-2 py-0.5 rounded border w-fit", SEVERITY_CONFIG[selectedLog.severity].color)}>
                {selectedLog.severity.charAt(0).toUpperCase() + selectedLog.severity.slice(1)}
              </span>
            )}
          </SheetHeader>

          {selectedLog && (
            <div className="mt-6 space-y-6">
              {/* Event Details */}
              <DetailSection title="Event Details">
                <DetailRow label="Log ID" value={<span className="font-mono text-xs text-primary">{selectedLog.id}</span>} />
                <DetailRow label="Action" value={ACTION_CONFIG[selectedLog.action].label} />
                <DetailRow label="Severity" value={
                  <span className={cn("text-xs px-1.5 py-0.5 rounded border", SEVERITY_CONFIG[selectedLog.severity].color)}>
                    {selectedLog.severity.charAt(0).toUpperCase() + selectedLog.severity.slice(1)}
                  </span>
                } />
                <DetailRow label="Timestamp" value={<span className="font-mono">{selectedLog.timestamp}</span>} />
                <DetailRow label="Session ID" value={<span className="font-mono text-xs text-muted-foreground">{selectedLog.sessionId}</span>} />
              </DetailSection>

              {/* Actor */}
              <DetailSection title="Actor">
                <DetailRow label="Actor" value={selectedLog.actor} />
                <DetailRow label="Role" value={selectedLog.actorRole} />
                <DetailRow label="IP Address" value={<span className="font-mono">{selectedLog.ip}</span>} />
                <DetailRow label="Location" value={selectedLog.location} />
              </DetailSection>

              {/* Target */}
              <DetailSection title="Target">
                <DetailRow label="Target" value={selectedLog.target} />
                <DetailRow label="Target Type" value={
                  <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                    {selectedLog.targetType}
                  </span>
                } />
                <DetailRow label="Tenant" value={selectedLog.tenant} />
                <DetailRow label="Tenant ID" value={<span className="font-mono">{selectedLog.tenantId}</span>} />
              </DetailSection>

              {/* Details */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Details</h4>
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm leading-relaxed text-foreground">{selectedLog.details}</p>
                </div>
                {selectedLog.action.includes("impersonation") && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mt-3 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-warning">
                      Impersonation session — all actions during this session were performed on behalf of the target user.
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => toast(`Log ID copied: ${selectedLog.id}`)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Log ID
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => toast("Exporting log entry...")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export This Entry
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </TowerLayout>
  );
};

// ── Sub-components ─────────────────────────────────────
const StatCard = ({ icon: Icon, iconColor, label, value, sub }: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  label: string;
  value: number;
  sub?: string;
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Icon className={cn("h-4 w-4", iconColor)} />
    </div>
    <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
  </div>
);

const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h4>
    <div className="space-y-0 divide-y divide-border">{children}</div>
  </div>
);

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-xs text-foreground text-right max-w-[280px] truncate">{value}</span>
  </div>
);

export default AuditLogs;
