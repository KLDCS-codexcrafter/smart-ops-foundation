import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const FILE = join(process.cwd(), 'src/pages/erp/accounting/capital-assets/FixedAssetRegister.tsx');

describe('FK-CAP-2 / FK-CAP-8 FA Register reverse-display', () => {
  it('FixedAssetRegister.tsx exists', () => { expect(existsSync(FILE)).toBe(true); });
  it('has Linked Machines column', () => {
    expect(readFileSync(FILE, 'utf8')).toMatch(/Linked Machines/);
  });
  it('references fixed_asset_id reverse lookup', () => {
    expect(readFileSync(FILE, 'utf8')).toMatch(/fixed_asset_id|equipment/i);
  });
  it('renders a Table', () => {
    expect(readFileSync(FILE, 'utf8')).toMatch(/Table/);
  });
});
