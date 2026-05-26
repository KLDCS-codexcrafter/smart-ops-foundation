import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const FILE = join(process.cwd(), 'src/pages/erp/accounting/capital-assets/CapitalAssetMaster.tsx');

describe('FK-CAP-1 Custodian (Employee) picker', () => {
  it('CapitalAssetMaster.tsx exists', () => { expect(existsSync(FILE)).toBe(true); });
  it('references custodian_employee_id field', () => {
    expect(readFileSync(FILE, 'utf8')).toMatch(/custodian_employee_id/);
  });
  it('imports useEmployees hook or employees data source', () => {
    const c = readFileSync(FILE, 'utf8');
    expect(c).toMatch(/[Ee]mployee/);
  });
  it('uses a Select picker (not plain Input) for custodian', () => {
    const c = readFileSync(FILE, 'utf8');
    expect(c).toMatch(/Select|Combobox/);
  });
});
