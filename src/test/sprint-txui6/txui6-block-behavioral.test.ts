/**
 * Sprint TXUI-6 · T-TXUI6-Consumer-Canonical · behavioral source-assertion suite.
 * TXUI ARC CLOSE · 7 customer-hub consumer surfaces · presentation-only · logic 0-DIFF.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const read = (rel: string): string => readFileSync(resolve(ROOT, rel), 'utf8');

const CH = 'src/pages/erp/customer-hub/transactions';

const SURFACES = [
  `${CH}/CustomerCart.tsx`,
  `${CH}/CustomerCatalog.tsx`,
  `${CH}/CustomerOrders.tsx`,
  `${CH}/CustomerRewards.tsx`,
  `${CH}/FamilyWalletHub.tsx`,
  `${CH}/SampleKits.tsx`,
  `${CH}/VoiceComplaintCapture.tsx`,
];

// Per Block-0 share classification: only CustomerOrders produces a shareable
// consumer document (order confirmation receipt). The other 6 are pure
// interaction → no consumerShare slot.
const SHARE_SURFACES = new Set([`${CH}/CustomerOrders.tsx`]);

describe('Sprint TXUI-6 · Consumer floor canon · TXUI ARC CLOSE', () => {
  it('AC3 · exactly 7 target surfaces enumerated', () => {
    expect(SURFACES).toHaveLength(7);
  });

  describe('AC3 · every surface adopts ConsumerAppShell', () => {
    for (const surface of SURFACES) {
      it(`${surface} imports and renders ConsumerAppShell`, () => {
        const src = read(surface);
        expect(src).toContain("from '@/components/shared/ConsumerAppShell'");
        expect(src).toContain('<ConsumerAppShell');
      });
    }
  });

  describe('AC4 · consumerShare ONLY on document surfaces · NO admin DocSendBar', () => {
    for (const surface of SURFACES) {
      const expectShare = SHARE_SURFACES.has(surface);
      it(`${surface} ${expectShare ? 'HAS' : 'OMITS'} consumerShare slot`, () => {
        const src = read(surface);
        if (expectShare) {
          expect(src).toMatch(/consumerShare=\{/);
        } else {
          expect(src).not.toMatch(/consumerShare=\{/);
        }
      });
      it(`${surface} contains NO admin DocSendBar (consumer surfaces never mount the back-office outbox)`, () => {
        const src = read(surface);
        expect(src).not.toContain('DocSendBar');
      });
    }
  });

  it('AC5 · ConsumerAppShell is touch-first presentation-only · honest empty state · no PageFloorShell reuse', () => {
    const shell = read('src/components/shared/ConsumerAppShell.tsx');
    expect(shell).toContain('PRESENTATION-ONLY');
    expect(shell).toContain('Nothing here yet');
    expect(shell).toContain('min-h-[44px]');
    expect(shell).not.toContain("from '@/components/shared/PageFloorShell'");
    expect(shell).not.toContain('DocSendBar');
  });

  it('AC5 · ConsumerAppShell exposes consumerShare slot signature', () => {
    const shell = read('src/components/shared/ConsumerAppShell.tsx');
    expect(shell).toContain('consumerShare?: ReactNode');
  });

  it('§H · PageFloorShell.tsx 0-DIFF — admin floor not reused by consumer surfaces', () => {
    const floor = read('src/components/shared/PageFloorShell.tsx');
    expect(floor).toContain("PageFloorShell.tsx — Sprint TXUI-5.1");
    expect(floor).toContain('docSend?: PageFloorShellDocSend');
    // and no consumer surface imports PageFloorShell
    for (const surface of SURFACES) {
      const src = read(surface);
      expect(src).not.toContain("from '@/components/shared/PageFloorShell'");
    }
  });

  it('§H · DocSendBar.tsx not mounted on any consumer surface (admin outbox stays admin-only)', () => {
    for (const surface of SURFACES) {
      const src = read(surface);
      expect(src).not.toContain('DocSendBar');
    }
  });

  it('AC8 · sprint-history records TXUI-6 + flips TXUI-5.3 → 3a4a4506', () => {
    const hist = read('src/lib/_institutional/sprint-history.ts');
    expect(hist).toContain("code: 'T-TXUI6-Consumer-Canonical'");
    expect(hist).toMatch(/headSha: '3a4a4506',\s+predecessorSha: 'f5b619f7'/);
    expect(hist).toContain('TXUI ARC CLOSE');
  });

  it('AC6 · sibling-register carries TXUI-6 narrative row · ConsumerAppShell as shared COMPONENT · empty newSiblings', () => {
    const sib = read('src/lib/_institutional/sibling-register.ts');
    expect(sib).toContain('txui6-consumer-canonical');
    expect(sib).toContain('shared COMPONENT');
  });

  it('AC8 · TXUI ARC CLOSE declaration present in TXUI-6 sprint-history row', () => {
    const hist = read('src/lib/_institutional/sprint-history.ts');
    expect(hist).toContain('TXUI-1→6');
    expect(hist).toContain('ConsumerAppShell');
  });
});
