/**
 * @file        src/test/sprint-140/operix-chat.test.ts
 * @purpose     OperixChat MVP behavioral suite (≥30 it · time-robust · LEAN posture)
 * @sprint      Sprint 140 · T-TaskFlow-A641.4 · Pillar A.6.4 · TF-16/24/30ab/37
 *
 * Posture (mirrors S138/S139): toBeGreaterThanOrEqual · no exact toBe(N) counts ·
 * no existsSync-future tombstones · scope-wall via toBeUndefined.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createConversation, ensureDirectConversation, listConversations,
  listConversationsForUser, getConversation, archiveConversation,
  linkConversation, unlinkConversation,
  addParticipant, removeParticipant, transferOwnership,
  sendMessage, listMessages, markConversationRead, getUnreadCount,
  pinMessage, flagMessage, softDeleteMessage, getConversationStats,
  conversationsKey, messagesKey,
  VOICE_NOTE_MAX_SECONDS, VOICE_NOTE_MAX_BYTES,
} from '@/lib/operix-chat-engine';
import * as engine from '@/lib/operix-chat-engine';
import { AUDIT_ENTITY_TYPES_REGISTRY } from '@/lib/comply360-audit-trail-aggregator-engine';

const ENTITY = 'TEST-OC';
const U_OWNER = 'u-owner';
const U_MEMBER = 'u-member';
const U_OUTSIDER = 'u-outsider';

beforeEach(() => {
  localStorage.clear();
});

describe('S140 · OperixChat · storage keys', () => {
  it('conversationsKey is entity-scoped', () => {
    expect(conversationsKey(ENTITY)).toBe('oc_conversations_TEST-OC');
    expect(conversationsKey('')).toBe('oc_conversations_system');
  });
  it('messagesKey is entity-scoped', () => {
    expect(messagesKey(ENTITY)).toBe('oc_messages_TEST-OC');
    expect(messagesKey('')).toBe('oc_messages_system');
  });
});

describe('S140 · OperixChat · createConversation (TF-30)', () => {
  it('rejects invalid channelType', () => {
    expect(() => createConversation(ENTITY, {
      // @ts-expect-error invalid by design
      channelType: 'bogus', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    })).toThrow(/Invalid channelType/);
  });
  it('requires createdByUserId', () => {
    expect(() => createConversation(ENTITY, {
      channelType: 'group', ownerId: U_OWNER, createdByUserId: '', participantUserIds: [U_OWNER, U_MEMBER],
    })).toThrow(/createdByUserId/);
  });
  it('requires ownerId', () => {
    expect(() => createConversation(ENTITY, {
      channelType: 'group', ownerId: '', createdByUserId: U_OWNER, participantUserIds: [U_OWNER],
    })).toThrow(/ownerId/);
  });
  it('direct requires exactly 2 distinct participants', () => {
    expect(() => createConversation(ENTITY, {
      channelType: 'direct', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER],
    })).toThrow(/exactly 2/);
  });
  it('auto-adds creator to participants', () => {
    const c = createConversation(ENTITY, {
      channelType: 'group', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_MEMBER],
    });
    expect(c.participants.map((p) => p.userId)).toContain(U_OWNER);
  });
  it('creator becomes owner role · others become member', () => {
    const c = createConversation(ENTITY, {
      channelType: 'group', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    });
    expect(c.participants.find((p) => p.userId === U_OWNER)?.role).toBe('owner');
    expect(c.participants.find((p) => p.userId === U_MEMBER)?.role).toBe('member');
  });
});

describe('S140 · OperixChat · omnichannel honesty (TF-24)', () => {
  it('email_thread channel emits a system banner message', () => {
    const c = createConversation(ENTITY, {
      channelType: 'email_thread', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    });
    const msgs = listMessages(ENTITY, c.id);
    expect(msgs.length).toBeGreaterThanOrEqual(1);
    expect(msgs[0].type).toBe('system');
  });
  it('all 10 channel types are accepted', () => {
    const all = ['direct', 'group', 'department', 'task', 'customer', 'vendor', 'audit',
      'email_thread', 'whatsapp_thread', 'sms_thread'] as const;
    for (const t of all) {
      const ids = t === 'direct' ? [U_OWNER, U_MEMBER] : [U_OWNER, U_MEMBER];
      expect(() => createConversation(ENTITY, {
        channelType: t, ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: ids,
      })).not.toThrow();
    }
    expect(listConversations(ENTITY).length).toBeGreaterThanOrEqual(10);
  });
});

describe('S140 · OperixChat · ensureDirectConversation (idempotent)', () => {
  it('returns the same conversation across calls (regardless of arg order)', () => {
    const a = ensureDirectConversation(ENTITY, U_OWNER, U_MEMBER);
    const b = ensureDirectConversation(ENTITY, U_MEMBER, U_OWNER);
    expect(b.id).toBe(a.id);
  });
  it('rejects same user on both sides', () => {
    expect(() => ensureDirectConversation(ENTITY, U_OWNER, U_OWNER)).toThrow();
  });
});

describe('S140 · OperixChat · participants (TF-30b · exit-safe)', () => {
  let convId: string;
  beforeEach(() => {
    convId = createConversation(ENTITY, {
      channelType: 'group', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    }).id;
  });
  it('removeParticipant sets removedAt but keeps the entry (history preserved)', () => {
    removeParticipant(ENTITY, convId, U_MEMBER, U_OWNER);
    const c = getConversation(ENTITY, convId)!;
    const p = c.participants.find((x) => x.userId === U_MEMBER)!;
    expect(p.removedAt).toBeTruthy();
    expect(p.removedByUserId).toBe(U_OWNER);
  });
  it('removed sender cannot post', () => {
    removeParticipant(ENTITY, convId, U_MEMBER, U_OWNER);
    expect(() => sendMessage(ENTITY, convId, {
      senderId: U_MEMBER, type: 'text', content: 'hi',
    })).toThrow(/no longer a participant/);
  });
  it('owner cannot be removed without prior ownership transfer', () => {
    expect(() => removeParticipant(ENTITY, convId, U_OWNER, U_MEMBER)).toThrow(/owner cannot be removed/);
  });
  it('outsider sender (never added) cannot post', () => {
    expect(() => sendMessage(ENTITY, convId, {
      senderId: U_OUTSIDER, type: 'text', content: 'hi',
    })).toThrow(/no longer a participant/);
  });
  it('addParticipant clears removedAt on rejoin (no duplicate entry)', () => {
    removeParticipant(ENTITY, convId, U_MEMBER, U_OWNER);
    addParticipant(ENTITY, convId, U_MEMBER, U_OWNER);
    const c = getConversation(ENTITY, convId)!;
    const entries = c.participants.filter((p) => p.userId === U_MEMBER);
    expect(entries.length).toBe(1);
    expect(entries[0].removedAt).toBeNull();
  });
});

describe('S140 · OperixChat · ownership transfer (TF-30a)', () => {
  let convId: string;
  beforeEach(() => {
    convId = createConversation(ENTITY, {
      channelType: 'group', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    }).id;
  });
  it('transfers ownership and updates roles', () => {
    const updated = transferOwnership(ENTITY, convId, U_MEMBER, U_OWNER);
    expect(updated.ownerId).toBe(U_MEMBER);
    expect(updated.participants.find((p) => p.userId === U_MEMBER)?.role).toBe('owner');
    expect(updated.participants.find((p) => p.userId === U_OWNER)?.role).toBe('member');
  });
  it('cannot transfer to non-active participant', () => {
    expect(() => transferOwnership(ENTITY, convId, U_OUTSIDER, U_OWNER)).toThrow(/active participant/);
  });
  it('after transfer, previous owner can be removed', () => {
    transferOwnership(ENTITY, convId, U_MEMBER, U_OWNER);
    expect(() => removeParticipant(ENTITY, convId, U_OWNER, U_MEMBER)).not.toThrow();
  });
});

describe('S140 · OperixChat · messages', () => {
  let convId: string;
  beforeEach(() => {
    convId = createConversation(ENTITY, {
      channelType: 'group', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    }).id;
  });
  it('rejects empty content', () => {
    expect(() => sendMessage(ENTITY, convId, { senderId: U_OWNER, type: 'text', content: '   ' })).toThrow(/content required/);
  });
  it('rejects system messages via sendMessage', () => {
    expect(() => sendMessage(ENTITY, convId, { senderId: U_OWNER, type: 'system', content: 'x' })).toThrow(/system messages/);
  });
  it('voice note requires voiceMeta', () => {
    expect(() => sendMessage(ENTITY, convId, { senderId: U_OWNER, type: 'voice', content: 'data:audio/webm;base64,xx' }))
      .toThrow(/voiceMeta required/);
  });
  it(`voice note enforces ${VOICE_NOTE_MAX_SECONDS}s cap`, () => {
    expect(() => sendMessage(ENTITY, convId, {
      senderId: U_OWNER, type: 'voice', content: 'data:audio/webm;base64,xx',
      voiceMeta: { durationSeconds: VOICE_NOTE_MAX_SECONDS + 1, mimeType: 'audio/webm', sizeBytes: 1000 },
    })).toThrow(/exceeds/);
  });
  it('voice note enforces ~1MB cap', () => {
    expect(() => sendMessage(ENTITY, convId, {
      senderId: U_OWNER, type: 'voice', content: 'data:audio/webm;base64,xx',
      voiceMeta: { durationSeconds: 10, mimeType: 'audio/webm', sizeBytes: VOICE_NOTE_MAX_BYTES + 1 },
    })).toThrow(/size cap/);
  });
  it('replyTo must point to a message in the same conversation', () => {
    expect(() => sendMessage(ENTITY, convId, {
      senderId: U_OWNER, type: 'text', content: 'hi', replyToMessageId: 'nope',
    })).toThrow(/replyTo/);
  });
  it('listMessages returns messages sorted by createdAt ascending', () => {
    sendMessage(ENTITY, convId, { senderId: U_OWNER, type: 'text', content: 'a' });
    sendMessage(ENTITY, convId, { senderId: U_OWNER, type: 'text', content: 'b' });
    const msgs = listMessages(ENTITY, convId);
    expect(msgs.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < msgs.length; i++) {
      expect(msgs[i].createdAt >= msgs[i - 1].createdAt).toBe(true);
    }
  });
  it('softDeleteMessage blanks content but preserves the message id', () => {
    const m = sendMessage(ENTITY, convId, { senderId: U_OWNER, type: 'text', content: 'secret' });
    softDeleteMessage(ENTITY, m.id, U_OWNER);
    const after = listMessages(ENTITY, convId).find((x) => x.id === m.id)!;
    expect(after.deletedAt).toBeTruthy();
    expect(after.content).toBe('[deleted]');
  });
  it('pinMessage toggles isPinned', () => {
    const m = sendMessage(ENTITY, convId, { senderId: U_OWNER, type: 'text', content: 'hi' });
    pinMessage(ENTITY, m.id, true);
    expect(listMessages(ENTITY, convId).find((x) => x.id === m.id)?.isPinned).toBe(true);
  });
  it('flagMessage toggles isFlagged', () => {
    const m = sendMessage(ENTITY, convId, { senderId: U_OWNER, type: 'text', content: 'hi' });
    flagMessage(ENTITY, m.id, true);
    expect(listMessages(ENTITY, convId).find((x) => x.id === m.id)?.isFlagged).toBe(true);
  });
});

describe('S140 · OperixChat · read tracking', () => {
  it('getUnreadCount excludes own messages', () => {
    const c = createConversation(ENTITY, {
      channelType: 'group', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    });
    sendMessage(ENTITY, c.id, { senderId: U_OWNER, type: 'text', content: 'x' });
    expect(getUnreadCount(ENTITY, c.id, U_OWNER)).toBe(0);
    expect(getUnreadCount(ENTITY, c.id, U_MEMBER)).toBeGreaterThanOrEqual(1);
  });
  it('markConversationRead drops unread to zero for that user', () => {
    const c = createConversation(ENTITY, {
      channelType: 'group', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    });
    sendMessage(ENTITY, c.id, { senderId: U_OWNER, type: 'text', content: 'x' });
    markConversationRead(ENTITY, c.id, U_MEMBER);
    expect(getUnreadCount(ENTITY, c.id, U_MEMBER)).toBe(0);
  });
});

describe('S140 · OperixChat · linking + archive + listings', () => {
  it('linkConversation adds linkedRef · unlink removes it', () => {
    const c = createConversation(ENTITY, {
      channelType: 'task', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    });
    linkConversation(ENTITY, c.id, { type: 'task', id: 't-1', label: 'TSK-1' });
    expect(getConversation(ENTITY, c.id)!.linkedRefs.length).toBeGreaterThanOrEqual(1);
    unlinkConversation(ENTITY, c.id, 'task', 't-1');
    expect(getConversation(ENTITY, c.id)!.linkedRefs.find((r) => r.id === 't-1')).toBeUndefined();
  });
  it('archived conversations are hidden by default · returned when includeArchived', () => {
    const c = createConversation(ENTITY, {
      channelType: 'group', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    });
    archiveConversation(ENTITY, c.id);
    expect(listConversations(ENTITY).find((x) => x.id === c.id)).toBeUndefined();
    expect(listConversations(ENTITY, { includeArchived: true }).find((x) => x.id === c.id)).toBeTruthy();
  });
  it('listConversationsForUser filters to active participation', () => {
    createConversation(ENTITY, {
      channelType: 'group', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    });
    expect(listConversationsForUser(ENTITY, U_OUTSIDER).length).toBe(0);
    expect(listConversationsForUser(ENTITY, U_MEMBER).length).toBeGreaterThanOrEqual(1);
  });
});

describe('S140 · OperixChat · stats + entity-scope', () => {
  it('getConversationStats reports non-negative counts', () => {
    const c = createConversation(ENTITY, {
      channelType: 'group', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    });
    sendMessage(ENTITY, c.id, { senderId: U_OWNER, type: 'text', content: 'hi' });
    const stats = getConversationStats(ENTITY, U_OWNER);
    expect(stats.totalConversations).toBeGreaterThanOrEqual(1);
    expect(stats.messagesToday).toBeGreaterThanOrEqual(1);
  });
  it('data does not leak across entities', () => {
    createConversation('ENT-A', {
      channelType: 'group', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    });
    expect(listConversations('ENT-B').length).toBe(0);
  });
});

describe('S140 · OperixChat · audit + guardrails', () => {
  it('chat_event audit type exists on AuditEntityType (additive inline)', () => {
    // Type-level proof: a sample logAudit call would compile with entityType:'chat_event'.
    // Runtime proof via aggregator registry: must NOT be registered (mirrors taskflow_event).
    expect(AUDIT_ENTITY_TYPES_REGISTRY.find((t) => t.id === 'chat_event')).toBeUndefined();
    expect(AUDIT_ENTITY_TYPES_REGISTRY.find((t) => t.id === 'taskflow_event')).toBeUndefined();
  });
  it('engine never imports approval-workflow-engine or push-notification-bridge (§H 0-DIFF)', async () => {
    const src = (await import('fs')).readFileSync('src/lib/operix-chat-engine.ts', 'utf-8');
    expect(src).not.toMatch(/approval-workflow-engine/);
    expect(src).not.toMatch(/push-notification-bridge/);
    expect(src).not.toMatch(/comply360-health-score-engine/);
  });
  it('audit emission is wrapped in try/catch (D-AUDIT-SAFE)', async () => {
    const src = (await import('fs')).readFileSync('src/lib/operix-chat-engine.ts', 'utf-8');
    expect(src).toMatch(/safeAudit/);
    expect(src).toMatch(/try \{ logAudit/);
  });
  it('engine surface does not expose multi-device delivery / transcription (scope wall)', () => {
    expect((engine as Record<string, unknown>).deliverToDevice).toBeUndefined();
    expect((engine as Record<string, unknown>).transcribeMessage).toBeUndefined();
    expect((engine as Record<string, unknown>).syncOmnichannelRail).toBeUndefined();
  });
});

describe('S140 · OperixChat · audit-trail typing', () => {
  it('logAudit accepts chat_event entityType (type-level smoke)', async () => {
    const mod = await import('@/lib/audit-trail-engine');
    const spy = vi.spyOn(mod, 'logAudit');
    const c = createConversation(ENTITY, {
      channelType: 'group', ownerId: U_OWNER, createdByUserId: U_OWNER, participantUserIds: [U_OWNER, U_MEMBER],
    });
    sendMessage(ENTITY, c.id, { senderId: U_OWNER, type: 'text', content: 'hello' });
    const types = spy.mock.calls.map((args) => (args[0] as { entityType: string }).entityType);
    expect(types).toContain('chat_event');
    spy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// S140.T1 · TaskRoom ⇄ OperixChat bridge · ensureTaskConversation
// Idempotency + task-ref linkage shape.
// ─────────────────────────────────────────────────────────────────────────
describe('S140.T1 · ChatTab ensureTaskConversation', () => {
  const fakeTask = { id: 't-1', code: 'TSK-000001', assigneeId: U_MEMBER } as unknown as Parameters<
    typeof import('@/pages/erp/taskflow/TaskRoomPage').ensureTaskConversation
  >[0];

  it('two ensures produce exactly one conversation (idempotent on re-mount)', async () => {
    const { ensureTaskConversation } = await import('@/pages/erp/taskflow/TaskRoomPage');
    const a = ensureTaskConversation(fakeTask, ENTITY, U_OWNER);
    const b = ensureTaskConversation(fakeTask, ENTITY, U_OWNER);
    expect(a.id).toBe(b.id);
    const all = listConversations(ENTITY, { linkedRefType: 'task' })
      .filter((c) => c.linkedRefs.some((r) => r.type === 'task' && r.id === fakeTask.id));
    expect(all.length).toBe(1);
  });

  it('task-ref linkage shape: { type: "task", id: task.id, label: task.code }', async () => {
    const { ensureTaskConversation } = await import('@/pages/erp/taskflow/TaskRoomPage');
    const conv = ensureTaskConversation(fakeTask, ENTITY, U_OWNER);
    const ref = conv.linkedRefs.find((r) => r.type === 'task' && r.id === fakeTask.id);
    expect(ref).toBeDefined();
    expect(ref!.type).toBe('task');
    expect(ref!.id).toBe(fakeTask.id);
    expect(ref!.label).toBe(fakeTask.code);
    expect(conv.channelType).toBe('task');
  });
});
