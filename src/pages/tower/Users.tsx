import { useState } from "react";
import { toast } from "sonner";
import {
  Users as UsersIcon, UserCheck, UserPlus, UserX, Search,
  ShieldCheck, ShieldOff, Eye, Edit, CheckCircle,
  Ban, SearchX, Loader2,
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
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { onEnterNext } from '@/lib/keyboard';

/* ── Types ─────────────────────────────────────── */

type UserRole = "super_admin" | "tenant_admin" | "manager" | "operator" | "viewer";
type UserStatus = "active" | "inactive" | "invited" | "suspended";

interface PlatformUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  status: UserStatus;
  tenant: string;
  tenantId: string;
  lastLogin: string;
  createdAt: string;
  mfaEnabled: boolean;
  loginCount: number;
}

/* ── Mock Data ─────────────────────────────────── */

const USERS: PlatformUser[] = [
  { id: "USR-001", name: "Arjun Mehta", email: "arjun.mehta@reliancedigital.in", mobile: "9821234567", role: "tenant_admin", status: "active", tenant: "Reliance Digital Solutions", tenantId: "TNT-001", lastLogin: "2 min ago", createdAt: "12 Jan 2024", mfaEnabled: true, loginCount: 284 },
  { id: "USR-002", name: "Priya Sharma", email: "priya.sharma@reliancedigital.in", mobile: "9811234568", role: "manager", status: "active", tenant: "Reliance Digital Solutions", tenantId: "TNT-001", lastLogin: "1 hr ago", createdAt: "15 Jan 2024", mfaEnabled: true, loginCount: 196 },
  { id: "USR-003", name: "Vikram Nair", email: "vikram.nair@tatamotors.com", mobile: "9876543210", role: "tenant_admin", status: "active", tenant: "Tata Motors Finance", tenantId: "TNT-002", lastLogin: "30 min ago", createdAt: "28 Feb 2024", mfaEnabled: true, loginCount: 142 },
  { id: "USR-004", name: "Sneha Kulkarni", email: "sneha.k@tatamotors.com", mobile: "9765432109", role: "operator", status: "active", tenant: "Tata Motors Finance", tenantId: "TNT-002", lastLogin: "3 hr ago", createdAt: "01 Mar 2024", mfaEnabled: false, loginCount: 88 },
  { id: "USR-005", name: "Rajesh Iyer", email: "r.iyer@infosysbpm.com", mobile: "9654321098", role: "tenant_admin", status: "active", tenant: "Infosys BPM Limited", tenantId: "TNT-003", lastLogin: "45 min ago", createdAt: "05 Mar 2024", mfaEnabled: true, loginCount: 211 },
  { id: "USR-006", name: "Anita Desai", email: "anita.desai@infosysbpm.com", mobile: "9543210987", role: "manager", status: "active", tenant: "Infosys BPM Limited", tenantId: "TNT-003", lastLogin: "2 hr ago", createdAt: "08 Mar 2024", mfaEnabled: false, loginCount: 134 },
  { id: "USR-007", name: "Suresh Pillai", email: "suresh.p@wipro.com", mobile: "9432109876", role: "tenant_admin", status: "active", tenant: "Wipro Enterprises", tenantId: "TNT-004", lastLogin: "1 hr ago", createdAt: "14 Mar 2024", mfaEnabled: true, loginCount: 167 },
  { id: "USR-008", name: "Deepa Menon", email: "deepa.menon@wipro.com", mobile: "9321098765", role: "viewer", status: "invited", tenant: "Wipro Enterprises", tenantId: "TNT-004", lastLogin: "Never", createdAt: "20 Jun 2024", mfaEnabled: false, loginCount: 0 },
  { id: "USR-009", name: "Kiran Patil", email: "kiran.patil@mahindra.com", mobile: "9210987654", role: "tenant_admin", status: "active", tenant: "Mahindra Logistics", tenantId: "TNT-005", lastLogin: "Yesterday", createdAt: "22 Apr 2024", mfaEnabled: true, loginCount: 98 },
  { id: "USR-010", name: "Meera Joshi", email: "meera.joshi@bajajfinserv.com", mobile: "9109876543", role: "tenant_admin", status: "active", tenant: "Bajaj Finserv", tenantId: "TNT-006", lastLogin: "2 days ago", createdAt: "01 Jun 2024", mfaEnabled: false, loginCount: 12 },
  { id: "USR-011", name: "Arun Kumar", email: "arun.kumar@hcl.com", mobile: "9098765432", role: "tenant_admin", status: "active", tenant: "HCL Technologies", tenantId: "TNT-007", lastLogin: "Today", createdAt: "10 Jun 2024", mfaEnabled: false, loginCount: 8 },
  { id: "USR-012", name: "Pooja Reddy", email: "pooja.reddy@havells.com", mobile: "8987654321", role: "manager", status: "active", tenant: "Havells India", tenantId: "TNT-011", lastLogin: "20 min ago", createdAt: "02 Feb 2024", mfaEnabled: true, loginCount: 156 },
  { id: "USR-013", name: "Sanjay Gupta", email: "sanjay.g@muthoot.com", mobile: "8876543210", role: "operator", status: "suspended", tenant: "Muthoot Finance", tenantId: "TNT-012", lastLogin: "15 days ago", createdAt: "28 Apr 2024", mfaEnabled: false, loginCount: 34 },
  { id: "USR-014", name: "Kavita Singh", email: "kavita.singh@lnt.com", mobile: "8765432109", role: "operator", status: "active", tenant: "Larsen & Toubro Infotech", tenantId: "TNT-009", lastLogin: "4 hr ago", createdAt: "18 May 2024", mfaEnabled: false, loginCount: 67 },
  { id: "USR-015", name: "Rahul Verma", email: "rahul.verma@adani.com", mobile: "8654321098", role: "tenant_admin", status: "invited", tenant: "Adani Ports & SEZ", tenantId: "TNT-010", lastLogin: "Never", createdAt: "15 Jun 2024", mfaEnabled: false, loginCount: 0 },
];

/* ── Config ─────────────────────────────────────── */

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  super_admin:  { label: "Super Admin",  color: "bg-accent/10 text-accent border-accent/20" },
  tenant_admin: { label: "Tenant Admin", color: "bg-primary/10 text-primary border-primary/20" },
  manager:      { label: "Manager",      color: "bg-info/10 text-info border-info/20" },
  operator:     { label: "Operator",     color: "bg-secondary text-muted-foreground border-border" },
  viewer:       { label: "Viewer",       color: "bg-secondary text-muted-foreground border-border" },
};

const STATUS_CONFIG: Record<UserStatus, { label: string; color: string }> = {
  active:    { label: "Active",    color: "bg-success/10 text-success border-success/20" },
  inactive:  { label: "Inactive",  color: "bg-secondary text-muted-foreground border-border" },
  invited:   { label: "Invited",   color: "bg-warning/10 text-warning border-warning/20" },
  suspended: { label: "Suspended", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

/* ── Helpers ────────────────────────────────────── */

function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0][0].toUpperCase();
}

const uniqueTenants = Array.from(
  new Map(USERS.map((u) => [u.tenantId, u.tenant])).entries()
).map(([id, name]) => ({ id, name }));

/* ── Component ──────────────────────────────────── */

const Users = () => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");

  const [showInvite, setShowInvite] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", mobile: "", tenant: "", role: "" });

  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const filtered = USERS.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.tenant.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    const matchTenant = tenantFilter === "all" || u.tenantId === tenantFilter;
    return matchSearch && matchRole && matchStatus && matchTenant;
  });

  const activeCount = USERS.filter((u) => u.status === "active").length;
  const invitedCount = USERS.filter((u) => u.status === "invited").length;
  const suspendedCount = USERS.filter((u) => u.status === "suspended").length;

  const openDetail = (user: PlatformUser) => {
    setSelectedUser(user);
    setShowDetail(true);
  };

  const handleInvite = () => {
    if (!inviteForm.name || !inviteForm.email || !inviteForm.tenant || !inviteForm.role) {
      toast.error("Please fill all required fields");
      return;
    }
    if (inviteForm.mobile && !/^[6-9]\d{9}$/.test(inviteForm.mobile)) {
      toast.error("Invalid mobile number");
      return;
    }
    setInviteLoading(true);
    setTimeout(() => {
      setInviteLoading(false);
      toast.success(`Invitation sent to ${inviteForm.email}`);
      setShowInvite(false);
      setInviteForm({ name: "", email: "", mobile: "", tenant: "", role: "" });
    }, 1200);
  };

  /* ── Stat Card ────────────────────────────────── */

  const StatCard = ({ icon: Icon, label, value, color, sub }: {
    icon: React.ElementType; label: string; value: number; color: string; sub?: string;
  }) => (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </div>
      <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );

  return (
    <TowerLayout title="Users" subtitle="Manage all platform users across tenants">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={UsersIcon} label="Total Users" value={USERS.length} color="text-foreground" />
        <StatCard icon={UserCheck} label="Active" value={activeCount} color="text-success" />
        <StatCard icon={UserPlus} label="Invited" value={invitedCount} color="text-warning" sub="Awaiting first login" />
        <StatCard icon={UserX} label="Suspended" value={suspendedCount} color="text-destructive" />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "all")}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="operator">Operator</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as UserStatus | "all")}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tenants</SelectItem>
            {uniqueTenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          className="ml-auto"
          style={{ background: "var(--gradient-primary)" }}
          onClick={() => setShowInvite(true)}
        >
          <UserPlus className="h-4 w-4 mr-1" /> Invite User
        </Button>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-3">
        Showing {filtered.length} of {USERS.length} users
      </p>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>MFA</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Logins</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center">
                    <SearchX className="h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No users found</p>
                    <p className="text-xs text-muted-foreground/60">Try adjusting your search or filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => (
                <TableRow
                  key={u.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => openDetail(u)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                        {getInitials(u.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                        <p className="text-[10px] font-mono text-muted-foreground/60">{u.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground">{u.tenant}</p>
                    <p className="text-xs font-mono text-muted-foreground">{u.tenantId}</p>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs px-2 py-0.5 rounded-md border font-medium", ROLE_CONFIG[u.role].color)}>
                      {ROLE_CONFIG[u.role].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs px-2 py-1 rounded-lg border", STATUS_CONFIG[u.status].color)}>
                      {STATUS_CONFIG[u.status].label}
                    </span>
                  </TableCell>
                  <TableCell>
                    {u.mfaEnabled
                      ? <ShieldCheck className="h-4 w-4 text-success" />
                      : <ShieldOff className="h-4 w-4 text-muted-foreground/40" />}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-muted-foreground">{u.lastLogin}</span>
                  </TableCell>
                  <TableCell>
                    {u.loginCount === 0
                      ? <span className="text-sm font-mono text-muted-foreground">—</span>
                      : <span className="text-sm font-mono text-foreground">{u.loginCount}</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(u)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast("Edit user coming soon")}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {u.status === "suspended" ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast("Reactivate feature coming soon")}>
                          <CheckCircle className="h-4 w-4 text-success" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast("Suspend feature coming soon")}>
                          <Ban className="h-4 w-4 text-warning" />
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

      {/* Invite User Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>Send an invitation to join a tenant workspace</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name *</label>
              <Input
                placeholder="Full Name"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email Address *</label>
              <Input
                type="email"
                placeholder="user@company.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Mobile Number</label>
              <Input
                placeholder="9876543210"
                maxLength={10}
                value={inviteForm.mobile}
                onChange={(e) => setInviteForm({ ...inviteForm, mobile: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tenant *</label>
              <Select value={inviteForm.tenant} onValueChange={(v) => setInviteForm({ ...inviteForm, tenant: v })}>
                <SelectTrigger><SelectValue placeholder="Select Tenant" /></SelectTrigger>
                <SelectContent>
                  {uniqueTenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role *</label>
              <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                An invitation email will be sent with a temporary login link
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviteLoading}>
              {inviteLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Detail Sheet */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent className="w-[480px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            {selectedUser && (
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <SheetTitle className="text-lg">{selectedUser.name}</SheetTitle>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs px-2 py-0.5 rounded-md border font-medium", ROLE_CONFIG[selectedUser.role].color)}>
                    {ROLE_CONFIG[selectedUser.role].label}
                  </span>
                  <span className={cn("text-xs px-2 py-1 rounded-lg border", STATUS_CONFIG[selectedUser.status].color)}>
                    {STATUS_CONFIG[selectedUser.status].label}
                  </span>
                </div>
              </div>
            )}
          </SheetHeader>

          {selectedUser && (
            <div className="mt-6 space-y-6">
              {/* Account Stats */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Account Stats</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Login Count</p>
                    <p className="font-mono text-lg font-bold text-foreground">{selectedUser.loginCount}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Last Login</p>
                    <p className="font-mono text-sm font-medium text-foreground">{selectedUser.lastLogin}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Member Since</p>
                    <p className="text-sm font-medium text-foreground">{selectedUser.createdAt}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">MFA Status</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {selectedUser.mfaEnabled
                        ? <ShieldCheck className="h-4 w-4 text-success" />
                        : <ShieldOff className="h-4 w-4 text-muted-foreground/40" />}
                      <span className="text-sm font-medium text-foreground">
                        {selectedUser.mfaEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Profile Details</h4>
                <div className="space-y-2.5">
                  {[
                    { label: "User ID", value: <span className="font-mono text-xs">{selectedUser.id}</span> },
                    { label: "Mobile", value: <span className="font-mono">{selectedUser.mobile}</span> },
                    {
                      label: "Tenant",
                      value: (
                        <div>
                          <span className="text-sm">{selectedUser.tenant}</span>
                          <span className="block font-mono text-xs text-muted-foreground">{selectedUser.tenantId}</span>
                        </div>
                      ),
                    },
                    { label: "Role", value: ROLE_CONFIG[selectedUser.role].label },
                    { label: "Created At", value: selectedUser.createdAt },
                  ].map((row) => (
                    <div key={row.label} className="flex items-start justify-between py-1.5 border-b border-border/50">
                      <span className="text-xs text-muted-foreground">{row.label}</span>
                      <span className="text-sm text-foreground text-right">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Security</h4>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    {selectedUser.mfaEnabled
                      ? <ShieldCheck className="h-5 w-5 text-success" />
                      : <ShieldOff className="h-5 w-5 text-muted-foreground/40" />}
                    <span className="text-sm text-foreground">
                      {selectedUser.mfaEnabled ? "MFA Enabled" : "MFA Disabled"}
                    </span>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-md",
                    selectedUser.mfaEnabled
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  )}>
                    {selectedUser.mfaEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Actions</h4>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" onClick={() => toast("Password reset email sent")}>
                    Reset Password
                  </Button>
                  <Button variant="outline" className="w-full justify-start" onClick={() => toast("User sessions terminated")}>
                    Force Logout
                  </Button>
                  {selectedUser.status === "suspended" ? (
                    <Button className="w-full justify-start bg-success hover:bg-success/90 text-success-foreground" onClick={() => toast("Reactivate feature coming soon")}>
                      Reactivate User
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full justify-start bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20" onClick={() => toast("Suspend feature coming soon")}>
                      Suspend User
                    </Button>
                  )}
                  <Button variant="outline" className="w-full justify-start" onClick={() => toast("Opening audit trail...")}>
                    View Audit Trail
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </TowerLayout>
  );
};

export default Users;
