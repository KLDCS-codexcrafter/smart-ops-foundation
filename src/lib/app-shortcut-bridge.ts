/**
 * app-shortcut-bridge.ts — Update home-screen badge + app icon shortcuts.
 * Badge count auto-reflects offline-queue size or pending-order count.
 * iOS + Android 8+ supported. Web is a no-op.
 */

import { isNative } from './platform-engine';

interface BadgeLike {
  set: (opts: { count: number }) => Promise<void>;
  clear: () => Promise<void>;
}

async function loadBadgePlugin(): Promise<BadgeLike | null> {
  try {
    const pkg = '@capacitor-community/badge';
    const mod = (await import(/* @vite-ignore */ pkg)) as { Badge?: BadgeLike };
    return mod.Badge ?? null;
  } catch {
    return null;
  }
}

/** Set numeric badge on app icon. 0 clears it. */
export async function setAppBadgeCount(count: number): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const Badge = await loadBadgePlugin();
    if (!Badge) return false;
    if (count > 0) await Badge.set({ count });
    else await Badge.clear();
    return true;
  } catch {
    return false;
  }
}

/** Clear badge (shorthand). */
export async function clearAppBadge(): Promise<boolean> {
  return setAppBadgeCount(0);
}

/** Update a dynamic app-icon shortcut (long-press menu). */
export interface AppShortcut {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

export async function setDynamicShortcuts(shortcuts: AppShortcut[]): Promise<boolean> {
  if (!isNative()) return false;
  try {
    // Bridge ships in 14c; platform shortcut registration lives in
    // android/AndroidManifest.xml + ios/Info.plist. Dynamic update plugins
    // (capacitor-plugin-dynamic-shortcuts) can be added later.
    void shortcuts;
    return false;
  } catch {
    return false;
  }
}
