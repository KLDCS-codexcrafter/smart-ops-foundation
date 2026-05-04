/**
 * operix-go-gate-guard-card.test.ts — Sprint 4-pre-3 · Block E · D-312
 * Verifies that gate-guard card is registered and marked 'live'.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('OperixGo · gate-guard card registration', () => {
  it('exposes gate-guard product card with phase live and /operix-go/gate-guard route', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/pages/mobile/OperixGoPage.tsx'),
      'utf8',
    );
    expect(src).toMatch(/id:\s*'gate-guard'/);
    expect(src).toMatch(/route:\s*'\/operix-go\/gate-guard'/);
    // first match for gate-guard card phase must be 'live'
    const block = src.split("id: 'gate-guard'")[1] ?? '';
    const phase = block.split('}')[0];
    expect(phase).toMatch(/phase:\s*'live'/);
  });
});
