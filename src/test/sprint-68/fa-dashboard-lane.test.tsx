/**
 * Sprint 68 FAR-4 · Block 16 · Dashboard FA lane source presence
 * FAR-CAP-23 + FK-CAP-7 evidence check.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Dashboard FA lane · FAR-CAP-23 / FK-CAP-7', () => {
  const path = join(process.cwd(), 'src/pages/erp/Dashboard.tsx');
  it('Dashboard.tsx exists', () => {
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
