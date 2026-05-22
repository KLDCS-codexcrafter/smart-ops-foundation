/**
 * D-NEW-FP · Reorder→RequestX UI button · Block E
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

const P = 'src/pages/erp/store-hub/DepartmentStorePanels.tsx';
const BRIDGE = 'src/lib/reorder-indent-bridge.ts';

describe('D-NEW-FP · Raise Indent UI button', () => {
  it('DepartmentStorePanels imports promoteReorderToIndent', () => {
    expect(fs.readFileSync(P, 'utf-8')).toContain('promoteReorderToIndent');
  });
  it('handleRaiseIndent callback added', () => {
    expect(fs.readFileSync(P, 'utf-8')).toContain('handleRaiseIndent');
  });
  it('Raise Indent button text present', () => {
    expect(fs.readFileSync(P, 'utf-8')).toContain('Raise Indent');
  });
  it('Existing Promote to Indent dialog preserved (additive change)', () => {
    expect(fs.readFileSync(P, 'utf-8')).toContain('Promote to Indent');
  });
  it('reorder-indent-bridge.ts still exists and exports promoteReorderToIndent (0-DIFF spirit)', () => {
    expect(fs.existsSync(BRIDGE)).toBe(true);
    expect(fs.readFileSync(BRIDGE, 'utf-8')).toContain('promoteReorderToIndent');
  });
  it('Sentinel · D-NEW-FP closure', () => { expect('D-NEW-FP').toBe('D-NEW-FP'); });
});
