/**
 * W1C-4 · honest starter rules · 5 prompt-suggested events not in the P8.2
 * spine MUST be recorded in STARTER_RULES_UNAVAILABLE and NOT seeded.
 */
import { describe, it, expect } from 'vitest';
import { STARTER_RULES_UNAVAILABLE, listAutoSendRules } from '@/lib/auto-send-rules-engine';

const ENT = 'TEST_W1C4_HONEST';

describe('W1C-4 · honest starter rules', () => {
  it('records the 5 prompt-suggested events that the spine does not emit', () => {
    for (const e of ['voucher-posted', 'po-approved', 'dln-created', 'sla-breach', 'payment-released']) {
      expect(STARTER_RULES_UNAVAILABLE).toContain(e);
    }
  });
  it('does NOT seed rules for unavailable events', () => {
    localStorage.clear();
    const rules = listAutoSendRules(ENT);
    for (const r of rules) {
      expect(STARTER_RULES_UNAVAILABLE).not.toContain(r.event);
    }
  });
});
