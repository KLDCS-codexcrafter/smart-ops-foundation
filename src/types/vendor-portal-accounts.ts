/**
 * @file        src/types/vendor-portal-accounts.ts
 * @purpose     Multi-user vendor portal account schema · notifications · threaded messages
 * @who         Admin · Vendor primary user · Vendor sub-users
 * @when        2026-05-18 (Sprint A.2)
 * @sprint      T-Phase-1.A.2-VendorPortal-Architecture-Seeds
 * @iso         ISO 25010 Functional Suitability · Security
 * @whom        Audit Owner
 * @decisions   D-NEW-DP (craft_canvas hybrid port · multi-user accounts) ·
 *              D-NEW-DN (Vendor Portal canonical) · A-Q14=A
 * @disciplines FR-30 · FR-50 (multi-entity scope)
 * @reuses      none (pure type seed · localStorage Phase 1)
 * @[JWT]       N/A (type file · auth flow is in vendor-portal-auth-engine consumed Phase 2)
 *
 * Hybrid port from craft_canvas Supabase schema (vendor_portal_users · vendor_notifications · vendor_messages).
 * Adapted to Operix localStorage idiom · entity-scoped per FR-50.
 *
 * Sprint A.2 plants TYPES · Sprint A-c (External Portal Expansion) consumes them in actual UI.
 */

// ─── 1. VendorPortalUser ──────────────────────────────────────────

export type VendorPortalUserRole =
  | 'primary'         // primary contact · cannot be deleted while account active
  | 'admin'           // can manage sub-users
  | 'submitter'       // can submit quotes + invoices
  | 'viewer'          // read-only access
  | 'accountant'      // invoice-only access
  | 'technical';      // RFQ/technical only

/**
 * One record per vendor portal login · multi-user supports primary + sub-users.
 */
export interface VendorPortalUser {
  // Identity (4)
  id: string;
  vendor_id: string;
  entity_code: string;                  // FR-50 multi-entity scope
  email: string;

  // Profile (2)
  name: string;
  role: VendorPortalUserRole;

  // State (3)
  is_primary: boolean;                  // primary user · cannot be deleted while account active
  is_active: boolean;
  invited_by?: string;                  // admin who created this account

  // Activity (2)
  last_login?: string | null;           // ISO datetime
  login_count: number;

  // Metadata (3)
  created_at: string;
  updated_at: string;
  notes?: string;
}

export function vendorPortalUserKey(entityCode: string): string {
  return `erp_vendor_portal_users_${entityCode}`;
}

// ─── 2. VendorPortalNotification ──────────────────────────────────

export type VendorPortalNotificationType =
  | 'rfq_new'              // new RFQ available
  | 'rfq_deadline'         // RFQ deadline approaching
  | 'po_new'               // new PO received
  | 'po_status_change'     // PO acknowledged · dispatched · received
  | 'invoice_status'       // invoice matched · variance · paid
  | 'payment_received'     // payment landed
  | 'msme_43bh_alert'      // 43B(h) deadline approaching
  | 'kyc_renewal'          // compliance doc renewal needed
  | 'message_received'     // new message from buyer
  | 'system';              // generic system notification

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface VendorPortalNotification {
  // Identity (3)
  id: string;
  vendor_id: string;
  entity_code: string;

  // Content (4)
  notification_type: VendorPortalNotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;

  // Routing (2)
  action_url?: string | null;           // deep-link to vendor portal page
  related_entity_id?: string | null;    // e.g. rfq_id · po_id · invoice_id

  // State (2)
  is_read: boolean;
  read_at?: string | null;

  // Metadata (2)
  created_at: string;
  expires_at?: string | null;           // for time-bound alerts
}

export function vendorPortalNotificationKey(entityCode: string): string {
  return `erp_vendor_portal_notifications_${entityCode}`;
}

// ─── 3. VendorPortalMessage ───────────────────────────────────────

export type MessageSenderType = 'buyer' | 'vendor';

export interface VendorPortalMessage {
  // Identity (4)
  id: string;
  vendor_id: string;
  entity_code: string;
  thread_id: string | null;             // null = standalone message

  // Sender (3)
  sender_type: MessageSenderType;
  sender_id?: string;                   // buyer user id OR vendor user id
  sender_name?: string;

  // Content (3)
  subject?: string;                     // present on first message of thread · optional after
  message: string;
  attachment_url?: string;              // localStorage stub or Phase 2 Supabase URL

  // State (2)
  is_read: boolean;
  read_at?: string | null;

  // Metadata (1)
  created_at: string;
}

export function vendorPortalMessageKey(entityCode: string): string {
  return `erp_vendor_portal_messages_${entityCode}`;
}
