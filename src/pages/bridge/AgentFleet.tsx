import { useState } from "react";
import { toast } from "sonner";
import {
  Radio, Wifi, WifiOff, AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { BridgeLayout } from "@/components/layout/BridgeLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type AgentStatus =
  | "IDLE"              // No active sync — scheduler waiting
  | "PRECHECK"          // Verifying ODBC, internet, API health
  | "FULL_SYNC"         // Historical baseline sync in progress
  | "DELTA_SYNC"        // Regular incremental sync running
  | "OFFLINE_QUEUE"     // Internet unavailable — batches queued locally
  | "RETRY_WAIT"        // Backoff period after transient failure
  | "DEADLETTER_REVIEW" // Batch exceeded retry limit — operator action required
  | "PAUSED"            // Admin or maintenance pause
  | "FAULTED";          // Fatal error — service cannot continue safely

const STATE_CONFIG: Record<AgentStatus, {label:string;color:string;dot:string;desc:string}> = {
  IDLE:              {label:'Idle',            color:'text-muted-foreground bg-muted border-border',                          dot:'bg-muted-foreground',            desc:'Waiting for next scheduled sync'},
  PRECHECK:          {label:'Pre-Check',       color:'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',                      dot:'bg-cyan-400 animate-pulse',      desc:'Verifying ODBC, internet, and API health'},
  FULL_SYNC:         {label:'Full Sync',       color:'text-amber-400 bg-amber-500/10 border-amber-500/20',                   dot:'bg-amber-400 animate-pulse',     desc:'Historical baseline sync in progress'},
  DELTA_SYNC:        {label:'Delta Sync',      color:'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',             dot:'bg-emerald-400 animate-pulse',   desc:'Incremental sync running'},
  OFFLINE_QUEUE:     {label:'Offline-Queuing',  color:'text-orange-400 bg-orange-500/10 border-orange-500/20',               dot:'bg-orange-400 animate-pulse',    desc:'Internet unavailable — batches queued locally'},
  RETRY_WAIT:        {label:'Retry Wait',      color:'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',                dot:'bg-yellow-400',                  desc:'Backoff period after transient failure'},
  DEADLETTER_REVIEW: {label:'Action Required', color:'text-red-400 bg-red-500/10 border-red-500/20',                         dot:'bg-red-400 animate-pulse',       desc:'Batch exceeded retry limit — operator must act'},
  PAUSED:            {label:'Paused',          color:'text-slate-400 bg-slate-500/10 border-slate-500/20',                    dot:'bg-slate-400',                   desc:'Manually paused by admin'},
  FAULTED:           {label:'Faulted',         color:'text-red-600 bg-red-600/10 border-red-600/30 font-bold',               dot:'bg-red-600 animate-pulse',       desc:'Fatal error — service cannot continue safely'},
};

interface Agent {
  id: string;
  hostname: string;
  tallyVersion: string;
  status: AgentStatus;
  lastHeartbeat: string;
  currentTask: string | null;
  uptimePercent: number;
  agentVersion: string;
  os: string;
  ipLocal: string;
  companies: string[];
  lastSync: string;
  sparkline: number[];
  predictiveWarning?: string;
}

// ─── [JWT] BRIDGE TIER SCOPING ────────────────────────────────────────────
// Replace this mock data with a real fetch scoped by JWT tier:
//   Tier 1 (4DSO Dev/IT Team):  GET /api/bridge/agents              → full fleet, all clients
//   Tier 2 (Partner IT Team):   GET /api/bridge/agents?partnerId={jwt.partnerId}  → their clients only
//   Tier 3 (Customer IT Admin): GET /api/bridge/agents?tenantId={jwt.tenantId}    → own company only
// JWT payload shape: { userId, role, tier: 1|2|3, partnerId?: string, tenantId?: string }
// ─────────────────────────────────────────────────────────────────────────

const AGENTS: Agent[] = [
  {
    id: "AGENT-01",
    hostname: "tally-srv-01.reliancedigital.in",
    tallyVersion: "Tally Prime 7.0",
    status: "DELTA_SYNC",
    lastHeartbeat: "2s ago",
    currentTask: "Sync Sales Vouchers — Reliance Digital",
    uptimePercent: 99.8,
    agentVersion: "v1.0.4",
    os: "Windows Server 2022",
    ipLocal: "192.168.1.101",
    companies: ["Reliance Digital Solutions"],
    lastSync: "03 Apr 2026, 09:10 IST",
    sparkline: [95,98,100,100,97,100,100,95,88,100,100,100,98,100,100,100,97,100,100,95,100,100,98,100],
  },
  {
    id: "AGENT-02",
    hostname: "tally-srv-02.tatamotors.in",
    tallyVersion: "Tally Prime 7.0",
    status: "FULL_SYNC",
    lastHeartbeat: "5s ago",
    currentTask: null,
    uptimePercent: 97.2,
    agentVersion: "v1.0.4",
    os: "Windows 11 Pro",
    ipLocal: "10.0.1.45",
    companies: ["Tata Motors Finance"],
    lastSync: "03 Apr 2026, 08:52 IST",
    sparkline: [100,90,85,100,100,78,100,100,95,100,88,100,100,100,92,100,100,100,85,100,100,95,100,100],
    predictiveWarning: "Response time degrading — 73% probability of timeout in next sync window",
  },
  {
    id: "AGENT-03",
    hostname: "tally-branch-01.infosysbpm.in",
    tallyVersion: "Tally Prime 6.1",
    status: "OFFLINE_QUEUE",
    lastHeartbeat: "15m ago",
    currentTask: null,
    uptimePercent: 82.1,
    agentVersion: "v1.0.3",
    os: "Windows 10 Pro",
    ipLocal: "172.16.0.22",
    companies: ["Infosys BPM Limited"],
    lastSync: "03 Apr 2026, 07:30 IST",
    sparkline: [100,100,95,100,100,100,90,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  },
  {
    id: "AGENT-04",
    hostname: "tally-branch-02.wipro.in",
    tallyVersion: "Tally Prime 7.0",
    status: "DEADLETTER_REVIEW",
    lastHeartbeat: "1m ago",
    currentTask: "Connection retry — attempt 3/5",
    uptimePercent: 91.5,
    agentVersion: "v1.0.4",
    os: "Windows Server 2019",
    ipLocal: "10.10.0.88",
    companies: ["Wipro Enterprises"],
    lastSync: "02 Apr 2026, 11:45 IST",
    sparkline: [100,100,100,95,100,100,88,100,50,30,45,60,80,100,100,95,100,100,40,55,70,85,90,60],
  },
];

const DIAGNOSTICS: Record<string, { operation: string; duration: string; result: string; latency: string }[]> = {
  "AGENT-01": [
    { operation: "Sync Sales Vouchers",  duration: "2m 15s", result: "Success", latency: "45ms" },
    { operation: "Sync Ledger Masters",  duration: "1m 30s", result: "Success", latency: "38ms" },
    { operation: "Sync Stock Items",     duration: "4m 02s", result: "Success", latency: "52ms" },
    { operation: "Heartbeat Check",      duration: "0.2s",   result: "Success", latency: "12ms" },
    { operation: "ODBC Connection Test", duration: "0.5s",   result: "Success", latency: "8ms" },
  ],
  "AGENT-04": [
    { operation: "Sync Sales Vouchers",  duration: "3m 45s", result: "Failed",  latency: "120ms" },
    { operation: "Connection Test",      duration: "0.5s",   result: "Success", latency: "8ms" },
    { operation: "Sync Ledger Masters",  duration: "2m 10s", result: "Success", latency: "41ms" },
    { operation: "Sync Stock Items",     duration: "—",      result: "Timeout", latency: "5000ms" },
    { operation: "Heartbeat Check",      duration: "0.3s",   result: "Success", latency: "15ms" },
  ],
};

const LOGS: Record<string, string> = {
  "AGENT-01": `[2026-04-03 09:10:22 IST] INFO  Heartbeat OK — latency 12ms
[2026-04-03 09:09:55 IST] INFO  Sync Sales Vouchers batch 45/50 — 890 records
[2026-04-03 09:09:30 IST] WARN  Slow response from Tally — 850ms
[2026-04-03 09:09:02 IST] INFO  Heartbeat OK — latency 15ms
[2026-04-03 09:08:45 IST] INFO  Sync Sales Vouchers batch 44/50 — 870 records
[2026-04-03 09:08:02 IST] INFO  Heartbeat OK — latency 11ms`,
  "AGENT-04": `[2026-04-03 09:14:02 IST] ERROR Connection timeout — Tally not responding on port 9000
[2026-04-03 09:13:55 IST] WARN  Retry attempt 3/5
[2026-04-03 09:13:30 IST] ERROR Sync failed — ODBC disconnected
[2026-04-03 09:12:02 IST] INFO  Heartbeat OK — latency 45ms
[2026-04-03 09:11:30 IST] WARN  Tally response slow — 2100ms
[2026-04-03 09:10:02 IST] ERROR JSON write failed: connection refused`,
};

function Sparkline({ data, status }: { data: number[]; status: AgentStatus }) {
  const h = 32;
  const points = data.map((v, i) => `${(i / 23) * 100},${(1 - v / 100) * h}`).join(" ");
  const strokeColor =
    ["DELTA_SYNC","IDLE","PRECHECK"].includes(status) ? "hsl(var(--success))" :
    ["FAULTED","DEADLETTER_REVIEW"].includes(status) ? "hsl(var(--destructive))" :
    ["FULL_SYNC","RETRY_WAIT"].includes(status) ? "hsl(45 93% 47%)" :
    "hsl(var(--muted-foreground))";
  return (
    <svg width="100%" height={h} className="mt-3 mb-3" preserveAspectRatio="none" viewBox={`0 0 100 ${h}`}>
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function getLatencyMs(lat: string): number {
  return parseInt(lat.replace("ms", ""), 10) || 0;
}

export default function AgentFleet() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(AGENTS[0]);
  const [activeTab, setActiveTab] = useState("diagnostics");

  const openLogs = (agent: Agent) => { setSelectedAgent(agent); setActiveTab("logs"); };
  const openDiagnostics = (agent: Agent) => { setSelectedAgent(agent); setActiveTab("diagnostics"); };

  const syncingCount   = AGENTS.filter(a=>["FULL_SYNC","DELTA_SYNC","PRECHECK"].includes(a.status)).length;
  const healthyCount   = AGENTS.filter(a=>a.status==="IDLE").length;
  const degradedCount  = AGENTS.filter(a=>["OFFLINE_QUEUE","RETRY_WAIT","PAUSED"].includes(a.status)).length;
  const criticalCount  = AGENTS.filter(a=>["DEADLETTER_REVIEW","FAULTED"].includes(a.status)).length;

  const diagData = selectedAgent ? (DIAGNOSTICS[selectedAgent.id] || DIAGNOSTICS["AGENT-01"]) : DIAGNOSTICS["AGENT-01"];
  const logData = selectedAgent ? (LOGS[selectedAgent.id] || LOGS["AGENT-01"]) : LOGS["AGENT-01"];

  return (
    <BridgeLayout title="Agent Fleet Health" subtitle="All Bridge Agents — connection status, diagnostics and logs">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Syncing", count: syncingCount, icon: Radio, color: "text-cyan-400", sub: "Active sync in progress" },
          { label: "Idle / Healthy", count: healthyCount, icon: Wifi, color: "text-muted-foreground", sub: "Waiting for next schedule" },
          { label: "Degraded", count: degradedCount, icon: WifiOff, color: "text-amber-400", sub: "Offline-queue, retry, or paused" },
          { label: "Action Required", count: criticalCount, icon: AlertTriangle, color: "text-red-400", sub: "Dead-letter or faulted", pulse: criticalCount > 0 },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <p className={cn("text-2xl font-bold font-mono", s.color)}>{s.count}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {AGENTS.map((agent) => (
          <div
            key={agent.id}
            onClick={() => { setSelectedAgent(agent); setActiveTab("diagnostics"); }}
            className={cn(
              "bg-card border rounded-xl p-5 cursor-pointer transition-colors",
              agent.status==="FAULTED"            && "border-red-600/30 bg-red-600/5",
              agent.status==="DEADLETTER_REVIEW"   && "border-red-400/20 bg-red-500/5",
              agent.status==="DELTA_SYNC"           && "border-emerald-500/20",
              agent.status==="FULL_SYNC"            && "border-amber-500/20",
              !["FAULTED","DEADLETTER_REVIEW","DELTA_SYNC","FULL_SYNC"].includes(agent.status) && "border-border",
              selectedAgent?.id === agent.id && "ring-1 ring-primary/40"
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold text-foreground">{agent.id}</p>
                <p className="font-mono text-xs text-muted-foreground truncate">{agent.hostname}</p>
                {agent.currentTask ? (
                  <p className="text-xs text-primary italic mt-1">{agent.currentTask}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Idle</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className={cn(
                  "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border",
                  STATE_CONFIG[agent.status].color
                )}>
                  <span className={cn("w-2 h-2 rounded-full", STATE_CONFIG[agent.status].dot)} />
                  {STATE_CONFIG[agent.status].label}
                </span>
                <p className="text-[10px] font-mono text-muted-foreground mt-1">{agent.lastHeartbeat}</p>
              </div>
            </div>

            <Sparkline data={agent.sparkline} status={agent.status} />

            {/* Description line */}
            <p className="text-[10px] text-muted-foreground mt-0.5">{STATE_CONFIG[agent.status].desc}</p>

            {/* Stats */}
            <div className="flex gap-6 text-xs flex-wrap mt-2">
              <span>
                Uptime:{" "}
                <span className={cn(
                  "font-mono",
                  agent.uptimePercent >= 99 ? "text-success" : agent.uptimePercent >= 90 ? "text-warning" : "text-destructive"
                )}>{agent.uptimePercent}%</span>
              </span>
              <span className="text-muted-foreground">Companies: {agent.companies.length}</span>
              <span className="font-mono text-muted-foreground">{agent.agentVersion}</span>
              <span className="text-muted-foreground">{agent.tallyVersion}</span>
            </div>

            {/* Predictive Warning */}
            {agent.predictiveWarning && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-2 mt-3 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                <span className="text-xs text-warning">{agent.predictiveWarning}</span>
              </div>
            )}

            {/* Footer actions */}
            <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" onClick={() => openLogs(agent)}>View Logs</Button>
              <Button variant="outline" size="sm" onClick={() => openDiagnostics(agent)}>Diagnostics</Button>
              {(["DEADLETTER_REVIEW","FAULTED","OFFLINE_QUEUE"].includes(agent.status)) && (
                <Button size="sm" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => toast(`Restart command sent to ${agent.id}...`)}>
                  Restart Agent
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="diagnostics">Diagnostics — {selectedAgent?.id || "—"}</TabsTrigger>
          <TabsTrigger value="logs">Live Logs — {selectedAgent?.id || "—"}</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostics">
          {!selectedAgent ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Select an agent above to view diagnostics</div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Latency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diagData.map((d, i) => {
                    const ms = getLatencyMs(d.latency);
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-sm text-foreground">{d.operation}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{d.duration}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-xs border rounded-md px-2 py-0.5",
                            d.result === "Success" && "bg-success/10 text-success border-success/20",
                            d.result === "Failed" && "bg-destructive/10 text-destructive border-destructive/20",
                            d.result === "Timeout" && "bg-warning/10 text-warning border-warning/20",
                          )}>{d.result}</span>
                        </TableCell>
                        <TableCell className={cn(
                          "font-mono text-xs",
                          ms <= 50 ? "text-success" : ms <= 200 ? "text-warning" : "text-destructive"
                        )}>{d.latency}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs">
          {!selectedAgent ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Select an agent above to view logs</div>
          ) : (
            <>
              <div className="bg-background border border-border rounded-xl p-4 max-h-64 overflow-y-auto">
                {logData.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "font-mono text-xs leading-relaxed whitespace-pre-wrap",
                      line.includes("ERROR") ? "text-destructive" :
                      line.includes("WARN") ? "text-warning" :
                      line.includes("INFO") ? "text-success/80" :
                      "text-muted-foreground"
                    )}
                  >{line}</div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => toast(`Refreshing logs for ${selectedAgent.id}...`)}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh Logs
              </Button>
            </>
          )}
        </TabsContent>
      </Tabs>
    </BridgeLayout>
  );
}
