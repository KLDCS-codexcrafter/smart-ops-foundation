/**
 * InstallPromptBanner.tsx — Show 'Install OperixGo' banner when browser
 * supports PWA install. Dismissal is persisted so we don't nag.
 * Top-1%: never show twice in same week after dismissal.
 */

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'opx_install_dismissed_at';
const NAG_COOLDOWN_DAYS = 7;

function shouldShow(): boolean {
  try {
    // [JWT] n/a — install dismissal stored client-side only.
    const at = localStorage.getItem(DISMISS_KEY);
    if (!at) return true;
    const days = (Date.now() - Number(at)) / 86_400_000;
    return days > NAG_COOLDOWN_DAYS;
  } catch {
    return true;
  }
}

export function InstallPromptBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      if (!shouldShow()) return;
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'dismissed') {
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    }
    setVisible(false);
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50
                 bg-slate-900 text-white rounded-lg shadow-lg p-3 flex items-center gap-3
                 animate-in slide-in-from-bottom"
    >
      <Download className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">Install OperixGo</p>
        <p className="text-xs opacity-80">Faster access · Works offline</p>
      </div>
      <Button size="sm" variant="secondary" onClick={install}>
        Install
      </Button>
      <button
        onClick={dismiss}
        className="opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default InstallPromptBanner;
