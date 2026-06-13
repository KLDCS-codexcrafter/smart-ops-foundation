/**
 * W1C-7a · Block 4 — institutional + post-seed coverage assertion.
 *   - sprint-history W1C-6 headSha backfilled to 64dced9.
 *   - sprint-history self-seeds T-W1C7a-CC-Config-Seed with predecessor 64dced9.
 *   - ZERO new SIBLINGs declared.
 *   - Coverage: after loadModule('foundation','all'), the three governance
 *     surfaces (comply360_config marker · auto-send rules enabled ·
 *     integrations) all populate for the demo entity.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { useDemoSeedLoader } from '@/hooks/useDemoSeedLoader';
import {
  comply360ConfigKey,
  integrationsKey,
  DEMO_ENTITY_CODES,
} from '@/lib/cc-config-seed';
import { listAutoSendRules } from '@/lib/auto-send-rules-engine';

beforeEach(() => localStorage.clear());

describe('W1C-7a · institutional', () => {
  it('W1C-6 headSha backfilled to 64dced9', () => {
    const row = SPRINTS.find(s => s.code === 'T-W1C6-First-Run-Seed');
    expect(row).toBeTruthy();
    expect(row!.headSha).toBe('64dced9');
  });

  it('W1C-7a row exists with predecessor 64dced9 and ZERO new SIBLINGs', () => {
    const row = SPRINTS.find(s => s.code === 'T-W1C7a-CC-Config-Seed');
    expect(row).toBeTruthy();
    expect(row!.predecessorSha).toBe('64dced9');
    expect(row!.newSiblings).toEqual([]);
  });
});

describe('W1C-7a · post-seed coverage', () => {
  it('loadModule(foundation,all) populates comply360_config + rules + integrations for demo entity', () => {
    const { loadModule } = useDemoSeedLoader();
    loadModule('foundation', 'all');
    const e = DEMO_ENTITY_CODES[0];
    expect(localStorage.getItem(comply360ConfigKey(e))).toBeTruthy();
    expect(localStorage.getItem(integrationsKey(e))).toBeTruthy();
    const rules = listAutoSendRules(e);
    expect(rules.find(r => r.event === 'approval.pending')?.enabled).toBe(true);
    expect(rules.find(r => r.event === 'digest.my_reminders')?.enabled).toBe(true);
  });
});
