/**
 * Sprint TXUI-5.2 · T-TXUI52-Universal-Floor · behavioral source-assertion suite.
 * House posture: source assertions confirm PageFloorShell adoption + docSend
 * placement only on document_report surfaces · presentation-only · 0-DIFF on logic.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8');

const PAY_HUB_DIR = 'src/pages/erp/pay-hub/transactions';
const ENG_DIR = 'src/pages/erp/engineeringx/transactions';

const ALL_SURFACES = [
  `${PAY_HUB_DIR}/AdminAndMonitoring.tsx`,
  `${PAY_HUB_DIR}/AttendanceEntry.tsx`,
  `${PAY_HUB_DIR}/ContractManpower.tsx`,
  `${PAY_HUB_DIR}/DocumentManagement.tsx`,
  `${PAY_HUB_DIR}/DocumentsAndPolicies.tsx`,
  `${PAY_HUB_DIR}/EmployeeExperience.tsx`,
  `${PAY_HUB_DIR}/EmployeeFinance.tsx`,
  `${PAY_HUB_DIR}/ExitAndFnF.tsx`,
  `${PAY_HUB_DIR}/LearningAndDevelopment.tsx`,
  `${PAY_HUB_DIR}/LeaveRequests.tsx`,
  `${PAY_HUB_DIR}/Onboarding.tsx`,
  `${ENG_DIR}/SimilarityPredictor.tsx`,
];

const DOCUMENT_REPORT_SURFACES = new Set([
  `${PAY_HUB_DIR}/DocumentManagement.tsx`,
  `${PAY_HUB_DIR}/DocumentsAndPolicies.tsx`,
  `${PAY_HUB_DIR}/ExitAndFnF.tsx`,
]);

describe('Sprint TXUI-5.2 · universal floor adoption', () => {
  it('exactly 12 target surfaces enumerated', () => {
    expect(ALL_SURFACES).toHaveLength(12);
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
    expect(shell).not.toMatch(/mock|fabricate|sample\s+data/i);
  });

  it('AC5 · sprint-history records TXUI-5.2 + flips TXUI-5.1 → a9c9d0cc', () => {
    const hist = read('src/lib/_institutional/sprint-history.ts');
    expect(hist).toContain("code: 'T-TXUI52-Universal-Floor'");
    expect(hist).toMatch(/headSha: 'a9c9d0cc',\s+predecessorSha: '12d67bf6'/);
  });

  it('AC5 · sibling-register carries TXUI-5.2 narrative row with empty newSiblings', () => {
    const sib = read('src/lib/_institutional/sibling-register.ts');
    expect(sib).toContain('txui52-universal-floor-adoption');
  });

  it('§H · PageFloorShell.tsx exposes the docSend prop signature 0-DIFF', () => {
    const shell = read('src/components/shared/PageFloorShell.tsx');
    expect(shell).toContain('docSend?: PageFloorShellDocSend');
  });
});
