/**
 * StorageQuotaIndicator — Header pill showing localStorage usage tier.
 * Sprint T-Phase-1.2.5h-b2 · Card #2.5
 *
 * Click to open dialog with top-10 largest keys + per-key Archive button.
 */
// i18n: Sprint T-Phase-1.2.5h-c2-fix · minimum-viable migration
import { useState } from 'react';
import { Database, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useStorageQuota } from '@/hooks/useStorageQuota';
import { archiveKey, formatBytes, type StorageUsage } from '@/lib/storage-quota-engine';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n-engine';

const TIER_CLASSES: Record<StorageUsage['tier'], string> = {
  green:        'bg-success/10 text-success border-success/30',
  amber:        'bg-warning/10 text-warning border-warning/30',
  red:          'bg-destructive/10 text-destructive border-destructive/40',
  block_create: 'bg-destructive/15 text-destructive border-destructive/50',
  block_all:    'bg-destructive/20 text-destructive border-destructive/60',
};

const TIER_LABELS: Record<StorageUsage['tier'], string> = {
  green:        'Storage healthy',
  amber:        'Storage filling — consider archiving',
  red:          'Storage near full — archive recommended',
  block_create: 'New voucher creation blocked — archive to resume',
  block_all:    'All writes blocked — archive immediately',
};

export function StorageQuotaIndicator() {
  const t = useT();
  const usage = useStorageQuota();
  const [open, setOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const handleArchive = (key: string) => {
    try {
      const result = archiveKey(key, 100);
      toast.success(`Archived ${result.archivedItems} items · freed ${formatBytes(result.freedBytes)}`);
      setRefreshTick(t => t + 1);
    } catch (e) {
      toast.error(`Archive failed: ${e instanceof Error ? e.message : 'unknown'}`);
    }
  };

  const tierClass = TIER_CLASSES[usage.tier];
  const tierLabel = TIER_LABELS[usage.tier];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <button
              type="button"
              className={`hidden lg:inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-mono shrink-0 transition ${tierClass}`}
              aria-label={tierLabel}
            >
              <Database className="h-3 w-3" />
              <span>{usage.pct.toFixed(0)}%</span>
              {(usage.tier === 'block_create' || usage.tier === 'block_all') && (
                <AlertTriangle className="h-3 w-3" />
              )}
            </button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom"><p className="text-xs">{tierLabel}</p></TooltipContent>
      </Tooltip>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('common.storage', 'Storage Usage')} · {usage.pct.toFixed(1)}% of {formatBytes(usage.quota_bytes)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3" key={refreshTick}>
          <div className={`p-3 rounded-md border text-xs ${tierClass}`}>
            <div className="font-semibold">{tierLabel}</div>
            <div className="text-muted-foreground mt-1">
              Used: {formatBytes(usage.used_bytes)} · Tier: <span className="font-mono">{usage.tier}</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold mb-2 text-muted-foreground">Top 10 Largest Keys</div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {usage.top_keys.map(k => (
                <div key={k.key} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border border-border/50 bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono truncate">{k.key}</div>
                    <div className="text-[10px] text-muted-foreground">{formatBytes(k.bytes)}</div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                    onClick={() => handleArchive(k.key)}>
                    <Download className="h-3 w-3 mr-1" />
                    Archive
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Audit trail writes are always allowed regardless of quota tier (MCA Rule 3(1)).
            Archive downloads a JSON of the key, then truncates the live store to the last 100 entries.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
