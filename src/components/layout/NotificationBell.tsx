/**
 * NotificationBell.tsx — Sprint P82 · Pass 2 · Block 4
 *
 * PURPOSE  Header bell + slide-over notification center.
 *          - Unread badge (mute-filtered)
 *          - Tabs: All · Unread · Mutes
 *          - Severity chips (info · success · warning · critical)
 *          - markRead + navigate(deepLink) on row click
 *          - runOpenDigests() fires ONCE per open (date-scoped, idempotent)
 *          - 380px drawer width (honest spec)
 *          - Seam footer line acknowledging the P2BB JWT seam
 * DEPENDENCIES  notification-engine · breadcrumb-memory (buildCardRoute)
 * SPEC DOC  Sprint_P82_Step2_Lovable_Prompt_v1.md
 * [JWT]    P2BB · GET /api/notifications + WS for live fan-out
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
  listNotifications, getUnreadCount, markRead, markAllRead,
  getMutes, setMute, unsetMute, runOpenDigests,
} from '@/lib/notification-engine';
import { buildCardRoute } from '@/lib/breadcrumb-memory';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import type {
  NotificationEvent, NotificationSeverity, NotificationKind,
} from '@/types/notification';
import type { CardId } from '@/types/card-entitlement';

const SEV_CLASS: Record<NotificationSeverity, string> = {
  info: 'bg-primary/15 text-primary border-primary/30',
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  critical: 'bg-destructive/15 text-destructive border-destructive/30',
};

function formatRel(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000) return 'just now';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { entityCode, userId } = useCardEntitlement();
  const [open, setOpen] = useState(false);
  const [rev, setRev] = useState(0);
  const bump = useCallback(() => setRev((r) => r + 1), []);

  // Fire digests once per open (date-scoped eventKeys make re-opens idempotent).
  useEffect(() => {
    if (!open || !entityCode) return;
    runOpenDigests(entityCode, userId);
    bump();
  }, [open, entityCode, userId, bump]);

  const items = useMemo<NotificationEvent[]>(
    () => entityCode ? listNotifications(entityCode, { userId }) : [],
    [entityCode, userId, rev],
  );
  const unread = entityCode ? getUnreadCount(entityCode, userId) : 0;
  const mutes = useMemo(
    () => entityCode ? getMutes(entityCode, userId) : [],
    [entityCode, userId, rev],
  );

  const handleClick = (n: NotificationEvent) => {
    if (entityCode) markRead(entityCode, n.id);
    setOpen(false);
    const target = n.deepLink ?? buildCardRoute(n.cardId);
    navigate(target);
  };

  const handleMuteKind = (kind: NotificationKind) => {
    if (!entityCode) return;
    setMute(entityCode, userId, { kind });
    bump();
  };

  const handleMarkAll = () => {
    if (!entityCode) return;
    markAllRead(entityCode, userId);
    bump();
  };

  const unreadItems = items.filter((n) => !n.readAt);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-mono font-semibold flex items-center justify-center">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[380px] sm:w-[380px] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm">Notifications</SheetTitle>
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleMarkAll}>
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 grid grid-cols-3">
            <TabsTrigger value="all" className="text-xs">All ({items.length})</TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">Unread ({unread})</TabsTrigger>
            <TabsTrigger value="mutes" className="text-xs">Mutes ({mutes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 overflow-y-auto mt-3">
            <NotificationList items={items} onClick={handleClick} onMute={handleMuteKind} />
          </TabsContent>
          <TabsContent value="unread" className="flex-1 overflow-y-auto mt-3">
            <NotificationList items={unreadItems} onClick={handleClick} onMute={handleMuteKind} />
          </TabsContent>
          <TabsContent value="mutes" className="flex-1 overflow-y-auto mt-3 px-4">
            {mutes.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No active mutes
              </p>
            )}
            <div className="space-y-2">
              {mutes.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-xs border rounded-lg px-3 py-2">
                  <div className="font-mono truncate">
                    <span className="text-muted-foreground">kind:</span> {m.kind ?? 'any'}
                    {m.source && <> · <span className="text-muted-foreground">src:</span> {m.source}</>}
                  </div>
                  <Button
                    variant="ghost" size="sm" className="h-6 px-2"
                    onClick={() => { if (entityCode) { unsetMute(entityCode, userId, m.id); bump(); } }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t px-4 py-2 text-[10px] text-muted-foreground text-center">
          {/* P82 seam · server fan-out + push delivery wired in P2BB · [JWT] */}
          Local notifications · live fan-out arrives with P2BB
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface ListProps {
  items: NotificationEvent[];
  onClick: (n: NotificationEvent) => void;
  onMute: (kind: NotificationKind) => void;
}

function NotificationList({ items, onClick, onMute }: ListProps) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-8">Nothing here</p>;
  }
  // Group by cardId for the bell row UI.
  const groups = items.reduce<Record<string, NotificationEvent[]>>((acc, n) => {
    const k = n.cardId as string;
    (acc[k] ||= []).push(n);
    return acc;
  }, {});
  return (
    <div className="space-y-4 pb-4">
      {Object.entries(groups).map(([cardId, rows]) => (
        <div key={cardId}>
          <div className="px-4 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
            {cardId}
          </div>
          {rows.map((n) => (
            <div
              key={n.id}
              className={`group px-4 py-2 border-b hover:bg-accent/40 transition-colors ${!n.readAt ? 'bg-accent/20' : ''}`}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => onClick(n)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 capitalize ${SEV_CLASS[n.severity]}`}>
                      {n.severity}
                    </Badge>
                    {!n.readAt && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                  <p className="text-sm font-medium truncate">{n.title}</p>
                  {n.body && (
                    <p className="text-[11px] text-muted-foreground truncate">{n.body}</p>
                  )}
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                    {formatRel(n.createdAt)}
                  </p>
                </button>
                <Button
                  variant="ghost" size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Mute this kind"
                  onClick={(e) => { e.stopPropagation(); onMute(n.kind); }}
                >
                  <BellOff className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default NotificationBell;
