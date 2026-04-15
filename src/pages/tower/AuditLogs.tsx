import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  ScrollText, Download, Search, X, Shield, Server,
  Globe, Users, CreditCard, Database, Link2, FileDown,
  ChevronLeft, ChevronRight,
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
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { onEnterNext } from '@/lib/keyboard';

// ── Types ──────────────────────────────────────────────
type EventType = "Security" | "Customer" | "User" | "Billing" | "System" | "Integration" | "Data Export";
type Severity = "Info" | "Warning" | "Critical";
type Source = "Tower" | "Bridge" | "ERP" | "Partner" | "Customer Portal" | "API";

interface AuditEvent {
  id: string;
  timestamp: string;
  type: EventType;
  severity: Severity;
  user: string;
  action: string;
  resource: string;
  ip: string;
  source: Source;
  geo: string;
  userAgent: string;
  sessionId: string;
  outcome: "SUCCESS" | "BLOCKED" | "FAILED";
  payload: Record<string, unknown>;
}

// ── Mock Data ──────────────────────────────────────────
// [JWT] In production: fetch from /api/tower/audit-logs?tenantId=all&limit=25&page=1
const EVENTS: AuditEvent[] = [
  { id: "EVT-8847", timestamp: "2026-04-04 09:42:11 IST", type: "Security", severity: "Info", user: "admin@4dsmartops.in", action: "MFA_ENABLED", resource: "user:priya.sharma@acmeindia.in", ip: "103.24.108.45", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", sessionId: "sess_a7f3c91d", outcome: "SUCCESS", payload: { target_user: "priya.sharma@acmeindia.in", mfa_method: "totp" } },
  { id: "EVT-8846", timestamp: "2026-04-04 09:28:03 IST", type: "Customer", severity: "Info", user: "superadmin", action: "TENANT_PROVISIONED", resource: "tenant:bharat-traders", ip: "103.24.108.1", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", sessionId: "sess_b2e4d81a", outcome: "SUCCESS", payload: { tenant_name: "Bharat Traders Pvt Ltd", plan: "Enterprise" } },
  { id: "EVT-8845", timestamp: "2026-04-04 09:14:55 IST", type: "User", severity: "Info", user: "admin@4dsmartops.in", action: "USER_INVITED", resource: "user:priya.sharma@acmeindia.in", ip: "103.24.108.45", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", sessionId: "sess_a7f3c91d", outcome: "SUCCESS", payload: { role: "Platform Admin", invited_email: "priya.sharma@acmeindia.in" } },
  { id: "EVT-8844", timestamp: "2026-04-04 08:51:22 IST", type: "Security", severity: "Warning", user: "superadmin", action: "IP_WHITELIST_UPDATED", resource: "policy:ip-whitelist", ip: "103.24.108.1", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", sessionId: "sess_b2e4d81a", outcome: "SUCCESS", payload: { added_ips: 3, removed_ips: 0 } },
  { id: "EVT-8843", timestamp: "2026-04-04 07:33:44 IST", type: "Billing", severity: "Info", user: "billing@4dsmartops.in", action: "INVOICE_GENERATED", resource: "invoice:INV-2026-047", ip: "49.36.12.4", source: "Tower", geo: "India, Telangana", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", sessionId: "sess_c5f2a33e", outcome: "SUCCESS", payload: { amount: "₹18,500", tenant: "Acme India" } },
  { id: "EVT-8842", timestamp: "2026-04-04 06:17:08 IST", type: "Security", severity: "Critical", user: "unknown", action: "LOGIN_FAILED_BLOCKED", resource: "auth:login", ip: "185.220.101.34", source: "Tower", geo: "Germany, Frankfurt", userAgent: "curl/7.88.1", sessionId: "sess_none", outcome: "BLOCKED", payload: { reason: "IP not whitelisted", attempts: 5 } },
  { id: "EVT-8841", timestamp: "2026-04-04 05:02:33 IST", type: "Customer", severity: "Info", user: "superadmin", action: "STORAGE_UPGRADED", resource: "tenant:globe-exports", ip: "103.24.108.1", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", sessionId: "sess_b2e4d81a", outcome: "SUCCESS", payload: { from: "50GB", to: "100GB" } },
  { id: "EVT-8840", timestamp: "2026-04-03 22:15:50 IST", type: "System", severity: "Info", user: "system", action: "AGENT_DEPLOYED", resource: "agent:bridge-v2.4.1", ip: "10.0.0.1", source: "Bridge", geo: "India, Mumbai DC", userAgent: "4DSmartOps-Agent/2.4.1", sessionId: "sess_sys_001", outcome: "SUCCESS", payload: { version: "2.4.1", agents_updated: 4 } },
  { id: "EVT-8839", timestamp: "2026-04-03 20:44:17 IST", type: "Data Export", severity: "Warning", user: "admin@4dsmartops.in", action: "AUDIT_LOG_EXPORTED", resource: "audit:all-events", ip: "103.24.108.45", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", sessionId: "sess_a7f3c91d", outcome: "SUCCESS", payload: { events_exported: 2847, format: "CSV" } },
  { id: "EVT-8838", timestamp: "2026-04-03 18:30:02 IST", type: "Security", severity: "Warning", user: "superadmin", action: "GEOFENCE_UPDATED", resource: "policy:geo-fencing", ip: "103.24.108.1", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", sessionId: "sess_b2e4d81a", outcome: "SUCCESS", payload: { countries_blocked: 4 } },
  { id: "EVT-8837", timestamp: "2026-04-03 16:20:11 IST", type: "User", severity: "Info", user: "admin@4dsmartops.in", action: "USER_ROLE_CHANGED", resource: "user:rahul.kumar@acmeindia.in", ip: "103.24.108.45", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", sessionId: "sess_a7f3c91d", outcome: "SUCCESS", payload: { from_role: "Read-Only", to_role: "Support Agent" } },
  { id: "EVT-8836", timestamp: "2026-04-03 14:55:30 IST", type: "Security", severity: "Critical", user: "unknown@hacker.xyz", action: "LOGIN_FAILED_BLOCKED", resource: "auth:login", ip: "91.132.137.22", source: "Tower", geo: "Russia, Moscow", userAgent: "python-requests/2.28.0", sessionId: "sess_none", outcome: "BLOCKED", payload: { reason: "Geo-fenced country", attempts: 1 } },
  { id: "EVT-8835", timestamp: "2026-04-03 13:10:45 IST", type: "Integration", severity: "Info", user: "system", action: "WEBHOOK_CONFIGURED", resource: "integration:slack-alerts", ip: "10.0.0.1", source: "Tower", geo: "India, Mumbai DC", userAgent: "4DSmartOps-System/1.0", sessionId: "sess_sys_002", outcome: "SUCCESS", payload: { webhook_url: "https://hooks.slack.com/***", channel: "#alerts" } },
  { id: "EVT-8834", timestamp: "2026-04-03 11:42:18 IST", type: "Billing", severity: "Info", user: "billing@4dsmartops.in", action: "PAYMENT_RECEIVED", resource: "payment:PAY-2026-089", ip: "49.36.12.4", source: "Tower", geo: "India, Telangana", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", sessionId: "sess_c5f2a33e", outcome: "SUCCESS", payload: { amount: "₹45,000", method: "NEFT", tenant: "Globe Exports" } },
  { id: "EVT-8833", timestamp: "2026-04-03 10:05:09 IST", type: "Customer", severity: "Info", user: "superadmin", action: "TENANT_SUSPENDED", resource: "tenant:xyz-solutions", ip: "103.24.108.1", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", sessionId: "sess_b2e4d81a", outcome: "SUCCESS", payload: { reason: "Payment overdue 90 days" } },
  { id: "EVT-8832", timestamp: "2026-04-03 08:30:00 IST", type: "System", severity: "Info", user: "system", action: "BACKUP_COMPLETED", resource: "system:daily-backup", ip: "10.0.0.1", source: "Tower", geo: "India, Mumbai DC", userAgent: "4DSmartOps-System/1.0", sessionId: "sess_sys_003", outcome: "SUCCESS", payload: { size: "2.4GB", duration: "4m 22s" } },
  { id: "EVT-8831", timestamp: "2026-04-03 07:15:44 IST", type: "Security", severity: "Warning", user: "superadmin", action: "PASSWORD_POLICY_UPDATED", resource: "policy:password", ip: "103.24.108.1", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", sessionId: "sess_b2e4d81a", outcome: "SUCCESS", payload: { min_length: 12, expiry_days: 90 } },
  { id: "EVT-8830", timestamp: "2026-04-02 21:45:33 IST", type: "User", severity: "Info", user: "admin@4dsmartops.in", action: "USER_SUSPENDED", resource: "user:inactive@oldclient.in", ip: "103.24.108.45", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", sessionId: "sess_a7f3c91d", outcome: "SUCCESS", payload: { reason: "Inactive 180+ days" } },
  { id: "EVT-8829", timestamp: "2026-04-02 19:22:10 IST", type: "Data Export", severity: "Info", user: "admin@4dsmartops.in", action: "TENANT_DATA_EXPORTED", resource: "export:acme-india-q4", ip: "103.24.108.45", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", sessionId: "sess_a7f3c91d", outcome: "SUCCESS", payload: { records: 12450, format: "JSON" } },
  { id: "EVT-8828", timestamp: "2026-04-02 17:08:55 IST", type: "Integration", severity: "Warning", user: "system", action: "API_RATE_LIMIT_HIT", resource: "integration:tally-api", ip: "10.0.0.1", source: "Bridge", geo: "India, Mumbai DC", userAgent: "4DSmartOps-Agent/2.4.1", sessionId: "sess_sys_004", outcome: "FAILED", payload: { endpoint: "/api/v1/vouchers", limit: "1000/hr", current: 1001 } },
  { id: "EVT-8827", timestamp: "2026-04-02 15:33:20 IST", type: "Security", severity: "Info", user: "admin@4dsmartops.in", action: "MFA_RECOVERY_GENERATED", resource: "user:admin@4dsmartops.in", ip: "103.24.108.45", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", sessionId: "sess_a7f3c91d", outcome: "SUCCESS", payload: { codes_generated: 10 } },
  { id: "EVT-8826", timestamp: "2026-04-02 13:50:41 IST", type: "Customer", severity: "Info", user: "superadmin", action: "TENANT_PLAN_CHANGED", resource: "tenant:bharat-traders", ip: "103.24.108.1", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", sessionId: "sess_b2e4d81a", outcome: "SUCCESS", payload: { from: "Starter", to: "Enterprise" } },
  { id: "EVT-8825", timestamp: "2026-04-02 11:15:08 IST", type: "System", severity: "Info", user: "system", action: "SSL_CERT_RENEWED", resource: "system:ssl-wildcard", ip: "10.0.0.1", source: "Tower", geo: "India, Mumbai DC", userAgent: "4DSmartOps-System/1.0", sessionId: "sess_sys_005", outcome: "SUCCESS", payload: { domain: "*.4dsmartops.in", expires: "2027-04-02" } },
  { id: "EVT-8824", timestamp: "2026-04-02 09:40:22 IST", type: "Billing", severity: "Info", user: "billing@4dsmartops.in", action: "SUBSCRIPTION_RENEWED", resource: "subscription:globe-exports", ip: "49.36.12.4", source: "Tower", geo: "India, Telangana", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", sessionId: "sess_c5f2a33e", outcome: "SUCCESS", payload: { plan: "Professional", amount: "₹12,000/mo" } },
  { id: "EVT-8823", timestamp: "2026-04-02 08:05:37 IST", type: "User", severity: "Info", user: "superadmin", action: "IMPERSONATION_START", resource: "user:demo@acmeindia.in", ip: "103.24.108.1", source: "Tower", geo: "India, Maharashtra", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", sessionId: "sess_b2e4d81a", outcome: "SUCCESS", payload: { reason: "Support ticket #TKT-C-044", read_only: true } },
];

// ── Config ─────────────────────────────────────────────
const TYPE_COLORS: Record<EventType, string> = {
  Security: "bg-red-500/15 text-red-400 border-red-500/20",
  Customer: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  User: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Billing: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  System: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Integration: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  "Data Export": "bg-slate-500/15 text-slate-400 border-slate-500/20",
};

const SEVERITY_COLORS: Record<Severity, string> = {
  Info: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  Warning: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Critical: "bg-red-500/15 text-red-400 border-red-500/20",
};

const SOURCE_COLORS: Record<Source, string> = {
  Tower: "bg-cyan-500/15 text-cyan-400",
  Bridge: "bg-emerald-500/15 text-emerald-400",
  ERP: "bg-purple-500/15 text-purple-400",
  Partner: "bg-amber-500/15 text-amber-400",
  "Customer Portal": "bg-blue-500/15 text-blue-400",
  API: "bg-slate-500/15 text-slate-400",
};

const OUTCOME_COLORS: Record<string, string> = {
  SUCCESS: "text-emerald-400",
  BLOCKED: "text-red-400",
  FAILED: "text-amber-400",
};

const DATE_PRESETS = ["Today", "Last 7 days", "Last 30 days", "Last 90 days"] as const;

// ── Helpers ────────────────────────────────────────────
function exportFile(data: AuditEvent[], format: "csv" | "json") {
  const date = new Date().toISOString().slice(0, 10);
  let content: string;
  let mime: string;
  let ext: string;

  if (format === "csv") {
    const headers = ["Timestamp", "Event ID", "Type", "Severity", "User", "Action", "Resource", "IP Address", "Source", "Outcome"];
    const rows = data.map(e => [e.timestamp, e.id, e.type, e.severity, e.user, e.action, e.resource, e.ip, e.source, e.outcome].join(","));
    content = [headers.join(","), ...rows].join("\n");
    mime = "text/csv";
    ext = "csv";
  } else {
    content = JSON.stringify(data, null, 2);
    mime = "application/json";
    ext = "json";
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-4dsmartops-${date}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${data.length} events as ${ext.toUpperCase()}`);
}

// ── Component ──────────────────────────────────────────
export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("Last 30 days");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [payloadOpen, setPayloadOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return EVENTS.filter((e) => {
      const matchSearch = !q ||
        e.user.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.resource.toLowerCase().includes(q) ||
        e.ip.includes(q) ||
        e.id.toLowerCase().includes(q);
      const matchType = typeFilter === "all" || e.type === typeFilter;
      const matchSource = sourceFilter === "all" || e.source === sourceFilter;
      const matchSeverity = severityFilter === "all" || e.severity === severityFilter;
      return matchSearch && matchType && matchSource && matchSeverity;
    });
  }, [search, typeFilter, sourceFilter, severityFilter]);

  const criticalCount = EVENTS.filter(e => e.severity === "Critical").length;
  const uniqueUsers = new Set(EVENTS.map(e => e.user)).size;
  const exportCount = EVENTS.filter(e => e.type === "Data Export").length;

  const openDetail = (evt: AuditEvent) => {
    setSelectedEvent(evt);
    setPayloadOpen(false);
    setDrawerOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setSourceFilter("all");
    setSeverityFilter("all");
    setDatePreset("Last 30 days");
  };

  return (
    <TowerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <ScrollText className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Audit Log Explorer</h1>
              <p className="text-sm text-slate-400">
                CERT-In Compliant · IT Act 2000 · 7-Year Immutable Retention · <span className="font-mono text-slate-500">[JWT]</span> Customer: All
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => exportFile(filtered, "csv")}
            >
              <Download className="h-4 w-4 mr-1.5" />Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              onClick={() => exportFile(filtered, "json")}
            >
              <Download className="h-4 w-4 mr-1.5" />Export JSON
            </Button>
          </div>
        </div>

        {/* CERT-In Banner */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
          <Shield className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-emerald-400">CERT-In Compliant Audit Trail</p>
            <p className="text-[11px] text-emerald-400/60">All platform events are immutably logged. Retained 7 years per IT Act 2000. Read-only — entries cannot be modified or deleted.</p>
          </div>
          <span className="ml-auto font-mono text-[10px] bg-emerald-500/10 text-emerald-400 rounded-full px-2.5 py-0.5 shrink-0">Immutable</span>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#1E3A5F] border border-slate-700 rounded-xl p-4 flex items-center gap-3 flex-wrap sticky top-0 z-10">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by user, action, resource, IP..."
              className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {(["Security", "Customer", "User", "Billing", "System", "Integration", "Data Export"] as EventType[]).map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {(["Tower", "Bridge", "ERP", "Partner", "Customer Portal", "API"] as Source[]).map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            {DATE_PRESETS.map(p => (
              <Button
                key={p}
                variant="ghost"
                size="sm"
                className={cn(
                  "text-xs px-2.5 h-8",
                  datePreset === p ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"
                )}
                onClick={() => setDatePreset(p)}
              >
                {p}
              </Button>
            ))}
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Info">Info</SelectItem>
              <SelectItem value="Warning">Warning</SelectItem>
              <SelectItem value="Critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <button className="text-xs text-cyan-400 hover:text-cyan-300 ml-auto" onClick={clearFilters}>Clear Filters</button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Events (filtered)", value: filtered.length.toLocaleString("en-IN"), color: "text-white" },
            { label: "Critical Events", value: criticalCount.toString(), color: "text-red-400" },
            { label: "Unique Users", value: uniqueUsers.toString(), color: "text-cyan-400" },
            { label: "Export Count (today)", value: exportCount.toString(), color: "text-amber-400" },
          ].map(s => (
            <div key={s.label} className="bg-[#1E3A5F] border border-slate-700 rounded-xl p-4">
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className={cn("text-2xl font-bold font-mono mt-1", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#1E3A5F] border border-slate-700 rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#0D1B2A] border-b border-slate-700 hover:bg-[#0D1B2A]">
                <TableHead className="text-slate-400 text-xs font-bold uppercase">Timestamp</TableHead>
                <TableHead className="text-slate-400 text-xs font-bold uppercase">Event ID</TableHead>
                <TableHead className="text-slate-400 text-xs font-bold uppercase">Type</TableHead>
                <TableHead className="text-slate-400 text-xs font-bold uppercase">Severity</TableHead>
                <TableHead className="text-slate-400 text-xs font-bold uppercase">User</TableHead>
                <TableHead className="text-slate-400 text-xs font-bold uppercase">Action</TableHead>
                <TableHead className="text-slate-400 text-xs font-bold uppercase">Resource</TableHead>
                <TableHead className="text-slate-400 text-xs font-bold uppercase">IP Address</TableHead>
                <TableHead className="text-slate-400 text-xs font-bold uppercase">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-slate-500 text-sm">No audit events match your filters</TableCell>
                </TableRow>
              ) : filtered.map((evt) => (
                <TableRow
                  key={evt.id}
                  className={cn(
                    "cursor-pointer border-b border-slate-700/50 hover:bg-[#1E3A5F]/80",
                    evt.severity === "Critical" && "bg-red-500/5"
                  )}
                  onClick={() => openDetail(evt)}
                >
                  <TableCell className="text-xs text-slate-400 font-mono whitespace-nowrap">{evt.timestamp}</TableCell>
                  <TableCell className="text-xs text-slate-500 font-mono">{evt.id}</TableCell>
                  <TableCell>
                    <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", TYPE_COLORS[evt.type])}>{evt.type}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", SEVERITY_COLORS[evt.severity])}>{evt.severity}</span>
                  </TableCell>
                  <TableCell className="text-sm text-white max-w-[160px] truncate">{evt.user}</TableCell>
                  <TableCell className="text-xs text-cyan-400 font-mono">{evt.action}</TableCell>
                  <TableCell className="text-xs text-slate-300 max-w-[160px] truncate">{evt.resource}</TableCell>
                  <TableCell className="text-xs text-slate-400 font-mono">{evt.ip}</TableCell>
                  <TableCell>
                    <span className={cn("text-[10px] font-semibold rounded-full px-2 py-0.5", SOURCE_COLORS[evt.source])}>{evt.source}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {filtered.length} of 2,847 events · Page 1 of 114
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled className="border-slate-700 text-slate-500">
              <ChevronLeft className="h-4 w-4 mr-1" />Prev
            </Button>
            <span className="text-xs text-slate-400 font-mono px-3">1</span>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Next<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[420px] bg-[#0D1B2A] border-l border-slate-700 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono text-lg text-cyan-400">{selectedEvent?.id}</SheetTitle>
          </SheetHeader>
          {selectedEvent && (
            <div className="mt-6 space-y-4">
              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-xs font-semibold border rounded-full px-2 py-0.5", TYPE_COLORS[selectedEvent.type])}>{selectedEvent.type}</span>
                <span className={cn("text-xs font-semibold border rounded-full px-2 py-0.5", SEVERITY_COLORS[selectedEvent.severity])}>{selectedEvent.severity}</span>
                <span className={cn("text-sm font-bold", OUTCOME_COLORS[selectedEvent.outcome])}>{selectedEvent.outcome}</span>
              </div>

              {/* Key-Value pairs */}
              {([
                ["Event ID", selectedEvent.id],
                ["Timestamp", selectedEvent.timestamp],
                ["Type", selectedEvent.type],
                ["Severity", selectedEvent.severity],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-white font-mono text-xs">{v}</span>
                </div>
              ))}

              <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                <span className="text-slate-500">User</span>
                <span className="text-white text-xs">{selectedEvent.user}</span>
              </div>

              <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                <span className="text-slate-500">Action</span>
                <span className="text-cyan-400 font-mono text-xs">{selectedEvent.action}</span>
              </div>

              <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                <span className="text-slate-500">Resource</span>
                <span className="text-slate-300 font-mono text-xs">{selectedEvent.resource}</span>
              </div>

              <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                <span className="text-slate-500">IP Address + Geo</span>
                <span className="text-slate-300 font-mono text-xs">{selectedEvent.ip} · {selectedEvent.geo}</span>
              </div>

              <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                <span className="text-slate-500">Source Panel</span>
                <span className={cn("text-xs rounded-full px-2 py-0.5", SOURCE_COLORS[selectedEvent.source])}>{selectedEvent.source}</span>
              </div>

              <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                <span className="text-slate-500">User Agent</span>
                <span className="text-slate-400 text-[10px] font-mono max-w-[220px] truncate">{selectedEvent.userAgent}</span>
              </div>

              <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                <span className="text-slate-500">Session ID</span>
                <span className="text-slate-400 font-mono text-xs">{selectedEvent.sessionId}</span>
              </div>

              <div className="flex justify-between text-sm border-b border-slate-700/50 pb-2">
                <span className="text-slate-500">Outcome</span>
                <span className={cn("text-sm font-bold", OUTCOME_COLORS[selectedEvent.outcome])}>{selectedEvent.outcome}</span>
              </div>

              {/* Raw Payload */}
              <Collapsible open={payloadOpen} onOpenChange={setPayloadOpen}>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 cursor-pointer w-full">
                  <Database className="h-3.5 w-3.5" />
                  <span>Raw Payload</span>
                  <span className="ml-auto text-xs text-slate-500">{payloadOpen ? "▼" : "▶"}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 bg-slate-900 border border-slate-700 rounded-lg p-3 text-[11px] text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedEvent.payload, null, 2)}
                  </pre>
                </CollapsibleContent>
              </Collapsible>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                  onClick={() => { navigator.clipboard.writeText(selectedEvent.id); toast.success("Event ID copied"); }}
                >
                  Copy Event ID
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
                  onClick={() => exportFile([selectedEvent], "json")}
                >
                  Export Entry
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </TowerLayout>
  );
}
