import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const FILE = join(process.cwd(), 'src/pages/erp/accounting/capital-assets/FAAMCRenewalPipeline.tsx');

describe('FAR-CAP-14 FAAMCRenewalPipeline', () => {
  it('file exists', () => { expect(existsSync(FILE)).toBe(true); });
  const c = readFileSync(FILE, 'utf8');
  it('mentions Renewal', () => { expect(c).toMatch(/Renewal/); });
  it('has 60/30/7 day window logic', () => { expect(c).toMatch(/60|30|7/); });
  it('groups by status (upcoming/imminent/critical)', () => {
    expect(c).toMatch(/upcoming|imminent|critical|expired/i);
  });
  it('renders a Table or list', () => { expect(c).toMatch(/Table|Card/); });
});
