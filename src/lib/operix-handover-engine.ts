/**
 * @file        src/lib/operix-handover-engine.ts
 * @realizes    TF-35 Handover Protocol (exit/transfer/leave) · cross-module: tasks + conversations + documents (per Block-0 outcome)
 * @reads-from  taskflow-engine · operix-chat-engine · docvault-engine (READ-ONLY) · audit-trail-engine
 * @sprint      Sprint 142 · T-TaskFlow-A641.6 · Pillar A.6.4 · TaskFlow Arc
 * @canon       Org-owned record · removed participants retain history · receiver tasks unacknowledged (TF-29a) · re-execute is no-op for already-moved items.
 * [JWT]        P2BB: HR offboarding trigger · server-side bulk ops · DocVault ownership transfer when DocVault gains a transferOwner write surface.
 */

import type { HandoverPacket, HandoverRecord } from '@/types/handover';
import {
  listTasks, reassignTask,
} from '@/lib/taskflow-engine';
import {
  listConversations, transferOwnership, removeParticipant, getConversation,
} from '@/lib/operix-chat-engine';
import { loadDocuments } from '@/lib/docvault-engine';
import { logAudit } from '@/lib/audit-trail-engine';

const TERMINAL_STATUSES = new Set(['completed', 'cancelled']);

const handoversKey = (entityCode: string): string =>
  entityCode ? `oc_handovers_${entityCode}` : 'oc_handovers_system';

const readJSON = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
};
const writeJSON = (key: string, value: unknown): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
};

const newId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const nowISO = (): string => new Date().toISOString();

const safeAudit = (entry: Parameters<typeof logAudit>[0]): void => {
  try { logAudit(entry); } catch { /* D-AUDIT-SAFE */ }
};

export function generateHandoverPacket(entityCode: string, fromUserId: string): HandoverPacket {
  const tasks = listTasks(entityCode).filter((t) =>
    t.assigneeId === fromUserId && !TERMINAL_STATUSES.has(t.status),
  );
  const convs = listConversations(entityCode, { includeArchived: false })
    .filter((c) => c.ownerId === fromUserId);
  let documents: { documentId: string; title: string }[] = [];
  try {
    documents = loadDocuments(entityCode)
      .filter((d) => d.created_by === fromUserId)
      .map((d) => ({ documentId: d.id, title: d.title }));
  } catch { documents = []; }
  return {
    entityId: entityCode,
    fromUserId,
    generatedAt: nowISO(),
    openTasks: tasks.map((t) => ({ taskId: t.id, code: t.code, title: t.title, status: t.status, dueDate: t.dueDate })),
    ownedConversations: convs.map((c) => ({
      conversationId: c.id, title: c.title, channelType: c.channelType,
      participantCount: c.participants.filter((p) => !p.removedAt).length,
    })),
    ownedDocuments: documents,
  };
}

export interface ExecuteHandoverOptions {
  removeFromConversationsAfterTransfer?: boolean;
  note?: string | null;
}

export function executeHandover(
  entityCode: string,
  fromUserId: string,
  toUserId: string,
  byUserId: string,
  options: ExecuteHandoverOptions = {},
): HandoverRecord {
  if (fromUserId === toUserId) throw new Error('handover: from and to must differ');
  const packet = generateHandoverPacket(entityCode, fromUserId);
  const reasonPrefix = `Handover: ${fromUserId}→${toUserId}`;
  const reason = options.note?.trim() ? `${reasonPrefix} · ${options.note.trim()}` : reasonPrefix;

  const taskIds: string[] = [];
  for (const t of packet.openTasks) {
    try {
      reassignTask(entityCode, t.taskId, toUserId, reason, byUserId);
      taskIds.push(t.taskId);
    } catch { /* skip task if already moved or invalid */ }
  }

  const conversationIds: string[] = [];
  for (const cv of packet.ownedConversations) {
    try {
      // idempotency: only transfer if still owned by fromUserId
      const live = getConversation(entityCode, cv.conversationId);
      if (!live) continue;
      if (live.ownerId === fromUserId) {
        transferOwnership(entityCode, cv.conversationId, toUserId, byUserId);
        conversationIds.push(cv.conversationId);
        if (options.removeFromConversationsAfterTransfer) {
          try { removeParticipant(entityCode, cv.conversationId, fromUserId, byUserId); } catch { /* may be only participant */ }
        }
      }
    } catch { /* skip */ }
  }

  // Documents: read-only consume — DocVault stays 0-DIFF. We record intended document ids
  // for the audit trail; physical owner field flip arrives when DocVault exposes a transfer write surface ([JWT] P2BB).
  const documentIds: string[] = packet.ownedDocuments.map((d) => d.documentId);

  const record: HandoverRecord = {
    id: newId('ho'),
    entityId: entityCode,
    fromUserId, toUserId, executedByUserId: byUserId,
    executedAt: nowISO(),
    taskIds, conversationIds, documentIds,
    note: options.note ?? null,
  };
  const all = readJSON<HandoverRecord[]>(handoversKey(entityCode), []);
  writeJSON(handoversKey(entityCode), [...all, record]);
  safeAudit({
    entityCode, action: 'create', entityType: 'chat_event', recordId: record.id,
    recordLabel: `Handover executed · ${fromUserId} → ${toUserId}`,
    beforeState: null,
    afterState: { tasks: taskIds.length, conversations: conversationIds.length, documents: documentIds.length },
    reason: 'handover.execute', sourceModule: 'operix-handover-engine',
  });
  return record;
}

export function listHandovers(entityCode: string): HandoverRecord[] {
  return [...readJSON<HandoverRecord[]>(handoversKey(entityCode), [])]
    .sort((a, b) => b.executedAt.localeCompare(a.executedAt));
}
