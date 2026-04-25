import { useState, useCallback } from "react";
import { onEnterNext } from "@/lib/keyboard";
import { BarChart3, Shield, Monitor, Lock, Key, Globe, MonitorCheck, ShieldCheck, ShieldAlert, Building, UserCog, TreePine, Users, Activity, Mail, Link2, Eye, Zap, FileDown, MessageSquare, ChevronDown, ChevronRight, Search, Plus, Check, Download, Upload, RefreshCw, Settings, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, Fingerprint, Clock, Database, Server, HardDrive, Gauge, Wifi, AlertCircle, Building2, LayoutGrid, Terminal, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────
type ConsoleTab =
  | "org-analytics" | "dashboard" | "monitoring"
  | "security" | "password-policy" | "geo-fencing" | "ip-whitelist"
  | "app-passwords" | "device-signin" | "mfa" | "mfa-recovery" | "trusted-browsers"
  | "entities" | "roles" | "hierarchy" | "identity-access"
  | "compliance" | "audit" | "email-digest" | "integrations"
  | "impersonation" | "workflows" | "portal-branding"
  | "export" | "preview" | "message-templates";

interface TabConfig { id: ConsoleTab; label: string; icon: React.ElementType; section: string; }

// ── TAB CONFIG ────────────────────────────────────────────────
const TAB_CONFIG: TabConfig[] = [
  { id: "org-analytics",    label: "Org Analytics",       icon: BarChart3,     section: "Security Monitoring" },
  { id: "dashboard",        label: "Security Dashboard",  icon: Shield,        section: "Security Monitoring" },
  { id: "monitoring",       label: "System Health",       icon: Monitor,       section: "Security Monitoring" },
  { id: "security",         label: "Security Templates",  icon: Lock,          section: "Security Policies" },
  { id: "password-policy",  label: "Password Policy",     icon: Key,           section: "Security Policies" },
  { id: "geo-fencing",      label: "Geo-Fencing",         icon: Globe,         section: "Security Policies" },
  { id: "ip-whitelist",     label: "IP Whitelist",        icon: Globe,         section: "Security Policies" },
  { id: "app-passwords",    label: "App Passwords",       icon: Key,           section: "Security Policies" },
  { id: "device-signin",    label: "Device Sign-In",      icon: MonitorCheck,  section: "Security Policies" },
  { id: "mfa",              label: "MFA",                 icon: ShieldCheck,   section: "Security Policies" },
  { id: "mfa-recovery",     label: "MFA Recovery",        icon: ShieldAlert,   section: "Security Policies" },
  { id: "trusted-browsers", label: "Trusted Browsers",    icon: Monitor,       section: "Security Policies" },
  { id: "entities",         label: "Entity Security",     icon: Building,      section: "Entity Management" },
  { id: "roles",            label: "Role Management",     icon: UserCog,       section: "Entity Management" },
  { id: "hierarchy",        label: "Admin Hierarchy",     icon: TreePine,      section: "Entity Management" },
  { id: "identity-access",  label: "Identity & Access",   icon: Users,         section: "Entity Management" },
  { id: "compliance",       label: "Compliance",          icon: ShieldCheck,   section: "Compliance & Audit" },
  { id: "audit",            label: "Audit Log",           icon: Activity,      section: "Compliance & Audit" },
  { id: "email-digest",     label: "Email Digest",        icon: Mail,          section: "Compliance & Audit" },
  { id: "integrations",     label: "Integrations",        icon: Link2,         section: "Compliance & Audit" },
  { id: "impersonation",    label: "Impersonation",       icon: Eye,           section: "Operations" },
  { id: "workflows",        label: "Workflows",           icon: Zap,           section: "Operations" },
  { id: "portal-branding",  label: "Portal Branding",     icon: Monitor,       section: "Operations" },
  { id: "export",           label: "Export / Import",     icon: FileDown,      section: "Data & Sharing" },
  { id: "preview",          label: "Shared Preview",      icon: Link2,         section: "Data & Sharing" },
  { id: "message-templates",label: "Message Templates",   icon: MessageSquare, section: "Data & Sharing" },
];

const SECTIONS = [...new Set(TAB_CONFIG.map(t => t.section))];

// ── Mock Data ─────────────────────────────────────────────────
const ACTIVITY_DATA = [
  { day: "Mon", logins: 42, actions: 186 },
  { day: "Tue", logins: 58, actions: 234 },
  { day: "Wed", logins: 51, actions: 198 },
  { day: "Thu", logins: 63, actions: 271 },
  { day: "Fri", logins: 55, actions: 243 },
  { day: "Sat", logins: 22, actions: 89 },
  { day: "Sun", logins: 18, actions: 64 },
];

const LOGIN_TREND = [
  { day: "Mon", successful: 342, failed: 18, blocked: 7 },
  { day: "Tue", successful: 398, failed: 22, blocked: 4 },
  { day: "Wed", successful: 315, failed: 15, blocked: 9 },
  { day: "Thu", successful: 421, failed: 31, blocked: 12 },
  { day: "Fri", successful: 389, failed: 19, blocked: 6 },
  { day: "Sat", successful: 187, failed: 8, blocked: 2 },
  { day: "Sun", successful: 143, failed: 5, blocked: 1 },
];

const DEVICE_DATA = [
  { name: "Desktop", value: 58, color: "hsl(185 80% 50%)" },
  { name: "Mobile",  value: 28, color: "hsl(142 70% 45%)" },
  { name: "Tablet",  value: 10, color: "hsl(38 92% 50%)" },
  { name: "Unknown", value: 4,  color: "hsl(215 20% 65%)" },
];

const RADAR_DATA = [
  { metric: "Authentication",  score: 92 },
  { metric: "Access Control",  score: 85 },
  { metric: "Device Security", score: 78 },
  { metric: "Geo Compliance",  score: 90 },
  { metric: "Session Security",score: 88 },
  { metric: "IP Reputation",   score: 82 },
];

const API_VOLUME = [
  { day: "Mon", calls: 12400 }, { day: "Tue", calls: 14800 },
  { day: "Wed", calls: 11200 }, { day: "Thu", calls: 16300 },
  { day: "Fri", calls: 15100 }, { day: "Sat", calls: 7800 },
  { day: "Sun", calls: 5400 },
];

const ERROR_RATE = [
  { day: "Mon", rate: 0.8 }, { day: "Tue", rate: 1.2 },
  { day: "Wed", rate: 0.6 }, { day: "Thu", rate: 1.8 },
  { day: "Fri", rate: 0.9 }, { day: "Sat", rate: 0.4 },
  { day: "Sun", rate: 0.3 },
];

const COMPLIANCE_DATA = [
  { name: "Compliant", value: 75, color: "hsl(142 76% 36%)" },
  { name: "Pending",   value: 12, color: "hsl(48 96% 53%)" },
  { name: "Violated",  value: 13, color: "hsl(0 84% 60%)" },
];

const COMPLIANCE_POLICIES = [
  { name: "Password Complexity", status: "enforced" as const, lastCheck: "2h ago",  description: "Min 12 chars, upper, number, special" },
  { name: "MFA Enforcement",     status: "enforced" as const, lastCheck: "2h ago",  description: "All admin users must use MFA" },
  { name: "Session Timeout",     status: "enforced" as const, lastCheck: "6h ago",  description: "Auto-logout after 60 minutes idle" },
  { name: "IP Restrictions",     status: "pending"  as const, lastCheck: "1d ago",  description: "Restrict to office IP ranges" },
  { name: "Data Retention",      status: "violated" as const, lastCheck: "3d ago",  description: "Logs must be retained 90 days" },
  { name: "Audit Logging",       status: "enforced" as const, lastCheck: "1h ago",  description: "All actions logged with user context" },
];

const MOCK_USERS = [
  { name: "Rajesh Kumar",  email: "rajesh@company.in",  role: "Admin",   status: "Active",    lastLogin: "Today 09:14 IST" },
  { name: "Priya Sharma",  email: "priya@company.in",   role: "Manager", status: "Active",    lastLogin: "Today 08:52 IST" },
  { name: "Ankit Verma",   email: "ankit@company.in",   role: "User",    status: "Active",    lastLogin: "Yesterday 17:30 IST" },
  { name: "Sunita Patel",  email: "sunita@company.in",  role: "Manager", status: "Active",    lastLogin: "Today 10:05 IST" },
  { name: "Vikram Singh",  email: "vikram@company.in",  role: "User",    status: "Suspended", lastLogin: "3 days ago" },
  { name: "Meena Iyer",    email: "meena@company.in",   role: "Admin",   status: "Active",    lastLogin: "Today 07:48 IST" },
  { name: "Arjun Mehta",   email: "arjun@company.in",   role: "Viewer",  status: "Active",    lastLogin: "Yesterday 14:20 IST" },
  { name: "Kavita Nair",   email: "kavita@company.in",  role: "User",    status: "Active",    lastLogin: "Today 11:33 IST" },
  { name: "Deepak Joshi",  email: "deepak@company.in",  role: "Manager", status: "Active",    lastLogin: "Yesterday 09:15 IST" },
  { name: "Lakshmi Rao",   email: "lakshmi@company.in", role: "User",    status: "Active",    lastLogin: "Today 08:00 IST" },
];

const AUDIT_ENTRIES = [
  { action: "User login successful",        user: "rajesh@company.in",  time: "09:14:23", type: "success" as const, source: "User" },
  { action: "Role assigned: Manager",       user: "admin@company.in",   time: "09:10:15", type: "info"    as const, source: "Admin" },
  { action: "Failed login attempt",         user: "unknown",            time: "09:08:44", type: "warning" as const, source: "System" },
  { action: "Data export: Audit logs",      user: "meena@company.in",   time: "09:05:31", type: "info"    as const, source: "User" },
  { action: "Security policy updated",      user: "admin@company.in",   time: "08:58:12", type: "info"    as const, source: "Admin" },
  { action: "IP blocked: 192.168.1.45",     user: "System",             time: "08:55:07", type: "warning" as const, source: "System" },
  { action: "Module config changed",        user: "rajesh@company.in",  time: "08:50:33", type: "info"    as const, source: "User" },
  { action: "Bridge Agent connected",       user: "System",             time: "08:45:00", type: "success" as const, source: "System" },
  { action: "Backup completed",            user: "System",             time: "08:30:00", type: "success" as const, source: "System" },
  { action: "Password reset request",       user: "ankit@company.in",   time: "08:22:18", type: "info"    as const, source: "User" },
  { action: "New user invited",             user: "admin@company.in",   time: "08:15:44", type: "info"    as const, source: "Admin" },
  { action: "Session expired",             user: "vikram@company.in",  time: "08:10:02", type: "info"    as const, source: "System" },
  { action: "High-risk login flagged",      user: "unknown",            time: "07:58:31", type: "error"   as const, source: "System" },
  { action: "User suspended",              user: "admin@company.in",   time: "07:45:19", type: "warning" as const, source: "Admin" },
  { action: "API rate limit hit",           user: "api-service",        time: "07:30:05", type: "warning" as const, source: "API" },
  { action: "Database health check passed", user: "System",             time: "07:00:00", type: "success" as const, source: "System" },
  { action: "MFA enabled for user",         user: "priya@company.in",   time: "06:55:41", type: "success" as const, source: "User" },
  { action: "Config export completed",      user: "admin@company.in",   time: "06:40:18", type: "info"    as const, source: "Admin" },
  { action: "Geo-fence violation detected", user: "unknown",            time: "06:22:09", type: "error"   as const, source: "System" },
  { action: "Platform startup complete",    user: "System",             time: "06:00:00", type: "success" as const, source: "System" },
];

const PERMISSIONS = [
  { permission: "View Dashboard",   superAdmin: true,  admin: true,  manager: true,  user: true,  viewer: true },
  { permission: "Export Data",      superAdmin: true,  admin: true,  manager: true,  user: false, viewer: false },
  { permission: "Manage Users",     superAdmin: true,  admin: true,  manager: false, user: false, viewer: false },
  { permission: "Assign Roles",     superAdmin: true,  admin: true,  manager: false, user: false, viewer: false },
  { permission: "View Policies",    superAdmin: true,  admin: true,  manager: true,  user: false, viewer: false },
  { permission: "Edit Settings",    superAdmin: true,  admin: true,  manager: true,  user: false, viewer: false },
  { permission: "System Console",   superAdmin: true,  admin: true,  manager: false, user: false, viewer: false },
  { permission: "Run Audit",        superAdmin: true,  admin: true,  manager: true,  user: false, viewer: false },
  { permission: "Impersonate User", superAdmin: true,  admin: false, manager: false, user: false, viewer: false },
  { permission: "Manage Modules",   superAdmin: true,  admin: true,  manager: false, user: false, viewer: false },
];

const MESSAGE_TEMPLATES = [
  { name: "Password Expiry Warning", channel: "Email",    status: "active", lastEdited: "10 Feb 2026", version: "v3.2" },
  { name: "MFA Enrollment Invite",   channel: "Email",    status: "active", lastEdited: "8 Feb 2026",  version: "v2.1" },
  { name: "Login Alert",             channel: "SMS",      status: "active", lastEdited: "5 Feb 2026",  version: "v1.4" },
  { name: "Account Locked",          channel: "WhatsApp", status: "draft",  lastEdited: "3 Feb 2026",  version: "v1.0" },
  { name: "Welcome Onboarding",      channel: "Push",     status: "active", lastEdited: "28 Jan 2026", version: "v2.0" },
  { name: "Security Alert",          channel: "Email",    status: "active", lastEdited: "25 Jan 2026", version: "v1.8" },
];

const SERVICES = [
  { name: "Database",       icon: Database, status: "healthy" as const },
  { name: "Authentication", icon: Key,      status: "healthy" as const },
  { name: "Storage",        icon: HardDrive,status: "healthy" as const },
  { name: "Notifications",  icon: Mail,     status: "healthy" as const },
  { name: "Bridge Agent",   icon: Wifi,     status: "healthy" as const },
  { name: "Email Service",  icon: Mail,     status: "healthy" as const },
];

const INTEGRATIONS_DATA = [
  { name: "Tally ERP",          status: "connected",    category: "Accounting",   icon: Database },
  { name: "GST Portal",         status: "connected",    category: "Compliance",   icon: Shield },
  { name: "SMTP Email",         status: "connected",    category: "Communication",icon: Mail },
  { name: "WhatsApp Business",  status: "disconnected", category: "Communication",icon: MessageSquare },
  { name: "SMS Gateway",        status: "disconnected", category: "Communication",icon: Smartphone },
];

// ── Scope Architecture ────────────────────────────────────────
type ScopeLevel = 'global' | 'company' | 'user';

interface ScopeContext {
  level: ScopeLevel;
  entityName: string;
}

const PANEL_SCOPE: Record<ConsoleTab, ScopeLevel> = {
  'org-analytics': 'global',
  'dashboard': 'global',
  'monitoring': 'global',
  'security': 'global',
  'password-policy': 'global',
  'geo-fencing': 'company',
  'ip-whitelist': 'company',
  'app-passwords': 'user',
  'device-signin': 'global',
  'mfa': 'global',
  'mfa-recovery': 'global',
  'trusted-browsers': 'user',
  'entities': 'company',
  'roles': 'global',
  'hierarchy': 'global',
  'identity-access': 'global',
  'compliance': 'global',
  'audit': 'global',
  'email-digest': 'global',
  'integrations': 'global',
  'impersonation': 'user',
  'workflows': 'global',
  'portal-branding': 'company',
  'export': 'global',
  'preview': 'global',
  'message-templates': 'global',
};

function ScopeBar({ scope, onScopeChange }: {
  scope: ScopeContext;
  onScopeChange: (s: ScopeContext) => void;
}) {
  const scopeColors: Record<ScopeLevel, string> = {
    global: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    company: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    user: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  const scopeIcons: Record<ScopeLevel, string> = {
    global: '🌐', company: '🏢', user: '👤',
  };
  const scopeLabels: Record<ScopeLevel, string> = {
    global: 'Global', company: 'Company', user: 'User',
  };
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/10">
      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mr-1">Scope:</span>
      {(['global', 'company', 'user'] as ScopeLevel[]).map(level => (
        <button
          key={level}
          onClick={() => onScopeChange({
            level,
            entityName: level === 'global' ? 'All Companies' :
              level === 'company' ? 'Sharma Traders Pvt Ltd' :
              'Rajesh Kumar',
          })}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors',
            scope.level === level
              ? scopeColors[level]
              : 'text-muted-foreground bg-transparent border-transparent hover:bg-muted/40'
          )}
        >
          {scopeIcons[level]}
          {scopeLabels[level]}
        </button>
      ))}
      <span className="text-[10px] text-muted-foreground ml-auto">
        Applies to: <span className="font-medium text-foreground">{scope.entityName}</span>
      </span>
    </div>
  );
}

function ScopeBadge({ tab }: { tab: ConsoleTab }) {
  const scope = PANEL_SCOPE[tab];
  const config = {
    global: { label: '🌐 Global', cls: 'text-teal-400 bg-teal-500/10 border-teal-500/20' },
    company: { label: '🏢 Company', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    user: { label: '👤 User', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  };
  const { label, cls } = config[scope];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ml-2', cls)}>
      {label}
    </span>
  );
}

// ── Shared helper components ──────────────────────────────────
function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {children && <p className="text-sm text-muted-foreground">{children}</p>}
    </div>
  );
}

function SaveButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button size="sm" className="gap-1.5 mt-4" onClick={onClick ?? (() => toast.success("Settings saved — backend will enforce on next login"))}>
      <Check className="w-3.5 h-3.5" /> Save Changes
    </Button>
  );
}

function PolicyToggleRow({ label, description, defaultChecked = false }: { label: string; description?: string; defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}

function AffectedBadge() {
  return <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Users className="w-3 h-3" /> Affected Users: 54,960</p>;
}

// ── Panel 1: Org Analytics ────────────────────────────────────
function OrgAnalyticsPanel() {
  const ORG_ENTITIES = [
    { type: "Companies",   icon: Building2,  count: 4,  active: 4,  color: "text-primary" },
    { type: "Divisions",   icon: LayoutGrid, count: 8,  active: 7,  color: "text-cyan-400" },
    { type: "Departments", icon: Building,   count: 14, active: 12, color: "text-primary" },
    { type: "Teams",       icon: Users,      count: 32, active: 28, color: "text-emerald-400" },
  ];
  const ROLE_DIST = [
    { role: "Admin",   count: 3,  color: "bg-violet-500" },
    { role: "Manager", count: 12, color: "bg-amber-500" },
    { role: "User",    count: 48, color: "bg-primary" },
    { role: "Viewer",  count: 15, color: "bg-muted-foreground" },
  ];
  const total = ROLE_DIST.reduce((a, b) => a + b.count, 0);
  return (
    <div className="space-y-5">
      <SectionHeader title="Org Analytics">Organisation structure, user distribution and activity overview.</SectionHeader>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ORG_ENTITIES.map(e => {
          const Icon = e.icon;
          return (
            <Card key={e.type} className="bg-card/60 border-border">
              <CardContent className="pt-4 text-center">
                <Icon className={cn("w-5 h-5 mx-auto mb-1", e.color)} />
                <div className="text-2xl font-bold text-foreground font-mono">{e.count}</div>
                <div className="text-xs text-muted-foreground">{e.type}</div>
                <div className="text-[10px] text-muted-foreground/60">{e.active} active</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card/60 border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">User Activity (7 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={ACTIVITY_DATA}>
                <defs>
                  <linearGradient id="loginGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(185 80% 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(185 80% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="logins" stroke="hsl(185 80% 50%)" fill="url(#loginGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="actions" stroke="hsl(var(--primary))" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">User Distribution by Role</CardTitle></CardHeader>
          <CardContent>
            {ROLE_DIST.map(r => (
              <div key={r.role} className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{r.role}</span>
                  <span>{r.count} users ({Math.round((r.count / total) * 100)}%)</span>
                </div>
                <Progress value={(r.count / total) * 100} className="h-1.5" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-2">Total: {total} users</p>
          </CardContent>
        </Card>
      </div>
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Recent Sign-Ins</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_USERS.slice(0, 6).map((u, i) => {
                const initials = u.name.split(" ").map(n => n[0]).join("").slice(0, 2);
                return (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{initials}</div>
                        <div>
                          <p className="text-xs font-medium text-foreground">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{u.role}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full", u.status === "Active" ? "bg-emerald-500" : "bg-red-500")} />
                        <span className="text-xs">{u.status}</span>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-xs text-muted-foreground">{u.lastLogin}</span></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 2: Security Dashboard ───────────────────────────────
function SecurityDashboardPanel() {
  return (
    <div className="space-y-5">
      <SectionHeader title="Security Dashboard">Live security posture and threat overview.</SectionHeader>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-card/60 border-border lg:col-span-1">
          <CardContent className="pt-6 flex flex-col items-center">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--primary))" strokeWidth="8" strokeDasharray={`${(87 / 100) * 251.2} 251.2`} strokeLinecap="round" />
              </svg>
              <div className="absolute text-center">
                <div className="text-3xl font-bold text-foreground">87</div>
                <div className="text-xs text-muted-foreground">/ 100</div>
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground mt-3">Security Score</p>
            <div className="w-full mt-4 space-y-2">
              {[
                { label: "Authentication", value: 92 },
                { label: "Access Control", value: 85 },
                { label: "Device Security", value: 78 },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>{m.label}</span><span>{m.value}%</span></div>
                  <Progress value={m.value} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {[
            { label: "Active MFA Users",  value: "1,247", icon: Fingerprint, color: "text-cyan-400",   trend: "up" },
            { label: "Blocked Sign-Ins",  value: "41",    icon: ShieldAlert, color: "text-red-400",    trend: "down", sub: "last 7 days" },
            { label: "Active Sessions",   value: "389",   icon: Activity,    color: "text-emerald-400", trend: "up",  sub: "last hour" },
            { label: "High Risk Alerts",  value: "3",     icon: AlertTriangle,color:"text-amber-400",  trend: "up",  sub: "flagged" },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.label} className="bg-card/60 border-border">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <Icon className={cn("w-4 h-4", kpi.color)} />
                    {kpi.trend === "up" ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  <div className="text-2xl font-bold text-foreground mt-2 font-mono">{kpi.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
                  {kpi.sub && <div className="text-[10px] text-muted-foreground/60">{kpi.sub}</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card/60 border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Login Trends (7 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={LOGIN_TREND}>
                <defs>
                  <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(185 80% 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(185 80% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="successful" stroke="hsl(185 80% 50%)" fill="url(#dashGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="failed" stroke="hsl(38 92% 50%)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                <Area type="monotone" dataKey="blocked" stroke="hsl(0 62% 40%)" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card/60 border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Device Types</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={DEVICE_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                    {DEVICE_DATA.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="bg-card/60 border-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Security Radar</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={170}>
                <RadarChart data={RADAR_DATA}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} />
                  <Radar name="Score" dataKey="score" stroke="hsl(185 80% 50%)" fill="hsl(185 80% 50%)" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Panel 3: System Health ────────────────────────────────────
function SystemHealthPanel() {
  return (
    <div className="space-y-5">
      <SectionHeader title="System Health">Infrastructure metrics and service status for this ERP deployment.</SectionHeader>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "CPU Usage",    value: 34, unit: "%",  icon: Server,    color: "text-cyan-400",   trend: "down" },
          { label: "Memory Usage", value: 61, unit: "%",  icon: Server,    color: "text-violet-400", trend: "up" },
          { label: "Storage Used", value: 45, unit: "%",  icon: HardDrive, color: "text-amber-400",  trend: "up" },
          { label: "API Latency",  value: 142, unit: "ms",icon: Gauge,     color: "text-emerald-400",trend: "down" },
        ].map(card => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="bg-card/60 border-border">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <Icon className={cn("w-4 h-4", card.color)} />
                  {card.trend === "down" ? <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingUp className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <div className="text-2xl font-bold text-foreground mt-2 font-mono">{card.value}{card.unit}</div>
                <Progress value={typeof card.value === "number" && card.unit === "%" ? card.value : 50} className="h-1 mt-2" />
                <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Service Status</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SERVICES.map(svc => {
              const Icon = svc.icon;
              return (
                <div key={svc.name} className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/40">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">{svc.name}</span>
                  <div className="flex items-center gap-1 ml-auto">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-emerald-400">Healthy</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card/60 border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">API Volume (7 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={API_VOLUME}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="calls" fill="hsl(185 80% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Error Rate % (7 days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={ERROR_RATE}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
                <Line type="monotone" dataKey="rate" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Panel 4: Security Templates ───────────────────────────────
function SecurityTemplatesPanel() {
  const [applied, setApplied] = useState(["Standard"]);
  const templates = [
    { name: "Basic",            description: "Minimal security for internal tools. Password + email verification.", level: "Low" },
    { name: "Standard",         description: "Recommended for most SMEs. MFA + password policy + session timeout.", level: "Medium" },
    { name: "High Security",    description: "For financial and sensitive data. Geo-fencing + IP whitelist + MFA.", level: "High" },
    { name: "Government Grade", description: "Maximum security. All policies enforced. VAPT ready.", level: "Critical" },
  ];
  const levelColor: Record<string, string> = { Low: "text-muted-foreground", Medium: "text-amber-400", High: "text-red-400", Critical: "text-violet-400" };
  return (
    <div className="space-y-5">
      <SectionHeader title="Security Templates">Pre-configured security profiles for quick deployment.</SectionHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map(t => (
          <Card key={t.name} className="bg-card/60 border-border">
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className={cn("text-[10px]", levelColor[t.level])}>Level: {t.level}</p>
                </div>
                {applied.includes(t.name) && <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[10px]">Applied</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{t.description}</p>
              <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => {
                setApplied([t.name]);
                toast.success(`${t.name} template applied — policies will take effect shortly`);
              }}>
                {applied.includes(t.name) ? "Re-Apply" : "Apply Template"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Panel 5: Password Policy ──────────────────────────────────
function PasswordPolicyPanel() {
  const [minLength, setMinLength] = useState([12]);
  const [expiryDays, setExpiryDays] = useState([90]);
  const [expiryEnabled, setExpiryEnabled] = useState(true);
  return (
    <div className="space-y-5">
      <SectionHeader title="Password Policy">Define password strength requirements and expiry rules. This is a Global policy — applies to all users and companies.</SectionHeader>
      <AffectedBadge />
      <Card className="bg-card/60 border-border">
        <CardContent className="pt-5 space-y-4">
          <div>
            <div className="flex justify-between text-sm"><span>Minimum Length</span><span className="font-mono text-xs">{minLength[0]} characters</span></div>
            <Slider value={minLength} onValueChange={setMinLength} min={8} max={32} step={1} className="mt-2" />
          </div>
          <Separator />
          <PolicyToggleRow label="Require Uppercase" description="At least one uppercase letter" defaultChecked />
          <PolicyToggleRow label="Require Numbers" description="At least one digit" defaultChecked />
          <PolicyToggleRow label="Require Special Characters" description="At least one symbol (!@#$%)" defaultChecked />
          <Separator />
          <PolicyToggleRow label="Password Expiry" description="Force users to change password periodically" defaultChecked />
          {expiryEnabled && (
            <div>
              <div className="flex justify-between text-sm"><span>Expiry Period</span><span className="font-mono text-xs">{expiryDays[0]} days</span></div>
              <Slider value={expiryDays} onValueChange={setExpiryDays} min={30} max={365} step={30} className="mt-2" />
            </div>
          )}
          <SaveButton />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 6: Geo-Fencing ──────────────────────────────────────
function GeoFencingPanel() {
  const [enabled, setEnabled] = useState(true);
  const countries = ["India", "United Arab Emirates", "Singapore", "United Kingdom", "United States", "Germany"];
  const [selected, setSelected] = useState(["India"]);
  function toggle(c: string) { setSelected(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]); }
  return (
    <div className="space-y-5">
      <SectionHeader title="Geo-Fencing">Restrict platform access based on user geography. This is a Company-level policy — set per entity. Select a company in the Scope bar above.</SectionHeader>
      <AffectedBadge />
      <Card className="bg-card/60 border-border">
        <CardContent className="pt-5 space-y-4">
          <PolicyToggleRow label="Enable Geo-Fencing" description="Block logins from unapproved regions" defaultChecked />
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Allowed Countries</p>
            <div className="flex flex-wrap gap-2">
              {countries.map(c => (
                <button key={c} onClick={() => toggle(c)}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors",
                    selected.includes(c) ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground border-border hover:border-primary/30"
                  )}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <SaveButton />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 7: IP Whitelist ─────────────────────────────────────
function IPWhitelistPanel() {
  const [ranges, setRanges] = useState<string[]>([]);
  const [input, setInput] = useState("");
  return (
    <div className="space-y-5">
      <SectionHeader title="IP Whitelist">Restrict platform access to specific IP addresses or CIDR ranges. This is a Company-level policy — set per entity. Select a company in the Scope bar above.</SectionHeader>
      <AffectedBadge />
      <Card className="bg-card/60 border-border">
        <CardContent className="pt-5 space-y-4">
          <PolicyToggleRow label="Enable IP Whitelist" description="Only allow sign-ins from listed IP ranges" defaultChecked={false} />
          <div className="flex gap-2">
            <Input placeholder="192.168.1.0/24" value={input} onChange={e => setInput(e.target.value)} onKeyDown={onEnterNext} className="text-xs h-8" />
            <Button size="sm" variant="outline" className="gap-1 h-8" onClick={() => { if (input.trim()) { setRanges(p => [...p, input.trim()]); setInput(""); } }}>
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
          {ranges.length > 0 ? (
            <div className="space-y-2">
              {ranges.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/40">
                  <span className="text-xs font-mono">{r}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setRanges(p => p.filter((_, j) => j !== i))}>
                    <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No IP ranges configured — all IPs are allowed.</p>
          )}
          <SaveButton />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 8: App Passwords ────────────────────────────────────
function AppPasswordsPanel() {
  const apps = [
    { name: "Tally Sync Agent",   created: "1 Jan 2026",  lastUsed: "Today",        status: "active" },
    { name: "Mobile App — iOS",   created: "15 Feb 2026", lastUsed: "Yesterday",    status: "active" },
    { name: "Reporting Service",  created: "20 Mar 2026", lastUsed: "3 days ago",   status: "active" },
    { name: "Old Integration",    created: "1 Oct 2025",  lastUsed: "60 days ago",  status: "inactive" },
  ];
  return (
    <div className="space-y-5">
      <SectionHeader title="App Passwords">Manage application-specific passwords for integrations and services. This is a User-level setting — specific to each individual user.</SectionHeader>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.info("Create App Password — backend pending")}><Plus className="w-3.5 h-3.5" /> Create App Password</Button>
      <Card className="bg-card/60 border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Application</TableHead><TableHead>Created</TableHead><TableHead>Last Used</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {apps.map((a, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{a.name}</TableCell>
                  <TableCell className="text-xs">{a.created}</TableCell>
                  <TableCell className="text-xs">{a.lastUsed}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{a.status}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => toast.info("Revoke — backend pending")}>Revoke</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 9: Device Sign-In ───────────────────────────────────
function DeviceSignInPanel() {
  const [maxDevices, setMaxDevices] = useState([3]);
  return (
    <div className="space-y-5">
      <SectionHeader title="Device Sign-In">Control trusted devices and new device sign-in behaviour.</SectionHeader>
      <AffectedBadge />
      <Card className="bg-card/60 border-border">
        <CardContent className="pt-5 space-y-4">
          <PolicyToggleRow label="Trusted Device Registration" description="Allow users to mark devices as trusted" defaultChecked />
          <PolicyToggleRow label="Require Approval for New Devices" description="Admin approves before new device can sign in" defaultChecked={false} />
          <div>
            <div className="flex justify-between text-sm"><span>Max Devices per User</span><span className="font-mono text-xs">{maxDevices[0]}</span></div>
            <Slider value={maxDevices} onValueChange={setMaxDevices} min={1} max={10} step={1} className="mt-2" />
          </div>
          <SaveButton />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 10: MFA ─────────────────────────────────────────────
function MFAPanel() {
  return (
    <div className="space-y-5">
      <SectionHeader title="MFA">Configure MFA requirements and allowed methods. This is a Global policy — applies to all users and companies.</SectionHeader>
      <AffectedBadge />
      <Card className="bg-card/60 border-border">
        <CardContent className="pt-5 space-y-4">
          <PolicyToggleRow label="Enforce MFA for all users" description="Users must complete MFA on every login" defaultChecked />
          <PolicyToggleRow label="Enforce MFA for Admins only" description="Only admin-role users are required to use MFA" defaultChecked={false} />
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Allowed Methods</p>
            <div className="space-y-2">
              {["Authenticator App", "SMS OTP", "Email OTP"].map(m => (
                <div key={m} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 border border-border/40">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs">{m}</span>
                </div>
              ))}
            </div>
          </div>
          <SaveButton />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 11: MFA Recovery ────────────────────────────────────
function MFARecoveryPanel() {
  return (
    <div className="space-y-5">
      <SectionHeader title="MFA Recovery">Configure recovery options for users who lose MFA access.</SectionHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-card/60 border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Recovery Codes</CardTitle><CardDescription className="text-xs">Backup codes for emergency MFA bypass</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-2xl font-bold text-foreground font-mono">10</div>
            <p className="text-xs text-muted-foreground">codes generated per user on MFA enrollment</p>
            <PolicyToggleRow label="Allow Recovery Code Usage" defaultChecked />
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => toast.info("Regenerate policy — backend pending")}><RefreshCw className="w-3 h-3" /> Force Regenerate All</Button>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Backup Email</CardTitle><CardDescription className="text-xs">Admin contact for MFA recovery requests</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="security@yourcompany.in" onKeyDown={onEnterNext} className="text-xs h-8" />
            <PolicyToggleRow label="Allow Email Recovery" description="Users can request OTP to backup email" defaultChecked />
            <SaveButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Panel 12: Trusted Browsers ────────────────────────────────
function TrustedBrowsersPanel() {
  const browsers = [
    { user: "Rajesh Kumar",  browser: "Chrome 122",  device: "MacBook Pro", added: "1 Mar 2026",  status: "active" },
    { user: "Priya Sharma",  browser: "Safari 17",   device: "iPhone 15",   added: "15 Feb 2026", status: "active" },
    { user: "Meena Iyer",    browser: "Edge 121",    device: "Dell Laptop", added: "10 Feb 2026", status: "active" },
    { user: "Ankit Verma",   browser: "Firefox 123", device: "Windows PC",  added: "5 Jan 2026",  status: "expired" },
  ];
  return (
    <div className="space-y-5">
      <SectionHeader title="Trusted Browsers">Manage browsers and devices that bypass MFA step-up. This is a User-level setting — specific to each individual user.</SectionHeader>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.info("Revoke all — backend pending")}><XCircle className="w-3.5 h-3.5" /> Revoke All</Button>
      <Card className="bg-card/60 border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Browser</TableHead><TableHead>Device</TableHead><TableHead>Added</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {browsers.map((b, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{b.user}</TableCell>
                  <TableCell className="text-xs">{b.browser}</TableCell>
                  <TableCell className="text-xs">{b.device}</TableCell>
                  <TableCell className="text-xs">{b.added}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", b.status === "active" ? "text-emerald-400 border-emerald-500/20" : "text-muted-foreground")}>{b.status}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => toast.info("Revoke — backend pending")}>Revoke</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 13: Entity Security ─────────────────────────────────
function EntitySecurityPanel() {
  const entities = [
    { name: "Sharma Traders Pvt Ltd", type: "Company",    level: "High",     mfa: true,  ip: true },
    { name: "Retail Division",        type: "Division",   level: "Medium",   mfa: false, ip: false },
    { name: "Finance Department",     type: "Department", level: "High",     mfa: true,  ip: true },
    { name: "Sales Team",             type: "Team",       level: "Medium",   mfa: false, ip: false },
    { name: "IT Department",          type: "Department", level: "Critical", mfa: true,  ip: true },
  ];
  return (
    <div className="space-y-5">
      <SectionHeader title="Entity Security">Security settings applied per entity in your organisation structure. This is a Company-level policy — set per entity. Select a company in the Scope bar above.</SectionHeader>
      <Card className="bg-card/60 border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Entity</TableHead><TableHead>Type</TableHead><TableHead>Security Level</TableHead><TableHead>MFA Required</TableHead><TableHead>IP Restricted</TableHead></TableRow></TableHeader>
            <TableBody>
              {entities.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{e.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{e.type}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", e.level === "Critical" ? "text-violet-400 border-violet-500/20" : e.level === "High" ? "text-red-400 border-red-500/20" : "text-amber-400 border-amber-500/20")}>{e.level}</Badge></TableCell>
                  <TableCell>{e.mfa ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground opacity-30" />}</TableCell>
                  <TableCell>{e.ip ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground opacity-30" />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 14: Role Management ─────────────────────────────────
function RoleManagementPanel() {
  const ROLE_COUNTS = [
    { role: "Super Admin", count: 1, color: "text-red-400 bg-red-500/10 border-red-500/20" },
    { role: "Admin", count: 3, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
    { role: "Manager", count: 12, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { role: "User", count: 48, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
    { role: "Viewer", count: 15, color: "text-muted-foreground bg-muted border-border" },
  ];
  const roles = ["superAdmin", "admin", "manager", "user", "viewer"] as const;
  return (
    <div className="space-y-5">
      <SectionHeader title="Role Management">Define what each role can access and do across the ERP.</SectionHeader>
      <div className="flex flex-wrap gap-3">
        {ROLE_COUNTS.map(r => (
          <div key={r.role} className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border", r.color)}>
            <span className="text-sm font-bold">{r.count}</span>
            <span className="text-xs">{r.role}</span>
          </div>
        ))}
        <Button size="sm" variant="outline" className="gap-1.5 ml-auto"><Plus className="w-3.5 h-3.5" /> Add Custom Role</Button>
      </div>
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Permission Matrix</CardTitle>
          <CardDescription className="text-xs">Backend will enforce these permissions — visual only for now</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Permission</TableHead>
                <TableHead className="text-center">Super Admin</TableHead>
                <TableHead className="text-center">Admin</TableHead>
                <TableHead className="text-center">Manager</TableHead>
                <TableHead className="text-center">User</TableHead>
                <TableHead className="text-center">Viewer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSIONS.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{row.permission}</TableCell>
                  {roles.map(role => (
                    <TableCell key={role} className="text-center">
                      {row[role] ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mx-auto" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground opacity-30 mx-auto" />}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 15: Admin Hierarchy ─────────────────────────────────
function AdminHierarchyPanel() {
  const levels = [
    { role: "Super Admin", count: 1,  color: "bg-red-500",    textColor: "text-red-400" },
    { role: "Admin",       count: 3,  color: "bg-violet-500", textColor: "text-violet-400" },
    { role: "Manager",     count: 12, color: "bg-amber-500",  textColor: "text-amber-400" },
    { role: "User",        count: 48, color: "bg-primary",    textColor: "text-primary" },
    { role: "Viewer",      count: 15, color: "bg-muted-foreground", textColor: "text-muted-foreground" },
  ];
  const total = levels.reduce((a, b) => a + b.count, 0);
  return (
    <div className="space-y-5">
      <SectionHeader title="Admin Hierarchy">Organisational access level structure and user counts at each tier.</SectionHeader>
      <div className="space-y-3">
        {levels.map((l, i) => (
          <div key={l.role} className="flex items-center gap-4" style={{ paddingLeft: `${i * 24}px` }}>
            <div className={cn("w-2 h-2 rounded-full", l.color)} />
            <span className={cn("text-sm font-medium", l.textColor)}>{l.role}</span>
            <Badge variant="outline" className="text-[10px] ml-auto">{l.count}</Badge>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Total: {total} users across all roles</p>
    </div>
  );
}

// ── Panel 16: Identity & Access ───────────────────────────────
function IdentityAccessPanel() {
  const providers = [
    { name: "Google Workspace",  description: "SSO via Google OAuth 2.0",          status: "connected",    icon: Globe },
    { name: "Microsoft Entra",   description: "SSO via Azure Active Directory",    status: "disconnected", icon: Shield },
    { name: "SAML 2.0",          description: "Enterprise SAML identity federation",status: "disconnected", icon: Key },
    { name: "Active Directory",  description: "On-premise AD/LDAP integration",   status: "disconnected", icon: Server },
  ];
  return (
    <div className="space-y-5">
      <SectionHeader title="Identity & Access">Configure SSO providers and identity federation for your organisation.</SectionHeader>
      <div className="space-y-3">
        {providers.map(p => {
          const Icon = p.icon;
          return (
            <Card key={p.name} className="bg-card/60 border-border">
              <CardContent className="pt-4 flex items-center gap-4">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", p.status === "connected" ? "text-emerald-400 border-emerald-500/20" : "text-muted-foreground")}>{p.status}</Badge>
                <Button size="sm" variant="outline" className="text-xs h-7">{p.status === "connected" ? "Manage" : "Connect"}</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Panel 17: Compliance ──────────────────────────────────────
function CompliancePanel() {
  const statusColor: Record<string, string> = { enforced: "text-emerald-400", pending: "text-amber-400", violated: "text-red-400" };
  return (
    <div className="space-y-5">
      <SectionHeader title="Compliance">Policy compliance status across your ERP deployment.</SectionHeader>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card/60 border-border">
          <CardContent className="pt-5 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={COMPLIANCE_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                  {COMPLIANCE_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-sm font-semibold text-foreground">75% Compliance Score</p>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {COMPLIANCE_POLICIES.map(p => (
            <Card key={p.name} className="bg-card/60 border-border">
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                    <Badge variant="outline" className={cn("text-[10px]", statusColor[p.status])}>{p.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                  <p className="text-[10px] text-muted-foreground/60">Last check: {p.lastCheck}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Panel 18: Audit Log ───────────────────────────────────────
function AuditLogPanel() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const typeColor: Record<string, string> = { success: "text-emerald-400 bg-emerald-500/10", info: "text-cyan-400 bg-cyan-500/10", warning: "text-amber-400 bg-amber-500/10", error: "text-red-400 bg-red-500/10" };
  const filtered = AUDIT_ENTRIES.filter(e => {
    const matchSearch = !search || e.action.toLowerCase().includes(search.toLowerCase()) || e.user.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || e.type === typeFilter;
    return matchSearch && matchType;
  });
  return (
    <div className="space-y-5">
      <SectionHeader title="Audit Log">Complete log of all actions taken in this ERP deployment.</SectionHeader>
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search actions or users..." onKeyDown={onEnterNext} className="pl-9 text-xs h-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => toast.info("Export — backend pending")}><Download className="w-3.5 h-3.5" /> Export</Button>
      </div>
      <Card className="bg-card/60 border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>User</TableHead><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs">{e.action}</TableCell>
                  <TableCell className="text-xs font-mono">{e.user}</TableCell>
                  <TableCell className="text-xs font-mono">{e.time}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", typeColor[e.type])}>{e.type}</Badge></TableCell>
                  <TableCell className="text-xs">{e.source}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 19: Email Digest ────────────────────────────────────
function EmailDigestPanel() {
  return (
    <div className="space-y-5">
      <SectionHeader title="Email Digest">Configure scheduled email reports sent to administrators.</SectionHeader>
      <Card className="bg-card/60 border-border">
        <CardContent className="pt-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Frequency</p>
            <Select defaultValue="daily">
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily — 8:00 AM IST</SelectItem>
                <SelectItem value="weekly">Weekly — Monday 8:00 AM IST</SelectItem>
                <SelectItem value="monthly">Monthly — 1st of month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Recipients</p>
            <Input placeholder="admin@company.in, security@company.in" onKeyDown={onEnterNext} className="text-xs h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Include in Digest</p>
            <div className="space-y-2">
              {["Security Events Summary", "User Activity Report", "Failed Login Attempts", "Compliance Status", "System Health"].map(item => (
                <PolicyToggleRow key={item} label={item} defaultChecked />
              ))}
            </div>
          </div>
          <SaveButton />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 20: Integrations ────────────────────────────────────
function IntegrationsPanel() {
  return (
    <div className="space-y-5">
      <SectionHeader title="Integrations">Connect external services and manage API integrations.</SectionHeader>
      <div className="space-y-3">
        {INTEGRATIONS_DATA.map(int => {
          const Icon = int.icon;
          return (
            <Card key={int.name} className="bg-card/60 border-border">
              <CardContent className="pt-4 flex items-center gap-4">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{int.name}</p>
                  <p className="text-xs text-muted-foreground">{int.category}</p>
                </div>
                <Badge variant="outline" className={cn("text-[10px]", int.status === "connected" ? "text-emerald-400 border-emerald-500/20" : "text-muted-foreground")}>{int.status}</Badge>
                <Button size="sm" variant="outline" className="text-xs h-7">{int.status === "connected" ? "Manage" : "Connect"}</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Panel 21: Impersonation ───────────────────────────────────
function ImpersonationPanel() {
  return (
    <div className="space-y-5">
      <SectionHeader title="Impersonation">Temporarily act as another user to troubleshoot issues. All impersonation sessions are fully logged. This is a User-level setting — specific to each individual user.</SectionHeader>
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400">All impersonation sessions are logged and visible to Super Admins. Use with caution.</p>
      </div>
      <Card className="bg-card/60 border-border">
        <CardContent className="pt-5 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search by name or email..." onKeyDown={onEnterNext} className="pl-9 text-xs h-8" />
          </div>
          {MOCK_USERS.slice(0, 5).map((u, i) => {
            const initials = u.name.split(" ").map(n => n[0]).join("").slice(0, 2);
            return (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/40">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{initials}</div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{u.name}</p>
                  <p className="text-[10px] text-muted-foreground">{u.email} · {u.role}</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => toast.info(`Impersonation of ${u.name} — backend pending`)}><Eye className="w-3 h-3" /> Start Session</Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 22: Workflows ───────────────────────────────────────
function WorkflowsPanel() {
  const [autoApprove, setAutoApprove] = useState(false);
  const [depth, setDepth] = useState([2]);
  const workflows = [
    { name: "Purchase Order Approval", levels: 3, status: "active" },
    { name: "Leave Request",           levels: 2, status: "active" },
    { name: "Expense Reimbursement",   levels: 2, status: "active" },
    { name: "Vendor Onboarding",       levels: 4, status: "draft" },
  ];
  return (
    <div className="space-y-5">
      <SectionHeader title="Workflows">Configure approval chains and automation rules across modules.</SectionHeader>
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Global Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-approve below threshold</p>
              <p className="text-xs text-muted-foreground">Skip approval for low-value transactions</p>
            </div>
            <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
          </div>
          <div>
            <div className="flex justify-between text-sm"><span>Default Approval Depth</span><span className="font-mono text-xs">{depth[0]} levels</span></div>
            <Slider value={depth} onValueChange={setDepth} min={1} max={5} step={1} className="mt-2" />
          </div>
          <SaveButton />
        </CardContent>
      </Card>
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Active Workflows</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {workflows.map((w, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
              <div>
                <p className="text-sm font-medium text-foreground">{w.name}</p>
                <p className="text-xs text-muted-foreground">{w.levels} levels</p>
              </div>
              <Badge variant="outline" className={cn("text-[10px]", w.status === "active" ? "text-emerald-400 border-emerald-500/20" : "text-muted-foreground")}>{w.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 23: Portal Branding ─────────────────────────────────
function PortalBrandingPanel() {
  const [portalName, setPortalName] = useState("Operix ERP");
  const [primaryColor, setPrimaryColor] = useState("#0ea5e9");
  return (
    <div className="space-y-5">
      <SectionHeader title="Portal Branding">Customise how your ERP portal looks for end users. This is a Company-level policy — set per entity. Select a company in the Scope bar above.</SectionHeader>
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Identity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Portal Name</p>
            <Input value={portalName} onChange={e => setPortalName(e.target.value)} onKeyDown={onEnterNext} className="text-xs h-8" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Logo URL</p>
            <Input placeholder="https://cdn.example.com/logo.png" onKeyDown={onEnterNext} className="text-xs h-8" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Favicon URL</p>
            <Input placeholder="https://cdn.example.com/favicon.ico" onKeyDown={onEnterNext} className="text-xs h-8" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Theme</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Primary Color</p>
            <div className="flex gap-2">
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-8 w-10 rounded cursor-pointer border border-border bg-transparent" />
              <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} onKeyDown={onEnterNext} className="w-32 text-xs h-8 font-mono" />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="p-4 rounded-xl border border-border/40" style={{ borderColor: primaryColor }}>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-foreground">{portalName}</span>
              </div>
            </div>
          </div>
          <SaveButton />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 24: Export / Import ──────────────────────────────────
function ExportPanel() {
  const [format, setFormat] = useState("excel");
  const entities = ["Users & Roles", "Audit Logs", "Security Policies", "Org Structure", "Workflow Rules", "Integration Config"];
  const [selected, setSelected] = useState<string[]>(["Users & Roles", "Audit Logs"]);
  function toggle(e: string) { setSelected(p => p.includes(e) ? p.filter(x => x !== e) : [...p, e]); }
  return (
    <div className="space-y-5">
      <SectionHeader title="Export / Import">Export configuration and data for backup or migration.</SectionHeader>
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Export Data</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Format</p>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Include</p>
            <div className="grid grid-cols-2 gap-2">
              {entities.map(e => (
                <button key={e} onClick={() => toggle(e)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors border-border/40 hover:border-primary/30">
                  {selected.includes(e) ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground opacity-30 flex-shrink-0" />}
                  {e}
                </button>
              ))}
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => toast.info("Export — backend pending")}><Download className="w-3.5 h-3.5" /> Export Selected</Button>
        </CardContent>
      </Card>
      <Card className="bg-card/60 border-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Import Data</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <button className="w-full p-6 border-2 border-dashed border-border rounded-xl text-center hover:border-primary/30 transition-colors" onClick={() => toast.info("File upload — backend pending")}>
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Click to upload</p>
            <p className="text-[10px] text-muted-foreground/60">.xlsx, .csv or .json</p>
          </button>
          <p className="text-xs text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 inline mr-1" />
            Import will overwrite existing data. Always export a backup first.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 25: Shared Preview ──────────────────────────────────
function SharedPreviewPanel() {
  const links = [
    { title: "Q4 Sales Dashboard", created: "1 Apr 2026",  expires: "8 Apr 2026",  views: 12, status: "active" },
    { title: "Audit Report March",  created: "28 Mar 2026", expires: "28 Apr 2026", views: 5,  status: "active" },
    { title: "Inventory Summary",   created: "20 Mar 2026", expires: "20 Apr 2026", views: 3,  status: "active" },
    { title: "Old Budget View",     created: "1 Feb 2026",  expires: "1 Mar 2026",  views: 24, status: "expired" },
  ];
  return (
    <div className="space-y-5">
      <SectionHeader title="Shared Preview">Generate and manage shareable read-only links for specific screens.</SectionHeader>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.info("Generate link — backend pending")}><Link2 className="w-3.5 h-3.5" /> Generate Link</Button>
      <Card className="bg-card/60 border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Created</TableHead><TableHead>Expires</TableHead><TableHead>Views</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {links.map((l, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{l.title}</TableCell>
                  <TableCell className="text-xs">{l.created}</TableCell>
                  <TableCell className="text-xs">{l.expires}</TableCell>
                  <TableCell className="text-xs font-mono">{l.views}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", l.status === "active" ? "text-emerald-400 border-emerald-500/20" : "text-muted-foreground")}>{l.status}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => toast.info("Revoke — backend pending")}>Revoke</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel 26: Message Templates ───────────────────────────────
function MessageTemplatesPanel() {
  return (
    <div className="space-y-5">
      <SectionHeader title="Message Templates">Manage notification templates sent to users across all channels.</SectionHeader>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.info("New template — backend pending")}><Plus className="w-3.5 h-3.5" /> New Template</Button>
      <Card className="bg-card/60 border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Template Name</TableHead><TableHead>Channel</TableHead><TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead>Last Edited</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {MESSAGE_TEMPLATES.map((t, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-medium">{t.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{t.channel}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{t.version}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[10px]", t.status === "active" ? "text-emerald-400 border-emerald-500/20" : "text-muted-foreground")}>{t.status}</Badge></TableCell>
                  <TableCell className="text-xs">{t.lastEdited}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => toast.info(`Edit ${t.name} — backend pending`)}>Edit</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Panel Map ─────────────────────────────────────────────────
const PANEL_MAP: Record<ConsoleTab, React.FC> = {
  "org-analytics":    OrgAnalyticsPanel,
  "dashboard":        SecurityDashboardPanel,
  "monitoring":       SystemHealthPanel,
  "security":         SecurityTemplatesPanel,
  "password-policy":  PasswordPolicyPanel,
  "geo-fencing":      GeoFencingPanel,
  "ip-whitelist":     IPWhitelistPanel,
  "app-passwords":    AppPasswordsPanel,
  "device-signin":    DeviceSignInPanel,
  "mfa":              MFAPanel,
  "mfa-recovery":     MFARecoveryPanel,
  "trusted-browsers": TrustedBrowsersPanel,
  "entities":         EntitySecurityPanel,
  "roles":            RoleManagementPanel,
  "hierarchy":        AdminHierarchyPanel,
  "identity-access":  IdentityAccessPanel,
  "compliance":       CompliancePanel,
  "audit":            AuditLogPanel,
  "email-digest":     EmailDigestPanel,
  "integrations":     IntegrationsPanel,
  "impersonation":    ImpersonationPanel,
  "workflows":        WorkflowsPanel,
  "portal-branding":  PortalBrandingPanel,
  "export":           ExportPanel,
  "preview":          SharedPreviewPanel,
  "message-templates":MessageTemplatesPanel,
};

// ── Sidebar Nav Components ────────────────────────────────────
function NavItem({ tab, active, onClick }: { tab: TabConfig; active: boolean; onClick: () => void }) {
  const Icon = tab.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
      )}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {tab.label}
    </button>
  );
}

function SidebarSection({
  section, tabs, activeTab, collapsed, onToggle, onTabChange,
}: {
  section: string;
  tabs: TabConfig[];
  activeTab: ConsoleTab;
  collapsed: boolean;
  onToggle: () => void;
  onTabChange: (tab: ConsoleTab) => void;
}) {
  return (
    <div className="mb-1">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
        {section}
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {!collapsed && (
        <div className="space-y-0.5 px-1">
          {tabs.map(tab => (
            <NavItem key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => onTabChange(tab.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main SecurityModule Component ─────────────────────────────
export function SecurityModule() {
  const [activeTab, setActiveTab] = useState<ConsoleTab>(() => {
    // [JWT] GET /api/console/storage/:key
    const saved = localStorage.getItem("operix_console_tab");
    if (saved && saved in PANEL_MAP) return saved as ConsoleTab;
    return "org-analytics";
  });

  const [sidebarSearch, setSidebarSearch] = useState("");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [scope, setScope] = useState<ScopeContext>({
    level: 'global',
    entityName: 'All Companies',
  });

  const handleTabChange = useCallback((tab: ConsoleTab) => {
    setActiveTab(tab);
    // [JWT] PATCH /api/console/storage/:key
    localStorage.setItem("operix_console_tab", tab);
  }, []);

  function toggleSection(s: string) {
    setCollapsed(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  }

  const ActivePanel = PANEL_MAP[activeTab];
  const activeConfig = TAB_CONFIG.find(t => t.id === activeTab);

  const searchFiltered = sidebarSearch.trim()
    ? TAB_CONFIG.filter(t => t.label.toLowerCase().includes(sidebarSearch.toLowerCase()))
    : null;

  return (
    <div data-keyboard-form className="flex h-full gap-0">
      {/* Sidebar */}
      <div className="w-[240px] flex-shrink-0 border-r border-border bg-card/30 flex flex-col">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search tabs..."
              className="pl-8 text-xs h-7 bg-muted/30"
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-2">
            {searchFiltered ? (
              searchFiltered.length > 0
                ? searchFiltered.map(tab => <NavItem key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => handleTabChange(tab.id)} />)
                : <p className="text-xs text-muted-foreground px-3 py-2">No results</p>
            ) : (
              SECTIONS.map(section => (
                <SidebarSection
                  key={section}
                  section={section}
                  tabs={TAB_CONFIG.filter(t => t.section === section)}
                  activeTab={activeTab}
                  collapsed={collapsed.includes(section)}
                  onToggle={() => toggleSection(section)}
                  onTabChange={handleTabChange}
                />
              ))
            )}
          </div>
        </ScrollArea>
        {/* Sidebar footer with scope badge */}
        {activeConfig && (
          <div className="px-3 py-2 border-t border-border text-[10px] text-muted-foreground flex items-center">
            {activeConfig.label}
            <ScopeBadge tab={activeTab} />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <ScopeBar scope={scope} onScopeChange={setScope} />
        {activeConfig && (
          <div className="px-6 pt-4 pb-2 border-b border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{activeConfig.section}</p>
            <h2 className="text-lg font-semibold text-foreground">{activeConfig.label}<ScopeBadge tab={activeTab} /></h2>
          </div>
        )}
        <div className="p-6">
          <ActivePanel />
        </div>
      </div>
    </div>
  );
}
