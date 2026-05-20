/**
 * @file        src/lib/ebrc-edpms-engine.ts
 * @purpose     EBRC + EDPMS reconciliation · v7 Gap #2 honest scope
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 * @decisions   EX-7c-Q2=a 3 distinct types
 */
import type { EBRC, EBRCStatus, EDPMSDeclaration } from '@/types/ebrc-edpms';
import { ebrcKey, edpmsKey, EBRC_VALID_TRANSITIONS } from '@/types/ebrc-edpms';

export function loadEBRCs(entityCode: string): EBRC[] {
  try { const raw = localStorage.getItem(ebrcKey(entityCode)); return raw ? (JSON.parse(raw) as EBRC[]) : []; }
  catch { return []; }
}

export function saveEBRCs(entityCode: string, ebrcs: EBRC[]): void {
  localStorage.setItem(ebrcKey(entityCode), JSON.stringify(ebrcs));
}

export function transitionEBRC(entityCode: string, id: string, newStatus: EBRCStatus): EBRC {
  const ebrcs = loadEBRCs(entityCode);
  const e = ebrcs.find((x) => x.id === id);
  if (!e) throw new Error(`EBRC not found: ${id}`);
  if (!EBRC_VALID_TRANSITIONS[e.status].includes(newStatus)) {
    throw new Error(`Invalid EBRC transition: ${e.status} → ${newStatus}`);
  }
  const updated = { ...e, status: newStatus, updated_at: new Date().toISOString() };
  saveEBRCs(entityCode, ebrcs.map((x) => (x.id === id ? updated : x)));
  return updated;
}

export function getEBRCForRealisation(entityCode: string, realisationId: string): EBRC | null {
  return loadEBRCs(entityCode).find((e) => e.related_realisation_id === realisationId) ?? null;
}

export function markEBRCClaimUsed(entityCode: string, id: string, claimType: 'drawback' | 'rodtep'): EBRC {
  const ebrcs = loadEBRCs(entityCode);
  const e = ebrcs.find((x) => x.id === id);
  if (!e) throw new Error(`EBRC not found: ${id}`);
  const updated: EBRC = {
    ...e,
    drawback_claim_used: claimType === 'drawback' ? true : e.drawback_claim_used,
    rodtep_claim_used: claimType === 'rodtep' ? true : e.rodtep_claim_used,
    updated_at: new Date().toISOString(),
  };
  saveEBRCs(entityCode, ebrcs.map((x) => (x.id === id ? updated : x)));
  return updated;
}

export function loadEDPMS(entityCode: string): EDPMSDeclaration[] {
  try { const raw = localStorage.getItem(edpmsKey(entityCode)); return raw ? (JSON.parse(raw) as EDPMSDeclaration[]) : []; }
  catch { return []; }
}

export function saveEDPMS(entityCode: string, eds: EDPMSDeclaration[]): void {
  localStorage.setItem(edpmsKey(entityCode), JSON.stringify(eds));
}

export function getEDPMSForRealisation(entityCode: string, realisationId: string): EDPMSDeclaration | null {
  return loadEDPMS(entityCode).find((e) => e.related_realisation_id === realisationId) ?? null;
}
