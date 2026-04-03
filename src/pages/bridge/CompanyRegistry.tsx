import { useState } from "react";
import { toast } from "sonner";
import {
  Building2, Plug, Activity, RefreshCw,
  Plus, Eye, Settings, RotateCcw, SearchX,
  Loader2,
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
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type ConnMode = "json_http" | "odbc" | "file_watch";
type CompanyStatus = "connected" | "disconnected" | "syncing" | "error";

interface TallyCompany {
  id: string;
  name: string;
  tallyCompanyName: string;
  tenantId: string;
  tenantName: string;
  agentId: string;
  status: CompanyStatus;
  connMode: ConnMode;
  tallyVersion: string;
  tallyPort: number;
  odbcEnabled: boolean;
  lastSync: string;
  lastSyncStatus: "success" | "failed" | "partial";
  syncCount: number;
  errorCount: number;
  healthScore: number;
  financialYear: string;
  gstin: string;
  baseCurrency: string;
}

const COMPANIES: TallyCompany[] = [
  {
    id: "COMP-001", name: "Reliance Digital Solutions Pvt Ltd", tallyCompanyName: "Reliance Digital Solutions Pvt. Ltd.",
    tenantId: "TNT-001", tenantName: "Reliance Digital Solutions", agentId: "AGENT-01", status: "syncing", connMode: "json_http",
    tallyVersion: "Tally Prime 7.0", tallyPort: 9000, odbcEnabled: true, lastSync: "03 Apr 2026, 09:10 IST",
    lastSyncStatus: "success", syncCount: 156, errorCount: 2, healthScore: 94, financialYear: "2025-26",
    gstin: "27AABCR1234M1ZX", baseCurrency: "INR",
  },
  {
    id: "COMP-002", name: "Tata Motors Finance Ltd", tallyCompanyName: "Tata Motors Finance Limited",
    tenantId: "TNT-002", tenantName: "Tata Motors Finance", agentId: "AGENT-02", status: "connected", connMode: "odbc",
    tallyVersion: "Tally Prime 7.0", tallyPort: 9000, odbcEnabled: true, lastSync: "03 Apr 2026, 08:52 IST",
    lastSyncStatus: "success", syncCount: 89, errorCount: 8, healthScore: 78, financialYear: "2025-26",
    gstin: "27AAACT1234K1ZX", baseCurrency: "INR",
  },
  {
    id: "COMP-003", name: "Infosys BPM Limited", tallyCompanyName: "Infosys BPM Ltd",
    tenantId: "TNT-003", tenantName: "Infosys BPM Limited", agentId: "AGENT-03", status: "disconnected", connMode: "json_http",
    tallyVersion: "Tally Prime 6.1", tallyPort: 9000, odbcEnabled: false, lastSync: "03 Apr 2026, 07:30 IST",
    lastSyncStatus: "success", syncCount: 234, errorCount: 1, healthScore: 97, financialYear: "2025-26",
    gstin: "29AABCI1234A1ZX", baseCurrency: "INR",
  },
  {
    id: "COMP-004", name: "Wipro Enterprises Ltd", tallyCompanyName: "Wipro Enterprises Limited",
    tenantId: "TNT-004", tenantName: "Wipro Enterprises", agentId: "AGENT-04", status: "error", connMode: "json_http",
    tallyVersion: "Tally Prime 7.0", tallyPort: 9000, odbcEnabled: true, lastSync: "02 Apr 2026, 11:45 IST",
    lastSyncStatus: "failed", syncCount: 45, errorCount: 12, healthScore: 62, financialYear: "2025-26",
    gstin: "29AABCW1234P1ZX", baseCurrency: "INR",
  },
  {
    id: "COMP-005", name: "Mahindra Logistics Ltd", tallyCompanyName: "Mahindra Logistics Limited",
    tenantId: "TNT-005", tenantName: "Mahindra Logistics", agentId: "AGENT-01", status: "connected", connMode: "file_watch",
    tallyVersion: "Tally Prime 7.0", tallyPort: 9000, odbcEnabled: false, lastSync: "03 Apr 2026, 06:30 IST",
    lastSyncStatus: "partial", syncCount: 67, errorCount: 4, healthScore: 81, financialYear: "2025-26",
    gstin: "27AABCM1234L1ZX", baseCurrency: "INR",
  },
];

const STATUS_CONFIG: Record<CompanyStatus, { label: string; color: string; dot: string }> = {
  connected:    { label: "Connected",    color: "bg-success/10 text-success border-success/20",           dot: "bg-success" },
  syncing:      { label: "Syncing",      color: "bg-primary/10 text-primary border-primary/20",           dot: "bg-primary animate-pulse" },
  disconnected: { label: "Disconnected", color: "bg-secondary text-muted-foreground border-border",       dot: "bg-muted-foreground" },
  error:        { label: "Error",        color: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive animate-pulse" },
};

const CONN_MODE_CONFIG: Record<ConnMode, { label: string; color: string }> = {
  json_http:  { label: "JSON HTTP",  color: "bg-primary/10 text-primary border-primary/20" },
  odbc:       { label: "ODBC",       color: "bg-accent/10 text-accent-foreground border-accent/20" },
  file_watch: { label: "File Watch", color: "bg-warning/10 text-warning border-warning/20" },
};

const TENANTS = [
  { id: "TNT-001", name: "Reliance Digital Solutions" },
  { id: "TNT-002", name: "Tata Motors Finance" },
  { id: "TNT-003", name: "Infosys BPM Limited" },
  { id: "TNT-004", name: "Wipro Enterprises" },
  { id: "TNT-005", name: "Mahindra Logistics" },
];

export default function CompanyRegistry() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<TallyCompany | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // Add form state
  const [addTenant, setAddTenant] = useState("");
  const [addAgent, setAddAgent] = useState("");
  const [addName, setAddName] = useState("");
  const [addTallyName, setAddTallyName] = useState("");
  const [addGstin, setAddGstin] = useState("");
  const [addFY, setAddFY] = useState("2025-26");
  const [addConnMode, setAddConnMode] = useState<ConnMode>("json_http");
  const [addPort, setAddPort] = useState("9000");
  const [addOdbc, setAddOdbc] = useState(false);

  const openDetail = (c: TallyCompany) => { setSelectedCompany(c); setShowDetail(true); };

  const filtered = COMPANIES.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      c.gstin.toLowerCase().includes(q) ||
      c.tenantName.toLowerCase().includes(q) ||
      c.agentId.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchMode = modeFilter === "all" || c.connMode === modeFilter;
    return matchSearch && matchStatus && matchMode;
  });

  const connectedCount = COMPANIES.filter(c => c.status === "connected" || c.status === "syncing").length;
  const avgHealth = Math.round(COMPANIES.reduce((s, c) => s + c.healthScore, 0) / COMPANIES.length);
  const totalSyncs = COMPANIES.reduce((s, c) => s + c.syncCount, 0);

  const handleAddCompany = () => {
    setAddLoading(true);
    setTimeout(() => {
      setAddLoading(false);
      setShowAdd(false);
      toast.success(`${addName || "Company"} registered successfully`);
      setAddName(""); setAddTallyName(""); setAddGstin(""); setAddTenant(""); setAddAgent("");
    }, 1000);
  };

  const handleTestConnection = () => {
    setTimeout(() => toast.success("Testing connection... OK"), 1500);
  };

  return (
    <BridgeLayout title="Company Registry" subtitle="All connected Tally Prime companies — connection status and configuration">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Companies", count: COMPANIES.length, icon: Building2, color: "text-primary" },
          { label: "Connected", count: connectedCount, icon: Plug, color: "text-success" },
          { label: "Avg Health Score", count: `${avgHealth}/100`, icon: Activity, color: "text-primary" },
          { label: "Total Syncs", count: totalSyncs, icon: RefreshCw, color: "text-accent-foreground" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <s.icon className={cn("h-4 w-4", s.color)} />
            </div>
            <p className={cn("text-2xl font-bold font-mono", s.color)}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-64">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="connected">Connected</SelectItem>
            <SelectItem value="syncing">Syncing</SelectItem>
            <SelectItem value="disconnected">Disconnected</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Modes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="json_http">JSON HTTP</SelectItem>
            <SelectItem value="odbc">ODBC</SelectItem>
            <SelectItem value="file_watch">File Watch</SelectItem>
          </SelectContent>
        </Select>
        <Button className="ml-auto bg-gradient-to-r from-primary to-primary/80" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Company
        </Button>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-3">Showing {filtered.length} of {COMPANIES.length} companies</p>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Conn Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Last Sync</TableHead>
              <TableHead>Syncs</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <SearchX className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No companies found</p>
                </TableCell>
              </TableRow>
            ) : filtered.map((c) => (
              <TableRow
                key={c.id}
                className={cn("hover:bg-muted/30 cursor-pointer", c.status === "error" && "bg-destructive/5")}
                onClick={() => openDetail(c)}
              >
                <TableCell>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground italic">{c.tallyCompanyName}</p>
                  <p className="font-mono text-[10px] text-muted-foreground/60">{c.id}</p>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-foreground">{c.tenantName}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{c.tenantId}</p>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">{c.agentId}</span>
                </TableCell>
                <TableCell>
                  <span className={cn("text-xs border rounded-md px-2 py-0.5", CONN_MODE_CONFIG[c.connMode].color)}>
                    {CONN_MODE_CONFIG[c.connMode].label}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={cn("inline-flex items-center gap-1.5 text-xs border rounded-lg px-2 py-1", STATUS_CONFIG[c.status].color)}>
                    <span className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[c.status].dot)} />
                    {STATUS_CONFIG[c.status].label}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", c.healthScore >= 90 ? "bg-success" : c.healthScore >= 70 ? "bg-warning" : "bg-destructive")}
                        style={{ width: `${c.healthScore}%` }}
                      />
                    </div>
                    <span className={cn("font-mono text-xs", c.healthScore >= 90 ? "text-success" : c.healthScore >= 70 ? "text-warning" : "text-destructive")}>
                      {c.healthScore}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="font-mono text-[10px] text-muted-foreground">{c.lastSync}</p>
                  <p className={cn("text-[10px]",
                    c.lastSyncStatus === "success" ? "text-success" : c.lastSyncStatus === "failed" ? "text-destructive" : "text-warning"
                  )}>{c.lastSyncStatus}</p>
                </TableCell>
                <TableCell>
                  <p className="font-mono text-sm text-foreground">{c.syncCount}</p>
                  {c.errorCount > 0 && <p className="text-[10px] text-destructive">{c.errorCount} errors</p>}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(c)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast("Company config coming soon")}>
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                    {(c.status === "error" || c.status === "disconnected") && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast(`Reconnecting ${c.name}...`)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add Company Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Tally Company</DialogTitle>
            <DialogDescription>Register a new Tally Prime company for sync</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Tenant & Agent</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tenant *</label>
                  <Select value={addTenant} onValueChange={setAddTenant}>
                    <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                    <SelectContent>
                      {TENANTS.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Agent *</label>
                  <Select value={addAgent} onValueChange={setAddAgent}>
                    <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent>
                      {["AGENT-01","AGENT-02","AGENT-03","AGENT-04"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Company Details</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Company Display Name *</label>
                  <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Reliance Digital Solutions" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tally Company Name *</label>
                  <Input value={addTallyName} onChange={(e) => setAddTallyName(e.target.value)} placeholder="Exact name as shown in Tally" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">GSTIN</label>
                  <Input value={addGstin} onChange={(e) => setAddGstin(e.target.value.toUpperCase())} placeholder="27AABCR1234M1ZX" maxLength={15} className="font-mono uppercase" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Financial Year</label>
                  <Select value={addFY} onValueChange={setAddFY}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025-26">2025-26</SelectItem>
                      <SelectItem value="2024-25">2024-25</SelectItem>
                      <SelectItem value="2023-24">2023-24</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Connection Config</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Connection Mode</label>
                  <Select value={addConnMode} onValueChange={(v) => setAddConnMode(v as ConnMode)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json_http">JSON HTTP (Primary — Tally Prime 7)</SelectItem>
                      <SelectItem value="odbc">ODBC (Fast read-only)</SelectItem>
                      <SelectItem value="file_watch">File Watch (Fallback)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tally HTTP Port</label>
                  <Input type="number" value={addPort} onChange={(e) => setAddPort(e.target.value)} className="font-mono" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">Enable ODBC for fast read operations</p>
                    <p className="text-xs text-muted-foreground">Requires Tally ODBC Driver on client machine</p>
                  </div>
                  <Switch checked={addOdbc} onCheckedChange={setAddOdbc} />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="bg-gradient-to-r from-primary to-primary/80" disabled={addLoading} onClick={handleAddCompany}>
              {addLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Register Company
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent side="right" className="w-[500px] sm:w-[500px] overflow-y-auto">
          {selectedCompany && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg font-semibold">{selectedCompany.name}</SheetTitle>
                <p className="text-sm text-muted-foreground italic">{selectedCompany.tallyCompanyName}</p>
                <div className="flex gap-2 mt-2">
                  <span className={cn("inline-flex items-center gap-1.5 text-xs border rounded-lg px-2 py-1", STATUS_CONFIG[selectedCompany.status].color)}>
                    <span className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[selectedCompany.status].dot)} />
                    {STATUS_CONFIG[selectedCompany.status].label}
                  </span>
                  <span className={cn("text-xs border rounded-md px-2 py-0.5", CONN_MODE_CONFIG[selectedCompany.connMode].color)}>
                    {CONN_MODE_CONFIG[selectedCompany.connMode].label}
                  </span>
                </div>
              </SheetHeader>

              <div className="space-y-5 mt-6">
                {/* Identity */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Identity</p>
                  <div className="space-y-2">
                    {[
                      ["Company ID", selectedCompany.id, true],
                      ["Tenant", selectedCompany.tenantName, false],
                      ["Tenant ID", selectedCompany.tenantId, true],
                      ["GSTIN", selectedCompany.gstin, true],
                      ["Financial Year", selectedCompany.financialYear, false],
                      ["Base Currency", selectedCompany.baseCurrency, false],
                    ].map(([label, value, mono]) => (
                      <div key={label as string} className="flex justify-between py-1.5 border-b border-border last:border-0">
                        <span className="text-xs text-muted-foreground">{label as string}</span>
                        <span className={cn("text-xs text-foreground", mono && "font-mono")}>{value as string}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connection */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Connection</p>
                  <div className="space-y-2">
                    {[
                      ["Agent ID", selectedCompany.agentId, true],
                      ["Tally Version", selectedCompany.tallyVersion, false],
                      ["HTTP Port", String(selectedCompany.tallyPort), true],
                      ["Connection Mode", CONN_MODE_CONFIG[selectedCompany.connMode].label, false],
                      ["ODBC", selectedCompany.odbcEnabled ? "Enabled" : "Disabled", false],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex justify-between py-1.5 border-b border-border last:border-0">
                        <span className="text-xs text-muted-foreground">{label as string}</span>
                        <span className={cn("text-xs text-foreground",
                          (label === "Agent ID" || label === "HTTP Port") && "font-mono",
                          label === "ODBC" && (value === "Enabled" ? "text-success" : "text-muted-foreground")
                        )}>{value as string}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sync Stats */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Sync Stats</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Total Syncs</p>
                      <p className="font-mono text-lg font-bold text-foreground">{selectedCompany.syncCount}</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Error Count</p>
                      <p className={cn("font-mono text-lg font-bold", selectedCompany.errorCount > 0 ? "text-destructive" : "text-foreground")}>{selectedCompany.errorCount}</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Health Score</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className={cn("font-mono text-lg font-bold",
                          selectedCompany.healthScore >= 90 ? "text-success" : selectedCompany.healthScore >= 70 ? "text-warning" : "text-destructive"
                        )}>{selectedCompany.healthScore}</p>
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full",
                            selectedCompany.healthScore >= 90 ? "bg-success" : selectedCompany.healthScore >= 70 ? "bg-warning" : "bg-destructive"
                          )} style={{ width: `${selectedCompany.healthScore}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Last Sync</p>
                      <p className="font-mono text-xs text-foreground mt-1">{selectedCompany.lastSync}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button className="w-full bg-gradient-to-r from-primary to-primary/80" onClick={() => toast(`Manual sync triggered for ${selectedCompany.name}`)}>
                    Trigger Manual Sync
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleTestConnection}>
                    Test Connection
                  </Button>
                  {(selectedCompany.status === "error" || selectedCompany.status === "disconnected") && (
                    <Button variant="outline" className="w-full" onClick={() => toast(`Reconnecting ${selectedCompany.name}...`)}>
                      <RotateCcw className="h-4 w-4 mr-1" /> Reconnect
                    </Button>
                  )}
                  <Button variant="outline" className="w-full text-destructive border-destructive/20 hover:bg-destructive/5" onClick={() => toast("Remove feature coming soon")}>
                    Remove Company
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
