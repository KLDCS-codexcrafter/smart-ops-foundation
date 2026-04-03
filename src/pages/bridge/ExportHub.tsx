import { useState } from "react";
import { toast } from "sonner";
import {
  Download, CheckCircle2, XCircle, Calendar, FileSpreadsheet,
} from "lucide-react";
import { BridgeLayout } from "@/components/layout/BridgeLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

interface ExportJob {
  id: string;
  name: string;
  sourceModule: string;
  format: "excel" | "csv" | "json";
  company: string;
  records: number;
  status: "completed" | "failed" | "scheduled" | "processing";
  scheduledAt?: string;
  completedAt?: string;
  fileSize?: string;
}

const EXPORT_HISTORY: ExportJob[] = [
  { id: "EXP-001", name: "Q1 Sales Report", sourceModule: "Sales Vouchers", format: "excel", company: "Reliance Digital", records: 1560, status: "completed", completedAt: "02 Apr 2026, 16:00 IST", fileSize: "3.2 MB" },
  { id: "EXP-002", name: "Ledger Dump — All", sourceModule: "Ledger Masters", format: "csv", company: "Tata Motors Finance", records: 890, status: "completed", completedAt: "01 Apr 2026, 12:00 IST", fileSize: "1.8 MB" },
  { id: "EXP-003", name: "GST Filing Data", sourceModule: "Sales Vouchers", format: "json", company: "Infosys BPM", records: 2340, status: "scheduled", scheduledAt: "05 Apr 2026, 08:00 IST" },
  { id: "EXP-004", name: "Stock Valuation", sourceModule: "Stock Items", format: "excel", company: "Mahindra Logistics", records: 456, status: "failed", completedAt: "31 Mar 2026, 14:00 IST" },
];

const STATUS_CONFIG: Record<ExportJob["status"], { label: string; color: string }> = {
  completed:  { label: "Completed",  color: "bg-success/10 text-success border-success/20" },
  failed:     { label: "Failed",     color: "bg-destructive/10 text-destructive border-destructive/20" },
  scheduled:  { label: "Scheduled",  color: "bg-warning/10 text-warning border-warning/20" },
  processing: { label: "Processing", color: "bg-primary/10 text-primary border-primary/20" },
};

const FORMAT_CONFIG: Record<string, { label: string; color: string }> = {
  excel: { label: "Excel", color: "bg-success/10 text-success" },
  csv:   { label: "CSV",   color: "bg-accent/10 text-accent-foreground" },
  json:  { label: "JSON",  color: "bg-primary/10 text-primary" },
};

const COMPANIES = [
  "Reliance Digital Solutions", "Tata Motors Finance",
  "Infosys BPM Limited", "Wipro Enterprises", "Mahindra Logistics",
];

const MODULES = [
  "Sales Vouchers", "Purchase Vouchers", "Journal Entries",
  "Receipt Vouchers", "Payment Vouchers", "Contra Vouchers",
  "Debit Notes", "Credit Notes", "Ledger Masters", "Stock Items",
  "Cost Centres", "Currency",
];

const stats = [
  { label: "Total Exports", value: 4, icon: Download, color: "text-primary" },
  { label: "Completed", value: 2, icon: CheckCircle2, color: "text-success" },
  { label: "Scheduled", value: 1, icon: Calendar, color: "text-warning" },
  { label: "Failed", value: 1, icon: XCircle, color: "text-destructive" },
];

export default function ExportHub() {
  const [tab, setTab] = useState("new");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [exportName, setExportName] = useState("");
  const [sourceCompany, setSourceCompany] = useState("");
  const [sourceModule, setSourceModule] = useState("");
  const [format, setFormat] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const scheduledExports = EXPORT_HISTORY.filter((e) => e.status === "scheduled");

  return (
    <BridgeLayout title="Export Hub" subtitle="Export data from Tally Prime to external destinations">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <p className={cn("text-2xl font-bold mt-1 font-mono", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="new">New Export</TabsTrigger>
          <TabsTrigger value="history">Export History</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({scheduledExports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Export Name</label>
              <Input placeholder="e.g. Q2 Sales Report" value={exportName} onChange={(e) => setExportName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Source Company</label>
                <Select value={sourceCompany} onValueChange={setSourceCompany}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {COMPANIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Source Module</label>
                <Select value={sourceModule} onValueChange={setSourceModule}>
                  <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                  <SelectContent>
                    {MODULES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Format</label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">From</label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">To</label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
              <label className="text-sm text-foreground">Schedule Export</label>
            </div>
            {scheduleEnabled && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Schedule Date & Time</label>
                <Input type="datetime-local" />
              </div>
            )}

            <Button
              className="w-full bg-gradient-to-r from-primary to-primary/80"
              onClick={() => toast("Export job EXP-005 queued")}
            >
              Export Now
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Download</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EXPORT_HISTORY.map((job) => {
                  const sc = STATUS_CONFIG[job.status];
                  const fc = FORMAT_CONFIG[job.format];
                  return (
                    <TableRow key={job.id} className={cn(job.status === "failed" && "bg-destructive/5")}>
                      <TableCell className="font-mono text-xs text-primary">{job.id}</TableCell>
                      <TableCell className="text-sm text-foreground">{job.name}</TableCell>
                      <TableCell className="text-xs text-foreground">{job.sourceModule}</TableCell>
                      <TableCell>
                        <span className={cn("text-xs px-2 py-0.5 rounded-md", fc.color)}>{fc.label}</span>
                      </TableCell>
                      <TableCell className="text-xs text-foreground">{job.company}</TableCell>
                      <TableCell className="font-mono text-sm">{job.records.toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <span className={cn("text-xs border rounded-lg px-2 py-0.5", sc.color)}>{sc.label}</span>
                      </TableCell>
                      <TableCell>
                        {job.status === "completed" ? (
                          <button
                            onClick={() => toast(`Downloading ${job.name}...`)}
                            className="p-1 rounded hover:bg-muted/50 transition-colors"
                          >
                            <Download className="h-4 w-4 text-primary" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] text-muted-foreground">
                        {job.completedAt || job.scheduledAt || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="scheduled">
          {scheduledExports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No scheduled exports</div>
          ) : (
            <div className="space-y-3">
              {scheduledExports.map((job) => (
                <div key={job.id} className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{job.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{job.id}</p>
                    <p className="text-xs text-muted-foreground mt-1">{job.company} · {job.sourceModule}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Scheduled: {job.scheduledAt}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast(`Cancelled ${job.name}`)}>
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </BridgeLayout>
  );
}
