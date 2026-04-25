import { useState } from "react";
import { toast } from "sonner";
import { Search, RotateCcw, SkipForward, Eye, Lightbulb, SearchX } from "lucide-react";
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
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

// Step 1 — Exception types
type ExceptionCode =
  |"EX-ODBC-001"|"EX-ODBC-002"|"EX-ODBC-003"
  |"EX-QRY-001" |"EX-QRY-002"
  |"EX-NRM-001"
  |"EX-CHK-001"
  |"EX-UPL-001" |"EX-UPL-002"
  |"EX-REC-001"
  |"EX-OPS-001"
  |"EX-SVC-001";
type ExceptionSeverity = "Fatal"|"Blocking"|"Recoverable"|"Diagnostic";

// Step 2 — EXCEPTION_CATALOG
const EXCEPTION_CATALOG: Record<ExceptionCode, {category:string;severity:ExceptionSeverity;meaning:string;response:string}> = {
  "EX-ODBC-001":{category:"Connectivity",     severity:"Fatal",       meaning:"ODBC DSN/connection not reachable",                  response:"Block extraction. Alert operator. Test connection."},
  "EX-ODBC-002":{category:"Access",            severity:"Blocking",    meaning:"Company/object access not permitted",                response:"Review Tally access context and selected company."},
  "EX-ODBC-003":{category:"Query Timeout",     severity:"Recoverable", meaning:"Query exceeded execution threshold",                response:"Retry with smaller batch or lower concurrency."},
  "EX-QRY-001": {category:"Catalog",           severity:"Blocking",    meaning:"Query code not found or inactive",                  response:"Deploy corrected query package."},
  "EX-QRY-002": {category:"Schema Drift",      severity:"Blocking",    meaning:"Expected field not returned by source query",       response:"Review query version and object compatibility."},
  "EX-NRM-001": {category:"Normalization",      severity:"Blocking",    meaning:"Row could not be transformed to canonical",         response:"Move batch to quarantine and inspect mapping."},
  "EX-CHK-001": {category:"Checkpoint",         severity:"Fatal",       meaning:"Checkpoint write failed or corrupted",              response:"Pause service and recover local state store."},
  "EX-UPL-001": {category:"Transport",          severity:"Recoverable", meaning:"Cloud API unreachable or network failed",           response:"Retry with exponential backoff."},
  "EX-UPL-002": {category:"Payload Rejected",   severity:"Blocking",    meaning:"Cloud rejected schema or business validation",     response:"Route to exception queue. Fix contract or mapping."},
  "EX-REC-001": {category:"Reconciliation",     severity:"Diagnostic",  meaning:"Acknowledged counts differ from source",           response:"Run targeted reconcile and replay workflow."},
  "EX-OPS-001": {category:"Configuration",      severity:"Blocking",    meaning:"Required config missing",                          response:"Block run until corrected."},
  "EX-SVC-001": {category:"Service Lifecycle",  severity:"Fatal",       meaning:"Service crash or unexpected termination",           response:"Auto-restart and write incident log."},
};

const SEVERITY_COLOR: Record<ExceptionSeverity, string> = {
  Fatal:       "text-red-600 bg-red-600/10 border-red-600/20",
  Blocking:    "text-red-400 bg-red-500/10 border-red-500/20",
  Recoverable: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Diagnostic:  "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

interface Exception {
  id: string;
  code: ExceptionCode;
  company: string;
  module: string;
  agentId: string;
  batchId: string;
  occurredAt: string;
  status: "open" | "resolved";
}

// ─── [JWT] BRIDGE TIER SCOPING ────────────────────────────────────────────
// Replace this mock data with a real fetch scoped by JWT tier
// ─────────────────────────────────────────────────────────────────────────

// Step 3 — EXCEPTIONS mock array
const EXCEPTIONS: Exception[] = [
  {id:"EXC-001",code:"EX-ODBC-003",company:"Wipro Enterprises",       module:"Stock Items",       agentId:"AGENT-04",batchId:"BATCH-20260403-000045",occurredAt:"03 Apr 2026, 09:14 IST",status:"open"},
  {id:"EXC-002",code:"EX-UPL-002", company:"Wipro Enterprises",       module:"Purchase Vouchers", agentId:"AGENT-04",batchId:"BATCH-20260403-000039",occurredAt:"03 Apr 2026, 08:55 IST",status:"open"},
  {id:"EXC-003",code:"EX-REC-001", company:"Havells India",           module:"Ledger Masters",    agentId:"AGENT-01",batchId:"BATCH-20260402-000184",occurredAt:"02 Apr 2026, 16:15 IST",status:"open"},
  {id:"EXC-004",code:"EX-QRY-002", company:"Tata Motors Finance",     module:"Payroll Masters",   agentId:"AGENT-02",batchId:"BATCH-20260402-000102",occurredAt:"02 Apr 2026, 14:30 IST",status:"resolved"},
  {id:"EXC-005",code:"EX-ODBC-002",company:"Infosys BPM Limited",     module:"Company Profile",   agentId:"AGENT-03",batchId:"BATCH-20260401-000056",occurredAt:"01 Apr 2026, 11:00 IST",status:"resolved"},
];

const TREND_DATA = [
  { day: "28 Mar", count: 12 },
  { day: "29 Mar", count: 9 },
  { day: "30 Mar", count: 15 },
  { day: "31 Mar", count: 8 },
  { day: "01 Apr", count: 6 },
  { day: "02 Apr", count: 4 },
  { day: "03 Apr", count: 5 },
];

export function ExceptionWorkbenchPanel() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [codeFilter, setCodeFilter] = useState("all");
  const [selectedExc, setSelectedExc] = useState<Exception | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const openDetail = (exc: Exception) => {
    setSelectedExc(exc);
    setShowDetail(true);
  };

  const filtered = EXCEPTIONS.filter((e) => {
    const q = search.toLowerCase();
    const cat = EXCEPTION_CATALOG[e.code];
    const matchSearch =
      cat.meaning.toLowerCase().includes(q) ||
      e.company.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      e.code.toLowerCase().includes(q);
    const matchSeverity = severityFilter === "all" || cat.severity === severityFilter;
    const matchCode = codeFilter === "all" || e.code === codeFilter;
    return matchSearch && matchSeverity && matchCode;
  });

  const openCount = EXCEPTIONS.filter((e) => e.status === "open").length;
  const fatalCount = EXCEPTIONS.filter((e) => EXCEPTION_CATALOG[e.code].severity === "Fatal").length;
  const blockingCount = EXCEPTIONS.filter((e) => EXCEPTION_CATALOG[e.code].severity === "Blocking").length;

  return (
    <BridgeLayout title="Exception Workbench" subtitle="Triage failed records — resolve, retry or skip">
      {/* 1. TREND + STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Trend chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-semibold text-foreground">Exception Trend — Last 7 Days</p>
          <p className="text-xs text-muted-foreground mb-3">Total exceptions by day</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={TREND_DATA}>
              <defs>
                <linearGradient id="exGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area dataKey="count" stroke="hsl(var(--destructive))" strokeWidth={2} fill="url(#exGrad)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-mono text-destructive">{openCount}</p>
            <p className="text-xs text-muted-foreground">Total Open</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-mono text-red-600">{fatalCount}</p>
            <p className="text-xs text-muted-foreground">Fatal</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-mono text-red-400">{blockingCount}</p>
            <p className="text-xs text-muted-foreground">Blocking</p>
          </div>
        </div>
      </div>

      {/* 2. TOOLBAR */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search exceptions..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Fatal">Fatal</SelectItem>
            <SelectItem value="Blocking">Blocking</SelectItem>
            <SelectItem value="Recoverable">Recoverable</SelectItem>
            <SelectItem value="Diagnostic">Diagnostic</SelectItem>
          </SelectContent>
        </Select>
        <Select value={codeFilter} onValueChange={setCodeFilter}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Exception Code" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Codes</SelectItem>
            <SelectItem value="EX-ODBC-001">EX-ODBC-001 — ODBC Unreachable</SelectItem>
            <SelectItem value="EX-ODBC-002">EX-ODBC-002 — Access Denied</SelectItem>
            <SelectItem value="EX-ODBC-003">EX-ODBC-003 — Query Timeout</SelectItem>
            <SelectItem value="EX-QRY-001">EX-QRY-001 — Query Not Found</SelectItem>
            <SelectItem value="EX-QRY-002">EX-QRY-002 — Schema Drift</SelectItem>
            <SelectItem value="EX-NRM-001">EX-NRM-001 — Normalization Failed</SelectItem>
            <SelectItem value="EX-CHK-001">EX-CHK-001 — Checkpoint Failure</SelectItem>
            <SelectItem value="EX-UPL-001">EX-UPL-001 — Transport Failure</SelectItem>
            <SelectItem value="EX-UPL-002">EX-UPL-002 — Payload Rejected</SelectItem>
            <SelectItem value="EX-REC-001">EX-REC-001 — Reconciliation Mismatch</SelectItem>
            <SelectItem value="EX-OPS-001">EX-OPS-001 — Config Incomplete</SelectItem>
            <SelectItem value="EX-SVC-001">EX-SVC-001 — Service Crash</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="ml-auto" onClick={() => toast("Retrying all open exceptions...")}>
          <RotateCcw className="h-4 w-4 mr-1" /> Retry All Open
        </Button>
      </div>

      {/* 3. RESULTS COUNT */}
      <p className="text-xs text-muted-foreground mb-3">
        Showing {filtered.length} of {EXCEPTIONS.length} exceptions
      </p>

      {/* 4. TABLE — Step 4 rendering */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Occurred</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12">
                  <SearchX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No exceptions found</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((exc) => {
                const cat = EXCEPTION_CATALOG[exc.code];
                return (
                  <TableRow
                    key={exc.id}
                    className={cn("cursor-pointer hover:bg-muted/30",
                      cat.severity === "Fatal" && "bg-red-600/5",
                      cat.severity === "Blocking" && "bg-red-500/5",
                    )}
                    onClick={() => openDetail(exc)}
                  >
                    <TableCell className="font-mono text-xs text-primary font-semibold">{exc.id}</TableCell>
                    <TableCell className="font-mono text-xs text-foreground">{exc.code}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{cat.category}</TableCell>
                    <TableCell>
                      <span className={cn("text-xs border rounded-md px-2 py-0.5", SEVERITY_COLOR[cat.severity])}>
                        {cat.severity}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-foreground">{exc.company}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{exc.module}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{exc.agentId}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{exc.batchId}</TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{exc.occurredAt}</TableCell>
                    <TableCell>
                      <span className={cn("text-xs border rounded-md px-2 py-0.5",
                        exc.status === "open" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      )}>{exc.status}</span>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(exc)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast(`Retrying ${exc.id}...`)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast(`Skipping ${exc.id} — logged`)}>
                          <SkipForward className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 5. DETAIL SHEET */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent side="right" className="w-[520px] overflow-y-auto">
          {selectedExc && (() => {
            const cat = EXCEPTION_CATALOG[selectedExc.code];
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="font-mono text-lg text-primary">{selectedExc.id}</SheetTitle>
                  <div data-keyboard-form className="flex gap-2 mt-1 flex-wrap">
                    <span className="font-mono text-xs text-foreground border border-border rounded-md px-2 py-0.5">{selectedExc.code}</span>
                    <span className="text-xs text-muted-foreground border border-border rounded-md px-2 py-0.5">{cat.category}</span>
                    <span className={cn("text-xs border rounded-md px-2 py-0.5", SEVERITY_COLOR[cat.severity])}>
                      {cat.severity}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-2">{cat.meaning}</p>
                </SheetHeader>

                <div className="space-y-5 mt-6">
                  {/* Response */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-semibold text-amber-400">Standard Response</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mt-2">{cat.response}</p>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    {([
                      ["Exception ID", selectedExc.id, true],
                      ["Code", selectedExc.code, true],
                      ["Category", cat.category, false],
                      ["Severity", cat.severity, false],
                      ["Company", selectedExc.company, false],
                      ["Module", selectedExc.module, false],
                      ["Agent", selectedExc.agentId, true],
                      ["Batch", selectedExc.batchId, true],
                      ["Occurred", selectedExc.occurredAt, false],
                      ["Status", selectedExc.status, false],
                    ] as [string, string, boolean][]).map(([label, value, mono]) => (
                      <div key={label} className="flex items-center justify-between py-1.5 border-b border-border">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className={cn("text-xs text-foreground", mono && "font-mono")}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={() => toast(`Retrying ${selectedExc.id}...`)}>
                      <RotateCcw className="h-4 w-4 mr-1" /> Retry This Record
                    </Button>
                    <Button variant="outline" className="w-full text-muted-foreground" onClick={() => toast(`${selectedExc.id} skipped — marked as acknowledged`)}>
                      <SkipForward className="h-4 w-4 mr-1" /> Skip Record
                    </Button>
                    <Button className="w-full bg-gradient-to-r from-primary to-primary/80" onClick={() => toast("Edit mode coming soon")}>
                      Edit & Retry
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </BridgeLayout>
  );
}

export default function ExceptionWorkbench() {
  return <ExceptionWorkbenchPanel />;
}
