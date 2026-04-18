/**
 * partner-cart-store.ts — IndexedDB wrapper for offline distributor cart.
 * Sprint 10. ALL async, all Promise-based, NO localStorage, NO React imports.
 *
 * Design: ONE active cart per partner_id. Survives browser restarts and flaky
 * WiFi. UI calls getCart → mutate locally → setCart. Submit lifts cart into a
 * DistributorOrder via partner-order-engine.cartToOrder, then clearCart.
 *
 * [JWT] On submit, also POST /api/partner/orders to sync with the server.
 */
import {
  CART_IDB_DB,
  CART_IDB_STORE,
  CART_IDB_VERSION,
  type DistributorCartState,
  type DistributorOrderLine,
} from '@/types/distributor-order';

// Sprint 10 Part D · Feature #10 — order templates store.
const TEMPLATE_STORE = 'cart_templates';
// Bump version so the upgrade handler runs and creates the new object store.
const DB_VERSION = Math.max(CART_IDB_VERSION, 2);

export interface DistributorCartTemplate {
  id: string;
  distributor_party_id: string;
  name: string;
  lines: DistributorOrderLine[];
  created_at: string;
  last_used_at: string | null;
  use_count: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable in this environment'));
      return;
    }
    const req = indexedDB.open(CART_IDB_DB, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CART_IDB_STORE)) {
        db.createObjectStore(CART_IDB_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(TEMPLATE_STORE)) {
        db.createObjectStore(TEMPLATE_STORE, { keyPath: 'id' });
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
export async function getCart(partnerId: string): Promise<DistributorCartState | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').get(partnerId);
    req.onsuccess = () => resolve((req.result as DistributorCartState | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB get failed'));
  });
}

/** Upsert the cart. id MUST equal partner_id. */
export async function setCart(cart: DistributorCartState): Promise<void> {
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
  line: DistributorOrderLine,
): Promise<DistributorCartState> {
  const existing = await getCart(partnerId);
  const base: DistributorCartState = existing ?? {
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
export async function removeLine(partnerId: string, itemId: string): Promise<DistributorCartState | null> {
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

// ── Templates (Sprint 10 Part D · Feature #10) ──

/** Persist (insert or update) a cart template. */
export async function saveTemplate(template: DistributorCartTemplate): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(TEMPLATE_STORE, 'readwrite');
    t.objectStore(TEMPLATE_STORE).put(template);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error ?? new Error('IndexedDB template put failed'));
  });
}

/** Load all templates for a given distributor (party_id). */
export async function loadTemplates(partyId: string): Promise<DistributorCartTemplate[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(TEMPLATE_STORE, 'readonly');
    const req = t.objectStore(TEMPLATE_STORE).getAll();
    req.onsuccess = () => {
      const all = (req.result as DistributorCartTemplate[]) ?? [];
      resolve(all.filter(x => x.distributor_party_id === partyId));
    };
    req.onerror = () => reject(req.error ?? new Error('IndexedDB template getAll failed'));
  });
}

/** Delete a template by id. */
export async function deleteTemplate(templateId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(TEMPLATE_STORE, 'readwrite');
    t.objectStore(TEMPLATE_STORE).delete(templateId);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error ?? new Error('IndexedDB template delete failed'));
  });
}
