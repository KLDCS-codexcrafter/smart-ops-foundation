import { useState } from "react";
import { toast } from "sonner";
import {
  TicketCheck, Flame, AlertTriangle, CheckCircle2,
  Search, Plus, Eye, UserPlus, RotateCcw, SearchX,
  Loader2,
} from "lucide-react";
import { TowerLayout } from "@/components/layout/TowerLayout";
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
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "critical";
type TicketCategory =
  | "billing" | "technical" | "access" | "feature_request"
  | "bug_report" | "data_issue" | "integration";

interface SupportTicket {
  id: string;
  title: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  tenant: string;
  tenantId: string;
  raisedBy: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  slaHours: number;
  slaRemaining: string;
  description: string;
}

const TICKETS: SupportTicket[] = [
  {
    id: "TKT-0041",
    title: "GST filing module showing incorrect GSTIN validation error",
    category: "bug_report",
    status: "open",
    priority: "high",
    tenant: "Reliance Digital Solutions",
    tenantId: "TNT-001",
    raisedBy: "arjun.mehta@reliancedigital.in",
    assignedTo: "Unassigned",
    createdAt: "03 Apr 2026, 08:30 IST",
    updatedAt: "03 Apr 2026, 08:30 IST",
    slaHours: 8,
    slaRemaining: "6h 12m",
    description: "The GST filing module rejects valid GSTIN numbers for new suppliers added after March 2026. Error: INVALID_GSTIN_FORMAT.",
  },
  {
    id: "TKT-0040",
    title: "Unable to export payroll reports to Excel",
    category: "technical",
    status: "in_progress",
    priority: "medium",
    tenant: "Tata Motors Finance",
    tenantId: "TNT-002",
    raisedBy: "vikram.nair@tatamotors.com",
    assignedTo: "Ravi Kumar (L2)",
    createdAt: "02 Apr 2026, 14:15 IST",
    updatedAt: "03 Apr 2026, 09:00 IST",
    slaHours: 24,
    slaRemaining: "11h 45m",
    description: "Export to Excel fails for payroll runs with more than 100 employees. CSV export works fine.",
  },
  {
    id: "TKT-0039",
    title: "New user invitation email not received",
    category: "access",
    status: "in_progress",
    priority: "medium",
    tenant: "Infosys BPM Limited",
    tenantId: "TNT-003",
    raisedBy: "rajesh.iyer@infosysbpm.com",
    assignedTo: "Priya Sharma (L1)",
    createdAt: "01 Apr 2026, 10:00 IST",
    updatedAt: "02 Apr 2026, 16:00 IST",
    slaHours: 24,
    slaRemaining: "Breached",
    description: "Invitation emails to deepa.menon@wipro.com are not being received. Checked spam folder.",
  },
  {
    id: "TKT-0038",
    title: "Request: Add bulk import for ledger accounts",
    category: "feature_request",
    status: "open",
    priority: "low",
    tenant: "Wipro Enterprises",
    tenantId: "TNT-004",
    raisedBy: "suresh.p@wipro.com",
    assignedTo: "Product Team",
    createdAt: "31 Mar 2026, 11:30 IST",
    updatedAt: "31 Mar 2026, 11:30 IST",
    slaHours: 72,
    slaRemaining: "48h 30m",
    description: "We have 500+ ledger accounts to migrate. A bulk import via Excel/CSV would save significant time.",
  },
  {
    id: "TKT-0037",
    title: "Bridge agent disconnecting every 2 hours",
    category: "integration",
    status: "open",
    priority: "critical",
    tenant: "Mahindra Logistics",
    tenantId: "TNT-005",
    raisedBy: "kiran.patil@mahindra.com",
    assignedTo: "Unassigned",
    createdAt: "31 Mar 2026, 09:00 IST",
    updatedAt: "31 Mar 2026, 09:00 IST",
    slaHours: 4,
    slaRemaining: "Breached",
    description: "The Tally Bridge agent keeps disconnecting. Tally Prime v2.1, Windows Server 2019. Logs show timeout error.",
  },
  {
    id: "TKT-0036",
    title: "Incorrect GST calculation for interstate sales",
    category: "data_issue",
    status: "resolved",
    priority: "high",
    tenant: "Havells India",
    tenantId: "TNT-011",
    raisedBy: "pooja.reddy@havells.com",
    assignedTo: "Ravi Kumar (L2)",
    createdAt: "28 Mar 2026, 15:00 IST",
    updatedAt: "30 Mar 2026, 11:00 IST",
    slaHours: 8,
    slaRemaining: "Resolved",
    description: "IGST was being applied on intrastate transactions. Issue was in the state code mapping. Fixed in build 2026.03.30.",
  },
  {
    id: "TKT-0035",
    title: "Invoice amount showing in USD instead of INR",
    category: "billing",
    status: "resolved",
    priority: "high",
    tenant: "Muthoot Finance",
    tenantId: "TNT-012",
    raisedBy: "sanjay.g@muthoot.com",
    assignedTo: "Priya Sharma (L1)",
    createdAt: "27 Mar 2026, 10:00 IST",
    updatedAt: "27 Mar 2026, 14:30 IST",
    slaHours: 8,
    slaRemaining: "Resolved",
    description: "Invoice PDF was showing USD symbol. Root cause: currency preference not set during tenant provisioning. Fixed.",
  },
  {
    id: "TKT-0034",
    title: "Dashboard not loading for manager role users",
    category: "technical",
    status: "closed",
    priority: "critical",
    tenant: "Larsen & Toubro Infotech",
    tenantId: "TNT-009",
    raisedBy: "kavita.singh@lnt.com",
    assignedTo: "Ravi Kumar (L2)",
    createdAt: "25 Mar 2026, 08:00 IST",
    updatedAt: "26 Mar 2026, 12:00 IST",
    slaHours: 4,
    slaRemaining: "Closed",
    description: "Dashboard blank screen for all Manager role users after the March 24 deployment. Rolled back and hotfixed.",
  },
];

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-secondary text-muted-foreground border-border" },
  medium: { label: "Medium", color: "bg-info/10 text-info border-info/20" },
  high: { label: "High", color: "bg-warning/10 text-warning border-warning/20" },
  critical: { label: "Critical", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: "Open", color: "bg-primary/10 text-primary border-primary/20" },
  in_progress: { label: "In Progress", color: "bg-warning/10 text-warning border-warning/20" },
  resolved: { label: "Resolved", color: "bg-success/10 text-success border-success/20" },
  closed: { label: "Closed", color: "bg-secondary text-muted-foreground border-border" },
};

const CATEGORY_CONFIG: Record<TicketCategory, string> = {
  billing: "Billing",
  technical: "Technical",
  access: "Access",
  feature_request: "Feature Request",
  bug_report: "Bug Report",
  data_issue: "Data Issue",
  integration: "Integration",
};

const UNIQUE_TENANTS = [...new Set(TICKETS.map((t) => t.tenant))];

const Support = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [createForm, setCreateForm] = useState({
    tenant: "", title: "", category: "", priority: "",
    description: "", raisedBy: "", assignTo: "",
  });
  const [creating, setCreating] = useState(false);

  const filtered = TICKETS.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      t.title.toLowerCase().includes(q) ||
      t.tenant.toLowerCase().includes(q) ||
      t.raisedBy.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority = priorityFilter === "all" || t.priority === priorityFilter;
    const matchCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchSearch && matchStatus && matchPriority && matchCategory;
  });

  const openDetail = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setShowDetail(true);
  };

  const handleCreate = () => {
    if (!createForm.tenant || !createForm.title || !createForm.category || !createForm.priority || !createForm.description || !createForm.raisedBy) {
      toast.error("Please fill all required fields");
      return;
    }
    setCreating(true);
    setTimeout(() => {
      const newId = `TKT-00${42 + Math.floor(Math.random() * 9)}`;
      setCreating(false);
      setShowCreate(false);
      setCreateForm({ tenant: "", title: "", category: "", priority: "", description: "", raisedBy: "", assignTo: "" });
      toast.success(`Ticket ${newId} created successfully`);
    }, 1000);
  };

  const totalOpen = TICKETS.filter((t) => t.status === "open" || t.status === "in_progress").length;
  const criticalActive = TICKETS.filter((t) => t.priority === "critical" && t.status !== "closed" && t.status !== "resolved").length;
  const slaBreached = TICKETS.filter((t) => t.slaRemaining === "Breached").length;
  const resolvedRecent = TICKETS.filter((t) => t.status === "resolved" && t.updatedAt.includes("Apr 2026")).length;

  return (
    <TowerLayout title="Support" subtitle="Platform helpdesk — manage tenant support tickets and escalations"><div data-keyboard-form>
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Open", value: totalOpen, icon: TicketCheck, iconColor: "text-primary", sub: "Active tickets" },
          { label: "Critical", value: criticalActive, icon: Flame, iconColor: "text-destructive", sub: "Needs escalation" },
          { label: "SLA Breached", value: slaBreached, icon: AlertTriangle, iconColor: "text-destructive", sub: "Needs immediate attention" },
          { label: "Resolved (Apr)", value: resolvedRecent, icon: CheckCircle2, iconColor: "text-success", sub: "This month" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className={cn("h-4 w-4", stat.iconColor)} />
            </div>
            <div className="text-2xl font-bold font-mono text-foreground">{stat.value}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tickets..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
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
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="bug_report">Bug Report</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="access">Access</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="integration">Integration</SelectItem>
            <SelectItem value="feature_request">Feature Request</SelectItem>
            <SelectItem value="data_issue">Data Issue</SelectItem>
          </SelectContent>
        </Select>
        <Button className="ml-auto" style={{ background: "var(--gradient-primary)" }} onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Ticket
        </Button>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-3">
        Showing {filtered.length} of {TICKETS.length} tickets
      </p>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16">
                  <SearchX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tickets found</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow
                  key={t.id}
                  className={cn(
                    "hover:bg-muted/30 cursor-pointer",
                    t.priority === "critical" && (t.status === "open" || t.status === "in_progress") && "bg-destructive/5"
                  )}
                  onClick={() => openDetail(t)}
                >
                  <TableCell className="text-xs font-mono text-primary hover:underline">{t.id}</TableCell>
                  <TableCell>
                    <div className="max-w-[220px] truncate text-sm font-medium text-foreground">{t.title}</div>
                    <span className="text-[10px] text-muted-foreground">{CATEGORY_CONFIG[t.category]}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-foreground">{t.tenant}</div>
                    <div className="text-[10px] font-mono text-muted-foreground">{t.tenantId}</div>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs border rounded-md px-2 py-0.5", PRIORITY_CONFIG[t.priority].color)}>
                      {PRIORITY_CONFIG[t.priority].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs border rounded-lg px-2 py-1", STATUS_CONFIG[t.status].color)}>
                      {STATUS_CONFIG[t.status].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs", t.assignedTo === "Unassigned" ? "text-destructive/70 italic" : "text-muted-foreground")}>
                      {t.assignedTo}
                    </span>
                  </TableCell>
                  <TableCell>
                    {t.slaRemaining === "Breached" ? (
                      <span className="text-destructive text-xs font-mono font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Breached
                      </span>
                    ) : t.slaRemaining === "Resolved" || t.slaRemaining === "Closed" ? (
                      <span className="text-muted-foreground text-xs">{t.slaRemaining}</span>
                    ) : (
                      <span className="text-warning text-xs font-mono">{t.slaRemaining}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(t)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {(t.status === "open" || t.status === "in_progress") && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast(`Assigning ticket ${t.id}...`)}>
                          <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {(t.status === "resolved" || t.status === "closed") && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast(`Reopening ticket ${t.id}...`)}>
                          <RotateCcw className="h-3.5 w-3.5" />
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

      {/* Create Ticket Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Support Ticket</DialogTitle>
            <DialogDescription>Create a ticket on behalf of a tenant</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tenant *</label>
              <Select value={createForm.tenant} onValueChange={(v) => setCreateForm({ ...createForm, tenant: v })}>
                <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                <SelectContent>
                  {UNIQUE_TENANTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Title *</label>
              <Input placeholder="Ticket title" value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category *</label>
                <Select value={createForm.category} onValueChange={(v) => setCreateForm({ ...createForm, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority *</label>
                <Select value={createForm.priority} onValueChange={(v) => setCreateForm({ ...createForm, priority: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Description *</label>
              <Textarea rows={4} placeholder="Describe the issue..." value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value.slice(0, 1000) })} />
              <p className="text-xs text-muted-foreground text-right mt-1">{createForm.description.length}/1000 characters</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Raised By *</label>
              <Input type="email" placeholder="user@company.com" value={createForm.raisedBy} onChange={(e) => setCreateForm({ ...createForm, raisedBy: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Assign To</label>
              <Select value={createForm.assignTo} onValueChange={(v) => setCreateForm({ ...createForm, assignTo: v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="priya">Priya Sharma (L1)</SelectItem>
                  <SelectItem value="ravi">Ravi Kumar (L2)</SelectItem>
                  <SelectItem value="product">Product Team</SelectItem>
                  <SelectItem value="admin">Platform Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button data-primary style={{ background: "var(--gradient-primary)" }} onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Create Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg font-mono font-semibold text-primary">
              {selectedTicket?.id}
            </SheetTitle>
            {selectedTicket && (
              <>
                <div className="flex gap-2 mt-1">
                  <span className={cn("text-xs border rounded-md px-2 py-0.5", PRIORITY_CONFIG[selectedTicket.priority].color)}>
                    {PRIORITY_CONFIG[selectedTicket.priority].label}
                  </span>
                  <span className={cn("text-xs border rounded-lg px-2 py-1", STATUS_CONFIG[selectedTicket.status].color)}>
                    {STATUS_CONFIG[selectedTicket.status].label}
                  </span>
                </div>
                <p className="text-base font-medium text-foreground mt-2">{selectedTicket.title}</p>
              </>
            )}
          </SheetHeader>

          {selectedTicket && (
            <div className="mt-6 space-y-6">
              {/* Details */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Ticket Details</h4>
                <div className="space-y-2">
                  {[
                    ["Category", CATEGORY_CONFIG[selectedTicket.category]],
                    ["Tenant", selectedTicket.tenant],
                    ["Tenant ID", selectedTicket.tenantId],
                    ["Raised By", selectedTicket.raisedBy],
                    ["Assigned To", selectedTicket.assignedTo],
                    ["Created", selectedTicket.createdAt],
                    ["Last Updated", selectedTicket.updatedAt],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-1.5 border-b border-border/50">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className={cn(
                        "text-xs text-foreground",
                        label === "Tenant ID" && "font-mono",
                        (label === "Created" || label === "Last Updated") && "font-mono",
                        label === "Assigned To" && value === "Unassigned" && "text-destructive/70 italic"
                      )}>
                        {value}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">SLA</span>
                    {selectedTicket.slaRemaining === "Breached" ? (
                      <span className="text-destructive text-xs font-mono font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Breached
                      </span>
                    ) : (
                      <span className={cn(
                        "text-xs font-mono",
                        selectedTicket.slaRemaining === "Resolved" || selectedTicket.slaRemaining === "Closed"
                          ? "text-muted-foreground"
                          : "text-warning"
                      )}>
                        {selectedTicket.slaRemaining}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Description</h4>
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm text-foreground leading-relaxed">{selectedTicket.description}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Actions</h4>
                <Button className="w-full" style={{ background: "var(--gradient-primary)" }} onClick={() => toast("Ticket assigned to Platform Admin")}>
                  Assign to Me
                </Button>
                <Button variant="outline" className="w-full" onClick={() => toast("Status update coming soon")}>
                  Change Status
                </Button>
                {selectedTicket.priority !== "critical" && (
                  <Button variant="outline" className="w-full bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20" onClick={() => toast("Ticket escalated to Critical priority")}>
                    Escalate to Critical
                  </Button>
                )}
                <Button variant="outline" className="w-full" onClick={() => toast("Comment feature coming soon")}>
                  Add Note / Comment
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div></TowerLayout>
  );
};

export default Support;
