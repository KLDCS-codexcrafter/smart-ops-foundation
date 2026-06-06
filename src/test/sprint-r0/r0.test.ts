/**
 * Sprint R0 · Block 6 · behavioral + parse-level + smoke
 * ≥18 assertions covering Blocks 1–5 deliverables.
 *
 * NOTE: This suite intentionally reads source files via Node fs for parse-level
 * walls (catalog coverage, comment markers, fake-toast absence) — these are
 * cheaper and more honest than mounting React for them.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  ADDITIVE_INLINE_AUDIT_TYPES,
  type AdditiveInlineAuditType,
} from '@/types/audit-trail';
import {
  loadEntityBranding,
  setBrandingSlot,
  clearBrandingSlot,
  validateBrandingDataUrl,
  MAX_SLOT_BYTES,
  entityBrandingKey,
} from '@/lib/entity-branding-engine';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel: string): boolean => fs.existsSync(path.join(ROOT, rel));

// ─── Block 1 + 2 evidence presence ────────────────────────────────────────────
describe('Sprint R0 · Block 1 + 2 · evidence docs', () => {
  it('Dispatch_True_Remainder_v1.md exists', () => {
    expect(exists('audit_workspace/R0_evidence/Dispatch_True_Remainder_v1.md')).toBe(true);
  });

  it('Dispatch evidence enumerates all 23 FT-DISPATCH rows', () => {
    const md = read('audit_workspace/R0_evidence/Dispatch_True_Remainder_v1.md');
    // Rows referenced as 001..023 (zero-padded). Confirm full coverage 001 through 023.
    for (let i = 1; i <= 23; i++) {
      const num = String(i).padStart(3, '0');
      expect(md, `missing FT-DISPATCH-${num}`).toMatch(new RegExp(`\\b${num}\\b`));
    }
  });

  it('Trident_Scatter_Routing_v1.md exists and references 11 enhancements', () => {
    expect(exists('audit_workspace/R0_evidence/Trident_Scatter_Routing_v1.md')).toBe(true);
    const md = read('audit_workspace/R0_evidence/Trident_Scatter_Routing_v1.md');
    // 11 routed items — at minimum count of verdict rows
    const verdicts = md.match(/[✅🔶❌🔵]/gu) ?? [];
    expect(verdicts.length).toBeGreaterThanOrEqual(11);
  });
});

// ─── Block 3 · ImportHub honesty ──────────────────────────────────────────────
describe('Sprint R0 · Block 3 · ImportHub honesty', () => {
  const src = read('src/pages/bridge/ImportHub.tsx');

  it('NO fake IMP-005 toast call remains (header comment about deletion is OK)', () => {
    // Strip block comments before matching so the documenting header doesn't false-positive.
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(stripped).not.toMatch(/IMP-005/);
  });

  it('honesty panel present', () => {
    expect(src).toMatch(/import-hub-honesty/);
  });

  it('routes to real import surfaces (ecomx / eximx / fincore)', () => {
    expect(src).toMatch(/\/erp\/ecomx/);
    expect(src).toMatch(/\/erp\/eximx\/import/);
    expect(src).toMatch(/\/erp\/fincore/);
  });
});

// ─── Block 4 · SecurityModule honesty ─────────────────────────────────────────
describe('Sprint R0 · Block 4 · SecurityModule honesty patch', () => {
  const src = read('src/features/command-center/modules/SecurityModule.tsx');

  it('fake "Settings saved — backend will enforce" string absent', () => {
    expect(src).not.toMatch(/Settings saved — backend will enforce on next login/);
  });

  it('fake "policies will take effect shortly" string absent', () => {
    expect(src).not.toMatch(/policies will take effect shortly/);
  });

  it('shared honest-message constant present and used', () => {
    expect(src).toMatch(/SECURITY_HONESTY_MSG/);
    expect(src).toMatch(/Security Console rewire is scheduled/);
  });

  it('shared DemoBadge component present', () => {
    expect(src).toMatch(/security-demo-badge/);
  });

  it('demo prop applied to ≥8 fixture panels (SectionHeader demo)', () => {
    const demoUsages = src.match(/<SectionHeader\s+demo\b/g) ?? [];
    expect(demoUsages.length).toBeGreaterThanOrEqual(8);
  });
});

// ─── Block 5.1 · zero eslint-disables in 3 taskflow files ─────────────────────
describe('Sprint R0 · Block 5.1 · taskflow eslint-disables removed', () => {
  const files = [
    'src/pages/erp/taskflow/ChatGovernancePage.tsx',
    'src/pages/erp/taskflow/TemplatesPage.tsx',
    'src/pages/erp/taskflow/TaskRoomPage.tsx',
  ];
  for (const f of files) {
    it(`${f} contains no eslint-disable`, () => {
      const src = read(f);
      expect(src).not.toMatch(/eslint-disable/);
    });
  }
});

// ─── Block 5.2 · audit-aggregator catalog consolidation ───────────────────────
describe('Sprint R0 · Block 5.2 · ADDITIVE_INLINE_AUDIT_TYPES catalog', () => {
  it('exports a const tuple', () => {
    expect(Array.isArray(ADDITIVE_INLINE_AUDIT_TYPES)).toBe(true);
    expect(ADDITIVE_INLINE_AUDIT_TYPES.length).toBeGreaterThanOrEqual(6);
  });

  it('contains every additive-inline type', () => {
    const expected: AdditiveInlineAuditType[] = [
      'taskflow_event',
      'chat_event',
      'document_control_event',
      'frontdesk_event',
      'receivx_followup_event',
      'webstorex_event',
    ];
    for (const t of expected) {
      expect(ADDITIVE_INLINE_AUDIT_TYPES).toContain(t);
    }
  });

  it('parse-level: every additive-inline comment site is represented in catalog', () => {
    const src = read('src/types/audit-trail.ts');
    // Each site has a comment "NO registerAuditEntityType call" followed shortly
    // by a `| 'xxx_event'` literal. Extract those literals and ensure catalog covers them.
    const re = /NO registerAuditEntityType call[\s\S]{0,400}?\|\s*'([a-z_]+)'/g;
    const found = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) found.add(m[1]);
    // Plus the precedent (taskflow_event) which doesn't itself carry the comment.
    found.add('taskflow_event');
    for (const t of found) {
      expect(ADDITIVE_INLINE_AUDIT_TYPES as readonly string[]).toContain(t);
    }
  });

  it('wall holds: NO registerAuditEntityType call introduced for catalog members', () => {
    const src = read('src/types/audit-trail.ts');
    expect(src).not.toMatch(/registerAuditEntityType\(/);
  });
});

// ─── Block 5.3 · entity branding engine ───────────────────────────────────────
describe('Sprint R0 · Block 5.3 · entity-branding-engine', () => {
  const ENTITY = 'R0TEST';

  beforeEach(() => {
    localStorage.removeItem(entityBrandingKey(ENTITY));
  });

  // 1×1 transparent PNG dataURL (~70 bytes)
  const TINY_PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  it('unset slots return null', () => {
    const b = loadEntityBranding(ENTITY);
    expect(b.logo).toBeNull();
    expect(b.authorized_signature).toBeNull();
    expect(b.stamp).toBeNull();
  });

  it('rejects non-image MIME', () => {
    expect(() => validateBrandingDataUrl('data:application/pdf;base64,XXXX')).toThrow(/Unsupported/i);
  });

  it('rejects non-dataURL strings', () => {
    expect(() => validateBrandingDataUrl('https://evil.example/logo.png')).toThrow(/dataURL/i);
  });

  it('rejects images larger than MAX_SLOT_BYTES', () => {
    const big = 'data:image/png;base64,' + 'A'.repeat(MAX_SLOT_BYTES + 100);
    expect(() => validateBrandingDataUrl(big)).toThrow(/too large/i);
  });

  it('accepts valid PNG and round-trips through localStorage', () => {
    setBrandingSlot(ENTITY, 'logo', TINY_PNG);
    setBrandingSlot(ENTITY, 'authorized_signature', TINY_PNG);
    setBrandingSlot(ENTITY, 'stamp', TINY_PNG);
    const b = loadEntityBranding(ENTITY);
    expect(b.logo).toBe(TINY_PNG);
    expect(b.authorized_signature).toBe(TINY_PNG);
    expect(b.stamp).toBe(TINY_PNG);
  });

  it('clear restores null without touching siblings', () => {
    setBrandingSlot(ENTITY, 'logo', TINY_PNG);
    setBrandingSlot(ENTITY, 'stamp', TINY_PNG);
    clearBrandingSlot(ENTITY, 'logo');
    const b = loadEntityBranding(ENTITY);
    expect(b.logo).toBeNull();
    expect(b.stamp).toBe(TINY_PNG);
  });

  it('SalesInvoicePrint template consumes branding (logo + signature + stamp)', () => {
    const src = read('src/pages/erp/accounting/vouchers/SalesInvoicePrint.tsx');
    expect(src).toMatch(/loadEntityBranding/);
    expect(src).toMatch(/invoice-print-logo/);
    expect(src).toMatch(/invoice-print-signature/);
    expect(src).toMatch(/invoice-print-stamp/);
  });

  it('PrintConfigPage exposes the EntityBrandingSection', () => {
    const src = read('src/pages/erp/fincore/settings/PrintConfigPage.tsx');
    expect(src).toMatch(/entity-branding-section/);
    // Slot test-ids are built from a template literal: `branding-slot-${slot}`
    expect(src).toMatch(/branding-slot-\$\{slot\}/);
    expect(src).toMatch(/EntityBrandingSection/);
  });
});

// ─── S155 backfill (R0 Block 0.2 · P8.1 Block 0.2(i) CORRECTED) ──────────────
// CORRECTION: prior assertion enshrined 'c5f59599' which was the defective
// pre-T1 push. The actual banked POST-T1 headSha is '09682149'.
describe('Sprint R0 · S155 headSha backfill', () => {
  it('S155 headSha is locked to the post-T1 banked value 09682149', () => {
    const s155 = SPRINTS.find(s => s.sprintNumber === 155);
    expect(s155).toBeDefined();
    expect(s155!.headSha).not.toBe('TBD_AT_BANK');
    expect(s155!.headSha).toBe('09682149');
  });
});
