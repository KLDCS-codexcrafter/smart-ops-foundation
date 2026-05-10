/**
 * @file src/test/engineeringx-bom-engine.test.ts
 * @sprint T-Phase-1.A.12 · Q-LOCK-14a · Block H.1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadBomEntries, listBomByDrawing, findBomEntriesByMaterial,
  extractBomFromDrawing, addBomEntry, updateBomEntry, clearBomForDrawing,
} from '@/lib/engineeringx-bom-engine';
import { createDrawing } from '@/lib/engineeringx-engine';
import type { DrawingType } from '@/types/engineering-drawing';

describe('T-Phase-1.A.12 · engineeringx-bom-engine · Path B own entity', () => {
  const entityCode = 'TEST_BOM';
  const user = { id: 'u1', name: 'Test User' };

  beforeEach(() => { localStorage.clear(); });

  function seedDrawing(subtype: DrawingType = 'assembly') {
    return createDrawing(entityCode, {
      drawing_no: 'D-001', title: 'Test Drawing', drawing_type: subtype,
      originating_department_id: 'engineering',
      initial_version: {
        version_no: '1.0', file_url: '[JWT] /api/files/test.pdf',
        file_size_bytes: 1024, uploaded_at: '2026-05-01', uploaded_by: 'u1',
      },
    }, 'u1');
  }

  it('Path B confirmed · BOM is OWN entity (NOT FR-73 consumer)', () => {
    const content = readFileSync('src/lib/engineeringx-bom-engine.ts', 'utf8');
    expect(content).toMatch(/Path B own entity/);
    expect(content).toMatch(/NOT FR-73 consumer/);
  });

  it('D-NEW-CP DocumentTag custom_tags engineering metadata pattern · sentinel cite preserved', () => {
    const content = readFileSync('src/lib/engineeringx-bom-engine.ts', 'utf8');
    expect(content).toMatch(/D-NEW-CP/);
    expect(content).toMatch(/bom_extracted/);
  });

  it('D-NEW-BV Phase 1 mock pattern · localStorage with [JWT] markers', () => {
    const content = readFileSync('src/lib/engineeringx-bom-engine.ts', 'utf8');
    expect(content).toMatch(/D-NEW-BV/);
    expect(content).toMatch(/\[JWT\]/);
  });

  it('extractBomFromDrawing · returns 5 lines for assembly subtype', () => {
    const drw = seedDrawing('assembly');
    const entries = extractBomFromDrawing(entityCode, drw.id, user);
    expect(entries.length).toBe(5);
    expect(entries.every((e) => e.drawing_id === drw.id)).toBe(true);
    expect(entries.every((e) => e.entity_id === entityCode)).toBe(true);
  });

  it('extractBomFromDrawing · returns 3 lines for electrical subtype', () => {
    const drw = seedDrawing('electrical');
    const entries = extractBomFromDrawing(entityCode, drw.id, user);
    expect(entries.length).toBe(3);
  });

  it('listBomByDrawing · filters to drawing_id', () => {
    const drw1 = seedDrawing('assembly');
    extractBomFromDrawing(entityCode, drw1.id, user);
    const list = listBomByDrawing(entityCode, drw1.id);
    expect(list.length).toBe(5);
  });

  it('findBomEntriesByMaterial · Procure360 cross-card consumer query', () => {
    const drw = seedDrawing('assembly');
    extractBomFromDrawing(entityCode, drw.id, user);
    const matches = findBomEntriesByMaterial(entityCode, 'BOLT-M16-50');
    expect(matches.length).toBe(1);
    expect(matches[0].material_code).toBe('BOLT-M16-50');
  });

  it('addBomEntry · manual entry · audit log created', () => {
    const drw = seedDrawing('assembly');
    const entry = addBomEntry(entityCode, {
      drawing_id: drw.id,
      material_code: 'CUSTOM-PART',
      description: 'Custom',
      qty: 2, unit: 'NOS', item_no: '99',
      entity_id: entityCode,
    }, user);
    expect(entry.id).toBeTruthy();
    expect(entry.audit_log[0].action).toBe('created');
  });

  it('updateBomEntry · audit log appended', () => {
    const drw = seedDrawing('assembly');
    const [first] = extractBomFromDrawing(entityCode, drw.id, user);
    const updated = updateBomEntry(entityCode, first.id, { qty: 99, status: 'confirmed' }, user);
    expect(updated?.qty).toBe(99);
    expect(updated?.status).toBe('confirmed');
    expect(updated?.audit_log.length).toBe(2);
  });

  it('clearBomForDrawing · removes all entries for drawing', () => {
    const drw = seedDrawing('assembly');
    extractBomFromDrawing(entityCode, drw.id, user);
    expect(listBomByDrawing(entityCode, drw.id).length).toBe(5);
    const cleared = clearBomForDrawing(entityCode, drw.id, user);
    expect(cleared).toBe(5);
    expect(listBomByDrawing(entityCode, drw.id).length).toBe(0);
  });

  it('loadBomEntries · empty by default', () => {
    expect(loadBomEntries(entityCode)).toEqual([]);
  });

  it('extractBomFromDrawing · sets bom_extracted custom_tag on parent drawing (D-NEW-CP)', () => {
    const drw = seedDrawing('assembly');
    extractBomFromDrawing(entityCode, drw.id, user);
    const raw = localStorage.getItem(`erp_documents_${entityCode}`);
    expect(raw).toBeTruthy();
    expect(raw).toContain('bom_extracted:true');
  });
});
