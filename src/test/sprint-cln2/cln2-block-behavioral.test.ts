/**
 * Sprint CLEANUP-2 · T-CLN2-Bridge-DeadButtons · behavioral block
 *
 * Source-level assertions: the 7 dead "coming soon" toasts in
 * src/pages/bridge/* have been replaced with honest behaviour
 * (wired to existing local state OR honest-deferred to Wave-2).
 *
 * We assert on file CONTENT rather than rendering Bridge pages
 * (Bridge pages are heavy mock surfaces; this matches the existing
 * Wave-1 cleanup test posture).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), 'utf-8');
}

const CONSOLE = read('src/pages/bridge/ConsoleDashboard.tsx');
const FIELDMAP = read('src/pages/bridge/FieldMapper.tsx');
const COMPANY = read('src/pages/bridge/CompanyRegistry.tsx');
const EXCEPTION = read('src/pages/bridge/ExceptionWorkbench.tsx');
const SETTINGS = read('src/pages/bridge/BridgeSettings.tsx');
const HISTORY = read('src/lib/_institutional/sprint-history.ts');

const ALL_BRIDGE = [CONSOLE, FIELDMAP, COMPANY, EXCEPTION, SETTINGS].join('\n');

describe('CLN2 · zero "coming soon" residue in /bridge/*', () => {
  it('no "coming soon" toast remains in any bridge page', () => {
    expect(/coming soon/i.test(ALL_BRIDGE)).toBe(false);
  });

  it('grep across all 5 cleaned files returns zero matches', () => {
    for (const src of [CONSOLE, FIELDMAP, COMPANY, EXCEPTION, SETTINGS]) {
      expect(src.toLowerCase()).not.toContain('coming soon');
    }
  });
});

describe('CLN2 · ConsoleDashboard filter-by-stage wired on local state', () => {
  it('introduces a selectedStage useState hook', () => {
    expect(CONSOLE).toMatch(/useState<string \| null>\(null\)/);
  });

  it('stage button toggles selectedStage instead of firing a toast', () => {
    expect(CONSOLE).toMatch(/setSelectedStage\(\(cur\)/);
  });

  it('renders a clearable Filtered banner when a stage is selected', () => {
    expect(CONSOLE).toContain('Filtered:');
    expect(CONSOLE).toMatch(/onClick=\{\(\) => setSelectedStage\(null\)\}/);
  });

  it('removes the toast import (no more pseudo-actions on the dashboard)', () => {
    expect(CONSOLE).not.toMatch(/from "sonner"/);
  });
});

describe('CLN2 · FieldMapper deletes wired to local templates state', () => {
  it('converts TEMPLATES const to INITIAL_TEMPLATES + useState', () => {
    expect(FIELDMAP).toContain('INITIAL_TEMPLATES');
    expect(FIELDMAP).toMatch(/useState<MappingTemplate\[\]>\(INITIAL_TEMPLATES\)/);
  });

  it('exposes a deleteTemplate helper that confirms + removes from state', () => {
    expect(FIELDMAP).toContain('deleteTemplate');
    expect(FIELDMAP).toContain('window.confirm');
    expect(FIELDMAP).toMatch(/setTemplates\(\(cur\) => cur\.filter/);
  });

  it('both Delete buttons (row + sheet) invoke deleteTemplate, not a toast', () => {
    // Row-level Delete in the table
    expect(FIELDMAP).toMatch(/onClick=\{\(\) => deleteTemplate\(t\)\}/);
    // Sheet-level Delete uses the detailTemplate guard
    expect(FIELDMAP).toContain('if (detailTemplate) deleteTemplate(detailTemplate)');
  });

});

describe('CLN2 · CompanyRegistry config + remove wired on local companies state', () => {
  it('converts COMPANIES const to INITIAL_COMPANIES + useState', () => {
    expect(COMPANY).toContain('INITIAL_COMPANIES');
    expect(COMPANY).toMatch(/useState<TallyCompany\[\]>\(INITIAL_COMPANIES\)/);
  });

  it('config (Settings) icon opens the existing detail Sheet', () => {
    expect(COMPANY).toMatch(/onClick=\{\(\) => openDetail\(c\)\} title="Open configuration"/);
  });

  it('Remove Company is wired to handleRemoveCompany with confirm + state mutation', () => {
    expect(COMPANY).toContain('handleRemoveCompany');
    expect(COMPANY).toMatch(/setCompanies\(\(cur\) => cur\.filter/);
    expect(COMPANY).toMatch(/window\.confirm\(`Remove \$\{selectedCompany\.name\}/);
  });
});

describe('CLN2 · ExceptionWorkbench Edit & Retry wired on local exceptions state', () => {
  it('converts EXCEPTIONS const to INITIAL_EXCEPTIONS + useState', () => {
    expect(EXCEPTION).toContain('INITIAL_EXCEPTIONS');
    expect(EXCEPTION).toMatch(/useState<Exception\[\]>\(INITIAL_EXCEPTIONS\)/);
  });

  it('handleEditAndRetry prompts for module edit and flips status to resolved', () => {
    expect(EXCEPTION).toContain('handleEditAndRetry');
    expect(EXCEPTION).toContain('window.prompt');
    expect(EXCEPTION).toMatch(/status: "resolved"/);
  });

  it('Edit & Retry button is wired to handleEditAndRetry', () => {
    expect(EXCEPTION).toMatch(/onClick=\{handleEditAndRetry\}/);
  });
});

describe('CLN2 · BridgeSettings Download honest-deferred to Wave-2', () => {
  it('Download button is disabled (no fake action)', () => {
    expect(SETTINGS).toMatch(/<Button variant="outline" className="w-full" disabled/);
  });

  it('shows an honest Wave-2 note instead of a "coming soon" toast', () => {
    expect(SETTINGS).toContain('arrives with the Wave-2 sync backend');
    expect(SETTINGS).toContain('support@4dsmartops.in');
  });

  it('no onClick handler exists on the Download button (no fake firing)', () => {
    // Locate the Download Bridge Agent button slice and ensure no onClick on it
    const idx = SETTINGS.indexOf('Download Bridge Agent .exe');
    expect(idx).toBeGreaterThan(0);
    const slice = SETTINGS.slice(Math.max(0, idx - 400), idx);
    expect(slice).not.toMatch(/onClick=\{[^}]*\}/);
  });
});

describe('CLN2 · institutional bookkeeping', () => {
  it('CLN1 sha is flipped from TBD_AT_BANK to 54ba9516', () => {
    expect(HISTORY).toMatch(/headSha: '54ba9516', predecessorSha: 'cca094bd'/);
  });

  it('CLN2 entry appended with empty newSiblings (cleanup posture)', () => {
    expect(HISTORY).toContain("'T-CLN2-Bridge-DeadButtons'");
    expect(HISTORY).toMatch(/sprintNumber: 'CLN2' as unknown as number[\s\S]{0,200}newSiblings: \[\]/);
  });

  it('CLN2 narrative names all 7 sites for the auditor', () => {
    expect(HISTORY).toContain('ConsoleDashboard:138');
    expect(HISTORY).toContain('FieldMapper:253 + :502');
    expect(HISTORY).toContain('CompanyRegistry:359');
    expect(HISTORY).toContain('CompanyRegistry:603');
    expect(HISTORY).toContain('ExceptionWorkbench:343');
    expect(HISTORY).toContain('BridgeSettings:452');
  });
});

describe('CLN2 · §H walls (bridge engines + Wave-2 seams untouched)', () => {
  it('no live fetch added in any of the 5 cleaned bridge pages', () => {
    for (const src of [CONSOLE, FIELDMAP, COMPANY, EXCEPTION, SETTINGS]) {
      expect(src).not.toMatch(/\bfetch\(/);
      expect(src).not.toMatch(/from ['"]axios['"]/);
    }
  });

  it('cleaned bridge pages do not import bridge engines (engines remain 0-DIFF)', () => {
    for (const src of [CONSOLE, FIELDMAP, COMPANY, EXCEPTION, SETTINGS]) {
      expect(src).not.toMatch(/from ['"]@\/lib\/reconciliation-engine['"]/);
      expect(src).not.toMatch(/from ['"]@\/lib\/sync-engine['"]/);
    }
  });

  it('Wave-2 [JWT] mock→real-fetch seams in cleaned files remain marked (not stripped)', () => {
    // The [JWT] BRIDGE TIER SCOPING comments are correct deferrals — they must stay.
    const seams = (CONSOLE + FIELDMAP + COMPANY + EXCEPTION).match(/\[JWT\] BRIDGE TIER SCOPING/g) ?? [];
    expect(seams.length).toBeGreaterThanOrEqual(3);
  });
});
