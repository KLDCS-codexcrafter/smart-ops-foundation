/**
 * @file        src/lib/cc-compliance-settings.comply360.test.ts
 * @purpose     Unit tests · Block 5 additive Comply360 entity prefs (load/save/reset)
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Cycle 2 Remediation · Block 7
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadComply360EntityPrefs,
  saveComply360EntityPrefs,
  resetComply360EntityPrefs,
  COMPLY360_DEFAULT_ENTITY_PREFS,
  type Comply360EntityPrefs,
} from './cc-compliance-settings';

const ENTITY = 'TEST-ENT-001';

beforeEach(() => {
  resetComply360EntityPrefs(ENTITY);
});

describe('loadComply360EntityPrefs · ratified defaults when unset', () => {
  it('returns defaults with injected entity_code', () => {
    const p = loadComply360EntityPrefs(ENTITY);
    expect(p.entity_code).toBe(ENTITY);
    expect(p.default_role).toBe(COMPLY360_DEFAULT_ENTITY_PREFS.default_role);
    expect(p.show_statutory_memory_widget).toBe(true);
    expect(p.show_health_score_breakdown).toBe(true);
    expect(p.alert_threshold_overdue).toBe(3);
    expect(p.alert_threshold_health_score).toBe(60);
    expect(p.enabled_megamenus).toEqual([]);
  });
});

describe('saveComply360EntityPrefs · round-trip persistence', () => {
  it('persists overrides and reads them back identically', () => {
    const prefs: Comply360EntityPrefs = {
      entity_code: ENTITY,
      default_role: 'cs',
      show_statutory_memory_widget: false,
      show_health_score_breakdown: true,
      alert_threshold_overdue: 5,
      alert_threshold_health_score: 75,
      enabled_megamenus: ['home', 'calendar', 'tax-gst'],
      health_score_weights_override: { 'tax-gst': 0.30 },
    };
    saveComply360EntityPrefs(prefs);
    const back = loadComply360EntityPrefs(ENTITY);
    expect(back).toEqual(prefs);
  });
});

describe('resetComply360EntityPrefs · restores defaults', () => {
  it('clears stored prefs · next load returns defaults', () => {
    saveComply360EntityPrefs({
      entity_code: ENTITY,
      default_role: 'auditor',
      show_statutory_memory_widget: false,
      show_health_score_breakdown: false,
      alert_threshold_overdue: 1,
      alert_threshold_health_score: 90,
      enabled_megamenus: ['home'],
    });
    resetComply360EntityPrefs(ENTITY);
    const back = loadComply360EntityPrefs(ENTITY);
    expect(back.default_role).toBe(COMPLY360_DEFAULT_ENTITY_PREFS.default_role);
    expect(back.enabled_megamenus).toEqual([]);
  });
});

describe('Multi-entity isolation', () => {
  it('prefs for entity A do not leak to entity B', () => {
    const A = 'ENT-A';
    const B = 'ENT-B';
    resetComply360EntityPrefs(A);
    resetComply360EntityPrefs(B);
    saveComply360EntityPrefs({
      entity_code: A, default_role: 'ceo',
      show_statutory_memory_widget: false, show_health_score_breakdown: true,
      alert_threshold_overdue: 7, alert_threshold_health_score: 50, enabled_megamenus: [],
    });
    expect(loadComply360EntityPrefs(B).default_role).toBe(
      COMPLY360_DEFAULT_ENTITY_PREFS.default_role,
    );
    expect(loadComply360EntityPrefs(A).default_role).toBe('ceo');
    resetComply360EntityPrefs(A);
    resetComply360EntityPrefs(B);
  });
});
