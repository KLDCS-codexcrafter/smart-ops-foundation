import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Cpu, ArrowLeft, Home, LayoutDashboard, Building2,
  Users, Activity, Clock, Shield, ScrollText,
  ChevronRight, CheckCircle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { UserProfileDropdown } from "@/components/auth/UserProfileDropdown";
import { ThemeToggle } from "@/components/theme";

const SEEN_KEY = "operix-welcome-seen-command-center";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return { text: "Good Morning", emoji: "🌅" };
  if (hour >= 12 && hour <= 16) return { text: "Good Afternoon", emoji: "☀️" };
  if (hour >= 17 && hour <= 20) return { text: "Good Evening", emoji: "🌆" };
  return { text: "Working Late", emoji: "🌙" };
}

function getUserName(): string {
  try {
    // [JWT] GET /api/auth/saved-credential
    const raw = localStorage.getItem("4ds_login_credential");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.value ?? "Admin";
    }
  } catch { /* ignore */ }
  return "Admin";
}

const PULSE_METRICS = [
  { label: "Active Users", value: "—", icon: Users, color: "text-cyan-400" },
  { label: "Active Sessions", value: "0", icon: Activity, color: "text-emerald-400" },
  { label: "Pending Approvals", value: "0", icon: Clock, color: "text-amber-400" },
  { label: "Audit Events Today", value: "0", icon: Shield, color: "text-violet-400" },
];

const QUICK_ACTIONS = [
  { label: "View Audit Logs", icon: ScrollText, href: "/erp/command-center/hub" },
  { label: "Manage Roles", icon: Shield, href: "/erp/command-center/hub" },
  { label: "Foundation Setup", icon: Building2, href: "/erp/command-center/hub" },
];

const RECENT_ACTIVITY = [
  { action: "Platform initialized", time: "Just now", type: "info" as const },
  { action: "Security policies loaded", time: "2 min ago", type: "success" as const },
  { action: "Module registry synced", time: "5 min ago", type: "info" as const },
  { action: "Bridge Agent connected", time: "10 min ago", type: "success" as const },
  { action: "System health check passed", time: "15 min ago", type: "success" as const },
];

export default function CommandCenterWelcome() {
  const navigate = useNavigate();
  const greeting = getGreeting();
  const userName = getUserName();

  // Auto-skip if already seen
  useEffect(() => {
    // [JWT] GET /api/onboarding/seen
    const seen = localStorage.getItem(SEEN_KEY);
    if (seen) navigate("/erp/command-center/hub", { replace: true });
  }, [navigate]);

  function handleEnter() {
    // [JWT] PATCH /api/onboarding/seen
    localStorage.setItem(SEEN_KEY, "true");
    navigate("/erp/command-center/hub");
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Orb backgrounds — identical to erp/Dashboard.tsx */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 animate-pulse pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--orb-1) / 0.4), transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 -left-24 w-80 h-80 rounded-full opacity-20 animate-pulse pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--orb-2) / 0.3), transparent 70%)", animationDelay: "2s" }}
        />
        <div
          className="absolute -bottom-20 right-1/3 w-72 h-72 rounded-full opacity-25 animate-pulse pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--orb-3) / 0.35), transparent 70%)", animationDelay: "4s" }}
        />
      </div>

      {/* Header — identical structure to erp/Dashboard.tsx */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/50 h-14 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Cpu className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground">4DSmartOps</span>
          <Separator orientation="vertical" className="h-5 bg-border/50" />
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/erp/dashboard")}>
              <Home className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserProfileDropdown variant="dashboard" />
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
        {/* 1. Module Identity */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <LayoutDashboard className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Ops Hub · Platform Administration</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-500">
            <CheckCircle className="h-3.5 w-3.5" />
            System Operational
          </div>
        </div>

        {/* 2. Role-Aware Greeting */}
        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-xl p-5 mb-6 text-center">
          <h2 className="text-lg font-semibold text-foreground">
            {greeting.emoji} {greeting.text}, {userName}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            You are the system administrator. User access, security policies and ERP configuration are your responsibility.
          </p>
        </div>

        {/* 3. Pulse Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {PULSE_METRICS.map((metric) => {
            const Icon = metric.icon;
            return (
              <div key={metric.label} className="rounded-xl border border-border bg-card/60 backdrop-blur-xl p-4 flex flex-col items-center">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className={`h-4 w-4 ${metric.color}`} />
                  <span className="text-[10px] text-emerald-500 font-medium">live</span>
                </div>
                <span className={`text-xl font-bold font-mono ${metric.color}`}>{metric.value}</span>
                <span className="text-xs text-muted-foreground mt-0.5">{metric.label}</span>
              </div>
            );
          })}
        </div>

        {/* 4. Quick Entry Strip */}
        <div className="flex gap-3 mb-6">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.href)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border hover:border-primary/40 transition-all duration-200 text-sm font-medium text-foreground"
              >
                <Icon className="h-4 w-4 text-primary" />
                {action.label}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {/* 5. Announcements */}
        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Announcements</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            No new announcements. Platform is running normally.
          </div>
        </div>

        {/* 6. Recent Activity */}
        <div className="rounded-xl border border-border bg-card/60 backdrop-blur-xl p-5 mb-8">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
          <div className="space-y-3">
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className={`h-3.5 w-3.5 ${item.type === "success" ? "text-emerald-500" : "text-primary"}`} />
                  <span className="text-sm text-foreground">{item.action}</span>
                </div>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Enter Module CTA */}
        <div className="flex flex-col items-center gap-2">
          <Button onClick={handleEnter} size="lg" className="gap-2">
            Enter Command Center
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">This screen will be skipped on your next visit</span>
        </div>

        <footer className="mt-12 py-4 border-t border-border/30 text-center text-xs text-muted-foreground">
          © 2026 4DSmartOps · Command Center · Operix ERP
        </footer>
      </main>
    </div>
  );
}
