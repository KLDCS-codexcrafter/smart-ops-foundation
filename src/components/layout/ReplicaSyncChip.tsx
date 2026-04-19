/**
 * ReplicaSyncChip.tsx – Small chip showing 'last synced with CC' status
 * Dropped into any card's Masters section header. Click -> resync stub.
 */

import { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ReplicaSyncChipProps {
  cardLabel: string;
  lastSyncedAt?: string | null;
  outOfSync?: boolean;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const delta = Date.now() - new Date(iso).getTime();
  if (delta < 60_000) return 'just now';
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

export function ReplicaSyncChip({
  cardLabel, lastSyncedAt, outOfSync = false,
}: ReplicaSyncChipProps) {
  const [busy, setBusy] = useState(false);

  const handleResync = async () => {
    setBusy(true);
    // [JWT] POST /api/masters/resync?card={cardLabel}
    await new Promise(r => setTimeout(r, 600));
    setBusy(false);
    toast.success(`${cardLabel} masters synced with Command Center`);
  };

  const colour = outOfSync
    ? 'text-amber-600 bg-amber-500/10 border-amber-500/30'
    : 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30';

  const Icon = outOfSync ? AlertTriangle : CheckCircle2;

  return (
    <button
      type="button"
      onClick={handleResync}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] ${colour} hover:opacity-80 transition-opacity`}
      title={outOfSync ? 'Out of sync – click to refresh' : 'In sync with Command Center'}
    >
      {busy
        ? <RefreshCw className="h-3 w-3 animate-spin" />
        : <Icon className="h-3 w-3" />}
      <span>
        {outOfSync ? 'Sync needed' : `Synced ${formatRelative(lastSyncedAt)}`}
      </span>
    </button>
  );
}

export default ReplicaSyncChip;
