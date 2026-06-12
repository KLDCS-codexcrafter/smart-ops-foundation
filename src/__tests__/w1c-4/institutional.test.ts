/**
 * W1C-4 · Block 3 · institutional invariants.
 *  - sprint-history backfill W1C-3 → f6d8bcb
 *  - sprint-history self-seed W1C-4 (T-W1C4-AutoSend-TierL) with newSiblings:['auto-send-rules-engine']
 *  - sibling-register appends auto-send-rules-engine (the arc's ONE new SIBLING)
 *  - CC sidebar + CommandCenterPage wire 'auto-send-rules' module
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const HISTORY = readFileSync('src/lib/_institutional/sprint-history.ts', 'utf8');
const SIBLINGS = readFileSync('src/lib/_institutional/sibling-register.ts', 'utf8');
const SIDEBAR = readFileSync('src/apps/erp/configs/command-center-sidebar-config.ts', 'utf8');
const PAGE = readFileSync('src/features/command-center/pages/CommandCenterPage.tsx', 'utf8');

describe('W1C-4 · sprint-history', () => {
  it('W1C-3 backfilled to f6d8bcb', () => {
    expect(HISTORY).toMatch(/code: 'T-W1C3-ComingSoon-WelcomeTruth'[\s\S]{0,400}headSha: 'f6d8bcb'/);
  });
  it('W1C-4 self-seeded as T-W1C4-AutoSend-TierL', () => {
    expect(HISTORY).toContain("'T-W1C4-AutoSend-TierL'");
    expect(HISTORY).toMatch(/sprintNumber: 'W1C4'/);
  });
  it('W1C-4 declares newSiblings:[auto-send-rules-engine]', () => {
    expect(HISTORY).toMatch(/code: 'T-W1C4-AutoSend-TierL'[\s\S]{0,800}newSiblings:\s*\['auto-send-rules-engine'\]/);
  });
});

describe('W1C-4 · sibling-register', () => {
  it('appends auto-send-rules-engine entry', () => {
    expect(SIBLINGS).toContain("id: 'auto-send-rules-engine'");
    expect(SIBLINGS).toContain('src/lib/auto-send-rules-engine.ts');
  });
});

describe('W1C-4 · CC mount', () => {
  it('sidebar exposes the auto-send-rules module', () => {
    expect(SIDEBAR).toContain("moduleId: 'auto-send-rules'");
  });
  it('CommandCenterPage routes the auto-send-rules case', () => {
    expect(PAGE).toContain("case 'auto-send-rules':");
    expect(PAGE).toContain("import AutoSendRulesPage");
  });
});
