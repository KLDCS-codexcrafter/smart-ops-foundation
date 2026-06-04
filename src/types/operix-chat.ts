/**
 * @file        src/types/operix-chat.ts
 * @purpose     OperixChat MVP types · org-owned conversations · 10 channel types · voice notes · exit-safe history
 * @sprint      Sprint 140 · T-TaskFlow-A641.4 · Pillar A.6.4 · TaskFlow Arc · Module 2 wakes
 * @canon       TF-16 · TF-24 · TF-30a/b · TF-37 (VERBATIM per S140 Step-2 Block 2 — do not simplify or rename)
 * [JWT]        P2BB: real-time delivery · multi-device · transcription · omnichannel rail wiring
 */

// OperixChat · S140 · Pillar A.6.4 · TaskFlow Arc Module 2
// Canon (TF-30): the ORGANIZATION owns conversations; people are participants.

export type ChannelType =
  | 'direct' | 'group' | 'department'
  | 'task' | 'customer' | 'vendor' | 'audit'
  | 'email_thread' | 'whatsapp_thread' | 'sms_thread'; // TF-24: omnichannel modeled · live wiring later

export type MessageType = 'text' | 'voice' | 'system';
export type DeliveryStatus = 'sent' | 'delivered' | 'read'; // modeled · single-browser honesty pre-P2BB

export interface ConversationParticipant {
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
  removedAt?: string | null;      // TF-30b: removal revokes FUTURE access only
  removedByUserId?: string | null;
}

export interface ConversationLinkRef {
  type: 'task' | 'customer' | 'vendor' | 'audit' | 'obligation';
  id: string;
  label: string;
}

export interface Conversation {
  id: string;
  entityId: string;
  channelType: ChannelType;
  title: string;                  // direct: auto from participant names
  ownerId: string;                // relationship owner · reassignable (TF-30a)
  participants: ConversationParticipant[];
  linkedRefs: ConversationLinkRef[];
  isArchived: boolean;
  lastMessageAt: string | null;
  createdAt: string; createdByUserId: string;
}

export interface VoiceNoteMeta {
  durationSeconds: number;
  mimeType: string;               // e.g. audio/webm
  sizeBytes: number;              // cap ~1MB · 60s
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;                // text body · voice: base64 data-url · system: event text
  voiceMeta?: VoiceNoteMeta | null;   // TF-37
  attachment?: MessageAttachmentMeta | null; // S142 · TF-30c (additive optional · pre-S142 messages have it absent)
  replyToMessageId?: string | null;
  mentions: string[];
  isInternalNote: boolean;        // visible-to-internal badge (external semantics post-P2BB)
  isPinned: boolean;
  isFlagged: boolean;
  deliveryStatus: DeliveryStatus;
  readBy: { userId: string; readAt: string }[];
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;      // soft delete · content blanked · audit kept
}

export interface ConversationStats {
  totalConversations: number; unreadConversations: number;
  messagesToday: number; pinnedMessages: number; voiceNotes: number;
}

// ════════════════════════════════════════════════════════════════════════════
// S142 · Chat Depth + Handover (TF-25 · TF-30 c/d) — ADDITIVE
// ════════════════════════════════════════════════════════════════════════════

export interface MessageAttachmentMeta {
  fileName: string; mimeType: string; sizeBytes: number; // ≤ 1MB
  dataUrl: string;                                        // base64
}

export interface MediaVaultItem {
  id: string; entityId: string; conversationId: string; messageId: string;
  kind: 'voice' | 'file' | 'image';
  fileName: string; mimeType: string; sizeBytes: number;
  uploadedByUserId: string; uploadedAt: string;
  linkedRefs: ConversationLinkRef[];   // inherited from the conversation at index time
}

export interface FollowUp {
  id: string; entityId: string;
  conversationId: string; messageId: string;
  note: string;                        // mandatory · throw on empty
  assigneeId: string; dueDate: string | null;
  status: 'open' | 'done' | 'converted';
  linkedTaskId?: string | null;        // set when converted (TF-25 chat→task bridge)
  createdByUserId: string; createdAt: string; resolvedAt?: string | null;
}

export interface ConversationEscalationRecord {
  id: string; entityId: string; conversationId: string;
  reason: string;                      // mandatory
  raisedByUserId: string; raisedAt: string;
  status: 'open' | 'resolved'; resolvedAt?: string | null;
}

export interface ConversationRetentionPolicy {
  id: string; entityId: string;
  channelType?: ChannelType | null;    // null = default policy
  archiveAfterDays: number | null;     // null = never auto-archive
  retentionDays: number | null;        // null = retain forever
  allowExport: boolean; allowDelete: boolean;
  isActive: boolean; createdAt: string; updatedAt: string;
}
