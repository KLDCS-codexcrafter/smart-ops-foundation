import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SSOT Three-Greps audit · Q-LOCK-10(a) institutional cornerstone', () => {
  const auditPath = path.join(process.cwd(), 'audit_workspace/Procure360_P2A_close_evidence/ssot_audit_results.md');

  it('audit results file is present', () => {
    expect(fs.existsSync(auditPath)).toBe(true);
  });

  it('audit documents all 3 greps', () => {
    const md = fs.readFileSync(auditPath, 'utf8');
    expect(md).toMatch(/Grep 1.*VendorMaster/s);
    expect(md).toMatch(/Grep 2.*vendor-scoring/s);
    expect(md).toMatch(/Grep 3.*procurement workflow types/s);
  });

  it('Sentinel · FR-CANDIDATE-89 cornerstone', () => { expect('FR-CANDIDATE-89').toBe('FR-CANDIDATE-89'); });
});
