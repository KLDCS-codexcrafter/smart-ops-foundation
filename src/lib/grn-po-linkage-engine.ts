/**
 * @file        src/lib/grn-po-linkage-engine.ts
 * @purpose     Sprint B.1 · GRN-PO linkage tracker · separate localStorage map of GRN ID → PO ID ·
 *              with optional reason code for non-PO receipts (B-Q4=C hybrid pattern) · pure
 *              reader+writer · NO GRNEntry modification (B-Q11=A discipline + Sprint A regression
 *              minimization)
 * @who         Internal procurement admin via PI Admin Review (B.1) + B.2 dashboard
 * @when        2026-05-19 (Sprint B.1)
 * @sprint      T-Phase-1.B-1-P2P-Workflow-Closure
 * @iso         ISO 25010 Functional Suitability · Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-EM GRN-PO linkage decoupled storage pattern · maintains B-Q11=A vendor portal
 *              0-diff AND minimizes Sprint A admin-page regression · GRNEntry stays 0-diff ·
 *              Phase 2 promotes linkage to first-class GRN.po_id field with type extension
 * @disciplines FR-30 · FR-50 · FR-79 (engine-side stamping where applicable)
 * @reuses      None · self-contained · localStorage primitives only
 * @[JWT]       Phase 2: POST /api/grn/:id/link-po · GET /api/grn/:id/po-linkage
 *
 * Storage shape:
 *   key: `grn_po_linkage_${entityCode}`
 *   value: Array<GrnPoLinkRecord>
 *
 * Per B-Q4=C hybrid: GRN can OPTIONALLY link to PO · if no PO link · reason code required
 * (e.g. 'sample_receipt' · 'return_from_customer' · 'transfer_in' · 'other_with_note')
 */

export type NoPoReasonCode =
  | 'sample_receipt'
  | 'return_from_customer'
  | 'transfer_in'
  | 'other_with_note';

export interface GrnPoLinkRecord {
  id: string;
  grn_id: string;
  grn_no: string;
  entity_code: string;
  linked_po_id: string | null;
  linked_po_no: string | null;
  no_po_reason: NoPoReasonCode | null;
  no_po_note: string | null;
  linked_at: string;
  linked_by_user_id: string;
}

const grnPoLinkageKey = (entityCode: string): string => `grn_po_linkage_${entityCode}`;

function readLinks(entityCode: string): GrnPoLinkRecord[] {
  try {
    const raw = localStorage.getItem(grnPoLinkageKey(entityCode));
    return raw ? (JSON.parse(raw) as GrnPoLinkRecord[]) : [];
  } catch { return []; }
}

function writeLinks(entityCode: string, links: GrnPoLinkRecord[]): void {
  try {
    localStorage.setItem(grnPoLinkageKey(entityCode), JSON.stringify(links));
  } catch { /* quota exceeded · log to audit */ }
}

let nextSeq = 0;
function newId(): string {
  nextSeq += 1;
  return `gpl_${Date.now()}_${nextSeq}`;
}

export function listGrnPoLinks(entityCode: string): GrnPoLinkRecord[] {
  return readLinks(entityCode);
}

export function getLinkForGrn(grnId: string, entityCode: string): GrnPoLinkRecord | null {
  return readLinks(entityCode).find((l) => l.grn_id === grnId) ?? null;
}

export function getLinksForPo(poId: string, entityCode: string): GrnPoLinkRecord[] {
  return readLinks(entityCode).filter((l) => l.linked_po_id === poId);
}

export interface LinkGrnToPoInput {
  grn_id: string;
  grn_no: string;
  entity_code: string;
  linked_po_id: string;
  linked_po_no: string;
  by_user_id: string;
}

export function linkGrnToPo(input: LinkGrnToPoInput): GrnPoLinkRecord {
  const list = readLinks(input.entity_code);
  const existingIdx = list.findIndex((l) => l.grn_id === input.grn_id);
  const record: GrnPoLinkRecord = {
    id: existingIdx >= 0 ? list[existingIdx].id : newId(),
    grn_id: input.grn_id,
    grn_no: input.grn_no,
    entity_code: input.entity_code,
    linked_po_id: input.linked_po_id,
    linked_po_no: input.linked_po_no,
    no_po_reason: null,
    no_po_note: null,
    linked_at: new Date().toISOString(),
    linked_by_user_id: input.by_user_id,
  };
  if (existingIdx >= 0) list[existingIdx] = record; else list.push(record);
  writeLinks(input.entity_code, list);
  return record;
}

export interface RecordNoPoReceiptInput {
  grn_id: string;
  grn_no: string;
  entity_code: string;
  reason: NoPoReasonCode;
  note: string;
  by_user_id: string;
}

export function recordNoPoReceipt(input: RecordNoPoReceiptInput): GrnPoLinkRecord {
  if (!input.note.trim()) {
    throw new Error('Non-PO receipt requires a note describing the receipt context');
  }
  const list = readLinks(input.entity_code);
  const existingIdx = list.findIndex((l) => l.grn_id === input.grn_id);
  const record: GrnPoLinkRecord = {
    id: existingIdx >= 0 ? list[existingIdx].id : newId(),
    grn_id: input.grn_id,
    grn_no: input.grn_no,
    entity_code: input.entity_code,
    linked_po_id: null,
    linked_po_no: null,
    no_po_reason: input.reason,
    no_po_note: input.note.trim(),
    linked_at: new Date().toISOString(),
    linked_by_user_id: input.by_user_id,
  };
  if (existingIdx >= 0) list[existingIdx] = record; else list.push(record);
  writeLinks(input.entity_code, list);
  return record;
}

export function unlinkGrn(grnId: string, entityCode: string): boolean {
  const list = readLinks(entityCode);
  const idx = list.findIndex((l) => l.grn_id === grnId);
  if (idx < 0) return false;
  list.splice(idx, 1);
  writeLinks(entityCode, list);
  return true;
}

/** Summary stats for B.2 dashboard consumption */
export interface LinkageSummary {
  total_grns_tracked: number;
  with_po_link: number;
  without_po_link: number;
  by_reason: Record<NoPoReasonCode, number>;
}

export function computeLinkageSummary(entityCode: string): LinkageSummary {
  const links = readLinks(entityCode);
  const summary: LinkageSummary = {
    total_grns_tracked: links.length,
    with_po_link: 0,
    without_po_link: 0,
    by_reason: {
      sample_receipt: 0,
      return_from_customer: 0,
      transfer_in: 0,
      other_with_note: 0,
    },
  };
  for (const l of links) {
    if (l.linked_po_id) summary.with_po_link += 1;
    else {
      summary.without_po_link += 1;
      if (l.no_po_reason) summary.by_reason[l.no_po_reason] += 1;
    }
  }
  return summary;
}
