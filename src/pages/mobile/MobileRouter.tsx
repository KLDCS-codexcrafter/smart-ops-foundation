/**
 * MobileRouter.tsx — Universal mobile shell.
 * Mounted at /mobile/* — handles login gate + home routing + install prompt.
 * Auto-detects role from session and routes accordingly.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { InstallPromptBanner } from '@/components/mobile/InstallPromptBanner';
import { UpdateAvailableBanner } from '@/components/mobile/UpdateAvailableBanner';
import {
  registerServiceWorker,
  triggerQueueReplay,
  subscribe,
} from '@/lib/service-worker-setup';
import {
  replayableEntries,
  markRetryFailure,
} from '@/lib/offline-queue-engine';
import { hideSplashScreen, onAppResume } from '@/lib/native-bridge';
import { logMobileAudit } from '@/lib/mobile-audit';
import { PushPermissionGate } from '@/components/mobile/PushPermissionGate';
import { registerForPush, onPushTapped } from '@/lib/push-notification-bridge';
import { setAppBadgeCount } from '@/lib/app-shortcut-bridge';
import { getQueueSize } from '@/lib/offline-queue-engine';
import MobileLogin from './MobileLogin';
import MobileHome from './MobileHome';

export interface MobileSession {
  role: 'distributor' | 'customer' | 'unknown';
  user_id: string | null;
  display_name: string;
  entity_code: string;
  plan_tier: 'trial' | 'starter' | 'growth' | 'enterprise';
}

function readSession(): MobileSession | null {
  try {
    // [JWT] GET /api/mobile/auth/session
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch {
    return null;
  }
}

/** Replay queued writes — placeholder; real execution per consumer in 14b/14c. */
function replayQueueNow(): void {
  const entries = replayableEntries();
  for (const entry of entries) {
    // For 14a we just no-op; future sprints attach handlers per kind.
    if (entry.retry_count >= 5) {
      markRetryFailure(entry.id, 'max-retries');
    }
  }
}

export default function MobileRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<MobileSession | null>(readSession());

  // Register SW on mount
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  // Sprint 14b — Hide native splash + replay queue on app resume
  useEffect(() => {
    void hideSplashScreen();
    const unsub = onAppResume(() => {
      triggerQueueReplay();
      replayQueueNow();
    });
    return unsub;
  }, []);

  // Sprint 14b — log mobile session_start once per session
  // Sprint 14c — also register for push + handle deep-link taps
  useEffect(() => {
    if (session && session.role !== 'unknown' && session.user_id) {
      logMobileAudit({
        entityCode: session.entity_code,
        userId: session.user_id,
        userName: session.display_name,
        role: session.role,
        action: 'card_open',
        refType: 'mobile_session',
        refLabel: `Mobile session started (${session.role})`,
      });

      void registerForPush();
      const unsub = onPushTapped((payload) => {
        if (payload.deep_link) navigate(payload.deep_link);
        else if (payload.order_id) {
          navigate(`/erp/distributor/orders/${payload.order_id}`);
        }
      });
      return unsub;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user_id]);

  // Sprint 14c — keep app icon badge in sync with offline queue size
  useEffect(() => {
    const interval = setInterval(() => {
      void setAppBadgeCount(getQueueSize());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Listen for online events to trigger queue replay
  useEffect(() => {
    const unsub = subscribe((state) => {
      if (state.online) {
        triggerQueueReplay();
        replayQueueNow();
      }
    });
    return unsub;
  }, []);

  // Login gate
  useEffect(() => {
    const s = readSession();
    setSession(s);
    if (!s && location.pathname !== '/mobile/login') {
      navigate('/mobile/login', { replace: true });
    } else if (s && location.pathname === '/mobile/login') {
      navigate('/mobile/home', { replace: true });
    } else if (location.pathname === '/mobile' || location.pathname === '/mobile/') {
      navigate(s ? '/mobile/home' : '/mobile/login', { replace: true });
    }
  }, [location.pathname, navigate]);

  const isLogin = location.pathname === '/mobile/login' || location.pathname === '/mobile/';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isLogin && session && (
        <header className="sticky top-0 z-40 bg-slate-900 text-white px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">OperixGo</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 uppercase tracking-wider">
              {session.plan_tier}
            </span>
          </div>
          <OfflineIndicator />
        </header>
      )}

      <main className="flex-1">
        {isLogin ? <MobileLogin /> : <MobileHome />}
      </main>

      <InstallPromptBanner />
      <UpdateAvailableBanner />
    </div>
  );
}
