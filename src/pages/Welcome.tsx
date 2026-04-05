/**
 * @file    Welcome.tsx
 * @what    Post-login landing page — hub for all 5 panels + Prudent 360
 * @who     All authenticated users after login
 * @where   src/pages/Welcome.tsx
 * @why     Central navigation point before entering any panel
 * @how     Auth-guarded, role-agnostic, card-based navigation
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Cpu,
  LayoutDashboard,
  GitMerge,
  BarChart3,
  Handshake,
  UserCircle,
  Compass,
  ArrowRight,
  ArrowLeft,
  Home,
  Users,
  HelpCircle,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserProfileDropdown } from "@/components/auth/UserProfileDropdown";

// ── Greeting helper ──
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return { text: "Good Morning", emoji: "🌅" };
  if (hour >= 12 && hour <= 16) return { text: "Good Afternoon", emoji: "☀️" };
  if (hour >= 17 && hour <= 20) return { text: "Good Evening", emoji: "🌆" };
  return { text: "Working Late", emoji: "🌙" };
}

function getUserName(): string {
  try {
    const raw = localStorage.getItem("4ds_login_credential");
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.value ?? "Welcome";
    }
  } catch {
    // ignore
  }
  return "Welcome";
}

// ── Panel cards data ──
const panelCards = [
  {
    title: "Control Tower",
    icon: LayoutDashboard,
    route: "/tower/dashboard",
    description: "Platform management & tenant administration",
    highlight: false,
  },
  {
    title: "Bridge Console",
    icon: GitMerge,
    route: "/bridge/dashboard",
    description: "Tally sync operations & exception management",
    highlight: false,
  },
  {
    title: "Operix Udyam Kendra Prism Nexus",
    icon: BarChart3,
    route: "/erp/dashboard",
    description: "Business Operations Hub — Full ERP · Modules · Small Projects",
    highlight: false,
  },
  {
    title: "Partner Panel",
    icon: Handshake,
    route: "/partner/dashboard",
    description: "Partner dashboard & commission management",
    highlight: false,
  },
  {
    title: "Customer Portal",
    icon: Users,
    route: "/customer/dashboard",
    description: "Self-service invoices, payments, orders and support for your B2B clients",
    highlight: false,
  },
  {
    title: "Prudent 360",
    icon: Compass,
    route: "/prudent360",
    description: "Tools, documentation & intelligence hub",
    highlight: true,
  },
];

const quickActions = [
  { icon: BarChart3, label: "Reports", href: "/erp/dashboard" },
  { icon: Users, label: "Team", href: "/tower/dashboard" },
  { icon: GitMerge, label: "Sync Status", href: "/bridge/dashboard" },
  { icon: Handshake, label: "Partners", href: "/partner/dashboard" },
  { icon: HelpCircle, label: "Support", href: "/my/dashboard" },
  { icon: Settings, label: "Settings", href: "/profile" },
];

// ── Component ──
export default function Welcome() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem("4ds_token");
    if (!token) {
      navigate("/auth/login", { replace: true });
    } else {
      setAuthenticated(true);
    }
  }, [navigate]);

  if (!authenticated) return null;

  const greeting = getGreeting();
  const userName = getUserName();
  const todayFormatted = format(new Date(), "EEEE, dd MMM yyyy");

  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* ── Background Orbs ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full 
            opacity-30 animate-float-1 animate-pulse-glow pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--orb-1) / 0.4), transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 -left-24 w-80 h-80 rounded-full 
            opacity-20 animate-float-2 animate-pulse-glow pointer-events-none"
          style={{
            background: "radial-gradient(circle, hsl(var(--orb-2) / 0.3), transparent 70%)",
            animationDelay: "2s",
          }}
        />
        <div
          className="absolute -bottom-20 right-1/3 w-72 h-72 rounded-full 
            opacity-25 animate-float-3 animate-pulse-glow pointer-events-none"
          style={{
            background: "radial-gradient(circle, hsl(var(--orb-3) / 0.35), transparent 70%)",
            animationDelay: "4s",
          }}
        />
      </div>

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-30 glass border-b border-border/50 h-14 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Cpu className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground">4DSmartOps</span>
          <Separator orientation="vertical" className="h-5 bg-border/50" />
          <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => navigate("/welcome")}
            >
              <Home className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <UserProfileDropdown variant="dashboard" />
      </header>

      {/* ── Main Content ── */}
      <main className="relative z-10 container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-6xl">
        {/* Greeting */}
        <div className="animate-fade-in mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {greeting.emoji} {greeting.text}, {userName}
          </h1>
          <p className="text-muted-foreground mt-1">{todayFormatted}</p>
        </div>

        {/* Section Label */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Your Workspace
          </p>
          <div className="h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
        </div>

        {/* Panel Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {panelCards.map((card, i) => (
            <button
              key={card.title}
              onClick={() => navigate(card.route)}
              className="group relative overflow-hidden rounded-2xl p-6 sm:p-8 text-left w-full transition-all duration-500 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 animate-slide-up"
              style={{
                animationDelay: `${0.1 + i * 0.08}s`,
                animationFillMode: "backwards",
              }}
            >
              {/* Layer 1: bg */}
              <div
                className={`absolute inset-0 backdrop-blur-xl border rounded-2xl ${
                  card.highlight
                    ? "bg-accent/10 border-accent/30"
                    : "bg-card/60 border-border"
                }`}
              />
              {/* Layer 2: hover gradient */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl" />

              {/* WIP Badge */}
              <span className="absolute top-3 right-3 z-20 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30">
                Work in Progress
              </span>

              {/* Content */}
              <div className="relative z-10 flex flex-col min-h-[160px]">
                <div className="w-12 h-12 rounded-xl bg-muted/50 group-hover:bg-muted/70 transition-colors flex items-center justify-center">
                  <card.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="mt-auto">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    {card.title}
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/80 group-hover:translate-x-1 transition-all" />
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {card.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 glass-card rounded-2xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Actions
          </p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.href)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/50 hover:bg-background/80 border border-border/50 hover:border-accent/50 transition-all duration-200 hover:scale-105"
              >
                <action.icon className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 py-4 border-t border-border/30 text-center text-xs text-muted-foreground">
          © 2026 4DSmartOps · v0.1 · Built for Indian SMEs
        </footer>
      </main>
    </div>
  );
}
