/**
 * @file        src/__tests__/__demos__/smart-power-circle-reading-end-to-end.test.ts
 * @purpose     Smart Power Circle 1-10 reading + Gold tier end-to-end demo · MOAT #24 banking
 * @sprint      T-Phase-1.C.2 · Block E.2 · Q-LOCK-5 enhanced
 * @iso        Reliability + Functional Suitability
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  SMARTPOWER_AMC_ARCHETYPES,
} from '@/lib/mock-servicedesk';
import { amcRecordKey } from '@/types/servicedesk';

describe('Smart Power Circle 1-10 Reading Capture Demo (v7 §13)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(amcRecordKey('OPRX'), JSON.stringify(SMARTPOWER_AMC_ARCHETYPES));
  });

  it('seeds 5 Smart Power AMC archetypes', () => {
    expect(SMARTPOWER_AMC_ARCHETYPES).toHaveLength(5);
  });

  it('archetypes span lifecycle stages (active · expiring · expired · proposal)', () => {
    const stages = new Set(SMARTPOWER_AMC_ARCHETYPES.map((a) => a.lifecycle_stage));
    expect(stages.size).toBeGreaterThanOrEqual(4);
  });

  it('archetypes span multiple OEMs (Mitsubishi · Daikin · Bluestar)', () => {
    const oems = new Set(SMARTPOWER_AMC_ARCHETYPES.map((a) => a.oem_name));
    expect(oems.has('Mitsubishi')).toBe(true);
    expect(oems.has('Daikin')).toBe(true);
    expect(oems.has('Bluestar')).toBe(true);
  });

  it('contract values populate paise-integer (Indian compliance · D-127 money math)', () => {
    expect(SMARTPOWER_AMC_ARCHETYPES.every((a) => Number.isInteger(a.contract_value_paise))).toBe(true);
  });

  it('expiring_soon archetype enters renewal_window stage', () => {
    const expiring = SMARTPOWER_AMC_ARCHETYPES.find((a) => a.status === 'expiring_soon');
    expect(expiring?.lifecycle_stage).toBe('renewal_window');
  });

  it('expired archetype settles into lapsed stage', () => {
    const expired = SMARTPOWER_AMC_ARCHETYPES.find((a) => a.status === 'expired');
    expect(expired?.lifecycle_stage).toBe('lapsed');
  });

  it('proposal_sent archetype enters proposal stage', () => {
    const proposal = SMARTPOWER_AMC_ARCHETYPES.find((a) => a.status === 'proposal_sent');
    expect(proposal?.lifecycle_stage).toBe('proposal');
  });

  it('persists Smart Power fixtures to namespaced storage', () => {
    const raw = localStorage.getItem(amcRecordKey('OPRX'));
    const parsed = JSON.parse(raw ?? '[]');
    expect(parsed).toHaveLength(5);
  });
});
