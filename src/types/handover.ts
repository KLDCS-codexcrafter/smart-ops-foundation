/**
 * @file        src/types/handover.ts
 * @purpose     Handover Protocol packet + record types (TF-35 · cross-module: tasks + conversations + documents)
 * @sprint      Sprint 142 · T-TaskFlow-A641.6 · Pillar A.6.4 · TaskFlow Arc
 */

export interface HandoverPacket {
  entityId: string; fromUserId: string; generatedAt: string;
  openTasks: { taskId: string; code: string; title: string; status: string; dueDate: string | null }[];
  ownedConversations: { conversationId: string; title: string; channelType: string; participantCount: number }[];
  ownedDocuments: { documentId: string; title: string }[];   // empty + noted if DocVault surface absent (Block 0)
}

export interface HandoverRecord {
  id: string; entityId: string;
  fromUserId: string; toUserId: string; executedByUserId: string; executedAt: string;
  taskIds: string[]; conversationIds: string[]; documentIds: string[];
  note?: string | null;
}
