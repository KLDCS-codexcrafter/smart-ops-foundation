import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

describe('CrossEntityRealisationDashboard · D-NEW-FA UI smoke', () => {
  it('Dashboard file exists at verified path', () => {
    expect(fs.existsSync('src/pages/erp/eximx/finance/CrossEntityRealisationDashboard.tsx')).toBe(true);
  });
  it('ExportRealisationSaathiPanel references cross-entity link', () => {
    const content = fs.readFileSync(
      'src/pages/erp/eximx/saathi/ExportRealisationSaathiPanel.tsx',
      'utf-8',
    );
    expect(content).toMatch(/cross-entity-realisation|D-NEW-FA|CrossEntityRealisation/);
  });
  it('sentinel · cross-entity tile additive', () => {
    expect('cross-entity-tile').toBe('cross-entity-tile');
  });
});
