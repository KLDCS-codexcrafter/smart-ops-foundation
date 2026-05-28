/**
 * @file        src/test/sprint-70a/comply360-sprint-70a-snapshot.test.ts
 * @purpose     Sprint 70a institutional snapshot · Comply360 Main Arc 1.2 Pass A
 * @sprint      Sprint 70a · T-Phase-5.A.1.2-PASS-A · Block 6
 * @disciplines FR-58 · FR-100 RECG · Lesson 24 historical-snapshot from inception
 *              All assertions are id-lookup (not array-length / not array-index)
 *              so this suite never goes stale at Sprint 71+ banks.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import {
  aggregateOutwardSupplies,
  aggregateInwardSupplies,
  groupSuppliesByType,
} from '@/lib/comply360-gst-aggregator-engine';
import {
  buildGSTR1,
  buildGSTR1A,
  buildGSTR2B,
} from '@/lib/comply360-gstr-builder-engine';
import {
  IMS_VALID_STATUSES,
  imsStorageKey,
} from '@/lib/comply360-ims-engine';

const SPRINT_70 = 70;

describe('Sprint 70a · T-Phase-5.A.1.2-PASS-A · Comply360 Main Arc 1.2 · institutional snapshot (FR-58 · Lesson 24)', () => {
  it('Sprint 70 entry exists in sprint-history with grade A with adaptations', () => {
    const entry = SPRINTS.find((s) => s.sprintNumber === SPRINT_70 && s.code === 'T-Phase-5.A.1.2-PASS-A');
    expect(entry).toBeDefined();
    expect(entry?.code).toBe('T-Phase-5.A.1.2-PASS-A');
    expect(entry?.grade).toBe('A with adaptations');
    expect(entry?.predecessorSha).toBe('1919be0f3820204191b481b00479da49c95c6f3d');
  });

  it('Sprint 70 records the 3 Pass-A engine siblings', () => {
    const entry = SPRINTS.find((s) => s.sprintNumber === SPRINT_70 && s.code === 'T-Phase-5.A.1.2-PASS-A');
    expect(entry?.newSiblings).toEqual(
      expect.arrayContaining([
        'comply360-gst-aggregator-engine',
        'comply360-gstr-builder-engine',
        'comply360-ims-engine',
      ]),
    );
  });

  it('comply360-gst-aggregator-engine SIBLING registered CONFIRMED at Sprint 70', () => {
    const sib = SIBLINGS.find((s) => s.id === 'comply360-gst-aggregator-engine');
    expect(sib).toBeDefined();
    expect(sib?.path).toBe('src/lib/comply360-gst-aggregator-engine.ts');
    expect(sib?.provenance).toBe('CONFIRMED');
    expect(sib?.sprintAdded).toBe(SPRINT_70);
  });

  it('comply360-gstr-builder-engine SIBLING registered CONFIRMED at Sprint 70', () => {
    const sib = SIBLINGS.find((s) => s.id === 'comply360-gstr-builder-engine');
    expect(sib).toBeDefined();
    expect(sib?.path).toBe('src/lib/comply360-gstr-builder-engine.ts');
    expect(sib?.provenance).toBe('CONFIRMED');
    expect(sib?.sprintAdded).toBe(SPRINT_70);
  });

  it('comply360-ims-engine SIBLING registered CONFIRMED at Sprint 70', () => {
    const sib = SIBLINGS.find((s) => s.id === 'comply360-ims-engine');
    expect(sib).toBeDefined();
    expect(sib?.path).toBe('src/lib/comply360-ims-engine.ts');
    expect(sib?.provenance).toBe('CONFIRMED');
    expect(sib?.sprintAdded).toBe(SPRINT_70);
  });

  it('FR-100 RECG · Sprint 70 SIBLING backing files exist on disk at HEAD', () => {
    const repoRoot = process.cwd();
    const s70 = SIBLINGS.filter((s) => s.sprintAdded === SPRINT_70);
    expect(s70.length).toBeGreaterThanOrEqual(3);
    for (const sib of s70) {
      const full = path.join(repoRoot, sib.path ?? '');
      expect(fs.existsSync(full), `${sib.id} backing file missing: ${sib.path}`).toBe(true);
    }
  });

  it('A-streak advances to >= 17 after Sprint 70 bank (Path α two-cleanly-A discipline)', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(17);
  });

  it('Block 2 aggregator engine exports its public API surface', () => {
    expect(typeof aggregateOutwardSupplies).toBe('function');
    expect(typeof aggregateInwardSupplies).toBe('function');
    expect(typeof groupSuppliesByType).toBe('function');
  });

  it('Block 3 builder engine exports buildGSTR1 / buildGSTR1A / buildGSTR2B', () => {
    expect(typeof buildGSTR1).toBe('function');
    expect(typeof buildGSTR1A).toBe('function');
    expect(typeof buildGSTR2B).toBe('function');
  });

  it('Block 4 IMS engine enumerates all 4 GSTN buyer-action states', () => {
    expect([...IMS_VALID_STATUSES].sort()).toEqual(
      ['accepted', 'kept_pending', 'pending', 'rejected'].sort(),
    );
    expect(imsStorageKey('ent-x', '04-2026')).toContain('comply360.ims.');
  });
});
