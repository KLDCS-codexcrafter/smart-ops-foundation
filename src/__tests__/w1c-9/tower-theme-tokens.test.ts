/**
 * @sprint T-W1C9-Entry-Page-Polish
 * Guard: tower/Dashboard.tsx must have zero hardcoded chrome (bg-[#...], border-slate-*, text-slate-*, text-white).
 * Status-accent hex remain only inside the bannerStats/gauges DATA arrays (color: '#...' / fill={color}).
 * Also guards the Welcome blueprint copy stayed in sync with the 8-scenario roster.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const dash = readFileSync('src/pages/tower/Dashboard.tsx', 'utf8');
const welcome = readFileSync('src/pages/Welcome.tsx', 'utf8');
const blueprints = readFileSync('src/pages/welcome/scenarios/ClientBlueprintsPage.tsx', 'utf8');

describe('W1C-9 · tower/Dashboard.tsx theme-token chrome', () => {
  it('has zero bg-[#...] arbitrary chrome classes', () => {
    expect(dash).not.toMatch(/className=("[^"]*|'[^']*)\bbg-\[#/);
  });
  it('has zero border-slate-* chrome classes', () => {
    expect(dash).not.toMatch(/\bborder-slate-\d+/);
  });
  it('has zero text-slate-* chrome classes', () => {
    expect(dash).not.toMatch(/\btext-slate-\d+/);
  });
  it('has zero text-white chrome classes', () => {
    expect(dash).not.toMatch(/\btext-white\b/);
  });
  it('uses the canonical token vocabulary', () => {
    expect(dash).toMatch(/\bbg-card\b/);
    expect(dash).toMatch(/\bborder-border\b/);
    expect(dash).toMatch(/\btext-foreground\b/);
    expect(dash).toMatch(/\btext-muted-foreground\b/);
    expect(dash).toMatch(/hsl\(var\(--border\)\)/);
  });
});

describe('W1C-9 · Welcome blueprint copy truth', () => {
  it('Welcome Client Blueprints copy reflects 8 scenarios (not the stale 7)', () => {
    expect(welcome).not.toMatch(/Seven design-partner/);
    expect(welcome).toMatch(/Eight design-partner/);
    expect(welcome).toMatch(/SigmaFlow Control/);
  });
  it('CLIENT_SCENARIOS roster actually contains 8 entries', () => {
    const ids = blueprints.match(/^\s+id:\s*'[^']+',/gm) ?? [];
    expect(ids.length).toBe(8);
  });
});
