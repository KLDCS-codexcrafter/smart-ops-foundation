/**
 * push-notification-bridge.ts — Firebase push notifications via Capacitor.
 * Top-1%: deep-link handler parses notification data → navigate to specific order.
 * Requires Firebase project + google-services.json (Android) / GoogleService-Info.plist (iOS).
 * Setup steps in README-OperixGo-Native.md.
 */

import { isNative } from './platform-engine';

export interface PushPermissionResult {
  granted: boolean;
  reason?: string;
}

export interface PushPayload {
  title: string;
  body: string;
  deep_link?: string;
  order_id?: string;
  kind?: 'order_status' | 'payment' | 'scheme' | 'general';
}

type PushListener = (payload: PushPayload) => void;
const incomingListeners = new Set<PushListener>();
const tapListeners = new Set<PushListener>();

interface PushNotificationsLike {
  requestPermissions: () => Promise<{ receive: 'granted' | 'denied' | 'prompt' }>;
  register: () => Promise<void>;
  addListener: (event: string, cb: (data: unknown) => void) => void;
}

async function loadPlugin(): Promise<PushNotificationsLike | null> {
  try {
    const mod = (await import(
      /* @vite-ignore */ '@capacitor/push-notifications' as unknown as string
    )) as { PushNotifications?: PushNotificationsLike };
    return mod.PushNotifications ?? null;
  } catch {
    return null;
  }
}

export function onPushReceived(listener: PushListener): () => void {
  incomingListeners.add(listener);
  return () => { incomingListeners.delete(listener); };
}

export function onPushTapped(listener: PushListener): () => void {
  tapListeners.add(listener);
  return () => { tapListeners.delete(listener); };
}

export async function requestPushPermission(): Promise<PushPermissionResult> {
  if (!isNative()) {
    return { granted: false, reason: 'Push requires native app' };
  }
  try {
    const PushNotifications = await loadPlugin();
    if (!PushNotifications) return { granted: false, reason: 'Push plugin not installed' };
    const result = await PushNotifications.requestPermissions();
    return { granted: result.receive === 'granted' };
  } catch (err) {
    return {
      granted: false,
      reason: err instanceof Error ? err.message : 'Permission request failed',
    };
  }
}

let registered = false;

export async function registerForPush(): Promise<void> {
  if (!isNative() || registered) return;

  try {
    const PushNotifications = await loadPlugin();
    if (!PushNotifications) return;

    await PushNotifications.register();

    PushNotifications.addListener('registration', (data: unknown) => {
      const token = (data as { value?: string })?.value;
      if (!token) return;
      try {
        // [JWT] POST /api/mobile/push/register { token }
        localStorage.setItem('opx_push_token', token);
      } catch {
        /* ignore */
      }
    });

    PushNotifications.addListener('registrationError', () => {
      /* silently ignore — push is optional */
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: unknown) => {
      const payload = parseNotification(notification);
      incomingListeners.forEach((l) => l(payload));
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: unknown) => {
      const inner = (action as { notification?: unknown })?.notification;
      const payload = parseNotification(inner);
      tapListeners.forEach((l) => l(payload));
    });

    registered = true;
  } catch {
    /* plugin not installed or failure — app continues */
  }
}

function parseNotification(raw: unknown): PushPayload {
  const r = (raw ?? {}) as {
    title?: string;
    body?: string;
    data?: Record<string, string>;
  };
  const data = r.data ?? {};
  return {
    title: r.title ?? 'OperixGo',
    body: r.body ?? '',
    deep_link: data.deep_link ?? data.deepLink,
    order_id: data.order_id ?? data.orderId,
    kind: (data.kind as PushPayload['kind']) ?? 'general',
  };
}
