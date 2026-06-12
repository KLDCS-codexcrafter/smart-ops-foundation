/**
 * @sprint M1 · Mobile-ARC Close · DocSendBar-mobile floor mount test
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PAGES = [
  'src/pages/mobile/MobileUniversalReportPage.tsx',
  'src/pages/mobile/customer/MobileCustomerOrdersPage.tsx',
  'src/pages/mobile/transporter/MobileLRQueuePage.tsx',
  'src/pages/mobile/transporter/MobilePODCapturePage.tsx',
  'src/pages/mobile/vendor/MobilePOAckPage.tsx',
  'src/pages/mobile/vendor/MobileVendorInvoiceSubmitPage.tsx',
];

describe('M1 · DocSendBar-mobile floor (structural mounts)', () => {
  for (const rel of PAGES) {
    it(`${rel} imports and renders ReportSendHeader`, () => {
      const src = readFileSync(join(process.cwd(), rel), 'utf8');
      expect(src).toMatch(/from '@\/components\/operix-core\/report-framework\/ReportSendHeader'/);
      expect(src).toMatch(/<ReportSendHeader\b/);
    });
  }

  it('institutional: M1 row exists in sprint-history and W1C-4 is backfilled', () => {
    const sh = readFileSync(join(process.cwd(), 'src/lib/_institutional/sprint-history.ts'), 'utf8');
    expect(sh).toMatch(/T-M1-MobileARC-Close/);
    expect(sh).toMatch(/headSha: 'da3dd3b'/);
    // W1C-4 backfilled (no longer TBD)
    const w1c4Block = sh.match(/T-W1C4-AutoSend-TierL[\s\S]{0,400}/);
    expect(w1c4Block).toBeTruthy();
    expect(w1c4Block![0]).toMatch(/headSha: 'da3dd3b'/);
  });
});
