/**
 * @file     RecentActivityStrip.tsx
 * @purpose  Surface last 10 user activities from cross-card-activity-engine.
 *           Replaces the missing "Recently Edited" list on Overview.
 * @sprint   T-H1.5-C-S2
 * @finding  CC-008
 */
import { Clock, ArrowRight } from 'lucide-react';
import { readActivity } from '@/lib/cross-card-activity-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { formatDistanceToNow } from 'date-fns';

function getUserId(): string {
  try {
    // [JWT] GET /api/auth/current-user
    const raw = localStorage.getItem('erp_current_user');
    if (!raw) return 'anonymous';
    const parsed = JSON.parse(raw) as { id?: string; userId?: string };
    return parsed.id ?? parsed.userId ?? 'anonymous';
  } catch { return 'anonymous'; }
}

export function RecentActivityStrip() {
  const { entityCode } = useEntityCode();
  const userId = getUserId();
  const items = entityCode ? readActivity(entityCode, userId).slice(0, 10) : [];

  if (items.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Activity</p>
        <p className="text-xs text-muted-foreground">No activity yet. Start by opening a master from the sidebar.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</p>
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.id} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-foreground truncate">{item.title}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(item.last_touched_at), { addSuffix: true })}
              </span>
              <a href={item.deep_link} className="text-primary hover:underline flex items-center gap-1">
                Open <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
