import { describe, it, expect } from 'vitest';
import { ENTITY, setupFreshSeed, readKey } from './_helpers';

describe('W1C-7c · ProjX seed', () => {
  setupFreshSeed();
  it('seeds project milestones with EVM-ready earned_value', () => {
    const rows = readKey<{ planned_value: number; earned_value: number }>(
      `erp_project_milestones_${ENTITY}`,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some(r => r.earned_value > 0)).toBe(true);
  });
});
