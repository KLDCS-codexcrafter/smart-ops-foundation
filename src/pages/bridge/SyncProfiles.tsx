import { useState } from "react";
import { toast } from "sonner";
import {
  Calendar, FileText, Package, Archive,
  RefreshCw, BookOpen, Building2, Plus, Copy,
} from "lucide-react";
import { BridgeLayout } from "@/components/layout/BridgeLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ProfileStatus = "approved" | "pending" | "draft";
type SyncModule =
  | "sales_vouchers" | "purchase_vouchers" | "journal_entries"
  | "receipt_vouchers" | "payment_vouchers" | "contra_vouchers"
  | "debit_notes" | "credit_notes" | "ledger_masters"
  | "stock_items" | "cost_centres" | "currency";

interface SyncProfile {
  id: string;
  name: string;
  description: string;
  companies: string[];
  modules: SyncModule[];
  dateRange: string;
  status: ProfileStatus;
  lastUsed: string;
  usageCount: number;
  createdBy: string;
  approvedBy?: string;
}

const MODULE_LABELS: Record<SyncModule, string> = {
  sales_vouchers: "Sales Vouchers",
  purchase_vouchers: "Purchase Vouchers",
  journal_entries: "Journal Entries",
  receipt_vouchers: "Receipt Vouchers",
  payment_vouchers: "Payment Vouchers",
  contra_vouchers: "Contra Vouchers",
  debit_notes: "Debit Notes",
  credit_notes: "Credit Notes",
  ledger_masters: "Ledger Masters",
  stock_items: "Stock Items",
  cost_centres: "Cost Centres",
  currency: "Currency",
};

const SAVED_PROFILES: SyncProfile[] = [
  {
    id: "PROF-001", name: "Q1 Monthly Close — Reliance Digital",
    description: "Full ledger and voucher sync for Q1 2026 month-end closing",
    companies: ["Reliance Digital Solutions"],
    modules: ["sales_vouchers", "purchase_vouchers", "ledger_masters", "journal_entries"],
    dateRange: "01 Jan 2026 – 31 Mar 2026", status: "approved", lastUsed: "2 days ago",
    usageCount: 12, createdBy: "arjun.mehta@reliancedigital.in", approvedBy: "Platform Admin",
  },
  {
    id: "PROF-002", name: "GST Filing Prep — All Companies",
    description: "Sales and purchase vouchers for GST return preparation",
    companies: ["Reliance Digital Solutions", "Tata Motors Finance", "Wipro Enterprises"],
    modules: ["sales_vouchers", "purchase_vouchers"],
    dateRange: "01 Apr 2026 – 30 Jun 2026", status: "approved", lastUsed: "1 week ago",
    usageCount: 4, createdBy: "Platform Admin", approvedBy: "Platform Admin",
  },
  {
    id: "PROF-003", name: "Stock Audit Q4 — Tata Motors",
    description: "Complete stock items and movement for Q4 annual audit",
    companies: ["Tata Motors Finance"],
    modules: ["stock_items", "cost_centres"],
    dateRange: "01 Jan 2026 – 31 Mar 2026", status: "pending", lastUsed: "Never",
    usageCount: 0, createdBy: "vikram.nair@tatamotors.com",
  },
  {
    id: "PROF-004", name: "Year-End Close FY 2025-26",
    description: "Complete company sync for annual financial closing",
    companies: ["Reliance Digital Solutions", "Tata Motors Finance", "Infosys BPM Limited", "Wipro Enterprises", "Mahindra Logistics"],
    modules: ["sales_vouchers", "purchase_vouchers", "journal_entries", "receipt_vouchers", "payment_vouchers", "ledger_masters", "stock_items"],
    dateRange: "01 Apr 2025 – 31 Mar 2026", status: "draft", lastUsed: "Never",
    usageCount: 0, createdBy: "Platform Admin",
  },
  {
    id: "PROF-005", name: "Daily Voucher Sync — Mahindra",
    description: "Automated daily sync of all voucher types",
    companies: ["Mahindra Logistics"],
    modules: ["sales_vouchers", "purchase_vouchers", "receipt_vouchers", "payment_vouchers"],
    dateRange: "Rolling — last 7 days", status: "approved", lastUsed: "Today",
    usageCount: 67, createdBy: "kiran.patil@mahindra.com", approvedBy: "Platform Admin",
  },
];

const TEMPLATE_GALLERY = [
  { name: "Monthly Close", desc: "Full ledger + voucher sync for month-end", modules: 4, icon: "Calendar" },
  { name: "GST Filing Prep", desc: "Sales & purchase vouchers for GST returns", modules: 2, icon: "FileText" },
  { name: "Stock Audit", desc: "Complete stock items and movements", modules: 2, icon: "Package" },
  { name: "Year-End Close", desc: "Full company sync for annual closing", modules: 7, icon: "Archive" },
  { name: "Daily Sync", desc: "Rolling 7-day voucher sync automation", modules: 4, icon: "RefreshCw" },
  { name: "Ledger Audit", desc: "Ledger masters + cost centres", modules: 2, icon: "BookOpen" },
];

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  Calendar, FileText, Package, Archive, RefreshCw, BookOpen,
};

const STATUS_CONFIG: Record<ProfileStatus, { label: string; color: string }> = {
  approved: { label: "Approved", color: "bg-success/10 text-success border-success/20" },
  pending: { label: "Pending", color: "bg-warning/10 text-warning border-warning/20" },
  draft: { label: "Draft", color: "bg-secondary text-muted-foreground border-border" },
};

const COMPANY_LIST = [
  { name: "Reliance Digital Solutions", agent: "AGENT-01", status: "online" },
  { name: "Tata Motors Finance", agent: "AGENT-02", status: "online" },
  { name: "Infosys BPM Limited", agent: "AGENT-03", status: "offline" },
  { name: "Wipro Enterprises", agent: "AGENT-04", status: "error" },
  { name: "Mahindra Logistics", agent: "AGENT-01", status: "online" },
];

const VOUCHER_MODULES: SyncModule[] = [
  "sales_vouchers", "purchase_vouchers", "journal_entries",
  "receipt_vouchers", "payment_vouchers", "contra_vouchers",
  "debit_notes", "credit_notes",
];
const MASTER_MODULES: SyncModule[] = ["ledger_masters", "stock_items", "cost_centres", "currency"];

export default function SyncProfiles() {
  const [tab, setTab] = useState("profiles");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(
    ["Reliance Digital Solutions", "Tata Motors Finance"]
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedModules, setSelectedModules] = useState<SyncModule[]>(
    ["sales_vouchers", "purchase_vouchers", "journal_entries", "receipt_vouchers", "payment_vouchers"]
  );
  const [profileName, setProfileName] = useState("");
  const [profileDesc, setProfileDesc] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);

  const filteredProfiles = SAVED_PROFILES.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleCompany = (name: string) =>
    setSelectedCompanies((prev) => prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]);

  const toggleModule = (m: SyncModule) =>
    setSelectedModules((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);

  const formatCompanies = (companies: string[]) => {
    if (companies.length <= 2) return companies.join(", ");
    return `${companies.slice(0, 2).join(", ")} and ${companies.length - 2} more`;
  };

  return (
    <BridgeLayout title="Sync Profiles" subtitle="Create and manage reusable Tally Prime sync configurations">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="profiles">My Profiles ({SAVED_PROFILES.length})</TabsTrigger>
          <TabsTrigger value="configure">Configure New</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* TAB 1 — MY PROFILES */}
        <TabsContent value="profiles">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <Input placeholder="Search profiles..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Button className="ml-auto bg-gradient-to-r from-primary to-primary/80" onClick={() => setTab("configure")}>
              <Plus className="h-4 w-4 mr-1" /> New Profile
            </Button>
          </div>

          {filteredProfiles.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">No profiles match filters</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredProfiles.map((p) => (
                <div key={p.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 cursor-pointer transition-colors">
                  <div className="flex items-start justify-between">
                    <p className="text-sm font-semibold text-foreground">{p.name}</p>
                    <span className={cn("text-xs border rounded-md px-2 py-0.5 ml-2 shrink-0", STATUS_CONFIG[p.status].color)}>
                      {STATUS_CONFIG[p.status].label}
                    </span>
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{p.id}</p>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.description}</p>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {p.modules.slice(0, 3).map((m) => (
                      <span key={m} className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-md">
                        {MODULE_LABELS[m]}
                      </span>
                    ))}
                    {p.modules.length > 3 && (
                      <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">+{p.modules.length - 3} more</span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    <Building2 className="h-3 w-3 inline mr-1" />
                    {formatCompanies(p.companies)}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <div>
                      <span className="font-mono text-xs text-muted-foreground">Used {p.usageCount}×</span>
                      <span className="text-[10px] text-muted-foreground ml-2">Last: {p.lastUsed}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="bg-gradient-to-r from-primary to-primary/80 text-xs h-7" onClick={() => toast(`Running ${p.name}...`)}>
                        Use Profile
                      </Button>
                      {p.status === "approved" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast("Profile duplicated to drafts")}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 2 — CONFIGURE NEW */}
        <TabsContent value="configure">
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 mb-5 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-warning shrink-0" />
            <p className="text-xs text-warning">New sync profiles require Tenant Admin approval before first use.</p>
          </div>

          {/* Profile Details */}
          <div className="bg-card border border-border rounded-xl p-5 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Profile Details</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Profile Name *</label>
                <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="e.g. Q1 Monthly Close" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <Textarea value={profileDesc} onChange={(e) => setProfileDesc(e.target.value)} rows={2} placeholder="What does this profile sync?" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Created By</label>
                <Input value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} placeholder="your@email.com" />
              </div>
            </div>
          </div>

          {/* Company Selection */}
          <div className="bg-card border border-border rounded-xl p-5 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Company Selection</p>
            <p className="text-xs text-muted-foreground mb-3">Select Companies to Sync</p>
            <div className="space-y-2">
              {COMPANY_LIST.map((c) => (
                <label key={c.name} className="flex items-center gap-3 py-1.5 cursor-pointer">
                  <Checkbox
                    checked={selectedCompanies.includes(c.name)}
                    onCheckedChange={() => toggleCompany(c.name)}
                  />
                  <span className="text-sm text-foreground">{c.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">({c.agent})</span>
                  {c.status === "offline" && (
                    <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded">offline</span>
                  )}
                  {c.status === "error" && (
                    <span className="text-[10px] text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">error</span>
                  )}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Infosys BPM (AGENT-03 offline) and Wipro (AGENT-04 error) may fail. Resolve agent issues before running.
            </p>
          </div>

          {/* Date Range */}
          <div className="bg-card border border-border rounded-xl p-5 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Date Range</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">From</label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">To</label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {["Today", "This Week", "This Month", "This Quarter", "This FY"].map((q) => (
                <button
                  key={q}
                  className="text-xs px-3 py-1 rounded-md bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
                  onClick={() => toast(`Date range set to "${q}"`)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div className="bg-card border border-border rounded-xl p-5 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Modules & Voucher Types</p>

            <p className="text-xs text-muted-foreground mb-2">Voucher Types</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {VOUCHER_MODULES.map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={selectedModules.includes(m)} onCheckedChange={() => toggleModule(m)} />
                  <span className="text-sm text-foreground">{MODULE_LABELS[m]}</span>
                </label>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mb-2">Masters</p>
            <div className="grid grid-cols-2 gap-2">
              {MASTER_MODULES.map((m) => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={selectedModules.includes(m)} onCheckedChange={() => toggleModule(m)} />
                  <span className="text-sm text-foreground">{MODULE_LABELS[m]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Profile Settings */}
          <div className="bg-card border border-border rounded-xl p-5 mb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Profile Settings</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Profile Name for Save</label>
                <Input placeholder="e.g. Q1 Monthly Close — Reliance Digital" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Save as reusable template</span>
                <Switch checked={saveAsTemplate} onCheckedChange={setSaveAsTemplate} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => toast("Saved as draft")}>Save as Draft</Button>
            <Button className="bg-gradient-to-r from-primary to-primary/80" onClick={() => toast("Submitted for approval")}>Submit for Approval</Button>
          </div>
        </TabsContent>

        {/* TAB 3 — TEMPLATES */}
        <TabsContent value="templates">
          <p className="text-sm text-muted-foreground mb-4">Pre-built sync templates for common use cases</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATE_GALLERY.map((t) => {
              const Icon = TEMPLATE_ICONS[t.icon] || Calendar;
              return (
                <div key={t.name} className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 cursor-pointer transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                  <span className="bg-secondary text-muted-foreground text-xs mt-2 inline-block px-2 py-0.5 rounded-md">
                    {t.modules} modules
                  </span>
                  <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => toast(`Template '${t.name}' loaded into Configure New`)}>
                    Use Template
                  </Button>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </BridgeLayout>
  );
}
