/**
 * W1C-4 · Block 1 · evaluateAutoSend orchestration tests.
 *  - matching rule → outbox row with queued_for_wave2 + real template render
 *  - disabled rule → no enqueue
 *  - unknown event → no-op
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateAutoSend,
  listAutoSendRules,
  upsertAutoSendRule,
} from '@/lib/auto-send-rules-engine';
import { listOutbox, upsertUserMailProfile } from '@/lib/communication-engine';

const ENT = 'TEST_W1C4_B';

beforeEach(() => {
  localStorage.clear();
});

describe('W1C-4 · evaluateAutoSend', () => {
  it('matching enabled rule → outbox queued_for_wave2 + rendered subject/body', () => {
    const rules = listAutoSendRules(ENT);
    const rule = rules.find((r) => r.event === 'approval.pending')!;
    upsertAutoSendRule(ENT, {
      ...rule,
      enabled: true,
      recipientResolver: 'fixed',
      recipientValue: 'ops@acme.in',
    });

    const result = evaluateAutoSend('approval.pending', {
      entityCode: ENT,
      mergeData: { recipient_name: 'Asha', title: 'PO-101', body: 'Please act.', deep_link: '/x' },
      sourceCard: 'approval-rail',
    });

    expect(result.enqueued.length).toBe(1);
    const msg = result.enqueued[0];
    expect(msg.delivery_mode).toBe('queued_for_wave2');
    expect(msg.status).toBe('queued');
    expect(msg.sender_class).toBe('system');
    expect(msg.to_resolved).toContain('ops@acme.in');
    expect(msg.subject.length).toBeGreaterThan(0);
    expect(msg.body_html).toContain('Asha');

    const outbox = listOutbox(ENT);
    expect(outbox[0].id).toBe(msg.id);
  });

  it('disabled rule → no enqueue (skipped:disabled)', () => {
    listAutoSendRules(ENT);
    const result = evaluateAutoSend('approval.pending', { entityCode: ENT });
    expect(result.enqueued.length).toBe(0);
    expect(result.skipped.some((s) => s.reason === 'disabled')).toBe(true);
  });

  it('unknown event → matched=0 no-op', () => {
    listAutoSendRules(ENT);
    const result = evaluateAutoSend('does.not.exist', { entityCode: ENT });
    expect(result.matched).toBe(0);
    expect(result.enqueued.length).toBe(0);
    expect(listOutbox(ENT).length).toBe(0);
  });

  it('fixed-resolver falls back to targetUserId mail profile when value blank', () => {
    upsertUserMailProfile(ENT, { user_name: 'asha', email_id: 'asha@acme.in' });
    const rules = listAutoSendRules(ENT);
    const rule = rules.find((r) => r.event === 'digest.my_reminders')!;
    upsertAutoSendRule(ENT, { ...rule, enabled: true, recipientResolver: 'fixed', recipientValue: '' });

    const result = evaluateAutoSend('digest.my_reminders', {
      entityCode: ENT,
      targetUserId: 'asha',
      mergeData: { recipient_name: 'asha', count: 3, body: 'recap' },
    });
    expect(result.enqueued.length).toBe(1);
    expect(result.enqueued[0].to_resolved).toContain('asha@acme.in');
  });
});
