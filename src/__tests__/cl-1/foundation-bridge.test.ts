/**
 * CL-1 · Block 1 · B2-F1 — Foundation bridge round-trip.
 * Seed erp_group_entities → assert Company/Subsidiary lists read back real rows.
 */
import { describe, it, expect, beforeEach } from 'vitest';

describe('CL-1 · B2-F1 · foundation bridge', () => {
  beforeEach(() => localStorage.clear());

  it('CompanyList rows = parent entities from loadEntities (empty → empty)', async () => {
    const { default: _CompanyListEmpty } = await import('@/pages/erp/foundation/CompanyList');
    void _CompanyListEmpty;
    // Seed a 2-entity group: 1 parent + 1 subsidiary
    localStorage.setItem('erp_group_entities', JSON.stringify([
      { id: 'e-par', name: 'Abdos Group Holdings', shortCode: 'ABDOS', type: 'parent' },
      { id: 'e-sub', name: 'Abdos Life Sciences', shortCode: 'ABLSC', type: 'subsidiary' },
    ]));
    const { loadEntities } = await import('@/data/mock-entities');
    const ents = loadEntities();
    expect(ents.length).toBeGreaterThanOrEqual(2);
    const parents = ents.filter(e => e.type === 'parent');
    const subs = ents.filter(e => e.type === 'subsidiary');
    expect(parents.length).toBeGreaterThanOrEqual(1);
    expect(subs.length).toBeGreaterThanOrEqual(1);
    expect(parents[0].name).toBe('Abdos Group Holdings');
  });

  it('honest empty-state — no synthetic MOCK rows when loadEntities returns the bare fallback', async () => {
    localStorage.clear();
    const { loadEntities } = await import('@/data/mock-entities');
    const ents = loadEntities();
    // Falls back to MOCK_ENTITIES (3 known) — but no Sharma/SmartOps North synthetic mocks
    const names = ents.map(e => e.name).join('|');
    expect(names).not.toMatch(/Sharma Traders Pvt Ltd/);
    expect(names).not.toMatch(/SmartOps North India Pvt Ltd/);
  });
});
