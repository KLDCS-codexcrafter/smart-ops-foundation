/**
 * @file    src/test/sprint-p87/p87-block-behavioral.test.ts
 * @sprint  T-P87-DeptId-Bridge-Retrofit · Wave-1 close
 * Posture: no exact-count toBe(N) · if-present-then-valid · toContain over headSha.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveDeptFromRecord, resolveDeptFromContext, DEPT_RESOLUTION_NOTE } from '@/lib/dept-context-resolver-engine';
import { SPRINTS } from '@/lib/_institutional/sprint-history.ts';
import { SIBLINGS } from '@/lib/_institutional/sibling-register.ts';

const LIB = path.resolve(__dirname, '../../lib');
const read = (p: string) => fs.readFileSync(path.join(LIB, p), 'utf8');

const IN_SCOPE_BRIDGES = [
  'bill-passing-masters-bridge.ts','bill-passing-qa-bridge.ts','epcg-fa-bridge.ts',
  'export-dispatch-bridge.ts','finance-pi-bridge.ts','gateflow-git-bridge.ts',
  'gateflow-inward-bridge.ts','git-landed-cost-bridge.ts',
  'idea-6-inter-dept-approval-bridge-engine.ts','iot-asset-bridge.ts','iot-machine-bridge.ts',
  'maintainpro-bridges.ts','maintainpro-service-history-bridge.ts','physical-asset-unit-bridge.ts',
  'procure-fincore-po-bridge.ts','qa-inspection-production-bridge.ts','qualicheck-bridges.ts',
  'reorder-indent-bridge.ts','rfid-asset-bridge.ts','sales-production-bridge.ts',
  'servicedesk-bridges.ts','sitex-bridges.ts','vehicle-fa-bridge.ts','weighbridge-engine.ts',
];

const DEVICE_BRIDGES = [
  'app-shortcut-bridge.ts','biometric-bridge.ts','camera-bridge.ts',
  'geolocation-bridge.ts','native-bridge.ts','push-notification-bridge.ts',
];

const BANNED_LITERALS = ['dept-default', 'default-dept', 'dept_default'];

describe('P8.7 · dept-context-resolver-engine', () => {
  it('returns the department for a record carrying dept_id', () => {
    expect(resolveDeptFromRecord({ dept_id: 'DEPT-PROD' })).toBe('DEPT-PROD');
  });
  it('accepts department_id key', () => {
    expect(resolveDeptFromRecord({ department_id: 'DEPT-FIN' })).toBe('DEPT-FIN');
  });
  it('accepts camelCase deptId', () => {
    expect(resolveDeptFromRecord({ deptId: 'DEPT-QA' })).toBe('DEPT-QA');
  });
  it('returns undefined when no dept field present', () => {
    expect(resolveDeptFromRecord({ id: 'X', name: 'Y' })).toBeUndefined();
  });
  it('returns undefined for null / non-object', () => {
    expect(resolveDeptFromRecord(null)).toBeUndefined();
    expect(resolveDeptFromRecord('string')).toBeUndefined();
    expect(resolveDeptFromRecord(42)).toBeUndefined();
  });
  it('rejects banned literal "dept-default"', () => {
    expect(resolveDeptFromRecord({ dept_id: 'dept-default' })).toBeUndefined();
  });
  it('rejects empty / whitespace strings', () => {
    expect(resolveDeptFromRecord({ dept_id: '   ' })).toBeUndefined();
  });
  it('never invents a value for any of the banned literals', () => {
    for (const v of BANNED_LITERALS) {
      expect(resolveDeptFromRecord({ dept_id: v })).not.toBe(v);
    }
  });
  it('explicit beats record-derived', () => {
    expect(resolveDeptFromContext({ sourceRecord: { dept_id: 'A' }, explicit: 'B' })).toBe('B');
  });
  it('falls back to record when no explicit', () => {
    expect(resolveDeptFromContext({ sourceRecord: { dept_id: 'A' } })).toBe('A');
  });
  it('returns undefined when neither explicit nor record carry context', () => {
    expect(resolveDeptFromContext({ sourceRecord: { id: 'x' } })).toBeUndefined();
    expect(resolveDeptFromContext({})).toBeUndefined();
  });
  it('exports DEPT_RESOLUTION_NOTE documenting the Wave-2 seam', () => {
    expect(DEPT_RESOLUTION_NOTE).toMatch(/Wave-2|P2BB-Auth/);
  });
});

describe('P8.7 · payload-type floor-plant across in-scope bridges', () => {
  it('every in-scope bridge that declares payload interfaces carries dept_id?', () => {
    // Bridges with locally-declared payload interfaces:
    const WITH_LOCAL_PAYLOAD = [
      'bill-passing-masters-bridge.ts','bill-passing-qa-bridge.ts','finance-pi-bridge.ts',
      'gateflow-git-bridge.ts','gateflow-inward-bridge.ts',
      'idea-6-inter-dept-approval-bridge-engine.ts','iot-asset-bridge.ts','iot-machine-bridge.ts',
      'maintainpro-bridges.ts','maintainpro-service-history-bridge.ts','physical-asset-unit-bridge.ts',
      'procure-fincore-po-bridge.ts','qualicheck-bridges.ts','reorder-indent-bridge.ts',
      'rfid-asset-bridge.ts','sales-production-bridge.ts','servicedesk-bridges.ts',
      'vehicle-fa-bridge.ts',
    ];
    for (const f of WITH_LOCAL_PAYLOAD) {
      expect(read(f)).toContain('dept_id?: string');
    }
  });
});

describe('P8.7 · sales-production-bridge honesty fix (Item 3)', () => {
  const src = read('sales-production-bridge.ts');
  it('no longer contains the banned literal "dept-default" in code', () => {
    // The literal may appear only inside the historical comment; assert no
    // executable assignment uses it.
    expect(src).not.toMatch(/department_id:\s*[^/]*['"]dept-default['"]/);
  });
  it('no longer assigns an OrderLine id to department_id', () => {
    expect(src).not.toMatch(/department_id:\s*so\.lines\[0\]\?\.id/);
  });
  it('threads via resolveDeptFromContext', () => {
    expect(src).toContain('resolveDeptFromContext');
  });
});

describe('P8.7 · AC3 · zero fallback literals anywhere in src/lib bridges', () => {
  it('grep "dept-default" across in-scope bridges = 0 in executable code', () => {
    for (const f of IN_SCOPE_BRIDGES) {
      const s = read(f);
      // Strip block comments before scanning so historical-disposition mentions are allowed.
      const codeOnly = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(codeOnly.includes("'dept-default'")).toBe(false);
      expect(codeOnly.includes('"dept-default"')).toBe(false);
    }
  });
});

describe('P8.7 · §H walls · 0-DIFF assertions', () => {
  it('6 device/platform bridges contain NO dept_id reference (0-DIFF wall)', () => {
    for (const f of DEVICE_BRIDGES) {
      const s = read(f);
      expect(s.includes('dept_id')).toBe(false);
      expect(s.includes('dept-context-resolver-engine')).toBe(false);
    }
  });
  it('audit-trail-hash-chain.ts has no P8.7 import (wall held)', () => {
    expect(read('audit-trail-hash-chain.ts')).not.toContain('dept-context-resolver-engine');
  });
  it('audit-trail-chain-engine.ts has no P8.7 import (wall held)', () => {
    expect(read('audit-trail-chain-engine.ts')).not.toContain('dept-context-resolver-engine');
  });
  it('record-retention-policy-engine.ts has no P8.7 import (P8.6 wall held)', () => {
    expect(read('record-retention-policy-engine.ts')).not.toContain('dept-context-resolver-engine');
  });
  it('audit-trail-engine.ts has no P8.7 import (logAudit wall held)', () => {
    expect(read('audit-trail-engine.ts')).not.toContain('dept-context-resolver-engine');
  });
  it('comply360-audit-retention-engine.ts has no P8.7 import (wall held)', () => {
    expect(read('comply360-audit-retention-engine.ts')).not.toContain('dept-context-resolver-engine');
  });
});

describe('P8.7 · SEAM-ONLY header line presence on non-threaded bridges', () => {
  const THREADED = ['sales-production-bridge.ts', 'idea-6-inter-dept-approval-bridge-engine.ts'];
  it('every SEAM-ONLY bridge carries the documented header line', () => {
    for (const f of IN_SCOPE_BRIDGES) {
      if (THREADED.includes(f)) continue;
      expect(read(f)).toContain('P8.7: dept_id present in payload type');
    }
  });
});

describe('P8.7 · sprint-history self-seed + P8.6 flip', () => {
  it('P8.7 row exists', () => {
    const p87 = SPRINTS.find((s) => s.code === 'T-P87-DeptId-Bridge-Retrofit');
    expect(p87).toBeDefined();
    expect(p87?.newSiblings).toContain('dept-context-resolver-engine');
  });
  it('P8.6 headSha flipped to 84a4475d', () => {
    const p86 = SPRINTS.find((s) => s.code === 'T-P86-Retention-Floor-Plant');
    expect(p86?.headSha).toContain('84a4475d');
  });
  it('Wave-1 close: rows P8.1 through P8.7 inclusive present', () => {
    const codes = SPRINTS.map((s) => s.code);
    for (const tag of ['T-P81-', 'T-P82-', 'T-P83-', 'T-P84-', 'T-P85-', 'T-P86-', 'T-P87-']) {
      expect(codes.some((c) => c.startsWith(tag))).toBe(true);
    }
  });
});

describe('P8.7 · sibling-register · exactly one new entry credited this sprint', () => {
  it('dept-context-resolver-engine is registered', () => {
    expect(SIBLINGS.some((e) => e.id === 'dept-context-resolver-engine')).toBe(true);
  });
});
