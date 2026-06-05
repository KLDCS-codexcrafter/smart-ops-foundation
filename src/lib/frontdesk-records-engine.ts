/**
 * @realizes    Mail Room (DP-FD-9 · DP-FD-15) + Asset Custody (DP-FD-4) + Reception Diary
 *              (DP-FD-16) + gate-entry bridge wiring · ARC CLOSER for FrontDesk arc.
 * @reads-from  party-master-engine · useEmployees-data (EMPLOYEES_KEY) · asset masters
 *              ASSETS_KEY (READ-ONLY · DP-FD-4) · gate-entry types gateEntriesKey
 *              (READ-ONLY · DP-FD-1) · taskflow-engine.createTask (CALL ONLY) ·
 *              frontdesk-engine (visitors + gate-ref update) · frontdesk-scheduling-engine
 *              (exec appointments) · audit-trail-engine.
 * @sprint      Sprint 147 · T-FrontDesk-A6F.3 · Pillar A.6-F · Block 3 · ARC CLOSER
 * @[JWT]       P2BB: courier API tracking · retention enforcement.
 *
 * Scope walls:
 * - DP-FD-1: gate-entry.ts / gate-pass.ts / weighbridge — READ ONLY (this engine never writes).
 * - DP-FD-4: asset-master / fixed-asset / asset-tag — READ ONLY (assetRefId existence check).
 * - §H 0-DIFF: approval-workflow-engine · Comply360 · push-notification-bridge UNTOUCHED.
 * - taskflow-engine: createTask CALL-ONLY, no internal mutation.
 *
 * ID-CAPTURE CANON scope statement: the 12+ digit guard in frontdesk-engine scopes to
 * VISITOR fields only. Mail.notes free-text may legitimately contain numeric strings
 * (tracking numbers, AWBs of length 12+) and DOES NOT throw here. This is an explicit
 * canon boundary asserted in tests.
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { setVisitorGateRef, loadVisitors } from '@/lib/frontdesk-engine';
import { createTask } from '@/lib/taskflow-engine';
import { ASSETS_KEY, type Asset } from '@/types/asset-master';
import { gateEntriesKey, type GateEntry } from '@/types/gate-entry';
import {
  fdCustodyKey,
  fdMailKey,
  type AssetCustodyRecord,
  type DispatchMode,
  type MailDirection,
  type MailItem,
  type MailKind,
  type ReceptionDiaryEntry,
} from '@/types/frontdesk';

// ─── storage helpers ─────────────────────────────────────────────────
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function writeJSON(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function mkId(p: string): string {
  return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function nowISO(): string { return new Date().toISOString(); }

const PHOTO_MAX_BYTES = 1_048_576; // ≤1MB · custody photo cap mirrors DP-FD-18 echo

function assertPhotoSize(photoDataUrl: string | null | undefined): void {
  if (!photoDataUrl) return;
  const comma = photoDataUrl.indexOf(',');
  const b64 = comma >= 0 ? photoDataUrl.slice(comma + 1) : photoDataUrl;
  const bytes = Math.floor((b64.length * 3) / 4);
  if (bytes > PHOTO_MAX_BYTES) {
    throw new Error(`Photo too large (${bytes} bytes > ${PHOTO_MAX_BYTES} cap)`);
  }
}

function audit(
  entityCode: string,
  action: 'create' | 'update' | 'cancel',
  recordId: string,
  recordLabel: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  reason: string,
): void {
  try {
    logAudit({
      entityCode, action, entityType: 'frontdesk_event',
      recordId, recordLabel, beforeState: before, afterState: after,
      reason, sourceModule: 'frontdesk',
    });
  } catch (e) {
    console.error('[frontdesk-records audit]', e);
  }
}

function daysBetween(fromISO: string, toISO: string): number {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

// ─────────────────────────────────────────────────────────────────────
// MAIL — reads + writes
// ─────────────────────────────────────────────────────────────────────
export function loadMail(entityCode: string): MailItem[] {
  return readJSON<MailItem[]>(fdMailKey(entityCode), []);
}
function saveMail(entityCode: string, rows: MailItem[]): void {
  writeJSON(fdMailKey(entityCode), rows);
}
export function getMail(entityCode: string, id: string): MailItem | null {
  return loadMail(entityCode).find((m) => m.id === id) ?? null;
}

export interface InwardMailInput {
  kind: MailKind;
  description: string;
  courierName?: string | null;
  awbDocketNo?: string | null;
  fromPartyId?: string | null;
  fromText?: string | null;
  toEmployeeId?: string | null;
  toEmployeeName?: string | null;
  receivedAt?: string | null;
  // gift fields
  giftGiverPartyId?: string | null;
  giftGiverText?: string | null;
  giftDeclaredByEmployeeId?: string | null;
  giftApproxValue?: number | null;
  scanDocumentId?: string | null;
  notes?: string | null;
  createdByUserId: string;
  entityId: string;
}

export function createInwardMail(entityCode: string, input: InwardMailInput): MailItem {
  if (!input.description || !input.description.trim()) {
    throw new Error('Mail: description is required');
  }
  if (input.kind === 'gift') {
    if (!input.giftGiverPartyId && !(input.giftGiverText && input.giftGiverText.trim())) {
      throw new Error('Gift register: giver (party or text) is required');
    }
    if (!input.giftDeclaredByEmployeeId) {
      throw new Error('Gift register: declaredBy employee is required');
    }
  } else {
    if (!input.toEmployeeId || !input.toEmployeeName) {
      throw new Error(`Inward ${input.kind}: addressee employee is required`);
    }
  }
  const now = nowISO();
  const mail: MailItem = {
    id: mkId('mail'),
    entityId: input.entityId,
    direction: 'inward',
    kind: input.kind,
    description: input.description.trim(),
    courierName: input.courierName ?? null,
    awbDocketNo: input.awbDocketNo ?? null,
    fromPartyId: input.fromPartyId ?? null,
    fromText: input.fromText ?? null,
    toEmployeeId: input.toEmployeeId ?? null,
    toEmployeeName: input.toEmployeeName ?? null,
    toPartyId: null,
    toText: null,
    receivedAt: input.receivedAt ?? now,
    acknowledgedAt: null,
    acknowledgedByUserId: null,
    acknowledgedViaOverride: false,
    acknowledgedOverrideReason: null,
    giftGiverPartyId: input.giftGiverPartyId ?? null,
    giftGiverText: input.giftGiverText ?? null,
    giftDeclaredByEmployeeId: input.giftDeclaredByEmployeeId ?? null,
    giftApproxValue: input.giftApproxValue ?? null,
    sentAt: null,
    dispatchMode: null,
    proofOfDispatchDocId: null,
    deliveryConfirmed: false,
    deliveryConfirmedAt: null,
    scanDocumentId: input.scanDocumentId ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    createdByUserId: input.createdByUserId,
    updatedAt: now,
  };
  const rows = [mail, ...loadMail(entityCode)];
  saveMail(entityCode, rows);
  audit(entityCode, 'create', mail.id, mail.description, null,
    { kind: mail.kind, direction: 'inward' }, 'inward mail received');
  return mail;
}

export interface AcknowledgeOptions {
  /** Reception override flag (when the addressee is unavailable). Reason required. */
  overrideReason?: string | null;
}

export function acknowledgeInwardMail(
  entityCode: string,
  mailId: string,
  acknowledgingUserId: string,
  options: AcknowledgeOptions = {},
): MailItem {
  const rows = loadMail(entityCode);
  const idx = rows.findIndex((m) => m.id === mailId);
  if (idx < 0) throw new Error(`Mail not found: ${mailId}`);
  const m = rows[idx];
  if (m.direction !== 'inward') throw new Error('Only inward mail can be acknowledged');
  if (m.acknowledgedAt) throw new Error('Mail already acknowledged');

  const override = !!(options.overrideReason && options.overrideReason.trim());
  if (!override && m.kind !== 'gift') {
    // Addressee identity check: ack user must equal toEmployeeId.
    if (!m.toEmployeeId || m.toEmployeeId !== acknowledgingUserId) {
      throw new Error('Only the addressee may acknowledge — use reception override with reason');
    }
  }

  const now = nowISO();
  rows[idx] = {
    ...m,
    acknowledgedAt: now,
    acknowledgedByUserId: acknowledgingUserId,
    acknowledgedViaOverride: override,
    acknowledgedOverrideReason: override ? (options.overrideReason ?? '').trim() : null,
    updatedAt: now,
  };
  saveMail(entityCode, rows);
  audit(entityCode, 'update', m.id, m.description,
    { acknowledgedAt: null },
    { acknowledgedAt: now, override, overrideReason: rows[idx].acknowledgedOverrideReason },
    override ? 'inward acknowledged via reception override' : 'inward acknowledged by addressee');
  return rows[idx];
}

export interface UnclaimedInward {
  mail: MailItem;
  ageDays: number;
}

export function getUnclaimedInward(entityCode: string, nowISO_?: string): UnclaimedInward[] {
  const now = nowISO_ ?? nowISO();
  return loadMail(entityCode)
    .filter((m) => m.direction === 'inward' && !m.acknowledgedAt)
    .map((m) => ({ mail: m, ageDays: daysBetween(m.receivedAt ?? m.createdAt, now) }))
    .sort((a, b) => b.ageDays - a.ageDays);
}

// ─── OUTWARD ────────────────────────────────────────────────────────
export interface OutwardMailInput {
  kind: MailKind;
  description: string;
  courierName?: string | null;
  awbDocketNo?: string | null;
  toPartyId?: string | null;
  toText?: string | null;
  scanDocumentId?: string | null;
  notes?: string | null;
  createdByUserId: string;
  entityId: string;
}

export function createOutwardMail(entityCode: string, input: OutwardMailInput): MailItem {
  if (!input.description || !input.description.trim()) {
    throw new Error('Mail: description is required');
  }
  if (!input.toPartyId && !(input.toText && input.toText.trim())) {
    throw new Error('Outward mail: recipient (party or text) is required');
  }
  const now = nowISO();
  const mail: MailItem = {
    id: mkId('mail'),
    entityId: input.entityId,
    direction: 'outward',
    kind: input.kind,
    description: input.description.trim(),
    courierName: input.courierName ?? null,
    awbDocketNo: input.awbDocketNo ?? null,
    fromPartyId: null, fromText: null,
    toEmployeeId: null, toEmployeeName: null,
    toPartyId: input.toPartyId ?? null,
    toText: input.toText ?? null,
    receivedAt: null,
    acknowledgedAt: null, acknowledgedByUserId: null,
    acknowledgedViaOverride: false, acknowledgedOverrideReason: null,
    giftGiverPartyId: null, giftGiverText: null,
    giftDeclaredByEmployeeId: null, giftApproxValue: null,
    sentAt: null,
    dispatchMode: null,
    proofOfDispatchDocId: null,
    deliveryConfirmed: false,
    deliveryConfirmedAt: null,
    scanDocumentId: input.scanDocumentId ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    createdByUserId: input.createdByUserId,
    updatedAt: now,
  };
  saveMail(entityCode, [mail, ...loadMail(entityCode)]);
  audit(entityCode, 'create', mail.id, mail.description, null,
    { kind: mail.kind, direction: 'outward' }, 'outward mail created');
  return mail;
}

export interface MarkSentInput { sentAt?: string | null; dispatchMode: DispatchMode }

export function markSent(entityCode: string, mailId: string, input: MarkSentInput): MailItem {
  const rows = loadMail(entityCode);
  const idx = rows.findIndex((m) => m.id === mailId);
  if (idx < 0) throw new Error(`Mail not found: ${mailId}`);
  const m = rows[idx];
  if (m.direction !== 'outward') throw new Error('Only outward mail can be marked sent');
  if (m.sentAt) throw new Error('Mail already marked sent');
  const now = nowISO();
  rows[idx] = { ...m, sentAt: input.sentAt ?? now, dispatchMode: input.dispatchMode, updatedAt: now };
  saveMail(entityCode, rows);
  audit(entityCode, 'update', m.id, m.description,
    { sentAt: null }, { sentAt: rows[idx].sentAt, dispatchMode: input.dispatchMode },
    'outward marked sent');
  return rows[idx];
}

export function attachProofOfDispatch(entityCode: string, mailId: string, docId: string): MailItem {
  const rows = loadMail(entityCode);
  const idx = rows.findIndex((m) => m.id === mailId);
  if (idx < 0) throw new Error(`Mail not found: ${mailId}`);
  const m = rows[idx];
  if (!m.sentAt) throw new Error('Cannot attach proof before mail is marked sent');
  rows[idx] = { ...m, proofOfDispatchDocId: docId, updatedAt: nowISO() };
  saveMail(entityCode, rows);
  audit(entityCode, 'update', m.id, m.description,
    { proofOfDispatchDocId: m.proofOfDispatchDocId ?? null },
    { proofOfDispatchDocId: docId }, 'proof-of-dispatch attached');
  return rows[idx];
}

export function confirmDelivery(entityCode: string, mailId: string): MailItem {
  const rows = loadMail(entityCode);
  const idx = rows.findIndex((m) => m.id === mailId);
  if (idx < 0) throw new Error(`Mail not found: ${mailId}`);
  const m = rows[idx];
  if (m.direction !== 'outward') throw new Error('Only outward mail has delivery');
  if (!m.sentAt) throw new Error('Cannot confirm delivery before mail is sent');
  const now = nowISO();
  rows[idx] = { ...m, deliveryConfirmed: true, deliveryConfirmedAt: now, updatedAt: now };
  saveMail(entityCode, rows);
  audit(entityCode, 'update', m.id, m.description,
    { deliveryConfirmed: false }, { deliveryConfirmed: true }, 'delivery confirmed');
  return rows[idx];
}

export interface UnconfirmedOutward { mail: MailItem; ageDays: number; missingProofWarn: boolean }

/**
 * Outward mail awaiting delivery confirmation. Items with dispatchMode in {rpad, speed_post}
 * that have NO proofOfDispatchDocId and are >2 days old surface a non-throwing WARN flag.
 */
export function getUnconfirmedOutward(entityCode: string, nowISO_?: string): UnconfirmedOutward[] {
  const now = nowISO_ ?? nowISO();
  return loadMail(entityCode)
    .filter((m) => m.direction === 'outward' && !!m.sentAt && !m.deliveryConfirmed)
    .map((m) => {
      const ageDays = daysBetween(m.sentAt!, now);
      const needsProof = m.dispatchMode === 'rpad' || m.dispatchMode === 'speed_post';
      const missingProofWarn = needsProof && !m.proofOfDispatchDocId && ageDays >= 2;
      return { mail: m, ageDays, missingProofWarn };
    })
    .sort((a, b) => b.ageDays - a.ageDays);
}

export function linkScan(entityCode: string, mailId: string, docId: string): MailItem {
  const rows = loadMail(entityCode);
  const idx = rows.findIndex((m) => m.id === mailId);
  if (idx < 0) throw new Error(`Mail not found: ${mailId}`);
  const before = { scanDocumentId: rows[idx].scanDocumentId ?? null };
  rows[idx] = { ...rows[idx], scanDocumentId: docId, updatedAt: nowISO() };
  saveMail(entityCode, rows);
  audit(entityCode, 'update', rows[idx].id, rows[idx].description, before,
    { scanDocumentId: docId }, 'mail scan linked');
  return rows[idx];
}

export interface ListMailFilter {
  direction?: MailDirection;
  kind?: MailKind;
  status?: 'acknowledged' | 'unclaimed' | 'sent' | 'unconfirmed' | 'delivered';
  dateFromISO?: string;
  dateToISO?: string;
}

export function listMail(entityCode: string, filter: ListMailFilter = {}): MailItem[] {
  return loadMail(entityCode).filter((m) => {
    if (filter.direction && m.direction !== filter.direction) return false;
    if (filter.kind && m.kind !== filter.kind) return false;
    if (filter.status) {
      if (filter.status === 'acknowledged' && !m.acknowledgedAt) return false;
      if (filter.status === 'unclaimed' && (m.direction !== 'inward' || m.acknowledgedAt)) return false;
      if (filter.status === 'sent' && !m.sentAt) return false;
      if (filter.status === 'unconfirmed' && (m.direction !== 'outward' || !m.sentAt || m.deliveryConfirmed)) return false;
      if (filter.status === 'delivered' && !m.deliveryConfirmed) return false;
    }
    if (filter.dateFromISO && m.createdAt < filter.dateFromISO) return false;
    if (filter.dateToISO && m.createdAt > filter.dateToISO) return false;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────
// ASSET CUSTODY · DP-FD-4 (asset masters READ-ONLY)
// ─────────────────────────────────────────────────────────────────────
function loadAssetsReadOnly(): Asset[] {
  return readJSON<Asset[]>(ASSETS_KEY, []);
}

export function loadCustody(entityCode: string): AssetCustodyRecord[] {
  return readJSON<AssetCustodyRecord[]>(fdCustodyKey(entityCode), []);
}
function saveCustody(entityCode: string, rows: AssetCustodyRecord[]): void {
  writeJSON(fdCustodyKey(entityCode), rows);
}
export function getCustody(entityCode: string, id: string): AssetCustodyRecord | null {
  return loadCustody(entityCode).find((r) => r.id === id) ?? null;
}

export interface IssueAssetInput {
  assetRefId: string;
  employeeId: string;
  employeeName: string;
  issuedAt?: string | null;
  dueBackAt?: string | null;
  conditionOnIssue?: string | null;
  evidencePhotoDataUrl?: string | null;
  createdByUserId: string;
  entityId: string;
}

export function issueAsset(entityCode: string, input: IssueAssetInput): AssetCustodyRecord {
  if (!input.employeeId || !input.employeeName) {
    throw new Error('Custody: holder employee is required');
  }
  const assets = loadAssetsReadOnly();
  const asset = assets.find((a) => a.id === input.assetRefId);
  if (!asset) throw new Error(`Asset not found in master: ${input.assetRefId}`);

  // one OPEN custody per asset
  const open = loadCustody(entityCode).find(
    (r) => r.assetRefId === input.assetRefId && !r.returnedAt,
  );
  if (open) throw new Error(`Asset already on open custody: ${asset.assetCode}`);

  assertPhotoSize(input.evidencePhotoDataUrl);

  const now = nowISO();
  const rec: AssetCustodyRecord = {
    id: mkId('cust'),
    entityId: input.entityId,
    assetRefId: input.assetRefId,
    assetLabel: `${asset.assetCode} · ${asset.name}`,
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    issuedAt: input.issuedAt ?? now,
    dueBackAt: input.dueBackAt ?? null,
    returnedAt: null,
    conditionOnIssue: input.conditionOnIssue ?? null,
    conditionOnReturn: null,
    evidencePhotoDataUrl: input.evidencePhotoDataUrl ?? null,
    overdueTaskId: null,
    createdAt: now,
    createdByUserId: input.createdByUserId,
  };
  saveCustody(entityCode, [rec, ...loadCustody(entityCode)]);
  audit(entityCode, 'create', rec.id, rec.assetLabel, null,
    { employeeId: rec.employeeId, dueBackAt: rec.dueBackAt }, 'asset issued on custody');
  return rec;
}

export interface ReturnAssetInput { conditionOnReturn?: string | null }

export function returnAsset(entityCode: string, recordId: string, input: ReturnAssetInput = {}): AssetCustodyRecord {
  const rows = loadCustody(entityCode);
  const idx = rows.findIndex((r) => r.id === recordId);
  if (idx < 0) throw new Error(`Custody not found: ${recordId}`);
  const r = rows[idx];
  if (r.returnedAt) throw new Error('Custody already returned');
  const now = nowISO();
  rows[idx] = { ...r, returnedAt: now, conditionOnReturn: input.conditionOnReturn ?? null };
  saveCustody(entityCode, rows);
  audit(entityCode, 'update', r.id, r.assetLabel,
    { returnedAt: null }, { returnedAt: now, conditionOnReturn: input.conditionOnReturn ?? null },
    'asset returned from custody');
  return rows[idx];
}

export function getOverdueCustody(entityCode: string, nowISO_?: string): AssetCustodyRecord[] {
  const now = nowISO_ ?? nowISO();
  return loadCustody(entityCode).filter(
    (r) => !r.returnedAt && !!r.dueBackAt && r.dueBackAt < now,
  );
}

export interface FlagOverdueResult {
  flagged: { recordId: string; taskId: string }[];
  alreadyFlagged: string[];
}

/**
 * Idempotent: for each overdue record without overdueTaskId, spawn a TaskFlow task
 * (assignee = holder, tag = `custody-overdue:<recordId>`, TF-29a acknowledgment).
 */
export function flagOverdueCustody(entityCode: string, nowISO_?: string): FlagOverdueResult {
  const overdue = getOverdueCustody(entityCode, nowISO_);
  const rows = loadCustody(entityCode);
  const result: FlagOverdueResult = { flagged: [], alreadyFlagged: [] };

  for (const r of overdue) {
    const idx = rows.findIndex((x) => x.id === r.id);
    if (idx < 0) continue;
    if (rows[idx].overdueTaskId) {
      result.alreadyFlagged.push(r.id);
      continue;
    }
    const task = createTask(entityCode, {
      title: `Return overdue: ${r.assetLabel}`,
      description: `Custody overdue since ${r.dueBackAt}. Please return the asset to FrontDesk.`,
      assigneeId: r.employeeId,
      assigneeName: r.employeeName,
      creatorId: 'frontdesk-records-engine',
      departmentId: null,
      priority: 'high',
      category: 'general',
      dueDate: r.dueBackAt ?? null,
      tags: [`custody-overdue:${r.id}`],
      entityId: r.entityId,
    });
    rows[idx] = { ...rows[idx], overdueTaskId: task.id };
    result.flagged.push({ recordId: r.id, taskId: task.id });
    audit(entityCode, 'update', r.id, r.assetLabel,
      { overdueTaskId: null }, { overdueTaskId: task.id }, 'custody overdue flagged → task');
  }
  if (result.flagged.length > 0) saveCustody(entityCode, rows);
  return result;
}

// ─────────────────────────────────────────────────────────────────────
// RECEPTION DIARY · DP-FD-16 · COMPUTED · never stored
// ─────────────────────────────────────────────────────────────────────
function sameDayISO(aISO: string, dayISO: string): boolean {
  return aISO.slice(0, 10) === dayISO.slice(0, 10);
}
function nextDayISO(dayISO: string): string {
  const d = new Date(dayISO);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function buildReceptionDiary(entityCode: string, dateISO: string): ReceptionDiaryEntry {
  const day = dateISO.slice(0, 10);
  const tomorrow = nextDayISO(day);
  const visitors = loadVisitors(entityCode);
  const visitorsIn = visitors.filter((v) => v.checkInAt && sameDayISO(v.checkInAt, day)).length;
  const visitorsOut = visitors.filter((v) => v.checkOutAt && sameDayISO(v.checkOutAt, day)).length;
  const overstaysOpen = visitors.filter((v) => v.status === 'on_site').length;

  const nowEnd = `${day}T23:59:59.999Z`;
  const unclaimedInwardMail = getUnclaimedInward(entityCode, nowEnd).map(({ mail, ageDays }) => ({
    mailId: mail.id,
    description: mail.description,
    toEmployeeName: mail.toEmployeeName ?? mail.giftDeclaredByEmployeeId ?? '—',
    ageDays,
  }));
  const unconfirmedOutward = getUnconfirmedOutward(entityCode, nowEnd).map(({ mail, ageDays }) => ({
    mailId: mail.id,
    description: mail.description,
    sentAt: mail.sentAt!,
    ageDays,
  }));
  const expectedCouriers = getUnconfirmedOutward(entityCode, nowEnd)
    .filter(({ mail }) => mail.dispatchMode === 'courier')
    .map(({ mail }) => ({ mailId: mail.id, description: mail.description }));

  const custodyOverdue = getOverdueCustody(entityCode, nowEnd).map((r) => ({
    recordId: r.id,
    assetLabel: r.assetLabel,
    employeeName: r.employeeName,
    dueBackAt: r.dueBackAt!,
  }));

  const appts = readJSON<{ executiveName: string; startAt: string; title: string }[]>(
    `fd_exec_appointments_${entityCode}`, [],
  );
  const tomorrowsAppointments = appts
    .filter((a) => a.startAt.slice(0, 10) === tomorrow)
    .map((a) => ({ title: a.title, executiveName: a.executiveName, startAt: a.startAt }))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  return {
    dateISO: day,
    visitorsIn, visitorsOut, overstaysOpen,
    unclaimedInwardMail, unconfirmedOutward,
    custodyOverdue, tomorrowsAppointments, expectedCouriers,
  };
}

// ─────────────────────────────────────────────────────────────────────
// GATE-ENTRY BRIDGE · DP-FD-1 (gate-entry READ-ONLY)
// ─────────────────────────────────────────────────────────────────────
export function listGateEntriesReadOnly(entityCode: string): GateEntry[] {
  return readJSON<GateEntry[]>(gateEntriesKey(entityCode), []);
}

export function linkVisitorToGateEntry(
  entityCode: string,
  visitorId: string,
  gateEntryId: string,
  byUserId: string,
): { visitorId: string; gateEntryRef: string } {
  const entries = listGateEntriesReadOnly(entityCode);
  const exists = entries.some((g) => g.id === gateEntryId);
  if (!exists) throw new Error(`Gate entry not found: ${gateEntryId}`);
  setVisitorGateRef(entityCode, visitorId, gateEntryId, byUserId);
  return { visitorId, gateEntryRef: gateEntryId };
}
