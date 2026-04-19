/**
 * platform-engine.ts — Platform detection utilities.
 * Pure functions. No Capacitor imports here — we check globals at runtime.
 * This keeps the web build free of native dependencies.
 */

export type PlatformKind = 'web' | 'pwa' | 'ios' | 'android' | 'unknown';

export interface PlatformInfo {
  kind: PlatformKind;
  is_native: boolean;
  is_ios: boolean;
  is_android: boolean;
  is_pwa: boolean; // installed as PWA (display-mode: standalone)
  is_web: boolean; // plain browser, not installed
  user_agent: string;
}

function hasCapacitor(): boolean {
  if (typeof window === 'undefined') return false;
  // Capacitor injects a global when running inside a native web-view
  return (
    (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.() === true
  );
}

function getCapacitorPlatform(): string | null {
  if (typeof window === 'undefined') return null;
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  return cap?.getPlatform?.() ?? null;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

export function getPlatform(): PlatformInfo {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isNativeP = hasCapacitor();
  const capPlatform = getCapacitorPlatform();

  const isIOSp = isNativeP ? capPlatform === 'ios' : /iPhone|iPad|iPod/i.test(ua);
  const isAndroidP = isNativeP ? capPlatform === 'android' : /Android/i.test(ua);
  const isPWAp = !isNativeP && isStandaloneDisplay();

  let kind: PlatformKind = 'unknown';
  if (isNativeP && isIOSp) kind = 'ios';
  else if (isNativeP && isAndroidP) kind = 'android';
  else if (isPWAp) kind = 'pwa';
  else if (typeof window !== 'undefined') kind = 'web';

  return {
    kind,
    is_native: isNativeP,
    is_ios: isIOSp,
    is_android: isAndroidP,
    is_pwa: isPWAp,
    is_web: kind === 'web',
    user_agent: ua,
  };
}

/** Convenience helpers. */
export function isNative(): boolean {
  return getPlatform().is_native;
}
export function isIOS(): boolean {
  return getPlatform().is_ios;
}
export function isAndroid(): boolean {
  return getPlatform().is_android;
}
export function isPWA(): boolean {
  return getPlatform().is_pwa;
}

/** Tailwind-friendly class suffix for platform-specific styling. */
export function platformClass(): string {
  const p = getPlatform();
  if (p.is_ios) return 'platform-ios';
  if (p.is_android) return 'platform-android';
  if (p.is_pwa) return 'platform-pwa';
  return 'platform-web';
}
