/**
 * TXUI-5.1 · Block Behavioral Tests · universal-floor canon adoption
 *
 * AC2 PRESENTATION-ONLY: each surface contains PageFloorShell JSX marker + canonical import.
 * AC3 12 surfaces adopt.
 * AC4 DocSendBar mounted ONLY on document_report surfaces (4) · withheld on trackers (8).
 * AC5 PageFloorShell is presentation-only (no data fetch/mutation calls inside).
 * AC6 NO new sibling (sibling-register row carries empty newSiblings).
 * AC8 sprint-history TXUI-5.1 row present · TXUI-4 flipped to 12d67bf6.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { PageFloorShell } from '@/components/shared/PageFloorShell';

const read = (p: string) => readFileSync(resolve(__dirname, '../../..', p), 'utf-8');

const SURFACES = [
  { f: 'src/pages/erp/dispatch/transactions/DispatchExceptions.tsx', kind: 'tracker' as const },
  { f: 'src/pages/erp/dispatch/transactions/DisputeQueue.tsx', kind: 'tracker' as const },
  { f: 'src/pages/erp/dispatch/transactions/LRTracker.tsx', kind: 'document' as const },
  { f: 'src/pages/erp/dispatch/transactions/PDFInvoiceUpload.tsx', kind: 'document' as const },
  { f: 'src/pages/erp/dispatch/transactions/TransporterInvoiceInbox.tsx', kind: 'document' as const },
  { f: 'src/pages/erp/dispatch/transactions/InvoiceUploadWizard.tsx', kind: 'document' as const },
  { f: 'src/pages/erp/distributor-hub/transactions/DistributorExcelSync.tsx', kind: 'tracker' as const },
  { f: 'src/pages/erp/distributor-hub/transactions/DistributorRatingHub.tsx', kind: 'tracker' as const },
  { f: 'src/pages/erp/distributor-hub/transactions/SchemeSimulator.tsx', kind: 'tracker' as const },
  { f: 'src/pages/erp/distributor-hub/transactions/StockOutWarnings.tsx', kind: 'tracker' as const },
  { f: 'src/pages/erp/distributor/DistributorVisitCapture.tsx', kind: 'tracker' as const },
  { f: 'src/pages/erp/engineeringx/transactions/BomExtractor.tsx', kind: 'tracker' as const },
];

const DOC_SURFACES = SURFACES.filter(s => s.kind === 'document');
const TRACKER_SURFACES = SURFACES.filter(s => s.kind === 'tracker');

describe('TXUI-5.1 · universal-floor canon adoption (12 surfaces)', () => {
  describe('AC3 · PageFloorShell adopted on every surface', () => {
    for (const s of SURFACES) {
      it(`adopts PageFloorShell: ${s.f.split('/').pop()}`, () => {
        const src = read(s.f);
        expect(src).toContain("from '@/components/shared/PageFloorShell'");
        expect(src).toContain('<PageFloorShell');
        expect(src).toContain('TXUI-5.1 · universal floor adoption · presentation-only · logic 0-DIFF');
      });
    }
  });

  describe('AC4 · DocSendBar mounted ONLY on document_report surfaces', () => {
    for (const s of DOC_SURFACES) {
      it(`document surface mounts docSend: ${s.f.split('/').pop()}`, () => {
        const src = read(s.f);
        expect(src).toMatch(/docSend=\{\{/);
      });
    }
    for (const s of TRACKER_SURFACES) {
      it(`tracker surface does NOT mount docSend: ${s.f.split('/').pop()}`, () => {
        const src = read(s.f);
        expect(src).not.toMatch(/docSend=\{\{/);
      });
    }
  });

  describe('AC5 · PageFloorShell is presentation-only (no data logic)', () => {
    it('PageFloorShell source contains no fetch/mutation/store calls', () => {
      const src = read('src/components/shared/PageFloorShell.tsx');
      expect(src).not.toMatch(/\bfetch\s*\(/);
      expect(src).not.toMatch(/localStorage\./);
      expect(src).not.toMatch(/useState\s*\(/);
      expect(src).not.toMatch(/useEffect\s*\(/);
      expect(src).not.toMatch(/useMutation/);
      expect(src).not.toMatch(/useQuery/);
    });

    it('PageFloorShell is a callable React component', () => {
      expect(typeof PageFloorShell).toBe('function');
    });
  });

  describe('AC6 · NO new sibling (PageFloorShell is a shared component, not a lib engine)', () => {
    it('TXUI-5.1 sprint row carries empty newSiblings', () => {
      const row = SPRINTS.find(s => (s.code as string) === 'T-TXUI51-Universal-Floor');
      expect(row).toBeDefined();
      expect(row?.newSiblings).toEqual([]);
    });
  });

  describe('AC8 · sprint-history flipped TXUI-4 to 12d67bf6', () => {
    it('TXUI-4 row carries headSha 12d67bf6', () => {
      const row = SPRINTS.find(s => (s.code as string) === 'T-TXUI4-Voucher-Canonical');
      expect(row).toBeDefined();
      expect(row?.headSha).toBe('12d67bf6');
    });

    it('TXUI-5.1 row present with predecessor 12d67bf6', () => {
      const row = SPRINTS.find(s => (s.code as string) === 'T-TXUI51-Universal-Floor');
      expect(row).toBeDefined();
      expect(row?.predecessorSha).toBe('12d67bf6');
    });
  });

  describe('§H walls · DocSendBar consumed read-only', () => {
    it('DocSendBar.tsx still declares the floor-canon header banner', () => {
      const src = read('src/components/shared/DocSendBar.tsx');
      expect(src).toContain('FLOOR CANON');
    });
  });
});
