import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, GitMerge, Cpu, Landmark,
  Package, Handshake, Users, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const DEV_KEY = '4ds_dev_mode';

const SECTIONS = [
  { label: 'Welcome',     icon: Home,            route: '/welcome',             prefix: '/welcome' },
  { label: 'Tower',       icon: LayoutDashboard, route: '/tower/dashboard',     prefix: '/tower' },
  { label: 'Bridge',      icon: GitMerge,        route: '/bridge/dashboard',    prefix: '/bridge' },
  { label: 'Cmd Center',  icon: Cpu,             route: '/erp/command-center',  prefix: '/erp/command' },
  { label: 'Accounting',  icon: Landmark,        route: '/erp/accounting',      prefix: '/erp/accounting' },
  { label: 'Inventory',   icon: Package,         route: '/erp/inventory-hub',   prefix: '/erp/inventory' },
  { label: 'Partner',     icon: Handshake,       route: '/partner/dashboard',   prefix: '/partner' },
  { label: 'Customer',    icon: Users,           route: '/customer/dashboard',  prefix: '/customer' },
] as const;

export function DevNavPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [devMode, setDevMode] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setDevMode(localStorage.getItem(DEV_KEY) === 'true');
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      const next = localStorage.getItem(DEV_KEY) !== 'true';
      localStorage.setItem(DEV_KEY, String(next));
      // [JWT] localStorage only — not synced to server
      setDevMode(next);
      setOpen(false);
      toast(next ? '⚡ Dev Nav enabled' : 'Dev Nav disabled', { duration: 1500 });
    }
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!devMode) return null;

  const active = SECTIONS.find(s => location.pathname.startsWith(s.prefix));

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">

      {open && (
        <div className="w-[340px] rounded-2xl border border-white/[0.08] bg-[#0D1B2A]/95 backdrop-blur-2xl shadow-2xl p-4 animate-fade-in">

          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white/80 tracking-wide uppercase">⚡ Dev Quick-Nav</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {SECTIONS.map(s => {
              const isActive = location.pathname.startsWith(s.prefix);
              return (
                <button
                  key={s.label}
                  onClick={() => { navigate(s.route); setOpen(false); }}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl p-2.5 text-center transition-all',
                    isActive
                      ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
                      : 'bg-white/[0.04] border border-white/[0.06] text-white/60 hover:bg-white/[0.08] hover:text-white'
                  )}
                >
                  <s.icon className="h-4 w-4" />
                  <span className="text-[10px] font-medium leading-tight">{s.label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-white/30 text-center mt-3">Ctrl+Shift+D to toggle</p>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className='flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-cyan-500/40 bg-[#0D1B2A]/90 backdrop-blur-xl text-cyan-400 text-[11px] font-semibold hover:bg-cyan-500/10 transition-all shadow-lg'
      >
        <Zap className="h-3 w-3" />
        DEV
        {active && <span className="text-white/40">· {active.label}</span>}
        {open
          ? <ChevronDown className="h-3 w-3 ml-1" />
          : <ChevronUp className="h-3 w-3 ml-1" />}
      </button>
    </div>
  );
}
