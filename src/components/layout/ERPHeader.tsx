/**
 * ERPHeader.tsx — Universal 2-row ERP header
 * Used by: Command Center and all future ERP modules.
 * NOT used by: Tower, Bridge, Customer (they have their own layout headers).
 *
 * Row 1: sidebar trigger · back/fwd/home · module selector · company selector ·
 *        date picker · FY badge · search · app launcher · refresh · data dot ·
 *        notifications · dishani · language · theme · profile
 * Row 2: breadcrumb · context strip · online dot · env badge
 *
 * Phase 2 slots (reserved, not rendered):
 *   - Comparison mode toggle (needs reports)
 *   - Division/branch sub-selector (needs Foundation masters)
 *   - Alt+D keyboard shortcut to open date picker
 *   - Contextual help panel
 *   - Quick entry palette
 */
import { useState } from 'react';
import { onEnterNext } from '@/lib/keyboard';
import { useNavigate } from 'react-router-dom';
import {
  Grid3X3, RefreshCw, Sparkles, Bell, ChevronRight,
  Home, ArrowLeft, ArrowRight, Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserProfileDropdown } from '@/components/auth/UserProfileDropdown';
import { ThemeToggle } from '@/components/theme';
import { useDishani } from '@/components/ask-dishani';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem as BreadcrumbItemUI,
  BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ERPDatePicker } from '@/components/layout/ERPDatePicker';
import { ERPCompanySelector, useERPCompany, type ERPCompany } from '@/components/layout/ERPCompanySelector';

import { useGlobalDateRange, formatIndianDate } from '@/hooks/useGlobalDateRange';
import { cn } from '@/lib/utils';

export interface BreadcrumbEntry {
  label: string;
  href?: string;
}

interface ERPHeaderProps {
  // Breadcrumb — pass the trail for this page
  breadcrumbs?: BreadcrumbEntry[]; // e.g. [{label:'Command Center'},{label:'Security Console'}]
  // Module/page selector (optional — for Command Center, Foundation etc.)
  moduleOptions?: { value: string; label: string }[];
  activeModule?: string;
  onModuleChange?: (v: string) => void;
  // Companies (developer wires to API — leave empty for now)
  companies?: ERPCompany[];
  // Show/hide controls
  showDatePicker?: boolean;   // default true
  showCompany?: boolean;      // default true
}

const ENV = import.meta.env.MODE === 'production' ? 'Prod' : 'Dev';

export function ERPHeader({
  breadcrumbs = [],
  moduleOptions,
  activeModule,
  onModuleChange,
  companies = [],
  showDatePicker = true,
  showCompany = true,
}: ERPHeaderProps) {
  const navigate = useNavigate();
  const { openDishani } = useDishani();
  const dr = useGlobalDateRange();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedCompany, setSelectedCompany] = useERPCompany();

  // Listen to online/offline events
  useState(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  });

  // Context strip: Company · FY · Period
  const companyLabel = selectedCompany === 'all'
    ? 'All Companies'
    : (companies.find(c => c.id === selectedCompany)?.name ?? 'All Companies');

  const contextStrip = [
    companyLabel,
    dr.fyLabel,
    `${formatIndianDate(dr.range.from)} – ${formatIndianDate(dr.range.to)}`,
    `${dr.durationDays} days`,
  ].join(' · ');

  return (
    <div className='border-b border-border bg-card/60 backdrop-blur-xl flex-shrink-0'>
      {/* ── ROW 1 ──────────────────────────────────────── */}
      <div className='flex items-center gap-2 px-4 h-14'>

        {/* Sidebar toggle */}
        <SidebarTrigger className='shrink-0 text-muted-foreground hover:text-foreground' />

        {/* Back / Forward / Home — simplified (Phase 2: history popover) */}
        <div className='inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5 shrink-0 hidden sm:flex'>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' className='h-7 w-7 rounded-md'
                onClick={() => window.history.back()}>
                <ArrowLeft className='h-3.5 w-3.5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Back</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' className='h-7 w-7 rounded-md'
                onClick={() => window.history.forward()}>
                <ArrowRight className='h-3.5 w-3.5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Forward</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' className='h-7 w-7 rounded-md'
                onClick={() => navigate('/welcome')}>
                <Home className='h-3.5 w-3.5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Home</TooltipContent>
          </Tooltip>
        </div>

        {/* Centre: Module + Company + Date + Search */}
        <div className='flex items-center gap-2 flex-1 min-w-0'>

          {/* Module selector (Command Center, future modules) */}
          {moduleOptions && onModuleChange && activeModule && (
            <Select value={activeModule} onValueChange={onModuleChange}>
              <SelectTrigger className='w-[180px] h-8 text-xs bg-muted/30 border-border hidden sm:flex'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {moduleOptions.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Company selector */}
          {showCompany && (
            <ERPCompanySelector
              companies={companies}
              value={selectedCompany}
              onChange={setSelectedCompany}
            />
          )}

          {/* Date picker — always visible label, click to open */}
          {showDatePicker && <ERPDatePicker />}

          {/* FY badge — always visible, non-interactive */}
          <span className='hidden lg:inline-flex items-center px-2 py-1 rounded-md bg-muted/30 border border-border/50 text-[10px] text-muted-foreground font-mono shrink-0'>
            {dr.fyLabel}
          </span>

          {/* Search */}
          <div className='flex-1 max-w-xs hidden md:block' data-keyboard-form>
            <Input placeholder='Search... (Ctrl+K)' className='h-8 text-xs bg-muted/30 border-border/50' onKeyDown={onEnterNext} />
          </div>
        </div>

        {/* Right: Action icons */}
        <div className='flex items-center gap-0.5 shrink-0'>

          {/* App launcher */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' className='h-8 w-8'
                onClick={() => navigate('/erp/dashboard')}>
                <Grid3X3 className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>App Launcher</TooltipContent>
          </Tooltip>

          {/* Refresh */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' className='h-8 w-8 hidden md:flex'
                onClick={() => window.location.reload()}>
                <RefreshCw className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh (Ctrl+R)</TooltipContent>
          </Tooltip>

          {/* Data currency dot — green=fresh, amber=stale, red=offline */}
          {/* Phase 2: wire to Bridge Agent last heartbeat */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' className='h-8 w-8 hidden md:flex'>
                <Circle className='h-2.5 w-2.5 fill-emerald-500 text-emerald-500 animate-pulse' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Data fresh — synced just now</TooltipContent>
          </Tooltip>

          {/* Notification bell */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' className='h-8 w-8 relative'>
                <Bell className='h-4 w-4' />
                {/* Phase 2: wire to real notification count */}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notifications</TooltipContent>
          </Tooltip>

          {/* Ask Dishani */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant='ghost' size='icon' className='h-8 w-8 relative group'
                onClick={openDishani}>
                <Sparkles className='h-4 w-4 text-primary group-hover:scale-110 transition-transform' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ask Dishani</TooltipContent>
          </Tooltip>


          {/* Theme toggle */}
          <ThemeToggle />

          {/* User profile */}
          <UserProfileDropdown variant='app' />

          {/* Phase 2 slots — not rendered yet: */}
          {/* <QuickEntryPalette />    — needs ERP forms */}
          {/* <ContextualHelp />       — needs help content */}
        </div>
      </div>

      {/* ── ROW 2 — Breadcrumb + Context Strip + Status ─── */}
      <div className='flex items-center justify-between px-4 h-8 border-t border-border/50 bg-muted/20'>

        {/* Left: Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList className='text-xs'>
            <BreadcrumbItemUI>
              <BreadcrumbLink
                onClick={() => navigate('/welcome')}
                className='flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors'>
                <Home className='h-3 w-3' />
                <span className='hidden sm:inline'>Home</span>
              </BreadcrumbLink>
            </BreadcrumbItemUI>
            {breadcrumbs.map((crumb, i) => (
              <>
                <BreadcrumbSeparator key={`sep-${i}`}><ChevronRight className='h-3 w-3' /></BreadcrumbSeparator>
                <BreadcrumbItemUI key={`crumb-${i}`}>
                  {i < breadcrumbs.length - 1 && crumb.href ? (
                    <BreadcrumbLink
                      onClick={() => navigate(crumb.href!)}
                      className='cursor-pointer hover:text-foreground transition-colors'>
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className='text-primary font-medium'>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItemUI>
              </>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Right: Context strip + status */}
        <div className='flex items-center gap-2'>
          {/* Context strip — like Tally's period + company indicator */}
          <span className='text-[10px] text-muted-foreground hidden md:inline font-mono truncate max-w-xs'>
            {contextStrip}
          </span>
          {/* Online dot */}
          <div className='flex items-center gap-1.5'>
            <div className={cn('w-1.5 h-1.5 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-destructive')} />
            <span className='text-[10px] text-muted-foreground hidden sm:inline'>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <Badge variant='outline' className='text-[9px] text-muted-foreground/70 border-border/50 font-display font-semibold'>
            4DSmartOps
          </Badge>
          <Badge variant='outline' className={cn(
            'text-[9px] border font-mono',
            ENV === 'Prod' ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'
          )}>
            {ENV}
          </Badge>
        </div>
      </div>
    </div>
  );
}
