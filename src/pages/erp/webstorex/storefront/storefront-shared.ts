/**
 * @file        src/pages/erp/webstorex/storefront/storefront-shared.ts
 * @purpose     S151 storefront — cart hook + storage keys + helpers.
 * @sprint      Sprint 151 · T-WebStoreX-A11.3 · DP-WS-22 mobile-first
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { WsCartLine, WebStoreItem } from '@/types/webstorex';

export { PreviewRibbon } from './PreviewRibbon';

export const wsStorefrontCartKey = (e: string): string => `ws_storefront_cart_${e}`;
export const wsStorefrontSelectedItemKey = (e: string): string => `ws_storefront_selected_item_${e}`;
export const wsStorefrontCompareKey = (e: string): string => `ws_storefront_compare_${e}`;
export const wsStorefrontEvent = 'ws_storefront_changed';
export const wsStorefrontCompareEvent = 'ws_storefront_compare_changed';
export const COMPARE_MAX = 4;

// ─── Cart hook (localStorage-backed · cross-page) ────────────────────
function readCart(entityCode: string): WsCartLine[] {
  try {
    const raw = localStorage.getItem(wsStorefrontCartKey(entityCode));
    return raw ? (JSON.parse(raw) as WsCartLine[]) : [];
  } catch { return []; }
}

function writeCart(entityCode: string, lines: WsCartLine[]): void {
  // [JWT] POST /api/storefront/cart
  localStorage.setItem(wsStorefrontCartKey(entityCode), JSON.stringify(lines));
  window.dispatchEvent(new CustomEvent(wsStorefrontEvent));
}

export interface StorefrontCart {
  lines: WsCartLine[];
  totalQty: number;
  addLine: (storeItemId: string, qty: number, variantId?: string | null) => void;
  setQty: (idx: number, qty: number) => void;
  removeLine: (idx: number) => void;
  replaceAll: (lines: WsCartLine[]) => void;
  clear: () => void;
}

export function useStorefrontCart(entityCode: string): StorefrontCart {
  const [lines, setLines] = useState<WsCartLine[]>(() => entityCode ? readCart(entityCode) : []);

  useEffect(() => {
    if (!entityCode) return;
    setLines(readCart(entityCode));
    const onChange = (): void => setLines(readCart(entityCode));
    window.addEventListener(wsStorefrontEvent, onChange);
    return () => window.removeEventListener(wsStorefrontEvent, onChange);
  }, [entityCode]);

  const addLine = useCallback((storeItemId: string, qty: number, variantId?: string | null) => {
    const next = [...lines];
    const idx = next.findIndex((l) => l.storeItemId === storeItemId && (l.variantId ?? null) === (variantId ?? null));
    if (idx >= 0) next[idx] = { ...next[idx], qty: next[idx].qty + qty };
    else next.push({ storeItemId, variantId: variantId ?? null, qty });
    writeCart(entityCode, next);
  }, [entityCode, lines]);

  const setQty = useCallback((idx: number, qty: number) => {
    if (qty < 1) return;
    const next = [...lines];
    if (!next[idx]) return;
    next[idx] = { ...next[idx], qty };
    writeCart(entityCode, next);
  }, [entityCode, lines]);

  const removeLine = useCallback((idx: number) => {
    const next = lines.filter((_, i) => i !== idx);
    writeCart(entityCode, next);
  }, [entityCode, lines]);

  const replaceAll = useCallback((newLines: WsCartLine[]) => {
    writeCart(entityCode, newLines.map((l) => ({ ...l })));
  }, [entityCode]);

  const clear = useCallback(() => { writeCart(entityCode, []); }, [entityCode]);

  const totalQty = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  return { lines, totalQty, addLine, setQty, removeLine, replaceAll, clear };
}

export function setSelectedStoreItemId(entityCode: string, id: string | null): void {
  if (id) localStorage.setItem(wsStorefrontSelectedItemKey(entityCode), id);
  else localStorage.removeItem(wsStorefrontSelectedItemKey(entityCode));
}

export function getSelectedStoreItemId(entityCode: string): string | null {
  return localStorage.getItem(wsStorefrontSelectedItemKey(entityCode));
}

export function fmtINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Compare set (DP-WS-19.4 · S151.T1 hotfix · max 4 · persisted) ───
function readCompare(entityCode: string): string[] {
  try {
    const raw = localStorage.getItem(wsStorefrontCompareKey(entityCode));
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(arr) ? arr.slice(0, COMPARE_MAX) : [];
  } catch { return []; }
}

function writeCompare(entityCode: string, ids: string[]): void {
  // [JWT] POST /api/storefront/compare
  localStorage.setItem(wsStorefrontCompareKey(entityCode), JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(wsStorefrontCompareEvent));
}

export interface ToggleCompareResult { ids: string[]; added: boolean; full: boolean; }

export function toggleCompare(entityCode: string, id: string): ToggleCompareResult {
  const cur = readCompare(entityCode);
  if (cur.includes(id)) {
    const next = cur.filter(x => x !== id);
    writeCompare(entityCode, next);
    return { ids: next, added: false, full: false };
  }
  if (cur.length >= COMPARE_MAX) return { ids: cur, added: false, full: true };
  const next = [...cur, id];
  writeCompare(entityCode, next);
  return { ids: next, added: true, full: false };
}

export function clearCompare(entityCode: string): void { writeCompare(entityCode, []); }
export function getCompareIds(entityCode: string): string[] { return readCompare(entityCode); }

export interface CompareSet {
  ids: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => ToggleCompareResult;
  clear: () => void;
  full: boolean;
}

export function useCompareSet(entityCode: string): CompareSet {
  const [ids, setIds] = useState<string[]>(() => entityCode ? readCompare(entityCode) : []);
  useEffect(() => {
    if (!entityCode) return;
    setIds(readCompare(entityCode));
    const onChange = (): void => setIds(readCompare(entityCode));
    window.addEventListener(wsStorefrontCompareEvent, onChange);
    return () => window.removeEventListener(wsStorefrontCompareEvent, onChange);
  }, [entityCode]);
  const has = useCallback((id: string) => ids.includes(id), [ids]);
  const toggle = useCallback((id: string) => toggleCompare(entityCode, id), [entityCode]);
  const clear = useCallback(() => clearCompare(entityCode), [entityCode]);
  return { ids, has, toggle, clear, full: ids.length >= COMPARE_MAX };
}

// ─── Pure helpers (tested) ───────────────────────────────────────────
export function unionSpecLabels(items: Pick<WebStoreItem, 'specifications'>[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    for (const row of it.specifications ?? []) {
      if (!seen.has(row.label)) { seen.add(row.label); out.push(row.label); }
    }
  }
  return out;
}

export function specLookup(item: Pick<WebStoreItem, 'specifications'>, label: string): string {
  return item.specifications?.find(s => s.label === label)?.value ?? '—';
}

export type RailKind = 'crossSell' | 'upsell' | 'frequentlyBought';
export function pickRelationIds(item: WebStoreItem, kind: RailKind): string[] {
  if (kind === 'crossSell') return item.crossSellIds ?? [];
  if (kind === 'upsell') return item.upsellIds ?? [];
  return item.frequentlyBoughtIds ?? [];
}
