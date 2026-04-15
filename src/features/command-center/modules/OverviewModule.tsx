import { format } from 'date-fns';
import {
  Building2, Terminal, Landmark, Globe,
  ArrowRight, Shield, Clock, CheckCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { CommandCenterModule } from '../pages/CommandCenterPage';

interface OverviewModuleProps {
  onNavigate: (module: CommandCenterModule) => void;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return { text: 'Good Morning', emoji: '🌅' };
  if (hour >= 12 && hour <= 16) return { text: 'Good Afternoon', emoji: '☀️' };
  if (hour >= 17 && hour <= 20) return { text: 'Good Evening', emoji: '🌆' };
  return { text: 'Working Late', emoji: '🌙' };
}

function getUserName(): string {
  try {
    // [JWT] GET /api/auth/saved-credential
    const raw = localStorage.getItem('4ds_login_credential');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.value ?? 'Admin';
    }
  } catch { /* ignore */ }
  return 'Admin';
}

const ZONE_CARDS = [
  { zone: 'Zone 1', label: 'Entity Core', progress: 100, status: 'Complete', module: 'foundation' as CommandCenterModule, color: 'text-emerald-500' },
  { zone: 'Zone 2', label: 'Geography Masters', progress: 100, status: 'Complete', module: 'geography' as CommandCenterModule, color: 'text-emerald-500' },
  { zone: 'Zone 3', label: 'FineCore Masters', progress: 60, status: 'In Progress', module: 'finecore-hub' as CommandCenterModule, color: 'text-amber-500' },
  { zone: 'Zone 4', label: 'Procure / Inventory', progress: 0, status: 'Coming Soon', module: 'overview' as CommandCenterModule, color: 'text-muted-foreground' },
];

const QUICK_ACTIONS = [
  { icon: Building2, label: 'Entity Setup', module: 'foundation' as CommandCenterModule },
  { icon: Globe, label: 'Geography', module: 'geography' as CommandCenterModule },
  { icon: Landmark, label: 'FineCore Masters', module: 'finecore-hub' as CommandCenterModule },
  { icon: Terminal, label: 'Security Console', module: 'console' as CommandCenterModule },
];

export function OverviewModule({ onNavigate }: OverviewModuleProps) {
  const greeting = getGreeting();
  const userName = getUserName();
  const today = format(new Date(), 'EEEE, dd MMMM yyyy');

  return (
    <div className="space-y-6 relative">
      {/* Orbs */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20 animate-float-1 animate-pulse-glow"
          style={{ background: 'radial-gradient(circle, hsl(var(--orb-1) / 0.3), transparent 70%)' }} />
        <div className="absolute top-1/2 -left-24 w-80 h-80 rounded-full opacity-15 animate-float-2 animate-pulse-glow"
          style={{ background: 'radial-gradient(circle, hsl(var(--orb-2) / 0.2), transparent 70%)' }} />
        <div className="absolute -bottom-20 right-1/3 w-64 h-64 rounded-full opacity-15 animate-float-3 animate-pulse-glow"
          style={{ background: 'radial-gradient(circle, hsl(var(--orb-3) / 0.25), transparent 70%)' }} />
      </div>

      {/* Greeting */}
      <div className="animate-slide-up" style={{ animationFillMode: 'backwards' }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          {greeting.emoji} {greeting.text}, {userName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{today}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Command Centre — Single Source of Truth for IT & Department Admins</p>
      </div>

      {/* Setup Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ZONE_CARDS.map((card, i) => (
          <button
            key={card.zone}
            onClick={() => card.progress > 0 ? onNavigate(card.module) : undefined}
            disabled={card.progress === 0}
            className={`group relative overflow-hidden rounded-2xl p-5 text-left w-full transition-all duration-500 animate-slide-up ${
              card.progress > 0 ? 'hover:scale-[1.02] cursor-pointer' : 'opacity-60 cursor-default'
            }`}
            style={{ animationDelay: `${0.1 + i * 0.08}s`, animationFillMode: 'backwards' }}
          >
            <div className="absolute inset-0 backdrop-blur-xl border rounded-2xl bg-card/60 border-border" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <Badge variant="outline" className="text-[10px]">{card.zone}</Badge>
                <span className={`text-xs font-medium ${card.color}`}>{card.status}</span>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{card.label}</h3>
              <Progress value={card.progress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1">{card.progress}% configured</p>
            </div>
          </button>
        ))}
      </div>

      {/* Module Health Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Masters Configured', value: '14', icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Pending Setup', value: '4', icon: Clock, color: 'text-amber-400' },
          { label: 'Users', value: '—', icon: Shield, color: 'text-cyan-400' },
          { label: 'Security Score', value: '87', icon: Shield, color: 'text-violet-400' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-4 text-center animate-slide-up" style={{ animationDelay: '0.4s', animationFillMode: 'backwards' }}>
              <Icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
              <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="glass-card rounded-2xl p-4 animate-slide-up" style={{ animationDelay: '0.5s', animationFillMode: 'backwards' }}>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => onNavigate(action.module)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/50 hover:bg-background/80 border border-border/50 hover:border-accent/50 transition-all duration-200 hover:scale-105"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">{action.label}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}