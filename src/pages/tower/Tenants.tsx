import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Building2, Plus, CheckCircle, PauseCircle, Clock,
  Search, UserCheck, Grid3X3, AlertTriangle,
} from "lucide-react";
import { TowerLayout } from "@/components/layout/TowerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { onEnterNext } from '@/lib/keyboard';

type TenantStatus = "Active" | "Suspended" | "Trial";
type TenantPlan = "Starter" | "Professional" | "Enterprise";

interface Tenant {
  id: string;
  name: string;
  gstin: string;
  owner: string;
  plan: TenantPlan;
  status: TenantStatus;
  storageUsed: number;
  storageTotal: number;
  users: number;
  modules: number;
  lastActive: string;
}

// [JWT] In production: fetch from /api/tower/tenants
const INITIAL_TENANTS: Tenant[] = [
  { id: "T-001", name: "Acme India Pvt Ltd", gstin: "27AABCA1234F1Z5", owner: "cfo@acmeindia.in", plan: "Enterprise", status: "Active", storageUsed: 73, storageTotal: 200, users: 24, modules: 8, lastActive: "2 hr ago" },
  { id: "T-002", name: "Bharat Traders Pvt Ltd", gstin: "29AADBT4567K2Z3", owner: "admin@bharattraders.com", plan: "Professional", status: "Active", storageUsed: 18, storageTotal: 50, users: 8, modules: 5, lastActive: "30 min ago" },
  { id: "T-003", name: "Globe Exports Ltd", gstin: "33AAGCE8901P3Z1", owner: "it@globeexports.in", plan: "Enterprise", status: "Active", storageUsed: 91, storageTotal: 100, users: 31, modules: 9, lastActive: "5 min ago" },
  { id: "T-004", name: "Sunrise Manufacturing", gstin: "24AAHCS2345N4Z7", owner: "owner@sunrisemfg.in", plan: "Professional", status: "Suspended", storageUsed: 8, storageTotal: 50, users: 12, modules: 4, lastActive: "14 days ago" },
  { id: "T-005", name: "Raj & Associates CA", gstin: "07AABCR6789M5Z2", owner: "raj@rajca.in", plan: "Starter", status: "Active", storageUsed: 3, storageTotal: 10, users: 3, modules: 2, lastActive: "1 hr ago" },
  { id: "T-006", name: "Vidya Textiles", gstin: "08AADCV3456Q6Z9", owner: "admin@vidyatextiles.com", plan: "Professional", status: "Active", storageUsed: 34, storageTotal: 50, users: 15, modules: 6, lastActive: "4 hr ago" },
  { id: "T-007", name: "TechVision Solutions", gstin: "29AABCT7890R7Z4", owner: "cto@techvision.io", plan: "Professional", status: "Trial", storageUsed: 2, storageTotal: 10, users: 5, modules: 3, lastActive: "10 min ago" },
  { id: "T-008", name: "Metro Distributors", gstin: "27AACPM1234S8Z6", owner: "accounts@metrodist.in", plan: "Starter", status: "Suspended", storageUsed: 1, storageTotal: 10, users: 2, modules: 1, lastActive: "30 days ago" },
];

const PLAN_COLORS: Record<TenantPlan, string> = {
  Starter: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  Professional: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  Enterprise: "bg-purple-500/15 text-purple-400 border-purple-500/20",
};
const STATUS_COLORS: Record<TenantStatus, string> = {
  Active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  Suspended: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Trial: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
};
const AVATAR_COLORS: Record<TenantPlan, string> = {
  Starter: "bg-slate-600", Professional: "bg-cyan-600", Enterprise: "bg-purple-600",
};

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi",
  "Goa","Gujarat","Haryana","Himachal Pradesh","Jammu & Kashmir","Jharkhand",
  "Karnataka","Kerala","Ladakh","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim",
  "Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
];

const PLANS = [
  { name: "Starter" as TenantPlan, price: "₹2,999", storage: "10GB", users: "5 users", modules: "2 modules", extras: "" },
  { name: "Professional" as TenantPlan, price: "₹7,999", storage: "50GB", users: "25 users", modules: "All modules", extras: "" },
  { name: "Enterprise" as TenantPlan, price: "₹19,999", storage: "200GB", users: "Unlimited", modules: "All modules", extras: "+ Priority Support" },
];

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function storageColor(used: number, total: number) {
  const pct = (used / total) * 100;
  if (pct > 90) return "bg-red-500";
  if (pct > 70) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>(INITIAL_TENANTS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TenantPlan>("Professional");
  const [trialEnabled, setTrialEnabled] = useState(false);
  const [welcomeEmail, setWelcomeEmail] = useState(true);
  const [suspendTarget, setSuspendTarget] = useState<Tenant | null>(null);
  const [suspendReason, setSuspendReason] = useState("Billing overdue");
  const [reactivateTarget, setReactivateTarget] = useState<Tenant | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result = tenants.filter(t => {
      const ms = !q || t.name.toLowerCase().includes(q) || t.gstin.toLowerCase().includes(q) || t.owner.toLowerCase().includes(q);
      return ms && (statusFilter === "all" || t.status === statusFilter) && (planFilter === "all" || t.plan === planFilter);
    });
    if (sortBy === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "storage") result.sort((a, b) => (b.storageUsed / b.storageTotal) - (a.storageUsed / a.storageTotal));
    return result;
  }, [tenants, search, statusFilter, planFilter, sortBy]);

  const activeCount = tenants.filter(t => t.status === "Active").length;
  const suspendedCount = tenants.filter(t => t.status === "Suspended").length;
  const trialCount = tenants.filter(t => t.status === "Trial").length;

  const handleProvision = () => {
    // [JWT] POST /api/tower/tenants
    toast.success("Customer provisioned successfully. Welcome email sent to admin.");
    setProvisionOpen(false);
  };

  const handleSuspend = () => {
    if (!suspendTarget) return;
    // [JWT] PATCH /api/tower/tenants/:id/suspend
    setTenants(prev => prev.map(t => t.id === suspendTarget.id ? { ...t, status: "Suspended" as TenantStatus } : t));
    toast.success(`Customer "${suspendTarget.name}" suspended successfully.`);
    setSuspendTarget(null);
  };

  const handleReactivate = () => {
    if (!reactivateTarget) return;
    // [JWT] PATCH /api/tower/tenants/:id/activate
    setTenants(prev => prev.map(t => t.id === reactivateTarget.id ? { ...t, status: "Active" as TenantStatus } : t));
    toast.success(`Customer "${reactivateTarget.name}" reactivated successfully.`);
    setReactivateTarget(null);
  };

  return (
    <TowerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Building2 className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Customer Management</h1>
              <p className="text-sm text-slate-400">Manage all platform customers — provisioning, storage, plan and status</p>
            </div>
          </div>
          <Button className="bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => setProvisionOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Provision New Customer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Customers", value: tenants.length, icon: Building2, color: "text-white" },
            { label: "Active", value: activeCount, icon: CheckCircle, color: "text-emerald-400" },
            { label: "Suspended", value: suspendedCount, icon: PauseCircle, color: "text-amber-400" },
            { label: "Trial", value: trialCount, icon: Clock, color: "text-cyan-400" },
          ].map(s => (
            <div key={s.label} className="bg-[#1E3A5F] border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">{s.label}</p>
                <s.icon className={cn("h-4 w-4", s.color)} />
              </div>
              <p className={cn("text-2xl font-bold font-mono mt-1", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input placeholder="Search customers by name, GSTIN, owner..." className="pl-9 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
              <SelectItem value="Trial">Trial</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-36 bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="Starter">Starter</SelectItem>
              <SelectItem value="Professional">Professional</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="storage">Storage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tenant Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">No customers match your filters</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(t => {
              const pct = (t.storageUsed / t.storageTotal) * 100;
              return (
                <div data-keyboard-form key={t.id} className="bg-[#1E3A5F] border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold", AVATAR_COLORS[t.plan])}>
                        {getInitials(t.name)}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{t.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{t.gstin}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", PLAN_COLORS[t.plan])}>{t.plan}</span>
                      <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5", STATUS_COLORS[t.status])}>{t.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-slate-400">Owner:</span>
                    <span className="text-white">{t.owner}</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400">Storage Used</span>
                      <span className="text-xs text-slate-300 font-mono">{t.storageUsed} GB / {t.storageTotal} GB</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-700">
                      <div className={cn("h-full rounded-full transition-all", storageColor(t.storageUsed, t.storageTotal))} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-xs text-slate-300 font-mono">{t.users}</span>
                      <span className="text-[10px] text-slate-500">users</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Grid3X3 className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-xs text-slate-300 font-mono">{t.modules}</span>
                      <span className="text-[10px] text-slate-500">modules</span>
                    </div>
                    <div className="ml-auto text-[10px] text-slate-500">Last active: {t.lastActive}</div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-700/50">
                    <Button variant="outline" size="sm" className="text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 h-7 px-2.5">View Details</Button>
                    <Button variant="outline" size="sm" className="text-xs border-slate-600 text-slate-300 hover:bg-slate-800 h-7 px-2.5">Manage</Button>
                    {t.status === "Active" && (
                      <Button variant="outline" size="sm" className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 px-2.5 ml-auto" onClick={() => setSuspendTarget(t)}>Suspend</Button>
                    )}
                    {t.status === "Suspended" && (
                      <Button variant="outline" size="sm" className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-7 px-2.5 ml-auto" onClick={() => setReactivateTarget(t)}>Reactivate</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Provision Drawer */}
      <Sheet open={provisionOpen} onOpenChange={setProvisionOpen}>
        <SheetContent className="w-[480px] bg-[#0D1B2A] border-l border-slate-700 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-cyan-400" />Provision New Customer
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Company Details</h3>
              <div className="space-y-2.5">
                <div><label className="text-xs text-slate-400 mb-1 block">Company Name *</label><Input className="bg-slate-800 border-slate-600 text-white" placeholder="e.g. Acme India Pvt Ltd"  onKeyDown={onEnterNext} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs text-slate-400 mb-1 block">GSTIN *</label><Input className="bg-slate-800 border-slate-600 text-white font-mono" placeholder="27AABCA1234F1Z5" maxLength={15}  onKeyDown={onEnterNext} /></div>
                  <div><label className="text-xs text-slate-400 mb-1 block">PAN</label><Input className="bg-slate-800 border-slate-600 text-white font-mono" placeholder="AABCA1234F" maxLength={10}  onKeyDown={onEnterNext} /></div>
                </div>
                <div><label className="text-xs text-slate-400 mb-1 block">Registered Address</label><Input className="bg-slate-800 border-slate-600 text-white" placeholder="Address line"  onKeyDown={onEnterNext} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-xs text-slate-400 mb-1 block">City</label><Input className="bg-slate-800 border-slate-600 text-white" placeholder="Mumbai"  onKeyDown={onEnterNext} /></div>
                  <div><label className="text-xs text-slate-400 mb-1 block">State</label>
                    <Select><SelectTrigger className="bg-slate-800 border-slate-600 text-white text-xs"><SelectValue placeholder="State" /></SelectTrigger>
                      <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-xs text-slate-400 mb-1 block">PIN Code</label><Input className="bg-slate-800 border-slate-600 text-white font-mono" placeholder="400001" maxLength={6}  onKeyDown={onEnterNext} /></div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Select Plan</h3>
              <div className="grid grid-cols-3 gap-2">
                {PLANS.map(p => (
                  <button key={p.name} className={cn("rounded-xl border p-3 text-left transition-all", selectedPlan === p.name ? "border-cyan-500 bg-cyan-500/10" : "border-slate-600 bg-slate-800 hover:border-slate-500")} onClick={() => setSelectedPlan(p.name)}>
                    <p className="text-xs font-bold text-white">{p.name}</p>
                    <p className="text-lg font-bold text-cyan-400 font-mono mt-1">{p.price}<span className="text-[10px] text-slate-400 font-normal">/mo</span></p>
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[10px] text-slate-400">{p.storage}</p>
                      <p className="text-[10px] text-slate-400">{p.users}</p>
                      <p className="text-[10px] text-slate-400">{p.modules}</p>
                      {p.extras && <p className="text-[10px] text-cyan-400">{p.extras}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Admin User</h3>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-slate-400 mb-1 block">First Name *</label><Input className="bg-slate-800 border-slate-600 text-white" placeholder="First name"  onKeyDown={onEnterNext} /></div>
                <div><label className="text-xs text-slate-400 mb-1 block">Last Name *</label><Input className="bg-slate-800 border-slate-600 text-white" placeholder="Last name"  onKeyDown={onEnterNext} /></div>
              </div>
              <div><label className="text-xs text-slate-400 mb-1 block">Email *</label><Input className="bg-slate-800 border-slate-600 text-white" placeholder="admin@company.in" type="email"  onKeyDown={onEnterNext} /></div>
              <div><label className="text-xs text-slate-400 mb-1 block">Mobile *</label>
                <div className="flex gap-2">
                  <span className="flex items-center px-3 bg-slate-800 border border-slate-600 rounded-md text-xs text-slate-400">+91</span>
                  <Input className="bg-slate-800 border-slate-600 text-white font-mono" placeholder="9876543210" maxLength={10}  onKeyDown={onEnterNext} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Settings</h3>
              <div><label className="text-xs text-slate-400 mb-1 block">Subdomain</label>
                <div className="flex items-center">
                  <Input className="bg-slate-800 border-slate-600 text-white rounded-r-none" placeholder="acme-india"  onKeyDown={onEnterNext} />
                  <span className="flex items-center px-3 h-10 bg-slate-700 border border-l-0 border-slate-600 rounded-r-md text-xs text-slate-400 whitespace-nowrap">.4dsmartops.in</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div><p className="text-sm text-white">Trial Period</p><p className="text-[10px] text-slate-400">14-day free trial before billing starts</p></div>
                <Switch checked={trialEnabled} onCheckedChange={setTrialEnabled} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div><p className="text-sm text-white">Send Welcome Email</p><p className="text-[10px] text-slate-400">Credentials and onboarding link to admin</p></div>
                <Switch checked={welcomeEmail} onCheckedChange={setWelcomeEmail} />
              </div>
            </div>

            <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleProvision}>Provision Customer</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Suspend Dialog */}
      <Dialog open={!!suspendTarget} onOpenChange={(o) => !o && setSuspendTarget(null)}>
        <DialogContent className="bg-[#0D1B2A] border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />Suspend Customer: {suspendTarget?.name}?
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-2">This will immediately log out all users of this customer and prevent access. Data is preserved.</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <label className="text-xs text-slate-400 mb-1.5 block">Reason</label>
            <Select value={suspendReason} onValueChange={setSuspendReason}>
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>{["Billing overdue", "Policy violation", "Owner request", "Investigation", "Other"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setSuspendTarget(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSuspend}>Suspend Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={!!reactivateTarget} onOpenChange={(o) => !o && setReactivateTarget(null)}>
        <DialogContent className="bg-[#0D1B2A] border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Reactivate Customer: {reactivateTarget?.name}?</DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-2">This will restore full access for all users of this customer immediately.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" className="border-slate-600 text-slate-300" onClick={() => setReactivateTarget(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleReactivate}>Reactivate Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TowerLayout>
  );
}