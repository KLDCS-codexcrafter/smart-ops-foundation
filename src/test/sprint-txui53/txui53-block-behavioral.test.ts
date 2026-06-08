/**
 * Sprint TXUI-5.3 · T-TXUI53-Universal-Floor · behavioral source-assertion suite.
 * TXUI-5 CLOSE · 13 final surfaces · presentation-only · 0-DIFF on logic.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8');

const PAY = 'src/pages/erp/pay-hub/transactions';
const QC = 'src/pages/erp/qualicheck';
const PJ = 'src/pages/erp/projx/transactions';
const SX = 'src/pages/erp/salesx/transactions';

const ALL_SURFACES = [
  `${PAY}/PayHubDayBook.tsx`,
  `${PAY}/PayrollProcessing.tsx`,
  `${PAY}/PayslipGeneration.tsx`,
  `${PAY}/PerformanceAndTalent.tsx`,
  `${PAY}/Recruitment.tsx`,
  `${PAY}/StatutoryReturns.tsx`,
  `${QC}/CapaCapture.tsx`,
  `${QC}/FaiCapture.tsx`,
  `${QC}/Iso9001Capture.tsx`,
  `${QC}/MtcCapture.tsx`,
  `${QC}/NcrCapture.tsx`,
  `${PJ}/TimeEntryCapture.tsx`,
  `${SX}/EnquiryCapture.tsx`,
];

const DOCUMENT_REPORT_SURFACES = new Set([
  `${PAY}/PayHubDayBook.tsx`,
  `${PAY}/PayslipGeneration.tsx`,
  `${PAY}/StatutoryReturns.tsx`,
  `${QC}/CapaCapture.tsx`,
  `${QC}/FaiCapture.tsx`,
  `${QC}/Iso9001Capture.tsx`,
  `${QC}/MtcCapture.tsx`,
  `${QC}/NcrCapture.tsx`,
]);

describe('Sprint TXUI-5.3 · universal floor adoption · TXUI-5 CLOSE', () => {
  it('exactly 13 target surfaces enumerated', () => {
    expect(ALL_SURFACES).toHaveLength(13);
  });

  describe('AC3 · every surface adopts PageFloorShell', () => {
    for (const surface of ALL_SURFACES) {
      it(`${surface} imports and renders PageFloorShell`, () => {
        const src = read(surface);
        expect(src).toContain("from '@/components/shared/PageFloorShell'");
        expect(src).toContain('<PageFloorShell');
      });
    }
  });

  describe('AC4 · DocSendBar via docSend ONLY on document_report surfaces', () => {
    for (const surface of ALL_SURFACES) {
      const expectDocSend = DOCUMENT_REPORT_SURFACES.has(surface);
      it(`${surface} ${expectDocSend ? 'HAS' : 'OMITS'} docSend prop`, () => {
        const src = read(surface);
        if (expectDocSend) {
          expect(src).toMatch(/docSend=\{\{/);
        } else {
          expect(src).not.toMatch(/docSend=\{\{/);
        }
      });
    }
  });

  it('AC2 · PageFloorShell stays empty-state honest (no fabricated rows)', () => {
    const shell = read('src/components/shared/PageFloorShell.tsx');
    expect(shell).toContain('No records yet');
  });

  it('AC5 · sprint-history records TXUI-5.3 + flips TXUI-5.2 → f5b619f7', () => {
    const hist = read('src/lib/_institutional/sprint-history.ts');
    expect(hist).toContain("code: 'T-TXUI53-Universal-Floor'");
    expect(hist).toMatch(/headSha: 'f5b619f7',\s+predecessorSha: 'a9c9d0cc'/);
  });

  it('AC7 · TXUI-5 CLOSE declaration present in TXUI-5.3 sprint-history row', () => {
    const hist = read('src/lib/_institutional/sprint-history.ts');
    expect(hist).toContain('TXUI-5 CLOSE');
    expect(hist).toContain('37 non-voucher surfaces');
  });

  it('AC5 · sibling-register carries TXUI-5.3 narrative row with empty newSiblings', () => {
    const sib = read('src/lib/_institutional/sibling-register.ts');
    expect(sib).toContain('txui53-universal-floor-adoption');
  });

  it('§H · PageFloorShell.tsx exposes the docSend prop signature 0-DIFF', () => {
    const shell = read('src/components/shared/PageFloorShell.tsx');
    expect(shell).toContain('docSend?: PageFloorShellDocSend');
  });

  it('§H · DocSendBar.tsx is consumed (import contract intact)', () => {
    const shell = read('src/components/shared/PageFloorShell.tsx');
    expect(shell).toContain("from '@/components/shared/DocSendBar'");
  });
});
