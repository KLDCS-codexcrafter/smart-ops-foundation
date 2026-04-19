/**
 * family-wallet-engine.ts — Pure family wallet logic
 * Callers supply links + transfers + loyalty ledger; engine returns
 * new entries to persist. No React, no localStorage.
 */

import type { FamilyLink, FamilyTransfer } from '@/types/family-wallet';
import {
  UNDO_WINDOW_HOURS, MAX_FAMILY_MEMBERS, MIN_TRANSFER_POINTS,
} from '@/types/family-wallet';
import type { LoyaltyLedgerEntry } from '@/types/customer-loyalty';

const MS_PER_HOUR = 3_600_000;

export type LinkResult =
  | { ok: true; link: FamilyLink }
  | { ok: false; reason: string };

export interface TransferOk {
  ok: true;
  transfer: FamilyTransfer;
  fromLedger: LoyaltyLedgerEntry;   // negative delta
  toLedger: LoyaltyLedgerEntry;     // positive delta
}
export type TransferAttempt = TransferOk | { ok: false; reason: string };

export type UndoResult =
  | {
      ok: true;
      reversedTransfer: FamilyTransfer;
      reversalFrom: LoyaltyLedgerEntry;
      reversalTo: LoyaltyLedgerEntry;
    }
  | { ok: false; reason: string };

export function attemptLink(
  primaryId: string, linkedId: string, linkedName: string, relationship: string,
  entityCode: string, allLinks: FamilyLink[], createdBy: string,
): LinkResult {
  if (primaryId === linkedId) return { ok: false, reason: 'Cannot link to self' };

  const existing = allLinks.find(l =>
    l.primary_customer_id === primaryId &&
    l.linked_customer_id === linkedId &&
    (l.status === 'pending' || l.status === 'active'));
  if (existing) return { ok: false, reason: 'Already linked' };

  const activeCount = allLinks.filter(l =>
    l.primary_customer_id === primaryId && l.status === 'active').length;
  if (activeCount >= MAX_FAMILY_MEMBERS) {
    return { ok: false, reason: `Max ${MAX_FAMILY_MEMBERS} family members allowed` };
  }

  const now = new Date().toISOString();
  const link: FamilyLink = {
    id: `fl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: entityCode,
    primary_customer_id: primaryId,
    linked_customer_id: linkedId,
    linked_name: linkedName,
    relationship,
    status: 'active',
    linked_at: now,
    ended_at: null,
    created_by: createdBy,
  };
  return { ok: true, link };
}

export function attemptTransfer(
  fromCustomerId: string, fromName: string, fromBalance: number,
  toCustomerId: string, toName: string,
  points: number, giftMessage: string,
  entityCode: string, allLinks: FamilyLink[],
): TransferAttempt {
  if (!Number.isInteger(points) || points <= 0) {
    return { ok: false, reason: 'Invalid points amount' };
  }
  if (points < MIN_TRANSFER_POINTS) {
    return { ok: false, reason: `Minimum transfer is ${MIN_TRANSFER_POINTS} points` };
  }
  if (points > fromBalance) {
    return { ok: false, reason: `Insufficient balance (${fromBalance} available)` };
  }

  const link = allLinks.find(l =>
    l.status === 'active' &&
    ((l.primary_customer_id === fromCustomerId && l.linked_customer_id === toCustomerId) ||
     (l.primary_customer_id === toCustomerId   && l.linked_customer_id === fromCustomerId)));
  if (!link) return { ok: false, reason: 'No active family link exists' };

  const now = new Date();
  const nowIso = now.toISOString();
  const undoUntil = new Date(now.getTime() + UNDO_WINDOW_HOURS * MS_PER_HOUR).toISOString();

  const transferId = `ft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const transfer: FamilyTransfer = {
    id: transferId, entity_id: entityCode,
    from_customer_id: fromCustomerId, from_name: fromName,
    to_customer_id: toCustomerId, to_name: toName,
    points, gift_message: giftMessage,
    status: 'completed',
    transferred_at: nowIso, undo_until: undoUntil,
    undone_at: null,
  };

  const fromLedger: LoyaltyLedgerEntry = {
    id: `l-${Date.now()}-out-${Math.random().toString(36).slice(2, 5)}`,
    entity_id: entityCode,
    customer_id: fromCustomerId,
    action: 'adjustment', points_delta: -points,
    ref_type: 'family_transfer', ref_id: transferId,
    note: `Gifted to ${toName}${giftMessage ? ': ' + giftMessage : ''}`,
    created_at: nowIso, expires_at: null,
  };

  const toLedger: LoyaltyLedgerEntry = {
    id: `l-${Date.now()}-in-${Math.random().toString(36).slice(2, 5)}`,
    entity_id: entityCode,
    customer_id: toCustomerId,
    action: 'adjustment', points_delta: points,
    ref_type: 'family_transfer', ref_id: transferId,
    note: `Received from ${fromName}${giftMessage ? ': ' + giftMessage : ''}`,
    created_at: nowIso, expires_at: null,
  };

  return { ok: true, transfer, fromLedger, toLedger };
}

/** Undo a transfer if still within 24h window. Returns reversal ledger entries. */
export function attemptUndo(
  transferId: string, allTransfers: FamilyTransfer[],
  now: Date = new Date(),
): UndoResult {
  const transfer = allTransfers.find(t => t.id === transferId);
  if (!transfer) return { ok: false, reason: 'Transfer not found' };
  if (transfer.status !== 'completed') return { ok: false, reason: 'Already undone or expired' };
  if (new Date(transfer.undo_until).getTime() < now.getTime()) {
    return { ok: false, reason: '24-hour undo window has expired' };
  }

  const nowIso = now.toISOString();
  const reversedTransfer: FamilyTransfer = { ...transfer, status: 'undone', undone_at: nowIso };

  const reversalFrom: LoyaltyLedgerEntry = {
    id: `l-${Date.now()}-rev-from-${Math.random().toString(36).slice(2, 5)}`,
    entity_id: transfer.entity_id,
    customer_id: transfer.from_customer_id,
    action: 'adjustment', points_delta: transfer.points,
    ref_type: 'family_transfer_undo', ref_id: transfer.id,
    note: `Undo: ${transfer.from_name} cancelled transfer to ${transfer.to_name}`,
    created_at: nowIso, expires_at: null,
  };
  const reversalTo: LoyaltyLedgerEntry = {
    id: `l-${Date.now()}-rev-to-${Math.random().toString(36).slice(2, 5)}`,
    entity_id: transfer.entity_id,
    customer_id: transfer.to_customer_id,
    action: 'adjustment', points_delta: -transfer.points,
    ref_type: 'family_transfer_undo', ref_id: transfer.id,
    note: `Undo: transfer from ${transfer.from_name} was cancelled`,
    created_at: nowIso, expires_at: null,
  };

  return { ok: true, reversedTransfer, reversalFrom, reversalTo };
}
