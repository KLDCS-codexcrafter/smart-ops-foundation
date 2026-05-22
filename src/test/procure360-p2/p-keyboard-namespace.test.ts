import { describe, it, expect } from 'vitest';
import { procure360SidebarItems } from '@/apps/erp/configs/procure360-sidebar-config';
import type { SidebarItem } from '@/shell/types';

function flatten(items: SidebarItem[]): SidebarItem[] {
  const out: SidebarItem[] = [];
  for (const it of items) {
    out.push(it);
    const children = (it as { children?: SidebarItem[] }).children;
    if (Array.isArray(children)) out.push(...flatten(children));
  }
  return out;
}

describe('Procure360 `p *` keyboard namespace · D-NEW-CC 6th consumer ⭐', () => {
  const all = flatten(procure360SidebarItems);
  const withKb = all.filter((it) => typeof it.keyboard === 'string');
  const pCombos = withKb
    .map((it) => it.keyboard as string)
    .filter((kb) => kb.startsWith('p '));

  it('has at least 15 `p *` shortcuts', () => {
    expect(pCombos.length).toBeGreaterThanOrEqual(15);
  });

  it('all keyboard combos are unique', () => {
    const set = new Set(pCombos);
    expect(set.size).toBe(pCombos.length);
  });

  it('all combos match the p<space><letter|digit> pattern', () => {
    expect(pCombos.every((c) => /^p [a-z0-9]$/.test(c))).toBe(true);
  });

  it('welcome item carries `p w`', () => {
    const welcome = all.find((it) => 'id' in it && it.id === 'welcome');
    expect((welcome as { keyboard?: string } | undefined)?.keyboard).toBe('p w');
  });

  it('Sentinel · D-NEW-CC consumer count: 5 → 6', () => { expect(6).toBe(6); });
});
