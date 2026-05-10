/**
 * @file src/test/supplyx-routing.test.ts
 * @purpose Q-LOCK-3a coverage · SupplyX canonical sidebar config invariants · D-NEW-CC compliance
 * @who Internal Procurement · Buyer · Audit Owner
 * @when 2026-05-09
 * @sprint T-Phase-1.A.7.α-a-SupplyX-Scaffold-Close · Block A test
 * @iso ISO 25010 Testability · Maintainability
 * @whom Audit Owner
 * @decisions D-NEW-CC canonical (sidebar keyboard uniqueness) · Q-LOCK-3a · Q-LOCK-13a status flip
 * @disciplines FR-30 · FR-32
 * @reuses supplyx-sidebar-config · @/shell/types SidebarItem · applications.ts entitlement seed
 * @[JWT] N/A (config / type level)
 */
import { describe, it, expect } from 'vitest';
import { supplyXSidebarItems } from '@/apps/erp/configs/supplyx-sidebar-config';
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

describe('SupplyX sidebar config · D-NEW-CC canonical (α-a Block A)', () => {
  it('all keyboard shortcuts in supplyx config are unique', () => {
    const flat = flatten(supplyXSidebarItems);
    const kbs = flat.map((i) => i.keyboard).filter((k): k is string => Boolean(k));
    const dedup = new Set(kbs);
    expect(dedup.size).toBe(kbs.length);
  });
  it('all 4 expected supplyx module IDs are present', () => {
    const flat = flatten(supplyXSidebarItems);
    const ids = new Set(flat.map((i) => i.moduleId).filter((m): m is string => Boolean(m)));
    const expected = ['welcome', 'open-rfqs', 'pending-quotations', 'pending-awards'];
    for (const e of expected) expect(ids.has(e)).toBe(true);
  });
  it('keyboard namespace is supplyx-prefixed (x *) · no collision with qualicheck (q *) or store-hub (s *)', () => {
    const flat = flatten(supplyXSidebarItems);
    const kbs = flat.map((i) => i.keyboard).filter((k): k is string => Boolean(k));
    for (const kb of kbs) {
      expect(kb.startsWith('x ')).toBe(true);
    }
  });
  it('Q-LOCK-13a · supplyx status flipped to active at α-a close', async () => {
    const mod = await import('@/components/operix-core/applications');
    const apps = (mod as { applications?: ReadonlyArray<{ id: string; status: string }> }).applications;
    expect(apps).toBeDefined();
    const sx = apps?.find((a) => a.id === 'supplyx');
    expect(sx?.status).toBe('active');
  });
});
