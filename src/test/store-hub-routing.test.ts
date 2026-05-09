/**
 * @file src/test/store-hub-routing.test.ts
 * @purpose Q-LOCK-8a coverage · store-hub canonical sidebar config invariants · D-NEW-CC compliance
 * @who Storekeeper · Audit Owner
 * @when 2026-05-09
 * @sprint T-Phase-1.A.6.α-a-Department-Stores-Foundation · Block A test
 * @iso ISO 25010 Testability · Maintainability
 * @whom Audit Owner
 * @decisions D-NEW-CC canonical (sidebar keyboard uniqueness)
 * @disciplines FR-30 · FR-32
 * @reuses store-hub-sidebar-config · @/shell/types SidebarItem
 * @[JWT] N/A (config / type level)
 */
import { describe, it, expect } from 'vitest';
import { storeHubSidebarItems } from '@/apps/erp/configs/store-hub-sidebar-config';
import type { SidebarItem } from '@/shell/types';

function flatten(items: ReadonlyArray<SidebarItem>): SidebarItem[] {
  const out: SidebarItem[] = [];
  const walk = (arr: ReadonlyArray<SidebarItem>): void => {
    for (const it of arr) {
      out.push(it);
      if (it.children && it.children.length > 0) walk(it.children);
    }
  };
  walk(items);
  return out;
}

describe('Store Hub sidebar config · D-NEW-CC canonical (α-a Block A)', () => {
  it('all keyboard shortcuts in store-hub config are unique', () => {
    const flat = flatten(storeHubSidebarItems);
    const kbs = flat.map((i) => i.keyboard).filter((k): k is string => Boolean(k));
    const dedup = new Set(kbs);
    expect(dedup.size).toBe(kbs.length);
  });
  it('all expected store-hub module IDs are present', () => {
    const flat = flatten(storeHubSidebarItems);
    const ids = new Set(flat.map((i) => i.moduleId).filter((m): m is string => Boolean(m)));
    const expected = [
      'sh-welcome',
      'sh-t-stock-issue-entry', 'sh-t-receipt-ack', 'sh-t-stock-issue-register',
      'sh-r-stock-check', 'sh-r-reorder-suggestions', 'sh-r-demand-forecast',
      'sh-r-cycle-count-status',
    ];
    for (const e of expected) expect(ids.has(e)).toBe(true);
  });
  it('keyboard namespace is store-hub-prefixed (s *) · no collision with qulicheak (q *)', () => {
    const flat = flatten(storeHubSidebarItems);
    const kbs = flat.map((i) => i.keyboard).filter((k): k is string => Boolean(k));
    for (const kb of kbs) {
      expect(kb.startsWith('s ')).toBe(true);
    }
  });
});
