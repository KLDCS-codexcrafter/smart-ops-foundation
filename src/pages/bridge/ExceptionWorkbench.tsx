import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, Search, RotateCcw, SkipForward,
  Eye, Lightbulb, SearchX, TrendingDown,
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
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

type ExceptionCategory =
  | "data_validation" | "mapping_error" | "tally_rejection"
  | "timeout" | "duplicate" | "amount_mismatch";

type ExceptionSeverity = "high" | "medium" | "low";

interface Exception {
  id: string;
  requestId: string;
  company: string;
  tenantId: string;
  module: string;
  category: ExceptionCategory;
  severity: ExceptionSeverity;
  message: string;
  record: string;
  age: string;
  suggestedFix: string | null;
  rawData: string;
  status: "open" | "retrying" | "skipped" | "resolved";
}

// ─── [JWT] BRIDGE TIER SCOPING ────────────────────────────────────────────
// Replace this mock data with a real fetch scoped by JWT tier:
//   Tier 1 (4DSO Dev/IT Team):  GET /api/bridge/exceptions              → full fleet, all clients
//   Tier 2 (Partner IT Team):   GET /api/bridge/exceptions?partnerId={jwt.partnerId}  → their clients only
//   Tier 3 (Customer IT Admin): GET /api/bridge/exceptions?tenantId={jwt.tenantId}    → own company only
// JWT payload shape: { userId, role, tier: 1|2|3, partnerId?: string, tenantId?: string }
// ─────────────────────────────────────────────────────────────────────────

const EXCEPTIONS: Exception[] = [
  {
    id: "EXC-001",
    requestId: "REQ-0042",
    company: "Reliance Digital Solutions",
    tenantId: "TNT-001",
    module: "Sales Vouchers",
    category: "amount_mismatch",
    severity: "high",
    message: "Amount mismatch: expected ₹45,000 received ₹54,000",
    record: "Sales Voucher SV-2847",
    age: "2h 15m",
    suggestedFix: null,
    rawData: '{\n  "voucherNo": "SV-2847",\n  "amount": 54000,\n  "expected": 45000,\n  "ledger": "Sales A/c",\n  "date": "2026-04-03"\n}',
    status: "open",
  },
  {
    id: "EXC-002",
    requestId: "REQ-0042",
    company: "Reliance Digital Solutions",
    tenantId: "TNT-001",
    module: "Sales Vouchers",
    category: "mapping_error",
    severity: "medium",
    message: "Ledger 'Travel Expenses' not found in Tally",
    record: "Journal Entry JV-1204",
    age: "2h 15m",
    suggestedFix: "Did you mean 'Travelling Expenses'? This ledger exists in Tally Prime with 98% name similarity.",
    rawData: '{\n  "voucherNo": "JV-1204",\n  "ledger": "Travel Expenses",\n  "amount": 12500,\n  "date": "2026-04-03"\n}',
    status: "open",
  },
  {
    id: "EXC-003",
    requestId: "REQ-0036",
    company: "Havells India",
    tenantId: "TNT-011",
    module: "Ledger Masters",
    category: "tally_rejection",
    severity: "high",
    message: "Duplicate ledger name: 'Cash Account'",
    record: "Ledger GL-0089",
    age: "5h 30m",
    suggestedFix: "A ledger named 'Cash Account' already exists in Tally. Rename to 'Cash Account (Havells)' or merge with existing ledger.",
    rawData: '{\n  "ledgerId": "GL-0089",\n  "name": "Cash Account",\n  "group": "Cash-in-Hand",\n  "openingBalance": 0\n}',
    status: "open",
  },
  {
    id: "EXC-004",
    requestId: "REQ-0035",
    company: "Wipro Enterprises",
    tenantId: "TNT-004",
    module: "Sales Vouchers",
    category: "timeout",
    severity: "low",
    message: "AGENT-04 connection timeout during write operation",
    record: "Stock Item SKU-0412",
    age: "1d 2h",
    suggestedFix: "Agent AGENT-04 has been restarted. Retry this record — the timeout was transient.",
    rawData: '{\n  "stockId": "SKU-0412",\n  "name": "Widget A — Premium",\n  "qty": 500,\n  "rate": 120.50\n}',
    status: "open",
  },
  {
    id: "EXC-005",
    requestId: "REQ-0037",
    company: "Tata Motors Finance",
    tenantId: "TNT-002",
    module: "Purchase Vouchers",
    category: "data_validation",
    severity: "medium",
    message: "Invalid GSTIN format for supplier: Sharma Traders",
    record: "Purchase Voucher PV-0891",
    age: "3h 45m",
    suggestedFix: "GSTIN '27AABCS1234' is missing the last character. Correct format: '27AABCS1234X1ZX'. Verify with supplier.",
    rawData: '{\n  "voucherNo": "PV-0891",\n  "supplier": "Sharma Traders",\n  "gstin": "27AABCS1234",\n  "amount": 84000\n}',
    status: "open",
  },
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

const CATEGORY_CONFIG: Record<ExceptionCategory, { label: string; color: string }> = {
  data_validation: { label: "Data Validation", color: "bg-warning/10 text-warning border-warning/20" },
  mapping_error:   { label: "Mapping Error",   color: "bg-destructive/10 text-destructive border-destructive/20" },
  tally_rejection: { label: "Tally Rejection", color: "bg-destructive/10 text-destructive border-destructive/20" },
  timeout:         { label: "Timeout",         color: "bg-secondary text-muted-foreground border-border" },
  duplicate:       { label: "Duplicate",       color: "bg-warning/10 text-warning border-warning/20" },
  amount_mismatch: { label: "Amount Mismatch", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const SEVERITY_CONFIG = {
  high:   { color: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  medium: { color: "bg-warning/10 text-warning border-warning/20",             dot: "bg-warning" },
  low:    { color: "bg-secondary text-muted-foreground border-border",          dot: "bg-muted-foreground" },
};

export default function ExceptionWorkbench() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedExc, setSelectedExc] = useState<Exception | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const openDetail = (exc: Exception) => {
    setSelectedExc(exc);
    setShowDetail(true);
  };

  const filtered = EXCEPTIONS.filter((e) => {
    const q = search.toLowerCase();
    const matchSearch =
      e.message.toLowerCase().includes(q) ||
      e.record.toLowerCase().includes(q) ||
      e.company.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q);
    const matchSeverity = severityFilter === "all" || e.severity === severityFilter;
    const matchCategory = categoryFilter === "all" || e.category === categoryFilter;
    return matchSearch && matchSeverity && matchCategory;
  });

  const openCount = EXCEPTIONS.filter((e) => e.status === "open").length;
  const highCount = EXCEPTIONS.filter((e) => e.severity === "high").length;

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
            <p className="text-2xl font-bold font-mono text-destructive">{highCount}</p>
            <p className="text-xs text-muted-foreground">High Severity</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold font-mono text-success">3.2h</p>
            <p className="text-xs text-muted-foreground">Avg Resolution Time</p>
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
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="amount_mismatch">Amount Mismatch</SelectItem>
            <SelectItem value="data_validation">Data Validation</SelectItem>
            <SelectItem value="mapping_error">Mapping Error</SelectItem>
            <SelectItem value="tally_rejection">Tally Rejection</SelectItem>
            <SelectItem value="timeout">Timeout</SelectItem>
            <SelectItem value="duplicate">Duplicate</SelectItem>
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

      {/* 4. TABLE */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Request</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Suggested Fix</TableHead>
              <TableHead>Age</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12">
                  <SearchX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No exceptions found</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((exc) => (
                <TableRow
                  key={exc.id}
                  className={cn("cursor-pointer hover:bg-muted/30", exc.severity === "high" && "bg-destructive/5")}
                  onClick={() => openDetail(exc)}
                >
                  <TableCell className="font-mono text-xs text-primary font-semibold cursor-pointer hover:underline">{exc.id}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{exc.requestId}</TableCell>
                  <TableCell>
                    <span className="text-xs text-foreground">{exc.company}</span>
                    <br />
                    <span className="font-mono text-[10px] text-muted-foreground/60">{exc.tenantId}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{exc.module}</TableCell>
                  <TableCell>
                    <span className={cn("text-xs border rounded-md px-2 py-0.5", CATEGORY_CONFIG[exc.category].color)}>
                      {CATEGORY_CONFIG[exc.category].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <span className={cn("w-2 h-2 rounded-full inline-block", SEVERITY_CONFIG[exc.severity].dot)} />
                      <span className="text-xs capitalize">{exc.severity}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-foreground max-w-[180px] truncate" title={exc.message}>{exc.message}</TableCell>
                  <TableCell>
                    {exc.suggestedFix ? (
                      <span className="flex items-center gap-1 text-xs text-warning">
                        <Lightbulb className="h-3.5 w-3.5" /> Fix available
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{exc.age}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 5. DETAIL SHEET */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent side="right" className="w-[520px] overflow-y-auto">
          {selectedExc && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono text-lg text-primary">{selectedExc.id}</SheetTitle>
                <div className="flex gap-2 mt-1">
                  <span className={cn("text-xs border rounded-md px-2 py-0.5", CATEGORY_CONFIG[selectedExc.category].color)}>
                    {CATEGORY_CONFIG[selectedExc.category].label}
                  </span>
                  <span className={cn("text-xs border rounded-md px-2 py-0.5", SEVERITY_CONFIG[selectedExc.severity].color)}>
                    {selectedExc.severity.charAt(0).toUpperCase() + selectedExc.severity.slice(1)}
                  </span>
                </div>
                <p className="text-sm text-foreground mt-2">{selectedExc.message}</p>
              </SheetHeader>

              <div className="space-y-5 mt-6">
                {/* Details */}
                <div className="space-y-2">
                  {[
                    ["Exception ID", selectedExc.id, true],
                    ["Request ID", selectedExc.requestId, true],
                    ["Company", selectedExc.company, false],
                    ["Tenant ID", selectedExc.tenantId, true],
                    ["Module", selectedExc.module, false],
                    ["Record", selectedExc.record, true],
                    ["Age", selectedExc.age, false],
                    ["Status", selectedExc.status, false],
                  ].map(([label, value, mono]) => (
                    <div key={label as string} className="flex items-center justify-between py-1.5 border-b border-border">
                      <span className="text-xs text-muted-foreground">{label as string}</span>
                      <span className={cn("text-xs text-foreground", mono && "font-mono")}>{value as string}</span>
                    </div>
                  ))}
                </div>

                {/* Suggested Fix */}
                {selectedExc.suggestedFix ? (
                  <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-warning" />
                      <span className="text-sm font-semibold text-warning">AI Suggested Fix</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mt-2">{selectedExc.suggestedFix}</p>
                    <Button
                      className="w-full mt-3 bg-gradient-to-r from-primary to-primary/80"
                      onClick={() => toast(`Applying suggested fix for ${selectedExc.id}...`)}
                    >
                      Apply Fix
                    </Button>
                  </div>
                ) : (
                  <div className="bg-muted/20 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">No automated fix available. Manual review required.</p>
                  </div>
                )}

                {/* Raw Data */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Raw Record Data</p>
                  <div className="bg-[hsl(var(--background))] border border-border rounded-lg p-3 mt-2">
                    <pre className="font-mono text-xs text-success leading-relaxed whitespace-pre">{selectedExc.rawData}</pre>
                  </div>
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
          )}
        </SheetContent>
      </Sheet>
    </BridgeLayout>
  );
}
