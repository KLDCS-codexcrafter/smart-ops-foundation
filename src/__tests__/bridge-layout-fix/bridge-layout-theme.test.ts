/**
 * @sprint T-BridgeLayout-Theme-Tokens
 * Guard: BridgeLayout.tsx must not hardcode a dark sidebar — no inline hsl(222 navy,
 * no rgba(255 white-veil border, no text-white/bg-white/border-white chrome, no inline style background.
 * Mirrors the tower-layout-theme guard so the two consoles stay consistent.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/components/layout/BridgeLayout.tsx', 'utf8');

describe('T-BridgeLayout-Theme-Tokens · BridgeLayout chrome', () => {
  it('does NOT contain the hardcoded hsl(222 ...) navy background', () => {
    expect(src).not.toMatch(/hsl\(222/);
  });
  it('does NOT contain the rgba(255,255,255,...) white-veil borderColor', () => {
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
  it('uses the canonical token vocabulary (mirroring TowerLayout)', () => {
    expect(src).toMatch(/\bbg-card\b/);
    expect(src).toMatch(/\bbg-background\b/);
    expect(src).toMatch(/\bborder-border\b/);
    expect(src).toMatch(/\btext-foreground\b/);
    expect(src).toMatch(/\btext-muted-foreground\b/);
    expect(src).toMatch(/\bbg-accent\b/);
  });
});
