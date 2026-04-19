/**
 * OfflineIndicator.tsx — Small status chip in mobile header.
 * Shows online/offline state + pending queue count when offline.
 */

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Cloud } from 'lucide-react';
import { subscribe, type ServiceWorkerState } from '@/lib/service-worker-setup';
import { getQueueSize } from '@/lib/offline-queue-engine';

export function OfflineIndicator() {
  const [state, setState] = useState<ServiceWorkerState>({
    supported: false,
    registered: false,
    online: true,
    updateAvailable: false,
  });
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    const unsub = subscribe(setState);
    const interval = setInterval(() => setQueueSize(getQueueSize()), 2000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  if (state.online && queueSize === 0) {
    return (
      <div
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                   bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
      >
        <Wifi className="h-3 w-3" />
        <span>Online</span>
      </div>
    );
  }

  if (!state.online) {
    return (
      <div
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                   bg-amber-500/10 text-amber-600 border border-amber-500/30"
      >
        <WifiOff className="h-3 w-3" />
        <span>Offline{queueSize > 0 ? ` · ${queueSize} pending` : ''}</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                 bg-blue-500/10 text-blue-600 border border-blue-500/30"
    >
      <Cloud className="h-3 w-3 animate-pulse" />
      <span>Syncing · {queueSize}</span>
    </div>
  );
}

export default OfflineIndicator;
