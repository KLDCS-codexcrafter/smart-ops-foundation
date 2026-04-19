/**
 * DepartmentSwitcher.tsx — Dropdown in ERPHeader for jumping across cards
 * Shows only cards user can access (via useCardEntitlement).
 * Each row has mini-stats (pulled from localStorage stores).
 * Keyboard: Ctrl+Shift+D opens.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid3X3, ChevronDown, Lock, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { applications, type AppDefinition } from '@/components/operix-core/applications';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { buildCardRoute } from '@/lib/breadcrumb-memory';
import type { CardId } from '@/types/card-entitlement';

function getCardStats(cardId: CardId): string {
  try {
    if (cardId === 'distributor-hub') {
      const raw = localStorage.getItem(`erp_credit_increase_requests_SMRT`);
      const list = raw ? (JSON.parse(raw) as unknown[]) : [];
      const pending = list.filter((r: unknown) =>
        (r as { status?: string }).status === 'submitted',
      ).length;
      return pending > 0 ? `${pending} pending approvals` : 'all clear';
    }
    if (cardId === 'receivx') return 'outstanding AR';
    if (cardId === 'finecore') return 'ledger open';
    if (cardId === 'salesx') return 'pipeline today';
    if (cardId === 'peoplepay') return 'payroll cycle';
    return '';
  } catch { return ''; }
}

export function DepartmentSwitcher() {
  const navigate = useNavigate();
  const { allowedCards, getStatus } = useCardEntitlement();
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const allowedSet = new Set<string>(allowedCards);
    return applications.map((app: AppDefinition) => ({
      app,
      allowed: allowedSet.has(app.id),
      status: getStatus(app.id as CardId),
      stat: getCardStats(app.id as CardId),
    })).sort((a, b) => {
      if (a.allowed && !b.allowed) return -1;
      if (!a.allowed && b.allowed) return 1;
      return a.app.name.localeCompare(b.app.name);
    });
  }, [allowedCards, getStatus]);

  const go = (cardId: CardId) => {
    setOpen(false);
    navigate(buildCardRoute(cardId));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5" aria-label="Switch department">
          <Grid3X3 className="h-4 w-4" />
          <span className="hidden md:inline text-xs">Switch</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <p className="text-sm font-semibold">Jump to a department</p>
          <p className="text-[11px] text-muted-foreground">Ctrl+Shift+D · shows only your cards</p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {rows.map(({ app, allowed, status, stat }) => (
            <button
              key={app.id}
              type="button"
              onClick={() => allowed && go(app.id as CardId)}
              disabled={!allowed}
              className={`w-full text-left px-3 py-2 border-b text-sm transition-colors ${
                allowed
                  ? 'hover:bg-indigo-500/10 cursor-pointer'
                  : 'opacity-55 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{app.name}</p>
                  {stat && (
                    <p className="text-[11px] text-muted-foreground truncate">{stat}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {status === 'trial' && <Badge variant="outline" className="text-[9px] h-4 px-1">Trial</Badge>}
                  {status === 'add_on_available' && <Badge variant="outline" className="text-[9px] h-4 px-1">Add-on</Badge>}
                  {status === 'locked' && <Lock className="h-3 w-3 text-muted-foreground" />}
                  {status === 'expired' && <Clock className="h-3 w-3 text-amber-500" />}
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DepartmentSwitcher;
