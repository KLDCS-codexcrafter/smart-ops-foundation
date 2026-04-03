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
  const [autoRetry, setAutoRetry] = useState(true);

  // Connection
  const [odbcFallback, setOdbcFallback] = useState(true);

  // Schedule export switch
  const [scheduleSwitch, setScheduleSwitch] = useState(false);

  const testConnections = () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      toast.success("All connections healthy");
    }, 2000);
  };

  return (
    <BridgeLayout title="Bridge Settings" subtitle="Agent configuration and sync preferences">
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
                  <Input type={showKey ? "text" : "password"} className="font-mono pr-10" defaultValue="4dso-agent-key-xxxx-xxxx-xxxx" />
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
                  <Input type="number" defaultValue={3} />
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

              <Button className="bg-gradient-to-r from-primary to-primary/80" onClick={() => toast.success("Agent config saved")}>
                Save Agent Config
              </Button>
            </div>
          )}

          {/* Sync Defaults */}
          {section === "sync" && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">Sync Defaults</h2>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Default Sync Mode</label>
                <Select defaultValue="json_http">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="json_http">JSON HTTP (Primary)</SelectItem>
                    <SelectItem value="odbc">ODBC</SelectItem>
                    <SelectItem value="file_watch">File Watch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground">Auto-Retry on Failure</label>
                <Switch checked={autoRetry} onCheckedChange={setAutoRetry} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Max Retry Attempts</label>
                  <Input type="number" defaultValue={3} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Retry Delay</label>
                  <Select defaultValue="1m">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30s">30 seconds</SelectItem>
                      <SelectItem value="1m">1 minute</SelectItem>
                      <SelectItem value="5m">5 minutes</SelectItem>
                      <SelectItem value="15m">15 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Auto-Approve Below Records</label>
                <Input type="number" className="font-mono" defaultValue={500} />
                <p className="text-[10px] text-muted-foreground mt-1">Requests below this count are auto-approved</p>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Batch Size</label>
                <Input type="number" className="font-mono" defaultValue={1000} />
                <p className="text-[10px] text-muted-foreground mt-1">Records per sync batch sent to Tally</p>
              </div>

              <Button className="bg-gradient-to-r from-primary to-primary/80" onClick={() => toast.success("Sync defaults saved")}>
                Save Sync Defaults
              </Button>
            </div>
          )}

          {/* Connection */}
          {section === "connection" && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-foreground mb-2">Connection Settings</h2>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Tally HTTP Port</label>
                <Input type="number" className="font-mono" defaultValue={9000} />
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
                <Input className="font-mono" defaultValue="C:\Tally\Export\" />
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
                <Input type="email" defaultValue="ops@4dsmartops.in" />
              </div>

              <Button className="bg-gradient-to-r from-primary to-primary/80" onClick={() => toast.success("Notification settings saved")}>
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

              <Button className="bg-gradient-to-r from-primary to-primary/80" onClick={() => toast.success("Security settings saved")}>
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
    </BridgeLayout>
  );
}
