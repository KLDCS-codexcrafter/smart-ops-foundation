/**
 * useQuotations.ts — Quotation CRUD + revision history
 * [JWT] GET/POST/PUT/DELETE /api/salesx/quotations
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { Quotation, QuotationItem } from '@/types/quotation';
import { quotationsKey } from '@/types/quotation';
import { generateDocNo } from '@/lib/finecore-engine';

function load(entityCode: string): Quotation[] {
  try {
    // [JWT] GET /api/salesx/quotations?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(quotationsKey(entityCode)) || '[]');
  } catch { return []; }
}
function save(entityCode: string, data: Quotation[]) {
  // [JWT] PUT /api/salesx/quotations?entityCode={entityCode}
  localStorage.setItem(quotationsKey(entityCode), JSON.stringify(data));
}
function calcTotals(items: QuotationItem[]) {
  const sub_total = items.reduce((s, i) => s + i.sub_total, 0);
  const tax_amount = items.reduce((s, i) => s + i.tax_amount, 0);
  return { sub_total, tax_amount, total_amount: sub_total + tax_amount };
}

export function useQuotations(entityCode: string) {
  const [quotations, setQuotations] = useState<Quotation[]>(() => load(entityCode));

  const createQuotation = (
    form: Omit<Quotation, 'id' | 'quotation_no' | 'entity_id' | 'created_at' | 'updated_at'>,
  ): Quotation => {
    const all = load(entityCode);
    const now = new Date().toISOString();
    // [JWT] GET/PATCH /api/procurement/sequences/Q/:entityCode
    const quotation_no = generateDocNo('RFQ', entityCode);
    const totals = calcTotals(form.items);
    const q: Quotation = {
      ...form, ...totals,
      id: `q-${Date.now()}`, entity_id: entityCode, quotation_no,
      created_at: now, updated_at: now,
    };
    const updated = [...all, q];
    setQuotations(updated); save(entityCode, updated);
    // [JWT] POST /api/salesx/quotations
    toast.success(`Quotation ${q.quotation_no} created`);
    return q;
  };

  const updateQuotation = (id: string, patch: Partial<Quotation>): void => {
    const all = load(entityCode);
    const recalc = patch.items ? calcTotals(patch.items) : {};
    const updated = all.map(q =>
      q.id === id
        ? { ...q, ...patch, ...recalc, updated_at: new Date().toISOString() }
        : q
    );
    setQuotations(updated); save(entityCode, updated);
    // [JWT] PATCH /api/salesx/quotations/:id
    toast.success('Saved');
  };

  const createRevision = (
    quotationId: string,
    reason: string,
    changedBy: string,
  ): Quotation | null => {
    const all = load(entityCode);
    const existing = all.find(q => q.id === quotationId);
    if (!existing) return null;
    const now = new Date().toISOString();
    const revisionEntry = {
      id: `rev-${Date.now()}`,
      revision_no: existing.quotation_no,
      revision_date: existing.quotation_date,
      reason,
      changed_by: changedBy,
      snapshot_items: [...existing.items],
      total_at_revision: existing.total_amount,
    };
    const updated_q: Quotation = {
      ...existing,
      quotation_type: 'revised',
      revision_number: existing.revision_number + 1,
      last_quotation_no: existing.quotation_no,
      last_quotation_date: existing.quotation_date,
      original_quotation_no:
        existing.original_quotation_no ?? existing.quotation_no,
      revision_history: [...existing.revision_history, revisionEntry],
      updated_at: now,
    };
    const updated = all.map(q => (q.id === quotationId ? updated_q : q));
    setQuotations(updated); save(entityCode, updated);
    // [JWT] PATCH /api/salesx/quotations/:id/revise
    toast.success(`Revision ${updated_q.revision_number} created — history saved`);
    return updated_q;
  };

  return { quotations, createQuotation, updateQuotation, createRevision };
}
