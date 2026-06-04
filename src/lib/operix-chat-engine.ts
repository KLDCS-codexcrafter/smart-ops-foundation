/**
 * @file        src/lib/operix-chat-engine.ts
 * @realizes    OperixChat MVP · TF-16/24/30ab/37 · org-owned conversations · exit-safe history · voice notes
 * @sprint      Sprint 140 · T-TaskFlow-A641.4 · Pillar A.6.4 · TaskFlow Arc Module 2
 * @canon       TF-30: ORGANIZATION owns conversations · participants come/go but history persists.
 *              TF-30a: ownership is reassignable. TF-30b: removal sets removedAt only — NEVER deletes
 *              history; removed senders can no longer post; owner removal requires transfer first.
 *              TF-24: 10 channel types modelled · omnichannel containers are honest stubs pre-rail-wiring.
 *              TF-37: voice notes as base64 data-urls · 60s / ~1MB caps enforced at engine layer.
 *              TF-16: TaskFlow card hosts OperixChat module (live in S140 via TaskFlowPage switch).
 * @audit       Inline `chat_event` emission via logAudit (entity_type:'chat_event', module:'mca-roc').
 *              ADDITIVE only — NO registerAuditEntityType call (mirrors taskflow_event precedent).
 *              D-AUDIT-SAFE try/catch around every logAudit.
 * @storage     Entity-scoped localStorage: oc_conversations(entityCode) · oc_messages(entityCode).
 * @reads-from  useCurrentUser (UI layer) · useEmployees (UI layer) · party-master-engine (UI layer)
 * @scope-wall  Engine has NO multi-device delivery simulation · NO transcription · NO live rail sync.
 *              deliveryStatus advances only on real read events from this browser. P2BB owns the rest.
 * [JWT]        P2BB: real-time delivery · multi-device fan-out · transcription · omnichannel rail wiring
 */

import type {
  Conversation,
  ConversationParticipant,
  ConversationLinkRef,
  ConversationStats,
  ChatMessage,
  ChannelType,
  MessageType,
  VoiceNoteMeta,
  DeliveryStatus,
  MessageAttachmentMeta,
  MediaVaultItem,
  FollowUp,
  ConversationEscalationRecord,
  ConversationRetentionPolicy,
} from '@/types/operix-chat';
import { logAudit } from '@/lib/audit-trail-engine';

// ── entity-scoped storage keys (mirror tf_* pattern) ───────────────────────
export const conversationsKey = (entityCode: string): string =>
  entityCode ? `oc_conversations_${entityCode}` : 'oc_conversations_system';
export const messagesKey = (entityCode: string): string =>
  entityCode ? `oc_messages_${entityCode}` : 'oc_messages_system';

// ── tiny JSON helpers (mirror taskflow-engine) ─────────────────────────────
const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
};

// ── D-AUDIT-SAFE audit emission ────────────────────────────────────────────
const safeAudit = (entry: Parameters<typeof logAudit>[0]): void => {
  try { logAudit(entry); } catch { /* D-AUDIT-SAFE */ }
};

const newId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const nowISO = (): string => new Date().toISOString();

// ── voice-note caps (TF-37) ────────────────────────────────────────────────
export const VOICE_NOTE_MAX_SECONDS = 60;
export const VOICE_NOTE_MAX_BYTES   = 1024 * 1024; // ~1MB

// ── read helpers ───────────────────────────────────────────────────────────
const readConversations = (entityCode: string): Conversation[] =>
  readJSON<Conversation[]>(conversationsKey(entityCode), []);
const writeConversations = (entityCode: string, list: Conversation[]): void =>
  writeJSON(conversationsKey(entityCode), list);

const readMessages = (entityCode: string): ChatMessage[] =>
  readJSON<ChatMessage[]>(messagesKey(entityCode), []);
const writeMessages = (entityCode: string, list: ChatMessage[]): void =>
  writeJSON(messagesKey(entityCode), list);

const isActiveParticipant = (c: Conversation, userId: string): boolean =>
  c.participants.some((p) => p.userId === userId && !p.removedAt);

// ════════════════════════════════════════════════════════════════════════════
// CONVERSATIONS
// ════════════════════════════════════════════════════════════════════════════

export interface CreateConversationInput {
  channelType: ChannelType;
  title?: string;
  ownerId: string;
  createdByUserId: string;
  participantUserIds: string[];      // creator added automatically if missing
  linkedRefs?: ConversationLinkRef[];
}

const OMNICHANNEL_TYPES: ChannelType[] = ['email_thread', 'whatsapp_thread', 'sms_thread'];

const VALID_CHANNEL_TYPES: ChannelType[] = [
  'direct', 'group', 'department',
  'task', 'customer', 'vendor', 'audit',
  'email_thread', 'whatsapp_thread', 'sms_thread',
];

export function createConversation(
  entityCode: string,
  input: CreateConversationInput,
): Conversation {
  if (!VALID_CHANNEL_TYPES.includes(input.channelType)) {
    throw new Error(`Invalid channelType: ${input.channelType}`);
  }
  if (!input.createdByUserId) throw new Error('createdByUserId required');
  if (!input.ownerId) throw new Error('ownerId required');

  const participantIds = Array.from(new Set([
    input.createdByUserId,
    ...input.participantUserIds,
  ]));

  if (input.channelType === 'direct' && participantIds.length !== 2) {
    throw new Error('direct conversations require exactly 2 participants');
  }

  const ts = nowISO();
  const participants: ConversationParticipant[] = participantIds.map((uid) => ({
    userId: uid,
    role: uid === input.ownerId ? 'owner' : 'member',
    joinedAt: ts,
    removedAt: null,
    removedByUserId: null,
  }));

  const title = input.title?.trim()
    || (input.channelType === 'direct'
      ? `Direct · ${participantIds.join(' / ')}`
      : `${input.channelType} · ${ts.slice(0, 10)}`);

  const conv: Conversation = {
    id: newId('conv'),
    entityId: entityCode,
    channelType: input.channelType,
    title,
    ownerId: input.ownerId,
    participants,
    linkedRefs: input.linkedRefs ?? [],
    isArchived: false,
    lastMessageAt: null,
    createdAt: ts,
    createdByUserId: input.createdByUserId,
  };

  const all = readConversations(entityCode);
  writeConversations(entityCode, [...all, conv]);

  safeAudit({
    entityCode, action: 'create', entityType: 'chat_event', recordId: conv.id,
    recordLabel: `Conversation created · ${conv.channelType} · ${conv.title}`,
    beforeState: null, afterState: conv as unknown as Record<string, unknown>,
    reason: 'conversation.create', sourceModule: 'operix-chat-engine',
  });

  // TF-24 honesty: omnichannel containers carry a system message stating live rail wiring is later.
  if (OMNICHANNEL_TYPES.includes(input.channelType)) {
    appendSystemMessage(
      entityCode, conv.id,
      'External thread container — live sync arrives with rail wiring',
    );
  }

  return conv;
}

export function ensureDirectConversation(
  entityCode: string,
  userA: string,
  userB: string,
): Conversation {
  if (!userA || !userB || userA === userB) throw new Error('two distinct users required');
  const all = readConversations(entityCode);
  const existing = all.find((c) =>
    c.channelType === 'direct'
    && c.participants.length === 2
    && c.participants.every((p) => p.userId === userA || p.userId === userB)
  );
  if (existing) return existing;
  return createConversation(entityCode, {
    channelType: 'direct',
    ownerId: userA,
    createdByUserId: userA,
    participantUserIds: [userA, userB],
  });
}

export interface ListConversationsFilter {
  channelType?: ChannelType;
  linkedRefType?: ConversationLinkRef['type'];
  unreadOnly?: boolean;
  includeArchived?: boolean;
  forUserId?: string;
}

export function listConversations(
  entityCode: string,
  filter: ListConversationsFilter = {},
): Conversation[] {
  let list = readConversations(entityCode);
  if (!filter.includeArchived) list = list.filter((c) => !c.isArchived);
  if (filter.channelType)      list = list.filter((c) => c.channelType === filter.channelType);
  if (filter.linkedRefType)    list = list.filter((c) => c.linkedRefs.some((r) => r.type === filter.linkedRefType));
  if (filter.forUserId)        list = list.filter((c) => isActiveParticipant(c, filter.forUserId!));
  if (filter.unreadOnly && filter.forUserId) {
    const uid = filter.forUserId;
    list = list.filter((c) => getUnreadCount(entityCode, c.id, uid) > 0);
  }
  // newest first by lastMessageAt fallback createdAt
  list = [...list].sort((a, b) => {
    const at = a.lastMessageAt ?? a.createdAt;
    const bt = b.lastMessageAt ?? b.createdAt;
    return bt.localeCompare(at);
  });
  return list;
}

export function listConversationsForUser(
  entityCode: string,
  userId: string,
  filter: Omit<ListConversationsFilter, 'forUserId'> = {},
): Conversation[] {
  return listConversations(entityCode, { ...filter, forUserId: userId });
}

export function getConversation(entityCode: string, id: string): Conversation | null {
  return readConversations(entityCode).find((c) => c.id === id) ?? null;
}

function persistConversation(entityCode: string, updated: Conversation): void {
  const all = readConversations(entityCode);
  writeConversations(entityCode, all.map((c) => (c.id === updated.id ? updated : c)));
}

// ── archive / link ─────────────────────────────────────────────────────────

export function archiveConversation(entityCode: string, convId: string): Conversation {
  const c = getConversation(entityCode, convId);
  if (!c) throw new Error('conversation not found');
  const updated: Conversation = { ...c, isArchived: true };
  persistConversation(entityCode, updated);
  safeAudit({
    entityCode, action: 'update', entityType: 'chat_event', recordId: convId,
    recordLabel: `Conversation archived · ${c.title}`,
    beforeState: { isArchived: c.isArchived }, afterState: { isArchived: true },
    reason: 'conversation.archive', sourceModule: 'operix-chat-engine',
  });
  return updated;
}

export function linkConversation(
  entityCode: string,
  convId: string,
  ref: ConversationLinkRef,
): Conversation {
  const c = getConversation(entityCode, convId);
  if (!c) throw new Error('conversation not found');
  if (c.linkedRefs.some((r) => r.type === ref.type && r.id === ref.id)) return c;
  const updated: Conversation = { ...c, linkedRefs: [...c.linkedRefs, ref] };
  persistConversation(entityCode, updated);
  safeAudit({
    entityCode, action: 'update', entityType: 'chat_event', recordId: convId,
    recordLabel: `Conversation linked · ${ref.type}:${ref.id}`,
    beforeState: { linkedRefs: c.linkedRefs }, afterState: { linkedRefs: updated.linkedRefs },
    reason: 'conversation.link', sourceModule: 'operix-chat-engine',
  });
  return updated;
}

export function unlinkConversation(
  entityCode: string,
  convId: string,
  refType: ConversationLinkRef['type'],
  refId: string,
): Conversation {
  const c = getConversation(entityCode, convId);
  if (!c) throw new Error('conversation not found');
  const next = c.linkedRefs.filter((r) => !(r.type === refType && r.id === refId));
  if (next.length === c.linkedRefs.length) return c;
  const updated: Conversation = { ...c, linkedRefs: next };
  persistConversation(entityCode, updated);
  safeAudit({
    entityCode, action: 'cancel', entityType: 'chat_event', recordId: convId,
    recordLabel: `Conversation unlinked · ${refType}:${refId}`,
    beforeState: { linkedRefs: c.linkedRefs }, afterState: { linkedRefs: updated.linkedRefs },
    reason: 'conversation.unlink', sourceModule: 'operix-chat-engine',
  });
  return updated;
}

// ════════════════════════════════════════════════════════════════════════════
// PARTICIPANTS (TF-30b · exit-safe)
// ════════════════════════════════════════════════════════════════════════════

export function addParticipant(
  entityCode: string,
  convId: string,
  userId: string,
  byUserId: string,
): Conversation {
  const c = getConversation(entityCode, convId);
  if (!c) throw new Error('conversation not found');
  // rejoin allowed: clear removedAt
  const existing = c.participants.find((p) => p.userId === userId);
  let participants: ConversationParticipant[];
  if (existing) {
    if (!existing.removedAt) return c; // already active
    participants = c.participants.map((p) => p.userId === userId
      ? { ...p, removedAt: null, removedByUserId: null, joinedAt: nowISO() }
      : p);
  } else {
    participants = [
      ...c.participants,
      { userId, role: 'member', joinedAt: nowISO(), removedAt: null, removedByUserId: null },
    ];
  }
  const updated: Conversation = { ...c, participants };
  persistConversation(entityCode, updated);
  appendSystemMessage(entityCode, convId, `${userId} was added by ${byUserId}`);
  safeAudit({
    entityCode, action: 'create', entityType: 'chat_event', recordId: convId,
    recordLabel: `Participant added · ${userId}`,
    beforeState: { participantCount: c.participants.length },
    afterState: { participantCount: participants.length },
    reason: 'participant.add', sourceModule: 'operix-chat-engine',
  });
  return updated;
}

export function removeParticipant(
  entityCode: string,
  convId: string,
  userId: string,
  byUserId: string,
): Conversation {
  const c = getConversation(entityCode, convId);
  if (!c) throw new Error('conversation not found');
  const target = c.participants.find((p) => p.userId === userId);
  if (!target || target.removedAt) throw new Error('participant not active');

  // TF-30b: owner cannot be removed without prior ownership transfer.
  if (c.ownerId === userId) {
    throw new Error('owner cannot be removed · transfer ownership first');
  }

  const participants = c.participants.map((p) => p.userId === userId
    ? { ...p, removedAt: nowISO(), removedByUserId: byUserId }
    : p);
  const updated: Conversation = { ...c, participants };
  persistConversation(entityCode, updated);
  appendSystemMessage(entityCode, convId, `${userId} was removed by ${byUserId}`);
  safeAudit({
    entityCode, action: 'cancel', entityType: 'chat_event', recordId: convId,
    recordLabel: `Participant removed · ${userId} by ${byUserId}`,
    beforeState: { activeCount: c.participants.filter((p) => !p.removedAt).length },
    afterState: { activeCount: participants.filter((p) => !p.removedAt).length },
    reason: 'participant.remove', sourceModule: 'operix-chat-engine',
  });
  return updated;
}

export function transferOwnership(
  entityCode: string,
  convId: string,
  toUserId: string,
  byUserId: string,
): Conversation {
  const c = getConversation(entityCode, convId);
  if (!c) throw new Error('conversation not found');
  if (!isActiveParticipant(c, toUserId)) {
    throw new Error('ownership target must be an active participant');
  }
  if (c.ownerId === toUserId) return c;
  const previousOwnerId = c.ownerId;
  const participants = c.participants.map((p) => {
    if (p.userId === toUserId) return { ...p, role: 'owner' as const };
    if (p.userId === previousOwnerId && !p.removedAt) return { ...p, role: 'member' as const };
    return p;
  });
  const updated: Conversation = { ...c, ownerId: toUserId, participants };
  persistConversation(entityCode, updated);
  appendSystemMessage(entityCode, convId, `Ownership transferred from ${previousOwnerId} to ${toUserId} by ${byUserId}`);
  safeAudit({
    entityCode, action: 'update', entityType: 'chat_event', recordId: convId,
    recordLabel: `Ownership transferred · ${previousOwnerId} → ${toUserId}`,
    beforeState: { ownerId: previousOwnerId }, afterState: { ownerId: toUserId },
    reason: 'ownership.transfer', sourceModule: 'operix-chat-engine',
  });
  return updated;
}

// ════════════════════════════════════════════════════════════════════════════
// MESSAGES
// ════════════════════════════════════════════════════════════════════════════

export interface SendMessageInput {
  senderId: string;
  type: MessageType;
  content: string;
  voiceMeta?: VoiceNoteMeta | null;
  attachment?: MessageAttachmentMeta | null; // S142 · TF-30c
  replyToMessageId?: string | null;
  mentions?: string[];
  isInternalNote?: boolean;
}

function appendMessage(entityCode: string, msg: ChatMessage): void {
  const all = readMessages(entityCode);
  writeMessages(entityCode, [...all, msg]);
  const conv = getConversation(entityCode, msg.conversationId);
  if (conv) persistConversation(entityCode, { ...conv, lastMessageAt: msg.createdAt });
}

function appendSystemMessage(entityCode: string, convId: string, content: string): ChatMessage {
  const msg: ChatMessage = {
    id: newId('msg'),
    conversationId: convId,
    senderId: 'system',
    type: 'system',
    content,
    voiceMeta: null,
    attachment: null,
    replyToMessageId: null,
    mentions: [],
    isInternalNote: false,
    isPinned: false,
    isFlagged: false,
    deliveryStatus: 'sent',
    readBy: [],
    createdAt: nowISO(),
    editedAt: null,
    deletedAt: null,
  };
  appendMessage(entityCode, msg);
  return msg;
}

export const ATTACHMENT_MAX_BYTES = 1024 * 1024; // S142 · ~1MB cap

export function sendMessage(
  entityCode: string,
  convId: string,
  input: SendMessageInput,
): ChatMessage {
  const c = getConversation(entityCode, convId);
  if (!c) throw new Error('conversation not found');
  if (!isActiveParticipant(c, input.senderId)) {
    throw new Error('sender no longer a participant');
  }
  if (input.type === 'system') {
    throw new Error('system messages cannot be sent via sendMessage');
  }
  if (!input.content || !input.content.trim()) {
    throw new Error('message content required');
  }
  if (input.type === 'voice') {
    if (!input.voiceMeta) throw new Error('voiceMeta required for voice message');
    if (input.voiceMeta.durationSeconds > VOICE_NOTE_MAX_SECONDS) {
      throw new Error(`voice note exceeds ${VOICE_NOTE_MAX_SECONDS}s cap`);
    }
    if (input.voiceMeta.sizeBytes > VOICE_NOTE_MAX_BYTES) {
      throw new Error(`voice note exceeds ~1MB size cap`);
    }
  }
  if (input.attachment) {
    if (input.attachment.sizeBytes > ATTACHMENT_MAX_BYTES) {
      throw new Error(`attachment exceeds ~1MB size cap`);
    }
    if (!input.attachment.fileName || !input.attachment.mimeType) {
      throw new Error('attachment requires fileName + mimeType');
    }
  }
  if (input.replyToMessageId) {
    const target = readMessages(entityCode).find((m) => m.id === input.replyToMessageId);
    if (!target || target.conversationId !== convId) {
      throw new Error('replyTo message not found in this conversation');
    }
  }

  const ts = nowISO();
  const msg: ChatMessage = {
    id: newId('msg'),
    conversationId: convId,
    senderId: input.senderId,
    type: input.type,
    content: input.content,
    voiceMeta: input.type === 'voice' ? (input.voiceMeta ?? null) : null,
    attachment: input.attachment ?? null,
    replyToMessageId: input.replyToMessageId ?? null,
    mentions: input.mentions ?? [],
    isInternalNote: input.isInternalNote ?? false,
    isPinned: false,
    isFlagged: false,
    deliveryStatus: 'sent',
    readBy: [{ userId: input.senderId, readAt: ts }], // sender has read their own message
    createdAt: ts,
    editedAt: null,
    deletedAt: null,
  };
  appendMessage(entityCode, msg);
  // S142 · refresh media index opportunistically
  try { rebuildMediaVaultIndex(entityCode); } catch { /* index best-effort */ }
  safeAudit({
    entityCode, action: 'create', entityType: 'chat_event', recordId: msg.id,
    recordLabel: `Message sent · ${input.type} · ${convId}`,
    beforeState: null, afterState: { conversationId: convId, type: input.type, isInternalNote: msg.isInternalNote, hasAttachment: !!msg.attachment },
    reason: 'message.send', sourceModule: 'operix-chat-engine',
  });
  return msg;
}

export function listMessages(entityCode: string, convId: string): ChatMessage[] {
  return readMessages(entityCode)
    .filter((m) => m.conversationId === convId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function persistMessage(entityCode: string, updated: ChatMessage): void {
  const all = readMessages(entityCode);
  writeMessages(entityCode, all.map((m) => (m.id === updated.id ? updated : m)));
}

export function markConversationRead(
  entityCode: string,
  convId: string,
  userId: string,
): number {
  const all = readMessages(entityCode);
  const ts = nowISO();
  let touched = 0;
  const next = all.map((m) => {
    if (m.conversationId !== convId) return m;
    if (m.readBy.some((r) => r.userId === userId)) return m;
    touched += 1;
    return {
      ...m,
      readBy: [...m.readBy, { userId, readAt: ts }],
      deliveryStatus: 'read' as DeliveryStatus,
    };
  });
  if (touched > 0) {
    writeMessages(entityCode, next);
    safeAudit({
      entityCode, action: 'update', entityType: 'chat_event', recordId: convId,
      recordLabel: `Conversation read · ${userId} · ${touched} message(s)`,
      beforeState: null, afterState: { readCount: touched },
      reason: 'conversation.markRead', sourceModule: 'operix-chat-engine',
    });
  }
  return touched;
}

export function getUnreadCount(
  entityCode: string,
  convId: string,
  userId: string,
): number {
  return readMessages(entityCode).filter((m) =>
    m.conversationId === convId
    && !m.deletedAt
    && m.senderId !== userId
    && !m.readBy.some((r) => r.userId === userId)
  ).length;
}

export function pinMessage(entityCode: string, msgId: string, pin = true): ChatMessage {
  const all = readMessages(entityCode);
  const m = all.find((x) => x.id === msgId);
  if (!m) throw new Error('message not found');
  const updated: ChatMessage = { ...m, isPinned: pin };
  persistMessage(entityCode, updated);
  safeAudit({
    entityCode, action: 'update', entityType: 'chat_event', recordId: msgId,
    recordLabel: `Message ${pin ? 'pinned' : 'unpinned'} · ${m.conversationId}`,
    beforeState: { isPinned: m.isPinned }, afterState: { isPinned: pin },
    reason: 'message.pin', sourceModule: 'operix-chat-engine',
  });
  return updated;
}

export function flagMessage(entityCode: string, msgId: string, flag = true): ChatMessage {
  const all = readMessages(entityCode);
  const m = all.find((x) => x.id === msgId);
  if (!m) throw new Error('message not found');
  const updated: ChatMessage = { ...m, isFlagged: flag };
  persistMessage(entityCode, updated);
  safeAudit({
    entityCode, action: 'update', entityType: 'chat_event', recordId: msgId,
    recordLabel: `Message ${flag ? 'flagged' : 'unflagged'} · ${m.conversationId}`,
    beforeState: { isFlagged: m.isFlagged }, afterState: { isFlagged: flag },
    reason: 'message.flag', sourceModule: 'operix-chat-engine',
  });
  return updated;
}

export function softDeleteMessage(
  entityCode: string,
  msgId: string,
  byUserId: string,
): ChatMessage {
  const all = readMessages(entityCode);
  const m = all.find((x) => x.id === msgId);
  if (!m) throw new Error('message not found');
  if (m.deletedAt) return m;
  const updated: ChatMessage = {
    ...m,
    content: '[deleted]',
    voiceMeta: null,
    deletedAt: nowISO(),
  };
  persistMessage(entityCode, updated);
  safeAudit({
    entityCode, action: 'cancel', entityType: 'chat_event', recordId: msgId,
    recordLabel: `Message soft-deleted · by ${byUserId} · ${m.conversationId}`,
    beforeState: { type: m.type, length: m.content.length },
    afterState: { deletedAt: updated.deletedAt },
    reason: 'message.softDelete', sourceModule: 'operix-chat-engine',
  });
  return updated;
}

// ════════════════════════════════════════════════════════════════════════════
// STATS
// ════════════════════════════════════════════════════════════════════════════

export function getConversationStats(
  entityCode: string,
  forUserId?: string,
  nowISOArg?: string,
): ConversationStats {
  const convs = readConversations(entityCode);
  const msgs = readMessages(entityCode);
  const now = nowISOArg ?? nowISO();
  const todayKey = now.slice(0, 10);

  const visibleConvs = forUserId
    ? convs.filter((c) => isActiveParticipant(c, forUserId))
    : convs;

  const unreadConversations = forUserId
    ? visibleConvs.filter((c) => getUnreadCount(entityCode, c.id, forUserId) > 0).length
    : 0;

  const messagesToday = msgs.filter((m) => m.createdAt.slice(0, 10) === todayKey).length;
  const pinnedMessages = msgs.filter((m) => m.isPinned && !m.deletedAt).length;
  const voiceNotes = msgs.filter((m) => m.type === 'voice' && !m.deletedAt).length;

  return {
    totalConversations: visibleConvs.length,
    unreadConversations,
    messagesToday,
    pinnedMessages,
    voiceNotes,
  };
}
