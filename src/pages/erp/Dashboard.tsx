import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Cpu, ArrowLeft, Home, Search, Clock, Wrench, Sparkles,
  LayoutDashboard, ShoppingCart, Package, CheckSquare,
  DoorOpen, Factory, ClipboardList, TrendingUp,
  Landmark, Calculator, Users, Building2, Headphones, BarChart3, Wallet,
  Store, Heart, Truck, ShoppingBag, Network,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserProfileDropdown } from "@/components/auth/UserProfileDropdown";
import { ThemeToggle } from "@/components/theme";
import {
  applications,
  type AppDefinition,
} from "@/components/operix-core/applications";
import { onEnterNext } from '@/lib/keyboard';
import { CardTile } from "@/components/operix-core/CardTile";
import { SuspendedSessionBanner } from "@/components/layout/SuspendedSessionBanner";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { CrossCardSearch } from "@/components/layout/CrossCardSearch";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCardEntitlement } from "@/hooks/useCardEntitlement";
import { topCardsForUser } from "@/lib/card-frequency-tracker";


// ── Icon lookup map ──────────────────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, ShoppingCart, Package, CheckSquare,
  DoorOpen, Factory, Wrench, ClipboardList, TrendingUp,
  Landmark, Calculator, Users, Building2, Headphones, BarChart3, Wallet,
  Store, Heart, Truck, ShoppingBag, Network,
};

// ── Swim lanes ───────────────────────────────────────────────────────────────
const LANES: Array<{
  id: string;
  label: string;
  borderColor: string;
  labelColor: string;
  ids: string[];
}> = [
  {
    id: 'management',
    label: 'Top management',
    borderColor: 'border-l-sky-500',
    labelColor: 'text-sky-600 dark:text-sky-400',
    ids: ['insightx', 'command-center'],
  },
  {
    id: 'operations',
    label: 'Operations',
    borderColor: 'border-l-cyan-500',
    labelColor: 'text-cyan-600 dark:text-cyan-400',
    ids: ['procure360', 'inventory-hub', 'gateflow', 'production', 'maintainpro', 'qulicheak', 'requestx'],
  },
  {
    id: 'finance',
    label: 'Finance',
    borderColor: 'border-l-indigo-500',
    labelColor: 'text-indigo-600 dark:text-indigo-400',
    ids: ['finecore', 'payout', 'receivx'],
  },
  {
    id: 'sales',
    label: 'Sales',
    borderColor: 'border-l-amber-500',
    labelColor: 'text-amber-600 dark:text-amber-400',
    ids: ['salesx', 'distributor-hub', 'customer-hub', 'storex', 'unicomm'],
  },
  {
    id: 'people',
    label: 'People',
    borderColor: 'border-l-violet-500',
    labelColor: 'text-violet-600 dark:text-violet-400',
    ids: ['peoplepay'],
  },
  {
    id: 'support',
    label: 'Support & back office',
    borderColor: 'border-l-slate-400',
    labelColor: 'text-slate-500 dark:text-slate-400',
    ids: ['dispatch-hub', 'backoffice', 'servicedesk'],
  },
];

// ── Greeting helper (same as Welcome.tsx) ────────────────────────────────────
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
      return parsed.value ?? "there";
    }
  } catch { /* ignore */ }
  return "there";
}

// ── Prefetch map for hover-based code splitting ───────────────────────────────
const PREFETCH_MAP: Record<string, () => Promise<unknown>> = {
  '/erp/finecore':       () => import('@/pages/erp/finecore/FinCorePage'),
  '/erp/pay-hub':        () => import('@/features/pay-hub/PayHubPage'),
  '/erp/salesx':         () => import('@/features/salesx/SalesXPage'),
  '/erp/command-center': () => import('@/features/command-center/pages/CommandCenterPage'),
};

// ── App Card ─────────────────────────────────────────────────────────────────
function AppCard({ app }: { app: AppDefinition }) {
  const navigate = useNavigate();
  const IconComponent = ICON_MAP[app.icon] ?? LayoutDashboard;
  const isLive = !app.status;

  function handleClick() {
    if (app.status === 'coming_soon') return;
    navigate(app.route);
  }

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => { if (!app.status) PREFETCH_MAP[app.route]?.(); }}
      className={[
        "group relative overflow-hidden rounded-2xl p-5 text-left w-full transition-all duration-300",
        "bg-card/60 backdrop-blur-xl border border-border",
        app.status === "coming_soon"
          ? "opacity-60 cursor-default"
          : "hover:scale-[1.02] hover:border-primary/40 cursor-pointer",
      ].join(" ")}
    >
      {app.status === "coming_soon" && (
        <span className="absolute top-3 right-3 z-20 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          <Clock className="h-3 w-3" />
          Coming Soon
        </span>
      )}
      {app.status === "wip" && (
        <span className="absolute top-3 right-3 z-20 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/20 text-warning border border-warning/30">
          <Wrench className="h-3 w-3" />
          In Progress
        </span>
      )}

      <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
        <IconComponent className="h-5 w-5 text-primary" />
      </div>

      <div className="mb-2">
        <h3 className="text-sm font-semibold text-foreground leading-tight">
          {app.name}
        </h3>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {app.description}
      </p>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function ErpDashboardPanel() { return <ErpDashboard />; }
export default function ErpDashboard() {
  const navigate = useNavigate();
  const greeting = getGreeting();
  const userName = getUserName();
  const { entityCode, userId, allowedCards } = useCardEntitlement();

  const [search, setSearch] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useKeyboardShortcuts({
    onPalette: () => setPaletteOpen(true),
    onSearch: () => setSearchOpen(true),
    onDashboard: () => navigate('/erp/dashboard'),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return applications;
    return applications.filter((app) =>
      app.name.toLowerCase().includes(q) ||
      app.description.toLowerCase().includes(q)
    );
  }, [search]);

  // Frequently used lane — top 4 cards by audit frequency
  const frequentApps = useMemo(() => {
    const allowedSet = new Set<string>(allowedCards);
    const top = topCardsForUser(entityCode, userId, 4);
    const map = new Map(applications.map(a => [a.id, a]));
    return top
      .map(id => map.get(id))
      .filter((a): a is AppDefinition => !!a && allowedSet.has(a.id));
  }, [entityCode, userId, allowedCards]);

  return (
    <div data-keyboard-form className="min-h-screen bg-background overflow-hidden relative">
      {/* Background Orbs */}
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

      {/* Sticky Header */}
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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/welcome")}>
              <Home className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserProfileDropdown variant="dashboard" />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {greeting.emoji} {greeting.text}, {userName}
          </h1>
          <p className="text-lg font-semibold text-primary mt-1">
            Operix — Udyam Kendra Prism Nexus
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Your business operations hub. Select a module to get started.
          </p>
        </div>

        {/* Stage 3b — Suspended sessions banner */}
        <div className="mb-4">
          <SuspendedSessionBanner />
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search modules... (Ctrl+K palette · Ctrl+Shift+F universal)"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Stage 3b — Frequently used lane (top 4 by audit frequency) */}
        {!search && frequentApps.length > 0 && (
          <section className="mb-8 pl-4 border-l-4 border-l-indigo-500">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <Sparkles className="h-3 w-3" />
              Frequently used
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {frequentApps.map((app, i) => (
                <div
                  key={`freq-${app.id}`}
                  className="animate-fade-in"
                  style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "backwards" }}
                >
                  <CardTile app={app} />
                </div>
              ))}
            </div>
          </section>
        )}

        {(() => {
          const appMap = new Map(filtered.map(a => [a.id, a]));
          const activeLanes = LANES.map(lane => ({
            ...lane,
            apps: lane.ids.map(id => appMap.get(id)).filter(Boolean) as AppDefinition[],
          })).filter(lane => lane.apps.length > 0);

          if (activeLanes.length === 0) {
            return (
              <p className="text-center text-muted-foreground py-16">
                No modules match your search.
              </p>
            );
          }

          return (
            <div className="space-y-8">
              {activeLanes.map((lane) => (
                <section key={lane.id} className={`pl-4 border-l-4 ${lane.borderColor}`}>
                  <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${lane.labelColor}`}>
                    {lane.label}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {lane.apps.map((app, i) => (
                      <div
                        key={app.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${i * 0.04}s`, animationFillMode: "backwards" }}
                      >
                        <AppCard app={app} />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          );
        })()}

        <footer className="mt-12 py-4 border-t border-border/30 text-center text-xs text-muted-foreground">
          © 2026 4DSmartOps · Operix · Built for Indian SMEs
        </footer>
      </main>

      {/* Stage 3b — global overlays */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <CrossCardSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
