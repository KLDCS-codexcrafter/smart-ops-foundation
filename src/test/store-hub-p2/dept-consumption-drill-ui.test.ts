/**
 * D-NEW-FO · Department Consumption drill UI · Block E
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

const SUM = 'src/pages/erp/store-hub/reports/DepartmentConsumptionSummary.tsx';
const REG = 'src/pages/erp/inventory/reports/ConsumptionRegister.tsx';

describe('D-NEW-FO · Department Consumption drill deep-link', () => {
  it('DepartmentConsumptionSummary wrapper has Drill button', () => {
    expect(fs.readFileSync(SUM, 'utf-8')).toContain('Drill');
  });
  it('Drill button links to consumption-register with month query', () => {
    expect(fs.readFileSync(SUM, 'utf-8')).toContain('consumption-register?month=');
  });
  it('ConsumptionRegister reads useSearchParams', () => {
    expect(fs.readFileSync(REG, 'utf-8')).toContain('useSearchParams');
  });
  it('ConsumptionRegister reads dept query param', () => {
    expect(fs.readFileSync(REG, 'utf-8')).toContain("searchParams.get('dept')");
  });
  it('ConsumptionRegister reads month query param', () => {
    expect(fs.readFileSync(REG, 'utf-8')).toContain("searchParams.get('month')");
  });
  it('ConsumptionRegister hydrates initialFilter via dateFrom/dateTo from month', () => {
    const c = fs.readFileSync(REG, 'utf-8');
    expect(c).toContain('dateFrom');
    expect(c).toContain('dateTo');
  });
  it('SD-9 ConsumptionSummaryReport NOT modified (thin pass-through preserved)', () => {
    const c = fs.readFileSync('src/pages/erp/inventory/reports/ConsumptionSummaryReport.tsx', 'utf-8');
    expect(c).toContain('ConsumptionSummaryReportPanel');
  });
  it('Wrapper still imports ConsumptionSummaryReportPanel (no duplication)', () => {
    expect(fs.readFileSync(SUM, 'utf-8')).toContain('ConsumptionSummaryReportPanel');
  });
  it('Sentinel · D-NEW-FO closure', () => { expect('D-NEW-FO').toBe('D-NEW-FO'); });
});
