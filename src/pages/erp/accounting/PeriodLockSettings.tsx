/**
 * @file     PeriodLockSettings.tsx
 * @purpose  Admin UI for setting/unsetting accounting period locks per entity.
 *           Phase 1 MVP · single date input · localStorage-backed.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Z3
 * @iso      Functional Suitability (HIGH+ year-end close admin tool)
 *           Maintainability (HIGH+ simple form · easy to evolve)
 * @whom     Founder · CFO/auditors · Phase 2 will replace with REST-backed UI
 * @depends  period-lock-engine.ts · auth-helpers.ts · useEntityCode hook
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Lock, Unlock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  getPeriodLock, setPeriodLock, type PeriodLockConfig,
} from '@/lib/period-lock-engine';
import { getCurrentUser } from '@/lib/auth-helpers';

function formatDateDisplay(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  } catch { return iso; }
}

export default function PeriodLockSettings() {
  const { entityCode } = useEntityCode();
  const [config, setConfig] = useState<PeriodLockConfig | null>(null);
  const [dateValue, setDateValue] = useState<string>('');

  const refresh = useCallback(() => {
    if (!entityCode) {
      setConfig(null);
      return;
    }
    const cfg = getPeriodLock(entityCode);
    setConfig(cfg);
    setDateValue(cfg?.lockedThrough ?? '');
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  if (!entityCode) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Select a company from the header to manage its period lock.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSave = (): void => {
    if (!dateValue) {
      toast.error('Please pick a date or use Clear Lock');
      return;
    }
    const actor = getCurrentUser();
    setPeriodLock(entityCode, dateValue, actor.id);
    toast.success(`Period locked through ${dateValue}`);
    refresh();
  };

  const handleClear = (): void => {
    const actor = getCurrentUser();
    setPeriodLock(entityCode, null, actor.id);
    toast.success('Period lock cleared');
    refresh();
  };

  const isLocked = !!config?.lockedThrough;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Period Lock Settings</h1>
        <p className="text-sm text-muted-foreground">
          Block voucher posting and back-dating beyond a chosen date for entity{' '}
          <span className="font-mono font-semibold text-foreground">{entityCode}</span>.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              {isLocked
                ? <Lock className="h-4 w-4 text-warning" />
                : <Unlock className="h-4 w-4 text-success" />}
              Current Status
            </span>
            {isLocked
              ? <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Locked</Badge>
              : <Badge variant="outline" className="bg-success/10 text-success border-success/30">Unlocked</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Locked through</span>
            <span className="font-mono font-semibold text-foreground">
              {config?.lockedThrough ?? 'No lock set'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last modified at</span>
            <span className="font-mono text-foreground">{formatDateDisplay(config?.lastModifiedAt ?? null)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last modified by</span>
            <span className="font-mono text-foreground">{config?.lastModifiedBy ?? '—'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Set / Update Lock
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lock-date">Lock through (inclusive)</Label>
            <Input
              id="lock-date"
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Vouchers dated on or before this day will be rejected at posting.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              <Lock className="h-4 w-4 mr-2" /> Save Lock
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={!isLocked}>
              <Unlock className="h-4 w-4 mr-2" /> Clear Lock
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
