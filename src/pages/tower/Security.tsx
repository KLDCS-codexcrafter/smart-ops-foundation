import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck, ShieldAlert, Activity, Lock,
  CheckCircle2, XCircle, Ban, AlertTriangle, Key,
  Globe, Timer,
} from "lucide-react";
import { TowerLayout } from "@/components/layout/TowerLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────
interface SecurityEvent {
  id: string;
  type: "login_success" | "login_failed" | "mfa_challenge"
      | "ip_blocked" | "suspicious_activity" | "password_reset";
  user: string;
  tenant: string;
  ip: string;
  location: string;
  time: string;
  severity: "info" | "warning" | "critical";
}

interface PolicyStatus {
  id: string;
  name: string;
  status: "enforced" | "partial" | "disabled";
  description: string;
  affectedTenants: number;
  lastUpdated: string;
}

interface LoginTrend {
  day: string;
  successful: number;
  failed: number;
  blocked: number;
}

// ── Data ───────────────────────────────────────────────
const SECURITY_SCORE = 82;

const SUB_METRICS = [
  { label: "Authentication", value: 91, icon: ShieldCheck },
  { label: "Access Control", value: 84, icon: Lock },
  { label: "Session Security", value: 78, icon: Timer },
  { label: "IP Compliance", value: 88, icon: Globe },
];

const SECURITY_EVENTS: SecurityEvent[] = [
  { id: "EVT-001", type: "login_failed", user: "arjun.mehta@reliancedigital.in", tenant: "Reliance Digital", ip: "103.21.58.44", location: "Mumbai, MH", time: "2 min ago", severity: "warning" },
  { id: "EVT-002", type: "mfa_challenge", user: "vikram.nair@tatamotors.com", tenant: "Tata Motors Finance", ip: "49.36.112.88", location: "Pune, MH", time: "5 min ago", severity: "info" },
  { id: "EVT-003", type: "ip_blocked", user: "unknown", tenant: "—", ip: "185.220.101.34", location: "Unknown", time: "8 min ago", severity: "critical" },
  { id: "EVT-004", type: "login_success", user: "rajesh.iyer@infosysbpm.com", tenant: "Infosys BPM", ip: "49.206.4.12", location: "Bengaluru, KA", time: "12 min ago", severity: "info" },
  { id: "EVT-005", type: "suspicious_activity", user: "sanjay.g@muthoot.com", tenant: "Muthoot Finance", ip: "106.51.22.18", location: "Kochi, KL", time: "20 min ago", severity: "critical" },
  { id: "EVT-006", type: "password_reset", user: "pooja.reddy@havells.com", tenant: "Havells India", ip: "117.195.84.22", location: "New Delhi, DL", time: "35 min ago", severity: "info" },
  { id: "EVT-007", type: "login_failed", user: "meera.joshi@bajajfinserv.com", tenant: "Bajaj Finserv", ip: "122.168.44.56", location: "Pune, MH", time: "42 min ago", severity: "warning" },
  { id: "EVT-008", type: "ip_blocked", user: "unknown", tenant: "—", ip: "45.142.212.100", location: "Unknown", time: "1 hr ago", severity: "critical" },
];

const POLICIES: PolicyStatus[] = [
  { id: "POL-001", name: "Password Policy", status: "enforced", description: "Min 8 chars, uppercase, number, special char", affectedTenants: 12, lastUpdated: "15 Jun 2026" },
  { id: "POL-002", name: "MFA Enforcement", status: "partial", description: "Required for admin roles only — all roles pending", affectedTenants: 8, lastUpdated: "01 Jul 2026" },
  { id: "POL-003", name: "Session Timeout", status: "enforced", description: "Auto-logout after 30 min inactivity", affectedTenants: 12, lastUpdated: "10 Jun 2026" },
  { id: "POL-004", name: "IP Whitelist", status: "partial", description: "3 violations in last 24 hours", affectedTenants: 5, lastUpdated: "03 Jul 2026" },
  { id: "POL-005", name: "Geo-Fencing", status: "disabled", description: "Not yet configured for any tenant", affectedTenants: 0, lastUpdated: "—" },
  { id: "POL-006", name: "Audit Trail", status: "enforced", description: "All admin actions logged in real-time", affectedTenants: 12, lastUpdated: "12 Jan 2024" },
];

const LOGIN_TREND: LoginTrend[] = [
  { day: "Mon", successful: 342, failed: 18, blocked: 4 },
  { day: "Tue", successful: 398, failed: 24, blocked: 7 },
  { day: "Wed", successful: 412, failed: 31, blocked: 9 },
  { day: "Thu", successful: 387, failed: 19, blocked: 5 },
  { day: "Fri", successful: 356, failed: 22, blocked: 6 },
  { day: "Sat", successful: 189, failed: 8, blocked: 2 },
  { day: "Sun", successful: 124, failed: 5, blocked: 1 },
];

// ── Config ─────────────────────────────────────────────
const EVENT_CONFIG: Record<SecurityEvent["type"], { label: string; Icon: React.ElementType; color: string }> = {
  login_success:       { label: "Login Success",      Icon: CheckCircle2, color: "text-success" },
  login_failed:        { label: "Login Failed",        Icon: XCircle,      color: "text-warning" },
  mfa_challenge:       { label: "MFA Challenge",       Icon: ShieldAlert,  color: "text-info" },
  ip_blocked:          { label: "IP Blocked",          Icon: Ban,          color: "text-destructive" },
  suspicious_activity: { label: "Suspicious Activity", Icon: AlertTriangle,color: "text-destructive" },
  password_reset:      { label: "Password Reset",      Icon: Key,          color: "text-primary" },
};

const SEVERITY_CONFIG: Record<SecurityEvent["severity"], string> = {
  info:     "bg-info/10 text-info border-info/20",
  warning:  "bg-warning/10 text-warning border-warning/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

const POLICY_CONFIG: Record<PolicyStatus["status"], { label: string; color: string }> = {
  enforced: { label: "Enforced", color: "bg-success/10 text-success border-success/20" },
  partial:  { label: "Partial",  color: "bg-warning/10 text-warning border-warning/20" },
  disabled: { label: "Disabled", color: "bg-muted text-muted-foreground border-border" },
};

// ── Component ──────────────────────────────────────────
const Security = () => {
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);

  const openDetail = (event: SecurityEvent) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  };

  const scoreColor = SECURITY_SCORE >= 80 ? "text-success" : SECURITY_SCORE >= 60 ? "text-warning" : "text-destructive";
  const scoreBarColor = SECURITY_SCORE >= 80 ? "bg-success" : SECURITY_SCORE >= 60 ? "bg-warning" : "bg-destructive";

  return (
    <TowerLayout title="Security" subtitle="Platform security posture, policies and threat monitoring">
      {/* Score + KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {/* Security Score */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Security Score</h3>
          <div className="flex items-baseline gap-1 mb-3">
            <span className={cn("text-5xl font-bold font-mono", scoreColor)}>{SECURITY_SCORE}</span>
            <span className="text-xl text-muted-foreground">/100</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full mb-4">
            <div className={cn("h-2 rounded-full", scoreBarColor)} style={{ width: `${SECURITY_SCORE}%` }} />
          </div>
          <div className="space-y-2">
            {SUB_METRICS.map((m) => (
              <div key={m.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className="font-mono text-foreground">{m.value}%</span>
                </div>
                <div className="w-full h-1 bg-secondary rounded-full">
                  <div className="h-1 bg-primary rounded-full" style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <StatCard icon={ShieldCheck} label="Active MFA Users" value="142" color="text-success" sub="Across all tenants" />
        <StatCard icon={ShieldAlert} label="Blocked Sign-Ins (7d)" value="28" color="text-destructive" />
        <StatCard icon={Activity} label="Active Sessions" value="89" color="text-primary" sub="Right now" />
      </div>

      {/* Login Trend Chart */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Login Activity — Last 7 Days</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success" />Successful</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning" />Failed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" />Blocked</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={LOGIN_TREND} barGap={2} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
            <Bar dataKey="successful" fill="hsl(var(--success))" fillOpacity={0.7} radius={[3, 3, 0, 0]} barSize={12} />
            <Bar dataKey="failed" fill="hsl(var(--warning))" fillOpacity={0.8} radius={[3, 3, 0, 0]} barSize={12} />
            <Bar dataKey="blocked" fill="hsl(var(--destructive))" fillOpacity={0.9} radius={[3, 3, 0, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Events + Policies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Events */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Recent Events</h3>
            <span className="bg-destructive/10 text-destructive text-xs px-2 py-0.5 rounded-md">
              {SECURITY_EVENTS.length} today
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {SECURITY_EVENTS.map((evt) => {
              const cfg = EVENT_CONFIG[evt.type];
              return (
                <div
                  key={evt.id}
                  className="flex items-start gap-3 p-4 border-b border-border/50 last:border-0 hover:bg-muted/20 cursor-pointer"
                  onClick={() => openDetail(evt)}
                >
                  <cfg.Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{cfg.label}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{evt.user}</div>
                    <div className="text-xs font-mono text-muted-foreground/60">{evt.ip} · {evt.location}</div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", SEVERITY_CONFIG[evt.severity])}>
                      {evt.severity}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1">{evt.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security Policies */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Security Policies</h3>
            <span className="text-xs text-muted-foreground">6 policies</span>
          </div>
          <div>
            {POLICIES.map((pol) => {
              const cfg = POLICY_CONFIG[pol.status];
              return (
                <div key={pol.id} className="p-4 border-b border-border/50 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{pol.name}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded border ml-auto", cfg.color)}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{pol.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">{pol.affectedTenants} tenants affected</span>
                    <span className="text-[10px] text-muted-foreground">Updated {pol.lastUpdated}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Event Detail Sheet */}
      <Sheet open={showEventDetail} onOpenChange={setShowEventDetail}>
        <SheetContent side="right" className="w-[400px]">
          {selectedEvent && <EventDetail event={selectedEvent} />}
        </SheetContent>
      </Sheet>
    </TowerLayout>
  );
};

// ── StatCard ───────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10">
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </div>
      <div className="font-mono text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Event Detail ───────────────────────────────────────
function EventDetail({ event }: { event: SecurityEvent }) {
  const cfg = EVENT_CONFIG[event.type];

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Event ID", value: <span className="font-mono text-xs">{event.id}</span> },
    { label: "Type", value: cfg.label },
    { label: "User", value: event.user },
    { label: "Tenant", value: event.tenant },
    { label: "IP Address", value: <span className="font-mono">{event.ip}</span> },
    { label: "Location", value: event.location },
    { label: "Time", value: event.time },
    {
      label: "Severity",
      value: (
        <span className={cn("text-xs px-2 py-0.5 rounded border", SEVERITY_CONFIG[event.severity])}>
          {event.severity}
        </span>
      ),
    },
  ];

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-3">
          <span className="text-lg font-semibold">{cfg.label}</span>
          <span className={cn("text-xs px-2 py-0.5 rounded border", SEVERITY_CONFIG[event.severity])}>
            {event.severity}
          </span>
        </SheetTitle>
      </SheetHeader>

      <div className="mt-4 space-y-5">
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/20">
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className="text-sm text-foreground">{r.value}</span>
            </div>
          ))}
        </div>

        <div className="h-px bg-border" />

        <div className="space-y-2">
          {event.severity === "critical" && (
            <>
              <Button className="w-full bg-destructive text-destructive-foreground" onClick={() => toast(`IP ${event.ip} blocked`)}>
                Block IP Address
              </Button>
              <Button variant="outline" className="w-full" onClick={() => toast("Escalated to platform admin")}>
                Escalate to Admin
              </Button>
            </>
          )}
          {(event.type === "login_failed" || event.type === "suspicious_activity") && (
            <Button variant="outline" className="w-full" onClick={() => toast("User sessions terminated")}>
              Force User Logout
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={() => toast("Opening audit trail...")}>
            View Full Audit Trail
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Security events are retained for 90 days per compliance policy.
        </p>
      </div>
    </>
  );
}

export default Security;
