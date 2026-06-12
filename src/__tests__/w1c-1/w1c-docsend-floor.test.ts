/**
 * @sprint W1C-1 · structural floor test
 *         TableChartToggle source mounts ReportSendHeader → the 106-page floor
 *         is structural and not per-page asserted.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('W1C-1 · DocSendBar floor (structural)', () => {
  it('TableChartToggle imports and renders ReportSendHeader', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/components/operix-core/report-framework/TableChartToggle.tsx'),
      'utf8',
    );
    expect(src).toMatch(/from '\.\/ReportSendHeader'/);
    expect(src).toMatch(/<ReportSendHeader\b/);
    expect(src).toMatch(/hideSend\?:\s*boolean/);
  });

  it('ReportSendHeader composes the FROZEN DocSendBar (consume, never fork)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/components/operix-core/report-framework/ReportSendHeader.tsx'),
      'utf8',
    );
    expect(src).toMatch(/from '@\/components\/shared\/DocSendBar'/);
    expect(src).toMatch(/<DocSendBar\b/);
    expect(src).toMatch(/describeReport/);
    // Honest PDF: NO printPayload forwarded — DocSendBar's own toast handles it.
    expect(src).not.toMatch(/printPayload\s*=/);
  });
});
