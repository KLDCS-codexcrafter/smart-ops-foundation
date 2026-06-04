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

// ════════════════════════════════════════════════════════════════════════════
// S142 · CHAT DEPTH + RETENTION + SEARCH (TF-25 · TF-30 c/d)
// ════════════════════════════════════════════════════════════════════════════

export const mediaIndexKey = (entityCode: string): string =>
  entityCode ? `oc_media_index_${entityCode}` : 'oc_media_index_system';
export const followUpsKey = (entityCode: string): string =>
  entityCode ? `oc_followups_${entityCode}` : 'oc_followups_system';
export const escalationsKey = (entityCode: string): string =>
  entityCode ? `oc_escalations_${entityCode}` : 'oc_escalations_system';
export const retentionPoliciesKey = (entityCode: string): string =>
  entityCode ? `oc_retention_policies_${entityCode}` : 'oc_retention_policies_system';

// ── MediaVault (TF-30c) ────────────────────────────────────────────────────
function kindForMessage(m: ChatMessage): 'voice' | 'image' | 'file' | null {
  if (m.type === 'voice' && m.voiceMeta) return 'voice';
  if (m.attachment) {
    if (m.attachment.mimeType.startsWith('image/')) return 'image';
    return 'file';
  }
  return null;
}

export function rebuildMediaVaultIndex(entityCode: string): MediaVaultItem[] {
  const msgs = readMessages(entityCode);
  const convs = readConversations(entityCode);
  const convById = new Map(convs.map((c) => [c.id, c]));
  const items: MediaVaultItem[] = [];
  for (const m of msgs) {
    if (m.deletedAt) continue;
    const kind = kindForMessage(m);
    if (!kind) continue;
    const conv = convById.get(m.conversationId);
    if (!conv) continue;
    const fileName = kind === 'voice'
      ? `voice-${m.id}.webm`
      : (m.attachment?.fileName ?? `file-${m.id}`);
    const mimeType = kind === 'voice'
      ? (m.voiceMeta?.mimeType ?? 'audio/webm')
      : (m.attachment?.mimeType ?? 'application/octet-stream');
    const sizeBytes = kind === 'voice'
      ? (m.voiceMeta?.sizeBytes ?? 0)
      : (m.attachment?.sizeBytes ?? 0);
    items.push({
      id: `mv-${m.id}`,
      entityId: entityCode,
      conversationId: m.conversationId,
      messageId: m.id,
      kind,
      fileName, mimeType, sizeBytes,
      uploadedByUserId: m.senderId,
      uploadedAt: m.createdAt,
      linkedRefs: [...conv.linkedRefs],
    });
  }
  writeJSON(mediaIndexKey(entityCode), items);
  return items;
}

export interface ListMediaVaultFilter {
  kind?: 'voice' | 'file' | 'image';
  conversationId?: string;
  linkedRefType?: ConversationLinkRef['type'];
}

export function listMediaVault(entityCode: string, filter: ListMediaVaultFilter = {}): MediaVaultItem[] {
  let items = readJSON<MediaVaultItem[]>(mediaIndexKey(entityCode), []);
  if (items.length === 0) items = rebuildMediaVaultIndex(entityCode);
  if (filter.kind) items = items.filter((i) => i.kind === filter.kind);
  if (filter.conversationId) items = items.filter((i) => i.conversationId === filter.conversationId);
  if (filter.linkedRefType) items = items.filter((i) => i.linkedRefs.some((r) => r.type === filter.linkedRefType));
  return [...items].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

// ── FollowUps (TF-25) ──────────────────────────────────────────────────────
export interface CreateFollowUpInput {
  conversationId: string;
  messageId: string;
  note: string;
  assigneeId: string;
  dueDate?: string | null;
  createdByUserId: string;
}

export function createFollowUp(entityCode: string, input: CreateFollowUpInput): FollowUp {
  if (!input.note || !input.note.trim()) throw new Error('follow-up note required');
  const msg = readMessages(entityCode).find((m) => m.id === input.messageId);
  if (!msg || msg.conversationId !== input.conversationId) {
    throw new Error('follow-up: source message not found in conversation');
  }
  const fu: FollowUp = {
    id: newId('fu'),
    entityId: entityCode,
    conversationId: input.conversationId,
    messageId: input.messageId,
    note: input.note.trim(),
    assigneeId: input.assigneeId,
    dueDate: input.dueDate ?? null,
    status: 'open',
    linkedTaskId: null,
    createdByUserId: input.createdByUserId,
    createdAt: nowISO(),
    resolvedAt: null,
  };
  const all = readJSON<FollowUp[]>(followUpsKey(entityCode), []);
  writeJSON(followUpsKey(entityCode), [...all, fu]);
  safeAudit({
    entityCode, action: 'create', entityType: 'chat_event', recordId: fu.id,
    recordLabel: `Follow-up created · ${fu.conversationId}`,
    beforeState: null, afterState: { assigneeId: fu.assigneeId, dueDate: fu.dueDate },
    reason: 'followup.create', sourceModule: 'operix-chat-engine',
  });
  return fu;
}

export function listFollowUps(entityCode: string, filter: { status?: FollowUp['status']; assigneeId?: string } = {}): FollowUp[] {
  let list = readJSON<FollowUp[]>(followUpsKey(entityCode), []);
  if (filter.status) list = list.filter((f) => f.status === filter.status);
  if (filter.assigneeId) list = list.filter((f) => f.assigneeId === filter.assigneeId);
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function resolveFollowUp(entityCode: string, id: string): FollowUp {
  const all = readJSON<FollowUp[]>(followUpsKey(entityCode), []);
  const fu = all.find((f) => f.id === id);
  if (!fu) throw new Error('follow-up not found');
  if (fu.status === 'converted') return fu; // immutable terminal
  const next: FollowUp = { ...fu, status: 'done', resolvedAt: nowISO() };
  writeJSON(followUpsKey(entityCode), all.map((f) => (f.id === id ? next : f)));
  safeAudit({
    entityCode, action: 'update', entityType: 'chat_event', recordId: id,
    recordLabel: `Follow-up resolved`,
    beforeState: { status: fu.status }, afterState: { status: 'done' },
    reason: 'followup.resolve', sourceModule: 'operix-chat-engine',
  });
  return next;
}

// TF-25 chat→task bridge · returns updated follow-up (linkedTaskId set)
export interface ConvertFollowUpToTaskDeps {
  createTaskFn: (entityCode: string, taskInput: {
    title: string; description?: string; assigneeId: string | null; assigneeName: string;
    creatorId: string; departmentId: string | null; priority: 'critical' | 'high' | 'medium' | 'low';
    category: 'general'; dueDate: string | null; tags?: string[]; entityId: string;
  }) => { id: string };
}

export function convertFollowUpToTask(
  entityCode: string,
  followUpId: string,
  byUserId: string,
  deps: ConvertFollowUpToTaskDeps,
): { followUp: FollowUp; taskId: string } {
  const all = readJSON<FollowUp[]>(followUpsKey(entityCode), []);
  const fu = all.find((f) => f.id === followUpId);
  if (!fu) throw new Error('follow-up not found');
  if (fu.status === 'converted') throw new Error('follow-up already converted');
  const task = deps.createTaskFn(entityCode, {
    title: fu.note,
    description: `Converted from chat follow-up ${fu.id} (conversation ${fu.conversationId})`,
    assigneeId: fu.assigneeId,
    assigneeName: fu.assigneeId,
    creatorId: byUserId,
    departmentId: null,
    priority: 'medium',
    category: 'general',
    dueDate: fu.dueDate,
    tags: [`followup:${fu.id}`],
    entityId: entityCode,
  });
  const next: FollowUp = { ...fu, status: 'converted', linkedTaskId: task.id, resolvedAt: nowISO() };
  writeJSON(followUpsKey(entityCode), all.map((f) => (f.id === followUpId ? next : f)));
  safeAudit({
    entityCode, action: 'update', entityType: 'chat_event', recordId: followUpId,
    recordLabel: `Follow-up converted to task ${task.id}`,
    beforeState: { status: fu.status }, afterState: { status: 'converted', linkedTaskId: task.id },
    reason: 'followup.convert', sourceModule: 'operix-chat-engine',
  });
  return { followUp: next, taskId: task.id };
}

// ── Conversation Escalations ───────────────────────────────────────────────
export function raiseConversationEscalation(
  entityCode: string,
  conversationId: string,
  reason: string,
  raisedByUserId: string,
): ConversationEscalationRecord {
  if (!reason || !reason.trim()) throw new Error('escalation reason required');
  const c = getConversation(entityCode, conversationId);
  if (!c) throw new Error('conversation not found');
  const rec: ConversationEscalationRecord = {
    id: newId('esc'),
    entityId: entityCode,
    conversationId,
    reason: reason.trim(),
    raisedByUserId,
    raisedAt: nowISO(),
    status: 'open',
    resolvedAt: null,
  };
  const all = readJSON<ConversationEscalationRecord[]>(escalationsKey(entityCode), []);
  writeJSON(escalationsKey(entityCode), [...all, rec]);
  safeAudit({
    entityCode, action: 'create', entityType: 'chat_event', recordId: rec.id,
    recordLabel: `Conversation escalation raised · ${conversationId}`,
    beforeState: null, afterState: { reason: rec.reason },
    reason: 'conversation.escalate', sourceModule: 'operix-chat-engine',
  });
  return rec;
}

export function resolveConversationEscalation(entityCode: string, id: string): ConversationEscalationRecord {
  const all = readJSON<ConversationEscalationRecord[]>(escalationsKey(entityCode), []);
  const rec = all.find((r) => r.id === id);
  if (!rec) throw new Error('escalation not found');
  if (rec.status === 'resolved') return rec;
  const next: ConversationEscalationRecord = { ...rec, status: 'resolved', resolvedAt: nowISO() };
  writeJSON(escalationsKey(entityCode), all.map((r) => (r.id === id ? next : r)));
  safeAudit({
    entityCode, action: 'update', entityType: 'chat_event', recordId: id,
    recordLabel: `Conversation escalation resolved`,
    beforeState: { status: 'open' }, afterState: { status: 'resolved' },
    reason: 'conversation.escalation.resolve', sourceModule: 'operix-chat-engine',
  });
  return next;
}

export function listConversationEscalations(entityCode: string, filter: { status?: ConversationEscalationRecord['status']; conversationId?: string } = {}): ConversationEscalationRecord[] {
  let list = readJSON<ConversationEscalationRecord[]>(escalationsKey(entityCode), []);
  if (filter.status) list = list.filter((r) => r.status === filter.status);
  if (filter.conversationId) list = list.filter((r) => r.conversationId === filter.conversationId);
  return [...list].sort((a, b) => b.raisedAt.localeCompare(a.raisedAt));
}

// ── Retention / Export (TF-30d) ────────────────────────────────────────────
export interface UpsertRetentionPolicyInput {
  id?: string;
  channelType?: ChannelType | null;
  archiveAfterDays: number | null;
  retentionDays: number | null;
  allowExport: boolean;
  allowDelete: boolean;
  isActive?: boolean;
}

export function upsertRetentionPolicy(entityCode: string, input: UpsertRetentionPolicyInput): ConversationRetentionPolicy {
  const all = readJSON<ConversationRetentionPolicy[]>(retentionPoliciesKey(entityCode), []);
  const ts = nowISO();
  const isActive = input.isActive ?? true;
  // one active per channelType: deactivate any conflicting active policy
  const channelKey = input.channelType ?? null;
  const next = all.map((p) => {
    if (p.id === input.id) return p; // updating self
    if (isActive && (p.channelType ?? null) === channelKey && p.isActive) {
      return { ...p, isActive: false, updatedAt: ts };
    }
    return p;
  });
  let saved: ConversationRetentionPolicy;
  if (input.id && next.some((p) => p.id === input.id)) {
    saved = {
      ...(next.find((p) => p.id === input.id) as ConversationRetentionPolicy),
      channelType: channelKey,
      archiveAfterDays: input.archiveAfterDays,
      retentionDays: input.retentionDays,
      allowExport: input.allowExport,
      allowDelete: input.allowDelete,
      isActive,
      updatedAt: ts,
    };
    writeJSON(retentionPoliciesKey(entityCode), next.map((p) => (p.id === input.id ? saved : p)));
  } else {
    saved = {
      id: newId('rp'),
      entityId: entityCode,
      channelType: channelKey,
      archiveAfterDays: input.archiveAfterDays,
      retentionDays: input.retentionDays,
      allowExport: input.allowExport,
      allowDelete: input.allowDelete,
      isActive,
      createdAt: ts,
      updatedAt: ts,
    };
    writeJSON(retentionPoliciesKey(entityCode), [...next, saved]);
  }
  safeAudit({
    entityCode, action: 'update', entityType: 'chat_event', recordId: saved.id,
    recordLabel: `Retention policy upsert · ${channelKey ?? 'default'}`,
    beforeState: null, afterState: { archiveAfterDays: saved.archiveAfterDays, retentionDays: saved.retentionDays, allowExport: saved.allowExport, allowDelete: saved.allowDelete, isActive: saved.isActive },
    reason: 'retention.upsert', sourceModule: 'operix-chat-engine',
  });
  return saved;
}

export function listRetentionPolicies(entityCode: string): ConversationRetentionPolicy[] {
  return readJSON<ConversationRetentionPolicy[]>(retentionPoliciesKey(entityCode), []);
}

function policyForChannel(policies: ConversationRetentionPolicy[], channelType: ChannelType): ConversationRetentionPolicy | null {
  const specific = policies.find((p) => p.isActive && p.channelType === channelType);
  if (specific) return specific;
  return policies.find((p) => p.isActive && (p.channelType === null || p.channelType === undefined)) ?? null;
}

export interface RetentionEvaluation {
  toArchive: { conversationId: string; reason: string }[];
  toDelete:  { conversationId: string; reason: string; allowDelete: boolean }[];
}

export function evaluateRetention(entityCode: string, nowISOArg?: string): RetentionEvaluation {
  const policies = listRetentionPolicies(entityCode);
  const convs = readConversations(entityCode);
  const now = nowISOArg ? new Date(nowISOArg).getTime() : Date.now();
  const ms = 24 * 60 * 60 * 1000;
  const result: RetentionEvaluation = { toArchive: [], toDelete: [] };
  for (const c of convs) {
    const policy = policyForChannel(policies, c.channelType);
    if (!policy) continue;
    const last = c.lastMessageAt ?? c.createdAt;
    const age = (now - new Date(last).getTime()) / ms;
    if (!c.isArchived && policy.archiveAfterDays !== null && age >= policy.archiveAfterDays) {
      result.toArchive.push({ conversationId: c.id, reason: `idle ${Math.floor(age)}d ≥ ${policy.archiveAfterDays}d` });
    }
    if (policy.retentionDays !== null && age >= policy.retentionDays) {
      result.toDelete.push({ conversationId: c.id, reason: `retention ${Math.floor(age)}d ≥ ${policy.retentionDays}d`, allowDelete: policy.allowDelete });
    }
  }
  return result;
}

export function archiveConversations(entityCode: string, conversationIds: string[]): number {
  let touched = 0;
  for (const id of conversationIds) {
    try { archiveConversation(entityCode, id); touched += 1; } catch { /* skip */ }
  }
  return touched;
}

export function deleteConversationsPerPolicy(entityCode: string, conversationIds: string[]): number {
  const policies = listRetentionPolicies(entityCode);
  const convs = readConversations(entityCode);
  // gate: every target must be backed by a policy with allowDelete
  for (const id of conversationIds) {
    const c = convs.find((x) => x.id === id);
    if (!c) throw new Error(`delete: conversation ${id} not found`);
    const p = policyForChannel(policies, c.channelType);
    if (!p || !p.allowDelete) {
      throw new Error(`delete: policy for ${c.channelType} forbids deletion`);
    }
  }
  let touched = 0;
  const msgs = readMessages(entityCode);
  const ts = nowISO();
  const idSet = new Set(conversationIds);
  const nextMsgs = msgs.map((m) => idSet.has(m.conversationId) && !m.deletedAt
    ? { ...m, content: '[retention-deleted]', voiceMeta: null, attachment: null, deletedAt: ts } as ChatMessage
    : m);
  writeMessages(entityCode, nextMsgs);
  for (const id of conversationIds) {
    try {
      archiveConversation(entityCode, id);
      appendSystemMessage(entityCode, id, 'retention deletion executed');
      safeAudit({
        entityCode, action: 'cancel', entityType: 'chat_event', recordId: id,
        recordLabel: `Retention deletion executed`,
        beforeState: null, afterState: { conversationId: id },
        reason: 'retention.delete', sourceModule: 'operix-chat-engine',
      });
      touched += 1;
    } catch { /* skip */ }
  }
  return touched;
}

export interface ExportedConversationBundle {
  conversation: Conversation;
  participants: ConversationParticipant[];
  messages: ChatMessage[];
  exportedAt: string;
}

export function exportConversation(entityCode: string, conversationId: string): ExportedConversationBundle {
  const c = getConversation(entityCode, conversationId);
  if (!c) throw new Error('conversation not found');
  const policy = policyForChannel(listRetentionPolicies(entityCode), c.channelType);
  if (!policy || !policy.allowExport) throw new Error('policy forbids export for this channel');
  const bundle: ExportedConversationBundle = {
    conversation: c,
    participants: c.participants, // includes removed (history preserved)
    messages: listMessages(entityCode, conversationId),
    exportedAt: nowISO(),
  };
  safeAudit({
    entityCode, action: 'create', entityType: 'chat_event', recordId: conversationId,
    recordLabel: `Conversation exported`,
    beforeState: null, afterState: { messageCount: bundle.messages.length, participantCount: bundle.participants.length },
    reason: 'conversation.export', sourceModule: 'operix-chat-engine',
  });
  return bundle;
}

// ── ConvSearch ─────────────────────────────────────────────────────────────
export interface SearchHit {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  snippet: string;
  createdAt: string;
}

export function searchMessages(
  entityCode: string,
  userId: string,
  query: string,
  filter: { channelType?: ChannelType } = {},
): SearchHit[] {
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return [];
  const convs = readConversations(entityCode);
  // active participant scope (TF-30b: removed users excluded going forward)
  const allowed = new Map(
    convs
      .filter((c) => isActiveParticipant(c, userId))
      .filter((c) => !filter.channelType || c.channelType === filter.channelType)
      .map((c) => [c.id, c]),
  );
  const msgs = readMessages(entityCode);
  const hits: SearchHit[] = [];
  for (const m of msgs) {
    if (m.deletedAt) continue;
    if (m.type !== 'text') continue;
    const conv = allowed.get(m.conversationId);
    if (!conv) continue;
    if (m.content.toLowerCase().includes(q)) {
      hits.push({
        conversationId: conv.id,
        conversationTitle: conv.title,
        messageId: m.id,
        snippet: m.content.length > 160 ? m.content.slice(0, 157) + '…' : m.content,
        createdAt: m.createdAt,
      });
    }
  }
  return hits.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
