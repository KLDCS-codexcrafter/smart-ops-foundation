import { useState } from "react";
import { toast } from "sonner";
import {
  Activity, Zap, AlertCircle, CheckCircle2,
  Search, Plus, Eye, Pause, RotateCcw, Play,
  SearchX, ArrowRight, ArrowLeft, Circle,
  Loader2, XCircle,
} from "lucide-react";
import { BridgeLayout } from "@/components/layout/BridgeLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type SyncState =
  | "draft" | "submitted" | "validating" | "approved"
  | "queued" | "executing" | "verifying" | "reconciled"
  | "failed" | "cancelled";

type SyncDirection = "tally_to_cloud" | "cloud_to_tally";
type SyncPriority = "critical" | "high" | "medium" | "low";

interface SyncRequest {
  id: string;
  requestNo: string;
  company: string;
  tenantId: string;
  module: string;
  direction: SyncDirection;
  state: SyncState;
  priority: SyncPriority;
  records: number;
  processed: number;
  errors: number;
  agentId: string;
  initiatedBy: string;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  slaStatus: "ok" | "warning" | "breached";
  notes?: string;
}

// ─── [JWT] BRIDGE TIER SCOPING ────────────────────────────────────────────
// Replace this mock data with a real fetch scoped by JWT tier:
//   Tier 1 (4DSO Dev/IT Team):  GET /api/bridge/sync-jobs              → full fleet, all clients
//   Tier 2 (Partner IT Team):   GET /api/bridge/sync-jobs?partnerId={jwt.partnerId}  → their clients only
//   Tier 3 (Customer IT Admin): GET /api/bridge/sync-jobs?tenantId={jwt.tenantId}    → own company only
// JWT payload shape: { userId, role, tier: 1|2|3, partnerId?: string, tenantId?: string }
// ─────────────────────────────────────────────────────────────────────────

const SYNC_REQUESTS: SyncRequest[] = [
  { id: "sr-001", requestNo: "REQ-0042", company: "Reliance Digital Solutions", tenantId: "TNT-001", module: "Sales Vouchers", direction: "tally_to_cloud", state: "executing", priority: "critical", records: 8920, processed: 6240, errors: 0, agentId: "AGENT-01", initiatedBy: "arjun.mehta@reliancedigital.in", createdAt: "03 Apr 2026, 08:00 IST", updatedAt: "03 Apr 2026, 09:10 IST", slaDeadline: "03 Apr 2026, 10:00 IST", slaStatus: "warning" },
  { id: "sr-002", requestNo: "REQ-0041", company: "Tata Motors Finance", tenantId: "TNT-002", module: "Ledger Masters", direction: "tally_to_cloud", state: "approved", priority: "high", records: 1200, processed: 0, errors: 0, agentId: "AGENT-02", initiatedBy: "vikram.nair@tatamotors.com", createdAt: "03 Apr 2026, 07:45 IST", updatedAt: "03 Apr 2026, 08:52 IST", slaDeadline: "03 Apr 2026, 12:00 IST", slaStatus: "ok" },
  { id: "sr-003", requestNo: "REQ-0040", company: "Infosys BPM Limited", tenantId: "TNT-003", module: "Stock Items", direction: "tally_to_cloud", state: "validating", priority: "medium", records: 3400, processed: 0, errors: 0, agentId: "AGENT-01", initiatedBy: "rajesh.iyer@infosysbpm.com", createdAt: "03 Apr 2026, 07:30 IST", updatedAt: "03 Apr 2026, 09:05 IST", slaDeadline: "03 Apr 2026, 14:00 IST", slaStatus: "ok" },
  { id: "sr-004", requestNo: "REQ-0039", company: "Wipro Enterprises", tenantId: "TNT-004", module: "Purchase Vouchers", direction: "tally_to_cloud", state: "submitted", priority: "medium", records: 5640, processed: 0, errors: 0, agentId: "AGENT-04", initiatedBy: "suresh.p@wipro.com", createdAt: "03 Apr 2026, 07:00 IST", updatedAt: "03 Apr 2026, 07:00 IST", slaDeadline: "03 Apr 2026, 13:00 IST", slaStatus: "ok" },
  { id: "sr-005", requestNo: "REQ-0038", company: "Mahindra Logistics", tenantId: "TNT-005", module: "Journal Entries", direction: "cloud_to_tally", state: "queued", priority: "low", records: 280, processed: 0, errors: 0, agentId: "AGENT-01", initiatedBy: "kiran.patil@mahindra.com", createdAt: "03 Apr 2026, 06:30 IST", updatedAt: "03 Apr 2026, 06:30 IST", slaDeadline: "04 Apr 2026, 06:30 IST", slaStatus: "ok" },
  { id: "sr-006", requestNo: "REQ-0037", company: "Reliance Digital Solutions", tenantId: "TNT-001", module: "Voucher Receipts", direction: "tally_to_cloud", state: "reconciled", priority: "high", records: 324, processed: 324, errors: 0, agentId: "AGENT-01", initiatedBy: "priya.sharma@reliancedigital.in", createdAt: "02 Apr 2026, 18:00 IST", updatedAt: "02 Apr 2026, 19:30 IST", slaDeadline: "02 Apr 2026, 20:00 IST", slaStatus: "ok", notes: "All 324 records matched" },
  { id: "sr-007", requestNo: "REQ-0036", company: "Havells India", tenantId: "TNT-011", module: "Ledger Masters", direction: "tally_to_cloud", state: "reconciled", priority: "medium", records: 890, processed: 887, errors: 3, agentId: "AGENT-01", initiatedBy: "pooja.reddy@havells.com", createdAt: "02 Apr 2026, 14:00 IST", updatedAt: "02 Apr 2026, 16:15 IST", slaDeadline: "02 Apr 2026, 18:00 IST", slaStatus: "ok", notes: "3 exceptions — amount mismatch" },
  { id: "sr-008", requestNo: "REQ-0035", company: "Wipro Enterprises", tenantId: "TNT-004", module: "Sales Vouchers", direction: "tally_to_cloud", state: "failed", priority: "critical", records: 2100, processed: 1840, errors: 12, agentId: "AGENT-04", initiatedBy: "suresh.p@wipro.com", createdAt: "02 Apr 2026, 10:00 IST", updatedAt: "02 Apr 2026, 11:45 IST", slaDeadline: "02 Apr 2026, 12:00 IST", slaStatus: "breached", notes: "AGENT-04 connection timeout" },
];

const REPLAY_STEPS = [
  { step: 1, action: "Read", detail: "Read 8,920 voucher records from Tally Prime via ODBC", status: "success", duration: "1m 12s" },
  { step: 2, action: "Transform", detail: "Applied field mapping — Sales Voucher template", status: "success", duration: "0m 18s" },
  { step: 3, action: "Validate", detail: "Validated 8,920 records — 0 errors, 0 warnings", status: "success", duration: "0m 45s" },
  { step: 4, action: "Approve", detail: "Auto-approved: below 10,000 record threshold", status: "success", duration: "0m 01s" },
  { step: 5, action: "Execute", detail: "Writing 8,920 records to 4DSmartOps cloud database...", status: "running", duration: "ongoing" },
  { step: 6, action: "Verify", detail: "Pending execution completion", status: "pending", duration: "—" },
  { step: 7, action: "Reconcile", detail: "Pending verification", status: "pending", duration: "—" },
];

const STATE_CONFIG: Record<SyncState, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-secondary text-muted-foreground border-border" },
  submitted: { label: "Submitted", color: "bg-info/10 text-info border-info/20" },
  validating: { label: "Validating", color: "bg-warning/10 text-warning border-warning/20" },
  approved: { label: "Approved", color: "bg-primary/10 text-primary border-primary/20" },
  queued: { label: "Queued", color: "bg-accent/10 text-accent border-accent/20" },
  executing: { label: "Executing", color: "bg-success/10 text-success border-success/20" },
  verifying: { label: "Verifying", color: "bg-success/10 text-success border-success/20" },
  reconciled: { label: "Reconciled", color: "bg-success/10 text-success border-success/20" },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelled: { label: "Cancelled", color: "bg-secondary text-muted-foreground border-border" },
};

const PRIORITY_CONFIG: Record<SyncPriority, { label: string; color: string }> = {
  critical: { label: "Critical", color: "bg-destructive/10 text-destructive border-destructive/20" },
  high: { label: "High", color: "bg-warning/10 text-warning border-warning/20" },
  medium: { label: "Medium", color: "bg-info/10 text-info border-info/20" },
  low: { label: "Low", color: "bg-secondary text-muted-foreground border-border" },
};

const SLA_CONFIG = {
  ok: "text-success",
  warning: "text-warning",
  breached: "text-destructive font-semibold",
};

const DIRECTION_LABEL: Record<SyncDirection, string> = {
  tally_to_cloud: "Tally → Cloud",
  cloud_to_tally: "Cloud → Tally",
};

export default function SyncMonitor() {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SyncRequest | null>(null);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [newCompany, setNewCompany] = useState("");
  const [newModule, setNewModule] = useState("");
  const [newDirection, setNewDirection] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [newFromDate, setNewFromDate] = useState("");
  const [newToDate, setNewToDate] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const filtered = SYNC_REQUESTS.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      r.requestNo.toLowerCase().includes(q) ||
      r.company.toLowerCase().includes(q) ||
      r.module.toLowerCase().includes(q);
    const matchState = stateFilter === "all" || r.state === stateFilter;
    const matchPriority = priorityFilter === "all" || r.priority === priorityFilter;
    const matchDirection = directionFilter === "all" || r.direction === directionFilter;
    return matchSearch && matchState && matchPriority && matchDirection;
  });

  const activeSyncs = SYNC_REQUESTS.filter((r) =>
    ["executing", "validating", "approved", "queued", "submitted"].includes(r.state)
  ).length;
  const executingNow = SYNC_REQUESTS.filter((r) => r.state === "executing").length;
  const slaBreached = SYNC_REQUESTS.filter((r) => r.slaStatus === "breached").length;
  const completedToday = SYNC_REQUESTS.filter((r) => r.state === "reconciled").length;

  const openDetail = (req: SyncRequest) => setSelectedRequest(req);

  const handleCreate = () => {
    if (!newCompany || !newModule || !newDirection || !newPriority) {
      toast.error("Please fill all required fields");
      return;
    }
    setCreating(true);
    setTimeout(() => {
      setCreating(false);
      setShowCreate(false);
      setNewCompany("");
      setNewModule("");
      setNewDirection("");
      setNewPriority("");
      setNewFromDate("");
      setNewToDate("");
      setNewNotes("");
      toast.success("REQ-0043 submitted for approval");
    }, 1000);
  };

  const stats = [
    { label: "Active Syncs", value: activeSyncs, icon: Activity, color: "text-primary", sub: "In pipeline" },
    { label: "Executing Now", value: executingNow, icon: Zap, color: "text-success", sub: "In progress right now" },
    { label: "SLA Breached", value: slaBreached, icon: AlertCircle, color: "text-destructive", sub: "Requires attention" },
    { label: "Completed Today", value: completedToday, icon: CheckCircle2, color: "text-success", sub: "Reconciled" },
  ];

  return (
    <BridgeLayout title="Sync Monitor" subtitle="All sync requests — live pipeline status and controls">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <s.icon className={cn("h-5 w-5", s.color)} />
              <span className={cn("text-2xl font-bold font-mono", s.color)}>{s.value}</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All States" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="validating">Validating</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="queued">Queued</SelectItem>
            <SelectItem value="executing">Executing</SelectItem>
            <SelectItem value="verifying">Verifying</SelectItem>
            <SelectItem value="reconciled">Reconciled</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Directions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Directions</SelectItem>
            <SelectItem value="tally_to_cloud">Tally → Cloud</SelectItem>
            <SelectItem value="cloud_to_tally">Cloud → Tally</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="ml-auto"
          style={{ background: "var(--gradient-primary)" }}
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-4 w-4 mr-1" /> New Sync Request
        </Button>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-3">
        Showing {filtered.length} of {SYNC_REQUESTS.length} requests
      </p>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16">
                  <SearchX className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No sync requests found</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow
                  key={r.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/30",
                    r.state === "failed" && "bg-destructive/5",
                    r.state === "executing" && "bg-success/5"
                  )}
                  onClick={() => openDetail(r)}
                >
                  <TableCell>
                    <span className="font-mono text-sm text-primary hover:underline">{r.requestNo}</span>
                    <p className="text-[10px] font-mono text-muted-foreground/60">{r.createdAt}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground max-w-[140px] truncate">{r.company}</p>
                    <p className="text-[10px] font-mono text-muted-foreground/60">{r.tenantId}</p>
                  </TableCell>
                  <TableCell className="text-sm text-foreground">{r.module}</TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      {r.direction === "tally_to_cloud" ? (
                        <><span>Tally</span><ArrowRight className="h-3 w-3" /><span>Cloud</span></>
                      ) : (
                        <><span>Cloud</span><ArrowLeft className="h-3 w-3" /><span>Tally</span></>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs border rounded-md px-2 py-0.5", PRIORITY_CONFIG[r.priority].color)}>
                      {PRIORITY_CONFIG[r.priority].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs border rounded-lg px-2 py-1", STATE_CONFIG[r.state].color)}>
                      {STATE_CONFIG[r.state].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    {r.records === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div>
                        <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${(r.processed / r.records) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {r.processed}/{r.records}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn("font-mono text-xs flex items-center gap-1", SLA_CONFIG[r.slaStatus])}>
                      {r.slaStatus === "breached" && <AlertCircle className="h-3 w-3" />}
                      {r.slaDeadline}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(r)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {(r.state === "executing" || r.state === "queued") && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast(`Pausing ${r.requestNo}...`)}>
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {r.state === "failed" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-warning" onClick={() => toast(`Retrying ${r.requestNo}...`)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(r.state === "submitted" || r.state === "approved") && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => toast(`Resuming ${r.requestNo}...`)}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* New Sync Request Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Sync Request</DialogTitle>
            <DialogDescription>Configure a Tally Prime data sync job</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Company *</label>
              <Select value={newCompany} onValueChange={setNewCompany}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Reliance Digital Solutions">Reliance Digital Solutions</SelectItem>
                  <SelectItem value="Tata Motors Finance">Tata Motors Finance</SelectItem>
                  <SelectItem value="Infosys BPM Limited">Infosys BPM Limited</SelectItem>
                  <SelectItem value="Wipro Enterprises">Wipro Enterprises</SelectItem>
                  <SelectItem value="Mahindra Logistics">Mahindra Logistics</SelectItem>
                  <SelectItem value="Havells India">Havells India</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Module *</label>
              <Select value={newModule} onValueChange={setNewModule}>
                <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sales Vouchers">Sales Vouchers</SelectItem>
                  <SelectItem value="Purchase Vouchers">Purchase Vouchers</SelectItem>
                  <SelectItem value="Journal Entries">Journal Entries</SelectItem>
                  <SelectItem value="Ledger Masters">Ledger Masters</SelectItem>
                  <SelectItem value="Stock Items">Stock Items</SelectItem>
                  <SelectItem value="Voucher Receipts">Voucher Receipts</SelectItem>
                  <SelectItem value="Payment Vouchers">Payment Vouchers</SelectItem>
                  <SelectItem value="Receipt Vouchers">Receipt Vouchers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Direction *</label>
              <Select value={newDirection} onValueChange={setNewDirection}>
                <SelectTrigger><SelectValue placeholder="Select direction" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tally_to_cloud">Tally → Cloud</SelectItem>
                  <SelectItem value="cloud_to_tally">Cloud → Tally</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Priority *</label>
              <Select value={newPriority} onValueChange={setNewPriority}>
                <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">From Date</label>
                <Input type="date" value={newFromDate} onChange={(e) => setNewFromDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">To Date</label>
                <Input type="date" value={newToDate} onChange={(e) => setNewToDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Notes</label>
              <Textarea placeholder="Optional notes..." value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              style={{ background: "var(--gradient-primary)" }}
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Detail Sheet */}
      <Sheet open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <SheetContent className="w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono text-lg text-primary">{selectedRequest?.requestNo}</SheetTitle>
            <div className="flex gap-2 mt-1">
              {selectedRequest && (
                <>
                  <span className={cn("text-xs border rounded-md px-2 py-0.5", PRIORITY_CONFIG[selectedRequest.priority].color)}>
                    {PRIORITY_CONFIG[selectedRequest.priority].label}
                  </span>
                  <span className={cn("text-xs border rounded-lg px-2 py-1", STATE_CONFIG[selectedRequest.state].color)}>
                    {STATE_CONFIG[selectedRequest.state].label}
                  </span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{selectedRequest?.company}</p>
          </SheetHeader>

          {selectedRequest && (
            <Tabs defaultValue="overview" className="mt-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="replay">Step Replay</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-4">
                {/* Request Details */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Request Details</h4>
                  <div className="space-y-2">
                    {[
                      ["Module", selectedRequest.module],
                      ["Direction", DIRECTION_LABEL[selectedRequest.direction]],
                      ["Agent ID", selectedRequest.agentId],
                      ["Initiated By", selectedRequest.initiatedBy],
                      ["Created At", selectedRequest.createdAt],
                      ["Updated At", selectedRequest.updatedAt],
                      ["SLA Deadline", selectedRequest.slaDeadline],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={cn(
                          "text-foreground",
                          ["Direction", "Agent ID", "Created At", "Updated At", "SLA Deadline"].includes(label as string) && "font-mono",
                          label === "SLA Deadline" && SLA_CONFIG[selectedRequest.slaStatus]
                        )}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Progress</h4>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-lg font-mono text-foreground">{selectedRequest.processed}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-lg font-mono text-foreground">{selectedRequest.records}</span>
                  </div>
                  <p className="text-sm mb-2">
                    Errors: <span className={cn("font-mono", selectedRequest.errors > 0 ? "text-destructive" : "text-muted-foreground")}>{selectedRequest.errors}</span>
                  </p>
                  <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: selectedRequest.records > 0 ? `${(selectedRequest.processed / selectedRequest.records) * 100}%` : "0%" }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedRequest.records > 0 ? `${Math.round((selectedRequest.processed / selectedRequest.records) * 100)}%` : "0%"}
                  </p>
                </div>

                {/* Notes */}
                {selectedRequest.notes && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notes</h4>
                    <div className="bg-muted/30 rounded-lg p-3 text-sm">{selectedRequest.notes}</div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  {selectedRequest.state === "executing" && (
                    <Button variant="outline" className="w-full" onClick={() => toast(`Pausing ${selectedRequest.requestNo}...`)}>
                      Pause Sync
                    </Button>
                  )}
                  {selectedRequest.state === "failed" && (
                    <Button className="w-full bg-warning text-warning-foreground hover:bg-warning/90" onClick={() => toast(`Retrying ${selectedRequest.requestNo}...`)}>
                      Retry Request
                    </Button>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => toast(`Opening exceptions for ${selectedRequest.requestNo}`)}>
                    View Exceptions
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => toast("Opening audit trail...")}>
                    View Audit Trail
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="replay" className="mt-4">
                <div className="space-y-2">
                  {REPLAY_STEPS.map((step) => (
                    <div key={step.step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
                      <div className="mt-0.5">
                        {step.status === "success" && <CheckCircle2 className="h-4 w-4 text-success" />}
                        {step.status === "running" && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                        {step.status === "pending" && <Circle className="h-4 w-4 text-muted-foreground/30" />}
                        {step.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">
                          Step {step.step} — {step.action}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0">{step.duration}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </BridgeLayout>
  );
}
