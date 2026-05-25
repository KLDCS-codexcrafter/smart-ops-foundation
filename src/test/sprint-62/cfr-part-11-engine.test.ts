import { describe, it, expect, beforeEach } from 'vitest';
import {
  appendAuditTrailEntry,
  listAuditTrailEntries,
  getLatestAuditEntry,
  verifyAuditTrailIntegrity,
  listAuditTrailEntriesByTarget,
} from '@/lib/cfr-part-11-engine';
import { cfrPart11AuditKey } from '@/types/cfr-part-11';

const ENT = 'TEST62';
const sig = { username: 'u', password: 'p', reason: 'r', user_id: 'u1', user_name: 'User One' };

describe('cfr-part-11-engine · Sprint 62', () => {
  beforeEach(() => {
    localStorage.removeItem(cfrPart11AuditKey(ENT));
  });

  it('appends entry with null prev hash for genesis', () => {
    const e = appendAuditTrailEntry(ENT, 'batch_release', 'process_batch', 'B1', 'info', 'release', sig);
    expect(e.previous_entry_hash).toBeNull();
    expect(e.entry_hash).toBeTruthy();
  });

  it('chains subsequent entries via previous_entry_hash', () => {
    const e1 = appendAuditTrailEntry(ENT, 'batch_release', 'process_batch', 'B1', 'info', 'd1', sig);
    const e2 = appendAuditTrailEntry(ENT, 'batch_quarantine', 'process_batch', 'B1', 'warning', 'd2', sig);
    expect(e2.previous_entry_hash).toBe(e1.entry_hash);
  });

  it('rejects e-signature without required fields', () => {
    expect(() =>
      appendAuditTrailEntry(ENT, 'other', 'other', 'X', 'info', 'd',
        { username: '', password: '', reason: '', user_id: 'u', user_name: 'u' }),
    ).toThrow();
  });

  it('listAuditTrailEntries returns oldest-first', () => {
    appendAuditTrailEntry(ENT, 'batch_release', 'process_batch', 'B1', 'info', 'd1', sig);
    appendAuditTrailEntry(ENT, 'batch_release', 'process_batch', 'B2', 'info', 'd2', sig);
    const all = listAuditTrailEntries(ENT);
    expect(all.length).toBe(2);
  });

  it('getLatestAuditEntry returns last', () => {
    appendAuditTrailEntry(ENT, 'batch_release', 'process_batch', 'B1', 'info', 'd1', sig);
    const e2 = appendAuditTrailEntry(ENT, 'batch_release', 'process_batch', 'B2', 'info', 'd2', sig);
    expect(getLatestAuditEntry(ENT)?.id).toBe(e2.id);
  });

  it('verifyAuditTrailIntegrity intact when not tampered', () => {
    appendAuditTrailEntry(ENT, 'batch_release', 'process_batch', 'B1', 'info', 'd', sig);
    appendAuditTrailEntry(ENT, 'batch_release', 'process_batch', 'B2', 'info', 'd', sig);
    const r = verifyAuditTrailIntegrity(ENT);
    expect(r.intact_chain).toBe(true);
    expect(r.total_entries_checked).toBe(2);
  });

  it('verifyAuditTrailIntegrity detects broken chain', () => {
    appendAuditTrailEntry(ENT, 'batch_release', 'process_batch', 'B1', 'info', 'd', sig);
    appendAuditTrailEntry(ENT, 'batch_release', 'process_batch', 'B2', 'info', 'd', sig);
    const all = listAuditTrailEntries(ENT);
    all[1].previous_entry_hash = 'TAMPERED';
    localStorage.setItem(cfrPart11AuditKey(ENT), JSON.stringify(all));
    const r = verifyAuditTrailIntegrity(ENT);
    expect(r.intact_chain).toBe(false);
    expect(r.first_broken_entry_index).toBe(1);
  });

  it('listAuditTrailEntriesByTarget filters correctly', () => {
    appendAuditTrailEntry(ENT, 'batch_release', 'process_batch', 'B1', 'info', 'd', sig);
    appendAuditTrailEntry(ENT, 'recipe_create', 'recipe', 'R1', 'info', 'd', sig);
    const batches = listAuditTrailEntriesByTarget(ENT, 'process_batch', 'B1');
    expect(batches.length).toBe(1);
  });
});
