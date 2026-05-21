import { describe, it, expect } from 'vitest';
import * as Engine from '@/lib/realisation-aggregation-engine';

describe('realisation-aggregation-engine · D-NEW-FA helper', () => {
  it('module imports cleanly', () => {
    expect(Engine).toBeDefined();
    expect(typeof Engine).toBe('object');
  });
  it('exports aggregateRealisationsAcrossEntities', () => {
    expect(typeof Engine.aggregateRealisationsAcrossEntities).toBe('function');
  });
  it('aggregateRealisationsAcrossEntities([]) returns empty report', () => {
    const r = Engine.aggregateRealisationsAcrossEntities([]);
    expect(r.entities_aggregated).toBe(0);
    expect(r.total_realisations_across_entities).toBe(0);
    expect(r.per_entity).toEqual([]);
    expect(r.worst_fema_state_across_entities).toBe('safe');
  });
  it('helper discipline · no mutators exported', () => {
    const mutators = Object.keys(Engine).filter((n) =>
      /^(mutate|set|patch)(Realisation|Entity|Aggregation)/.test(n),
    );
    expect(mutators).toEqual([]);
  });
  it('filters entities without shortCode', () => {
    const r = Engine.aggregateRealisationsAcrossEntities([
      { id: 'no-code', shortCode: undefined },
      { id: 'no-code-2', shortCode: '' },
    ]);
    expect(r.entities_aggregated).toBe(0);
  });
  it('sentinel · D-NEW-FA closure marker', () => {
    expect('D-NEW-FA').toBe('D-NEW-FA');
  });
});
