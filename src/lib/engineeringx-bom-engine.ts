/**
 * @file        src/lib/engineeringx-bom-engine.ts
 * @purpose     EngineeringX BOM-from-Drawing canonical engine · own entity · NOT FR-73 consumer
 * @sprint      T-Phase-1.A.12 · Q-LOCK-1b + Q-LOCK-3a + Q-LOCK-9a · Block B.1 · NEW canonical engine
 * @decisions   Path B own entity confirmed · DocVault Hub purity preserved · FR-73.1 absolute ·
 *              D-NEW-CP DocumentTag custom_tags engineering metadata pattern (REGISTER 14th canonical · bom_extracted marker) ·
 *              D-NEW-BV Phase 1 mock · FR-11 SSOT
 * @disciplines FR-21 · FR-29 · FR-30 · FR-33 · FR-50
 * @reuses      types/bom-entry.ts · types/engineering-drawing.ts (DRAWING_CUSTOM_TAG_KEYS · helpers) ·
 *              engineeringx-engine.getDrawing (FR-73.2 spoke wrapper · zero-touch reuse)
 * @[JWT]       Phase 2 wires real OCR + ML extraction · `[JWT] /api/engineeringx/bom/extract`
 */

import type { Document } from '@/types/docvault';
import type {
  BomEntry, BomEntryAuditEntry, CreateBomEntryInput,
} from '@/types/bom-entry';
import { bomEntriesKey } from '@/types/bom-entry';
import {
  DRAWING_CUSTOM_TAG_KEYS, parseDrawingCustomTags, buildDrawingCustomTags,
} from '@/types/engineering-drawing';
import { getDrawing } from '@/lib/engineeringx-engine';

// D-NEW-BV pattern · localStorage list reader
function ls<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function ssave<T>(key: string, value: T[]): void {
  // [JWT] POST /api/engineeringx/bom (Phase 2)
  localStorage.setItem(key, JSON.stringify(value));
}

function makeAudit(
  action: BomEntryAuditEntry['action'],
  userId: string,
  userName: string,
  payload?: Record<string, unknown>,
): BomEntryAuditEntry {
  return { ts: new Date().toISOString(), user_id: userId, user_name: userName, action, payload };
}

/** D-NEW-CP institutional pattern · set bom_extracted marker on parent Drawing Document. */
function markDrawingBomExtracted(entityCode: string, drawingId: string, value: 'true' | 'false'): void {
  // [JWT] PATCH /api/docvault/documents/:id/tags (Phase 2)
  const key = `erp_documents_${entityCode}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const docs = JSON.parse(raw) as Document[];
    const idx = docs.findIndex((d) => d.id === drawingId);
    if (idx < 0) return;
    const meta = parseDrawingCustomTags(docs[idx].tags?.custom_tags);
    meta[DRAWING_CUSTOM_TAG_KEYS.bom_extracted] = value;
    docs[idx] = {
      ...docs[idx],
      tags: { ...docs[idx].tags, custom_tags: buildDrawingCustomTags(meta) },
    };
    localStorage.setItem(key, JSON.stringify(docs));
  } catch {
    /* swallow · Phase 2 backend handles */
  }
}

export function loadBomEntries(entityCode: string): BomEntry[] {
  return ls<BomEntry>(bomEntriesKey(entityCode));
}

export function listBomByDrawing(entityCode: string, drawingId: string): BomEntry[] {
  return loadBomEntries(entityCode).filter((b) => b.drawing_id === drawingId);
}

/** Procure360 cross-card consumer query · zero-touch on Procure360 canonical (Q-LOCK-9a). */
export function findBomEntriesByMaterial(entityCode: string, materialCode: string): BomEntry[] {
  return loadBomEntries(entityCode).filter((b) => b.material_code === materialCode);
}

export function getBomEntry(entityCode: string, id: string): BomEntry | null {
  return loadBomEntries(entityCode).find((b) => b.id === id) ?? null;
}

/** Phase 1 mock parser · deterministic by drawing_subtype. */
function phase1MockBomLines(
  drawingSubtype: string | undefined,
): Array<Pick<BomEntry, 'material_code' | 'description' | 'qty' | 'unit' | 'item_no'>> {
  // [JWT] Phase 2 wires real OCR + ML extraction
  const subtype = drawingSubtype ?? 'other';
  switch (subtype) {
    case 'assembly':
      return [
        { item_no: '1', material_code: 'MS-PLATE-10MM', description: 'MS Plate 10mm thickness', qty: 2, unit: 'NOS' },
        { item_no: '2', material_code: 'BOLT-M16-50',   description: 'Hex bolt M16 x 50mm',     qty: 8, unit: 'NOS' },
        { item_no: '3', material_code: 'NUT-M16',       description: 'Hex nut M16',             qty: 8, unit: 'NOS' },
        { item_no: '4', material_code: 'WASHER-M16',    description: 'Flat washer M16',         qty: 16, unit: 'NOS' },
        { item_no: '5', material_code: 'GASKET-RUBBER', description: 'Rubber gasket 100mm',     qty: 1, unit: 'NOS' },
      ];
    case 'electrical':
      return [
        { item_no: '1', material_code: 'CABLE-3C-2.5MM', description: '3-core 2.5mm cable',    qty: 50, unit: 'MTR' },
        { item_no: '2', material_code: 'MCB-32A',        description: 'MCB 32A single pole',   qty: 1,  unit: 'NOS' },
        { item_no: '3', material_code: 'TERMINAL-BLOCK', description: 'Terminal block 12-way', qty: 2,  unit: 'NOS' },
      ];
    case 'p_and_id':
      return [
        { item_no: '1', material_code: 'PIPE-SS-4IN',    description: 'SS pipe 4 inch sch40',   qty: 25, unit: 'MTR' },
        { item_no: '2', material_code: 'VALVE-BALL-4IN', description: 'Ball valve 4 inch',      qty: 4,  unit: 'NOS' },
        { item_no: '3', material_code: 'FLANGE-4IN',     description: 'Flange 4 inch ANSI 150', qty: 8,  unit: 'NOS' },
      ];
    default:
      return [
        { item_no: '1', material_code: 'GENERIC-PART-A', description: 'Generic part A', qty: 1, unit: 'NOS' },
        { item_no: '2', material_code: 'GENERIC-PART-B', description: 'Generic part B', qty: 1, unit: 'NOS' },
      ];
  }
}

export function extractBomFromDrawing(
  entityCode: string,
  drawingId: string,
  extractedBy: { id: string; name: string },
): BomEntry[] {
  const drawing = getDrawing(entityCode, drawingId);
  if (!drawing) return [];

  const meta = parseDrawingCustomTags(drawing.tags?.custom_tags);
  const mockLines = phase1MockBomLines(meta.drawing_subtype);
  const now = new Date().toISOString();

  const entries: BomEntry[] = mockLines.map((line, idx) => ({
    id: `bom-${Date.now()}-${idx}`,
    entity_id: entityCode,
    drawing_id: drawingId,
    material_code: line.material_code,
    description: line.description,
    qty: line.qty,
    unit: line.unit,
    item_no: line.item_no,
    status: 'draft',
    audit_log: [makeAudit('extracted', extractedBy.id, extractedBy.name, { drawing_id: drawingId, drawing_subtype: meta.drawing_subtype })],
    created_at: now,
    updated_at: now,
  }));

  const all = loadBomEntries(entityCode).filter((b) => b.drawing_id !== drawingId);
  ssave(bomEntriesKey(entityCode), [...all, ...entries]);
  markDrawingBomExtracted(entityCode, drawingId, 'true');
  return entries;
}

export function addBomEntry(
  entityCode: string,
  input: CreateBomEntryInput,
  createdBy: { id: string; name: string },
): BomEntry {
  const now = new Date().toISOString();
  const entry: BomEntry = {
    ...input,
    id: `bom-${Date.now()}`,
    entity_id: entityCode,
    status: input.status ?? 'draft',
    audit_log: [makeAudit('created', createdBy.id, createdBy.name, { drawing_id: input.drawing_id })],
    created_at: now,
    updated_at: now,
  };
  const all = loadBomEntries(entityCode);
  ssave(bomEntriesKey(entityCode), [...all, entry]);
  return entry;
}

export function updateBomEntry(
  entityCode: string,
  id: string,
  updates: Partial<Pick<BomEntry, 'qty' | 'unit' | 'description' | 'status' | 'material_code' | 'item_no'>>,
  updatedBy: { id: string; name: string },
): BomEntry | null {
  const all = loadBomEntries(entityCode);
  const idx = all.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  const updated: BomEntry = {
    ...all[idx],
    ...updates,
    audit_log: [...all[idx].audit_log, makeAudit('updated', updatedBy.id, updatedBy.name, updates)],
    updated_at: new Date().toISOString(),
  };
  const next = [...all];
  next[idx] = updated;
  ssave(bomEntriesKey(entityCode), next);
  return updated;
}

export function deleteBomEntry(
  entityCode: string,
  id: string,
  deletedBy: { id: string; name: string },
): boolean {
  return updateBomEntry(entityCode, id, { status: 'obsolete' }, deletedBy) !== null;
}

export function clearBomForDrawing(
  entityCode: string,
  drawingId: string,
  _clearedBy: { id: string; name: string },
): number {
  const all = loadBomEntries(entityCode);
  const remaining = all.filter((b) => b.drawing_id !== drawingId);
  const cleared = all.length - remaining.length;
  ssave(bomEntriesKey(entityCode), remaining);
  if (cleared > 0) markDrawingBomExtracted(entityCode, drawingId, 'false');
  return cleared;
}
