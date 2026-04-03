import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ShieldAlert, Clock, AlertTriangle, XCircle,
  CheckCircle2, Info, ChevronRight,
} from "lucide-react";
import { BridgeLayout } from "@/components/layout/BridgeLayout";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ── Mock Data ──────────────────────────────────────────────────────────────

const PIPELINE = [
  { state: "draft",       label: "Draft",       count: 2,  color: "text-muted-foreground bg-muted" },
  { state: "submitted",   label: "Submitted",   count: 3,  color: "text-info bg-info/10" },
  { state: "validating",  label: "Validating",  count: 1,  color: "text-warning bg-warning/10" },
  { state: "approved",    label: "Approved",     count: 4,  color: "text-primary bg-primary/10" },
  { state: "queued",      label: "Queued",       count: 2,  color: "text-accent bg-accent/10" },
  { state: "executing",   label: "Executing",    count: 1,  color: "text-success bg-success/10" },
  { state: "verifying",   label: "Verifying",    count: 1,  color: "text-success bg-success/10" },
  { state: "reconciled",  label: "Reconciled",   count: 28, color: "text-success bg-success/10" },
];

const RISK_ICONS: Record<string, React.ElementType> = {
  ShieldAlert,
  Clock,
  AlertTriangle,
  XCircle,
};

const RISK_CARDS = [
  { label: "Blocked Requests",      value: 2, detail: "Oldest: 3h 15m",       icon: "ShieldAlert",   color: "text-destructive", link: "/bridge/exceptions" },
  { label: "Pending Approvals",     value: 3, detail: "SLA: 1h 45m left",     icon: "Clock",         color: "text-warning",     link: "/bridge/approvals" },
  { label: "Agent Errors",          value: 1, detail: "AGENT-04 timeout",      icon: "AlertTriangle", color: "text-destructive", link: "/bridge/agents" },
  { label: "Failed Reconciliations",value: 2, detail: "1 pending sign-off",    icon: "XCircle",       color: "text-warning",     link: "/bridge/reconciliation" },
];

const COMPANY_HEALTH = [
  { name: "Reliance Digital Solutions", tenantId: "TNT-001", score: 94, syncs: 156, errors: 2,  agentId: "AGENT-01", agentStatus: "online" },
  { name: "Tata Motors Finance",        tenantId: "TNT-002", score: 78, syncs: 89,  errors: 8,  agentId: "AGENT-02", agentStatus: "online" },
  { name: "Infosys BPM Limited",        tenantId: "TNT-003", score: 97, syncs: 234, errors: 1,  agentId: "AGENT-03", agentStatus: "offline" },
  { name: "Wipro Enterprises",          tenantId: "TNT-004", score: 62, syncs: 45,  errors: 12, agentId: "AGENT-04", agentStatus: "error" },
];

const SMART_QUEUE = [
  { id: "REQ-0042", company: "Reliance Digital",    module: "Sales Vouchers",    priority: 95, reason: "SLA urgent + large dataset (8,920 records)" },
  { id: "REQ-0041", company: "Tata Motors Finance", module: "Ledger Masters",    priority: 82, reason: "Tenant tier: Enterprise" },
  { id: "REQ-0040", company: "Infosys BPM",         module: "Stock Items",       priority: 71, reason: "Scheduled window approaching" },
  { id: "REQ-0039", company: "Reliance Digital",    module: "Purchase Vouchers", priority: 65, reason: "Standard priority" },
  { id: "REQ-0038", company: "Wipro Enterprises",   module: "Journal Entries",   priority: 45, reason: "Low volume, no SLA pressure" },
];

const ACTIVITY = [
  { id: "1", type: "success", message: "REQ-0037 reconciled successfully", time: "2 min ago",  detail: "324 records matched" },
  { id: "2", type: "info",    message: "REQ-0038 submitted for approval",  time: "5 min ago",  detail: "Reliance Digital — Vouchers" },
  { id: "3", type: "warning", message: "REQ-0035 validation warning",      time: "12 min ago", detail: "3 records flagged for review" },
  { id: "4", type: "success", message: "REQ-0036 auto-approved",           time: "15 min ago", detail: "Below approval threshold" },
  { id: "5", type: "error",   message: "REQ-0034 execution failed",        time: "23 min ago", detail: "AGENT-04 timeout" },
  { id: "6", type: "success", message: "AGENT-01 reconnected",             time: "28 min ago", detail: "Latency: 12ms" },
];

const AGENTS = [
  { id: "AGENT-01", status: "online",  company: "Reliance Digital",    lastSeen: "2s ago" },
  { id: "AGENT-02", status: "online",  company: "Tata Motors Finance", lastSeen: "5s ago" },
  { id: "AGENT-03", status: "offline", company: "Infosys BPM",         lastSeen: "15m ago" },
  { id: "AGENT-04", status: "error",   company: "Wipro Enterprises",   lastSeen: "1m ago" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const activityIcon: Record<string, { Icon: React.ElementType; cls: string }> = {
  success: { Icon: CheckCircle2, cls: "text-success" },
  error:   { Icon: XCircle,      cls: "text-destructive" },
  warning: { Icon: AlertTriangle, cls: "text-warning" },
  info:    { Icon: Info,          cls: "text-info" },
};

function healthColor(score: number) {
  if (score >= 90) return "bg-success";
  if (score >= 70) return "bg-warning";
  return "bg-destructive";
}

function priorityColor(p: number) {
  if (p >= 80) return { text: "text-destructive", bar: "bg-destructive" };
  if (p >= 60) return { text: "text-warning", bar: "bg-warning" };
  return { text: "text-success", bar: "bg-success" };
}

function agentDot(status: string) {
  if (status === "online") return "bg-success animate-pulse";
  if (status === "error") return "bg-destructive animate-pulse";
  return "bg-muted-foreground";
}

function agentLabel(status: string) {
  if (status === "online") return { text: "Online", cls: "text-success" };
  if (status === "error") return { text: "Error", cls: "text-destructive" };
  return { text: "Offline", cls: "text-muted-foreground" };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ConsoleDashboard() {
  const navigate = useNavigate();
  const pipelineTotal = PIPELINE.reduce((s, p) => s + p.count, 0);

  return (
    <BridgeLayout title="Bridge Console" subtitle="Tally Prime sync operations — live overview">
      {/* 1. PIPELINE STRIP */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="mb-3">
          <p className="text-sm font-semibold text-foreground">Sync Pipeline</p>
          <p className="text-xs text-muted-foreground">
            8-stage workflow — <span className="font-mono">{pipelineTotal}</span> active requests
          </p>
        </div>
        <div className="flex items-center gap-0">
          {PIPELINE.map((stage, i) => (
            <div key={stage.state} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => toast(`Filtering by ${stage.label} coming soon`)}
                className="flex flex-col items-center w-full group cursor-pointer"
              >
                <span className={cn("text-lg font-bold font-mono rounded-xl px-3 py-1 text-center transition-transform group-hover:scale-105", stage.color)}>
                  {stage.count}
                </span>
                <span className="text-[10px] text-muted-foreground mt-1">{stage.label}</span>
              </button>
              {i < PIPELINE.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground/30 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. RISK CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {RISK_CARDS.map((card) => {
          const RiskIcon = RISK_ICONS[card.icon];
          return (
            <button
              key={card.label}
              onClick={() => navigate(card.link)}
              className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors text-left"
            >
              <div className="flex items-start justify-between mb-2">
                <RiskIcon className={cn("h-5 w-5", card.color)} />
                <span className={cn("text-2xl font-bold font-mono", card.color)}>{card.value}</span>
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
              <p className="text-xs font-mono text-muted-foreground/70 mt-0.5">{card.detail}</p>
            </button>
          );
        })}
      </div>

      {/* 3. MAIN CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Health */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4">
              <p className="text-sm font-semibold text-foreground">Company Health</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-right">Syncs</TableHead>
                  <TableHead className="text-right">Errors</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPANY_HEALTH.map((c) => {
                  const al = agentLabel(c.agentStatus);
                  return (
                    <TableRow key={c.tenantId}>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground/60">{c.tenantId}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{c.agentId}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-foreground">{c.syncs}</TableCell>
                      <TableCell className="text-right">
                        {c.errors === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="text-destructive font-mono font-semibold">{c.errors}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={cn("h-full rounded-full", healthColor(c.score))} style={{ width: `${c.score}%` }} />
                          </div>
                          <span className="font-mono text-xs">{c.score}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-2 h-2 rounded-full", agentDot(c.agentStatus))} />
                          <span className={cn("text-xs", al.cls)}>{al.text}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Smart Queue */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Smart Queue</p>
              <Badge className="bg-accent/10 text-accent border-accent/30 text-xs">AI Prioritised</Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Request</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SMART_QUEUE.map((q) => {
                  const pc = priorityColor(q.priority);
                  return (
                    <TableRow key={q.id}>
                      <TableCell>
                        <span className={cn("font-mono font-bold", pc.text)}>{q.priority}</span>
                        <div className={cn("w-16 h-1 rounded-full mt-1", pc.bar)} />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-primary">{q.id}</TableCell>
                      <TableCell className="text-xs text-foreground">{q.company}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{q.module}</TableCell>
                      <TableCell className="text-xs text-muted-foreground/70 italic max-w-[200px] truncate">{q.reason}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-1 space-y-6">
          {/* Agent Fleet */}
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Agent Fleet</p>
            {AGENTS.map((a, i) => (
              <div key={a.id} className={cn("flex items-center gap-3 py-2", i < AGENTS.length - 1 && "border-b border-border/50")}>
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", agentDot(a.status))} />
                <span className="font-mono text-xs text-foreground">{a.id}</span>
                <span className="text-[10px] text-muted-foreground truncate flex-1">{a.company}</span>
                <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto shrink-0">{a.lastSeen}</span>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={() => navigate("/bridge/agents")}>
              View All Agents
            </Button>
          </div>

          {/* Live Activity */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Live Activity</p>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] text-success">Live</span>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {ACTIVITY.map((a) => {
                const ai = activityIcon[a.type] ?? activityIcon.info;
                return (
                  <div key={a.id} className="flex items-start gap-2 p-3 border-b border-border/40 last:border-0">
                    <ai.Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", ai.cls)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground">{a.message}</p>
                      <p className="text-[10px] text-muted-foreground">{a.detail}</p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto shrink-0">{a.time}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </BridgeLayout>
  );
}
