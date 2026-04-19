/**
 * RecentActivityDrawer.tsx — Bell icon dropdown in ERPHeader
 * Shows last 20 recent items touched across all cards.
 * Grouped by card, with deep-link on click.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Trash2, FileText, Package, User, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { readActivity, clearActivity } from '@/lib/cross-card-activity-engine';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type { CrossCardActivityItem, ActivityItemKind } from '@/types/cross-card-activity';

const KIND_ICON: Record<ActivityItemKind, React.ComponentType<{ className?: string }>> = {
  voucher: FileText, master: User, report: BarChart3,
  module: Package, document: FileText,
};

function formatRelative(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  if (delta < 60_000) return 'just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

export function RecentActivityDrawer() {
  const navigate = useNavigate();
  const { entityCode, userId } = useCardEntitlement();
  const [open, setOpen] = useState(false);
  const [revKey, setRevKey] = useState(0);

  const items = useMemo<CrossCardActivityItem[]>(
    () => readActivity(entityCode, userId),
    [entityCode, userId, revKey],
  );

  const handleClick = (item: CrossCardActivityItem) => {
    setOpen(false);
    navigate(item.deep_link);
  };

  const handleClear = () => {
    clearActivity(entityCode, userId);
    setRevKey(k => k + 1);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative" aria-label="Recent activity">
          <Bell className="h-4 w-4" />
          {items.length > 0 && (
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-3 border-b flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Recent across cards</p>
            <p className="text-[11px] text-muted-foreground">Last {items.length} items</p>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear} title="Clear">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No recent activity yet
            </p>
          )}
          {items.map(item => {
            const Icon = KIND_ICON[item.kind] ?? FileText;
            return (
              <button
                key={item.id} type="button"
                onClick={() => handleClick(item)}
                className="w-full text-left px-3 py-2 border-b hover:bg-indigo-500/5 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.card_id} · {formatRelative(item.last_touched_at)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default RecentActivityDrawer;
