/**
 * location-tracker-engine.ts — Live location + battery + offline tracker
 * Sprint T-Phase-1.1.1l-c
 *
 * Phase 1: localStorage-only. Phase 2 will sync to backend on reconnect.
 * Idempotent start/stop. Captures one breadcrumb per interval (default 60s).
 */

import {
  type LocationBreadcrumb,
  locationBreadcrumbsKey,
  MAX_BREADCRUMBS_PER_USER_DAY,
  DEFAULT_CAPTURE_INTERVAL_SECS,
  HALT_RADIUS_METERS,
  HALT_MIN_CONSECUTIVE,
  LOW_BATTERY_PCT,
  OFFLINE_TOO_LONG_MINUTES,
} from '@/types/location-breadcrumb';
import {
  type ComplianceAlert,
  type ComplianceAlertKind,
  complianceAlertsKey,
} from '@/types/compliance-alert';

interface TrackerSession {
  entityCode: string;
  userId: string;
  userName: string;
  userRole: 'salesman' | 'telecaller' | 'supervisor' | 'sales_manager';
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;
let currentSession: TrackerSession | null = null;
let lastOnlineFalseAt: number | null = null;

interface BatteryManager extends EventTarget {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}
interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

function saveList<T>(key: string, list: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* quota */ }
}

function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function readBattery(): Promise<{ pct: number | null; charging: boolean | null }> {
  try {
    const nav = navigator as NavigatorWithBattery;
    if (!nav.getBattery) return { pct: null, charging: null };
    const b = await nav.getBattery();
    return { pct: Math.round(b.level * 100), charging: b.charging };
  } catch { return { pct: null, charging: null }; }
}

function appendBreadcrumb(b: LocationBreadcrumb, entityCode: string): void {
  const key = locationBreadcrumbsKey(entityCode);
  const all = loadList<LocationBreadcrumb>(key);
  all.push(b);
  const today = b.captured_at.slice(0, 10);
  const sameUserDay = all.filter(x => x.user_id === b.user_id && x.captured_at.slice(0, 10) === today);
  if (sameUserDay.length > MAX_BREADCRUMBS_PER_USER_DAY) {
    const dropIds = new Set(sameUserDay.slice(0, sameUserDay.length - MAX_BREADCRUMBS_PER_USER_DAY).map(x => x.id));
    saveList(key, all.filter(x => !dropIds.has(x.id)));
  } else {
    saveList(key, all);
  }
}

function alreadyAlertedRecently(
  entityCode: string,
  userId: string,
  kind: ComplianceAlertKind,
  withinMinutes: number,
): boolean {
  const all = loadList<ComplianceAlert>(complianceAlertsKey(entityCode));
  const cutoff = Date.now() - withinMinutes * 60_000;
  return all.some(a =>
    a.user_id === userId
    && a.kind === kind
    && new Date(a.detected_at).getTime() > cutoff
    && a.resolved_at === null,
  );
}

function raiseAlert(
  session: TrackerSession,
  kind: ComplianceAlertKind,
  severity: ComplianceAlert['severity'],
  context: ComplianceAlert['context'],
): void {
  const now = new Date().toISOString();
  const alert: ComplianceAlert = {
    id: `ca-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entity_id: session.entityCode,
    user_id: session.userId,
    user_name: session.userName,
    user_role: session.userRole,
    kind,
    severity,
    detected_at: now,
    resolved_at: null,
    resolved_by_id: null,
    resolved_by_name: null,
    context,
    created_at: now,
  };
  const all = loadList<ComplianceAlert>(complianceAlertsKey(session.entityCode));
  all.push(alert);
  saveList(complianceAlertsKey(session.entityCode), all);
}

function checkHalt(session: TrackerSession): void {
  const all = loadList<LocationBreadcrumb>(locationBreadcrumbsKey(session.entityCode));
  const recent = all.filter(b => b.user_id === session.userId).slice(-HALT_MIN_CONSECUTIVE);
  if (recent.length < HALT_MIN_CONSECUTIVE) return;
  const first = recent[0];
  const allWithin = recent.every(b =>
    distanceMetres(first.latitude, first.longitude, b.latitude, b.longitude) <= HALT_RADIUS_METERS
  );
  if (!allWithin) return;
  if (alreadyAlertedRecently(session.entityCode, session.userId, 'halt_detected', 30)) return;
  const haltMinutes = Math.round(
    (new Date(recent[recent.length - 1].captured_at).getTime() - new Date(first.captured_at).getTime()) / 60_000,
  );
  raiseAlert(session, 'halt_detected', 'warning', {
    halt_minutes: haltMinutes,
    last_known_lat: first.latitude,
    last_known_lng: first.longitude,
  });
}

function checkBattery(session: TrackerSession, batteryPct: number | null): void {
  if (batteryPct === null) return;
  if (batteryPct >= LOW_BATTERY_PCT) return;
  if (alreadyAlertedRecently(session.entityCode, session.userId, 'low_battery', 60)) return;
  raiseAlert(session, 'low_battery', batteryPct < 5 ? 'critical' : 'warning', {
    battery_pct: batteryPct,
  });
}

function checkOffline(session: TrackerSession): void {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  if (isOnline) {
    lastOnlineFalseAt = null;
    return;
  }
  if (lastOnlineFalseAt === null) {
    lastOnlineFalseAt = Date.now();
    return;
  }
  const minsOffline = Math.floor((Date.now() - lastOnlineFalseAt) / 60_000);
  if (minsOffline < OFFLINE_TOO_LONG_MINUTES) return;
  if (alreadyAlertedRecently(session.entityCode, session.userId, 'offline_too_long', 30)) return;
  raiseAlert(session, 'offline_too_long', 'warning', { offline_minutes: minsOffline });
}

function tick(): void {
  if (!currentSession) return;
  if (typeof navigator === 'undefined' || !navigator.geolocation) return;
  const sessionAtTick = currentSession;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      if (!currentSession) return;
      const battery = await readBattery();
      const now = new Date().toISOString();
      const breadcrumb: LocationBreadcrumb = {
        id: `lb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        entity_id: sessionAtTick.entityCode,
        user_id: sessionAtTick.userId,
        user_name: sessionAtTick.userName,
        user_role: sessionAtTick.userRole,
        captured_at: now,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy_meters: pos.coords.accuracy,
        battery_pct: battery.pct,
        is_charging: battery.charging,
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        created_at: now,
      };
      appendBreadcrumb(breadcrumb, sessionAtTick.entityCode);
      checkHalt(sessionAtTick);
      checkBattery(sessionAtTick, battery.pct);
      checkOffline(sessionAtTick);
    },
    () => { /* ignore — try next tick */ },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
  );
}

export function startTracking(
  session: TrackerSession,
  intervalSecs: number = DEFAULT_CAPTURE_INTERVAL_SECS,
): void {
  if (intervalHandle !== null) return;
  currentSession = session;
  tick();
  intervalHandle = setInterval(() => { tick(); }, intervalSecs * 1000);
}

export function stopTracking(): void {
  if (intervalHandle !== null) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  currentSession = null;
  lastOnlineFalseAt = null;
}

export function isTracking(): boolean {
  return intervalHandle !== null;
}
