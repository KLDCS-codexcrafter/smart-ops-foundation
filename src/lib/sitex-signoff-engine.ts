/**
 * @file        src/lib/sitex-signoff-engine.ts
 * @purpose     Customer Signoff canonical · per-milestone · auto-triggers FinCore invoice prep · kills Leak #10 Trust + #2 Revenue
 * @sprint      T-Phase-1.A.15a SiteX Closeout · Q-LOCK-10a · Block F.1
 * @[JWT]       POST /api/sitex/signoffs · emits sitex:invoice.prep event
 */

export interface CustomerSignoff {
  id: string;
  site_id: string;
  entity_id: string;
  milestone_id: string | null;
  customer_rep_name: string;
  customer_rep_designation: string;
  signature_image_url: string | null;
  signed_at: string;
  commissioning_report_doc_id: string | null;
  notes: string;
}

const signoffsKey = (entityCode: string): string => `erp_sitex_signoffs_${entityCode}`;

function read(entityCode: string): CustomerSignoff[] {
  try {
    const raw = localStorage.getItem(signoffsKey(entityCode));
    return raw ? (JSON.parse(raw) as CustomerSignoff[]) : [];
  } catch { return []; }
}
function write(entityCode: string, data: CustomerSignoff[]): void {
  localStorage.setItem(signoffsKey(entityCode), JSON.stringify(data));
}

export function createSignoff(entityCode: string, signoff: Omit<CustomerSignoff, 'id'>): CustomerSignoff {
  const created: CustomerSignoff = {
    id: `SIGN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...signoff,
  };
  const all = read(entityCode);
  all.push(created);
  write(entityCode, all);
  triggerInvoicePrep(created);
  return created;
}

export function listSignoffs(entityCode: string, siteId?: string): CustomerSignoff[] {
  const all = read(entityCode);
  return siteId ? all.filter((s) => s.site_id === siteId) : all;
}

export function getSignoffById(entityCode: string, id: string): CustomerSignoff | null {
  return read(entityCode).find((s) => s.id === id) ?? null;
}

export function triggerInvoicePrep(signoff: CustomerSignoff): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sitex:invoice.prep', { detail: signoff }));
  }
}
