/**
 * @sprint W1C-6 · Block 3 — createMinimalEntity writes a usable entity
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMinimalEntity } from '@/lib/entity-setup-service';

describe('W1C-6 · createMinimalEntity', () => {
  beforeEach(() => localStorage.clear());

  it('rejects an empty name', () => {
    expect(() => createMinimalEntity('   ')).toThrow(/name is required/i);
  });

  it('writes erp_group_entities + erp_companies + seeds erp_parent_company', () => {
    const res = createMinimalEntity('Sharma Traders Pvt Ltd', '27ABCDE1234F1Z5', 'Maharashtra');
    expect(res.shortCode).toMatch(/^[A-Z0-9]{4}$/);

    const ge = JSON.parse(localStorage.getItem('erp_group_entities') ?? '[]');
    expect(ge.find((e: { id: string }) => e.id === res.id)).toBeTruthy();

    const co = JSON.parse(localStorage.getItem('erp_companies') ?? '[]');
    const row = co.find((c: { id: string }) => c.id === res.id);
    expect(row).toBeTruthy();
    expect(row.gstRegs?.[0]?.gstin).toBe('27ABCDE1234F1Z5');

    expect(localStorage.getItem('erp_parent_company')).toBeTruthy();
  });

  it('does not clobber an existing erp_parent_company', () => {
    localStorage.setItem('erp_parent_company', JSON.stringify({ id: 'orig', legalEntityName: 'Original' }));
    createMinimalEntity('New Co');
    const parent = JSON.parse(localStorage.getItem('erp_parent_company')!);
    expect(parent.id).toBe('orig');
  });
});
