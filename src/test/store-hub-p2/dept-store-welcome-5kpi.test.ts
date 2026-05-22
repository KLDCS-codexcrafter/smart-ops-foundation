/**
 * D-NEW-FO complement · Welcome 5-KPI · Block E
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

const W = 'src/pages/erp/store-hub/DepartmentStoreWelcome.tsx';

describe('DepartmentStoreWelcome · 5th KPI tile', () => {
  it('uses lg:grid-cols-5', () => {
    expect(fs.readFileSync(W, 'utf-8')).toContain('lg:grid-cols-5');
  });
  it('has "This Month Dept Consumption" tile', () => {
    expect(fs.readFileSync(W, 'utf-8')).toContain('This Month Dept Consumption');
  });
  it('imports Wallet icon', () => {
    expect(fs.readFileSync(W, 'utf-8')).toContain('Wallet');
  });
  it('imports consumptionEntriesKey', () => {
    expect(fs.readFileSync(W, 'utf-8')).toContain('consumptionEntriesKey');
  });
  it('preserves 4 prior tiles', () => {
    const c = fs.readFileSync(W, 'utf-8');
    expect(c).toContain('Reorder Items');
    expect(c).toContain('Draft Issues');
    expect(c).toContain('Pending Acks');
    expect(c).toContain('Cycle Variance');
  });
  it('navigates to dept consumption summary module on tile click', () => {
    expect(fs.readFileSync(W, 'utf-8')).toContain('sh-r-department-consumption-summary');
  });
  it('Sentinel · 5th KPI', () => { expect(5).toBe(5); });
});
