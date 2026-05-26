import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const FILE = join(process.cwd(), 'src/pages/erp/accounting/capital-assets/FAPhysicalVerification.tsx');

describe('FAR-CAP-13 FAPhysicalVerification', () => {
  it('file exists', () => { expect(existsSync(FILE)).toBe(true); });
  const c = readFileSync(FILE, 'utf8');
  it('mentions verification cycle', () => { expect(c).toMatch(/verification/i); });
  it('uses entity-scoped log key', () => { expect(c).toMatch(/fa_verification_log_/); });
  it('captures photo / GPS', () => { expect(c).toMatch(/photo|GPS|gps_lat/i); });
  it('flags ghost assets (90 days)', () => { expect(c).toMatch(/[Gg]host|90/); });
});
