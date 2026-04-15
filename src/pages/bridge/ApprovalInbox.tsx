import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldAlert, Inbox, AlertTriangle, Clock,
  CheckCircle2, Lightbulb, ArrowRight,
} from "lucide-react";
import { BridgeLayout } from "@/components/layout/BridgeLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type RiskLevel = "low" | "medium" | "high" | "critical";

interface ApprovalRequest {
  id: string;
  company: string;
  tenantId: string;
  module: string;
  requester: string;
  riskLevel: RiskLevel;
  riskScore: number;
  riskReason: string;
  records: number;
  submitted: string;
  slaDeadline: string;
  slaStatus: "ok" | "warning" | "breached";
  direction: "tally_to_cloud" | "cloud_to_tally";
  notes?: string;
}

// ─── [JWT] BRIDGE TIER SCOPING ────────────────────────────────────────────
// Replace this mock data with a real fetch scoped by JWT tier:
//   Tier 1 (4DSO Dev/IT Team):  GET /api/bridge/approval-requests              → full fleet, all clients
//   Tier 2 (Partner IT Team):   GET /api/bridge/approval-requests?partnerId={jwt.partnerId}  → their clients only
//   Tier 3 (Customer IT Admin): GET /api/bridge/approval-requests?tenantId={jwt.tenantId}    → own company only
// JWT payload shape: { userId, role, tier: 1|2|3, partnerId?: string, tenantId?: string }
// ─────────────────────────────────────────────────────────────────────────

interface ApprovalHistory {
  id: string;
  company: string;
  module: string;
  requester: string;
  decision: "approved" | "rejected";
  decidedBy: string;
  decidedAt: string;
  reason?: string;
  records: number;
}

const PENDING: ApprovalRequest[] = [
  {
    id: "REQ-0039",
    company: "Wipro Enterprises",
    tenantId: "TNT-004",
    module: "Purchase Vouchers",
    requester: "suresh.p@wipro.com",
    riskLevel: "high",
    riskScore: 87,
    riskReason: "Large dataset (5,640 records) + Tenant tier: Enterprise",
    records: 5640,
    submitted: "03 Apr 2026, 07:00 IST",
    slaDeadline: "03 Apr 2026, 11:00 IST",
    slaStatus: "warning",
    direction: "tally_to_cloud",
    notes: "Monthly purchase reconciliation for Q1 2026",
  },
  {
    id: "REQ-0041",
    company: "Tata Motors Finance",
    tenantId: "TNT-002",
    module: "Ledger Masters",
    requester: "vikram.nair@tatamotors.com",
    riskLevel: "medium",
    riskScore: 52,
    riskReason: "Standard volume — 1,200 records. Company tier: Enterprise.",
    records: 1200,
    submitted: "03 Apr 2026, 07:45 IST",
    slaDeadline: "03 Apr 2026, 13:00 IST",
    slaStatus: "ok",
    direction: "tally_to_cloud",
  },
  {
    id: "REQ-0043",
    company: "Infosys BPM Limited",
    tenantId: "TNT-003",
    module: "Stock Items",
    requester: "rajesh.iyer@infosysbpm.com",
    riskLevel: "low",
    riskScore: 18,
    riskReason: "Low volume (340 records). High historical success rate (97%).",
    records: 340,
    submitted: "03 Apr 2026, 09:00 IST",
    slaDeadline: "03 Apr 2026, 17:00 IST",
    slaStatus: "ok",
    direction: "tally_to_cloud",
  },
];

const HISTORY: ApprovalHistory[] = [
  { id: "REQ-0038", company: "Wipro Enterprises", module: "Journal Entries", requester: "suresh.p@wipro.com", decision: "approved", decidedBy: "Platform Admin", decidedAt: "02 Apr 2026, 15:00 IST", records: 280 },
  { id: "REQ-0037", company: "Reliance Digital", module: "Voucher Receipts", requester: "priya.sharma@reliancedigital.in", decision: "approved", decidedBy: "System (auto)", decidedAt: "02 Apr 2026, 14:00 IST", reason: "Auto-approved: below 500 record threshold", records: 324 },
  { id: "REQ-0036", company: "Tata Motors Finance", module: "Stock Items", requester: "vikram.nair@tatamotors.com", decision: "approved", decidedBy: "Platform Admin", decidedAt: "01 Apr 2026, 11:00 IST", records: 890 },
  { id: "REQ-0034", company: "Mahindra Logistics", module: "Sales Vouchers", requester: "kiran.patil@mahindra.com", decision: "rejected", decidedBy: "Platform Admin", decidedAt: "01 Apr 2026, 09:30 IST", reason: "Scope too broad — limit to current quarter only", records: 12400 },
  { id: "REQ-0032", company: "Havells India", module: "Ledger Masters", requester: "pooja.reddy@havells.com", decision: "approved", decidedBy: "System (auto)", decidedAt: "31 Mar 2026, 16:00 IST", reason: "Auto-approved: below 500 record threshold", records: 210 },
];

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; barColor: string }> = {
  low: { label: "Low", color: "bg-success/10 text-success border-success/20", barColor: "bg-success" },
  medium: { label: "Medium", color: "bg-warning/10 text-warning border-warning/20", barColor: "bg-warning" },
  high: { label: "High", color: "bg-destructive/10 text-destructive border-destructive/20", barColor: "bg-destructive" },
  critical: { label: "Critical", color: "bg-destructive text-destructive-foreground border-destructive", barColor: "bg-destructive" },
};

const SLA_CONFIG = {
  ok: "text-muted-foreground",
  warning: "text-warning",
  breached: "text-destructive font-semibold",
};

export default function ApprovalInbox() {
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [rejectDialog, setRejectDialog] = useState<{ id: string; open: boolean }>({ id: "", open: false });
  const [rejectReason, setRejectReason] = useState("");

  const toggleSelect = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const openDetail = (req: ApprovalRequest) => {
    setSelectedReq(req);
    setShowDetail(true);
  };

  const handleApprove = (id: string) => {
    toast.success(`${id} approved — added to execution queue`);
  };

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) return;
    toast.error(`${rejectDialog.id} rejected`);
    setRejectDialog({ id: "", open: false });
    setRejectReason("");
  };

  const handleBulkApprove = () => {
    selected.forEach((id) => toast.success(`${id} approved — added to execution queue`));
    setSelected([]);
  };

  const handleBulkReject = () => {
    selected.forEach((id) => toast.error(`${id} rejected`));
    setSelected([]);
  };

  const pendingHighRisk = PENDING.filter((r) => r.riskLevel === "high" || r.riskLevel === "critical").length;
  const slaWarning = PENDING.filter((r) => r.slaStatus !== "ok").length;
  const approvedToday = HISTORY.filter((h) => h.decidedAt.includes("03 Apr")).length;

  return (
    <BridgeLayout title="Approval Inbox" subtitle="Review and approve sync requests before execution">
      {/* Policy Banner */}
      <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-6 flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-warning shrink-0" />
        <div>
          <p className="text-sm text-foreground">
            All sync requests above 500 records or above ₹1L value require manual approval.
          </p>
          <p className="text-xs text-muted-foreground">
            Auto-approval applies below threshold. SLA: 4 hours for High priority.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pending", value: PENDING.length, icon: Inbox, color: "text-warning", sub: "Awaiting decision" },
          { label: "High Risk", value: pendingHighRisk, icon: AlertTriangle, color: "text-destructive", sub: "Needs careful review" },
          { label: "SLA Warning", value: slaWarning, icon: Clock, color: "text-warning", sub: "Needs action now" },
          { label: "Approved Today", value: approvedToday, icon: CheckCircle2, color: "text-success", sub: "Processed today" },
        ].map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <card.icon className={cn("h-5 w-5", card.color)} />
              <span className="text-2xl font-bold font-mono text-foreground">{card.value}</span>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({PENDING.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground">
              {PENDING.length} requests awaiting your decision
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/20"
                disabled={selected.length === 0}
                onClick={handleBulkReject}
              >
                Reject All Selected
              </Button>
              <Button
                size="sm"
                disabled={selected.length === 0}
                onClick={handleBulkApprove}
                style={{ background: "var(--gradient-primary)" }}
              >
                Approve All Selected
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {PENDING.map((req) => {
              const risk = RISK_CONFIG[req.riskLevel];
              const isHighRisk = req.riskLevel === "high" || req.riskLevel === "critical";

              return (
                <div data-keyboard-form
                  key={req.id}
                  className={cn(
                    "bg-card border border-border rounded-xl p-5 cursor-pointer transition-colors hover:border-primary/30",
                    isHighRisk && "border-destructive/30 bg-destructive/5"
                  )}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <Checkbox
                        checked={selected.includes(req.id)}
                        onCheckedChange={() => toggleSelect(req.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="font-mono text-sm text-primary font-semibold ml-3">{req.id}</span>
                      <span className={cn("text-xs border rounded-md px-2 py-0.5 ml-2", risk.color)}>
                        {risk.label}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground ml-2 flex items-center gap-1">
                        {req.direction === "tally_to_cloud" ? (
                          <>Tally <ArrowRight className="h-3 w-3 inline" /> Cloud</>
                        ) : (
                          <>Cloud <ArrowRight className="h-3 w-3 inline rotate-180" /> Tally</>
                        )}
                      </span>
                    </div>
                    <div>
                      {req.slaStatus === "warning" ? (
                        <span className="text-xs text-warning font-mono flex items-center gap-1">
                          <Clock className="h-3 w-3" /> SLA: {req.slaDeadline}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">{req.slaDeadline}</span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{req.company}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{req.tenantId}</p>
                      <p className="text-xs text-muted-foreground mt-1">{req.module}</p>
                      <p className="text-xs text-muted-foreground">{req.requester}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{req.submitted}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Risk Score</p>
                      <p className={cn("text-2xl font-bold font-mono", risk.barColor === "bg-success" ? "text-success" : risk.barColor === "bg-warning" ? "text-warning" : "text-destructive")}>
                        {req.riskScore}
                      </p>
                      <div className="w-full h-2 bg-secondary rounded-full mt-1">
                        <div className={cn("h-full rounded-full", risk.barColor)} style={{ width: `${req.riskScore}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {req.records.toLocaleString("en-IN")} records
                      </p>
                    </div>
                  </div>

                  {/* Risk Reason */}
                  <div className="mt-3 bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">
                      <Lightbulb className="h-3.5 w-3.5 text-warning inline mr-1" />
                      {req.riskReason}
                    </p>
                  </div>

                  {req.notes && (
                    <p className="text-xs text-muted-foreground/70 italic mt-2">"{req.notes}"</p>
                  )}

                  {/* Card Footer */}
                  <div className="mt-4 flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(req)}>
                      View Details
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectDialog({ id: req.id, open: true });
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(req.id);
                        }}
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Decided By</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {HISTORY.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-mono text-xs text-primary">{h.id}</TableCell>
                    <TableCell className="text-sm text-foreground">{h.company}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{h.module}</TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]">{h.requester}</TableCell>
                    <TableCell className="font-mono text-sm text-foreground">{h.records.toLocaleString("en-IN")}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-xs border rounded-lg px-2 py-0.5",
                        h.decision === "approved"
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      )}>
                        {h.decision === "approved" ? "Approved" : "Rejected"}
                      </span>
                      {h.reason && (
                        <p className="text-[10px] text-muted-foreground/70 italic max-w-[180px] truncate mt-0.5">
                          {h.reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className={cn("text-xs text-muted-foreground", h.decidedBy === "System (auto)" && "italic")}>
                      {h.decidedBy}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] text-muted-foreground">{h.decidedAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => { if (!open) { setRejectDialog({ id: "", open: false }); setRejectReason(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Sync Request</DialogTitle>
            <DialogDescription>Provide a reason for rejection. This will be logged.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Request ID</p>
              <p className="font-mono text-primary font-semibold">{rejectDialog.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Reason</p>
              <Textarea
                rows={3}
                placeholder="e.g. Scope too broad — limit to current quarter only"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => { setRejectDialog({ id: "", open: false }); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button data-primary
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!rejectReason.trim()}
              onClick={handleRejectSubmit}
            >
              Confirm Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent side="right" className="w-[480px] overflow-y-auto">
          {selectedReq && (() => {
            const risk = RISK_CONFIG[selectedReq.riskLevel];
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="font-mono text-lg text-primary">{selectedReq.id}</SheetTitle>
                  <div className="flex gap-2 mt-1">
                    <span className={cn("text-xs border rounded-md px-2 py-0.5", risk.color)}>{risk.label}</span>
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      {selectedReq.direction === "tally_to_cloud" ? "Tally → Cloud" : "Cloud → Tally"}
                    </span>
                  </div>
                </SheetHeader>

                <div className="space-y-5 mt-6">
                  {/* Request Info */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Request Info</h4>
                    <div className="space-y-2">
                      {[
                        ["Company", selectedReq.company],
                        ["Tenant ID", selectedReq.tenantId, true],
                        ["Module", selectedReq.module],
                        ["Direction", selectedReq.direction === "tally_to_cloud" ? "Tally → Cloud" : "Cloud → Tally"],
                        ["Requester", selectedReq.requester],
                        ["Submitted", selectedReq.submitted, true],
                        ["SLA Deadline", selectedReq.slaDeadline, true],
                      ].map(([label, value, mono]) => (
                        <div key={label as string} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <span className={cn(
                            "text-xs text-foreground",
                            mono && "font-mono",
                            label === "SLA Deadline" && SLA_CONFIG[selectedReq.slaStatus]
                          )}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Analysis */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Risk Analysis</h4>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn(
                        "text-2xl font-bold font-mono",
                        risk.barColor === "bg-success" ? "text-success" : risk.barColor === "bg-warning" ? "text-warning" : "text-destructive"
                      )}>
                        {selectedReq.riskScore}
                      </span>
                      <span className={cn("text-xs border rounded-md px-2 py-0.5", risk.color)}>{risk.label}</span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full mb-3">
                      <div className={cn("h-full rounded-full", risk.barColor)} style={{ width: `${selectedReq.riskScore}%` }} />
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">
                        <Lightbulb className="h-3.5 w-3.5 text-warning inline mr-1" />
                        {selectedReq.riskReason}
                      </p>
                    </div>
                  </div>

                  {/* Volume */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Volume</h4>
                    <p className="font-mono text-lg font-bold text-foreground">
                      {selectedReq.records.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-muted-foreground">records to sync</p>
                  </div>

                  {/* Notes */}
                  {selectedReq.notes && (
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-sm text-muted-foreground italic">{selectedReq.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <Button
                      className="w-full"
                      style={{ background: "var(--gradient-primary)" }}
                      onClick={() => { handleApprove(selectedReq.id); setShowDetail(false); }}
                    >
                      Approve Request
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => { setRejectDialog({ id: selectedReq.id, open: true }); setShowDetail(false); }}
                    >
                      Reject Request
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
