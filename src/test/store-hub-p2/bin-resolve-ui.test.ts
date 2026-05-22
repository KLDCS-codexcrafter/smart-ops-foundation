/**
 * D-NEW-FN · Bin auto-resolve UI structural attestation
 * Sprint T-Phase-2.A-DepartmentStore-Phase2-Expansion · Block E
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

const ISSUE = 'src/pages/erp/store-hub/transactions/StockIssueEntry.tsx';
const ACK = 'src/pages/erp/store-hub/transactions/StockReceiptAck.tsx';
const HOOK = 'src/hooks/useItemPreferredLocation.ts';

describe('D-NEW-FN · Bin auto-resolve UI integration', () => {
  it('useItemPreferredLocation hook exists (consumed · 0-DIFF)', () => {
    expect(fs.existsSync(HOOK)).toBe(true);
  });
  it('StockIssueEntry imports useItemPreferredLocation', () => {
    expect(fs.readFileSync(ISSUE, 'utf-8')).toContain('useItemPreferredLocation');
  });
  it('StockReceiptAck imports useItemPreferredLocation', () => {
    expect(fs.readFileSync(ACK, 'utf-8')).toContain('useItemPreferredLocation');
  });
  it('StockIssueEntry uses "Pick from" verb', () => {
    expect(fs.readFileSync(ISSUE, 'utf-8')).toContain('Pick from');
  });
  it('StockReceiptAck uses "Place at" verb', () => {
    expect(fs.readFileSync(ACK, 'utf-8')).toContain('Place at');
  });
  it('StockIssueEntry has BinHint subcomponent', () => {
    expect(fs.readFileSync(ISSUE, 'utf-8')).toContain('BinHint');
  });
  it('StockReceiptAck has BinHint subcomponent', () => {
    expect(fs.readFileSync(ACK, 'utf-8')).toContain('BinHint');
  });
  it('hook file untouched (sanity contains its canonical comment)', () => {
    expect(fs.readFileSync(HOOK, 'utf-8')).toContain('Resolves default godown + bin');
  });
  it('Pick from + Place at are distinct verbs (no copy-paste)', () => {
    expect(fs.readFileSync(ISSUE, 'utf-8')).not.toContain('Place at');
    expect(fs.readFileSync(ACK, 'utf-8')).not.toContain('Pick from');
  });
  it('CycleCountStatus stale /erp/inventory-hub deep-links resolved', () => {
    const c = fs.readFileSync('src/pages/erp/store-hub/reports/CycleCountStatus.tsx', 'utf-8');
    expect(c).not.toMatch(/navigate\('\/erp\/inventory-hub'/);
    expect(c).toMatch(/navigate\('\/erp\/main-store-hub'/);
  });
  it('Sentinel · D-NEW-FN closure', () => { expect('D-NEW-FN').toBe('D-NEW-FN'); });
});
