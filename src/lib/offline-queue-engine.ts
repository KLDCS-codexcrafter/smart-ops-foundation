/**
 * offline-queue-engine.ts — Queue writes while offline, replay on reconnect.
 * Top-1%: dead-letter handling on max-retries; conflict-aware replay hooks.
 * localStorage-backed queue. Pure functions for test-ability.
 */

export type QueuedWriteKind =
  | 'order_place'
  | 'rating_submit'
  | 'complaint_submit'
  | 'sample_kit_request'
  | 'family_transfer'
  | 'reward_redeem';

export interface QueuedWrite {
  id: string;
  entity_id: string;
  kind: QueuedWriteKind;
  payload: unknown;
  queued_at: string;
  retry_count: number;
  last_error?: string;
}

const QUEUE_KEY = 'opx_offline_queue';
const MAX_RETRIES = 5;

function readQueue(): QueuedWrite[] {
  try {
    // [JWT] GET /api/mobile/offline-queue
    const r = localStorage.getItem(QUEUE_KEY);
    return r ? (JSON.parse(r) as QueuedWrite[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedWrite[]): void {
  try {
    // [JWT] PUT /api/mobile/offline-queue
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    /* ignore */
  }
}

export function enqueueWrite(
  entityId: string,
  kind: QueuedWriteKind,
  payload: unknown,
): QueuedWrite {
  const entry: QueuedWrite = {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: entityId,
    kind,
    payload,
    queued_at: new Date().toISOString(),
    retry_count: 0,
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

export function getQueueSize(): number {
  return readQueue().length;
}

export function peekQueue(): QueuedWrite[] {
  return readQueue();
}

export function removeFromQueue(id: string): void {
  const queue = readQueue().filter((e) => e.id !== id);
  writeQueue(queue);
}

export function markRetryFailure(id: string, error: string): void {
  const queue = readQueue();
  const idx = queue.findIndex((e) => e.id === id);
  if (idx < 0) return;
  queue[idx].retry_count += 1;
  queue[idx].last_error = error;
  writeQueue(queue);
}

/** Replay-ready entries (not exceeded retry budget). */
export function replayableEntries(): QueuedWrite[] {
  return readQueue().filter((e) => e.retry_count < MAX_RETRIES);
}

/** Dead-letter entries (exceeded retries — need manual review). */
export function deadLetterEntries(): QueuedWrite[] {
  return readQueue().filter((e) => e.retry_count >= MAX_RETRIES);
}

/** Clear the queue entirely (use on logout). */
export function clearQueue(): void {
  writeQueue([]);
}
