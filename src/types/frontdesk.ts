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
