import { describe, it, expect } from 'vitest';
import { computeDBM, computeSYDM, computeDDBM, computeSFM, computeAM, computeDCFM } from '@/lib/depreciation-methods-extended';

describe('depreciation-methods-extended', () => {
  it('computeDBM returns non-negative', () => {
    expect(computeDBM(100000, 10000, 0.2, 1)).toBeGreaterThan(0);
  });

  it('computeSYDM sums approximate to depreciable amount over life', () => {
    const cost = 100000, salvage = 10000, life = 5;
    let total = 0;
    for (let y = 1; y <= life; y++) total += computeSYDM(cost, salvage, life, y);
    expect(Math.abs(total - (cost - salvage))).toBeLessThan(5);
  });

  it('computeDDBM accelerates depreciation in early years', () => {
    const y1 = computeDDBM(100000, 10000, 5, 1);
    const y2 = computeDDBM(100000, 10000, 5, 2);
    expect(y1).toBeGreaterThan(y2);
  });

  it('computeSFM returns constant deposit', () => {
    const d = computeSFM(100000, 10000, 5, 0.06);
    expect(d).toBeGreaterThan(0);
  });

  it('computeAM returns annual charge', () => {
    expect(computeAM(100000, 5, 0.08)).toBeGreaterThan(0);
  });

  it('computeDCFM allocates based on PV', () => {
    expect(computeDCFM(100000, [20000, 30000, 40000, 50000, 60000], 0.1, 1)).toBeGreaterThan(0);
  });

  it('all methods return 0 for invalid inputs', () => {
    expect(computeSYDM(100, 10, 0, 1)).toBe(0);
    expect(computeDDBM(100, 10, 0, 1)).toBe(0);
    expect(computeSFM(100, 10, 5, 0)).toBe(0);
  });
});
