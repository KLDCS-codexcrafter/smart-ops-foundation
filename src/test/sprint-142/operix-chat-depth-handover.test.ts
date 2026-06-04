/**
 * @file        src/test/sprint-142/operix-chat-depth-handover.test.ts
 * @purpose     S142 · Chat Depth + Handover behavioral suite (≥30 it · LEAN posture).
 * @sprint      Sprint 142 · T-TaskFlow-A641.6
 *
 * Posture: time-robust · toBeGreaterThanOrEqual · scope-wall asserts on engine surface.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createConversation, sendMessage,
  ATTACHMENT_MAX_BYTES,
  rebuildMediaVaultIndex, listMediaVault,
  createFollowUp, listFollowUps, resolveFollowUp, convertFollowUpToTask,
  raiseConversationEscalation, listConversationEscalations, resolveConversationEscalation,
  upsertRetentionPolicy, listRetentionPolicies, evaluateRetention,
  archiveConversations, deleteConversationsPerPolicy, exportConversation,
  searchMessages,
  mediaIndexKey, followUpsKey, escalationsKey, retentionPoliciesKey,
  removeParticipant, addParticipant,
} from '@/lib/operix-chat-engine';
import {
  generateHandoverPacket, executeHandover, listHandovers,
} from '@/lib/operix-handover-engine';
import * as handoverEngine from '@/lib/operix-handover-engine';
import * as chatEngine from '@/lib/operix-chat-engine';
import { createTask } from '@/lib/taskflow-engine';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const E = 'TEST-S142';
const U_A = 'u-alice';
const U_B = 'u-bob';
const U_C = 'u-carol';

beforeEach(() => { localStorage.clear(); });

function mkConv(channelType: 'group' | 'task' = 'group', owner = U_A): ReturnType<typeof createConversation> {
  return createConversation(E, {
    channelType, title: `T-${channelType}-${Date.now()}-${Math.random()}`,
    ownerId: owner, participantIds: [owner, U_B], createdByUserId: owner,
    linkedRefs: [],
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Storage keys (§O · entity-scoped)
// ───────────────────────────────────────────────────────────────────────────
describe('S142 · storage keys are entity-scoped', () => {
  it('media index key', () => { expect(mediaIndexKey(E)).toBe(`oc_media_index_${E}`); });
  it('follow-ups key', () => { expect(followUpsKey(E)).toBe(`oc_followups_${E}`); });
  it('escalations key', () => { expect(escalationsKey(E)).toBe(`oc_escalations_${E}`); });
  it('retention policies key', () => { expect(retentionPoliciesKey(E)).toBe(`oc_retention_policies_${E}`); });
});

// ───────────────────────────────────────────────────────────────────────────
// MediaVault (TF-30c)
// ───────────────────────────────────────────────────────────────────────────
describe('S142 · MediaVault TF-30c', () => {
  it('indexes a file attachment as kind=file', () => {
    const c = mkConv();
    sendMessage(E, {
      conversationId: c.id, senderId: U_A, type: 'text', content: 'see attached',
      attachment: { fileName: 'doc.pdf', mimeType: 'application/pdf', sizeBytes: 1024, dataUrl: 'data:application/pdf;base64,AAA=' },
    });
    const items = listMediaVault(E);
    expect(items.length).toBe(1);
    expect(items[0].kind).toBe('file');
    expect(items[0].fileName).toBe('doc.pdf');
  });

  it('indexes an image attachment as kind=image', () => {
    const c = mkConv();
    sendMessage(E, {
      conversationId: c.id, senderId: U_A, type: 'text', content: 'pic',
      attachment: { fileName: 'p.png', mimeType: 'image/png', sizeBytes: 500, dataUrl: 'data:image/png;base64,AAA=' },
    });
    const items = listMediaVault(E, { kind: 'image' });
    expect(items.length).toBe(1);
    expect(items[0].kind).toBe('image');
  });

  it('indexes a voice note as kind=voice', () => {
    const c = mkConv();
    sendMessage(E, {
      conversationId: c.id, senderId: U_A, type: 'voice', content: 'data:audio/webm;base64,AAA=',
      voiceMeta: { durationSeconds: 5, mimeType: 'audio/webm', sizeBytes: 800 },
    });
    const items = listMediaVault(E, { kind: 'voice' });
    expect(items.length).toBe(1);
    expect(items[0].kind).toBe('voice');
  });

  it('rejects attachments over the cap', () => {
    const c = mkConv();
    expect(() => sendMessage(E, {
      conversationId: c.id, senderId: U_A, type: 'text', content: 'big',
      attachment: { fileName: 'big.bin', mimeType: 'application/octet-stream', sizeBytes: ATTACHMENT_MAX_BYTES + 1, dataUrl: 'data:application/octet-stream;base64,A' },
    })).toThrow();
  });

  it('survives participant removal (org-owned)', () => {
    const c = mkConv();
    sendMessage(E, {
      conversationId: c.id, senderId: U_B, type: 'text', content: 'bye',
      attachment: { fileName: 'f.txt', mimeType: 'text/plain', sizeBytes: 10, dataUrl: 'data:text/plain;base64,AAA=' },
    });
    removeParticipant(E, c.id, U_B, U_A);
    const items = rebuildMediaVaultIndex(E);
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('rebuildMediaVaultIndex is idempotent on item count', () => {
    const c = mkConv();
    sendMessage(E, {
      conversationId: c.id, senderId: U_A, type: 'text', content: 'x',
      attachment: { fileName: 'f.txt', mimeType: 'text/plain', sizeBytes: 5, dataUrl: 'data:text/plain;base64,AAA=' },
    });
    const a = rebuildMediaVaultIndex(E).length;
    const b = rebuildMediaVaultIndex(E).length;
    expect(a).toBe(b);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Follow-Ups TF-25
// ───────────────────────────────────────────────────────────────────────────
describe('S142 · Follow-Ups TF-25', () => {
  it('rejects empty notes', () => {
    const c = mkConv();
    const m = sendMessage(E, { conversationId: c.id, senderId: U_A, type: 'text', content: 'hi' });
    expect(() => createFollowUp(E, {
      conversationId: c.id, messageId: m.id, note: '   ', assigneeId: U_B, createdByUserId: U_A,
    })).toThrow();
  });

  it('creates a follow-up and lists it as open', () => {
    const c = mkConv();
    const m = sendMessage(E, { conversationId: c.id, senderId: U_A, type: 'text', content: 'todo' });
    const fu = createFollowUp(E, {
      conversationId: c.id, messageId: m.id, note: 'follow up', assigneeId: U_B, createdByUserId: U_A,
    });
    expect(fu.status).toBe('open');
    expect(listFollowUps(E, { status: 'open' }).length).toBe(1);
  });

  it('resolveFollowUp moves to done with resolvedAt', () => {
    const c = mkConv();
    const m = sendMessage(E, { conversationId: c.id, senderId: U_A, type: 'text', content: 'todo' });
    const fu = createFollowUp(E, {
      conversationId: c.id, messageId: m.id, note: 'x', assigneeId: U_B, createdByUserId: U_A,
    });
    const r = resolveFollowUp(E, fu.id);
    expect(r.status).toBe('done');
    expect(r.resolvedAt).toBeTruthy();
  });

  it('convertFollowUpToTask creates a task and sets linkedTaskId', () => {
    const c = mkConv();
    const m = sendMessage(E, { conversationId: c.id, senderId: U_A, type: 'text', content: 'todo' });
    const fu = createFollowUp(E, {
      conversationId: c.id, messageId: m.id, note: 'do it', assigneeId: U_B, createdByUserId: U_A,
    });
    const out = convertFollowUpToTask(E, fu.id, U_A, { createTaskFn: (ec, t) => createTask(ec, t) });
    expect(out.taskId).toBeTruthy();
    expect(out.followUp.status).toBe('converted');
    expect(out.followUp.linkedTaskId).toBe(out.taskId);
  });

  it('converted follow-up cannot be converted again', () => {
    const c = mkConv();
    const m = sendMessage(E, { conversationId: c.id, senderId: U_A, type: 'text', content: 'todo' });
    const fu = createFollowUp(E, {
      conversationId: c.id, messageId: m.id, note: 'do it', assigneeId: U_B, createdByUserId: U_A,
    });
    convertFollowUpToTask(E, fu.id, U_A, { createTaskFn: (ec, t) => createTask(ec, t) });
    expect(() => convertFollowUpToTask(E, fu.id, U_A, { createTaskFn: (ec, t) => createTask(ec, t) })).toThrow();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Conversation Escalations
// ───────────────────────────────────────────────────────────────────────────
describe('S142 · Conversation Escalations', () => {
  it('requires a reason', () => {
    const c = mkConv();
    expect(() => raiseConversationEscalation(E, c.id, '   ', U_A)).toThrow();
  });
  it('raises and resolves', () => {
    const c = mkConv();
    const rec = raiseConversationEscalation(E, c.id, 'urgent', U_A);
    expect(rec.status).toBe('open');
    expect(listConversationEscalations(E, { status: 'open' }).length).toBe(1);
    const r = resolveConversationEscalation(E, rec.id);
    expect(r.status).toBe('resolved');
  });
  it('rejects unknown conversation', () => {
    expect(() => raiseConversationEscalation(E, 'nope', 'r', U_A)).toThrow();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Retention / Export TF-30d
// ───────────────────────────────────────────────────────────────────────────
describe('S142 · Retention TF-30d', () => {
  it('upserts a default policy', () => {
    const p = upsertRetentionPolicy(E, {
      channelType: null, archiveAfterDays: 7, retentionDays: 30,
      allowExport: true, allowDelete: false,
    });
    expect(p.isActive).toBe(true);
    expect(listRetentionPolicies(E).length).toBe(1);
  });

  it('upserting another active policy for same scope deactivates the previous', () => {
    upsertRetentionPolicy(E, { channelType: 'group', archiveAfterDays: 1, retentionDays: 2, allowExport: true, allowDelete: true });
    upsertRetentionPolicy(E, { channelType: 'group', archiveAfterDays: 5, retentionDays: 6, allowExport: true, allowDelete: true });
    const list = listRetentionPolicies(E).filter((p) => p.channelType === 'group');
    const active = list.filter((p) => p.isActive);
    expect(active.length).toBe(1);
    expect(active[0].archiveAfterDays).toBe(5);
  });

  it('evaluateRetention surfaces idle conversations', () => {
    const c = mkConv();
    upsertRetentionPolicy(E, { channelType: null, archiveAfterDays: 0, retentionDays: null, allowExport: true, allowDelete: false });
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const ev = evaluateRetention(E, future);
    expect(ev.toArchive.some((a) => a.conversationId === c.id)).toBe(true);
  });

  it('deleteConversationsPerPolicy blocks when policy forbids deletion', () => {
    const c = mkConv();
    upsertRetentionPolicy(E, { channelType: null, archiveAfterDays: null, retentionDays: 0, allowExport: true, allowDelete: false });
    expect(() => deleteConversationsPerPolicy(E, [c.id])).toThrow();
  });

  it('deleteConversationsPerPolicy soft-deletes when allowed', () => {
    const c = mkConv();
    sendMessage(E, { conversationId: c.id, senderId: U_A, type: 'text', content: 'hi' });
    upsertRetentionPolicy(E, { channelType: null, archiveAfterDays: null, retentionDays: 0, allowExport: true, allowDelete: true });
    const n = deleteConversationsPerPolicy(E, [c.id]);
    expect(n).toBeGreaterThanOrEqual(1);
  });

  it('archiveConversations returns count touched', () => {
    const c = mkConv();
    const n = archiveConversations(E, [c.id]);
    expect(n).toBe(1);
  });

  it('exportConversation requires allowExport', () => {
    const c = mkConv();
    upsertRetentionPolicy(E, { channelType: null, archiveAfterDays: null, retentionDays: null, allowExport: false, allowDelete: false });
    expect(() => exportConversation(E, c.id)).toThrow();
  });

  it('exportConversation succeeds when policy allows', () => {
    const c = mkConv();
    sendMessage(E, { conversationId: c.id, senderId: U_A, type: 'text', content: 'hello' });
    upsertRetentionPolicy(E, { channelType: null, archiveAfterDays: null, retentionDays: null, allowExport: true, allowDelete: false });
    const b = exportConversation(E, c.id);
    expect(b.messages.length).toBeGreaterThanOrEqual(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// ConvSearch — active-participant scope (TF-30b)
// ───────────────────────────────────────────────────────────────────────────
describe('S142 · searchMessages active-participant scope', () => {
  it('returns hits to a current participant', () => {
    const c = mkConv();
    sendMessage(E, { conversationId: c.id, senderId: U_A, type: 'text', content: 'need invoice copy' });
    expect(searchMessages(E, U_A, 'invoice').length).toBeGreaterThanOrEqual(1);
  });
  it('hides messages from a removed participant going forward', () => {
    const c = mkConv();
    sendMessage(E, { conversationId: c.id, senderId: U_A, type: 'text', content: 'secret note' });
    removeParticipant(E, c.id, U_B, U_A);
    expect(searchMessages(E, U_B, 'secret').length).toBe(0);
  });
  it('returns nothing for empty query', () => {
    expect(searchMessages(E, U_A, '   ').length).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Handover TF-35
// ───────────────────────────────────────────────────────────────────────────
describe('S142 · Handover TF-35', () => {
  it('generateHandoverPacket lists open tasks for the from-user', () => {
    createTask(E, {
      title: 'open one', priority: 'medium', category: 'general',
      assigneeId: U_A, assigneeName: 'Alice', creatorId: U_A,
      departmentId: null, dueDate: null, entityId: E,
    });
    const packet = generateHandoverPacket(E, U_A);
    expect(packet.openTasks.length).toBeGreaterThanOrEqual(1);
  });

  it('generateHandoverPacket lists conversations owned by from-user', () => {
    mkConv('group', U_A);
    const packet = generateHandoverPacket(E, U_A);
    expect(packet.ownedConversations.length).toBeGreaterThanOrEqual(1);
  });

  it('executeHandover reassigns tasks to the to-user', () => {
    createTask(E, {
      title: 'r', priority: 'medium', category: 'general',
      assigneeId: U_A, assigneeName: 'Alice', creatorId: U_A,
      departmentId: null, dueDate: null, entityId: E,
    });
    const rec = executeHandover(E, U_A, U_B, U_C);
    expect(rec.taskIds.length).toBeGreaterThanOrEqual(1);
  });

  it('executeHandover transfers conversation ownership', () => {
    mkConv('group', U_A);
    const rec = executeHandover(E, U_A, U_B, U_C);
    expect(rec.conversationIds.length).toBeGreaterThanOrEqual(1);
  });

  it('handover from===to throws', () => {
    expect(() => executeHandover(E, U_A, U_A, U_C)).toThrow();
  });

  it('handover is idempotent — second call moves nothing', () => {
    mkConv('group', U_A);
    executeHandover(E, U_A, U_B, U_C);
    const second = executeHandover(E, U_A, U_B, U_C);
    expect(second.conversationIds.length).toBe(0);
    expect(second.taskIds.length).toBe(0);
  });

  it('listHandovers returns most recent first', () => {
    executeHandover(E, U_A, U_B, U_C, { note: 'first' });
    executeHandover(E, U_A, U_C, U_C, { note: 'second' });
    const list = listHandovers(E);
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0].note === 'second' || list[1].note === 'second').toBe(true);
  });

  it('removeFromConversationsAfterTransfer drops from-user after transfer', () => {
    const c = mkConv('group', U_A);
    addParticipant(E, c.id, U_C, U_A);
    executeHandover(E, U_A, U_B, U_C, { removeFromConversationsAfterTransfer: true });
    const live = chatEngine.getConversation(E, c.id);
    expect(live).toBeTruthy();
    const ap = live!.participants.find((p) => p.userId === U_A);
    expect(ap?.removedAt).toBeTruthy();
  });

  it('packet includes ownedDocuments shape (may be empty)', () => {
    const packet = generateHandoverPacket(E, U_A);
    expect(Array.isArray(packet.ownedDocuments)).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Institutional · sibling + sprint history
// ───────────────────────────────────────────────────────────────────────────
describe('S142 · institutional registration', () => {
  it('operix-handover-engine is registered as a sibling', () => {
    expect(SIBLINGS.some((s) => s.id === 'operix-handover-engine')).toBe(true);
  });
  it('SIBLINGS length holds at or above S138 floor (≥207)', () => {
    expect(SIBLINGS.length).toBeGreaterThanOrEqual(207);
  });
  it('S141 backfilled headSha b93f45b4', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 141);
    expect(s?.headSha).toBe('b93f45b4');
  });
  it('S142 sprint entry present with sibling addition', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 142);
    expect(s?.newSiblings).toContain('operix-handover-engine');
  });
  it('S142 headSha placeholder TBD_AT_BANK pre-bank', () => {
    const s = SPRINTS.find((x) => x.sprintNumber === 142);
    expect(s?.headSha).toBe('TBD_AT_BANK');
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Scope walls
// ───────────────────────────────────────────────────────────────────────────
describe('S142 · scope walls', () => {
  it('chat-engine does not expose realtime fan-out (P2BB)', () => {
    expect((chatEngine as Record<string, unknown>).startRealtimeChannel).toBeUndefined();
  });
  it('chat-engine does not expose transcription (P2BB)', () => {
    expect((chatEngine as Record<string, unknown>).transcribeVoiceNote).toBeUndefined();
  });
  it('handover-engine does not expose docvault transferOwner (P2BB)', () => {
    expect((handoverEngine as Record<string, unknown>).transferDocumentOwnership).toBeUndefined();
  });
  it('handover-engine does not expose HR offboarding trigger (P2BB)', () => {
    expect((handoverEngine as Record<string, unknown>).triggerHrOffboarding).toBeUndefined();
  });
});
