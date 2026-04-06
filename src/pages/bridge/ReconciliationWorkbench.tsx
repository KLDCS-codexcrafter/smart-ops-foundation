import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Flag, CheckCircle2, Lock } from "lucide-react";
import { BridgeLayout } from "@/components/layout/BridgeLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  LineChart, Line, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

type MatchStatus = "matched" | "partial" | "mismatch" | "missing";

interface RecField {
  label: string;
  source: string;
  tally: string;
}

interface RecRow {
  id: string;
  voucherNo: string;
  status: MatchStatus;
  confidence: number;
  fields: RecField[];
}

interface RecRequest {
  id: string;
  company: string;
  tenantId: string;
  module: string;
  totalRecords: number;
  matched: number;
  partial: number;
  mismatch: number;
  missing: number;
}

// ─── [JWT] BRIDGE TIER SCOPING ────────────────────────────────────────────
// Replace this mock data with a real fetch scoped by JWT tier:
//   Tier 1 (4DSO Dev/IT Team):  GET /api/bridge/reconciliation-sessions              → full fleet, all clients
//   Tier 2 (Partner IT Team):   GET /api/bridge/reconciliation-sessions?partnerId={jwt.partnerId}  → their clients only
//   Tier 3 (Customer IT Admin): GET /api/bridge/reconciliation-sessions?tenantId={jwt.tenantId}    → own company only
// JWT payload shape: { userId, role, tier: 1|2|3, partnerId?: string, tenantId?: string }
// ─────────────────────────────────────────────────────────────────────────

const REQUESTS: RecRequest[] = [
  { id: "REQ-0038", company: "Wipro Enterprises", tenantId: "TNT-004", module: "Sales Vouchers", totalRecords: 6, matched: 3, partial: 1, mismatch: 1, missing: 1 },
  { id: "REQ-0037", company: "Reliance Digital", tenantId: "TNT-001", module: "Ledger Masters", totalRecords: 12, matched: 11, partial: 1, mismatch: 0, missing: 0 },
  { id: "REQ-0036", company: "Tata Motors Finance", tenantId: "TNT-002", module: "Stock Items", totalRecords: 8, matched: 7, partial: 0, mismatch: 1, missing: 0 },
];

const RECONCILE_SUMMARY: Record<string, { source: number; extracted: number; uploaded: number; accepted: number; canonical: number }> = {
  "REQ-0038": { source: 6, extracted: 6, uploaded: 6, accepted: 5, canonical: 5 },
  "REQ-0037": { source: 12, extracted: 12, uploaded: 12, accepted: 12, canonical: 12 },
  "REQ-0036": { source: 8, extracted: 8, uploaded: 8, accepted: 7, canonical: 7 },
};

const ROWS: RecRow[] = [
  {
    id: "row-1", voucherNo: "SV-2847", status: "matched", confidence: 100,
    fields: [
      { label: "Voucher No", source: "SV-2847", tally: "SV-2847" },
      { label: "Date", source: "01 Apr 2026", tally: "01 Apr 2026" },
      { label: "Amount", source: "₹45,000", tally: "₹45,000" },
      { label: "Ledger", source: "Sales A/c", tally: "Sales A/c" },
    ],
  },
  {
    id: "row-2", voucherNo: "SV-2848", status: "partial", confidence: 92,
    fields: [
      { label: "Voucher No", source: "SV-2848", tally: "SV-2848" },
      { label: "Date", source: "01 Apr 2026", tally: "01 Apr 2026" },
      { label: "Amount", source: "₹12,500", tally: "₹12,800" },
      { label: "Ledger", source: "Purchase A/c", tally: "Purchase A/c" },
    ],
  },
  {
    id: "row-3", voucherNo: "SV-2849", status: "mismatch", confidence: 68,
    fields: [
      { label: "Voucher No", source: "SV-2849", tally: "SV-2849" },
      { label: "Date", source: "02 Apr 2026", tally: "02 Apr 2026" },
      { label: "Amount", source: "₹78,000", tally: "₹87,000" },
      { label: "Ledger", source: "Cash A/c", tally: "Cash Account" },
    ],
  },
  {
    id: "row-4", voucherNo: "SV-2850", status: "missing", confidence: 0,
    fields: [
      { label: "Voucher No", source: "SV-2850", tally: "—" },
      { label: "Date", source: "02 Apr 2026", tally: "—" },
      { label: "Amount", source: "₹5,400", tally: "—" },
      { label: "Ledger", source: "Travel Exp", tally: "—" },
    ],
  },
  {
    id: "row-5", voucherNo: "SV-2851", status: "matched", confidence: 100,
    fields: [
      { label: "Voucher No", source: "SV-2851", tally: "SV-2851" },
      { label: "Date", source: "03 Apr 2026", tally: "03 Apr 2026" },
      { label: "Amount", source: "₹22,000", tally: "₹22,000" },
      { label: "Ledger", source: "Rent A/c", tally: "Rent A/c" },
    ],
  },
  {
    id: "row-6", voucherNo: "SV-2852", status: "matched", confidence: 99,
    fields: [
      { label: "Voucher No", source: "SV-2852", tally: "SV-2852" },
      { label: "Date", source: "03 Apr 2026", tally: "03 Apr 2026" },
      { label: "Amount", source: "₹8,750", tally: "₹8,750" },
      { label: "Ledger", source: "Salary A/c", tally: "Salary A/c" },
    ],
  },
];

const TREND_DATA = [
  { req: "REQ-30", rate: 92 }, { req: "REQ-31", rate: 88 },
  { req: "REQ-32", rate: 95 }, { req: "REQ-33", rate: 91 },
  { req: "REQ-34", rate: 94 }, { req: "REQ-35", rate: 97 },
  { req: "REQ-36", rate: 93 }, { req: "REQ-37", rate: 96 },
  { req: "REQ-38", rate: 98 }, { req: "REQ-39", rate: 95 },
];

const STATUS_CONFIG: Record<MatchStatus, { label: string; rowBg: string; badge: string }> = {
  matched:  { label: "Matched",  rowBg: "",                 badge: "bg-success/10 text-success border-success/20" },
  partial:  { label: "Partial",  rowBg: "bg-warning/5",     badge: "bg-warning/10 text-warning border-warning/20" },
  mismatch: { label: "Mismatch", rowBg: "bg-destructive/5", badge: "bg-destructive/10 text-destructive border-destructive/20" },
  missing:  { label: "Missing",  rowBg: "bg-destructive/5", badge: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function ReconciliationWorkbench() {
  const [selectedReqId, setSelectedReqId] = useState("REQ-0038");
  const [signOffDialog, setSignOffDialog] = useState(false);
  const [signedOff, setSignedOff] = useState(false);
  const [signOffComment, setSignOffComment] = useState("");
  const [signOffChecked, setSignOffChecked] = useState(false);

  const selectedReq = REQUESTS.find(r => r.id === selectedReqId) || REQUESTS[0];
  const matchRate = Math.round((selectedReq.matched / selectedReq.totalRecords) * 100);

  const renderFieldCell = (field: RecField) => {
    const differs = field.source !== field.tally && field.tally !== "—";
    const isMissing = field.tally === "—";

    return (
      <div className="space-y-0.5">
        <div className={cn("text-xs", differs ? "line-through text-muted-foreground/50" : "text-muted-foreground")}>
          {field.source}
        </div>
        <div className={cn("text-xs font-medium", isMissing ? "text-destructive" : differs ? "text-destructive" : "text-foreground")}>
          {field.tally}
        </div>
      </div>
    );
  };

  const confidenceColor = (c: number) => {
    if (c >= 98) return "text-success";
    if (c >= 85) return "text-warning";
    if (c > 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const confidenceBadgeCls = (c: number) => {
    if (c >= 98) return "bg-success/20 text-success";
    if (c >= 85) return "bg-warning/20 text-warning";
    if (c > 0) return "bg-destructive/20 text-destructive";
    return "border border-border text-muted-foreground";
  };

  return (
    <BridgeLayout title="Reconciliation Workbench" subtitle="Compare source records against Tally — verify and sign off">
      {/* 1. TOP ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Match Summary */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-semibold">{`Match Summary — ${selectedReq.id}`}</p>
          <p className="text-xs text-muted-foreground">{selectedReq.company} · {selectedReq.module}</p>

          <div className="flex gap-6 mt-4">
            {([
              { label: "Matched", count: selectedReq.matched, cls: "text-success" },
              { label: "Partial", count: selectedReq.partial, cls: "text-warning" },
              { label: "Mismatch", count: selectedReq.mismatch, cls: "text-destructive" },
              { label: "Missing", count: selectedReq.missing, cls: "text-destructive" },
            ] as const).map(s => (
              <div key={s.label}>
                <span className={cn("font-mono text-2xl font-bold", s.cls)}>{s.count}</span>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <span className={cn("text-xs", s.cls)}>({Math.round((s.count / selectedReq.totalRecords) * 100)}%)</span>
              </div>
            ))}
          </div>

          {/* Stacked bar */}
          <div className="w-full h-3 flex rounded-full overflow-hidden mt-4">
            {selectedReq.matched > 0 && <div className="bg-success" style={{ width: `${(selectedReq.matched / selectedReq.totalRecords) * 100}%` }} />}
            {selectedReq.partial > 0 && <div className="bg-warning" style={{ width: `${(selectedReq.partial / selectedReq.totalRecords) * 100}%` }} />}
            {selectedReq.mismatch > 0 && <div className="bg-destructive" style={{ width: `${(selectedReq.mismatch / selectedReq.totalRecords) * 100}%` }} />}
            {selectedReq.missing > 0 && <div className="bg-destructive/50" style={{ width: `${(selectedReq.missing / selectedReq.totalRecords) * 100}%` }} />}
          </div>
        </div>

        {/* Trend */}
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm font-semibold">Reconciliation Rate</p>
          <p className="text-xs text-muted-foreground">Last 10 requests</p>
          <div className="mt-3">
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={TREND_DATA}>
                <Line dataKey="rate" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                <XAxis dataKey="req" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis domain={[80, 100]} hide />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(val: number) => [`${val}%`, "Match rate"]}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 2. TOOLBAR */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <Select value={selectedReqId} onValueChange={v => { setSelectedReqId(v); setSignedOff(false); }}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REQUESTS.map(r => (
              <SelectItem key={r.id} value={r.id}>{r.id} — {r.module} ({r.company})</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast("Re-syncing mismatched records...")}>
            <RotateCcw className="h-4 w-4 mr-1" /> Re-sync Mismatched
          </Button>
          <Button variant="outline" onClick={() => toast("Records flagged for manual review")}>
            <Flag className="h-4 w-4 mr-1" /> Flag for Review
          </Button>
          <Button
            className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
            onClick={() => setSignOffDialog(true)}
            disabled={signedOff}
          >
            {signedOff ? <><Lock className="h-4 w-4 mr-1" /> Signed Off</> : <><CheckCircle2 className="h-4 w-4 mr-1" /> Sign Off</>}
          </Button>
        </div>
      </div>

      {/* 3. COMPARISON TABLE */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Voucher</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Voucher No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Ledger</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map(row => (
              <TableRow key={row.id} className={cn(STATUS_CONFIG[row.status].rowBg)}>
                <TableCell className="font-mono text-sm">{row.voucherNo}</TableCell>
                <TableCell>
                  <span className={cn("text-xs border rounded-lg px-2 py-1", STATUS_CONFIG[row.status].badge)}>
                    {STATUS_CONFIG[row.status].label}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn("font-mono text-sm", confidenceColor(row.confidence))}>{row.confidence}</span>
                  <span className={cn("ml-1.5 text-[10px] rounded px-1 py-0.5", confidenceBadgeCls(row.confidence))}>
                    {row.confidence >= 98 ? "exact" : row.confidence >= 85 ? "close" : row.confidence > 0 ? "diff" : "n/a"}
                  </span>
                </TableCell>
                {row.fields.map(f => (
                  <TableCell key={f.label}>{renderFieldCell(f)}</TableCell>
                ))}
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                  {row.status !== "matched" && (
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast(`Re-syncing ${row.voucherNo}...`)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast(`${row.voucherNo} flagged for manual review`)}>
                        <Flag className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 4. SIGN-OFF DIALOG */}
      <Dialog open={signOffDialog} onOpenChange={setSignOffDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sign Off Reconciliation</DialogTitle>
            <DialogDescription>Confirm accuracy of this reconciliation batch</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="bg-muted/20 rounded-lg p-4 space-y-1">
              <p className="font-mono text-sm">Request: {selectedReq.id}</p>
              <p className="text-sm">Company: {selectedReq.company}</p>
              <p className="text-sm">Matched: {selectedReq.matched}/{selectedReq.totalRecords} records</p>
              <p className="text-sm">Match Rate: {matchRate}%</p>
            </div>

            <Textarea
              rows={3}
              placeholder="Add sign-off comment (required)..."
              value={signOffComment}
              onChange={e => setSignOffComment(e.target.value)}
            />

            <div className="flex items-start gap-2">
              <Checkbox
                id="signoff-check"
                checked={signOffChecked}
                onCheckedChange={(c) => setSignOffChecked(c === true)}
              />
              <label htmlFor="signoff-check" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                I confirm that I have reviewed all reconciliation records and approve this batch for finalisation.
              </label>
            </div>

            {signedOff && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm text-success">This reconciliation has been signed off.</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setSignOffDialog(false)}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
              disabled={!signOffChecked || !signOffComment.trim()}
              onClick={() => {
                setSignedOff(true);
                toast.success("Reconciliation signed off and locked");
                setSignOffDialog(false);
              }}
            >
              Confirm Sign Off
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </BridgeLayout>
  );
}