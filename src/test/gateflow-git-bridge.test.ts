/**
 * gateflow-git-bridge.test.ts — Sprint 4-pre-2 · Block F · D-309
 * 1 test verifying sibling resolver bidirectional linking.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createInwardEntry, getGatePass } from '@/lib/gateflow-engine';
import { propagateGatePassToGit, findGitByGatePass } from '@/lib/gateflow-git-bridge';
import { gitStage1Key } from '@/types/git';
import type { GitStage1Record } from '@/types/git';

const ENTITY = 'GFGITBR';

beforeEach(() => {
  localStorage.clear();
});

describe('gateflow-git-bridge', () => {
  it('propagateGatePassToGit links GatePass and GIT bidirectionally', async () => {
    const gp = await createInwardEntry({
      vehicle_no: 'KA-01-AB-1234', vehicle_type: 'truck',
      driver_name: 'D', driver_phone: '9', counterparty_name: 'V', purpose: 'p',
    }, ENTITY, 'u');

    // Seed a GIT record directly (mirrors git-engine storage layout)
    const now = new Date().toISOString();
    const git: GitStage1Record = {
      id: 'git-test-1',
      git_no: 'GIT/X/26-27/0001',
      po_id: 'po-1', po_no: 'PO/X/26-27/0001',
      vendor_id: 'v-1', vendor_name: 'Vendor X',
      entity_id: ENTITY, branch_id: null, godown_id: null,
      receipt_date: now, vehicle_no: 'KA-01-AB-1234',
      driver_name: 'D', invoice_no: null,
      lines: [],
      quality_check_passed: true, quality_notes: '',
      status: 'received_at_gate',
      stage2_grn_id: null, stage2_completed_at: null,
      notes: '', received_by_user_id: 'u',
      created_at: now, updated_at: now,
    };
    localStorage.setItem(gitStage1Key(ENTITY), JSON.stringify([git]));

    const r = await propagateGatePassToGit(gp.id, git.id, ENTITY);
    expect(r.ok).toBe(true);

    // GIT side
    const found = findGitByGatePass(gp.id, ENTITY);
    expect(found?.id).toBe(git.id);
    expect(found?.gate_pass_id).toBe(gp.id);

    // GatePass side
    const updatedGp = getGatePass(gp.id, ENTITY);
    expect(updatedGp?.linked_voucher_type).toBe('git_stage1');
    expect(updatedGp?.linked_voucher_id).toBe(git.id);
  });
});
