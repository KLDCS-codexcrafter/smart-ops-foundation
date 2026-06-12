/**
 * W1C-4 · Block 1 · rule CRUD + namespaced-key-only writes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  listAutoSendRules,
  upsertAutoSendRule,
  deleteAutoSendRule,
  autoSendRulesKey,
} from '@/lib/auto-send-rules-engine';

const ENT = 'TEST_W1C4_A';

beforeEach(() => {
  localStorage.clear();
});

describe('W1C-4 · auto-send-rules-engine CRUD', () => {
  it('seeds starter rules disabled-by-default on first read', () => {
    const seeded = listAutoSendRules(ENT);
    expect(seeded.length).toBeGreaterThan(0);
    for (const r of seeded) expect(r.enabled).toBe(false);
    expect(seeded.find((r) => r.event === 'approval.pending')).toBeTruthy();
    expect(seeded.find((r) => r.event === 'digest.my_reminders')).toBeTruthy();
  });

  it('writes ONLY to the namespaced key (autoSendRulesKey)', () => {
    listAutoSendRules(ENT);
    const all = Object.keys(localStorage);
    const writes = all.filter((k) => k.includes('auto_send'));
    expect(writes).toEqual([autoSendRulesKey(ENT)]);
  });

  it('upsert + delete round-trip', () => {
    const seeded = listAutoSendRules(ENT);
    const target = seeded[0];
    upsertAutoSendRule(ENT, { ...target, enabled: true });
    expect(listAutoSendRules(ENT).find((r) => r.id === target.id)?.enabled).toBe(true);
    const created = upsertAutoSendRule(ENT, {
      event: 'custom.event',
      enabled: false,
      templateId: 'tpl-x',
      templateObjectType: 'po',
      recipientResolver: 'fixed',
      recipientValue: 'a@b.in',
      senderClass: 'system',
      channel: 'email',
      lang: 'en',
    });
    expect(created.id).toBeTruthy();
    expect(deleteAutoSendRule(ENT, created.id)).toBe(true);
    expect(listAutoSendRules(ENT).find((r) => r.id === created.id)).toBeUndefined();
  });
});
