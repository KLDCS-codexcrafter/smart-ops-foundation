import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const FILE = join(process.cwd(), 'src/pages/erp/maintainpro/masters/EquipmentMaster.tsx');

describe('FK-CAP-3 Equipment ↔ Fixed Asset picker', () => {
  it('file exists', () => { expect(existsSync(FILE)).toBe(true); });
  it('has Linked Fixed Asset label', () => {
    expect(readFileSync(FILE, 'utf8')).toMatch(/Linked Fixed Asset/);
  });
  it('references fixed_asset_id field', () => {
    expect(readFileSync(FILE, 'utf8')).toMatch(/fixed_asset_id/);
  });
  it('uses Select for FA picker', () => {
    expect(readFileSync(FILE, 'utf8')).toMatch(/Select/);
  });
});
