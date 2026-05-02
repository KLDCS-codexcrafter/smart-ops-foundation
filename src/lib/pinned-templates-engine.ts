/**
 * pinned-templates-engine · Sprint T-Phase-2.7-e · OOB-10
 *
 * Q3-b clone semantics: full template clone including line item values.
 * Q4-d sorting: most-recently-used by default · widget caps at 20 · "View All" unbounded.
 *
 * [JWT] Phase 2: /api/templates/voucher
 */
import {
  type PinnedTemplate,
  type PinnedTemplateLineItem,
  pinnedTemplatesKey,
  PINNED_TEMPLATES_WIDGET_LIMIT,
} from '@/types/pinned-template';

export interface PinTemplateInput {
  entity_id: string;
  template_name: string;
  voucher_type_id: string;
  voucher_type_name: string;
  party_id?: string | null;
  party_name?: string | null;
  party_type?: 'customer' | 'vendor' | 'both' | null;
  line_items: PinnedTemplateLineItem[];
  narration?: string | null;
  reference_no?: string | null;
  pinned_by: string;
}

function readAll(entityCode: string): PinnedTemplate[] {
  if (!entityCode) return [];
  try {
    const raw = localStorage.getItem(pinnedTemplatesKey(entityCode));
    if (!raw) return [];
    return JSON.parse(raw) as PinnedTemplate[];
  } catch {
    return [];
  }
}

function writeAll(entityCode: string, list: PinnedTemplate[]): void {
  try {
    localStorage.setItem(pinnedTemplatesKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota swallowed */
  }
}

function sortByRecency(list: PinnedTemplate[]): PinnedTemplate[] {
  return [...list].sort(
    (a, b) => Date.parse(b.last_used_at) - Date.parse(a.last_used_at),
  );
}

function structuralKey(t: {
  voucher_type_id: string;
  party_id?: string | null;
  line_items: PinnedTemplateLineItem[];
}): string {
  const items = t.line_items
    .map((li) => `${(li.item_id ?? li.item_name).toLowerCase()}|${li.qty}|${li.rate}`)
    .sort()
    .join(';');
  return `${t.voucher_type_id}|${t.party_id ?? ''}|${items}`;
}

/** Load all pinned templates for entity · sorted by last_used_at desc. */
export function loadPinnedTemplates(entityCode: string): PinnedTemplate[] {
  // [JWT] GET /api/templates/voucher?entity={entityCode}
  return sortByRecency(readAll(entityCode));
}

/** Q4-d: top 20 by recency · for dashboard widget. */
export function loadPinnedTemplatesForWidget(entityCode: string): PinnedTemplate[] {
  return loadPinnedTemplates(entityCode).slice(0, PINNED_TEMPLATES_WIDGET_LIMIT);
}

/** Filter for the "View All" page · supports voucher_type filter + name search. */
export function searchPinnedTemplates(
  entityCode: string,
  filters: { voucher_type_id?: string; query?: string },
): PinnedTemplate[] {
  let list = loadPinnedTemplates(entityCode);
  if (filters.voucher_type_id) {
    list = list.filter((t) => t.voucher_type_id === filters.voucher_type_id);
  }
  if (filters.query) {
    const q = filters.query.trim().toLowerCase();
    list = list.filter(
      (t) =>
        t.template_name.toLowerCase().includes(q) ||
        (t.party_name ?? '').toLowerCase().includes(q),
    );
  }
  return list;
}

/** Create a new pin from a voucher form's current state. Soft-dedupe by structural match. */
export function pinTemplate(input: PinTemplateInput): PinnedTemplate {
  const now = new Date().toISOString();
  const all = readAll(input.entity_id);
  const newKey = structuralKey({
    voucher_type_id: input.voucher_type_id,
    party_id: input.party_id ?? null,
    line_items: input.line_items,
  });
  const existing = all.find((t) => structuralKey(t) === newKey);
  if (existing) {
    existing.last_used_at = now;
    existing.updated_at = now;
    writeAll(input.entity_id, all);
    return existing;
  }
  const tpl: PinnedTemplate = {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    entity_id: input.entity_id,
    template_name: input.template_name,
    voucher_type_id: input.voucher_type_id,
    voucher_type_name: input.voucher_type_name,
    party_id: input.party_id ?? null,
    party_name: input.party_name ?? null,
    party_type: input.party_type ?? null,
    line_items: input.line_items.map((li) => ({ ...li })),
    narration: input.narration ?? null,
    reference_no: input.reference_no ?? null,
    use_count: 0,
    last_used_at: now,
    pinned_by: input.pinned_by,
    pinned_at: now,
    updated_at: now,
  };
  all.push(tpl);
  // [JWT] POST /api/templates/voucher
  writeAll(input.entity_id, all);
  return tpl;
}

/** Remove a pin · permanent. */
export function unpinTemplate(entityCode: string, templateId: string): boolean {
  const all = readAll(entityCode);
  const next = all.filter((t) => t.id !== templateId);
  if (next.length === all.length) return false;
  // [JWT] DELETE /api/templates/voucher/{id}
  writeAll(entityCode, next);
  return true;
}

export interface ClonedTemplateState {
  party_id: string | null;
  party_name: string | null;
  voucher_type_id: string;
  line_items: PinnedTemplateLineItem[];
  narration: string | null;
  reference_no: string | null;
}

/** Q3-b: clone a template into form state. Updates use_count + last_used_at. */
export function cloneTemplateToFormState(
  entityCode: string,
  templateId: string,
): ClonedTemplateState | null {
  const all = readAll(entityCode);
  const idx = all.findIndex((t) => t.id === templateId);
  if (idx < 0) return null;
  const tpl = all[idx];
  const now = new Date().toISOString();
  all[idx] = {
    ...tpl,
    use_count: tpl.use_count + 1,
    last_used_at: now,
    updated_at: now,
  };
  writeAll(entityCode, all);
  return {
    party_id: tpl.party_id,
    party_name: tpl.party_name,
    voucher_type_id: tpl.voucher_type_id,
    line_items: tpl.line_items.map((li) => ({ ...li })),
    narration: tpl.narration ?? null,
    reference_no: tpl.reference_no ?? null,
  };
}

/** Update template name. */
export function renameTemplate(
  entityCode: string,
  templateId: string,
  newName: string,
): boolean {
  const all = readAll(entityCode);
  const idx = all.findIndex((t) => t.id === templateId);
  if (idx < 0) return false;
  const trimmed = newName.trim();
  if (!trimmed) return false;
  all[idx] = { ...all[idx], template_name: trimmed, updated_at: new Date().toISOString() };
  writeAll(entityCode, all);
  return true;
}
