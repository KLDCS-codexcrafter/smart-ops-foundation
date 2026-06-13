import { describe, it, expect } from 'vitest';
import { bomKey } from '@/types/bom';
import { ENTITY, setupFreshSeed, readKey } from './_helpers';

describe('W1C-7c · EngineeringX seed', () => {
  setupFreshSeed();
  it('seeds an active BOM with components', () => {
    const rows = readKey<{ is_active: boolean; components: unknown[] }>(bomKey(ENTITY));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].is_active).toBe(true);
    expect(rows[0].components.length).toBeGreaterThan(1);
  });
  it('drawings are served from the shared erp_documents register', () => {
    const docs = readKey<{ document_type: string }>(`erp_documents_${ENTITY}`);
    expect(docs.some(d => d.document_type === 'engineering_drawing')).toBe(true);
  });
});
