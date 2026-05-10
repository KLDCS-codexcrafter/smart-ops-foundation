/**
 * @file src/test/docvault-routing.test.ts
 * @sprint T-Phase-1.A.8.α-a-DocVault-Foundation · Block B.3 + E.4
 */
import { describe, it, expect } from 'vitest';
import { docVaultSidebarItems } from '@/apps/erp/configs/docvault-sidebar-config';
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

describe('DocVault sidebar config · D-NEW-CC canonical (α-a Block B)', () => {
  it('all keyboard shortcuts in docvault config are unique', () => {
    const flat = flatten(docVaultSidebarItems);
    const kbs = flat.map((i) => i.keyboard).filter((k): k is string => Boolean(k));
    expect(new Set(kbs).size).toBe(kbs.length);
  });

  it('all 10 expected docvault module IDs are present (4 original + 6 A.9 BUNDLED)', () => {
    const flat = flatten(docVaultSidebarItems);
    const ids = new Set(flat.map((i) => i.moduleId).filter((m): m is string => Boolean(m)));
    for (const e of [
      'welcome', 'documents-register', 'document-entry', 'approvals-pending',
      'drawing-register-tree', 'tag-index', 'similarity-viewer',
      'documents-by-dept', 'approval-latency', 'version-velocity',
    ]) {
      expect(ids.has(e)).toBe(true);
    }
  });

  it("keyboard namespace is 'd *' · no collision with q*/s*/x*", () => {
    const flat = flatten(docVaultSidebarItems);
    const kbs = flat.map((i) => i.keyboard).filter((k): k is string => Boolean(k));
    for (const kb of kbs) expect(kb.startsWith('d ')).toBe(true);
  });

  it('Q-LOCK-8a · docvault status flipped to active at A.9 BUNDLED close · MOAT #20', async () => {
    const mod = await import('@/components/operix-core/applications');
    const apps = (mod as { applications?: ReadonlyArray<{ id: string; status: string }> }).applications;
    expect(apps).toBeDefined();
    const dv = apps?.find((a) => a.id === 'docvault');
    expect(dv?.status).toBe('active');
  });
});

// T-Phase-1.H.1 · FinCore naming migration tests
describe('T-Phase-1.H.1 · FinCore naming migration', () => {
  it('Q-LOCK-5a · applications.ts uses id="fincore" post-H.1 · name "Fin Core" preserved', async () => {
    const mod = await import('@/components/operix-core/applications');
    const apps = (mod as { applications: ReadonlyArray<{ id: string; name: string; route?: string }> }).applications;
    const fc = apps.find((a) => a.id === 'fincore');
    expect(fc).toBeDefined();
    expect(fc?.name).toBe('Fin Core'); // Q-LOCK-6a · with space · D-NEW-CM canonical
    expect(fc?.route).toBe('/erp/fincore'); // Q-LOCK-7a
    expect(apps.find((a) => a.id === 'finecore')).toBeUndefined();
  });

  it('Q-LOCK-7a · /erp/finecore redirects to /erp/fincore · backward-compat', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/App.tsx', 'utf-8');
    expect(content).toMatch(/path="\/erp\/fincore"/);
    expect(content).toMatch(/FineCoreLegacyRedirect/);
    expect(content).toMatch(/path="\/erp\/finecore"/);
  });

  it('Q-LOCK-12a · "Fin Core" (with space) display name preserved across breadcrumbs', async () => {
    const { execSync } = await import('child_process');
    const count = parseInt(
      execSync(`grep -rE "'Fin Core'" src/ --include='*.ts' --include='*.tsx' | wc -l`).toString().trim()
    );
    expect(count).toBeGreaterThanOrEqual(28);
  });

  it('Q-LOCK-1a + Q-LOCK-2a · zero FineCore · zero finecore (with e) post-H.1 (excluding intentional backward-compat references)', async () => {
    const { execSync } = await import('child_process');
    // Allowed: backward-compat redirect in App.tsx + this self-referential test file
    const wrongPascal = parseInt(
      execSync(`grep -rE "FineCore" src/ --include='*.ts' --include='*.tsx' --exclude-dir=test | grep -v "FineCoreLegacyRedirect" | grep -v "/erp/finecore" | wc -l`).toString().trim()
    );
    const wrongLower = parseInt(
      execSync(`grep -rE "[^A-Za-z]finecore[^A-Za-z]" src/ --include='*.ts' --include='*.tsx' --exclude-dir=test | grep -v "/erp/finecore" | wc -l`).toString().trim()
    );
    expect(wrongPascal).toBe(0);
    expect(wrongLower).toBe(0);
  });
});
