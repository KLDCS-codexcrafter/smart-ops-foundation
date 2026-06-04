/**
 * @file        src/lib/frontdesk-engine.ts
 * @realizes    FrontDesk MVP · DP-FD-1/3/5/8/12/13/14/17/18 · visitors + contact book +
 *              items-carried + watchlist + roll-call · ID-CAPTURE CANON.
 * @sprint      Sprint 145 · T-FrontDesk-A6F.1 · Pillar A.6-F · Block 3
 * @reads-from  useEmployees-data · party-master-engine (READ-ONLY) · useCurrentUser ·
 *              audit-trail-engine.
 * @[JWT]       P2BB: kiosk self-check-in · visitor OTP · role gating.
 *
 * Scope wall DP-FD-1: NEVER touches gate-entry.ts / gate-pass.ts / weighbridge.
 * ID-CAPTURE CANON DP-FD-18: no field may hold a full ID number. Any string field
 * carrying 12+ consecutive digits throws; idProofLast4 > 4 chars throws.
 * §H 0-DIFF: approval-workflow-engine · Comply360 · push-notification-bridge UNTOUCHED.
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { loadPartiesByType, loadPartyMaster } from '@/lib/party-master-engine';
import type { Party } from '@/types/party';
import {
  type CarriedItem,
  type ContactNote,
  type FrontDeskStats,
  type IdProofType,
  type VisitPurpose,
  type Visitor,
  type VisitorStatus,
  type WatchlistEntry,
  fdBadgeSeqKey,
  fdContactNotesKey,
  fdVisitorsKey,
  fdWatchlistKey,
} from '@/types/frontdesk';

// ─── storage helpers ─────────────────────────────────────────────────
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

const PHOTO_MAX_BYTES = 1_048_576; // ≤1MB · DP-FD-18 echo
const DIGIT_RUN_RE = /\d{12,}/;     // ID-CAPTURE CANON: 12+ consecutive digits forbidden

function mkId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function nowISO(): string { return new Date().toISOString(); }

// ─── ID-CAPTURE CANON guards (DP-FD-18) ─────────────────────────────
function assertNoFullIdInStrings(obj: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string' && DIGIT_RUN_RE.test(v)) {
      throw new Error(`ID-capture canon: full ID numbers cannot be stored (field: ${k})`);
    }
  }
}
function assertIdProofLast4(last4: string | null | undefined): void {
  if (last4 == null || last4 === '') return;
  if (typeof last4 !== 'string' || last4.length > 4) {
    throw new Error('ID-capture canon: full ID numbers cannot be stored');
  }
}
function assertPhotoSize(photoDataUrl: string | null | undefined): void {
  if (!photoDataUrl) return;
  // crude byte estimate from base64 payload — sufficient for cap enforcement.
  const comma = photoDataUrl.indexOf(',');
  const b64 = comma >= 0 ? photoDataUrl.slice(comma + 1) : photoDataUrl;
  const bytes = Math.floor((b64.length * 3) / 4);
  if (bytes > PHOTO_MAX_BYTES) {
    throw new Error(`Photo too large (${bytes} bytes > ${PHOTO_MAX_BYTES} cap)`);
  }
}

// ─── badge sequence ──────────────────────────────────────────────────
function nextBadgeNo(entityCode: string): string {
  const key = fdBadgeSeqKey(entityCode);
  const seq = readJSON<number>(key, 0) + 1;
  writeJSON(key, seq);
  return `B-${String(seq).padStart(4, '0')}`;
}

// ─── visitor reads ───────────────────────────────────────────────────
export function loadVisitors(entityCode: string): Visitor[] {
  return readJSON<Visitor[]>(fdVisitorsKey(entityCode), []);
}
export function getVisitor(entityCode: string, id: string): Visitor | null {
  return loadVisitors(entityCode).find((v) => v.id === id) ?? null;
}
function saveVisitors(entityCode: string, rows: Visitor[]): void {
  writeJSON(fdVisitorsKey(entityCode), rows);
}

// ─── audit helper ────────────────────────────────────────────────────
function audit(entityCode: string, action: 'create' | 'update' | 'cancel',
               recordId: string, recordLabel: string,
               before: Record<string, unknown> | null,
               after: Record<string, unknown> | null,
               reason: string): void {
  try {
    logAudit({
      entityCode, action, entityType: 'frontdesk_event',
      recordId, recordLabel, beforeState: before, afterState: after,
      reason, sourceModule: 'frontdesk',
    });
  } catch (e) {
    console.error('[frontdesk audit]', e);
  }
}

// ─── visitor input shape ─────────────────────────────────────────────
export interface VisitorInput {
  name: string;
  company?: string | null;
  partyId?: string | null;
  phone?: string | null;
  purpose: VisitPurpose;
  hostEmployeeId: string;
  hostName: string;
  plannedAt?: string | null;
  expectedDurationMinutes?: number | null;
  photoDataUrl?: string | null;
  idProofType?: IdProofType | null;
  idProofLast4?: string | null;
  ndaDocumentId?: string | null;
  vehicleNo?: string | null;
  parkingNote?: string | null;
  itemsCarried?: CarriedItem[];
  gateEntryRef?: string | null;
}

function validateVisitorInput(input: VisitorInput): void {
  if (!input.name?.trim()) throw new Error('Visitor name is required');
  if (!input.hostEmployeeId) throw new Error('Host is required');
  if (!input.purpose) throw new Error('Purpose is required');
  assertIdProofLast4(input.idProofLast4);
  assertPhotoSize(input.photoDataUrl);
  assertNoFullIdInStrings({
    name: input.name,
    company: input.company ?? '',
    phone: input.phone ?? '',
    vehicleNo: input.vehicleNo ?? '',
    parkingNote: input.parkingNote ?? '',
    hostName: input.hostName,
  });
}

// ─── createPlannedVisitor ────────────────────────────────────────────
export function createPlannedVisitor(
  entityCode: string, createdByUserId: string, input: VisitorInput,
): Visitor {
  if (!input.plannedAt) throw new Error('plannedAt is required for planned visitors');
  validateVisitorInput(input);
  const rows = loadVisitors(entityCode);
  const v: Visitor = {
    id: mkId('vis'),
    entityId: entityCode,
    badgeNo: '',
    name: input.name.trim(),
    company: input.company ?? null,
    partyId: input.partyId ?? null,
    phone: input.phone ?? null,
    purpose: input.purpose,
    hostEmployeeId: input.hostEmployeeId,
    hostName: input.hostName,
    status: 'planned',
    plannedAt: input.plannedAt,
    expectedDurationMinutes: input.expectedDurationMinutes ?? null,
    checkInAt: null,
    checkOutAt: null,
    photoDataUrl: input.photoDataUrl ?? null,
    idProofType: input.idProofType ?? null,
    idProofLast4: input.idProofLast4 ?? null,
    ndaDocumentId: input.ndaDocumentId ?? null,
    vehicleNo: input.vehicleNo ?? null,
    parkingNote: input.parkingNote ?? null,
    itemsCarried: input.itemsCarried ?? [],
    watchlistWarningShownTo: null,
    gateEntryRef: input.gateEntryRef ?? null,
    createdAt: nowISO(),
    createdByUserId,
    updatedAt: nowISO(),
  };
  rows.push(v);
  saveVisitors(entityCode, rows);
  audit(entityCode, 'create', v.id, `Planned: ${v.name}`, null, v as unknown as Record<string, unknown>,
        'visitor.plan');
  return v;
}

export function cancelPlannedVisitor(entityCode: string, visitorId: string): Visitor {
  const rows = loadVisitors(entityCode);
  const v = rows.find((r) => r.id === visitorId);
  if (!v) throw new Error('Visitor not found');
  if (v.status !== 'planned') throw new Error('Only planned visitors can be cancelled');
  const before = { ...v };
  v.status = 'cancelled';
  v.updatedAt = nowISO();
  saveVisitors(entityCode, rows);
  audit(entityCode, 'cancel', v.id, `Cancel: ${v.name}`, before as unknown as Record<string, unknown>,
        v as unknown as Record<string, unknown>, 'visitor.cancel');
  return v;
}

// ─── watchlist (DP-FD-13) ────────────────────────────────────────────
export function loadWatchlist(entityCode: string): WatchlistEntry[] {
  return readJSON<WatchlistEntry[]>(fdWatchlistKey(entityCode), []);
}
export function listWatchlist(entityCode: string, includeRemoved = false): WatchlistEntry[] {
  const all = loadWatchlist(entityCode);
  return includeRemoved ? all : all.filter((w) => !w.removedAt);
}
export interface WatchlistInput {
  name: string;
  company?: string | null;
  phone?: string | null;
  reason: string;
  flaggedByUserId: string;
}
export function addWatchlistEntry(entityCode: string, input: WatchlistInput): WatchlistEntry {
  if (!input.name?.trim()) throw new Error('Watchlist name required');
  if (!input.reason?.trim()) throw new Error('Watchlist reason is MANDATORY');
  if (!input.flaggedByUserId) throw new Error('flaggedByUserId is MANDATORY (symmetric visibility · DP-FD-13)');
  assertNoFullIdInStrings({ name: input.name, company: input.company ?? '', phone: input.phone ?? '' });
  const all = loadWatchlist(entityCode);
  const w: WatchlistEntry = {
    id: mkId('wl'),
    entityId: entityCode,
    name: input.name.trim(),
    company: input.company ?? null,
    phone: input.phone ?? null,
    reason: input.reason.trim(),
    flaggedByUserId: input.flaggedByUserId,
    flaggedAt: nowISO(),
    removedAt: null,
    removedByUserId: null,
  };
  all.push(w);
  writeJSON(fdWatchlistKey(entityCode), all);
  audit(entityCode, 'create', w.id, `Watchlist: ${w.name}`, null,
        w as unknown as Record<string, unknown>, 'watchlist.add');
  return w;
}
export function removeWatchlistEntry(entityCode: string, id: string, removedByUserId: string): WatchlistEntry {
  if (!removedByUserId) throw new Error('removedByUserId is MANDATORY');
  const all = loadWatchlist(entityCode);
  const w = all.find((x) => x.id === id);
  if (!w) throw new Error('Watchlist entry not found');
  if (w.removedAt) return w;
  const before = { ...w };
  w.removedAt = nowISO();
  w.removedByUserId = removedByUserId;
  writeJSON(fdWatchlistKey(entityCode), all);
  audit(entityCode, 'update', w.id, `Watchlist removed: ${w.name}`,
        before as unknown as Record<string, unknown>,
        w as unknown as Record<string, unknown>, 'watchlist.remove');
  return w;
}
export function checkWatchlist(
  entityCode: string, name: string, _company?: string | null, phone?: string | null,
): WatchlistEntry[] {
  const target = (name ?? '').trim().toLowerCase();
  const targetPhone = (phone ?? '').trim();
  const list = listWatchlist(entityCode);
  return list.filter((w) => {
    if (w.name.trim().toLowerCase() === target) return true;
    if (targetPhone && w.phone && w.phone.trim() === targetPhone) return true;
    return false;
  });
}

// ─── check-in (walk-in OR planned conversion) ───────────────────────
export interface CheckInInput extends VisitorInput {
  /** If supplied, converts an existing planned visitor instead of creating new. */
  plannedVisitorId?: string;
  /** Required when watchlist hit; receptionist user id acknowledging the warning. */
  acknowledgeWatchlistByUserId?: string;
}

export function checkInVisitor(
  entityCode: string, createdByUserId: string, input: CheckInInput,
): Visitor {
  validateVisitorInput(input);

  const hits = checkWatchlist(entityCode, input.name, input.company, input.phone);
  if (hits.length > 0 && !input.acknowledgeWatchlistByUserId) {
    throw new Error(`Watchlist hit (${hits.length}) · acknowledgeWatchlistByUserId required to proceed`);
  }

  const rows = loadVisitors(entityCode);
  let v: Visitor;
  if (input.plannedVisitorId) {
    const found = rows.find((r) => r.id === input.plannedVisitorId);
    if (!found) throw new Error('Planned visitor not found');
    if (found.status !== 'planned') throw new Error('Visitor is not in planned state');
    found.name = input.name.trim();
    found.company = input.company ?? found.company;
    found.partyId = input.partyId ?? found.partyId;
    found.phone = input.phone ?? found.phone;
    found.purpose = input.purpose;
    found.hostEmployeeId = input.hostEmployeeId;
    found.hostName = input.hostName;
    found.expectedDurationMinutes = input.expectedDurationMinutes ?? found.expectedDurationMinutes;
    found.photoDataUrl = input.photoDataUrl ?? found.photoDataUrl;
    found.idProofType = input.idProofType ?? found.idProofType;
    found.idProofLast4 = input.idProofLast4 ?? found.idProofLast4;
    found.ndaDocumentId = input.ndaDocumentId ?? found.ndaDocumentId;
    found.vehicleNo = input.vehicleNo ?? found.vehicleNo;
    found.parkingNote = input.parkingNote ?? found.parkingNote;
    found.itemsCarried = input.itemsCarried ?? found.itemsCarried;
    v = found;
  } else {
    v = {
      id: mkId('vis'),
      entityId: entityCode,
      badgeNo: '',
      name: input.name.trim(),
      company: input.company ?? null,
      partyId: input.partyId ?? null,
      phone: input.phone ?? null,
      purpose: input.purpose,
      hostEmployeeId: input.hostEmployeeId,
      hostName: input.hostName,
      status: 'planned',
      plannedAt: null,
      expectedDurationMinutes: input.expectedDurationMinutes ?? null,
      checkInAt: null,
      checkOutAt: null,
      photoDataUrl: input.photoDataUrl ?? null,
      idProofType: input.idProofType ?? null,
      idProofLast4: input.idProofLast4 ?? null,
      ndaDocumentId: input.ndaDocumentId ?? null,
      vehicleNo: input.vehicleNo ?? null,
      parkingNote: input.parkingNote ?? null,
      itemsCarried: input.itemsCarried ?? [],
      watchlistWarningShownTo: null,
      gateEntryRef: input.gateEntryRef ?? null,
      createdAt: nowISO(),
      createdByUserId,
      updatedAt: nowISO(),
    };
    rows.push(v);
  }
  const before = { status: v.status, badgeNo: v.badgeNo };
  v.badgeNo = nextBadgeNo(entityCode);
  v.status = 'on_site';
  v.checkInAt = nowISO();
  v.updatedAt = nowISO();
  if (hits.length > 0 && input.acknowledgeWatchlistByUserId) {
    v.watchlistWarningShownTo = input.acknowledgeWatchlistByUserId;
  }
  saveVisitors(entityCode, rows);
  audit(entityCode, 'update', v.id, `Check-in: ${v.name} (${v.badgeNo}) for ${v.hostName}`,
        before as unknown as Record<string, unknown>,
        v as unknown as Record<string, unknown>,
        hits.length > 0 ? `visitor.checkin · watchlist-ack(${hits.length})` : 'visitor.checkin');
  return v;
}

// ─── check-out ───────────────────────────────────────────────────────
export function checkOutVisitor(
  entityCode: string, visitorId: string, verifiedItemIds: string[],
): Visitor {
  const rows = loadVisitors(entityCode);
  const v = rows.find((r) => r.id === visitorId);
  if (!v) throw new Error('Visitor not found');
  if (v.status !== 'on_site') throw new Error('Visitor is not on_site');
  const verified = new Set(verifiedItemIds);
  const before = { itemsCarried: v.itemsCarried.map((i) => ({ ...i })), status: v.status };
  const mismatches: string[] = [];
  v.itemsCarried = v.itemsCarried.map((it) => {
    if (verified.has(it.id)) {
      return { ...it, verifiedOutAt: nowISO(), mismatch: false };
    }
    mismatches.push(it.id);
    return { ...it, mismatch: true };
  });
  v.status = 'checked_out';
  v.checkOutAt = nowISO();
  v.updatedAt = nowISO();
  saveVisitors(entityCode, rows);
  const reason = mismatches.length > 0
    ? `visitor.checkout · MISMATCH(${mismatches.length})`
    : 'visitor.checkout';
  audit(entityCode, 'update', v.id, `Check-out: ${v.name} (${v.badgeNo})`,
        before as unknown as Record<string, unknown>,
        v as unknown as Record<string, unknown>, reason);
  return v;
}

// ─── items-carried mutations (only while on_site) ───────────────────
export function addCarriedItem(
  entityCode: string, visitorId: string, item: Omit<CarriedItem, 'id' | 'verifiedOutAt' | 'mismatch'>,
): Visitor {
  const rows = loadVisitors(entityCode);
  const v = rows.find((r) => r.id === visitorId);
  if (!v) throw new Error('Visitor not found');
  if (v.status !== 'on_site') throw new Error('Items can only be added while on_site');
  if (!item.description?.trim()) throw new Error('Item description required');
  assertNoFullIdInStrings({ description: item.description, serialOrMark: item.serialOrMark ?? '' });
  const before = { itemsCarried: v.itemsCarried.map((i) => ({ ...i })) };
  v.itemsCarried = [...v.itemsCarried, {
    id: mkId('item'),
    description: item.description.trim(),
    serialOrMark: item.serialOrMark ?? null,
    verifiedOutAt: null,
    mismatch: false,
  }];
  v.updatedAt = nowISO();
  saveVisitors(entityCode, rows);
  audit(entityCode, 'update', v.id, `Item added: ${v.name}`,
        before as unknown as Record<string, unknown>,
        v as unknown as Record<string, unknown>, 'visitor.item.add');
  return v;
}

export function removeCarriedItem(entityCode: string, visitorId: string, itemId: string): Visitor {
  const rows = loadVisitors(entityCode);
  const v = rows.find((r) => r.id === visitorId);
  if (!v) throw new Error('Visitor not found');
  if (v.status !== 'on_site') throw new Error('Items can only be removed while on_site');
  const before = { itemsCarried: v.itemsCarried.map((i) => ({ ...i })) };
  v.itemsCarried = v.itemsCarried.filter((i) => i.id !== itemId);
  v.updatedAt = nowISO();
  saveVisitors(entityCode, rows);
  audit(entityCode, 'update', v.id, `Item removed: ${v.name}`,
        before as unknown as Record<string, unknown>,
        v as unknown as Record<string, unknown>, 'visitor.item.remove');
  return v;
}

// ─── roll-call / muster (DP-FD-14) ──────────────────────────────────
export function getOnPremises(entityCode: string): Visitor[] {
  return loadVisitors(entityCode).filter((v) => v.status === 'on_site');
}

export interface MusterRow {
  name: string; badgeNo: string; host: string; checkInAt: string; vehicleNo: string | null;
}
export interface MusterReport {
  generatedAt: string; count: number; rows: MusterRow[];
}
export function buildMusterReport(entityCode: string, nowISO_?: string): MusterReport {
  const rows = getOnPremises(entityCode).map<MusterRow>((v) => ({
    name: v.name,
    badgeNo: v.badgeNo,
    host: v.hostName,
    checkInAt: v.checkInAt ?? '',
    vehicleNo: v.vehicleNo ?? null,
  }));
  return { generatedAt: nowISO_ ?? nowISO(), count: rows.length, rows };
}

export function getOverstays(entityCode: string, nowISO_?: string): Visitor[] {
  const now = nowISO_ ? new Date(nowISO_).getTime() : Date.now();
  return getOnPremises(entityCode).filter((v) => {
    if (!v.expectedDurationMinutes || !v.checkInAt) return false;
    const due = new Date(v.checkInAt).getTime() + v.expectedDurationMinutes * 60_000;
    return now > due;
  });
}

// ─── contact book (DP-FD-8) ──────────────────────────────────────────
export interface ContactBookRow {
  partyId: string;
  partyCode: string;
  partyName: string;
  partyType: 'customer' | 'vendor' | 'both';
  group: string | null;
  gstin: string | null;
  stateCode: string | null;
  notes: ContactNote[];
}
export function listContactBook(entityCode: string, opts?: { group?: string }): ContactBookRow[] {
  const parties = loadPartyMaster(entityCode);
  const notes = loadContactNotes(entityCode);
  const notesByParty = new Map<string, ContactNote[]>();
  for (const n of notes) {
    const arr = notesByParty.get(n.partyId) ?? [];
    arr.push(n);
    notesByParty.set(n.partyId, arr);
  }
  return parties
    .filter((p) => (opts?.group ? (p.group ?? '') === opts.group : true))
    .map<ContactBookRow>((p) => ({
      partyId: p.id,
      partyCode: p.party_code,
      partyName: p.party_name,
      partyType: p.party_type,
      group: p.group ?? null,
      gstin: p.gstin,
      stateCode: p.state_code,
      notes: notesByParty.get(p.id) ?? [],
    }));
}

export function loadContactNotes(entityCode: string): ContactNote[] {
  return readJSON<ContactNote[]>(fdContactNotesKey(entityCode), []);
}
export function addContactNote(
  entityCode: string, partyId: string, note: string, createdByUserId: string,
): ContactNote {
  if (!partyId) throw new Error('partyId required');
  if (!note?.trim()) throw new Error('note required');
  assertNoFullIdInStrings({ note });
  const all = loadContactNotes(entityCode);
  const n: ContactNote = {
    id: mkId('note'),
    entityId: entityCode,
    partyId,
    note: note.trim(),
    createdAt: nowISO(),
    createdByUserId,
  };
  all.push(n);
  writeJSON(fdContactNotesKey(entityCode), all);
  audit(entityCode, 'create', n.id, `ContactNote: ${partyId}`, null,
        n as unknown as Record<string, unknown>, 'contact.note.add');
  return n;
}
export function deleteContactNote(entityCode: string, noteId: string): void {
  const all = loadContactNotes(entityCode);
  const idx = all.findIndex((n) => n.id === noteId);
  if (idx < 0) return;
  const before = { ...all[idx] };
  all.splice(idx, 1);
  writeJSON(fdContactNotesKey(entityCode), all);
  audit(entityCode, 'cancel', noteId, `ContactNote removed`,
        before as unknown as Record<string, unknown>, null, 'contact.note.remove');
}

export interface LabelSheetEntry {
  partyId: string; partyName: string; address1: string; address2: string;
}
export function buildLabelSheet(entityCode: string, partyIds: string[]): LabelSheetEntry[] {
  const parties = loadPartyMaster(entityCode);
  const set = new Set(partyIds);
  return parties
    .filter((p) => set.has(p.id))
    .map<LabelSheetEntry>((p) => ({
      partyId: p.id,
      partyName: p.party_name,
      address1: p.gstin ?? '',
      address2: p.state_code ?? '',
    }));
}

export interface EnvelopeEntry {
  partyId: string; partyName: string; group: string | null;
  partyCode: string; gstin: string | null; stateCode: string | null;
}
export interface EnvelopeData {
  generatedAt: string; group: string | null; count: number; rows: EnvelopeEntry[];
}
export function buildEnvelopeData(
  entityCode: string, selector: string[] | { group: string },
): EnvelopeData {
  const parties = loadPartyMaster(entityCode);
  let rows: Party[];
  let group: string | null = null;
  if (Array.isArray(selector)) {
    const set = new Set(selector);
    rows = parties.filter((p) => set.has(p.id));
  } else {
    group = selector.group;
    rows = parties.filter((p) => (p.group ?? '') === selector.group);
  }
  return {
    generatedAt: nowISO(),
    group,
    count: rows.length,
    rows: rows.map<EnvelopeEntry>((p) => ({
      partyId: p.id, partyName: p.party_name, group: p.group ?? null,
      partyCode: p.party_code, gstin: p.gstin, stateCode: p.state_code,
    })),
  };
}

// ─── stats ───────────────────────────────────────────────────────────
function isSameDay(iso: string | null | undefined, ref: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear()
      && d.getMonth() === ref.getMonth()
      && d.getDate() === ref.getDate();
}
export function getFrontDeskStats(entityCode: string, nowISO_?: string): FrontDeskStats {
  const ref = nowISO_ ? new Date(nowISO_) : new Date();
  const all = loadVisitors(entityCode);
  const onSite = all.filter((v) => v.status === 'on_site');
  const visitorsToday = all.filter((v) => isSameDay(v.checkInAt, ref));
  const checkedOutToday = all.filter((v) => isSameDay(v.checkOutAt, ref));
  const plannedToday = all.filter((v) => v.status === 'planned' && isSameDay(v.plannedAt, ref));
  const overstays = getOverstays(entityCode, nowISO_).length;
  const wl = listWatchlist(entityCode);
  let watchlistHits = 0;
  for (const v of onSite) {
    const hit = wl.find((w) =>
      w.name.trim().toLowerCase() === v.name.trim().toLowerCase()
      || (v.phone && w.phone && w.phone.trim() === v.phone.trim())
    );
    if (hit) watchlistHits++;
  }
  return {
    onSiteNow: onSite.length,
    totalToday: visitorsToday.length,
    checkedOutToday: checkedOutToday.length,
    plannedToday: plannedToday.length,
    overstays,
    watchlistHits,
  };
}

// ─── party-master re-export passthroughs (UI convenience · READ-ONLY) ──
export function listPartiesForPicker(entityCode: string, type: 'customer' | 'vendor' | 'any' = 'any'): Party[] {
  return loadPartiesByType(entityCode, type as never);
}

/** Convenience: list all visitors with optional status filter. */
export function listVisitors(entityCode: string, status?: VisitorStatus): Visitor[] {
  const rows = loadVisitors(entityCode);
  return status ? rows.filter((v) => v.status === status) : rows;
}
