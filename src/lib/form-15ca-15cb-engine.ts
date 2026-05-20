/**
 * @file        src/lib/form-15ca-15cb-engine.ts
 * @purpose     Form 15CA/15CB workflow · CBDT Part A/B/C/D classifier · simulated e-filing
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 * @decisions   EX-8-Q2=a FULL workflow · sibling extension · ImportPO 0-diff
 */
import type { Form15CASubmission, Form15CAStatus, Form15CAPart } from '@/types/form-15ca-15cb';
import { form15CAKey, FORM_15CA_VALID_TRANSITIONS } from '@/types/form-15ca-15cb';
import { SINHA_FORM_15CAS } from '@/data/sinha-tt-hedge-seed-data';

export function loadForm15CAs(entityCode: string): Form15CASubmission[] {
  try {
    const raw = localStorage.getItem(form15CAKey(entityCode));
    if (!raw) {
      localStorage.setItem(form15CAKey(entityCode), JSON.stringify(SINHA_FORM_15CAS));
      return SINHA_FORM_15CAS;
    }
    return JSON.parse(raw) as Form15CASubmission[];
  } catch { return SINHA_FORM_15CAS; }
}

export function saveForm15CAs(entityCode: string, list: Form15CASubmission[]): void {
  localStorage.setItem(form15CAKey(entityCode), JSON.stringify(list));
}

/** Classify Form 15CA part based on amount + DTAA status · pure */
export function classifyForm15CAPart(
  amountInr: number,
  isDtaaExempt: boolean,
  hasAOCertificate: boolean,
): Form15CAPart {
  const THRESHOLD_INR = 500000;
  if (isDtaaExempt) return 'Part_D';
  if (amountInr <= THRESHOLD_INR) return 'Part_A';
  if (hasAOCertificate) return 'Part_B';
  return 'Part_C';
}

export function transitionForm15CA(entityCode: string, id: string, next: Form15CAStatus): Form15CASubmission {
  const list = loadForm15CAs(entityCode);
  const f = list.find((x) => x.id === id);
  if (!f) throw new Error(`Form 15CA not found: ${id}`);
  if (!FORM_15CA_VALID_TRANSITIONS[f.status].includes(next)) {
    throw new Error(`Invalid 15CA transition: ${f.status} → ${next}`);
  }
  const now = new Date().toISOString();
  const updated: Form15CASubmission = { ...f, status: next, updated_at: now };
  if (next === 'ca_certified') updated.ca_certified_at = now;
  if (next === 'filed_with_efiling') updated.efiling_filed_at = now;
  if (next === 'acknowledged' && !updated.efiling_acknowledgment_no) {
    updated.efiling_acknowledgment_no = `ACK-${new Date().getFullYear()}-IT-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`;
  }
  saveForm15CAs(entityCode, list.map((x) => (x.id === id ? updated : x)));
  return updated;
}

/** Simulate CA digital signature · Phase 2 will be real */
export async function simulateCADigitalSignature(form15CAId: string, caMembershipNo: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 200));
  return `CA-DSC-${caMembershipNo}-${Date.now()}-${form15CAId.slice(-4)}`;
}
