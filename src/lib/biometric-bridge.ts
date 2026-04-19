/**
 * biometric-bridge.ts — Native biometric auth with password fallback
 * Uses @capacitor-community/biometric-auth on native; no-op on web.
 * Top-1%: always falls back to password flow if biometric fails/cancelled.
 */

import { isNative } from './platform-engine';

export type BiometricKind = 'face' | 'fingerprint' | 'iris' | 'none';

export interface BiometricCapability {
  available: boolean;
  kind: BiometricKind;
  reason?: string;
}

interface NativeBiometricLike {
  isAvailable: () => Promise<{ isAvailable?: boolean; biometryType?: string }>;
  verifyIdentity: (opts: {
    reason: string;
    title?: string;
    subtitle?: string;
    description?: string;
  }) => Promise<void>;
  setCredentials: (opts: { username: string; password: string; server: string }) => Promise<void>;
  getCredentials: (opts: { server: string }) => Promise<{ username?: string; password?: string }>;
}

async function loadPlugin(): Promise<NativeBiometricLike | null> {
  try {
    // [JWT] n/a — native biometric plugin (loaded only on native builds)
    const pkg = '@capacitor-community/biometric-auth';
    const mod = (await import(/* @vite-ignore */ pkg)) as {
      NativeBiometric?: NativeBiometricLike;
    };
    return mod.NativeBiometric ?? null;
  } catch {
    return null;
  }
}

export async function checkBiometricCapability(): Promise<BiometricCapability> {
  if (!isNative()) {
    return { available: false, kind: 'none', reason: 'Biometric requires native app' };
  }
  try {
    const NativeBiometric = await loadPlugin();
    if (!NativeBiometric) {
      return { available: false, kind: 'none', reason: 'Biometric plugin not installed' };
    }
    const result = await NativeBiometric.isAvailable();
    if (!result?.isAvailable) {
      return { available: false, kind: 'none', reason: 'Not enrolled on device' };
    }
    const kind: BiometricKind =
      result.biometryType === 'FACE_ID' ? 'face' :
      result.biometryType === 'TOUCH_ID' ? 'fingerprint' :
      result.biometryType === 'FINGERPRINT' ? 'fingerprint' :
      result.biometryType === 'IRIS' ? 'iris' : 'none';
    return { available: true, kind };
  } catch (err) {
    return {
      available: false,
      kind: 'none',
      reason: err instanceof Error ? err.message : 'Biometric plugin not installed',
    };
  }
}

export interface BiometricResult {
  ok: boolean;
  cancelled?: boolean;
  reason?: string;
}

export async function promptBiometric(
  reason = 'Unlock OperixGo',
): Promise<BiometricResult> {
  if (!isNative()) {
    return { ok: false, reason: 'Biometric requires native app' };
  }
  try {
    const NativeBiometric = await loadPlugin();
    if (!NativeBiometric) {
      return { ok: false, reason: 'Biometric plugin not installed' };
    }
    await NativeBiometric.verifyIdentity({
      reason,
      title: 'OperixGo',
      subtitle: "Verify it's you",
      description: reason,
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Cancelled';
    return {
      ok: false,
      cancelled: /cancel/i.test(msg),
      reason: msg,
    };
  }
}

const BIOMETRIC_SERVER = 'com.fourdsmartops.operixgo';

/** Store a biometric-protected credential (opaque token). */
export async function setBiometricToken(key: string, token: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const NativeBiometric = await loadPlugin();
    if (!NativeBiometric) return false;
    await NativeBiometric.setCredentials({
      username: key,
      password: token,
      server: BIOMETRIC_SERVER,
    });
    return true;
  } catch {
    return false;
  }
}

export async function getBiometricToken(key: string): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const NativeBiometric = await loadPlugin();
    if (!NativeBiometric) return null;
    const creds = await NativeBiometric.getCredentials({ server: BIOMETRIC_SERVER });
    if (creds?.username === key && creds.password) return creds.password;
    return null;
  } catch {
    return null;
  }
}
