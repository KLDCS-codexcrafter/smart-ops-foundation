/**
 * W1C-5 Block 6 · Pending-sync dedupe / idempotency.
 *
 * The offline mobile queue replays queued writes when connectivity returns.
 * Re-processing the same (entity, kind/intent) entry must be IDEMPOTENT:
 *   - removeFromQueue(id) called twice → no throw, no underflow, no collateral
 *   - markRetryFailure(id, …) called on an already-removed id → no throw
 *   - Other entries for the same (entity, kind) must be untouched
 *
 * This protects against duplicate-replay scenarios when the network ack races
 * the local "remove on success" call (the classic mobile-sync double-post bug).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  enqueueWrite,
  removeFromQueue,
  markRetryFailure,
  peekQueue,
  clearQueue,
  getQueueSize,
} from '@/lib/offline-queue-engine';

describe('W1C-5 Block 6 · Pending-sync dedupe / idempotency', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
    clearQueue();
  });

  it('removeFromQueue is idempotent for the same id', () => {
    const e = enqueueWrite('ENT-1', 'order_place', { sku: 'X', qty: 1 });
    expect(getQueueSize()).toBe(1);
    removeFromQueue(e.id);
    expect(getQueueSize()).toBe(0);
    // second remove with same id must be a no-op (not throw, not corrupt the queue)
    expect(() => removeFromQueue(e.id)).not.toThrow();
    expect(getQueueSize()).toBe(0);
  });

  it('re-processing same (entity, intent) does not affect sibling entries', () => {
    const a = enqueueWrite('ENT-1', 'order_place', { sku: 'A' });
    const b = enqueueWrite('ENT-1', 'order_place', { sku: 'B' });
    const c = enqueueWrite('ENT-2', 'order_place', { sku: 'C' });
    expect(getQueueSize()).toBe(3);

    // process A twice — only A should be gone
    removeFromQueue(a.id);
    removeFromQueue(a.id);
    const left = peekQueue();
    expect(left.map((x) => x.id).sort()).toEqual([b.id, c.id].sort());
  });

  it('markRetryFailure on an already-removed id is a no-op', () => {
    const e = enqueueWrite('ENT-1', 'rating_submit', { stars: 5 });
    removeFromQueue(e.id);
    expect(() => markRetryFailure(e.id, 'network')).not.toThrow();
    expect(getQueueSize()).toBe(0);
  });

  it('enqueue → remove → enqueue same (entity, intent) keeps queue clean', () => {
    const first = enqueueWrite('ENT-1', 'complaint_submit', { msg: 'hi' });
    removeFromQueue(first.id);
    const second = enqueueWrite('ENT-1', 'complaint_submit', { msg: 'hi' });
    expect(getQueueSize()).toBe(1);
    expect(second.id).not.toBe(first.id);
    expect(peekQueue()[0].entity_id).toBe('ENT-1');
  });
});
