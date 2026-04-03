import { useState } from "react";
import { toast } from "sonner";
import {
  Building2, Users, CreditCard, TrendingUp,
  Search, Plus, Eye, Settings, AlertTriangle,
  CheckCircle, SearchX, Copy, Check, Loader2,
  ChevronRight, X,
} from "lucide-react";
import { TowerLayout } from "@/components/layout/TowerLayout";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/* ── types ── */
type TenantStatus = "active" | "trial" | "suspended";
type TenantPlan = "Starter" | "Growth" | "Enterprise";

interface Tenant {
  id: string;
  name: string;
  gstin: string;
  city: string;
  state: string;
  plan: TenantPlan;
  status: TenantStatus;
  users: number;
  modules: number;
  mrr: number;
  trialEndsAt?: string;
  createdAt: string;
  lastActive: string;
  healthScore: number;
}

/* ── mock data ── */
const TENANTS: Tenant[] = [
  { id: "TNT-001", name: "Reliance Digital Solutions Pvt Ltd", gstin: "27AABCR1234M1ZX", city: "Mumbai", state: "Maharashtra", plan: "Enterprise", status: "active", users: 142, modules: 14, mrr: 8500000, createdAt: "12 Jan 2024", lastActive: "2 min ago", healthScore: 94 },
  { id: "TNT-002", name: "Tata Motors Finance Ltd", gstin: "27AAACT1234K1ZX", city: "Pune", state: "Maharashtra", plan: "Enterprise", status: "active", users: 98, modules: 11, mrr: 6200000, createdAt: "28 Feb 2024", lastActive: "15 min ago", healthScore: 88 },
  { id: "TNT-003", name: "Infosys BPM Limited", gstin: "29AABCI1234A1ZX", city: "Bengaluru", state: "Karnataka", plan: "Growth", status: "active", users: 67, modules: 8, mrr: 3800000, createdAt: "05 Mar 2024", lastActive: "1 hr ago", healthScore: 91 },
  { id: "TNT-004", name: "Wipro Enterprises Ltd", gstin: "29AABCW1234P1ZX", city: "Bengaluru", state: "Karnataka", plan: "Growth", status: "active", users: 54, modules: 7, mrr: 3200000, createdAt: "14 Mar 2024", lastActive: "3 hr ago", healthScore: 82 },
  { id: "TNT-005", name: "Mahindra Logistics Ltd", gstin: "27AABCM1234L1ZX", city: "Mumbai", state: "Maharashtra", plan: "Growth", status: "active", users: 41, modules: 6, mrr: 2800000, createdAt: "22 Apr 2024", lastActive: "Yesterday", healthScore: 76 },
  { id: "TNT-006", name: "Bajaj Finserv Limited", gstin: "27AABCB1234F1ZX", city: "Pune", state: "Maharashtra", plan: "Starter", status: "trial", users: 12, modules: 3, mrr: 0, trialEndsAt: "3 days", createdAt: "01 Jun 2024", lastActive: "2 days ago", healthScore: 61 },
  { id: "TNT-007", name: "HCL Technologies Ltd", gstin: "09AABCH1234T1ZX", city: "Noida", state: "Uttar Pradesh", plan: "Starter", status: "trial", users: 8, modules: 2, mrr: 0, trialEndsAt: "7 days", createdAt: "10 Jun 2024", lastActive: "Today", healthScore: 55 },
  { id: "TNT-008", name: "Godrej Industries Limited", gstin: "27AABCG1234I1ZX", city: "Mumbai", state: "Maharashtra", plan: "Enterprise", status: "suspended", users: 0, modules: 12, mrr: 0, createdAt: "03 Nov 2023", lastActive: "21 days ago", healthScore: 0 },
  { id: "TNT-009", name: "Larsen & Toubro Infotech", gstin: "27AABCL1234T1ZX", city: "Navi Mumbai", state: "Maharashtra", plan: "Growth", status: "active", users: 33, modules: 5, mrr: 2400000, createdAt: "18 May 2024", lastActive: "4 hr ago", healthScore: 79 },
  { id: "TNT-010", name: "Adani Ports & SEZ Ltd", gstin: "24AABCA1234P1ZX", city: "Ahmedabad", state: "Gujarat", plan: "Starter", status: "trial", users: 5, modules: 2, mrr: 0, trialEndsAt: "12 days", createdAt: "15 Jun 2024", lastActive: "1 hr ago", healthScore: 48 },
  { id: "TNT-011", name: "Havells India Ltd", gstin: "07AABCH1234H1ZX", city: "New Delhi", state: "Delhi", plan: "Growth", status: "active", users: 28, modules: 6, mrr: 2100000, createdAt: "02 Feb 2024", lastActive: "30 min ago", healthScore: 85 },
  { id: "TNT-012", name: "Muthoot Finance Limited", gstin: "32AABCM1234F1ZX", city: "Kochi", state: "Kerala", plan: "Starter", status: "active", users: 19, modules: 3, mrr: 950000, createdAt: "28 Apr 2024", lastActive: "6 hr ago", healthScore: 71 },
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const MODULES_LIST = [
  "GST Filing", "Accounts & Finance", "Inventory Management",
  "Purchase & Procurement", "Sales & CRM", "HR & Payroll",
  "Production & Manufacturing", "Reports & Analytics",
];

function formatMRR(paise: number): string {
  if (paise === 0) return "—";
  const rupees = paise / 100;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(1)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return `₹${rupees}`;
}

/* ── stat card ── */
function StatCard({ icon: Icon, label, value, valueClass, sub }: {
  icon: React.ElementType; label: string; value: string | number;
  valueClass?: string; sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className={cn("font-mono text-2xl font-bold text-foreground", valueClass)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

/* ── provision stepper ── */
const STEP_LABELS = ["Organisation", "Plan", "Modules", "Admin", "Review"];
const PROVISION_STEPS_TEXT = [
  "Creating organisation database...",
  "Running schema migrations...",
  "Creating admin user...",
  "Sending welcome email...",
  "Provisioning complete!",
];

/* ── main component ── */
export default function Tenants() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TenantStatus | "all">("all");
  const [planFilter, setPlanFilter] = useState<TenantPlan | "all">("all");
  const [showProvision, setShowProvision] = useState(false);
  const [provisionStep, setProvisionStep] = useState(0);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // provision form state
  const [provisionForm, setProvisionForm] = useState({
    company: "", gstin: "", city: "", state: "", contactName: "",
    contactEmail: "", contactMobile: "",
  });
  const [selectedPlan, setSelectedPlan] = useState<TenantPlan>("Growth");
  const [selectedModules, setSelectedModules] = useState<string[]>([...MODULES_LIST]);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [provisionProgress, setProvisionProgress] = useState<number>(-1);

  const filtered = TENANTS.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      t.name.toLowerCase().includes(q) ||
      t.gstin.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPlan = planFilter === "all" || t.plan === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

  const activeCount = TENANTS.filter((t) => t.status === "active").length;
  const trialCount = TENANTS.filter((t) => t.status === "trial").length;
  const suspendedCount = TENANTS.filter((t) => t.status === "suspended").length;
  const expiringCount = TENANTS.filter((t) => t.status === "trial" && t.trialEndsAt && parseInt(t.trialEndsAt) <= 7).length;

  const openDetail = (t: Tenant) => { setSelectedTenant(t); setShowDetail(true); };

  const resetProvision = () => {
    setShowProvision(false); setProvisionStep(0); setProvisioning(false);
    setProvisionProgress(-1);
    setProvisionForm({ company: "", gstin: "", city: "", state: "", contactName: "", contactEmail: "", contactMobile: "" });
    setSelectedPlan("Growth"); setSelectedModules([...MODULES_LIST]);
    setAdminName(""); setAdminEmail("");
  };

  const runProvision = () => {
    setProvisioning(true); setProvisionProgress(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < PROVISION_STEPS_TEXT.length) {
        setProvisionProgress(step);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          toast.success("Tenant provisioned successfully");
          resetProvision();
        }, 500);
      }
    }, 800);
  };

  const planCards: { plan: TenantPlan; price: string; features: string[] }[] = [
    { plan: "Starter", price: "₹9,500/mo", features: ["Up to 10 users", "3 modules", "Email support"] },
    { plan: "Growth", price: "₹28,000/mo", features: ["Up to 50 users", "8 modules", "Priority support"] },
    { plan: "Enterprise", price: "₹85,000/mo", features: ["Unlimited users", "All modules", "Dedicated support"] },
  ];

  return (
    <TowerLayout title="Tenants" subtitle="Manage all tenant organisations on the platform">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Building2} label="Total Tenants" value={TENANTS.length} />
        <StatCard icon={Users} label="Active" value={activeCount} valueClass="text-success" />
        <StatCard icon={CreditCard} label="On Trial" value={trialCount} valueClass="text-warning" sub={`${expiringCount} expiring ≤ 7 days`} />
        <StatCard icon={TrendingUp} label="Suspended" value={suspendedCount} valueClass="text-destructive" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tenants..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TenantStatus | "all")}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as TenantPlan | "all")}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Plans" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="Starter">Starter</SelectItem>
            <SelectItem value="Growth">Growth</SelectItem>
            <SelectItem value="Enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Button className="ml-auto" style={{ background: "var(--gradient-primary)" }} onClick={() => setShowProvision(true)}>
          <Plus className="h-4 w-4 mr-1" /> Provision Tenant
        </Button>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-3">Showing {filtered.length} of {TENANTS.length} tenants</p>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>MRR</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center">
                    <SearchX className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No tenants found</p>
                    <p className="text-xs text-muted-foreground/60">Try adjusting your search or filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((t) => (
                <TableRow key={t.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openDetail(t)}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{t.id} · {t.city}, {t.state}</p>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md", {
                      "bg-secondary text-muted-foreground": t.plan === "Starter",
                      "bg-primary/10 text-primary": t.plan === "Growth",
                      "bg-accent/10 text-accent": t.plan === "Enterprise",
                    })}>{t.plan}</span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs px-2 py-1 rounded-lg border", {
                      "bg-success/10 text-success border-success/20": t.status === "active",
                      "bg-warning/10 text-warning border-warning/20": t.status === "trial",
                      "bg-destructive/10 text-destructive border-destructive/20": t.status === "suspended",
                    })}>
                      {t.status === "trial" && t.trialEndsAt ? `Trial · ${t.trialEndsAt}` : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-mono text-foreground">{t.users}</TableCell>
                  <TableCell>
                    {t.mrr > 0 ? (
                      <span className="font-mono text-success">{formatMRR(t.mrr)}</span>
                    ) : (
                      <span className={cn("font-mono", t.status === "suspended" ? "text-destructive" : "text-muted-foreground")}>—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", {
                            "bg-success": t.healthScore >= 80,
                            "bg-warning": t.healthScore >= 60 && t.healthScore < 80,
                            "bg-destructive": t.healthScore > 0 && t.healthScore < 60,
                          })}
                          style={{ width: `${t.healthScore}%` }}
                        />
                      </div>
                      <span className={cn("text-xs font-mono ml-2", t.healthScore === 0 ? "text-muted-foreground" : "text-foreground")}>{t.healthScore}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">{t.lastActive}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(t)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast("Settings coming soon")}><Settings className="h-4 w-4" /></Button>
                      {t.status === "suspended" ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast("Activate feature coming soon")}><CheckCircle className="h-4 w-4 text-success" /></Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast("Suspend feature coming soon")}><AlertTriangle className="h-4 w-4 text-warning" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Provision Dialog */}
      <Dialog open={showProvision} onOpenChange={(o) => { if (!o) resetProvision(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Provision New Tenant</DialogTitle>
            <DialogDescription>Set up a new tenant organisation on the platform</DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-6 px-2">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {i > 0 && <div className={cn("h-0.5 flex-1", i <= provisionStep ? "bg-success" : "bg-muted")} />}
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0", {
                    "bg-primary text-primary-foreground": i === provisionStep && !provisioning,
                    "bg-success text-success-foreground": i < provisionStep || provisioning,
                    "bg-muted text-muted-foreground": i > provisionStep,
                  })}>
                    {i < provisionStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  {i < STEP_LABELS.length - 1 && <div className={cn("h-0.5 flex-1", i < provisionStep ? "bg-success" : "bg-muted")} />}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">{label}</span>
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="min-h-[260px]">
            {provisionStep === 0 && (
              <div className="space-y-3">
                <Input placeholder="Reliance Digital Solutions Pvt Ltd" value={provisionForm.company} onChange={(e) => setProvisionForm((f) => ({ ...f, company: e.target.value }))} />
                <Input placeholder="27AABCR1234M1ZX" maxLength={15} className="uppercase font-mono" value={provisionForm.gstin} onChange={(e) => setProvisionForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))} />
                <Input placeholder="Mumbai" value={provisionForm.city} onChange={(e) => setProvisionForm((f) => ({ ...f, city: e.target.value }))} />
                <Select value={provisionForm.state} onValueChange={(v) => setProvisionForm((f) => ({ ...f, state: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger>
                  <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Contact Name" value={provisionForm.contactName} onChange={(e) => setProvisionForm((f) => ({ ...f, contactName: e.target.value }))} />
                <Input type="email" placeholder="Contact Email" value={provisionForm.contactEmail} onChange={(e) => setProvisionForm((f) => ({ ...f, contactEmail: e.target.value }))} />
                <Input placeholder="9876543210" maxLength={10} value={provisionForm.contactMobile} onChange={(e) => setProvisionForm((f) => ({ ...f, contactMobile: e.target.value.replace(/\D/g, "") }))} />
              </div>
            )}

            {provisionStep === 1 && (
              <div className="grid gap-3">
                {planCards.map((p) => (
                  <button
                    key={p.plan}
                    onClick={() => setSelectedPlan(p.plan)}
                    className={cn("text-left rounded-xl p-4 transition-all", selectedPlan === p.plan ? "border-2 border-primary bg-primary/5" : "border border-border bg-card hover:border-primary/50")}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-foreground">{p.plan}</span>
                      <span className="font-mono text-sm text-primary">{p.price}</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {p.features.map((f) => <li key={f}>• {f}</li>)}
                    </ul>
                  </button>
                ))}
              </div>
            )}

            {provisionStep === 2 && (
              <div className="space-y-3">
                {MODULES_LIST.map((m) => (
                  <label key={m} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={selectedModules.includes(m)}
                      onCheckedChange={(checked) => {
                        setSelectedModules((prev) => checked ? [...prev, m] : prev.filter((x) => x !== m));
                      }}
                    />
                    <span className="text-sm text-foreground">{m}</span>
                  </label>
                ))}
              </div>
            )}

            {provisionStep === 3 && (
              <div className="space-y-3">
                <Input placeholder="Admin Name" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                <Input type="email" placeholder="Admin Email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Temporary Password</label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value="Sm@rtOps#2026" className="font-mono" />
                    <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText("Sm@rtOps#2026"); toast.success("Password copied"); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Admin will be required to change password on first login</p>
                </div>
              </div>
            )}

            {provisionStep === 4 && !provisioning && (
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Company</span><span className="font-medium text-foreground">{provisionForm.company || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">GSTIN</span><span className="font-mono text-foreground">{provisionForm.gstin || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="text-foreground">{selectedPlan}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Modules</span><span className="text-foreground">{selectedModules.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Admin Email</span><span className="text-foreground">{adminEmail || "—"}</span></div>
              </div>
            )}

            {provisionStep === 4 && provisioning && (
              <div className="space-y-3">
                {PROVISION_STEPS_TEXT.map((text, i) => (
                  <div key={i} className={cn("flex items-center gap-3 text-sm transition-opacity", i > provisionProgress ? "opacity-30" : "opacity-100")}>
                    {i <= provisionProgress ? (
                      i < provisionProgress ? <Check className="h-4 w-4 text-success shrink-0" /> : <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-muted shrink-0" />
                    )}
                    <span className={cn(i <= provisionProgress && i < provisionProgress ? "text-success" : "text-foreground")}>{text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {!provisioning && (
            <div className="flex items-center justify-between pt-2">
              <button className="text-xs text-muted-foreground hover:underline" onClick={resetProvision}>Cancel</button>
              <div className="flex gap-2">
                {provisionStep > 0 && <Button variant="outline" onClick={() => setProvisionStep((s) => s - 1)}>Back</Button>}
                {provisionStep < 4 ? (
                  <Button onClick={() => setProvisionStep((s) => s + 1)}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
                ) : (
                  <Button onClick={runProvision} style={{ background: "var(--gradient-primary)" }}>Provision</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tenant Detail Sheet */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg">{selectedTenant?.name}</SheetTitle>
            {selectedTenant && (
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-xs px-2 py-1 rounded-lg border", {
                  "bg-success/10 text-success border-success/20": selectedTenant.status === "active",
                  "bg-warning/10 text-warning border-warning/20": selectedTenant.status === "trial",
                  "bg-destructive/10 text-destructive border-destructive/20": selectedTenant.status === "suspended",
                })}>{selectedTenant.status.charAt(0).toUpperCase() + selectedTenant.status.slice(1)}</span>
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-md", {
                  "bg-secondary text-muted-foreground": selectedTenant.plan === "Starter",
                  "bg-primary/10 text-primary": selectedTenant.plan === "Growth",
                  "bg-accent/10 text-accent": selectedTenant.plan === "Enterprise",
                })}>{selectedTenant.plan}</span>
              </div>
            )}
          </SheetHeader>

          {selectedTenant && (
            <div className="mt-6 space-y-6">
              {/* Overview */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Overview</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">Users</p><p className="font-mono text-lg font-bold text-foreground">{selectedTenant.users}</p></div>
                  <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">Modules</p><p className="font-mono text-lg font-bold text-foreground">{selectedTenant.modules}</p></div>
                  <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">MRR</p><p className="font-mono text-lg font-bold text-success">{formatMRR(selectedTenant.mrr)}</p></div>
                  <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground">Health Score</p><p className="font-mono text-lg font-bold text-foreground">{selectedTenant.healthScore}</p></div>
                </div>
              </div>

              {/* Organisation Details */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Organisation Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Tenant ID</span><span className="font-mono text-xs text-foreground">{selectedTenant.id}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">GSTIN</span><span className="font-mono text-foreground">{selectedTenant.gstin}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="text-foreground">{selectedTenant.city}, {selectedTenant.state}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Member since</span><span className="text-foreground">{selectedTenant.createdAt}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Last active</span><span className="text-foreground">{selectedTenant.lastActive}</span></div>
                </div>
              </div>

              {/* Module Access */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Module Access</h4>
                <div className="flex flex-wrap gap-2">
                  {["GST Filing", "Accounts & Finance", "Inventory", "Sales & CRM", "Reports & Analytics"].slice(0, Math.min(5, selectedTenant.modules)).map((m) => (
                    <span key={m} className="bg-primary/10 text-primary rounded-md text-xs px-2 py-1">{m}</span>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => toast("Navigating to audit logs...")}>View Audit Logs</Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => toast("Navigate to users...")}>Manage Users</Button>
                  {selectedTenant.status === "suspended" ? (
                    <Button className="w-full bg-success hover:bg-success/90 text-success-foreground">Reactivate Tenant</Button>
                  ) : (
                    <Button variant="outline" className="w-full bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">Suspend Tenant</Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </TowerLayout>
  );
}
