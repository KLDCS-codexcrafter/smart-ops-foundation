/**
 * @file        gateflow-git-bridge.ts
 * @sprint      T-Phase-1.2.6f-d-2-card4-4-pre-2 · Block F · D-309 (Q6=A sibling)
 * @purpose     Bidirectional bridge between GateFlow GatePass and GIT Stage 1.
 *              SIBLING DISCIPLINE: git-engine.ts BYTE-IDENTICAL preserved
 *              · matches D-285+D-286+D-287 lesson · 3-d-1 po-rate-resolver precedent.
 *              Direct localStorage writes for GIT (does NOT modify git-engine.ts).
 * @reuses      types/git (read · gitStage1Key) · git-engine.getGitStage1 (read-only)
 *              · gateflow-engine.attachLinkedVoucher · audit-trail-hash-chain
 */

import type { GitStage1Record } from '@/types/git';
import { gitStage1Key } from '@/types/git';
import { getGitStage1 } from '@/lib/git-engine';
import { attachLinkedVoucher, getGatePass } from '@/lib/gateflow-engine';
import { appendAuditEntry } from '@/lib/audit-trail-hash-chain';

export interface PropagationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Propagate GatePass linkage to existing GIT record.
 * Sibling discipline: writes GIT directly to localStorage,
 * GatePass updated via gateflow-engine.attachLinkedVoucher (existing public API).
 */
export async function propagateGatePassToGit(
  gatePassId: string,
  gitId: string,
  entityCode: string,
): Promise<PropagationResult> {
  const gp = getGatePass(gatePassId, entityCode);
  if (!gp) return { ok: false, reason: 'GatePass not found' };

  const git = getGitStage1(gitId, entityCode);
  if (!git) return { ok: false, reason: 'GIT record not found' };

  // Direct write to GIT storage (sibling discipline · git-engine.ts BYTE-IDENTICAL preserved)
  try {
    const raw = localStorage.getItem(gitStage1Key(entityCode));
    if (!raw) return { ok: false, reason: 'GIT storage empty' };
    const list: GitStage1Record[] = JSON.parse(raw);
    const idx = list.findIndex((g) => g.id === gitId);
    if (idx < 0) return { ok: false, reason: 'GIT record not found in storage' };

    list[idx] = { ...list[idx], gate_pass_id: gatePassId };
    localStorage.setItem(gitStage1Key(entityCode), JSON.stringify(list));
  } catch (e) {
    return { ok: false, reason: `Storage error: ${String(e)}` };
  }

  // Update GatePass via gateflow-engine API (no modifications to gateflow-engine)
  await attachLinkedVoucher({
    gate_pass_id: gatePassId,
    linked_voucher_type: 'git_stage1',
    linked_voucher_id: gitId,
    linked_voucher_no: git.git_no,
  }, entityCode);

  await appendAuditEntry({
    entityCode, entityId: entityCode, voucherId: gitId,
    voucherKind: 'vendor_quotation',
    action: 'gateflow_git_bridge_linked',
    actorUserId: 'system',
    payload: {
      gate_pass_id: gatePassId, git_id: gitId,
      git_no: git.git_no, gate_pass_no: gp.gate_pass_no,
    },
  });

  return { ok: true };
}

/** Find GIT record linked to a given GatePass. */
export function findGitByGatePass(
  gatePassId: string,
  entityCode: string,
): GitStage1Record | null {
  try {
    const raw = localStorage.getItem(gitStage1Key(entityCode));
    if (!raw) return null;
    const list: GitStage1Record[] = JSON.parse(raw);
    return list.find((g) => g.gate_pass_id === gatePassId) ?? null;
  } catch { return null; }
}
