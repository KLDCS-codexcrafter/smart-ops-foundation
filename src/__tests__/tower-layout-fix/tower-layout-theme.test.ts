/**
 * @sprint T-TowerLayout-Forced-Dark-Fix
 * Guard: TowerLayout.tsx must not re-pin .dark or use the hardcoded #0D1B2A navy,
 * and must contain zero bg-[#/text-white/border-white chrome classes.
 * Mirrors the W1C-9 tower-theme-tokens guard pattern.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/components/layout/TowerLayout.tsx', 'utf8');

describe('T-TowerLayout-Forced-Dark-Fix · TowerLayout chrome', () => {
  it('does NOT force the dark class in any className literal', () => {
    expect(src).not.toMatch(/className=("[^"]*|'[^']*)\bdark\b/);
  });
  it('does NOT contain the hardcoded #0D1B2A navy hex', () => {
    expect(src).not.toMatch(/#0D1B2A/i);
  });
  it('has zero bg-[#...] arbitrary chrome classes', () => {
    expect(src).not.toMatch(/\bbg-\[#/);
  });
  it('has zero text-white/* chrome classes', () => {
    expect(src).not.toMatch(/\btext-white\b/);
  });
  it('has zero border-white/* chrome classes', () => {
    expect(src).not.toMatch(/\bborder-white\b/);
  });
  it('uses the canonical token vocabulary (bg-card/bg-background/border-border/text-foreground/text-muted-foreground)', () => {
    expect(src).toMatch(/\bbg-card\b/);
    expect(src).toMatch(/\bbg-background\b/);
    expect(src).toMatch(/\bborder-border\b/);
    expect(src).toMatch(/\btext-foreground\b/);
    expect(src).toMatch(/\btext-muted-foreground\b/);
  });
});
