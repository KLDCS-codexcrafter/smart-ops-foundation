/**
 * @file        src/test/sprint-139/z14-writer-idempotency.test.ts
 * @purpose     S139 Block 1b · strengthen Z* writer idempotency:
 *              second writeEvidence call with same stable content (different
 *              timestamp) must NOT rewrite the file (mtime + bytes unchanged).
 * @sprint      Sprint 139 · S139.T1 hotfix · T1-2
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import '@/test/z14-smoke-harness.test';

type WriteFn = (folder: string, file: string, result: unknown) => void;
type StripFn = (v: unknown) => unknown;

const WS = path.resolve(process.cwd(), 'audit_workspace');
const FOLDER = 'Z14_close_evidence/Z14_Block1_Auto_evidence';
const FILE = '__s139_t1_idempotency_probe.json';

function getWriter(): WriteFn {
  const w = (globalThis as unknown as { __z14WriteEvidence?: WriteFn }).__z14WriteEvidence;
  if (!w) throw new Error('writeEvidence not exposed on globalThis');
  return w;
}
function getStripper(): StripFn {
  const s = (globalThis as unknown as { __z14StripVolatile?: StripFn }).__z14StripVolatile;
  if (!s) throw new Error('stripVolatile not exposed on globalThis');
  return s;
}

describe('S139.T1 · Z14 writer idempotency (Block 1b strengthened)', () => {
  beforeAll(() => {
    const target = path.join(WS, FOLDER, FILE);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  });

  it('stripVolatile excludes timestamp + generatedAt + ISO datetime strings', () => {
    const strip = getStripper();
    expect(strip({ a: 1, timestamp: 'x', generatedAt: 'y' })).toEqual({ a: 1 });
    expect(strip('2026-04-15T10:00:00.000Z')).toBe('<ISO>');
    expect(strip([{ timestamp: 't', v: 2 }])).toEqual([{ v: 2 }]);
  });

  it('second write with same stable content but different timestamp leaves mtime + bytes unchanged', async () => {
    const write = getWriter();
    const target = path.join(WS, FOLDER, FILE);

    // First write — seeds the file.
    const t1 = '2026-01-01T00:00:00.000Z';
    write(FOLDER, FILE, {
      id: 'probe', pass: true, totals: { a: 1, b: 2 },
      timestamp: t1, results: [{ id: 'r1', pass: true, timestamp: t1 }],
    });
    expect(fs.existsSync(target)).toBe(true);
    const firstBytes = fs.readFileSync(target);
    const firstMtime = fs.statSync(target).mtimeMs;

    // Wait > FS mtime resolution then re-write with NEW timestamps but
    // identical stable content. Expectation: no rewrite, no mtime change.
    await new Promise((r) => setTimeout(r, 25));
    const t2 = '2026-06-04T12:34:56.000Z';
    write(FOLDER, FILE, {
      id: 'probe', pass: true, totals: { a: 1, b: 2 },
      timestamp: t2, results: [{ id: 'r1', pass: true, timestamp: t2 }],
    });

    const secondBytes = fs.readFileSync(target);
    const secondMtime = fs.statSync(target).mtimeMs;

    expect(secondBytes.equals(firstBytes)).toBe(true);
    expect(secondMtime).toBe(firstMtime);
    // Original timestamp preserved on disk.
    const parsed = JSON.parse(secondBytes.toString('utf8')) as { timestamp: string };
    expect(parsed.timestamp).toBe(t1);
  });

  it('write WITH changed stable content DOES rewrite', async () => {
    const write = getWriter();
    const target = path.join(WS, FOLDER, FILE);
    await new Promise((r) => setTimeout(r, 25));
    write(FOLDER, FILE, {
      id: 'probe', pass: true, totals: { a: 99, b: 2 },
      timestamp: '2026-06-04T13:00:00.000Z',
      results: [{ id: 'r1', pass: true, timestamp: '2026-06-04T13:00:00.000Z' }],
    });
    const parsed = JSON.parse(fs.readFileSync(target, 'utf8')) as { totals: { a: number } };
    expect(parsed.totals.a).toBe(99);
    // cleanup probe
    fs.unlinkSync(target);
  });
});
