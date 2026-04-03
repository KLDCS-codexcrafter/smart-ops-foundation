import { useState, useEffect, useRef, useCallback, MouseEvent as ReactMouseEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Cpu, Mail, AtSign, Phone, Lock, Eye, EyeOff, ArrowRight,
  Loader2, Check, AlertTriangle, Info, CheckCircle, BarChart3,
  FileText, Shield, Sparkles, Quote, Lightbulb, Star, Rocket, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { PasswordMatchIndicator } from "@/components/auth/PasswordMatchIndicator";

// ── Schemas ──
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
const nickNameSchema = z.object({
  nickName: z.string().min(3, "Nick name must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
const mobileSchema = z.object({
  mobile: z.string().regex(/^[6-9][0-9]{9}$/, "Enter a valid 10-digit Indian mobile number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
const resetEmailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});
const newPasswordSchema = z.object({
  password: z.string()
    .min(8, "Minimum 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// ── Mock auth ──
// [JWT] Replace this with: POST /api/auth/login
const mockLogin = async (credential: string, password: string) => {
  await new Promise((r) => setTimeout(r, 1200));
  if (password.length < 6) return { error: "Invalid credentials" };
  return { role: "tenant_admin" };
};

// [JWT] Replace this with: POST /api/auth/forgot-password
const mockForgotPassword = async (_email: string) => {
  await new Promise((r) => setTimeout(r, 1000));
  return { success: true };
};

// [JWT] Replace this with: POST /api/auth/reset-password
const mockResetPassword = async (_password: string) => {
  await new Promise((r) => setTimeout(r, 1000));
  return { success: true };
};

const routeByRole: Record<string, string> = {
  super_admin: "/tower/dashboard",
  partner_admin: "/partner/dashboard",
  customer_user: "/my/dashboard",
  operator: "/bridge/dashboard",
  tenant_admin: "/erp/dashboard",
};

// ── Helpers ──
const QUOTES = [
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain", theme: "Rocket" },
  { quote: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs", theme: "Lightbulb" },
  { quote: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau", theme: "Star" },
  { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson", theme: "Clock" },
  { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney", theme: "Rocket" },
  { quote: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs", theme: "Sparkles" },
  { quote: "Either you run the day or the day runs you.", author: "Jim Rohn", theme: "Star" },
];

const quoteIcons: Record<string, typeof Sparkles> = {
  Sparkles, Quote, Lightbulb, Star, Rocket, Clock,
};

const getTimeGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { greeting: "Good Morning", emoji: "🌅" };
  if (h >= 12 && h < 17) return { greeting: "Good Afternoon", emoji: "☀️" };
  if (h >= 17 && h < 21) return { greeting: "Good Evening", emoji: "🌆" };
  return { greeting: "Working Late", emoji: "🌙" };
};

const getMoodIndicator = () => {
  const now = new Date();
  const h = now.getHours();
  const day = now.getDay();
  if (day === 0 || day === 6) return { mood: "Relaxed", emoji: "🧘" };
  if (day === 1 && h >= 5 && h < 12) return { mood: "Determined", emoji: "⛰️" };
  if (h >= 22 || h < 5) return { mood: "Dedicated", emoji: "🔥" };
  if (h >= 5 && h < 12) return { mood: "Energized", emoji: "⚡" };
  if (h >= 12 && h < 17) return { mood: "Focused", emoji: "🎯" };
  return { mood: "Creative", emoji: "🎨" };
};

const getClockRingColor = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "rgba(251, 191, 36, 0.6)";
  if (h >= 12 && h < 17) return "rgba(45, 212, 191, 0.6)";
  if (h >= 17 && h < 21) return "rgba(251, 146, 60, 0.6)";
  return "rgba(96, 165, 250, 0.5)";
};

// ── LiveClock Component ──
function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = time.getHours() % 12;
  const m = time.getMinutes();
  const s = time.getSeconds();
  const hourDeg = h * 30 + m * 0.5;
  const minDeg = m * 6;
  const secDeg = s * 6;
  const ringColor = getClockRingColor();

  const dateStr = time.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const timeStr = time.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="none" stroke={ringColor} strokeWidth="2" />
          {/* Tick marks */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 - 90) * (Math.PI / 180);
            const x1 = 50 + 38 * Math.cos(angle);
            const y1 = 50 + 38 * Math.sin(angle);
            const x2 = 50 + 42 * Math.cos(angle);
            const y2 = 50 + 42 * Math.sin(angle);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth={i % 3 === 0 ? 2 : 1} strokeOpacity={0.6} />;
          })}
          {/* Hour hand */}
          <line
            x1="50" y1="50"
            x2={50 + 22 * Math.cos((hourDeg - 90) * Math.PI / 180)}
            y2={50 + 22 * Math.sin((hourDeg - 90) * Math.PI / 180)}
            stroke="white" strokeWidth="2.5" strokeLinecap="round"
          />
          {/* Minute hand */}
          <line
            x1="50" y1="50"
            x2={50 + 30 * Math.cos((minDeg - 90) * Math.PI / 180)}
            y2={50 + 30 * Math.sin((minDeg - 90) * Math.PI / 180)}
            stroke="white" strokeWidth="1.5" strokeLinecap="round"
          />
          {/* Second hand */}
          <line
            x1="50" y1="50"
            x2={50 + 34 * Math.cos((secDeg - 90) * Math.PI / 180)}
            y2={50 + 34 * Math.sin((secDeg - 90) * Math.PI / 180)}
            stroke="hsl(185 80% 50%)" strokeWidth="1" strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="2.5" fill="white" />
        </svg>
      </div>
      <div>
        <p className="font-mono text-white text-lg tracking-wider">{timeStr}</p>
        <p className="text-white/60 text-xs">{dateStr}</p>
      </div>
    </div>
  );
}

// ── MoodIndicator Component ──
function MoodIndicator() {
  const { mood, emoji } = getMoodIndicator();
  return (
    <div className="flex items-center gap-2 text-white/70 text-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
      </span>
      <span>Feeling {mood} {emoji}</span>
    </div>
  );
}

// ── Feature Cards ──
const featureCards = [
  { title: "Active Status", subtitle: "All systems operational", icon: CheckCircle, color: "bg-success/20", iconColor: "text-success" },
  { title: "Analytics", subtitle: "Real-time insights", icon: BarChart3, color: "bg-info/20", iconColor: "text-info" },
  { title: "Reports", subtitle: "Generate & export", icon: FileText, color: "bg-[hsl(270_50%_50%/0.2)]", iconColor: "text-[hsl(270_50%_60%)]" },
  { title: "Secure", subtitle: "Enterprise-grade security", icon: Shield, color: "bg-primary/20", iconColor: "text-primary" },
];

const cardPositions = [
  { top: "12%", deg: 3 },
  { top: "28%", deg: -2 },
  { top: "44%", deg: 1 },
  { top: "60%", deg: -3 },
];

type AuthView = "login" | "forgot" | "forgot-sent" | "reset";
type LoginTab = "email" | "nickname" | "mobile";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isReset = searchParams.get("mode") === "reset";

  const [view, setView] = useState<AuthView>(isReset ? "reset" : "login");
  const [activeTab, setActiveTab] = useState<LoginTab>(() => {
    const saved = localStorage.getItem("4ds_login_method");
    return (saved as LoginTab) || "email";
  });
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);
  const [shakeForm, setShakeForm] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [forgotEmail, setForgotEmail] = useState("");
  const [typewriterText, setTypewriterText] = useState("");
  const [authInit, setAuthInit] = useState(true);

  const passwordRef = useRef<HTMLInputElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  // Typewriter
  useEffect(() => {
    const target = "4DSmartOps";
    let i = 0;
    const id = setInterval(() => {
      setTypewriterText(target.slice(0, i + 1));
      i++;
      if (i >= target.length) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Simulate auth init
  useEffect(() => {
    const id = setTimeout(() => setAuthInit(false), 800);
    return () => clearTimeout(id);
  }, []);

  // Lockout timer
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const id = setInterval(() => {
      setLockoutTimer((t) => {
        if (t <= 1) { setFailedAttempts(0); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lockoutTimer]);

  // Remember me restore
  useEffect(() => {
    const savedCred = localStorage.getItem("4ds_login_credential");
    if (savedCred) {
      try {
        const { method, value } = JSON.parse(savedCred);
        setActiveTab(method);
        if (method === "email") emailForm.setValue("email", value);
        if (method === "nickname") nickForm.setValue("nickName", value);
        if (method === "mobile") mobileForm.setValue("mobile", value);
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseMove = useCallback((e: ReactMouseEvent) => {
    if (!leftPanelRef.current) return;
    const rect = leftPanelRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  // ── Forms ──
  const emailForm = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: "", password: "" } });
  const nickForm = useForm({ resolver: zodResolver(nickNameSchema), defaultValues: { nickName: "", password: "" } });
  const mobileForm = useForm({ resolver: zodResolver(mobileSchema), defaultValues: { mobile: "", password: "" } });
  const forgotForm = useForm({ resolver: zodResolver(resetEmailSchema), defaultValues: { email: "" } });
  const resetForm = useForm({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: "", confirmPassword: "" } });

  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem("4ds_login_credential"));

  const activeForm = activeTab === "email" ? emailForm : activeTab === "nickname" ? nickForm : mobileForm;

  const handleLogin = async (data: Record<string, string>) => {
    if (lockoutTimer > 0) return;
    setLoading(true);
    const credential = data.email || data.nickName || data.mobile || "";
    const password = data.password;

    const result = await mockLogin(credential, password);
    if ("error" in result) {
      setLoading(false);
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= 5) setLockoutTimer(30);
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 600);
      (activeForm as any).setValue("password", "");
      passwordRef.current?.focus();
      toast.error("Invalid credentials. Please try again.");
      return;
    }

    if (rememberMe) {
      localStorage.setItem("4ds_login_credential", JSON.stringify({ method: activeTab, value: credential }));
      localStorage.setItem("4ds_login_method", activeTab);
    } else {
      localStorage.removeItem("4ds_login_credential");
      localStorage.removeItem("4ds_login_method");
    }

    setLoginSuccess(true);
    localStorage.setItem("4ds_token", "mock-jwt-token-xyz");
    toast.success("Welcome to 4DSmartOps");
    setTimeout(() => {
      navigate(routeByRole[result.role] ?? "/erp/dashboard", { replace: true });
    }, 600);
    setLoading(false);
  };

  const handleForgot = async (data: { email: string }) => {
    setLoading(true);
    await mockForgotPassword(data.email);
    setForgotEmail(data.email);
    setView("forgot-sent");
    setLoading(false);
  };

  const handleReset = async (data: { password: string; confirmPassword: string }) => {
    setLoading(true);
    await mockResetPassword(data.password);
    toast.success("Password updated successfully");
    setView("login");
    setLoading(false);
  };

  const handleCapsLock = (e: React.KeyboardEvent) => setCapsLock(e.getModifierState("CapsLock"));

  const tabs: { key: LoginTab; label: string; icon: typeof Mail }[] = [
    { key: "email", label: "Email", icon: Mail },
    { key: "nickname", label: "Nick Name", icon: AtSign },
    { key: "mobile", label: "Mobile", icon: Phone },
  ];

  const todayQuote = QUOTES[new Date().getDay()];
  const QuoteIcon = quoteIcons[todayQuote.theme] || Sparkles;
  const timeGreeting = getTimeGreeting();

  // ── Loading skeleton ──
  if (authInit) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] p-10 flex-col justify-between" style={{ background: "var(--gradient-hero)" }}>
          <div className="space-y-4">
            <div className="h-10 w-40 rounded-lg bg-white/10 animate-pulse" />
            <div className="h-6 w-32 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-8 w-64 rounded bg-white/10 animate-pulse" />
            <div className="h-12 w-48 rounded bg-white/10 animate-pulse" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-background p-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="h-8 w-32 rounded bg-muted animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
            <div className="h-11 w-full rounded-lg bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="flex min-h-screen">
      {/* ═══ LEFT PANEL ═══ */}
      <div
        ref={leftPanelRef}
        onMouseMove={handleMouseMove}
        className="hidden lg:flex lg:w-[480px] xl:w-[540px] relative overflow-hidden flex-col justify-between p-10"
        style={{ background: "var(--gradient-hero)" }}
      >
        {/* Floating orbs */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-30 animate-float-1 animate-pulse-glow pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--orb-1) / 0.4), transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 -left-24 w-80 h-80 rounded-full opacity-20 animate-float-2 animate-pulse-glow pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--orb-2) / 0.3), transparent 70%)", animationDelay: "2s" }}
        />
        <div
          className="absolute -bottom-20 right-1/3 w-72 h-72 rounded-full opacity-25 animate-float-3 animate-pulse-glow pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--orb-3) / 0.35), transparent 70%)", animationDelay: "4s" }}
        />

        {/* Top section */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-tight">4DSmartOps</p>
              <p className="text-white/50 text-xs">Enterprise Operations Platform</p>
            </div>
          </div>

          {/* Clock + Mood */}
          <div className="space-y-3 mb-8">
            <LiveClock />
            <MoodIndicator />
          </div>

          {/* Greeting + Typewriter */}
          <div className="space-y-2">
            <p className="text-white/70 text-sm">{timeGreeting.emoji} {timeGreeting.greeting}</p>
            <h1 className="text-white text-3xl font-bold leading-tight">
              Welcome to<br />
              <span className="text-primary glow-text">{typewriterText}</span>
              <span className="animate-pulse text-primary">|</span>
            </h1>
            <p className="text-white/60 text-sm">Your Enterprise Operations Platform</p>
          </div>
        </div>

        {/* Feature Cards (right side, absolute) */}
        <div className="absolute right-6 top-0 bottom-0 w-44 pointer-events-none">
          {featureCards.map((card, i) => {
            const pos = cardPositions[i];
            const multiplier = [3, 5, 7, 9][i];
            return (
              <div
                key={card.title}
                className="absolute right-0 w-40 glass-card-dark p-3 pointer-events-auto cursor-pointer animate-float-in"
                style={{
                  top: pos.top,
                  animationDelay: `${0.2 + i * 0.2}s`,
                  animationFillMode: "backwards",
                  transform: `rotate(${pos.deg}deg) translate(${mousePos.x * multiplier}px, ${mousePos.y * multiplier}px)`,
                }}
                onClick={() => setExpandedCard(expandedCard === i ? null : i)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.color}`}>
                    <card.icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium">{card.title}</p>
                    <p className="text-white/50 text-[10px]">{card.subtitle}</p>
                  </div>
                </div>
                {expandedCard === i && (
                  <p className="text-white/60 text-[10px] mt-2 animate-fade-in">
                    {card.title === "Active Status" && "All microservices and APIs are running within expected parameters."}
                    {card.title === "Analytics" && "Access dashboards with real-time KPIs, trends, and performance metrics."}
                    {card.title === "Reports" && "Generate GST-compliant invoices, export CSV/PDF reports instantly."}
                    {card.title === "Secure" && "End-to-end encryption, RBAC, and audit logging built-in."}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Daily Quote (bottom) */}
        <div className="relative z-10 glass-card-dark p-4 mt-auto">
          <div className="flex items-start gap-3">
            <QuoteIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-white/90 text-sm italic leading-relaxed">"{todayQuote.quote}"</p>
              <p className="text-white/60 text-xs mt-2">— {todayQuote.author}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="flex-1 flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-6 flex justify-center">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <span className="text-foreground font-bold text-sm">4DSmartOps</span>
            </div>
          </div>

          {/* ── LOGIN VIEW ── */}
          {view === "login" && (
            <div className={`animate-fade-in ${shakeForm ? "animate-shake" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-semibold text-foreground">Sign In</h2>
                <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">v0.1</span>
              </div>
              <p className="text-sm text-muted-foreground mb-5">Welcome back to 4DSmartOps</p>

              {/* Session expiry */}
              {location.state?.from && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm mb-4 animate-fade-in">
                  <Info className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">Your session expired. Please sign in again.</span>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-5">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                      activeTab === tab.key
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Failed attempts warnings */}
              {failedAttempts >= 3 && failedAttempts < 5 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm mb-4 animate-fade-in">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                  <span className="text-muted-foreground">{5 - failedAttempts} attempt(s) remaining before lockout</span>
                </div>
              )}
              {lockoutTimer > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm mb-4 animate-fade-in">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <span className="text-muted-foreground">Too many attempts. Try again in <span className="font-mono text-destructive">{lockoutTimer}s</span></span>
                </div>
              )}

              {/* Email form */}
              {activeTab === "email" && (
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField control={emailForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-xs">Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="you@example.com" className="pl-9 rounded-lg bg-muted/50 border-border/50" {...field}
                              onKeyDown={(e) => { handleCapsLock(e); if (e.key === "Enter") { e.preventDefault(); passwordRef.current?.focus(); } }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <PasswordField form={emailForm} showPassword={showPassword} setShowPassword={setShowPassword} capsLock={capsLock} handleCapsLock={handleCapsLock} passwordRef={passwordRef} />
                    <RememberForgotRow rememberMe={rememberMe} setRememberMe={setRememberMe} onForgot={() => setView("forgot")} />
                    <SubmitButton loading={loading} success={loginSuccess} locked={lockoutTimer > 0} />
                    <KeyboardHint />
                  </form>
                </Form>
              )}

              {/* Nickname form */}
              {activeTab === "nickname" && (
                <Form {...nickForm}>
                  <form onSubmit={nickForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField control={nickForm.control} name="nickName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-xs">Nick Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="john_doe" className="pl-9 rounded-lg bg-muted/50 border-border/50" {...field}
                              onKeyDown={(e) => { handleCapsLock(e); if (e.key === "Enter") { e.preventDefault(); passwordRef.current?.focus(); } }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <PasswordField form={nickForm} showPassword={showPassword} setShowPassword={setShowPassword} capsLock={capsLock} handleCapsLock={handleCapsLock} passwordRef={passwordRef} />
                    <RememberForgotRow rememberMe={rememberMe} setRememberMe={setRememberMe} onForgot={() => setView("forgot")} />
                    <SubmitButton loading={loading} success={loginSuccess} locked={lockoutTimer > 0} />
                    <KeyboardHint />
                  </form>
                </Form>
              )}

              {/* Mobile form */}
              {activeTab === "mobile" && (
                <Form {...mobileForm}>
                  <form onSubmit={mobileForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField control={mobileForm.control} name="mobile" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-xs">Mobile Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="9876543210" maxLength={10} className="pl-9 rounded-lg bg-muted/50 border-border/50" {...field}
                              onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); field.onChange(v); }}
                              onKeyDown={(e) => { handleCapsLock(e); if (e.key === "Enter") { e.preventDefault(); passwordRef.current?.focus(); } }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <PasswordField form={mobileForm} showPassword={showPassword} setShowPassword={setShowPassword} capsLock={capsLock} handleCapsLock={handleCapsLock} passwordRef={passwordRef} />
                    <RememberForgotRow rememberMe={rememberMe} setRememberMe={setRememberMe} onForgot={() => setView("forgot")} />
                    <SubmitButton loading={loading} success={loginSuccess} locked={lockoutTimer > 0} />
                    <KeyboardHint />
                  </form>
                </Form>
              )}
            </div>
          )}

          {/* ── FORGOT VIEW ── */}
          {view === "forgot" && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-semibold text-foreground mb-1">Reset Password</h2>
              <p className="text-sm text-muted-foreground mb-5">Enter your email to receive a reset link</p>
              <Form {...forgotForm}>
                <form onSubmit={forgotForm.handleSubmit(handleForgot)} className="space-y-4">
                  <FormField control={forgotForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder="you@example.com" className="pl-9 rounded-lg bg-muted/50 border-border/50" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full h-11 rounded-lg" style={{ background: "var(--gradient-primary)" }} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setView("login")}>
                    Back to Sign In
                  </Button>
                </form>
              </Form>
            </div>
          )}

          {/* ── FORGOT SENT ── */}
          {view === "forgot-sent" && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-semibold text-foreground mb-1">Reset Password</h2>
              <p className="text-sm text-muted-foreground mb-5">Check your email for the reset link</p>
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20 mb-5">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm text-muted-foreground">Reset link sent to <span className="text-foreground font-medium">{forgotEmail}</span></p>
              </div>
              <Button variant="outline" className="w-full rounded-lg" onClick={() => setView("login")}>
                Back to Sign In
              </Button>
            </div>
          )}

          {/* ── RESET VIEW ── */}
          {view === "reset" && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-semibold text-foreground mb-1">Set New Password</h2>
              <p className="text-sm text-muted-foreground mb-5">Choose a strong password</p>
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                  <FormField control={resetForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="password" placeholder="Enter new password" className="pl-9 rounded-lg bg-muted/50 border-border/50" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                      <PasswordStrengthIndicator password={field.value} />
                    </FormItem>
                  )} />
                  <FormField control={resetForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-xs">Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="password" placeholder="Confirm password" className="pl-9 rounded-lg bg-muted/50 border-border/50" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                      <PasswordMatchIndicator password={resetForm.watch("password")} confirmPassword={field.value} />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full h-11 rounded-lg" style={{ background: "var(--gradient-primary)" }} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
                  </Button>
                </form>
              </Form>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">Built for Indian SMEs</p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──
function PasswordField({ form, showPassword, setShowPassword, capsLock, handleCapsLock, passwordRef }: {
  form: any; showPassword: boolean; setShowPassword: (v: boolean) => void;
  capsLock: boolean; handleCapsLock: (e: React.KeyboardEvent) => void;
  passwordRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <FormField control={form.control} name="password" render={({ field }) => (
      <FormItem>
        <FormLabel className="text-muted-foreground text-xs">Password</FormLabel>
        <FormControl>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="pl-9 pr-10 rounded-lg bg-muted/50 border-border/50"
              {...field}
              ref={(e) => {
                field.ref(e);
                (passwordRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
              }}
              onKeyDown={handleCapsLock}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-opacity"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FormControl>
        {capsLock && (
          <div className="flex items-center gap-1.5 text-xs text-warning mt-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Caps Lock is on</span>
          </div>
        )}
        <FormMessage />
      </FormItem>
    )} />
  );
}

function RememberForgotRow({ rememberMe, setRememberMe, onForgot }: {
  rememberMe: boolean; setRememberMe: (v: boolean) => void; onForgot: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Checkbox id="remember" checked={rememberMe} onCheckedChange={(c) => setRememberMe(!!c)} />
        <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">Remember me</label>
      </div>
      <button type="button" onClick={onForgot} className="text-xs text-primary hover:text-primary/80 transition-colors">
        Forgot password?
      </button>
    </div>
  );
}

function SubmitButton({ loading, success, locked }: { loading: boolean; success: boolean; locked: boolean }) {
  return (
    <Button
      type="submit"
      className="w-full h-11 rounded-lg transition-all"
      style={{ background: success ? undefined : "var(--gradient-primary)" }}
      variant={success ? "default" : undefined}
      disabled={loading || locked}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : success ? (
        <span className="flex items-center gap-2 text-success-foreground"><Check className="h-4 w-4" /> Success</span>
      ) : (
        <span className="flex items-center gap-2">Sign In <ArrowRight className="h-4 w-4" /></span>
      )}
    </Button>
  );
}

function KeyboardHint() {
  return (
    <p className="text-center text-xs text-muted-foreground/50 mt-2">
      <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">Enter</kbd> to continue ·{" "}
      <kbd className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-[10px]">Tab</kbd> to navigate
    </p>
  );
}
