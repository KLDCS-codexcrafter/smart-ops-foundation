/**
 * geolocation-bridge.ts — Native GPS with accuracy gate.
 * Rejects readings with accuracy > threshold (default 100m).
 * Top-1%: retries up to 3x if first reading is low-accuracy.
 */

import { isNative } from './platform-engine';

export interface LocationReading {
  ok: boolean;
  latitude?: number;
  longitude?: number;
  accuracy_m?: number;
  altitude_m?: number;
  timestamp?: string;
  reason?: string;
}

const DEFAULT_ACCURACY_THRESHOLD_M = 100;
const MAX_RETRIES = 3;

interface GeolocationLike {
  getCurrentPosition: (opts: {
    enableHighAccuracy: boolean;
    timeout: number;
  }) => Promise<{
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number;
      altitude?: number | null;
    };
    timestamp: number;
  }>;
}

async function loadPlugin(): Promise<GeolocationLike | null> {
  try {
    const mod = (await import(
      /* @vite-ignore */ '@capacitor/geolocation' as unknown as string
    )) as { Geolocation?: GeolocationLike };
    return mod.Geolocation ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentLocation(
  accuracyThresholdM: number = DEFAULT_ACCURACY_THRESHOLD_M,
): Promise<LocationReading> {
  let lastReading: LocationReading | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const reading = await singleReading();
    if (!reading.ok) {
      lastReading = reading;
      continue;
    }
    if ((reading.accuracy_m ?? Infinity) <= accuracyThresholdM) return reading;
    lastReading = reading;
    await new Promise((r) => setTimeout(r, 500));
  }

  if (lastReading?.ok) {
    return {
      ...lastReading,
      reason: `Accuracy ${Math.round(lastReading.accuracy_m ?? 0)}m exceeds threshold`,
    };
  }
  return lastReading ?? { ok: false, reason: 'Unable to get location' };
}

async function singleReading(): Promise<LocationReading> {
  if (isNative()) {
    try {
      const Geolocation = await loadPlugin();
      if (Geolocation) {
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10_000,
        });
        return {
          ok: true,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
          altitude_m: pos.coords.altitude ?? undefined,
          timestamp: new Date(pos.timestamp).toISOString(),
        };
      }
    } catch (err) {
      return {
        ok: false,
        reason: err instanceof Error ? err.message : 'GPS unavailable',
      };
    }
  }

  // Web fallback — browser geolocation API
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ ok: false, reason: 'Browser geolocation unsupported' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        ok: true,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy,
        altitude_m: pos.coords.altitude ?? undefined,
        timestamp: new Date(pos.timestamp).toISOString(),
      }),
      (err) => resolve({ ok: false, reason: err.message }),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  });
}
