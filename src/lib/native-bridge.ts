/**
 * native-bridge.ts — Abstract over native vs web APIs.
 *
 * Strategy: lazily import Capacitor plugins so the web build stays small.
 * If Capacitor is present, use it; otherwise fall back to web equivalents.
 *
 * Top-1%: every method is async-first + returns graceful fallback on failure.
 */

import { isNative } from './platform-engine';

// ─── Preferences (persistent key-value, survives app kill on native) ───

export async function prefGet(key: string): Promise<string | null> {
  if (isNative()) {
    try {
      // [JWT] n/a — native preferences API
      const mod = await import(/* @vite-ignore */ '@capacitor/preferences');
      const result = await mod.Preferences.get({ key });
      return result.value ?? null;
    } catch {
      /* fall through to web */
    }
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function prefSet(key: string, value: string): Promise<void> {
  if (isNative()) {
    try {
      const mod = await import(/* @vite-ignore */ '@capacitor/preferences');
      await mod.Preferences.set({ key, value });
      return;
    } catch {
      /* fall through */
    }
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export async function prefRemove(key: string): Promise<void> {
  if (isNative()) {
    try {
      const mod = await import(/* @vite-ignore */ '@capacitor/preferences');
      await mod.Preferences.remove({ key });
      return;
    } catch {
      /* fall through */
    }
  }
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ─── Device info ───

export interface DeviceInfo {
  platform: string;
  model: string;
  os_version: string;
  app_version: string;
  uuid: string | null;
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  if (isNative()) {
    try {
      const mod = await import(/* @vite-ignore */ '@capacitor/device');
      const info = await mod.Device.getInfo();
      const id = await mod.Device.getId();
      return {
        platform: info.platform,
        model: info.model,
        os_version: info.osVersion ?? 'unknown',
        app_version: info.webViewVersion ?? 'unknown',
        uuid: (id as unknown as { identifier?: string }).identifier ?? null,
      };
    } catch {
      /* fall through */
    }
  }
  return {
    platform: 'web',
    model: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    os_version: 'unknown',
    app_version: 'web',
    uuid: null,
  };
}

// ─── App lifecycle ───

type ResumeListener = () => void;
const resumeListeners = new Set<ResumeListener>();
let resumeHookAttached = false;

export function onAppResume(listener: ResumeListener): () => void {
  resumeListeners.add(listener);
  // Set up the native hook lazily on first subscription
  if (!resumeHookAttached) {
    resumeHookAttached = true;
    void attachResumeHook();
  }
  return () => {
    resumeListeners.delete(listener);
  };
}

async function attachResumeHook(): Promise<void> {
  if (isNative()) {
    try {
      const mod = await import(/* @vite-ignore */ '@capacitor/app');
      mod.App.addListener('appStateChange', (state: { isActive: boolean }) => {
        if (state.isActive) resumeListeners.forEach((l) => l());
      });
      return;
    } catch {
      /* fall through */
    }
  }
  // Web fallback: visibilitychange event
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        resumeListeners.forEach((l) => l());
      }
    });
  }
}

// ─── Splash screen (native only; no-op on web) ───

export async function hideSplashScreen(): Promise<void> {
  if (!isNative()) return;
  try {
    const mod = await import(/* @vite-ignore */ '@capacitor/splash-screen');
    await mod.SplashScreen.hide();
  } catch {
    /* ignore */
  }
}
