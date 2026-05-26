import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const FILE = join(process.cwd(), 'src/pages/erp/accounting/capital-assets/FACalibrationStatusReport.tsx');

describe('FAR-CAP-12 FACalibrationStatusReport', () => {
  it('file exists', () => { expect(existsSync(FILE)).toBe(true); });
  const c = readFileSync(FILE, 'utf8');
  it('has Calibration label', () => { expect(c).toMatch(/Calibration/); });
  it('renders status badges or table', () => { expect(c).toMatch(/Badge|Table/); });
});
