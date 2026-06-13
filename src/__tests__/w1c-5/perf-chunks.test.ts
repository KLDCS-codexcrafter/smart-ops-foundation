/**
 * W1C-5 Block 6 · Performance / manualChunks guard.
 *
 * Asserts vite.config.ts isolates heavy export libraries (recharts/jspdf/xlsx)
 * into their own chunks so the main bundle stays lean.
 * Route-splitting (already lazy ×296) is intentionally NOT touched.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const VITE = fs.readFileSync(path.resolve(__dirname, '../../../vite.config.ts'), 'utf8');

describe('W1C-5 Block 6 · manualChunks isolation', () => {
  it('vendor-charts chunk includes recharts', () => {
    expect(VITE).toMatch(/'vendor-charts':\s*\['recharts'\]/);
  });

  it('vendor-pdf chunk includes jspdf and jspdf-autotable', () => {
    expect(VITE).toMatch(/'vendor-pdf':\s*\['jspdf',\s*'jspdf-autotable'\]/);
  });

  it('vendor-xlsx chunk includes xlsx', () => {
    expect(VITE).toMatch(/'vendor-xlsx':\s*\['xlsx'\]/);
  });
});
