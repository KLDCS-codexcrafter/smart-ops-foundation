import { useState } from "react";
import { toast } from "sonner";
import {
  Send, Eye, Calendar, AlertCircle, Plus,
  Mail, Bell, MessageSquare, Search, SearchX,
  Megaphone, IndianRupee, ShieldAlert, Wrench,
  Sparkles, Clock, Users, MoreHorizontal, Loader2,
} from "lucide-react";
import { TowerLayout } from "@/components/layout/TowerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { onEnterNext } from '@/lib/keyboard';

/* ── types ─────────────────────────────────────── */
type NotifChannel = "email" | "in_app" | "sms";
type NotifStatus = "sent" | "scheduled" | "draft" | "failed";
type NotifType =
  | "announcement" | "billing_alert" | "security_alert"
  | "maintenance" | "feature_update" | "trial_expiry";
type NotifAudience = "all_tenants" | "specific_tenants"
  | "trial_only" | "enterprise_only" | "admins_only";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotifType;
  channel: NotifChannel[];
  status: NotifStatus;
  audience: NotifAudience;
  sentTo: number;
  openRate?: number;
  scheduledAt?: string;
  sentAt?: string;
  createdBy: string;
}

/* ── mock data ─────────────────────────────────── */
const NOTIFICATIONS: Notification[] = [
  { id: "NTF-001", title: "Platform Maintenance — 05 Jul 2026 2:00 AM IST", body: "Scheduled maintenance window for database upgrades. Expected downtime: 30 minutes.", type: "maintenance", channel: ["email", "in_app"], status: "sent", audience: "all_tenants", sentTo: 12, openRate: 84, sentAt: "02 Jul 2026 10:00 AM", createdBy: "Platform Admin" },
  { id: "NTF-002", title: "Trial Expiring — Action Required", body: "Your 4DSmartOps trial expires in 3 days. Upgrade now to avoid service interruption.", type: "trial_expiry", channel: ["email", "in_app", "sms"], status: "sent", audience: "trial_only", sentTo: 3, openRate: 100, sentAt: "01 Jul 2026 9:00 AM", createdBy: "Platform Admin" },
  { id: "NTF-003", title: "New Feature: GST e-Invoice Integration", body: "4DSmartOps now supports direct e-Invoice generation and submission to the IRP portal.", type: "feature_update", channel: ["email", "in_app"], status: "sent", audience: "all_tenants", sentTo: 12, openRate: 72, sentAt: "28 Jun 2026 11:00 AM", createdBy: "Product Team" },
  { id: "NTF-004", title: "Security Alert: Multiple Failed Login Attempts", body: "We detected 5+ failed login attempts on your account. Please review your security settings.", type: "security_alert", channel: ["email", "in_app"], status: "sent", audience: "specific_tenants", sentTo: 2, openRate: 100, sentAt: "27 Jun 2026 3:45 PM", createdBy: "Security System" },
  { id: "NTF-005", title: "Invoice Due — July 2026 Subscription", body: "Your July 2026 subscription invoice is due. Please ensure timely payment.", type: "billing_alert", channel: ["email"], status: "sent", audience: "specific_tenants", sentTo: 3, openRate: 67, sentAt: "25 Jun 2026 9:00 AM", createdBy: "Billing System" },
  { id: "NTF-006", title: "Q3 Product Roadmap Update", body: "Exciting updates coming in Q3 2026: Mobile app launch, AI-powered insights, and more.", type: "announcement", channel: ["email", "in_app"], status: "scheduled", audience: "all_tenants", sentTo: 0, scheduledAt: "10 Jul 2026 10:00 AM", createdBy: "Product Team" },
  { id: "NTF-007", title: "Invitation: 4DSmartOps User Webinar", body: "Join us for a live demo of the new ERP modules on 15 Jul 2026 at 3 PM IST.", type: "announcement", channel: ["email"], status: "draft", audience: "all_tenants", sentTo: 0, createdBy: "Platform Admin" },
  { id: "NTF-008", title: "System Alert: Bridge Agent Offline", body: "The Tally Bridge Agent for TNT-008 has been offline for 24 hours. Immediate attention required.", type: "security_alert", channel: ["email", "in_app"], status: "failed", audience: "specific_tenants", sentTo: 0, sentAt: "20 Jun 2026 8:00 AM", createdBy: "System Monitor" },
];

/* ── config ─────────────────────────────────────── */
const TYPE_CONFIG: Record<NotifType, { label: string; color: string; icon: typeof Megaphone }> = {
  announcement:   { label: "Announcement",   color: "bg-primary/10 text-primary border-primary/20",             icon: Megaphone },
  billing_alert:  { label: "Billing Alert",  color: "bg-warning/10 text-warning border-warning/20",             icon: IndianRupee },
  security_alert: { label: "Security Alert", color: "bg-destructive/10 text-destructive border-destructive/20", icon: ShieldAlert },
  maintenance:    { label: "Maintenance",    color: "bg-info/10 text-info border-info/20",                      icon: Wrench },
  feature_update: { label: "Feature Update", color: "bg-accent/10 text-accent border-accent/20",                icon: Sparkles },
  trial_expiry:   { label: "Trial Expiry",   color: "bg-warning/10 text-warning border-warning/20",             icon: Clock },
};

const STATUS_CONFIG: Record<NotifStatus, { label: string; color: string }> = {
  sent:      { label: "Sent",      color: "bg-success/10 text-success border-success/20" },
  scheduled: { label: "Scheduled", color: "bg-primary/10 text-primary border-primary/20" },
  draft:     { label: "Draft",     color: "bg-secondary text-muted-foreground border-border" },
  failed:    { label: "Failed",    color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const CHANNEL_ICONS: Record<NotifChannel, { icon: typeof Mail; label: string }> = {
  email:  { icon: Mail, label: "Email" },
  in_app: { icon: Bell, label: "In-App" },
  sms:    { icon: MessageSquare, label: "SMS" },
};

const AUDIENCE_LABELS: Record<NotifAudience, string> = {
  all_tenants:      "All Tenants",
  specific_tenants: "Specific Tenants",
  trial_only:       "Trial Tenants",
  enterprise_only:  "Enterprise Only",
  admins_only:      "Admins Only",
};

/* ── component ─────────────────────────────────── */
const Notifications = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCompose, setShowCompose] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // compose form
  const [composeForm, setComposeForm] = useState({
    title: "", body: "", type: "", audience: "",
    channels: ["email", "in_app"] as NotifChannel[],
    sendMode: "now" as "now" | "schedule",
    scheduleDate: "", scheduleTime: "",
  });
  const [composing, setComposing] = useState(false);

  /* filtering */
  const filtered = NOTIFICATIONS.filter((n) => {
    const q = search.toLowerCase();
    const matchSearch = n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
    const matchType = typeFilter === "all" || n.type === typeFilter;
    const matchStatus = statusFilter === "all" || n.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  /* stats */
  const sentCount = NOTIFICATIONS.filter((n) => n.status === "sent").length;
  const avgOpenRate = Math.round(
    NOTIFICATIONS.filter((n) => n.status === "sent" && n.openRate !== undefined)
      .reduce((sum, n) => sum + (n.openRate || 0), 0) /
    (NOTIFICATIONS.filter((n) => n.status === "sent" && n.openRate !== undefined).length || 1)
  );
  const scheduledCount = NOTIFICATIONS.filter((n) => n.status === "scheduled").length;
  const failedCount = NOTIFICATIONS.filter((n) => n.status === "failed").length;

  const openDetail = (n: Notification) => {
    setSelectedNotif(n);
    setShowDetail(true);
  };

  const resetCompose = () => {
    setComposeForm({
      title: "", body: "", type: "", audience: "",
      channels: ["email", "in_app"], sendMode: "now",
      scheduleDate: "", scheduleTime: "",
    });
    setComposing(false);
  };

  const handleCompose = () => {
    if (!composeForm.title || !composeForm.body || !composeForm.type || !composeForm.audience) {
      toast.error("Please fill all required fields");
      return;
    }
    if (composeForm.channels.length === 0) {
      toast.error("Select at least one channel");
      return;
    }
    setComposing(true);
    setTimeout(() => {
      if (composeForm.sendMode === "now") {
        toast.success(`Notification sent to ${AUDIENCE_LABELS[composeForm.audience as NotifAudience] || composeForm.audience}`);
      } else {
        toast.success(`Notification scheduled for ${composeForm.scheduleDate} ${composeForm.scheduleTime}`);
      }
      setShowCompose(false);
      resetCompose();
    }, 1000);
  };

  const toggleChannel = (ch: NotifChannel) => {
    setComposeForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter((c) => c !== ch)
        : [...prev.channels, ch],
    }));
  };

  return (
    <TowerLayout title="Notifications" subtitle="Platform-wide announcements, alerts and communication history">
      {/* ── stats row ──────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Send} iconColor="text-primary" label="Total Sent" value={String(sentCount)} sub="This month" />
        <StatCard icon={Eye} iconColor="text-success" label="Avg Open Rate" value={`${avgOpenRate}%`} />
        <StatCard icon={Calendar} iconColor="text-warning" label="Scheduled" value={String(scheduledCount)} sub="Upcoming" />
        <StatCard icon={AlertCircle} iconColor="text-destructive" label="Failed" value={String(failedCount)} />
      </div>

      {/* ── toolbar ────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search notifications..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="announcement">Announcement</SelectItem>
            <SelectItem value="billing_alert">Billing Alert</SelectItem>
            <SelectItem value="security_alert">Security Alert</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="feature_update">Feature Update</SelectItem>
            <SelectItem value="trial_expiry">Trial Expiry</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Button className="ml-auto" style={{ background: "var(--gradient-primary)" }} onClick={() => setShowCompose(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Notification
        </Button>
      </div>

      {/* ── results count ──────────────────────── */}
      <p className="text-xs text-muted-foreground mb-3">
        Showing {filtered.length} of {NOTIFICATIONS.length} notifications
      </p>

      {/* ── list ───────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <SearchX className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No notifications found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const TypeIcon = TYPE_CONFIG[n.type].icon;
            return (
              <div data-keyboard-form
                key={n.id}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => openDetail(n)}
              >
                {/* row 1 */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-xs px-2 py-0.5 rounded border", TYPE_CONFIG[n.type].color)}>
                      {TYPE_CONFIG[n.type].label}
                    </span>
                    <span className={cn("text-xs px-2 py-0.5 rounded border", STATUS_CONFIG[n.status].color)}>
                      {STATUS_CONFIG[n.status].label}
                    </span>
                  </div>
                  <span className={cn("text-xs", n.status === "failed" ? "text-destructive" : n.status === "scheduled" ? "text-warning" : "text-muted-foreground")}>
                    {n.status === "sent" && n.sentAt}
                    {n.status === "scheduled" && `Scheduled: ${n.scheduledAt}`}
                    {n.status === "draft" && "Draft"}
                    {n.status === "failed" && "Failed"}
                  </span>
                </div>

                {/* row 2 */}
                <div className="mt-2">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>
                </div>

                {/* row 3 */}
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {n.channel.map((ch) => {
                      const ChIcon = CHANNEL_ICONS[ch].icon;
                      return (
                        <span key={ch} className="flex items-center gap-0.5">
                          <ChIcon className="h-3.5 w-3.5" />
                          <span className="text-[10px]">{CHANNEL_ICONS[ch].label}</span>
                        </span>
                      );
                    })}
                  </div>
                  <span className="h-3 w-px bg-border" />
                  <span>{AUDIENCE_LABELS[n.audience]}</span>

                  {n.status === "sent" && (
                    <>
                      <span className="h-3 w-px bg-border" />
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{n.sentTo} recipients</span>
                      {n.openRate !== undefined && (
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{n.openRate}% opened</span>
                      )}
                    </>
                  )}
                  {n.status === "scheduled" && (
                    <>
                      <span className="h-3 w-px bg-border" />
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Scheduled</span>
                    </>
                  )}

                  <button
                    className="ml-auto p-1 rounded hover:bg-muted/50"
                    onClick={(e) => { e.stopPropagation(); toast("Actions coming soon"); }}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── compose dialog ─────────────────────── */}
      <Dialog open={showCompose} onOpenChange={(o) => { if (!o) resetCompose(); setShowCompose(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Notification</DialogTitle>
            <DialogDescription>Send or schedule a notification to tenants</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <Input
              placeholder="e.g. Platform Maintenance Notice"
              value={composeForm.title}
              onChange={(e) => setComposeForm((p) => ({ ...p, title: e.target.value }))}
            />

            <div>
              <Textarea
                rows={4}
                placeholder="Notification message..."
                value={composeForm.body}
                onChange={(e) => setComposeForm((p) => ({ ...p, body: e.target.value.slice(0, 500) }))}
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{composeForm.body.length}/500 characters</p>
            </div>

            <Select value={composeForm.type} onValueChange={(v) => setComposeForm((p) => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="billing_alert">Billing Alert</SelectItem>
                <SelectItem value="security_alert">Security Alert</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="feature_update">Feature Update</SelectItem>
                <SelectItem value="trial_expiry">Trial Expiry</SelectItem>
              </SelectContent>
            </Select>

            <Select value={composeForm.audience} onValueChange={(v) => setComposeForm((p) => ({ ...p, audience: v }))}>
              <SelectTrigger><SelectValue placeholder="Select audience" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all_tenants">All Tenants</SelectItem>
                <SelectItem value="specific_tenants">Specific Tenants</SelectItem>
                <SelectItem value="trial_only">Trial Tenants</SelectItem>
                <SelectItem value="enterprise_only">Enterprise Only</SelectItem>
                <SelectItem value="admins_only">Admins Only</SelectItem>
              </SelectContent>
            </Select>

            {/* channels */}
            <div>
              <p className="text-sm font-medium mb-2">Channels</p>
              <div className="flex gap-4">
                {(["email", "in_app", "sms"] as NotifChannel[]).map((ch) => (
                  <label key={ch} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={composeForm.channels.includes(ch)}
                      onCheckedChange={() => toggleChannel(ch)}
                    />
                    {CHANNEL_ICONS[ch].label}
                  </label>
                ))}
              </div>
            </div>

            {/* schedule */}
            <div>
              <p className="text-sm font-medium mb-2">Schedule</p>
              <div className="flex gap-2">
                <button
                  className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors", composeForm.sendMode === "now" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border")}
                  onClick={() => setComposeForm((p) => ({ ...p, sendMode: "now" }))}
                >
                  Send Now
                </button>
                <button
                  className={cn("px-4 py-1.5 rounded-full text-sm font-medium border transition-colors", composeForm.sendMode === "schedule" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border")}
                  onClick={() => setComposeForm((p) => ({ ...p, sendMode: "schedule" }))}
                >
                  Schedule
                </button>
              </div>
              {composeForm.sendMode === "schedule" && (
                <div className="flex gap-3 mt-3">
                  <Input type="date" value={composeForm.scheduleDate} onChange={(e) => setComposeForm((p) => ({ ...p, scheduleDate: e.target.value }))} className="w-40" />
                  <Input type="time" value={composeForm.scheduleTime} onChange={(e) => setComposeForm((p) => ({ ...p, scheduleTime: e.target.value }))} className="w-32" />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => { resetCompose(); setShowCompose(false); }}>Cancel</Button>
            <Button onClick={handleCompose} disabled={composing}>
              {composing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {composeForm.sendMode === "now" ? "Send Now" : "Schedule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── detail sheet ───────────────────────── */}
      <Sheet open={showDetail} onOpenChange={setShowDetail}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          {selectedNotif && <NotificationDetail notif={selectedNotif} onClose={() => setShowDetail(false)} />}
        </SheetContent>
      </Sheet>
    </TowerLayout>
  );
};

/* ── stat card ─────────────────────────────────── */
const StatCard = ({ icon: Icon, iconColor, label, value, sub }: {
  icon: typeof Send; iconColor: string; label: string; value: string; sub?: string;
}) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Icon className={cn("h-4 w-4", iconColor)} />
    </div>
    <p className="text-2xl font-bold font-mono text-foreground">{value}</p>
    {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
  </div>
);

/* ── detail ────────────────────────────────────── */
const NotificationDetail = ({ notif, onClose }: { notif: Notification; onClose: () => void }) => {
  const rows: [string, React.ReactNode][] = [
    ["Notification ID", <span className="font-mono text-xs">{notif.id}</span>],
    ["Type", <span className={cn("text-xs px-2 py-0.5 rounded border", TYPE_CONFIG[notif.type].color)}>{TYPE_CONFIG[notif.type].label}</span>],
    ["Audience", AUDIENCE_LABELS[notif.audience]],
    ["Channels", (
      <div className="flex items-center gap-2">
        {notif.channel.map((ch) => {
          const ChIcon = CHANNEL_ICONS[ch].icon;
          return <span key={ch} className="flex items-center gap-1"><ChIcon className="h-3.5 w-3.5" /><span className="text-xs">{CHANNEL_ICONS[ch].label}</span></span>;
        })}
      </div>
    )],
    ["Created By", notif.createdBy],
    [notif.status === "scheduled" ? "Scheduled At" : "Sent At", notif.sentAt || notif.scheduledAt || "—"],
  ];

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-xs px-2 py-0.5 rounded border", TYPE_CONFIG[notif.type].color)}>{TYPE_CONFIG[notif.type].label}</span>
          <span className={cn("text-xs px-2 py-0.5 rounded border", STATUS_CONFIG[notif.status].color)}>{STATUS_CONFIG[notif.status].label}</span>
        </div>
        <SheetTitle className="text-lg font-semibold mt-2">{notif.title}</SheetTitle>
      </SheetHeader>

      <div className="mt-6 space-y-4">
        {/* details */}
        <div className="space-y-0">
          {rows.map(([label, val], i) => (
            <div key={label} className={cn("flex items-center justify-between py-2.5", i < rows.length - 1 && "border-b border-border/50")}>
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-sm text-foreground">{val}</span>
            </div>
          ))}
        </div>

        {/* message */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Message</p>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm text-foreground leading-relaxed">{notif.body}</p>
          </div>
        </div>

        {/* performance */}
        {notif.status === "sent" && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Performance</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/20 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Recipients</p>
                <p className="text-lg font-bold font-mono text-foreground">{notif.sentTo}</p>
              </div>
              <div className="bg-muted/20 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">Open Rate</p>
                <p className="text-lg font-bold font-mono text-success">{notif.openRate ?? 0}%</p>
              </div>
            </div>
          </div>
        )}

        {/* actions */}
        <div className="space-y-2 pt-2">
          {notif.status === "draft" && (
            <Button className="w-full" style={{ background: "var(--gradient-primary)" }} onClick={() => { toast.success("Notification sent"); onClose(); }}>
              Send Now
            </Button>
          )}
          {notif.status === "scheduled" && (
            <Button variant="outline" className="w-full" onClick={() => { toast("Schedule cancelled"); onClose(); }}>
              Cancel Schedule
            </Button>
          )}
          {notif.status === "failed" && (
            <Button className="w-full" onClick={() => { toast.success("Notification retried"); onClose(); }}>
              Retry
            </Button>
          )}
          <Button variant="outline" className="w-full" onClick={() => toast("Notification duplicated to drafts")}>
            Duplicate
          </Button>
        </div>
      </div>
    </>
  );
};

export default Notifications;
