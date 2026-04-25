import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Search, Shield, ShieldCheck, AlertTriangle, XCircle, Lock, Database, ChevronDown, ChevronRight, Users, Settings, FileText, Trash2, Plus, Download } from "lucide-react";
import { TowerLayout } from "@/components/layout/TowerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { onEnterNext } from '@/lib/keyboard';

// ── Section / Panel definitions ──────────────────────
interface PanelDef {
  id: string;
  label: string;
}
interface SectionDef {
  id: string;
  label: string;
  icon: React.ElementType;
  emoji: string;
  panels: PanelDef[];
}

const SECTIONS: SectionDef[] = [
  {
    id: "monitoring", label: "Security Monitoring", icon: Search, emoji: "🔍",
    panels: [
      { id: "security-dashboard", label: "Security Dashboard" },
      { id: "org-analytics", label: "Org Analytics" },
      { id: "system-health", label: "System Health" },
    ],
  },
  {
    id: "policies", label: "Security Policies", icon: Shield, emoji: "🛡️",
    panels: [
      { id: "security-templates", label: "Security Templates" },
      { id: "password-policy", label: "Password Policy" },
      { id: "geo-fencing", label: "Geo-Fencing" },
      { id: "ip-whitelist", label: "IP Whitelist" },
      { id: "mfa-settings", label: "MFA Settings" },
      { id: "mfa-recovery", label: "MFA Recovery" },
      { id: "device-sign-in", label: "Device Sign-In" },
      { id: "trusted-browsers", label: "Trusted Browsers" },
      { id: "app-passwords", label: "App Passwords" },
    ],
  },
  {
    id: "entity", label: "Entity Management", icon: Users, emoji: "👥",
    panels: [
      { id: "role-management", label: "Role Management" },
      { id: "admin-hierarchy", label: "Admin Hierarchy" },
      { id: "entity-security", label: "Entity Security" },
      { id: "identity-access", label: "Identity & Access" },
    ],
  },
  {
    id: "compliance", label: "Compliance & Audit", icon: FileText, emoji: "📋",
    panels: [
      { id: "compliance-dashboard", label: "Compliance Dashboard" },
      { id: "audit-log", label: "Audit Log" },
      { id: "email-digest", label: "Email Digest" },
      { id: "integrations", label: "Integrations" },
    ],
  },
  {
    id: "operations", label: "Operations", icon: Settings, emoji: "⚙️",
    panels: [
      { id: "user-impersonation", label: "User Impersonation" },
      { id: "tenant-management", label: "Tenant Management" },
      { id: "super-admin-controls", label: "Super Admin Controls" },
      { id: "workflows", label: "Workflows" },
      { id: "portal-branding", label: "Portal Branding" },
    ],
  },
  {
    id: "data", label: "Data & Sharing", icon: Database, emoji: "💾",
    panels: [
      { id: "export-import", label: "Export / Import" },
      { id: "shared-preview", label: "Shared Preview" },
      { id: "message-templates", label: "Message Templates" },
    ],
  },
];

const IMPLEMENTED_PANELS = new Set([
  "security-dashboard", "password-policy", "geo-fencing",
  "mfa-settings", "ip-whitelist", "audit-log",
]);

const ALL_PANELS = SECTIONS.flatMap(s => s.panels);

// ── Main Component ───────────────────────────────────
export default function Security() {
  const [activePanel, setActivePanel] = useState("security-dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const q = searchQuery.toLowerCase();
    return SECTIONS.map(s => ({
      ...s,
      panels: s.panels.filter(p => p.label.toLowerCase().includes(q)),
    })).filter(s => s.panels.length > 0);
  }, [searchQuery]);

  const activePanelLabel = ALL_PANELS.find(p => p.id === activePanel)?.label || activePanel;

  return (
    <TowerLayout title="Security Console" subtitle="Platform security posture — 27 panels">
      <div className="flex h-[calc(100vh-120px)] -m-6">
        {/* Sub-nav */}
        <aside className="w-[280px] shrink-0 bg-[#0D1B2A] border-r border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white">Security Console</h2>
              <span className="text-[10px] bg-cyan-900/60 text-cyan-400 px-2 py-0.5 rounded-full font-bold">27 panels</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input
                placeholder="Search panels..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredSections.map(section => {
              const collapsed = collapsedSections.has(section.id);
              return (
                <div data-keyboard-form key={section.id}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex items-center gap-2 w-full px-2 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    <span>{section.emoji}</span>
                    <span className="flex-1 text-left">{section.label}</span>
                    <span className="text-[10px] text-slate-600">{section.panels.length}</span>
                  </button>
                  {!collapsed && (
                    <div className="ml-4 space-y-0.5 mt-0.5">
                      {section.panels.map(panel => (
                        <button
                          key={panel.id}
                          onClick={() => setActivePanel(panel.id)}
                          className={cn(
                            "w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors",
                            activePanel === panel.id
                              ? "bg-cyan-500 text-white font-medium"
                              : "text-slate-400 hover:text-white hover:bg-slate-800"
                          )}
                        >
                          {panel.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#0D1B2A]">
          {IMPLEMENTED_PANELS.has(activePanel) ? (
            <>
              {activePanel === "security-dashboard" && <SecurityDashboardPanel />}
              {activePanel === "password-policy" && <PasswordPolicyPanel />}
              {activePanel === "geo-fencing" && <GeoFencingPanel />}
              {activePanel === "mfa-settings" && <MFASettingsPanel />}
              {activePanel === "ip-whitelist" && <IPWhitelistPanel />}
              {activePanel === "audit-log" && <AuditLogPanel />}
            </>
          ) : (
            <ComingSoonPanel name={activePanelLabel} />
          )}
        </main>
      </div>
    </TowerLayout>
  );
}

// ── Coming Soon Placeholder ──────────────────────────
function ComingSoonPanel({ name }: { name: string }) {
  return (
    <div data-keyboard-form className="flex flex-col items-center justify-center h-full min-h-[400px]">
      <Lock className="h-12 w-12 text-slate-600 mb-4" />
      <h2 className="text-xl font-bold text-slate-400 mb-2">{name}</h2>
      <span className="text-xs bg-slate-700 text-slate-400 px-3 py-1 rounded-full mb-3">Under Development</span>
      <p className="text-sm text-slate-500 text-center max-w-xs mb-4">
        This panel is secured and ready for activation in the next sprint.
      </p>
      <span className="text-[10px] bg-amber-900/40 text-amber-400 px-2 py-0.5 rounded-full">Sprint: C2 — Q3 2026</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// PANEL 1: Security Dashboard
// ══════════════════════════════════════════════════════
function SecurityDashboardPanel() {
  // [JWT] Replace with real security metrics from API
  const policyCoverage = [
    { name: "MFA Enforcement", status: true },
    { name: "Password Policy", status: true },
    { name: "Geo-Fencing", status: true },
    { name: "IP Whitelist", status: true },
    { name: "Device Sign-In", status: false },
    { name: "Trusted Browsers", status: true },
    { name: "Session Timeout", status: "30 min" },
    { name: "Audit Logging", status: true },
  ];

  const securityEvents = [
    { type: "Security", desc: "Failed login blocked: unknown@hacker.xyz", time: "3 min ago", severity: "critical" },
    { type: "Policy", desc: "IP Whitelist violation — 103.24.55.12", time: "18 min ago", severity: "warning" },
    { type: "Auth", desc: "MFA challenge passed: admin@acmeindia.in", time: "32 min ago", severity: "info" },
    { type: "System", desc: "Geo-fence rule triggered — China IP blocked", time: "1 hr ago", severity: "critical" },
    { type: "Policy", desc: "Password policy violation — weak password attempt", time: "2 hr ago", severity: "warning" },
  ];

  const sevColor: Record<string, string> = {
    critical: "bg-red-900/40 text-red-400",
    warning: "bg-amber-900/40 text-amber-400",
    info: "bg-emerald-900/40 text-emerald-400",
  };

  const r = 40, stroke = 8, size = (r + stroke) * 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (91 / 100) * circ;

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-5 flex flex-col items-center">
          <svg width={size} height={size} className="mb-2">
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#334155" strokeWidth={stroke} />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#10B981" strokeWidth={stroke}
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              transform={`rotate(-90 ${size/2} ${size/2})`} />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
              fill="#10B981" fontSize="18" fontWeight="bold" fontFamily="JetBrains Mono, monospace">91</text>
          </svg>
          <span className="text-xs text-slate-400">Platform Security Score</span>
        </div>
        <DashStatCard icon={ShieldCheck} value="0" label="Active Threats" color="text-emerald-400" />
        <DashStatCard icon={AlertTriangle} value="3" label="Policy Violations (24h)" color="text-amber-400" />
        <DashStatCard icon={XCircle} value="7" label="Failed Logins (24h)" color="text-red-400" />
      </div>

      {/* Policy Coverage */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Policy Coverage</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {policyCoverage.map(p => (
            <div key={p.name} className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-4 flex items-center justify-between">
              <span className="text-xs text-white font-medium">{p.name}</span>
              {typeof p.status === "boolean" ? (
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                  p.status ? "bg-emerald-900/60 text-emerald-400" : "bg-slate-700 text-slate-400"
                )}>{p.status ? "ON" : "OFF"}</span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-400">{p.status}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Recent Security Events</h3>
        <div className="space-y-3">
          {securityEvents.map((evt, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5", sevColor[evt.severity])}>{evt.type}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{evt.desc}</p>
                <span className="text-xs text-slate-400">{evt.time}</span>
              </div>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full shrink-0", sevColor[evt.severity])}>{evt.severity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashStatCard({ icon: Icon, value, label, color }: {
  icon: React.ElementType; value: string; label: string; color: string;
}) {
  return (
    <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-5 flex flex-col items-center justify-center">
      <Icon className={cn("h-6 w-6 mb-2", color)} />
      <span className={cn("text-3xl font-bold font-mono", color)}>{value}</span>
      <span className="text-xs text-slate-400 text-center mt-1">{label}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// PANEL 2: Password Policy
// ══════════════════════════════════════════════════════
function PasswordPolicyPanel() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-white mb-5">Password Requirements</h3>
        <div className="space-y-4">
          <PolicyRow label="Minimum length" right={<span className="text-sm font-mono text-cyan-400">12</span>} />
          <PolicyToggle label="Require uppercase" on />
          <PolicyToggle label="Require lowercase" on />
          <PolicyToggle label="Require numbers" on />
          <PolicyToggle label="Require special characters" on />
          <PolicyToggle label="Prevent common passwords" on />
        </div>
      </div>

      <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-white mb-5">Password Expiry</h3>
        <div className="space-y-4">
          <PolicyRow label="Password expires every" right={<span className="text-sm font-mono text-cyan-400">90 days</span>} />
          <PolicyToggle label="Force change on next login" on={false} />
          <PolicyRow label="Remember last N passwords" right={<span className="text-sm font-mono text-cyan-400">5</span>} />
        </div>
      </div>

      <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Strength Indicator Preview</h3>
        <div className="flex gap-1.5 mb-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 h-2 rounded-full bg-emerald-400" />
          ))}
        </div>
        <span className="text-xs text-emerald-400 font-semibold">Strong</span>
      </div>

      <Button
        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
        onClick={() => toast.success("Password Policy updated successfully")}
      >
        Save Policy
      </Button>
    </div>
  );
}

function PolicyToggle({ label, on }: { label: string; on: boolean }) {
  const [checked, setChecked] = useState(on);
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-300">{label}</span>
      <Switch checked={checked} onCheckedChange={setChecked} />
    </div>
  );
}

function PolicyRow({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
      <span className="text-sm text-slate-300">{label}</span>
      {right}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// PANEL 3: Geo-Fencing
// ══════════════════════════════════════════════════════
function GeoFencingPanel() {
  // [JWT] Replace with real geo-fencing rules from API
  const blocked = [
    { country: "🇨🇳 China", date: "12 Jan 2026" },
    { country: "🇷🇺 Russia", date: "12 Jan 2026" },
    { country: "🇰🇵 North Korea", date: "12 Jan 2026" },
    { country: "🇵🇰 Pakistan", date: "14 Feb 2026" },
  ];

  const allowed = [
    { country: "🇮🇳 India", note: "Fully allowed", primary: true },
    { country: "🇦🇪 UAE", note: "Allowed" },
    { country: "🇸🇬 Singapore", note: "Allowed" },
    { country: "🇬🇧 UK", note: "Allowed" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Active Rules</h3>
          <Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10">
            <Plus className="h-3 w-3 mr-1" /> Add Rule
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs text-slate-400">
                <th className="text-left py-2 font-medium">Country</th>
                <th className="text-left py-2 font-medium">Action</th>
                <th className="text-left py-2 font-medium">Status</th>
                <th className="text-left py-2 font-medium">Added</th>
                <th className="text-right py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {blocked.map(r => (
                <tr key={r.country} className="border-b border-slate-700/50">
                  <td className="py-3 text-white">{r.country}</td>
                  <td><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Block</span></td>
                  <td><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400">Active</span></td>
                  <td className="text-xs text-slate-400 font-mono">{r.date}</td>
                  <td className="text-right">
                    <button onClick={() => toast("Rule removed")} className="text-slate-500 hover:text-red-400 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Allowed Regions</h3>
        <div className="space-y-2">
          {allowed.map(r => (
            <div key={r.country} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
              <span className="text-sm text-white">{r.country}</span>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
                r.primary ? "bg-cyan-900/60 text-cyan-400" : "bg-emerald-900/40 text-emerald-400"
              )}>{r.note}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <Input placeholder="Add country..." className="flex-1 h-8 text-xs bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"  onKeyDown={onEnterNext} />
          <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-white h-8"><Plus className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// PANEL 4: MFA Settings
// ══════════════════════════════════════════════════════
function MFASettingsPanel() {
  const [mfaEnabled, setMfaEnabled] = useState(true);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Enforcement toggle */}
      <div className={cn("rounded-xl border p-5 flex items-center justify-between",
        mfaEnabled ? "bg-emerald-900/20 border-emerald-700/40" : "bg-[#1E3A5F] border-slate-700"
      )}>
        <div>
          <h3 className="text-sm font-semibold text-white">MFA Enforcement</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {mfaEnabled ? "Multi-Factor Authentication is required for all users" : "MFA is currently disabled"}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Users must verify their identity with a second factor at login</p>
        </div>
        <Switch checked={mfaEnabled} onCheckedChange={setMfaEnabled} />
      </div>

      {/* Methods */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Allowed MFA Methods</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MFAMethodCard name="TOTP" desc="Google Authenticator, Authy etc." checked recommended />
          <MFAMethodCard name="SMS OTP" desc="One-time password via SMS" checked />
          <MFAMethodCard name="Email OTP" desc="OTP sent to registered email" checked={false} />
        </div>
      </div>

      {/* Trusted Device */}
      <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Trusted Device Duration</h3>
        <PolicyRow label="Remember device for" right={<span className="text-sm font-mono text-cyan-400">7 days</span>} />
        <PolicyRow label="Max trusted devices per user" right={<span className="text-sm font-mono text-cyan-400">3</span>} />
      </div>

      {/* Enrollment status */}
      <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-white mb-3">Enforcement Status</h3>
        <p className="text-sm text-slate-300">
          <span className="font-mono text-emerald-400 font-bold">187</span> users enrolled · <span className="font-mono text-emerald-400">0</span> pending
        </p>
        <div className="w-full h-2 rounded-full bg-slate-700 mt-3 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: "100%" }} />
        </div>
      </div>
    </div>
  );
}

function MFAMethodCard({ name, desc, checked, recommended }: {
  name: string; desc: string; checked: boolean; recommended?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border p-4",
      checked ? "bg-[#1E3A5F] border-slate-700" : "bg-slate-800/40 border-slate-700/50 opacity-60"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">{name}</span>
        {recommended && <span className="text-[10px] bg-cyan-900/60 text-cyan-400 px-2 py-0.5 rounded-full">Recommended</span>}
      </div>
      <p className="text-xs text-slate-400">{desc}</p>
      <div className="mt-3 flex items-center gap-2">
        <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center",
          checked ? "border-emerald-400 bg-emerald-400" : "border-slate-600"
        )}>
          {checked && <span className="text-[10px] text-white">✓</span>}
        </div>
        <span className="text-xs text-slate-400">{checked ? "Enabled" : "Disabled"}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// PANEL 5: IP Whitelist
// ══════════════════════════════════════════════════════
function IPWhitelistPanel() {
  const [enabled, setEnabled] = useState(true);

  // [JWT] Replace with real IP whitelist data from API
  const ips = [
    { ip: "103.24.108.0/24", label: "Mumbai Office", addedBy: "superadmin", date: "01 Jan 2026" },
    { ip: "49.36.0.0/16", label: "Hyderabad DC", addedBy: "superadmin", date: "01 Jan 2026" },
    { ip: "202.88.128.0/20", label: "Delhi HQ", addedBy: "admin@4d", date: "15 Feb 2026" },
    { ip: "127.0.0.1", label: "Localhost Dev", addedBy: "system", date: "01 Jan 2026" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className={cn("rounded-xl border p-5 flex items-center justify-between",
        enabled ? "bg-emerald-900/20 border-emerald-700/40" : "bg-[#1E3A5F] border-slate-700"
      )}>
        <div>
          <h3 className="text-sm font-semibold text-white">IP Whitelist Enabled</h3>
          <p className="text-xs text-slate-400 mt-0.5">Only requests from listed IP addresses will be permitted.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Whitelisted IPs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs text-slate-400">
                <th className="text-left py-2 font-medium">IP Address</th>
                <th className="text-left py-2 font-medium">Label</th>
                <th className="text-left py-2 font-medium">Added By</th>
                <th className="text-left py-2 font-medium">Added On</th>
                <th className="text-right py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ips.map(r => (
                <tr key={r.ip} className="border-b border-slate-700/50">
                  <td className="py-3 font-mono text-xs text-cyan-400">{r.ip}</td>
                  <td className="py-3 text-sm text-white">{r.label}</td>
                  <td className="py-3 text-xs text-slate-400 font-mono">{r.addedBy}</td>
                  <td className="py-3 text-xs text-slate-400 font-mono">{r.date}</td>
                  <td className="py-3 text-right">
                    <button onClick={() => toast("IP removed")} className="text-slate-500 hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 mt-4">
          <Input placeholder="e.g. 192.168.1.0/24" className="flex-1 h-8 text-xs bg-slate-800 border-slate-600 text-white font-mono placeholder:text-slate-500"  onKeyDown={onEnterNext} />
          <Input placeholder="e.g. Office Network" className="flex-1 h-8 text-xs bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"  onKeyDown={onEnterNext} />
          <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-white h-8">Add</Button>
        </div>
      </div>

      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-amber-400">3 blocked requests from unlisted IPs</span>
          <p className="text-xs text-slate-400 mt-0.5">Violations in last 24 hours</p>
        </div>
        <button className="text-xs text-cyan-400 hover:underline" onClick={() => toast("Opening violation log...")}>View Log</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// PANEL 6: Audit Log
// ══════════════════════════════════════════════════════
function AuditLogPanel() {
  // [JWT] Replace with real audit data — CERT-In compliant, read-only
  const logs = [
    { id: "AUD-4821", time: "04 Apr 2026, 14:32 IST", actor: "superadmin", action: "MFA Enabled", target: "admin@acmeindia.in", category: "Security", severity: "info" },
    { id: "AUD-4820", time: "04 Apr 2026, 14:14 IST", actor: "superadmin", action: "Tenant Provisioned", target: "Bharat Traders Pvt Ltd", category: "Tenant", severity: "info" },
    { id: "AUD-4819", time: "04 Apr 2026, 13:31 IST", actor: "admin@4d", action: "User Invited", target: "priya.sharma@acmeindia.in", category: "User", severity: "info" },
    { id: "AUD-4818", time: "04 Apr 2026, 13:00 IST", actor: "system", action: "IP Whitelist Updated", target: "3 IPs added", category: "Security", severity: "warning" },
    { id: "AUD-4817", time: "04 Apr 2026, 12:00 IST", actor: "system", action: "Failed Login Blocked", target: "unknown@hacker.xyz", category: "Security", severity: "critical" },
    { id: "AUD-4816", time: "04 Apr 2026, 10:45 IST", actor: "superadmin", action: "Billing Invoice Generated", target: "INV-2026-047 — ₹18,500", category: "Billing", severity: "info" },
    { id: "AUD-4815", time: "04 Apr 2026, 08:12 IST", actor: "system", action: "Bridge Agent Deployed", target: "v2.4.1 — all agents", category: "System", severity: "info" },
    { id: "AUD-4814", time: "03 Apr 2026, 22:30 IST", actor: "superadmin", action: "Audit Log Exported", target: "2,847 events", category: "Audit", severity: "info" },
  ];

  const sevColor: Record<string, string> = {
    info: "bg-emerald-900/40 text-emerald-400",
    warning: "bg-amber-900/40 text-amber-400",
    critical: "bg-red-900/40 text-red-400",
  };

  const catColor: Record<string, string> = {
    Security: "text-red-400",
    Tenant: "text-cyan-400",
    User: "text-purple-400",
    Billing: "text-amber-400",
    System: "text-emerald-400",
    Audit: "text-slate-400",
  };

  return (
    <div className="space-y-4">
      {/* CERT-In banner */}
      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-3 flex items-center gap-2">
        <Shield className="h-4 w-4 text-amber-400 shrink-0" />
        <span className="text-xs text-amber-400">CERT-In Compliant — 7-year retention · Read-only · No edit or delete permitted</span>
      </div>

      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <Input placeholder="Search audit logs..." className="pl-8 h-9 text-xs bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"  onKeyDown={onEnterNext} />
        </div>
        <Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 h-9">
          <Download className="h-3 w-3 mr-1" /> Export
        </Button>
      </div>

      <div className="bg-[#1E3A5F] rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-xs text-slate-400">
              <th className="text-left p-3 font-medium">Log ID</th>
              <th className="text-left p-3 font-medium">Timestamp</th>
              <th className="text-left p-3 font-medium">Actor</th>
              <th className="text-left p-3 font-medium">Action</th>
              <th className="text-left p-3 font-medium">Target</th>
              <th className="text-left p-3 font-medium">Category</th>
              <th className="text-left p-3 font-medium">Severity</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                <td className="p-3 font-mono text-xs text-cyan-400">{log.id}</td>
                <td className="p-3 font-mono text-[11px] text-slate-400">{log.time}</td>
                <td className="p-3 text-xs text-slate-300 font-mono">{log.actor}</td>
                <td className="p-3 text-xs text-white font-medium">{log.action}</td>
                <td className="p-3 text-xs text-slate-400 truncate max-w-[180px]">{log.target}</td>
                <td className="p-3"><span className={cn("text-[10px] font-bold uppercase", catColor[log.category])}>{log.category}</span></td>
                <td className="p-3"><span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", sevColor[log.severity])}>{log.severity}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
