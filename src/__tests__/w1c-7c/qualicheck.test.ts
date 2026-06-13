import { describe, it, expect } from 'vitest';
import { qaInspectionKey } from '@/types/qa-inspection';
import { ncrKey } from '@/types/ncr';
import { capaKey } from '@/types/capa';
import { ENTITY, setupFreshSeed, readKey } from './_helpers';

describe('W1C-7c · QualiCheck seed', () => {
  setupFreshSeed();
  it('seeds qa inspections, NCRs, and CAPAs against the canonical keys', () => {
    expect(readKey(qaInspectionKey(ENTITY)).length).toBeGreaterThan(0);
    expect(readKey(ncrKey(ENTITY)).length).toBeGreaterThan(0);
    expect(readKey(capaKey(ENTITY)).length).toBeGreaterThan(0);
  });
  it('NCR and CAPA are bidirectionally linked', () => {
    const ncrs = readKey<{ id: string; capa_id: string | null }>(ncrKey(ENTITY));
    const capas = readKey<{ id: string; related_ncr_id: string | null }>(capaKey(ENTITY));
    expect(ncrs[0].capa_id).toBe(capas[0].id);
    expect(capas[0].related_ncr_id).toBe(ncrs[0].id);
  });
});
