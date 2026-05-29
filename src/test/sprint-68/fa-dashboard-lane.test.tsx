/**
 * Sprint 68 FAR-4 · Block 16 · FA tile presence
 * Lesson 24 bounds-check · Sprint 79d migrated FA tiles from Dashboard.tsx to /erp/comply360/fixed-assets
 * (cards-only invariant restoration · DP-S79d-1 · DP-S79d-4 tab-shell).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('FA tile surface · FAR-CAP-23 / FK-CAP-7 (post-79d location: FixedAssetsHealthPage)', () => {
  const path = join(process.cwd(), 'src/pages/erp/comply360/fixed-assets/FixedAssetsHealthPage.tsx');
  it('FixedAssetsHealthPage.tsx exists', () => {
    expect(existsSync(path)).toBe(true);
  });
  it('contains FA tile identifiers', () => {
    const src = readFileSync(path, 'utf8');
    expect(src.includes('fa-health-tile')).toBe(true);
    expect(src.includes('fa-compliance-tile')).toBe(true);
    expect(src.includes('fa-custodian-tile')).toBe(true);
    expect(src.includes('fa-iot-stream-tile')).toBe(true);
  });
});
