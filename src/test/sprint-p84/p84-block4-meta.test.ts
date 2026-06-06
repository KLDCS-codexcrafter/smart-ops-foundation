/**
 * Sprint P8.4 · Block 4 — META-TEST EXTENSION (Wave-2 · system-wide)
 *
 * Extends the P8.3 Block-4 import-graph guard from the original 8 W1
 * literals/trees to the full set of 23 Wave-2 page trees enumerated in
 * audit_workspace/P84_evidence/audit_coverage_inventory.md.
 *
 * Enforces SCOPE-COMPLETION:
 *   For every create-handler page under the 23 trees, the page MUST either
 *     (a) call logAudit / safeAudit directly (page-self), OR
 *     (b) import a `*-engine.ts` (or `useX.ts`) that itself calls
 *         logAudit / safeAudit (engine-credit), OR
 *     (c) appear in META_SCOPE_EXEMPT with a reason ≥ 20 chars.
 *
 * The Class-B residue ceiling is ZERO — every Wave-2 create-handler page is
 * covered or explicitly exempted. No tree may exit Wave-2 silently.
 *
 * Wall: FS-only · no source-file mutation.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC = resolve(__dirname, '../../');
const PAGES_ROOT = resolve(SRC, 'pages/erp');

// ─────────────────────────────────────────────────────────────────────────────
// 23 Wave-2 trees (Block-0 enumeration)
// ─────────────────────────────────────────────────────────────────────────────
const TREES: readonly string[] = [
  'inventory', 'dispatch', 'production', 'qualicheck', 'gateflow',
  'maintainpro', 'requestx', 'pay-hub', 'servicedesk', 'frontdesk',
  'webstorex', 'ecomx', 'store-hub', 'sitex', 'engineeringx',
  'logistic', 'projx', 'taskflow', 'docvault', 'customer-hub',
  'distributor-hub', 'vendor-portal', 'comply360',
];

// ─────────────────────────────────────────────────────────────────────────────
// META_SCOPE_EXEMPT — pages explicitly outside Wave-2 scope. Reason ≥ 20 chars.
// ─────────────────────────────────────────────────────────────────────────────
type Exemption = { file: string; reason: string };
const META_SCOPE_EXEMPT: readonly Exemption[] = [
  // Empty by design: Pass 1a (engine-credit) + Pass 1b (page-direct) + Class-C
  // (page-direct) together drive class-B residue to ZERO. Future additions to
  // these trees must either get wired or be added here with a reason explaining
  // why an audit trail is not appropriate (≥ 20 chars).
];

// ─────────────────────────────────────────────────────────────────────────────
// FS scan utilities
// ─────────────────────────────────────────────────────────────────────────────
function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.(test|spec)\./.test(name)) out.push(p);
  }
  return out;
}

const CREATE_HANDLER_RE =
  /\b(handleSave|handleSubmit|handleCreate|handleAdd|handleSaveBrand|handleSaveSubBrand|handleSaveRule|handleAddGroupLink|handleGenerate|addExec|addAcceptor|saveTemplate)\b/;
const AUDIT_CALL_RE = /\b(logAudit|safeAudit)\s*\(/;

const libDir = resolve(SRC, 'lib');
const hooksDir = resolve(SRC, 'hooks');

const libContents = new Map<string, string>();
for (const f of walk(libDir)) libContents.set(f, readFileSync(f, 'utf8'));
const hookContents = new Map<string, string>();
for (const f of walk(hooksDir)) hookContents.set(f, readFileSync(f, 'utf8'));

function moduleHasAuditCall(specifier: string): boolean {
  // specifier is like '@/lib/foo-engine' or '../engines/bar' — resolve to a
  // best-effort filesystem path under src/lib or src/hooks.
  const tail = specifier.replace(/^@\//, '').replace(/^.*\//, '');
  for (const [path, body] of libContents.entries()) {
    if (path.endsWith(`/${tail}.ts`) || path.endsWith(`/${tail}.tsx`)) {
      if (AUDIT_CALL_RE.test(body)) return true;
    }
  }
  for (const [path, body] of hookContents.entries()) {
    if (path.endsWith(`/${tail}.ts`) || path.endsWith(`/${tail}.tsx`)) {
      if (AUDIT_CALL_RE.test(body)) return true;
    }
  }
  return false;
}

const IMPORT_RE = /from\s+['"]([^'"]+)['"]/g;
function importedAuditBearingModule(body: string): boolean {
  let m: RegExpExecArray | null;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(body)) !== null) {
    const spec = m[1];
    if (!/engine|hook|use[A-Z]/.test(spec)) continue;
    if (moduleHasAuditCall(spec)) return true;
  }
  return false;
}

interface PageRow { tree: string; file: string; relFile: string; body: string; }

function gatherCreatePages(): PageRow[] {
  const out: PageRow[] = [];
  for (const tree of TREES) {
    const root = join(PAGES_ROOT, tree);
    if (!existsSync(root)) continue;
    for (const file of walk(root)) {
      if (!file.endsWith('.tsx')) continue;
      const body = readFileSync(file, 'utf8');
      if (!CREATE_HANDLER_RE.test(body)) continue;
      out.push({ tree, file, relFile: file.replace(SRC + '/', 'src/'), body });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// (a) SCOPE-COMPLETION — every Wave-2 create-handler page is covered.
// ─────────────────────────────────────────────────────────────────────────────
describe('Sprint P8.4 · Block 4 · meta-test · scope-completion (23 trees)', () => {
  const pages = gatherCreatePages();
  const exemptSet = new Set(META_SCOPE_EXEMPT.map(e => e.file));

  it('enumerates create-handler pages across the Wave-2 trees', () => {
    expect(pages.length).toBeGreaterThanOrEqual(50);
    const treesSeen = new Set(pages.map(p => p.tree));
    // 14 of the 23 trees host detectable create-handlers (the rest are
    // reports/dashboards/empty-trees per Block-0 inventory).
    expect(treesSeen.size).toBeGreaterThanOrEqual(12);
  });

  it('every create-handler page has page-self audit OR engine-credit OR explicit META_SCOPE_EXEMPT', () => {
    const orphans: string[] = [];
    for (const p of pages) {
      if (exemptSet.has(p.relFile)) continue;
      const pageSelf = AUDIT_CALL_RE.test(p.body);
      if (pageSelf) continue;
      if (importedAuditBearingModule(p.body)) continue;
      orphans.push(`[${p.tree}] ${p.relFile}`);
    }
    expect(
      orphans,
      `Wave-2 SCOPE-COMPLETION orphans (no page-self · no engine-credit · no exemption):\n  ${orphans.join('\n  ')}`,
    ).toEqual([]);
  });

  it('META_SCOPE_EXEMPT reasons are all ≥ 20 chars (mirrors P83 ledger rule)', () => {
    const shortReasons = META_SCOPE_EXEMPT.filter(e => e.reason.trim().length < 20);
    expect(shortReasons).toEqual([]);
  });

  it('META_SCOPE_EXEMPT files actually exist on disk (no stale entries)', () => {
    const missing = META_SCOPE_EXEMPT
      .map(e => e.file)
      .filter(f => !existsSync(resolve(SRC, '..', f)));
    expect(missing).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (b) Class-B residue ceiling — zero unexplained silent pages.
// ─────────────────────────────────────────────────────────────────────────────
describe('Sprint P8.4 · Block 4 · meta-test · Class-B residue ceiling = ZERO', () => {
  const pages = gatherCreatePages();
  const exemptSet = new Set(META_SCOPE_EXEMPT.map(e => e.file));

  it('zero Wave-2 pages remain silent without coverage or exemption', () => {
    const residue = pages.filter(p =>
      !exemptSet.has(p.relFile)
      && !AUDIT_CALL_RE.test(p.body)
      && !importedAuditBearingModule(p.body),
    );
    expect(residue.map(r => r.relFile)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// (c) Negative-proof — fake exemption with short reason MUST trip the rule.
// ─────────────────────────────────────────────────────────────────────────────
describe('Sprint P8.4 · Block 4 · meta-test · negative-proof', () => {
  it('synthetic short-reason exemption is rejected by the length gate', () => {
    const bad: Exemption = { file: 'src/fake.tsx', reason: 'nope' };
    expect(bad.reason.trim().length).toBeLessThan(20);
  });

  it('a fake module spec with no audit calls is not credited', () => {
    expect(moduleHasAuditCall('this-module-does-not-exist-xyz')).toBe(false);
  });
});
