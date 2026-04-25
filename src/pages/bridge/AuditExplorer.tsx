import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck, ScrollText, Activity, AlertTriangle,
  Radio, Lock, Download,
} from "lucide-react";
import { BridgeLayout } from "@/components/layout/BridgeLayout";
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

type AuditOperation = "read" | "write" | "validate" | "approve" | "reconcile"
  | "exception" | "agent_event" | "user_action";

interface SyncAuditLog {
  id: string;
  requestId: string;
  operation: AuditOperation;
  actor: string;
  company: string;
  module: string;
  records: number;
  result: "success" | "failure" | "warning";
  timestamp: string;
  details: string;
  agentId: string;
}

// ─── [JWT] BRIDGE TIER SCOPING ────────────────────────────────────────────
// Replace this mock data with a real fetch scoped by JWT tier:
//   Tier 1 (4DSO Dev/IT Team):  GET /api/bridge/audit-events              → full fleet, all clients
//   Tier 2 (Partner IT Team):   GET /api/bridge/audit-events?partnerId={jwt.partnerId}  → their clients only
//   Tier 3 (Customer IT Admin): GET /api/bridge/audit-events?tenantId={jwt.tenantId}    → own company only
// JWT payload shape: { userId, role, tier: 1|2|3, partnerId?: string, tenantId?: string }
// ─────────────────────────────────────────────────────────────────────────

const SYNC_AUDIT: SyncAuditLog[] = [
  { id: "SAU-0091", requestId: "REQ-0042", operation: "read", actor: "AGENT-01", company: "Reliance Digital", module: "Sales Vouchers", records: 8920, result: "success", timestamp: "03 Apr 2026, 09:10:22 IST", details: "ODBC read completed — 8,920 records", agentId: "AGENT-01" },
  { id: "SAU-0090", requestId: "REQ-0042", operation: "validate", actor: "System", company: "Reliance Digital", module: "Sales Vouchers", records: 8920, result: "success", timestamp: "03 Apr 2026, 09:11:30 IST", details: "Validation passed — 0 errors, 0 warnings", agentId: "AGENT-01" },
  { id: "SAU-0089", requestId: "REQ-0042", operation: "approve", actor: "System", company: "Reliance Digital", module: "Sales Vouchers", records: 8920, result: "success", timestamp: "03 Apr 2026, 09:11:31 IST", details: "Auto-approved: below 10,000 record threshold", agentId: "AGENT-01" },
  { id: "SAU-0088", requestId: "REQ-0041", operation: "user_action", actor: "vikram.nair@tatamotors.com", company: "Tata Motors Finance", module: "Ledger Masters", records: 0, result: "success", timestamp: "03 Apr 2026, 08:52:00 IST", details: "Sync request submitted for approval", agentId: "AGENT-02" },
  { id: "SAU-0087", requestId: "REQ-0039", operation: "approve", actor: "Platform Admin", company: "Wipro Enterprises", module: "Purchase Vouchers", records: 5640, result: "success", timestamp: "03 Apr 2026, 08:30:00 IST", details: "Manually approved by Platform Admin — Risk score 87", agentId: "AGENT-04" },
  { id: "SAU-0086", requestId: "REQ-0038", operation: "exception", actor: "AGENT-04", company: "Wipro Enterprises", module: "Sales Vouchers", records: 3, result: "failure", timestamp: "02 Apr 2026, 11:45:00 IST", details: "3 records failed: EXC-001, EXC-002, EXC-004", agentId: "AGENT-04" },
  { id: "SAU-0085", requestId: "REQ-0037", operation: "reconcile", actor: "System", company: "Reliance Digital", module: "Voucher Receipts", records: 324, result: "success", timestamp: "02 Apr 2026, 19:30:00 IST", details: "Reconciliation complete — 324/324 records matched", agentId: "AGENT-01" },
  { id: "SAU-0084", requestId: "REQ-0037", operation: "write", actor: "AGENT-01", company: "Reliance Digital", module: "Voucher Receipts", records: 324, result: "success", timestamp: "02 Apr 2026, 18:45:00 IST", details: "JSON HTTP write to Tally Prime — port 9000", agentId: "AGENT-01" },
  { id: "SAU-0083", requestId: "REQ-0036", operation: "agent_event", actor: "AGENT-03", company: "Infosys BPM", module: "—", records: 0, result: "warning", timestamp: "03 Apr 2026, 07:15:00 IST", details: "Agent went offline — last heartbeat 15m ago", agentId: "AGENT-03" },
];

const RESULT_CONFIG: Record<string, { label: string; color: string }> = {
  success: { label: "Success", color: "bg-success/10 text-success border-success/20" },
  failure: { label: "Failure", color: "bg-destructive/10 text-destructive border-destructive/20" },
  warning: { label: "Warning", color: "bg-warning/10 text-warning border-warning/20" },
};

const OPERATIONS: AuditOperation[] = [
  "read", "write", "validate", "approve", "reconcile", "exception", "agent_event", "user_action",
];

const uniqueAgents = new Set(SYNC_AUDIT.map((l) => l.agentId)).size;
const failWarnCount = SYNC_AUDIT.filter((l) => l.result !== "success").length;

const auditStats = [
  { label: "Total Logs", value: SYNC_AUDIT.length, icon: ScrollText, color: "text-primary" },
  { label: "Operations", value: OPERATIONS.length, icon: Activity, color: "text-primary" },
  { label: "Failures / Warnings", value: failWarnCount, icon: AlertTriangle, color: "text-destructive" },
  { label: "Agents Logged", value: uniqueAgents, icon: Radio, color: "text-accent-foreground" },
];

export function AuditExplorerPanel() { return <AuditExplorer />; }
export default function AuditExplorer() {
  const [search, setSearch] = useState("");
  const [opFilter, setOpFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [showDetail, setShowDetail] = useState(false);
  const [detailLog, setDetailLog] = useState<SyncAuditLog | null>(null);

  const openDetail = (log: SyncAuditLog) => {
    setDetailLog(log);
    setShowDetail(true);
  };

  const filtered = SYNC_AUDIT.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch =
      l.id.toLowerCase().includes(q) ||
      l.requestId.toLowerCase().includes(q) ||
      l.company.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q);
    const matchOp = opFilter === "all" || l.operation === opFilter;
    const matchResult = resultFilter === "all" || l.result === resultFilter;
    return matchSearch && matchOp && matchResult;
  });

  return (
    <BridgeLayout title="Audit Explorer" subtitle="Immutable sync audit trail — CERT-In compliant">
      {/* CERT-In Banner */}
      <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-success shrink-0" />
          <div>
            <p className="text-sm font-semibold text-success">CERT-In Compliant Sync Audit</p>
            <p className="text-xs text-success/80">All Bridge sync operations are logged immutably. Retained 7 years per IT Act 2000.</p>
          </div>
        </div>
        <span className="font-mono text-xs bg-success/20 text-success rounded-full px-3 py-1 shrink-0">Immutable</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {auditStats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <p className={cn("text-2xl font-bold mt-1 font-mono", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Input
          placeholder="Search logs..."
          className="w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={opFilter} onValueChange={setOpFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Operation" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Operations</SelectItem>
            {OPERATIONS.map((op) => (
              <SelectItem key={op} value={op} className="capitalize">
                {op.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Result" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="ml-auto" onClick={() => toast("Exporting audit log as CSV...")}>
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      {/* Read-only notice */}
      <div className="flex items-center gap-2 mb-3">
        <Lock className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Read-only — entries cannot be modified</span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Request</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Records</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">No audit logs match filters</TableCell>
              </TableRow>
            ) : filtered.map((log) => {
              const rc = RESULT_CONFIG[log.result];
              return (
                <TableRow
                  key={log.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/30",
                    log.result === "failure" && "bg-destructive/5"
                  )}
                  onClick={() => openDetail(log)}
                >
                  <TableCell className="font-mono text-xs text-primary hover:underline">{log.id}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.requestId}</TableCell>
                  <TableCell className="text-xs capitalize">{log.operation.replace("_", " ")}</TableCell>
                  <TableCell className="text-xs text-foreground max-w-[120px] truncate">{log.actor}</TableCell>
                  <TableCell className="text-xs text-foreground">{log.company}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.module}</TableCell>
                  <TableCell className="font-mono text-xs">{log.records > 0 ? log.records.toLocaleString("en-IN") : "—"}</TableCell>
                  <TableCell>
                    <span className={cn("text-xs border rounded-lg px-2 py-0.5", rc.color)}>{rc.label}</span>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground">{log.timestamp}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent className="w-[460px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono text-lg text-primary">{detailLog?.id}</SheetTitle>
          </SheetHeader>
          {detailLog && (
            <div data-keyboard-form className="mt-6 space-y-4">
              <div>
                {(() => { const rc = RESULT_CONFIG[detailLog.result]; return (
                  <span className={cn("text-xs border rounded-lg px-2 py-0.5", rc.color)}>{rc.label}</span>
                ); })()}
              </div>

              {[
                ["Request ID", detailLog.requestId],
                ["Operation", detailLog.operation.replace("_", " ")],
                ["Actor", detailLog.actor],
                ["Company", detailLog.company],
                ["Module", detailLog.module],
                ["Records", detailLog.records > 0 ? detailLog.records.toLocaleString("en-IN") : "—"],
                ["Agent", detailLog.agentId],
                ["Timestamp", detailLog.timestamp],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-foreground font-mono text-xs">{value}</span>
                </div>
              ))}

              <div className="bg-muted/30 rounded-lg p-3 text-sm text-foreground">{detailLog.details}</div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { navigator.clipboard.writeText(detailLog.id); toast("Log ID copied"); }}>
                  Copy Log ID
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => toast("Exporting entry...")}>
                  Export Entry
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </BridgeLayout>
  );
}
