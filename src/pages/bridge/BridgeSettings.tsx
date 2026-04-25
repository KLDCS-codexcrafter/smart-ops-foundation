import { useState } from "react";
import { toast } from "sonner";
import {
  Server, RefreshCw, Plug, Bell, RotateCcw,
  Shield, Info, Eye, EyeOff, Download, Loader2,
} from "lucide-react";
import { BridgeLayout } from "@/components/layout/BridgeLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { onEnterNext } from '@/lib/keyboard';

// ─── [JWT] BRIDGE TIER SCOPING ────────────────────────────────────────────
// Replace this mock data with a real fetch scoped by JWT tier:
//   Tier 1 (4DSO Dev/IT Team):  GET /api/bridge/settings              → full fleet, all clients
//   Tier 2 (Partner IT Team):   GET /api/bridge/settings?partnerId={jwt.partnerId}  → their clients only
//   Tier 3 (Customer IT Admin): GET /api/bridge/settings?tenantId={jwt.tenantId}    → own company only
// JWT payload shape: { userId, role, tier: 1|2|3, partnerId?: string, tenantId?: string }
// ─────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "agent", label: "Agent Config", icon: Server },
  { id: "sync", label: "Sync Defaults", icon: RefreshCw },
  { id: "connection", label: "Connection", icon: Plug },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "retry", label: "Retry Policy", icon: RotateCcw },
  { id: "security", label: "Security", icon: Shield },
  { id: "about", label: "About", icon: Info },
] as const;

export default function BridgeSettings() {
  const [section, setSection] = useState("agent");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);

  // Notification switches
  const [agentOffline, setAgentOffline] = useState(true);
  const [slaBreach, setSlaBreach] = useState(true);
  const [syncFailure, setSyncFailure] = useState(true);
  const [exceptionSpike, setExceptionSpike] = useState(false);

  // Sync defaults
  

  // Connection
  const [odbcFallback, setOdbcFallback] = useState(true);

  // Schedule export switch
  const [_scheduleSwitch, _setScheduleSwitch] = useState(false);

  const testConnections = () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      toast.success("All connections healthy");
    }, 2000);
  };

  return (
    <BridgeLayout title="Bridge Settings" subtitle="Agent configuration and sync preferences"><div data-keyboard-form>
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <nav className="space-y-0.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={cn(
                  "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm transition-colors",
                  section === s.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <s.icon className="h-4 w-4 shrink-0" />
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Agent Config */}
          {section === "agent" && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">Agent Configuration</h2>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Agent Registration Key</label>
                <div className="relative">
                  <Input type={showKey ? "text" : "password"} className="font-mono pr-10" defaultValue="4dso-agent-key-xxxx-xxxx-xxxx" onKeyDown={onEnterNext} />
                  <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2">
                    {showKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Used by Bridge Agent .exe to authenticate with platform</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Heartbeat Interval</label>
                  <Select defaultValue="30s">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15s">15 seconds</SelectItem>
                      <SelectItem value="30s">30 seconds</SelectItem>
                      <SelectItem value="60s">60 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Max Concurrent Syncs</label>
                  <Input type="number" defaultValue={3} onKeyDown={onEnterNext} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Agent Log Level</label>
                  <Select defaultValue="info">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debug">DEBUG</SelectItem>
                      <SelectItem value="info">INFO</SelectItem>
                      <SelectItem value="warn">WARN</SelectItem>
                      <SelectItem value="error">ERROR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Log Retention</label>
                  <Select defaultValue="30d">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">7 days</SelectItem>
                      <SelectItem value="30d">30 days</SelectItem>
                      <SelectItem value="90d">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button data-primary className="bg-gradient-to-r from-primary to-primary/80" onClick={() => toast.success("Agent config saved")}>
                Save Agent Config
              </Button>
            </div>
          )}

          {/* Sync Defaults */}
          {section === "sync" && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-5">
              <h2 className="text-sm font-semibold text-foreground">Sync Policy</h2>
              <p className="text-xs text-muted-foreground -mt-3">
                Pulled by the agent on every heartbeat. Changes take effect on next sync cycle.
              </p>

              {/* Schedule */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Schedule</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Sync Interval</label>
                    <Select defaultValue="30m">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5m">Every 5 minutes</SelectItem>
                        <SelectItem value="15m">Every 15 minutes</SelectItem>
                        <SelectItem value="30m">Every 30 minutes</SelectItem>
                        <SelectItem value="1h">Every 1 hour</SelectItem>
                        <SelectItem value="manual">Manual only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Overlap Window</label>
                    <Select defaultValue="6h">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">1 hour</SelectItem>
                        <SelectItem value="6h">6 hours</SelectItem>
                        <SelectItem value="24h">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">Re-checks this window on every delta sync</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Quiet Hours — From</label>
                    <Input type="time" defaultValue="23:00" className="font-mono" onKeyDown={onEnterNext} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Quiet Hours — To</label>
                    <Input type="time" defaultValue="06:00" className="font-mono" onKeyDown={onEnterNext} />
                    <p className="text-[10px] text-muted-foreground mt-1">No syncs start during this window</p>
                  </div>
                </div>
              </div>

              {/* Extraction */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Extraction</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Batch Size Profile</label>
                    <Select defaultValue="standard">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small — 500 records/batch</SelectItem>
                        <SelectItem value="standard">Standard — 2,000 records/batch</SelectItem>
                        <SelectItem value="large">Large — 5,000 records/batch</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Financial Year Scope</label>
                    <Select defaultValue="2fy">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current FY only</SelectItem>
                        <SelectItem value="2fy">Last 2 financial years</SelectItem>
                        <SelectItem value="3fy">Last 3 financial years</SelectItem>
                        <SelectItem value="custom">Custom from date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Failure & Retry */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Failure &amp; Retry</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Retry Limit</label>
                    <Input type="number" defaultValue={5} min={0} max={20} onKeyDown={onEnterNext} />
                    <p className="text-[10px] text-muted-foreground mt-1">0 = no auto-retry. Max 20.</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Offline Behaviour</label>
                    <Select defaultValue="queue_auto">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="queue_auto">Queue locally and auto-resume</SelectItem>
                        <SelectItem value="queue_approval">Queue and wait for approval</SelectItem>
                        <SelectItem value="pause">Pause extraction until online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Module Inclusion */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Module Inclusion</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: "company", label: "Company", on: true },
                    { key: "ledgers", label: "Ledgers", on: true },
                    { key: "stock", label: "Stock", on: true },
                    { key: "vouchers", label: "Vouchers", on: true },
                    { key: "tax", label: "GST/Tax", on: true },
                    { key: "balances", label: "Balances", on: true },
                    { key: "payroll", label: "Payroll", on: false },
                    { key: "audit", label: "Audit Meta", on: false },
                  ].map((m) => (
                    <div key={m.key} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40">
                      <span className="text-xs text-foreground">{m.label}</span>
                      <Switch defaultChecked={m.on} />
                    </div>
                  ))}
                </div>
              </div>

              <Button data-primary className="bg-gradient-to-r from-primary to-primary/80" onClick={() => toast.success("Sync policy saved — agent applies on next heartbeat")}>
                Save Sync Policy
              </Button>
            </div>
          )}

          {/* Connection */}
          {section === "connection" && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">Connection Settings</h2>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Tally HTTP Port</label>
                <Input type="number" className="font-mono" defaultValue={9000} onKeyDown={onEnterNext} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Connection Timeout</label>
                <Select defaultValue="30s">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10s">10 seconds</SelectItem>
                    <SelectItem value="30s">30 seconds</SelectItem>
                    <SelectItem value="60s">60 seconds</SelectItem>
                    <SelectItem value="120s">120 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-foreground">ODBC Fallback</label>
                  <p className="text-[10px] text-muted-foreground">Falls back to ODBC if JSON HTTP fails</p>
                </div>
                <Switch checked={odbcFallback} onCheckedChange={setOdbcFallback} />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">File Watch Path</label>
                <Input className="font-mono" defaultValue="C:\Tally\Export\" onKeyDown={onEnterNext} />
                <p className="text-[10px] text-muted-foreground mt-1">Folder path Tally exports JSON files to</p>
              </div>

              <Button variant="outline" onClick={testConnections} disabled={testing}>
                {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Test All Connections
              </Button>
            </div>
          )}

          {/* Notifications */}
          {section === "notifications" && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">Alert Notifications</h2>

              {[
                { label: "Agent offline alert", checked: agentOffline, set: setAgentOffline },
                { label: "SLA breach alert", checked: slaBreach, set: setSlaBreach },
                { label: "Sync failure alert", checked: syncFailure, set: setSyncFailure },
                { label: "Exception spike alert", checked: exceptionSpike, set: setExceptionSpike },
              ].map((n) => (
                <div key={n.label} className="flex items-center justify-between">
                  <label className="text-sm text-foreground">{n.label}</label>
                  <Switch checked={n.checked} onCheckedChange={n.set} />
                </div>
              ))}

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Alert Email</label>
                <Input type="email" defaultValue="ops@4dsmartops.in" onKeyDown={onEnterNext} />
              </div>

              <Button data-primary className="bg-gradient-to-r from-primary to-primary/80" onClick={() => toast.success("Notification settings saved")}>
                Save Notifications
              </Button>
            </div>
          )}

          {/* Retry Policy */}
          {section === "retry" && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">Retry Policy</h2>

              {[
                { type: "Timeout", retries: "5 retries", delay: "1 minute" },
                { type: "Connection Lost", retries: "3 retries", delay: "5 minutes" },
                { type: "Tally Rejection", retries: "1 retry", delay: "Manual review after" },
                { type: "Validation Error", retries: "0 retries", delay: "Skip to Exception Workbench" },
              ].map((p) => (
                <div key={p.type} className="bg-muted/30 border border-border rounded-lg p-4">
                  <p className="text-sm font-medium text-foreground">{p.type}</p>
                  <div className="flex gap-6 mt-2">
                    <span className="text-xs text-muted-foreground">Max: <span className="font-mono text-foreground">{p.retries}</span></span>
                    <span className="text-xs text-muted-foreground">Delay: <span className="font-mono text-foreground">{p.delay}</span></span>
                  </div>
                </div>
              ))}

              <p className="text-xs text-muted-foreground">Retry policies are fixed in v1. Customisation coming in v2.</p>
            </div>
          )}

          {/* Security */}
          {section === "security" && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">Security</h2>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-foreground">Encrypt Agent Traffic</label>
                  <p className="text-[10px] text-muted-foreground">TLS 1.3 enforced. Non-configurable.</p>
                </div>
                <Switch checked disabled />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">API Key Rotation Interval</label>
                <Select defaultValue="90d">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="60d">60 days</SelectItem>
                    <SelectItem value="90d">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">IP Whitelist for Agent</label>
                <Textarea className="font-mono" placeholder={"192.168.1.0/24\n10.0.0.0/8"} rows={3} />
                <p className="text-[10px] text-muted-foreground mt-1">One CIDR range per line. Leave blank to allow all.</p>
              </div>

              <Button data-primary className="bg-gradient-to-r from-primary to-primary/80" onClick={() => toast.success("Security settings saved")}>
                Save Security
              </Button>
            </div>
          )}

          {/* About */}
          {section === "about" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Bridge Agent Version", value: "v1.0.4", color: "text-primary" },
                  { label: "Console Version", value: "v0.1.0", color: "text-accent-foreground" },
                  { label: "Protocol", value: "JSON HTTP + ODBC", color: "text-foreground" },
                  { label: "Tally Support", value: "Prime 7.x", color: "text-success" },
                ].map((info) => (
                  <div key={info.label} className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground">{info.label}</p>
                    <p className={cn("font-mono text-lg font-semibold mt-1", info.color)}>{info.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-3">System Status</p>
                <div className="flex items-center gap-6">
                  {["API Connected", "Agent Protocol Active", "Heartbeat OK"].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      <span className="text-xs text-foreground">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={() => toast("Download coming soon — contact support@4dsmartops.in")}>
                <Download className="h-4 w-4 mr-2" />
                Download Bridge Agent .exe
              </Button>
            </div>
          )}
        </div>
      </div>
    </div></BridgeLayout>
  );
}
