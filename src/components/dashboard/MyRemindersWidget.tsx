/**
 * @file        src/components/dashboard/MyRemindersWidget.tsx
 * @sprint      Sprint B1S2-R · §2.4b · R2 dashboard widget
 * @purpose     Additive lazy block on Dashboard rendering the operator's
 *              picked reminders: headline tiles prominent, threshold colours,
 *              click-through deep links, Configure modal with catalog picker.
 *              The full TaskFlow MyRemindersPage stays as the long-form view.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings2, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  getMyReminders, getUserPrefs, saveUserPrefs,
  REMINDER_CATALOG,
  type ReminderSnapshot, type UserReminderPrefs,
} from '@/lib/taskflow-reminders-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function severityClass(s: ReminderSnapshot): string {
  if (s.status === 'unavailable') return 'border-border bg-muted/30 text-muted-foreground';
  if (s.breached) {
    if ((s.count ?? 0) >= s.threshold * 3 + 1) return 'border-destructive/40 bg-destructive/10 text-destructive';
    return 'border-warning/40 bg-warning/10 text-warning';
  }
  return 'border-success/30 bg-success/10 text-success';
}

function SnapshotTile({ s, onClick }: { s: ReminderSnapshot; onClick: () => void }): JSX.Element {
  const cls = severityClass(s);
  const Icon = s.status === 'unavailable' ? AlertCircle : s.breached ? AlertTriangle : CheckCircle2;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-4 transition hover:scale-[1.01] ${cls}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider">{s.label}</div>
        <Icon className="h-4 w-4" />
      </div>
      <div className="font-mono text-2xl font-bold mt-1">
        {s.status === 'unavailable' ? '—' : s.count}
      </div>
      <div className="text-[11px] opacity-80 mt-1 line-clamp-2">
        {s.status === 'unavailable' ? (s.reason ?? 'no source') : s.description}
      </div>
    </button>
  );
}

export default function MyRemindersWidget(): JSX.Element | null {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [rev, setRev] = useState(0);
  const [openCfg, setOpenCfg] = useState(false);
  const userName = user?.name ?? user?.id ?? 'demo-user';

  const snapshots = useMemo<ReminderSnapshot[]>(() => {
    if (!entityCode) return [];
    try { return getMyReminders(entityCode, userName); } catch { return []; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityCode, userName, rev]);

  const visible = useMemo(() => {
    const prefs = entityCode ? getUserPrefs(entityCode, userName) : null;
    return snapshots.filter((s) => {
      const p = prefs?.items.find((i) => i.id === s.id);
      const show = p?.show ?? false;
      if (!show) return false;
      if (s.status === 'ok' && s.count === 0 && !s.show_zero) return false;
      return true;
    });
  }, [snapshots, entityCode, userName, /* rev triggers via snapshots */]);

  const headlineFirst = useMemo(() => {
    return [...visible].sort((a, b) => Number(b.headline) - Number(a.headline) || a.order - b.order);
  }, [visible]);

  const onClickTile = useCallback((s: ReminderSnapshot) => {
    navigate(s.deepLink);
  }, [navigate]);

  if (!entityCode) return null;
  if (headlineFirst.length === 0) {
    // Even with nothing visible, surface the Configure entry so users discover it.
    return (
      <section id="my-reminders" className="mb-8 pl-4 border-l-4 border-l-amber-500">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <Bell className="h-3 w-3" />
            My reminders
          </h2>
          <ConfigButton entityCode={entityCode} userName={userName} openCfg={openCfg} setOpenCfg={setOpenCfg} onSaved={() => setRev((r) => r + 1)} />
        </div>
        <Card className="rounded-2xl p-4 text-sm text-muted-foreground">
          No reminders are visible yet. Click Configure to add live counts to your dashboard.
        </Card>
      </section>
    );
  }

  return (
    <section id="my-reminders" className="mb-8 pl-4 border-l-4 border-l-amber-500">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
          <Bell className="h-3 w-3" />
          My reminders
        </h2>
        <ConfigButton entityCode={entityCode} userName={userName} openCfg={openCfg} setOpenCfg={setOpenCfg} onSaved={() => setRev((r) => r + 1)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {headlineFirst.map((s) => (
          <SnapshotTile key={s.id} s={s} onClick={() => onClickTile(s)} />
        ))}
      </div>
    </section>
  );
}

function ConfigButton({
  entityCode, userName, openCfg, setOpenCfg, onSaved,
}: { entityCode: string; userName: string; openCfg: boolean; setOpenCfg: (b: boolean) => void; onSaved: () => void }): JSX.Element {
  const [prefs, setPrefs] = useState<UserReminderPrefs | null>(null);

  useEffect(() => {
    if (openCfg) setPrefs(getUserPrefs(entityCode, userName));
  }, [openCfg, entityCode, userName]);

  const update = (id: string, patch: Partial<UserReminderPrefs['items'][number]>): void => {
    if (!prefs) return;
    setPrefs({ ...prefs, items: prefs.items.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  };

  const save = (): void => {
    if (!prefs) return;
    saveUserPrefs(entityCode, prefs);
    onSaved();
    setOpenCfg(false);
  };

  return (
    <Dialog open={openCfg} onOpenChange={setOpenCfg}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <Settings2 className="h-3.5 w-3.5" />
          Configure
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure My Reminders</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {prefs?.items.map((p) => {
            const cat = REMINDER_CATALOG.find((c) => c.id === p.id);
            const unavailable = cat?.source.startsWith('unavailable');
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border p-2">
                <Switch checked={p.show} onCheckedChange={(v) => update(p.id, { show: v })} disabled={unavailable} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{cat?.label ?? p.id}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {unavailable ? `unavailable: ${cat?.source.replace(/^unavailable:\s*/, '')}` : cat?.source}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.headline ? 'default' : 'outline'} className="cursor-pointer text-[10px]"
                    onClick={() => update(p.id, { headline: !p.headline })}>
                    Headline
                  </Badge>
                  <Input
                    type="number"
                    className="w-20 h-8 font-mono"
                    value={p.threshold}
                    onChange={(e) => update(p.id, { threshold: Number(e.target.value) || 0 })}
                    disabled={unavailable}
                  />
                  <label className="flex items-center gap-1 text-[11px]">
                    <input type="checkbox" checked={p.show_zero} onChange={(e) => update(p.id, { show_zero: e.target.checked })} />
                    show 0
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setOpenCfg(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
