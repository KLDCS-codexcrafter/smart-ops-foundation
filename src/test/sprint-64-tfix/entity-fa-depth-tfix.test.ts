/**
 * @file FAR-0 T-fix · entity-specific FA depth materialized smoke tests
 *       AC#3 remediation verification · Lesson 19 ID-lookup pattern
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ABDOS_FA_MULTI_BU, seedABDOSFAMultiBU } from '@/data/abdos-fa-multi-bu-seed-data';
import { CHRSE_FA_GMP_COMPLIANT, seedCHRSEFAGMPCompliant } from '@/data/chrse-fa-gmp-compliant-seed-data';
import { BCPL_FA_HAZARDOUS_REACTOR, seedBCPLFAHazardousReactor } from '@/data/bcpl-fa-hazardous-reactor-seed-data';
import { SMRTP_FA_MOLD_DIE, seedSMRTPFAMoldDie } from '@/data/smrtp-fa-mold-die-seed-data';
import { AMITH_FA_CNC_MACHINE, seedAMITHFACNCMachine } from '@/data/amith-fa-cnc-machine-seed-data';
import { SHKPH_FA_API_REACTOR, seedSHKPHFAAPIReactor } from '@/data/shkph-fa-api-reactor-seed-data';
import { faUnitsKey } from '@/types/fixed-asset';

describe('FAR-0 T-fix · entity-specific FA depth materialized (AC#3 remediation)', () => {
  beforeEach(() => { localStorage.clear(); });

  it('ABDOS multi-BU seed · expected lookup ID present', () => {
    expect(ABDOS_FA_MULTI_BU.length).toBeGreaterThanOrEqual(4);
    const r = ABDOS_FA_MULTI_BU.find(x => x.id === 'abdos-fa-mb-001');
    expect(r?.it_act_block).toBe('Plant & Machinery');
    expect(r?.custodian_employee_id).toBe(null);
  });

  it('seedABDOSFAMultiBU idempotent · entity-scoped key', () => {
    seedABDOSFAMultiBU('ABDOS');
    seedABDOSFAMultiBU('ABDOS');
    const stored = JSON.parse(localStorage.getItem(faUnitsKey('ABDOS')) || '[]');
    expect(stored.length).toBe(ABDOS_FA_MULTI_BU.length);
  });

  it('CHRSE GMP-compliant seed · idempotent', () => {
    expect(CHRSE_FA_GMP_COMPLIANT.length).toBeGreaterThanOrEqual(4);
    seedCHRSEFAGMPCompliant('CHRSE');
    seedCHRSEFAGMPCompliant('CHRSE');
    expect(JSON.parse(localStorage.getItem(faUnitsKey('CHRSE')) || '[]').length).toBe(CHRSE_FA_GMP_COMPLIANT.length);
  });

  it('BCPL hazardous reactor seed · idempotent', () => {
    expect(BCPL_FA_HAZARDOUS_REACTOR.length).toBeGreaterThanOrEqual(4);
    seedBCPLFAHazardousReactor('BCPL');
    seedBCPLFAHazardousReactor('BCPL');
    expect(JSON.parse(localStorage.getItem(faUnitsKey('BCPL')) || '[]').length).toBe(BCPL_FA_HAZARDOUS_REACTOR.length);
  });

  it('SMRTP mold-die seed · idempotent', () => {
    expect(SMRTP_FA_MOLD_DIE.length).toBeGreaterThanOrEqual(4);
    seedSMRTPFAMoldDie('SMRTP');
    seedSMRTPFAMoldDie('SMRTP');
    expect(JSON.parse(localStorage.getItem(faUnitsKey('SMRTP')) || '[]').length).toBe(SMRTP_FA_MOLD_DIE.length);
  });

  it('AMITH CNC machine seed · distinct custodian_name per machine · idempotent', () => {
    expect(AMITH_FA_CNC_MACHINE.length).toBeGreaterThanOrEqual(4);
    const custodianNames = new Set(AMITH_FA_CNC_MACHINE.map(r => r.custodian_name));
    expect(custodianNames.size).toBe(AMITH_FA_CNC_MACHINE.length);
    seedAMITHFACNCMachine('AMITH');
    seedAMITHFACNCMachine('AMITH');
    expect(JSON.parse(localStorage.getItem(faUnitsKey('AMITH')) || '[]').length).toBe(AMITH_FA_CNC_MACHINE.length);
  });

  it('SHKPH API reactor seed · idempotent', () => {
    expect(SHKPH_FA_API_REACTOR.length).toBeGreaterThanOrEqual(4);
    seedSHKPHFAAPIReactor('SHKPH');
    seedSHKPHFAAPIReactor('SHKPH');
    expect(JSON.parse(localStorage.getItem(faUnitsKey('SHKPH')) || '[]').length).toBe(SHKPH_FA_API_REACTOR.length);
  });
});
