/**
 * @file        git-engine.ts
 * @sprint      T-Phase-1.2.6f-c-1 · Block C · per D-284 GIT Stage 1 ownership
 * @purpose     Goods in Transit Stage 1 engine · Procure360 owns gate-receipt workflow.
 *              Stage 2 (final inventory) remains FineCore Receipt Note (SD-9 ZERO TOUCH).
 * @decisions   D-284 · D-257 · D-127 · SD-9 · D-194
 * @reuses      po-management-engine · audit-trail-hash-chain
 * @[JWT]       POST /api/procure360/git-stage1
 */

import type { GitStage1Record, GitStage1Line, GitStage1Status } from '@/types/git';
import { gitStage1Key } from '@/types/git';
import type { PurchaseOrderRecord } from '@/types/po';
import { listPurchaseOrders, getPurchaseOrder, updatePoLineReceivedQty } from './po-management-engine';
import { appendAuditEntry } from './audit-trail-hash-chain';

const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function readGit(entityCode: string): GitStage1Record[] {
  try {
    // [JWT] GET /api/procure360/git-stage1?entityCode=...
    const raw = localStorage.getItem(gitStage1Key(entityCode));
    return raw ? (JSON.parse(raw) as GitStage1Record[]) : [];
  } catch {
    return [];
  }
}

function writeGit(entityCode: string, list: GitStage1Record[]): void {
  try {
    // [JWT] POST /api/procure360/git-stage1
    localStorage.setItem(gitStage1Key(entityCode), JSON.stringify(list));
  } catch {
    /* quota silent */
  }
}

function nextGitNo(existing: GitStage1Record[]): string {
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  return `GIT/${ym}/${String(existing.length + 1).padStart(4, '0')}`;
}

export function listGitStage1(entityCode: string): GitStage1Record[] {
  return readGit(entityCode);
}

export function getGitStage1(id: string, entityCode: string): GitStage1Record | null {
  return readGit(entityCode).find((g) => g.id === id) ?? null;
}

export function listInTransit(entityCode: string): PurchaseOrderRecord[] {
  const pos = listPurchaseOrders(entityCode);
  const git = readGit(entityCode);
  const usedPoIds = new Set(git.map((g) => g.po_id));
  return pos.filter((p) =>
    (p.status === 'sent_to_vendor' || p.status === 'partially_received')
    && !usedPoIds.has(p.id),
  );
}

export interface CreateGitStage1Input {
  receipt_date?: string;
  vehicle_no?: string | null;
  driver_name?: string | null;
  invoice_no?: string | null;
  godown_id?: string | null;
  branch_id?: string | null;
  quality_notes?: string;
  quality_check_passed?: boolean;
  lines: Array<{
    po_line_id: string;
    qty_received: number;
    qty_accepted: number;
    qty_rejected: number;
    rejection_reason?: string | null;
  }>;
}

export async function createGitStage1FromPo(
  poId: string,
  input: CreateGitStage1Input,
  entityCode: string,
  byUserId: string,
): Promise<GitStage1Record | null> {
  const po = getPurchaseOrder(poId, entityCode);
  if (!po) return null;
  const list = readGit(entityCode);
  const now = new Date().toISOString();

  const lines: GitStage1Line[] = po.lines.map((pl) => {
    const inLine = input.lines.find((il) => il.po_line_id === pl.id);
    return {
      id: newId('gitl'),
      po_line_id: pl.id,
      item_id: pl.item_id,
      item_name: pl.item_name,
      qty_ordered: pl.qty,
      qty_received: inLine?.qty_received ?? 0,
      qty_accepted: inLine?.qty_accepted ?? 0,
      qty_rejected: inLine?.qty_rejected ?? 0,
      uom: pl.uom,
      rejection_reason: inLine?.rejection_reason ?? null,
    };
  });

  const allRejected = lines.every((l) => l.qty_received === 0 || l.qty_accepted === 0);
  const someRejected = lines.some((l) => l.qty_rejected > 0);
  const status: GitStage1Status = allRejected
    ? 'rejected_at_gate'
    : someRejected ? 'partial_receive' : 'received_at_gate';

  const record: GitStage1Record = {
    id: newId('git'),
    git_no: nextGitNo(list),
    po_id: po.id,
    po_no: po.po_no,
    vendor_id: po.vendor_id,
    vendor_name: po.vendor_name,
    entity_id: po.entity_id,
    branch_id: input.branch_id ?? null,
    godown_id: input.godown_id ?? null,
    receipt_date: input.receipt_date ?? now,
    vehicle_no: input.vehicle_no ?? null,
    driver_name: input.driver_name ?? null,
    invoice_no: input.invoice_no ?? null,
    lines,
    quality_check_passed: input.quality_check_passed ?? !someRejected,
    quality_notes: input.quality_notes ?? '',
    status,
    stage2_grn_id: null,
    stage2_completed_at: null,
    notes: '',
    received_by_user_id: byUserId,
    created_at: now,
    updated_at: now,
  };

  list.push(record);
  writeGit(entityCode, list);

  // Update PO line received qty (auto-cascades PO status partially_received / fully_received)
  for (const l of lines) {
    if (l.qty_accepted > 0) {
      await updatePoLineReceivedQty(po.id, l.po_line_id, l.qty_accepted, entityCode);
    }
  }

  await appendAuditEntry({
    entityCode,
    entityId: po.entity_id,
    voucherId: record.id,
    voucherKind: 'vendor_quotation',
    action: 'git_stage1_created',
    actorUserId: byUserId,
    payload: { git_no: record.git_no, po_no: po.po_no, status },
  });
  return record;
}

const VALID_GIT_TRANSITIONS: Record<GitStage1Status, GitStage1Status[]> = {
  in_transit: ['received_at_gate', 'rejected_at_gate', 'partial_receive'],
  received_at_gate: ['partial_receive'],
  rejected_at_gate: [],
  partial_receive: ['received_at_gate'],
};

export async function transitionGitStatus(
  id: string,
  newStatus: GitStage1Status,
  entityCode: string,
  byUserId: string,
): Promise<GitStage1Record | null> {
  const list = readGit(entityCode);
  const idx = list.findIndex((g) => g.id === id);
  if (idx < 0) return null;
  const cur = list[idx];
  if (!VALID_GIT_TRANSITIONS[cur.status].includes(newStatus)) return null;
  const updated: GitStage1Record = { ...cur, status: newStatus, updated_at: new Date().toISOString() };
  list[idx] = updated;
  writeGit(entityCode, list);
  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: `git_${newStatus}`,
    actorUserId: byUserId,
    payload: { git_no: cur.git_no, from: cur.status, to: newStatus },
  });
  return updated;
}

export async function updateLineQty(
  gitId: string,
  lineId: string,
  qtyAccepted: number,
  qtyRejected: number,
  rejectionReason: string | null,
  entityCode: string,
  byUserId: string,
): Promise<GitStage1Record | null> {
  const list = readGit(entityCode);
  const idx = list.findIndex((g) => g.id === gitId);
  if (idx < 0) return null;
  const cur = list[idx];
  const lines = cur.lines.map((l) =>
    l.id === lineId
      ? { ...l, qty_accepted: qtyAccepted, qty_rejected: qtyRejected, rejection_reason: rejectionReason }
      : l,
  );
  const updated: GitStage1Record = { ...cur, lines, updated_at: new Date().toISOString() };
  list[idx] = updated;
  writeGit(entityCode, list);
  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: 'git_line_updated',
    actorUserId: byUserId,
    payload: { git_no: cur.git_no, line_id: lineId, qty_accepted: qtyAccepted, qty_rejected: qtyRejected },
  });
  return updated;
}

export async function linkToStage2(
  gitId: string,
  stage2GrnId: string,
  entityCode: string,
  byUserId: string,
): Promise<GitStage1Record | null> {
  const list = readGit(entityCode);
  const idx = list.findIndex((g) => g.id === gitId);
  if (idx < 0) return null;
  const cur = list[idx];
  const now = new Date().toISOString();
  const updated: GitStage1Record = {
    ...cur,
    stage2_grn_id: stage2GrnId,
    stage2_completed_at: now,
    updated_at: now,
  };
  list[idx] = updated;
  writeGit(entityCode, list);
  await appendAuditEntry({
    entityCode,
    entityId: cur.entity_id,
    voucherId: cur.id,
    voucherKind: 'vendor_quotation',
    action: 'git_stage2_linked',
    actorUserId: byUserId,
    payload: { git_no: cur.git_no, stage2_grn_id: stage2GrnId },
  });
  return updated;
}

export function computeAgedGitDays(record: GitStage1Record): number {
  const start = new Date(record.created_at).getTime();
  const end = record.stage2_completed_at
    ? new Date(record.stage2_completed_at).getTime()
    : Date.now();
  return Math.max(0, Math.floor((end - start) / 86400000));
}

export type AgeBucket = '0-3' | '4-7' | '8-14' | '15+';

export function listAgedAwaitingStage2(
  entityCode: string,
  ageBucket?: AgeBucket,
): GitStage1Record[] {
  const all = readGit(entityCode).filter(
    (g) => (g.status === 'received_at_gate' || g.status === 'partial_receive') && g.stage2_grn_id === null,
  );
  if (!ageBucket) return all;
  return all.filter((g) => {
    const d = computeAgedGitDays(g);
    if (ageBucket === '0-3') return d <= 3;
    if (ageBucket === '4-7') return d > 3 && d <= 7;
    if (ageBucket === '8-14') return d > 7 && d <= 14;
    return d > 14;
  });
}
