/**
 * UpdateAvailableBanner.tsx — Prompt user to refresh when SW detects update
 * Closes 14a gap: updateAvailable state was exposed but not surfaced in UI.
 */

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subscribe } from '@/lib/service-worker-setup';

export function UpdateAvailableBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsub = subscribe((state) => {
      if (state.updateAvailable && !dismissed) setShow(true);
    });
    return unsub;
  }, [dismissed]);

  const refresh = () => {
    window.location.reload();
  };

  const dismiss = () => {
    setDismissed(true);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed top-14 left-3 right-3 md:left-auto md:right-4 md:w-80 z-50 bg-blue-600 text-white rounded-lg shadow-lg p-3 flex items-center gap-3 animate-in slide-in-from-top">
      <RefreshCw className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">New version available</p>
        <p className="text-xs opacity-80">Refresh to get the latest features</p>
      </div>
      <Button size="sm" variant="secondary" onClick={refresh}>
        Refresh
      </Button>
      <button
        type="button"
        onClick={dismiss}
        className="opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default UpdateAvailableBanner;
