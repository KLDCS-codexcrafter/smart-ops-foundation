/**
 * W1C-7a · Block 2 — Auto-send rules enabled for demo entities only.
 * Real (non-demo) entities keep the W1C-4 disabled-by-default seed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { seedCCConfigForDemoEntities, DEMO_ENTITY_CODES } from '@/lib/cc-config-seed';
import { listAutoSendRules } from '@/lib/auto-send-rules-engine';

beforeEach(() => localStorage.clear());

describe('W1C-7a · auto-send rules enabled for demo entities', () => {
  it('demo entities → both starter rules report enabled', () => {
    seedCCConfigForDemoEntities();
    for (const e of DEMO_ENTITY_CODES) {
      const rules = listAutoSendRules(e);
      const approval = rules.find(r => r.event === 'approval.pending');
      const digest   = rules.find(r => r.event === 'digest.my_reminders');
      expect(approval?.enabled).toBe(true);
      expect(digest?.enabled).toBe(true);
    }
  });

  it('fresh non-demo entity → rules remain disabled', () => {
    seedCCConfigForDemoEntities();
    const rules = listAutoSendRules('NONDEMO_ACME');
    for (const r of rules) expect(r.enabled).toBe(false);
  });
});
