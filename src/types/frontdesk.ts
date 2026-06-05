/**
 * @file        src/types/frontdesk.ts
 * @purpose     FrontDesk MVP types · Visitors · Watchlist · Contact Notes · Stats.
 * @sprint      Sprint 145 · T-FrontDesk-A6F.1 · Pillar A.6-F · Block 2
 * @decisions   DP-FD-18 ID-CAPTURE CANON · the Visitor model has NO field capable of
 *              holding a full government ID number. `idProofLast4` is max-4 engine-validated.
 *              SCOPE WALL DP-FD-1 · dispatch gate types (gate-entry · gate-pass · weighbridge)
 *              are 0-DIFF — FrontDesk owns PEOPLE, not goods.
 * @reuses      useEmployees · party-master-engine · useCurrentUser · S144 AttachDocuments.
 * @[JWT]       P2BB · kiosk self-check-in · visitor OTP · role gating.
 */

// FrontDesk · S145 · Pillar A.6-F · DP-FD-18 ID-CAPTURE CANON:
// NO field in this file may ever hold a full government ID number.

export type VisitorStatus = 'planned' | 'on_site' | 'checked_out' | 'cancelled';
export type VisitPurpose =
  | 'Vendor Meeting' | 'Interview' | 'Audit' | 'Client Demo' | 'General Visit'
  | 'Delivery' | 'Maintenance' | 'Government/Statutory';
export type IdProofType = 'aadhaar' | 'pan' | 'driving_license' | 'voter_id' | 'passport' | 'company_id' | 'none';

export interface CarriedItem {
  id: string;
  description: string;
  serialOrMark?: string | null;
  verifiedOutAt?: string | null;
  mismatch?: boolean;
}

export interface Visitor {
  id: string;
  entityId: string;
  badgeNo: string;
  name: string;
  company?: string | null;
  partyId?: string | null;
  phone?: string | null;
  purpose: VisitPurpose;
  hostEmployeeId: string;
  hostName: string;
  status: VisitorStatus;
  plannedAt?: string | null;
  expectedDurationMinutes?: number | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  photoDataUrl?: string | null;
  idProofType?: IdProofType | null;
  idProofLast4?: string | null;
  ndaDocumentId?: string | null;
  vehicleNo?: string | null;
  parkingNote?: string | null;
  itemsCarried: CarriedItem[];
  watchlistWarningShownTo?: string | null;
  gateEntryRef?: string | null;
  createdAt: string; createdByUserId: string;
  updatedAt: string;
}

export interface WatchlistEntry {
  id: string; entityId: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  reason: string;
  flaggedByUserId: string;
  flaggedAt: string;
  removedAt?: string | null; removedByUserId?: string | null;
}

export interface ContactNote {
  id: string; entityId: string;
  partyId: string;
  note: string;
  createdAt: string; createdByUserId: string;
}

export interface FrontDeskStats {
  onSiteNow: number; totalToday: number; checkedOutToday: number;
  plannedToday: number; overstays: number; watchlistHits: number;
}

export const fdVisitorsKey = (entityCode: string): string => `fd_visitors_${entityCode}`;
export const fdWatchlistKey = (entityCode: string): string => `fd_watchlist_${entityCode}`;
export const fdContactNotesKey = (entityCode: string): string => `fd_contact_notes_${entityCode}`;
export const fdBadgeSeqKey = (entityCode: string): string => `fd_badge_seq_${entityCode}`;

// ─── S146 · Meeting Rooms + Executive Desk · DP-FD-2 + DP-FD-10 ──────
export type RoomAmenity = 'Projector' | 'Whiteboard' | 'Video Conference' | 'TV Screen' | 'Mic System' | 'AC' | 'Catering';
export type RoomComputedStatus = 'available' | 'in_use' | 'reserved';   // COMPUTED from bookings · never stored

export interface MeetingRoom {
  id: string; entityId: string;
  name: string;
  floor: string;
  capacity: number;                  // > 0 · throw otherwise
  amenities: RoomAmenity[];
  isActive: boolean;
  createdAt: string; createdByUserId: string;
}

export type BookingStatus = 'booked' | 'completed' | 'cancelled';

export interface RoomBooking {
  id: string; entityId: string;
  roomId: string;
  title: string;                     // purpose/agenda line
  organizerEmployeeId: string;
  organizerName: string;             // denormalized
  visitorId?: string | null;         // visitor↔booking link
  execAppointmentId?: string | null; // set when created from Executive Desk
  startAt: string; endAt: string;    // endAt > startAt · throw otherwise
  attendeeCount?: number | null;     // warn (not throw) if > room capacity
  status: BookingStatus;
  createdAt: string; createdByUserId: string;
}

export type ExecAppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export interface ExecAppointment {   // DP-FD-10 · PA/reception-operated · pre-auth honesty
  id: string; entityId: string;
  executiveEmployeeId: string;
  executiveName: string;             // denormalized
  title: string;
  partyId?: string | null;           // external party link
  visitorId?: string | null;         // expected-visitor link
  roomBookingId?: string | null;     // optional room hold
  startAt: string; endAt: string;
  notes?: string | null;
  reminderTaskId?: string | null;    // TaskFlow task spawned for the reminder
  status: ExecAppointmentStatus;
  createdAt: string; createdByUserId: string;
}

export interface ExecutiveDayView {
  executiveEmployeeId: string; dateISO: string;
  appointments: ExecAppointment[];
  expectedVisitors: { visitorId: string; name: string; company?: string | null; plannedAt: string }[];
  roomBookings: RoomBooking[];
  reminderTasks: { taskId: string; code: string; title: string; dueDate: string | null; acknowledged: boolean }[];
}

export const fdRoomsKey = (entityCode: string): string => `fd_rooms_${entityCode}`;
export const fdBookingsKey = (entityCode: string): string => `fd_bookings_${entityCode}`;
export const fdExecAppointmentsKey = (entityCode: string): string => `fd_exec_appointments_${entityCode}`;

// ─── S147 · Mail Room + Asset Custody + Reception Diary · DP-FD-9/15/16 + DP-FD-4 ──
export type MailDirection = 'inward' | 'outward';
export type MailKind = 'letter' | 'document' | 'parcel' | 'gift';
export type DispatchMode = 'rpad' | 'speed_post' | 'courier' | 'hand_delivery';

export interface MailItem {
  id: string; entityId: string;
  /** S148 Rider 1b · TDL mailNo · IN-/OUT- + 4-digit per-entity per-direction sequence · assigned at create · backfillable */
  mailNo?: string | null;
  direction: MailDirection;
  kind: MailKind;
  description: string;
  courierName?: string | null;
  awbDocketNo?: string | null;
  // counterparty: exactly ONE of partyId / external free-text per side
  fromPartyId?: string | null; fromText?: string | null;       // inward sender · outward = company
  toEmployeeId?: string | null; toEmployeeName?: string | null; // inward addressee
  toPartyId?: string | null; toText?: string | null;            // outward recipient
  receivedAt?: string | null;       // inward
  // INWARD acknowledgment (TF-29a pattern · DP-FD-9):
  acknowledgedAt?: string | null; acknowledgedByUserId?: string | null;
  acknowledgedViaOverride?: boolean; acknowledgedOverrideReason?: string | null;
  // GIFT register fields (kind === 'gift' · CoC visibility):
  giftGiverPartyId?: string | null; giftGiverText?: string | null;
  giftDeclaredByEmployeeId?: string | null;
  giftApproxValue?: number | null;
  // OUTWARD (DP-FD-15):
  sentAt?: string | null;
  dispatchMode?: DispatchMode | null;
  proofOfDispatchDocId?: string | null;     // DocVault scan (postal receipt)
  deliveryConfirmed?: boolean;              // ages on the board until true
  deliveryConfirmedAt?: string | null;
  scanDocumentId?: string | null;           // scanned letter/document (DocVault)
  notes?: string | null;
  createdAt: string; createdByUserId: string; updatedAt: string;
}


export type CustodyStatus = 'issued' | 'returned' | 'overdue';

export interface AssetCustodyRecord {       // DP-FD-4 · asset masters READ-ONLY
  id: string; entityId: string;
  assetRefId: string;                       // id from existing asset master (read-only ref)
  assetLabel: string;                       // denormalized display
  employeeId: string; employeeName: string;
  issuedAt: string; dueBackAt?: string | null;
  returnedAt?: string | null;
  conditionOnIssue?: string | null; conditionOnReturn?: string | null;
  evidencePhotoDataUrl?: string | null;     // ≤1MB · optional
  overdueTaskId?: string | null;            // TaskFlow task when overdue flagged
  createdAt: string; createdByUserId: string;
}

export interface ReceptionDiaryEntry {      // DP-FD-16 · COMPUTED · never stored
  dateISO: string;
  visitorsIn: number; visitorsOut: number; overstaysOpen: number;
  unclaimedInwardMail: { mailId: string; description: string; toEmployeeName: string; ageDays: number }[];
  unconfirmedOutward: { mailId: string; description: string; sentAt: string; ageDays: number }[];
  custodyOverdue: { recordId: string; assetLabel: string; employeeName: string; dueBackAt: string }[];
  tomorrowsAppointments: { title: string; executiveName: string; startAt: string }[];
  expectedCouriers: { mailId: string; description: string }[];   // outward awaiting confirmation, courier mode
}

export const fdMailKey = (entityCode: string): string => `fd_mail_${entityCode}`;
export const fdCustodyKey = (entityCode: string): string => `fd_custody_${entityCode}`;

// ─── S148 Rider 1b · per-entity per-direction mail-number sequence keys ──
export const fdMailSeqInKey  = (entityCode: string): string => `fd_mail_seq_in_${entityCode}`;
export const fdMailSeqOutKey = (entityCode: string): string => `fd_mail_seq_out_${entityCode}`;

// ─── S148 Rider 1c · Contact Book Depth · VERBATIM per spec ──
export interface PartyContact {
  id: string; entityId: string;
  partyId: string;
  name: string;
  designation?: string | null; department?: string | null;
  phone?: string | null; extn?: string | null; mobile?: string | null;
  email?: string | null;
  birthday?: string | null;      // MM-DD or full ISO accepted · stored normalized
  anniversary?: string | null;
  isPrimary?: boolean;
  createdAt: string; createdByUserId: string; updatedAt: string;
}
export const fdPartyContactsKey = (entityCode: string): string => `fd_party_contacts_${entityCode}`;
export const fdLabelPrefsKey    = (entityCode: string): string => `fd_label_prefs_${entityCode}`;

export interface LabelPrefs {
  /** Label dimensions in centimeters. */
  widthCm: number; heightCm: number;
  /** A4 sheet inner dimensions in centimeters (default 21.0 × 29.7). */
  sheetWidthCm?: number; sheetHeightCm?: number;
  /** Margins in centimeters. */
  marginCm?: number; gutterCm?: number;
}

