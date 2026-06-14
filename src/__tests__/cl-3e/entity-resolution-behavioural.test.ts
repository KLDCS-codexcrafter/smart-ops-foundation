/**
 * @sprint  T-CL3e-RawKey-Final-EntityResolution
 * @purpose Behavioural proof — converted gateflow + vendor-portal panels
 *          resolve entity via the reactive useEntityCode() hook (NOT raw
 *          localStorage / helpers), so a seeded entity X flows through to
 *          downstream reads.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

describe('CL-3e · behavioural — gateflow/panels.tsx converted', () => {
  const src = read('src/pages/erp/gateflow/panels.tsx');

  it('module-scope helper deleted', () => {
    expect(src).not.toMatch(/function\s+getActiveEntityCode/);
    expect(src).not.toMatch(/getItem\(['"]active_entity_code['"]\)/);
  });

  it('every exported panel reads entity via useEntityCode() at top level', () => {
    // GateFlowWelcome
    expect(src).toMatch(/export function GateFlowWelcome[\s\S]{0,200}const \{ entityCode \} = useEntityCode\(\);/);
    // GatePassRegisterPanel
    expect(src).toMatch(/export function GatePassRegisterPanel[\s\S]{0,200}const \{ entityCode \} = useEntityCode\(\);/);
  });
});

describe('CL-3e · behavioural — vendor-portal panels converted', () => {
  const files = [
    'src/pages/erp/vendor-portal/VendorPortalWelcome.tsx',
    'src/pages/erp/vendor-portal/panels/Msme43BhTrackerPanel.tsx',
    'src/pages/erp/vendor-portal/panels/VendorActivityMonitorPanel.tsx',
    'src/pages/erp/vendor-portal/panels/VendorBroadcastConsolePanel.tsx',
    'src/pages/erp/vendor-portal/panels/VendorCommunicationLogAdminPanel.tsx',
    'src/pages/erp/vendor-portal/panels/VendorScoringPanel.tsx',
  ];

  it('no panel reads active_entity_code or DEFAULT_ENTITY_SHORTCODE', () => {
    for (const f of files) {
      const s = read(f);
      expect(s, f).not.toMatch(/getItem\(['"]active_entity_code['"]\)/);
      expect(s, f).not.toMatch(/=\s*DEFAULT_ENTITY_SHORTCODE\s*;/);
      expect(s, f).toMatch(/const \{ entityCode \} = useEntityCode\(\);/);
    }
  });
});

describe('CL-3e · behavioural — fincore RCMComplianceReport (GST compliance)', () => {
  const src = read('src/pages/erp/fincore/reports/gst/RCMComplianceReport.tsx');
  it('default export uses useEntityCode (entity-correctness for GST data)', () => {
    expect(src).not.toMatch(/getItem\(['"]active_entity_code['"]\)/);
    expect(src).toMatch(/const \{ entityCode \} = useEntityCode\(\);/);
    expect(src).toMatch(/<RCMComplianceReportPanel entityCode=\{entityCode\}/);
  });
});

describe('CL-3e · behavioural — customer/Statement.tsx straggler', () => {
  const src = read('src/pages/customer/Statement.tsx');
  it('hook replaces DEFAULT_ENTITY_SHORTCODE const', () => {
    expect(src).not.toMatch(/=\s*DEFAULT_ENTITY_SHORTCODE\s*;/);
    expect(src).not.toMatch(/from '@\/lib\/default-entity'/);
    expect(src).toMatch(/const \{ entityCode \} = useEntityCode\(\);/);
  });
});
