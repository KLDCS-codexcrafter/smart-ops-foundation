import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const SIDEBAR = join(process.cwd(), 'src/apps/erp/configs/production-sidebar-config.ts');
const PANEL = join(process.cwd(), 'src/pages/erp/production/reports/FALinkedMachinesPanel.tsx');

describe('FK-CAP-6 Production sidebar assets-group', () => {
  it('sidebar config has assets-group', () => {
    expect(readFileSync(SIDEBAR, 'utf8')).toMatch(/assets-group/);
  });
  it('FALinkedMachinesPanel exists', () => {
    expect(existsSync(PANEL)).toBe(true);
  });
  it('sidebar has machine-master entry', () => {
    expect(readFileSync(SIDEBAR, 'utf8')).toMatch(/machine-master|Machine Master/i);
  });
});
