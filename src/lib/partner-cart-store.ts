/**
 * partner-cart-store.ts — IndexedDB wrapper for offline distributor cart.
 * Sprint 10. ALL async, all Promise-based, NO localStorage, NO React imports.
 *
 * Design: ONE active cart per partner_id. Survives browser restarts and flaky
 * WiFi. UI calls getCart → mutate locally → setCart. Submit lifts cart into a
 * PartnerOrder via partner-order-engine.cartToOrder, then clearCart.
 *
 * [JWT] On submit, also POST /api/partner/orders to sync with the server.
 */
import {
  CART_IDB_DB,
  CART_IDB_STORE,
  CART_IDB_VERSION,
  type PartnerCart,
  type PartnerOrderLine,
} from '@/types/partner-order';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable in this environment'));
      return;
    }
    const req = indexedDB.open(CART_IDB_DB, CART_IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CART_IDB_STORE)) {
        db.createObjectStore(CART_IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(CART_IDB_STORE, mode).objectStore(CART_IDB_STORE);
}

/** Read a partner's cart, or null if none exists. */
export async function getCart(partnerId: string): Promise<PartnerCart | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').get(partnerId);
    req.onsuccess = () => resolve((req.result as PartnerCart | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB get failed'));
  });
}

/** Upsert the cart. id MUST equal partner_id. */
export async function setCart(cart: PartnerCart): Promise<void> {
  if (cart.id !== cart.partner_id) {
    throw new Error('cart.id must equal cart.partner_id');
  }
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').put({ ...cart, updated_at: new Date().toISOString() });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('IndexedDB put failed'));
  });
}

/** Delete the cart (e.g. after submit or abandon). */
export async function clearCart(partnerId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(partnerId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('IndexedDB delete failed'));
  });
}

/**
 * upsertLine — convenience: add or update a single line in the partner's cart,
 * creating the cart if it doesn't exist. Returns the resulting cart.
 */
export async function upsertLine(
  partnerId: string,
  entityCode: string,
  line: PartnerOrderLine,
): Promise<PartnerCart> {
  const existing = await getCart(partnerId);
  const base: PartnerCart = existing ?? {
    id: partnerId,
    partner_id: partnerId,
    entity_code: entityCode,
    lines: [],
    notes: '',
    delivery_address: '',
    expected_delivery_date: null,
    updated_at: new Date().toISOString(),
  };
  const idx = base.lines.findIndex(l => l.item_id === line.item_id);
  if (idx >= 0) base.lines[idx] = line;
  else base.lines.push(line);
  await setCart(base);
  return base;
}

/** removeLine — drop a line by item_id. No-op if cart or line missing. */
export async function removeLine(partnerId: string, itemId: string): Promise<PartnerCart | null> {
  const existing = await getCart(partnerId);
  if (!existing) return null;
  existing.lines = existing.lines.filter(l => l.item_id !== itemId);
  await setCart(existing);
  return existing;
}

/** isAvailable — feature-detect IndexedDB so callers can show a fallback UI. */
export function isAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}
