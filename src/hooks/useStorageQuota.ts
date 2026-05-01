/**
 * useStorageQuota — Polling hook for localStorage usage telemetry.
 * Sprint T-Phase-1.2.5h-b2
 */
import { useEffect, useState } from 'react';
import { getStorageUsage, type StorageUsage } from '@/lib/storage-quota-engine';

export function useStorageQuota(pollIntervalMs = 30000): StorageUsage {
  const [usage, setUsage] = useState<StorageUsage>(() => getStorageUsage());
  useEffect(() => {
    const tick = () => setUsage(getStorageUsage());
    const id = setInterval(tick, pollIntervalMs);
    // Also recompute on window focus (user came back from another tab)
    window.addEventListener('focus', tick);
    return () => { clearInterval(id); window.removeEventListener('focus', tick); };
  }, [pollIntervalMs]);
  return usage;
}
