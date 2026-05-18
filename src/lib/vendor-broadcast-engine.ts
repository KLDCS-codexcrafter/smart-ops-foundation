/**
 * @file        src/lib/vendor-broadcast-engine.ts
 * @sprint      T-Phase-1.A-b.2-VendorPortal-Communications-Categories
 * @decisions   D-NEW-DN · D-NEW-DU · A-b-Q3=A full broadcast with segment targeting
 * @disciplines FR-30 · FR-50 (entity-scoped) · FR-79 (engine-side construction stamping)
 * @[JWT]       POST /api/vendors/broadcasts · GET /api/vendors/broadcasts?entity={x}
 */
import type { VendorPortalNotificationType, NotificationPriority } from '@/types/vendor-portal-accounts';
import { loadPartiesByType } from '@/lib/party-master-engine';

export type BroadcastSegment = 'all_active' | 'msme_only' | 'custom_list';

export interface VendorBroadcast {
  id: string;
  entity_code: string;
  sender_id: string;
  title: string;
  message: string;
  notification_type: VendorPortalNotificationType;
  priority: NotificationPriority;
  segment: BroadcastSegment;
  custom_vendor_ids?: string[];
  target_count: number;
  sent_at: string;
}

export interface CreateBroadcastInput {
  entity_code: string;
  sender_id: string;
  title: string;
  message: string;
  notification_type?: VendorPortalNotificationType;
  priority?: NotificationPriority;
  segment: BroadcastSegment;
  custom_vendor_ids?: string[];
}

function broadcastsKey(entityCode: string): string {
  return `erp_vendor_broadcasts_${entityCode}`;
}

function loadAllBroadcasts(entityCode: string): VendorBroadcast[] {
  try {
    // [JWT] GET /api/vendors/broadcasts?entity={entityCode}
    const raw = localStorage.getItem(broadcastsKey(entityCode));
    return raw ? (JSON.parse(raw) as VendorBroadcast[]) : [];
  } catch { return []; }
}

function saveAllBroadcasts(entityCode: string, list: VendorBroadcast[]): void {
  try {
    // [JWT] POST /api/vendors/broadcasts
    localStorage.setItem(broadcastsKey(entityCode), JSON.stringify(list));
  } catch { /* noop quota */ }
}

export function resolveBroadcastTargets(
  entityCode: string,
  segment: BroadcastSegment,
  customIds?: string[],
): number {
  if (segment === 'custom_list') return customIds?.length ?? 0;
  const vendors = loadPartiesByType(entityCode, 'vendor');
  if (segment === 'all_active') {
    return vendors.filter(v => (v as { is_active?: boolean }).is_active !== false).length;
  }
  return vendors.filter(v => (v as { msme_registered?: boolean }).msme_registered === true).length;
}

export function createBroadcast(input: CreateBroadcastInput): VendorBroadcast {
  const target_count = resolveBroadcastTargets(input.entity_code, input.segment, input.custom_vendor_ids);
  const broadcast: VendorBroadcast = {
    id: `bcast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    entity_code: input.entity_code,
    sender_id: input.sender_id,
    title: input.title,
    message: input.message,
    notification_type: input.notification_type ?? 'system',
    priority: input.priority ?? 'normal',
    segment: input.segment,
    custom_vendor_ids: input.segment === 'custom_list' ? input.custom_vendor_ids : undefined,
    target_count,
    sent_at: new Date().toISOString(),
  };
  const list = loadAllBroadcasts(input.entity_code);
  list.push(broadcast);
  saveAllBroadcasts(input.entity_code, list);
  return broadcast;
}

export function listBroadcasts(entityCode: string): VendorBroadcast[] {
  return loadAllBroadcasts(entityCode).sort((a, b) => b.sent_at.localeCompare(a.sent_at));
}

export function segmentLabel(segment: BroadcastSegment): string {
  if (segment === 'all_active') return 'All Active Vendors';
  if (segment === 'msme_only') return 'MSME Vendors Only';
  return 'Custom List';
}
