import { useState } from "react";
import { toast } from "sonner";
import {
  Globe, Mail, Shield, IndianRupee, Bell,
  Wrench, Info, ShieldCheck, FileText, Loader2, Eye, EyeOff,
  Database, RefreshCw, Trash2,
} from "lucide-react";
import { TowerLayout } from "@/components/layout/TowerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { onEnterNext } from '@/lib/keyboard';

const TABS = [
  { key: "general", label: "General", icon: Globe },
  { key: "email", label: "Email & SMTP", icon: Mail },
  { key: "security", label: "Security Defaults", icon: Shield },
  { key: "billing", label: "Proforma Invoice Config", icon: IndianRupee },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "system", label: "System Info", icon: Info },
] as const;

const TowerSettings = () => {
  const [activeSection, setActiveSection] = useState("general");
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  // General
  const [platformName, setPlatformName] = useState("4DSmartOps");
  const [supportEmail, setSupportEmail] = useState("support@4dsmartops.in");
  const [dateFormat, setDateFormat] = useState("DD MMM YYYY");
  const [language, setLanguage] = useState("English");

  // Email
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("noreply@4dsmartops.in");
  const [smtpPassword, setSmtpPassword] = useState("supersecret123");
  const [fromName, setFromName] = useState("4DSmartOps Platform");
  const [fromEmail, setFromEmail] = useState("noreply@4dsmartops.in");
  const [replyTo, setReplyTo] = useState("support@4dsmartops.in");

  // Security
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [requireUppercase, setRequireUppercase] = useState(true);
  const [requireNumber, setRequireNumber] = useState(true);
  const [requireSpecial, setRequireSpecial] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [maxSessions, setMaxSessions] = useState(3);
  const [failedAttempts, setFailedAttempts] = useState(5);
  const [lockoutDuration, setLockoutDuration] = useState("15");
  const [mfaPolicy, setMfaPolicy] = useState("admins");

  // Billing
  const [invoicePrefix, setInvoicePrefix] = useState("INV");
  const [invoiceStart, setInvoiceStart] = useState(1001);
  const [dueDays, setDueDays] = useState(7);
  const [gstNumber, setGstNumber] = useState("");
  const [taxRate, setTaxRate] = useState(18);
  const [hsnCode, setHsnCode] = useState("998314");
  const [paymentMethods, setPaymentMethods] = useState({
    neft: true, imps: true, upi: true, razorpay: true, cheque: false,
  });

  // Notifications
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [notifyEvents, setNotifyEvents] = useState({
    newTenant: true, paymentReceived: true, paymentFailed: true,
    trialExpiring: true, userSuspended: true, securityAlert: true,
    maintenance: true, impersonation: true,
  });
  const [dailyDigest, setDailyDigest] = useState(true);
  const [digestTime, setDigestTime] = useState("8:00 AM IST");

  // Maintenance
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState("");
  const [maintenanceEnd, setMaintenanceEnd] = useState("");

  const handleSave = (section: string) => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success(`${section} settings saved`);
    }, 1000);
  };

  const handleTestSmtp = () => {
    setTestingSmtp(true);
    setTimeout(() => {
      setTestingSmtp(false);
      toast.success("SMTP connection successful");
    }, 1500);
  };

  const togglePayment = (key: keyof typeof paymentMethods) => {
    setPaymentMethods((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleNotifyEvent = (key: keyof typeof notifyEvents) => {
    setNotifyEvents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ─── SECTIONS ─── */

  const GeneralSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">General Settings</h2>
        <p className="text-xs text-muted-foreground mt-1">Basic platform configuration</p>
      </div>
      <div className="space-y-4">
        <Field label="Platform Name">
          <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
        </Field>
        <Field label="Support Email">
          <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
        </Field>
        <Field label="Timezone">
          <Select value="Asia/Kolkata" disabled>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem></SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">All timestamps are displayed in IST. Non-configurable in v1.</p>
        </Field>
        <Field label="Date Format">
          <Select value={dateFormat} onValueChange={setDateFormat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DD MMM YYYY">DD MMM YYYY</SelectItem>
              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Currency">
          <Select value="INR" disabled>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="INR">INR — Indian Rupee</SelectItem></SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Currency is locked to INR for this platform.</p>
        </Field>
        <Field label="Default Language">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["English", "Hindi", "Tamil", "Telugu", "Kannada", "Gujarati", "Marathi", "Bengali"].map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Button onClick={() => handleSave("General")} disabled={saving} style={{ background: "var(--gradient-primary)" }}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save General Settings
      </Button>
    </div>
  );

  const EmailSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Email & SMTP</h2>
        <p className="text-xs text-muted-foreground mt-1">Configure outbound email delivery</p>
      </div>
      <div className="space-y-4">
        <Field label="SMTP Host">
          <Input className="font-mono" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
        </Field>
        <Field label="SMTP Port">
          <Input type="number" className="font-mono" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" />
        </Field>
        <Field label="SMTP Username">
          <Input className="font-mono" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
        </Field>
        <Field label="SMTP Password">
          <div className="relative">
            <Input type={showSmtpPassword ? "text" : "password"} className="font-mono pr-10" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowSmtpPassword(!showSmtpPassword)}>
              {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        <Field label="From Name">
          <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
        </Field>
        <Field label="From Email">
          <Input type="email" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} />
        </Field>
        <Field label="Reply-To Email">
          <Input type="email" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={handleTestSmtp} disabled={testingSmtp}>
          {testingSmtp && <Loader2 className="h-4 w-4 animate-spin" />} Test Connection
        </Button>
        <Button onClick={() => handleSave("Email")} disabled={saving} style={{ background: "var(--gradient-primary)" }}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Email Settings
        </Button>
      </div>
    </div>
  );

  const SecuritySection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Security Defaults</h2>
        <p className="text-xs text-muted-foreground mt-1">Platform-level defaults — tenants can override</p>
      </div>

      <PolicyGroup label="Password Policy">
        <Field label="Minimum length">
          <Input type="number" min={6} max={32} value={minPasswordLength} onChange={(e) => setMinPasswordLength(Number(e.target.value))} className="w-24" />
        </Field>
        <SwitchRow label="Require uppercase" checked={requireUppercase} onChange={setRequireUppercase} />
        <SwitchRow label="Require number" checked={requireNumber} onChange={setRequireNumber} />
        <SwitchRow label="Require special character" checked={requireSpecial} onChange={setRequireSpecial} />
      </PolicyGroup>

      <PolicyGroup label="Session Policy">
        <Field label="Session timeout">
          <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="240">4 hours</SelectItem>
              <SelectItem value="480">8 hours</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Max concurrent sessions">
          <Input type="number" value={maxSessions} onChange={(e) => setMaxSessions(Number(e.target.value))} className="w-24" />
        </Field>
      </PolicyGroup>

      <PolicyGroup label="Lockout Policy">
        <Field label="Failed attempts before lockout">
          <Input type="number" value={failedAttempts} onChange={(e) => setFailedAttempts(Number(e.target.value))} className="w-24" />
        </Field>
        <Field label="Lockout duration">
          <Select value={lockoutDuration} onValueChange={setLockoutDuration}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">30 seconds</SelectItem>
              <SelectItem value="5">5 minutes</SelectItem>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </PolicyGroup>

      <PolicyGroup label="MFA">
        <Field label="Default MFA policy">
          <Select value={mfaPolicy} onValueChange={setMfaPolicy}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="optional">Optional</SelectItem>
              <SelectItem value="admins">Required for Admins</SelectItem>
              <SelectItem value="all">Required for All</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </PolicyGroup>

      <Button onClick={() => handleSave("Security Defaults")} disabled={saving} style={{ background: "var(--gradient-primary)" }}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Security Defaults
      </Button>
    </div>
  );

  const BillingSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Proforma Invoice Config</h2>
        <p className="text-xs text-muted-foreground mt-1">Invoice, tax and payment settings</p>
      </div>

      <PolicyGroup label="Invoice Settings">
        <Field label="Invoice prefix">
          <Input className="font-mono w-32" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} />
        </Field>
        <Field label="Invoice number start">
          <Input type="number" className="font-mono w-32" value={invoiceStart} onChange={(e) => setInvoiceStart(Number(e.target.value))} />
        </Field>
        <Field label="Due days">
          <Input type="number" className="w-24" value={dueDays} onChange={(e) => setDueDays(Number(e.target.value))} />
          <p className="text-xs text-muted-foreground mt-1">Invoices are due {dueDays} days after generation</p>
        </Field>
      </PolicyGroup>

      <PolicyGroup label="Tax Settings">
        <Field label="GST Registration Number">
          <Input className="font-mono uppercase" placeholder="27AABCR1234M1ZX" maxLength={15} value={gstNumber} onChange={(e) => setGstNumber(e.target.value.toUpperCase())} />
        </Field>
        <Field label="Tax rate (%)">
          <Input type="number" className="w-24" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
          <p className="text-xs text-muted-foreground mt-1">Applied as GST on platform service fees</p>
        </Field>
        <Field label="HSN/SAC Code">
          <Input className="font-mono" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">SAC code for IT software services</p>
        </Field>
      </PolicyGroup>

      <PolicyGroup label="Accepted Payment Methods">
        <div className="flex gap-4 flex-wrap">
          {(["neft", "imps", "upi", "razorpay", "cheque"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm">
              <Checkbox checked={paymentMethods[m]} onCheckedChange={() => togglePayment(m)} />
              {m.toUpperCase()}
            </label>
          ))}
        </div>
      </PolicyGroup>

      <PolicyGroup label="Bank Account for Receipt">
        <Field label="Account Name">
          <Input value="4DSmartOps Pvt Ltd" readOnly  onKeyDown={onEnterNext} />
        </Field>
        <Field label="Account Number">
          <Input className="font-mono" value="••••••4521" readOnly  onKeyDown={onEnterNext} />
        </Field>
        <Field label="IFSC Code">
          <Input className="font-mono uppercase" value="HDFC0001234" readOnly  onKeyDown={onEnterNext} />
        </Field>
        <Field label="Bank Name">
          <Input value="HDFC Bank" readOnly  onKeyDown={onEnterNext} />
        </Field>
      </PolicyGroup>

      <Button onClick={() => handleSave("Proforma Invoice Config")} disabled={saving} style={{ background: "var(--gradient-primary)" }}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Proforma Invoice Config
      </Button>
    </div>
  );

  const NotificationsSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        <p className="text-xs text-muted-foreground mt-1">Default channel preferences</p>
      </div>

      <div className="space-y-4">
        <SwitchRow label="Email Notifications" description="All platform events trigger email notifications by default" checked={emailEnabled} onChange={setEmailEnabled} />
        <Separator />
        <SwitchRow label="In-App Notifications" description="Shown in the notification bell for all users" checked={inAppEnabled} onChange={setInAppEnabled} />
        <Separator />
        <SwitchRow label="SMS Notifications" description="SMS via approved DLT template — additional costs apply" checked={smsEnabled} onChange={setSmsEnabled} />
      </div>

      <PolicyGroup label="Notify me when">
        <div className="space-y-3">
          {([
            ["newTenant", "New tenant provisioned"],
            ["paymentReceived", "Payment received"],
            ["paymentFailed", "Payment failed"],
            ["trialExpiring", "Trial expiring (≤ 5 days)"],
            ["userSuspended", "User suspended"],
            ["securityAlert", "Security alert (critical)"],
            ["maintenance", "System maintenance"],
            ["impersonation", "Impersonation session started"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <Checkbox checked={notifyEvents[key]} onCheckedChange={() => toggleNotifyEvent(key)} />
              {label}
            </label>
          ))}
        </div>
      </PolicyGroup>

      <PolicyGroup label="Digest Settings">
        <SwitchRow label="Daily digest email" checked={dailyDigest} onChange={setDailyDigest} />
        <Field label="Digest time">
          <Select value={digestTime} onValueChange={setDigestTime}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="8:00 AM IST">8:00 AM IST</SelectItem>
              <SelectItem value="6:00 PM IST">6:00 PM IST</SelectItem>
              <SelectItem value="9:00 PM IST">9:00 PM IST</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </PolicyGroup>

      <Button onClick={() => handleSave("Notification")} disabled={saving} style={{ background: "var(--gradient-primary)" }}>
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Notification Settings
      </Button>
    </div>
  );

  const MaintenanceSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Maintenance</h2>
        <p className="text-xs text-muted-foreground mt-1">Control platform availability</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-foreground">Maintenance Mode</span>
          <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          When enabled, all tenant access is suspended and users see a maintenance page. Super admins retain access.
        </p>
        {!maintenanceMode ? (
          <span className="inline-block mt-3 bg-success/10 text-success px-3 py-1 rounded-full text-xs">
            Platform is live and accepting connections
          </span>
        ) : (
          <div className="mt-4 space-y-4">
            <span className="inline-block bg-destructive/10 text-destructive px-3 py-1 rounded-full text-xs font-medium">
              MAINTENANCE MODE ACTIVE — Tenants cannot access the platform
            </span>
            <Field label="Maintenance Message">
              <Textarea
                value={maintenanceMsg}
                onChange={(e) => setMaintenanceMsg(e.target.value)}
                placeholder="We are currently performing scheduled maintenance. Expected completion: [time]. We apologize for any inconvenience."
                rows={3}
              />
            </Field>
            <Field label="Estimated completion">
              <Input type="datetime-local" value={maintenanceEnd} onChange={(e) => setMaintenanceEnd(e.target.value)} />
            </Field>
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => toast.warning("Maintenance mode enabled — all tenant access suspended")}>
              Confirm Enable
            </Button>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Upcoming Scheduled Windows</h3>
        <div className="flex items-start justify-between p-3 bg-muted/20 rounded-lg">
          <div>
            <p className="text-sm font-medium text-foreground">05 Jul 2026, 2:00 AM – 2:30 AM IST</p>
            <p className="text-xs text-muted-foreground mt-0.5">Database schema migration</p>
          </div>
          <span className="bg-primary/10 text-primary border border-primary/20 text-xs px-2 py-0.5 rounded-full">Scheduled</span>
        </div>
        <Button variant="outline" className="mt-3" onClick={() => toast("Scheduling coming soon")}>Schedule New Window</Button>
      </div>
    </div>
  );

  const SystemSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">System Info</h2>
        <p className="text-xs text-muted-foreground mt-1">Read-only platform information</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Platform Version" value="v0.1.0" sub="Build 2026.04.03" valueClass="text-primary" mono />
        <InfoCard label="Environment" value="Production" sub="India Region (Mumbai)" valueClass="text-success" />
        <InfoCard label="Database" value="PostgreSQL 15.4" sub="Uptime: 47 days" valueClass="text-foreground" mono small />
        <InfoCard label="API Version" value="v1.0" sub="REST + WebSocket" valueClass="text-accent" mono />
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">System Health</h3>
        <div className="flex gap-6">
          <HealthDot label="API Status" status="Operational" />
          <HealthDot label="Database" status="Healthy" />
          <HealthDot label="Bridge Agent" status="89 online" />
        </div>
      </div>

      <div className="bg-muted/20 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Compliance & Certifications</h3>
        <div className="flex gap-3">
          <span className="inline-flex items-center gap-1.5 bg-success/10 border border-success/20 text-success text-xs px-3 py-1.5 rounded-full">
            <ShieldCheck className="h-3.5 w-3.5" /> CERT-In Compliant
          </span>
          <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs px-3 py-1.5 rounded-full">
            <FileText className="h-3.5 w-3.5" /> IT Act 2000
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Audit logs are retained for 7 years. Data residency: India only.</p>
      </div>
    </div>
  );

  const sections: Record<string, JSX.Element> = {
    general: <GeneralSection />,
    email: <EmailSection />,
    security: <SecuritySection />,
    billing: <BillingSection />,
    notifications: <NotificationsSection />,
    maintenance: <MaintenanceSection />,
    system: <SystemSection />,
  };

  return (
    <TowerLayout title="Settings" subtitle="Platform configuration and system preferences"><div data-keyboard-form>
      <div className="flex gap-6">
        {/* Left nav */}
        <div className="w-56 shrink-0 sticky top-0 self-start space-y-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeSection === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-colors text-left",
                  active
                    ? "bg-primary/10 text-primary border-l-2 border-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30 border-l-2 border-transparent"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0 bg-card border border-border rounded-xl p-6">
          {sections[activeSection]}
        </div>
      </div>
    </div></TowerLayout>
  );
};

/* ─── Helpers ─── */

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
    {children}
  </div>
);

const PolicyGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="bg-muted/20 rounded-lg p-4 space-y-3">
    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
    {children}
  </div>
);

const SwitchRow = ({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const InfoCard = ({ label, value, sub, valueClass, mono, small }: { label: string; value: string; sub: string; valueClass: string; mono?: boolean; small?: boolean }) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className={cn(small ? "text-lg" : "text-2xl", "font-bold", valueClass, mono && "font-mono")}>{value}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
  </div>
);

const HealthDot = ({ label, status }: { label: string; status: string }) => (
  <div className="flex items-center gap-2">
    <span className="w-2 h-2 rounded-full bg-success" />
    <span className="text-xs text-muted-foreground">{label}:</span>
    <span className="text-xs text-success font-medium">{status}</span>
  </div>
);

export default TowerSettings;
