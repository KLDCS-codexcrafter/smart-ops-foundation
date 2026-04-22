/**
 * event-bus.ts — Simple in-memory pub/sub for voucher lifecycle events
 *
 * PURPOSE
 * Decouples voucher engines from downstream consumers (Bridge, audit log, activity feed,
 * Tally-on-top sync). Engines emit events; any number of subscribers listen.
 *
 * INPUT        Events with typed payloads (see EventMap below)
 * OUTPUT       Delivers to all active subscribers synchronously
 *
 * DEPENDENCIES none (pure TS, no React, no browser APIs)
 *
 * TALLY-ON-TOP BEHAVIOR
 * - Bridge subscribes to voucher.posted + voucher.cancelled + voucher.amended
 * - Payload includes accounting_mode so Bridge knows whether Operix GL was touched
 *
 * SPEC DOC
 * /docs/Operix_Phase1_Roadmap.xlsx Sheet 8 (D-013 CLOSED), D-003 Tally-on-Top boundary
 *
 * PHASE 2 NOTE
 * This is an IN-MEMORY bus. Phase 2 will replace with durable message bus (Kafka / NATS).
 * Keep this file's public API stable; only the internal implementation changes.
 */

export type AccountingMode = 'standalone' | 'tally_bridge';

export interface VoucherEventPayload {
  voucher_id: string;
  voucher_no: string;
  voucher_type: string;       // base_voucher_type
  entity_code: string;
  accounting_mode: AccountingMode;
  actor_id: string;
  timestamp: string;          // ISO
  amount: number;             // net_amount
  /** Free-form extras per voucher type (e.g. irn_number, eway_bill_no) */
  meta?: Record<string, unknown>;
}

export interface EventMap {
  'voucher.posted': VoucherEventPayload;
  'voucher.cancelled': VoucherEventPayload & { reason: string };
  'voucher.amended': VoucherEventPayload & { prev_voucher_id: string };
  'voucher.draft.saved': VoucherEventPayload;
  'voucher.draft.deleted': VoucherEventPayload;

  // Order lifecycle (PO/SO)
  'order.placed': VoucherEventPayload;
  'order.fulfilled': VoucherEventPayload & { fulfilled_by_voucher_no: string };
  'order.cancelled': VoucherEventPayload & { reason: string };

  /**
   * Entity-switch lifecycle (Sprint T10-pre.1c Session A).
   *
   * 'entity.beforeChange' fires BEFORE a switch commits. Subscribers (typically
   * voucher forms with unsaved work) may call payload.prevent() synchronously to
   * abort the switch. The provider checks the prevent flag right after emit()
   * returns; if any subscriber prevented, the switch is aborted and the dropdown
   * reverts.
   *
   * 'entity.changed' fires AFTER a switch successfully commits (or after a
   * forced switch from the guard's discard / save-as-draft path). Consumers
   * should re-fetch entity-scoped data on this event.
   */
  'entity.beforeChange': {
    fromEntityCode: string;
    toEntityCode: string;
    /** Subscriber calls this to abort the switch. */
    prevent: () => void;
    /** Optional id for debugging which subscriber prevented. */
    subscriberId?: string;
  };
  'entity.changed': {
    fromEntityCode: string;
    toEntityCode: string;
    userId: string;
    /** ISO timestamp */
    timestamp: string;
  };

  // Extend-as-you-go — adding new event keys is a non-breaking change
}

type EventName = keyof EventMap;
type Listener<K extends EventName> = (payload: EventMap[K]) => void;

const listeners: { [K in EventName]?: Set<Listener<K>> } = {};

export function on<K extends EventName>(event: K, listener: Listener<K>): () => void {
  let set = listeners[event] as Set<Listener<K>> | undefined;
  if (!set) {
    set = new Set<Listener<K>>();
    (listeners as Record<string, Set<Listener<EventName>> | undefined>)[event as string] =
      set as unknown as Set<Listener<EventName>>;
  }
  set.add(listener);
  return () => { set!.delete(listener); };
}

export function emit<K extends EventName>(event: K, payload: EventMap[K]): void {
  const set = listeners[event] as Set<Listener<K>> | undefined;
  if (!set) return;
  set.forEach(fn => {
    try {
      fn(payload);
    } catch (err) {
      // A misbehaving listener must not break other listeners or the emitter
      // Log once; do not rethrow
      console.error(`[event-bus] listener for "${event}" threw:`, err);
    }
  });
}

export function off<K extends EventName>(event: K, listener: Listener<K>): void {
  (listeners[event] as Set<Listener<K>> | undefined)?.delete(listener);
}

/** Test/debug helper — returns count of active listeners per event. Do not use in product code. */
export function _debugListenerCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k in listeners) {
    out[k] = (listeners[k as EventName] as Set<unknown> | undefined)?.size ?? 0;
  }
  return out;
}

export const eventBus = { on, emit, off };
