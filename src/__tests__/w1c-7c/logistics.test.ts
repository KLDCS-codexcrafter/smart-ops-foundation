import { describe, it, expect } from 'vitest';
import { logisticActivityKey, lrAcceptancesKey } from '@/types/logistic-portal';
import { ENTITY, setupFreshSeed, readKey } from './_helpers';

describe('W1C-7c · Logistics seed', () => {
  setupFreshSeed();
  it('seeds logistic activity + LR acceptance rows', () => {
    expect(readKey(logisticActivityKey(ENTITY)).length).toBeGreaterThan(0);
    expect(readKey(lrAcceptancesKey(ENTITY)).length).toBeGreaterThan(0);
  });
});
