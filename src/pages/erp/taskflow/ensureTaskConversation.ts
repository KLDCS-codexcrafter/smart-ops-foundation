/**
 * @file        src/pages/erp/taskflow/ensureTaskConversation.ts
 * @purpose     S140.T1 · TaskRoom ⇄ OperixChat bridge helper · idempotent task↔conversation resolver.
 * @sprint      Sprint 140.T1 hotfix · T-TaskFlow-A641.4
 * @canon       Finds-or-creates a `channelType:'task'` conversation linked via
 *              `linkedRefs[{type:'task', id:task.id, label:task.code}]`. Re-mount safe.
 */
import {
  listConversations, createConversation, linkConversation,
} from '@/lib/operix-chat-engine';
import type { Conversation } from '@/types/operix-chat';
import type { Task } from '@/types/taskflow';

export function ensureTaskConversation(
  task: Task,
  entityCode: string,
  currentUserId: string,
): Conversation {
  const existing = listConversations(entityCode, { linkedRefType: 'task' })
    .find((c) => c.linkedRefs.some((r) => r.type === 'task' && r.id === task.id));
  if (existing) return existing;
  const participantUserIds = [currentUserId];
  if (task.assigneeId && task.assigneeId !== currentUserId) {
    participantUserIds.push(task.assigneeId);
  }
  const conv = createConversation(entityCode, {
    channelType: 'task',
    title: `Task · ${task.code}`,
    ownerId: currentUserId,
    createdByUserId: currentUserId,
    participantUserIds,
  });
  return linkConversation(entityCode, conv.id, { type: 'task', id: task.id, label: task.code });
}
