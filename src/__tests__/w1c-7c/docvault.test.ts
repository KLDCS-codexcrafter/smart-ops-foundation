import { describe, it, expect } from 'vitest';
import { ENTITY, setupFreshSeed, readKey } from './_helpers';

describe('W1C-7c · DocVault seed', () => {
  setupFreshSeed();
  it('seeds the shared documents register (also serves EngineeringX drawings)', () => {
    const rows = readKey<{ document_type: string }>(`erp_documents_${ENTITY}`);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some(r => r.document_type === 'engineering_drawing')).toBe(true);
  });
});
