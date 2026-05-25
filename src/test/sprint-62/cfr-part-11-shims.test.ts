import { describe, it, expect, beforeEach } from 'vitest';
import { logBatchActionWithCFRSig } from '@/lib/process-batch-engine';
import { logRecipeActionWithCFRSig } from '@/lib/recipe-formula-engine';
import { logGenealogyExportWithCFRSig } from '@/lib/process-genealogy-engine';
import { cfrPart11AuditKey } from '@/types/cfr-part-11';

const ENT = 'SHIM62';
const sig = { username: 'u', password: 'p', reason: 'r', user_id: 'u1', user_name: 'User' };

describe('Sprint 62 · CFR-11 shims', () => {
  beforeEach(() => localStorage.removeItem(cfrPart11AuditKey(ENT)));

  it('logBatchActionWithCFRSig writes a process_batch entry', () => {
    const e = logBatchActionWithCFRSig(ENT, 'B1', 'batch_release', 'released', sig);
    expect(e.target_entity_type).toBe('process_batch');
    expect(e.severity).toBe('info');
  });

  it('logBatchActionWithCFRSig quarantine is warning', () => {
    const e = logBatchActionWithCFRSig(ENT, 'B1', 'batch_quarantine', 'q', sig);
    expect(e.severity).toBe('warning');
  });

  it('logRecipeActionWithCFRSig writes a recipe entry', () => {
    const e = logRecipeActionWithCFRSig(ENT, 'R1', 'recipe_approve', 'approved', sig);
    expect(e.target_entity_type).toBe('recipe');
  });

  it('logGenealogyExportWithCFRSig writes a genealogy entry', () => {
    const e = logGenealogyExportWithCFRSig(ENT, 'G1', 'export', sig);
    expect(e.target_entity_type).toBe('genealogy');
    expect(e.action_type).toBe('genealogy_export');
  });
});
