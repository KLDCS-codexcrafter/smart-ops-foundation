import { useState } from "react";
import { toast } from "sonner";
import {
  Upload, CheckCircle2, XCircle, Loader2, FileSpreadsheet,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ImportJob {
  id: string;
  name: string;
  source: string;
  targetModule: string;
  company: string;
  records: number;
  status: "completed" | "failed" | "processing" | "queued";
  createdAt: string;
  fileSize: string;
}

// ─── [JWT] BRIDGE TIER SCOPING ────────────────────────────────────────────
// Replace this mock data with a real fetch scoped by JWT tier:
//   Tier 1 (4DSO Dev/IT Team):  GET /api/bridge/import-jobs              → full fleet, all clients
//   Tier 2 (Partner IT Team):   GET /api/bridge/import-jobs?partnerId={jwt.partnerId}  → their clients only
//   Tier 3 (Customer IT Admin): GET /api/bridge/import-jobs?tenantId={jwt.tenantId}    → own company only
// JWT payload shape: { userId, role, tier: 1|2|3, partnerId?: string, tenantId?: string }
// ─────────────────────────────────────────────────────────────────────────

const IMPORT_HISTORY: ImportJob[] = [
  { id: "IMP-001", name: "Q1 Purchase Data", source: "Excel Upload", targetModule: "Purchase Vouchers", company: "Reliance Digital", records: 1240, status: "completed", createdAt: "02 Apr 2026, 15:00 IST", fileSize: "2.4 MB" },
  { id: "IMP-002", name: "Supplier Master List", source: "CSV Upload", targetModule: "Ledger Masters", company: "Tata Motors Finance", records: 380, status: "completed", createdAt: "01 Apr 2026, 11:00 IST", fileSize: "0.8 MB" },
  { id: "IMP-003", name: "March Sales Data", source: "JSON API", targetModule: "Sales Vouchers", company: "Wipro Enterprises", records: 2800, status: "failed", createdAt: "31 Mar 2026, 09:00 IST", fileSize: "5.1 MB" },
  { id: "IMP-004", name: "Stock Opening Balances", source: "Excel Upload", targetModule: "Stock Items", company: "Mahindra Logistics", records: 560, status: "processing", createdAt: "03 Apr 2026, 09:30 IST", fileSize: "1.2 MB" },
];

const STATUS_CONFIG: Record<ImportJob["status"], { label: string; color: string }> = {
  completed:  { label: "Completed",  color: "bg-success/10 text-success border-success/20" },
  failed:     { label: "Failed",     color: "bg-destructive/10 text-destructive border-destructive/20" },
  processing: { label: "Processing", color: "bg-warning/10 text-warning border-warning/20" },
  queued:     { label: "Queued",     color: "bg-primary/10 text-primary border-primary/20" },
};

const COMPANIES = [
  "Reliance Digital Solutions",
  "Tata Motors Finance",
  "Infosys BPM Limited",
  "Wipro Enterprises",
  "Mahindra Logistics",
];

const MODULES = [
  "Sales Vouchers", "Purchase Vouchers", "Journal Entries",
  "Receipt Vouchers", "Payment Vouchers", "Contra Vouchers",
  "Debit Notes", "Credit Notes", "Ledger Masters", "Stock Items",
  "Cost Centres", "Currency",
];

const stats = [
  { label: "Total Imports", value: 4, icon: Upload, color: "text-primary" },
  { label: "Completed", value: 2, icon: CheckCircle2, color: "text-success" },
  { label: "Failed", value: 1, icon: XCircle, color: "text-destructive" },
  { label: "Processing", value: 1, icon: Loader2, color: "text-warning", spin: true },
];

export default function ImportHub() {
  const [tab, setTab] = useState("upload");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetModule, setTargetModule] = useState("");
  const [fileFormat, setFileFormat] = useState("");

  return (
    <BridgeLayout title="Import Hub" subtitle="Import data into Tally Prime from external sources">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className={cn("h-4 w-4", s.color, s.spin && "animate-spin")} />
            </div>
            <p className={cn("text-2xl font-bold mt-1 font-mono", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="upload">Upload File</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          {/* Drop zone */}
          <div className="border-2 border-dashed border-border rounded-xl p-10 text-center mb-4 hover:border-primary/50 transition-colors cursor-pointer">
            <Upload className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Drop your file here or click to browse</p>
            <p className="text-xs text-muted-foreground mt-1">Supports: Excel (.xlsx), CSV, JSON</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Target Company</label>
              <Select value={targetCompany} onValueChange={setTargetCompany}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {COMPANIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Target Module</label>
              <Select value={targetModule} onValueChange={setTargetModule}>
                <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent>
                  {MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">File Format</label>
              <Select value={fileFormat} onValueChange={setFileFormat}>
                <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Date Override (optional)</label>
              <Input type="date" />
            </div>
          </div>

          <Button
            className="w-full mt-4 bg-gradient-to-r from-primary to-primary/80"
            onClick={() => toast("Import job queued — IMP-005 created")}
          >
            Start Import
          </Button>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {IMPORT_HISTORY.map((job) => {
                  const sc = STATUS_CONFIG[job.status];
                  return (
                    <TableRow key={job.id} className={cn(job.status === "failed" && "bg-destructive/5")}>
                      <TableCell className="font-mono text-xs text-primary">{job.id}</TableCell>
                      <TableCell className="text-sm text-foreground">{job.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{job.source}</TableCell>
                      <TableCell className="text-xs text-foreground">{job.targetModule}</TableCell>
                      <TableCell className="text-xs text-foreground">{job.company}</TableCell>
                      <TableCell className="font-mono text-sm">{job.records.toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <span className={cn("text-xs border rounded-lg px-2 py-0.5", sc.color)}>{sc.label}</span>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">{job.createdAt}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </BridgeLayout>
  );
}
