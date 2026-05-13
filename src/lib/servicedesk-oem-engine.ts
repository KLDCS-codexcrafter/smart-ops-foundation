/**
 * @file        src/lib/servicedesk-oem-engine.ts
 * @purpose     OEMClaimPacket CRUD + 5-state machine + Procure360 bridge emit
 * @sprint      T-Phase-1.C.1d · Block B.1
 * @decisions   D-NEW-DJ FR-75 5th consumer (Procure360 OEM Claim Recovery stub)
 * @iso         Functional Suitability + Reliability + Maintainability
 * @disciplines FR-30 · FR-39 audit · FR-50 entity-scoped
 * @reuses      OEMClaimPacket from @/types/oem-claim · emit from servicedesk-bridges
 * @[JWT]       Phase 2 wires real backend
 */
import type { OEMClaimPacket, OEMClaimStatus } from '@/types/oem-claim';
import { oemClaimKey } from '@/types/oem-claim';
import type { AuditEntry } from '@/types/servicedesk';
import { emitOEMClaimPacketToProcure360 } from '@/lib/servicedesk-bridges';

const DEFAULT_ENTITY = 'OPRX';
const nowIso = (): string => new Date().toISOString();
const newId = (p: string): string => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const readJson = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
};

const writeJson = <T>(key: string, list: T[]): void => {
  try { localStorage.setItem(key, JSON.stringify(list)); } catch { /* quota silent */ }
};

const appendAudit = (trail: AuditEntry[], by: string, action: string, reason?: string): AuditEntry[] =>
  [...trail, { at: nowIso(), by, action, reason }];

function nextClaimNo(entity_id: string): string {
  const list = readJson<OEMClaimPacket>(oemClaimKey(entity_id));
  return `OEM/${entity_id}/${String(list.length + 1).padStart(6, '0')}`;
}

export function createOEMClaim(
  input: Omit<OEMClaimPacket,
    | 'id' | 'claim_no' | 'created_at' | 'updated_at' | 'audit_trail'
    | 'status' | 'oem_claim_no' | 'submitted_at' | 'approved_at' | 'paid_at'
    | 'paid_amount_paise' | 'rejection_reason'>,
): OEMClaimPacket {
  const now = nowIso();
  const claim: OEMClaimPacket = {
    ...input,
    id: newId('oem'),
    claim_no: nextClaimNo(input.entity_id),
    status: 'pending',
    oem_claim_no: '',
    submitted_at: null,
    approved_at: null,
    paid_at: null,
    paid_amount_paise: 0,
    rejection_reason: '',
    created_at: now,
    updated_at: now,
    audit_trail: [{ at: now, by: input.created_by, action: 'oem_claim_created' }],
  };
  const list = readJson<OEMClaimPacket>(oemClaimKey(input.entity_id));
  // [JWT] POST /api/servicedesk/oem-claims
  writeJson(oemClaimKey(input.entity_id), [...list, claim]);
  return claim;
}

function transitionOEMClaim(
  id: string,
  to_status: OEMClaimStatus,
  actor: string,
  patch: Partial<OEMClaimPacket>,
  reason: string | undefined,
  entity_id: string,
): OEMClaimPacket {
  const list = readJson<OEMClaimPacket>(oemClaimKey(entity_id));
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error(`OEMClaim ${id} not found`);
  const next: OEMClaimPacket = {
    ...list[idx],
    ...patch,
    status: to_status,
    updated_at: nowIso(),
    audit_trail: appendAudit(list[idx].audit_trail, actor, `transition_to_${to_status}`, reason),
  };
  list[idx] = next;
  writeJson(oemClaimKey(entity_id), list);
  return next;
}

/** Submit OEM claim → fires emit to Procure360 (D-NEW-DJ 5th consumer wire ⭐) */
export function submitOEMClaimToProcure360(
  id: string,
  actor: string,
  oem_claim_no: string,
  entity_id: string = DEFAULT_ENTITY,
): OEMClaimPacket {
  const claim = transitionOEMClaim(
    id, 'submitted', actor,
    { submitted_at: nowIso(), oem_claim_no },
    undefined,
    entity_id,
  );
  emitOEMClaimPacketToProcure360({
    oem_claim_packet_id: claim.id,
    claim_no: claim.claim_no,
    oem_claim_no,
    entity_id: claim.entity_id,
    branch_id: claim.branch_id,
    ticket_id: claim.ticket_id,
    oem_name: claim.oem_name,
    total_claim_value_paise: claim.total_claim_value_paise,
  });
  return claim;
}

export function markOEMClaimApproved(
  id: string, actor: string, approved_amount_paise: number, entity_id: string = DEFAULT_ENTITY,
): OEMClaimPacket {
  return transitionOEMClaim(id, 'approved', actor,
    { approved_at: nowIso(), paid_amount_paise: approved_amount_paise }, undefined, entity_id);
}

export function markOEMClaimPaid(
  id: string, actor: string, paid_amount_paise: number, entity_id: string = DEFAULT_ENTITY,
): OEMClaimPacket {
  return transitionOEMClaim(id, 'paid', actor,
    { paid_at: nowIso(), paid_amount_paise }, undefined, entity_id);
}

export function markOEMClaimRejected(
  id: string, actor: string, reason: string, entity_id: string = DEFAULT_ENTITY,
): OEMClaimPacket {
  return transitionOEMClaim(id, 'rejected', actor, { rejection_reason: reason }, reason, entity_id);
}

export function getOEMClaim(id: string, entity_id: string = DEFAULT_ENTITY): OEMClaimPacket | null {
  return readJson<OEMClaimPacket>(oemClaimKey(entity_id)).find((c) => c.id === id) ?? null;
}

export function listOEMClaims(filters?: {
  entity_id?: string;
  status?: OEMClaimStatus;
  oem_name?: string;
  ticket_id?: string;
}): OEMClaimPacket[] {
  const entity = filters?.entity_id ?? DEFAULT_ENTITY;
  return readJson<OEMClaimPacket>(oemClaimKey(entity)).filter((c) => {
    if (filters?.status && c.status !== filters.status) return false;
    if (filters?.oem_name && c.oem_name !== filters.oem_name) return false;
    if (filters?.ticket_id && c.ticket_id !== filters.ticket_id) return false;
    return true;
  });
}
