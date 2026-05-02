/**
 * uth-wiring.test.ts — Sprint T-Phase-1.2.6d-hdr · UTH detail-panel + frame wiring
 *
 * Verifies (smoke-level) that the new UTH plumbing exports the expected
 * surface and that all 15 detail panels import the AuditHistoryButton.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const PANELS = [
  'src/pages/erp/inventory/reports/detail/GRNDetailPanel.tsx',
  'src/pages/erp/inventory/reports/detail/MINDetailPanel.tsx',
  'src/pages/erp/inventory/reports/detail/CEDetailPanel.tsx',
  'src/pages/erp/inventory/reports/detail/CycleCountDetailPanel.tsx',
  'src/pages/erp/inventory/reports/detail/RTVDetailPanel.tsx',
  'src/pages/erp/salesx/reports/detail/QuotationDetailPanel.tsx',
  'src/pages/erp/salesx/reports/detail/SRMDetailPanel.tsx',
  'src/pages/erp/salesx/reports/detail/IMDetailPanel.tsx',
  'src/pages/erp/salesx/reports/detail/SecondarySalesDetailPanel.tsx',
  'src/pages/erp/salesx/reports/detail/SOMDetailPanel.tsx',
  'src/pages/erp/salesx/reports/detail/DOMDetailPanel.tsx',
  'src/pages/erp/projx/reports/detail/ProjectDetailPanel.tsx',
  'src/pages/erp/projx/reports/detail/MilestoneDetailPanel.tsx',
  'src/pages/erp/projx/reports/detail/TimeEntryDetailPanel.tsx',
  'src/pages/erp/dispatch/reports/detail/DeliveryMemoDetailPanel.tsx',
];

const cwd = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(cwd, p), 'utf8');

describe('UTH-1 · NotesAndReferenceCard component exports', () => {
  it('exposes the controlled API expected by forms', async () => {
    const m = await import('@/components/uth/NotesAndReferenceCard');
    expect(typeof m.NotesAndReferenceCard).toBe('function');
  });
});

describe('UTH-2 · AuditHistoryButton component exports', () => {
  it('exposes the button + opens VoucherDiffViewer', async () => {
    const m = await import('@/components/uth/AuditHistoryButton');
    expect(typeof m.AuditHistoryButton).toBe('function');
  });
});

describe('UTH-3 · all 15 detail panels wire the AuditHistoryButton', () => {
  PANELS.forEach(rel => {
    it(`${path.basename(rel)} imports + renders AuditHistoryButton`, () => {
      const src = read(rel);
      expect(src).toMatch(/from '@\/components\/uth\/AuditHistoryButton'/);
      expect(src).toMatch(/<AuditHistoryButton[\s\S]*?entityType=/);
    });
  });
});

describe('UTH-4 · UniversalPrintFrame surfaces UTH metadata', () => {
  it('accepts referenceNo, postedAt, voucherHash, narration props', () => {
    const src = read('src/components/print/UniversalPrintFrame.tsx');
    expect(src).toMatch(/referenceNo\?: string \| null/);
    expect(src).toMatch(/postedAt\?: string \| null/);
    expect(src).toMatch(/voucherHash\?: string \| null/);
    expect(src).toMatch(/narration\?: string \| null/);
  });
});

describe('UTH-5 · stampPost computes a deterministic voucher hash', () => {
  it('produces stable fnv1a hash for identical input', async () => {
    const { computeVoucherHash } = await import('@/lib/voucher-hash');
    const a = computeVoucherHash({ id: '1', total: 100, party: 'X' });
    const b = computeVoucherHash({ party: 'X', total: 100, id: '1' });
    expect(a).toBe(b);
    expect(a).toMatch(/^fnv1a:[0-9a-f]{16}$/);
  });
});

describe('UTH-6 · stampCancel enforces 10-char minimum reason', () => {
  it('throws when reason is too short', async () => {
    const { stampCancel } = await import('@/lib/uth-stamper');
    expect(() => stampCancel({}, 'short')).toThrow();
    expect(() => stampCancel({}, 'this is a valid cancel reason')).not.toThrow();
  });
});
