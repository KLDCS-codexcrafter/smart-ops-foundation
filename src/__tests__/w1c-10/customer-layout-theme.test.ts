/**
 * @sprint W1C-10 · T-W1C10-Smoke-Cleanup · F-1
 * Guard: CustomerLayout.tsx must not hardcode the dark navy sidebar nor any
 * white-on-dark chrome — mirrors the BridgeLayout / TowerLayout theme guards.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/components/layout/CustomerLayout.tsx', 'utf8');

describe('W1C-10 F-1 · CustomerLayout chrome', () => {
  it('does NOT contain the hardcoded hsl(222 ...) navy background', () => {
    expect(src).not.toMatch(/hsl\(222/);
  });
  it('does NOT contain the rgba(255,255,255,...) white-veil border', () => {
    expect(src).not.toMatch(/rgba\(255\s*,\s*255\s*,\s*255/);
  });
  it('does NOT use an inline style background on the sidebar', () => {
    expect(src).not.toMatch(/style=\{\{[^}]*background\s*:/);
  });
  it('has zero text-white/* chrome classes', () => {
    expect(src).not.toMatch(/\btext-white\b/);
  });
  it('has zero bg-white/* chrome classes', () => {
    expect(src).not.toMatch(/\bbg-white\b/);
  });
  it('has zero border-white/* chrome classes', () => {
    expect(src).not.toMatch(/\bborder-white\b/);
  });
  it('uses the canonical token vocabulary', () => {
    expect(src).toMatch(/\bbg-card\b/);
    expect(src).toMatch(/\bbg-background\b/);
    expect(src).toMatch(/\bborder-border\b/);
    expect(src).toMatch(/\btext-foreground\b/);
    expect(src).toMatch(/\btext-muted-foreground\b/);
  });
});
