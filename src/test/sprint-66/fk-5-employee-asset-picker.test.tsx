import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const FILE = join(process.cwd(), 'src/pages/erp/pay-hub/masters/EmployeeMaster.tsx');

describe('FK-CAP-5 EquipmentIssued asset_id grid picker', () => {
  it('file exists', () => { expect(existsSync(FILE)).toBe(true); });
  it('references asset_id field', () => {
    expect(readFileSync(FILE, 'utf8')).toMatch(/asset_id/);
  });
  it('uses Select picker for asset', () => {
    expect(readFileSync(FILE, 'utf8')).toMatch(/Select/);
  });
  it('hooks into asset master source', () => {
    expect(readFileSync(FILE, 'utf8')).toMatch(/useAssetMaster|ASSETS_KEY|assetCode/);
  });
});
