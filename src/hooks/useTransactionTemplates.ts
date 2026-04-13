/**
 * useTransactionTemplates.ts — CRUD hook for Transaction Templates
 * [JWT] Replace with GET/POST/PUT/DELETE /api/accounting/transaction-templates
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { TransactionTemplate, TransactionTemplateType } from '@/types/transaction-template';
import { TEMPLATES_KEY, getTemplateSeedData } from '@/types/transaction-template';

const loadTemplates = (): TransactionTemplate[] => {
  try {
    // [JWT] GET /api/accounting/transaction-templates
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as TransactionTemplate[];
      if (stored.length > 0) return stored;
    }
  } catch { /* ignore */ }
  // First load — seed the 26 ready templates
  const seeds = getTemplateSeedData();
  // [JWT] POST /api/accounting/transaction-templates/seed
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(seeds));
  return seeds;
};

const genCode = (all: TransactionTemplate[]) =>
  'TNT-' + String(all.length + 1).padStart(4, '0');

const saveTemplates = (items: TransactionTemplate[]) => {
  // [JWT] PUT /api/accounting/transaction-templates
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(items));
};

export function useTransactionTemplates() {
  const [templates, setTemplates] = useState<TransactionTemplate[]>(loadTemplates);

  const createTemplate = (form: Omit<TransactionTemplate,"id"|"code"|"created_at"|"updated_at">) => {
    const now = new Date().toISOString();
    const t: TransactionTemplate = {
      ...form,
      id: `tnt-${Date.now()}`,
      code: genCode(templates),
      created_at: now, updated_at: now,
    };
    // If is_default, remove default from others with same type+dept+voucher
    let updated = templates;
    if (t.is_default) {
      updated = templates.map(x => {
        if (x.type !== t.type) return x;
        const deptOverlap = t.applicable_department_ids.length === 0
          ? x.applicable_department_ids.length === 0
          : t.applicable_department_ids.some(id => x.applicable_department_ids.includes(id));
        return deptOverlap ? { ...x, is_default: false } : x;
      });
    }
    const final = [...updated, t];
    setTemplates(final); saveTemplates(final);
    toast.success(`'${t.name}' created`);
    // [JWT] POST /api/accounting/transaction-templates
    return t;
  };

  const updateTemplate = (id: string, patch: Partial<TransactionTemplate>) => {
    let updated = templates.map(t => t.id === id
      ? { ...t, ...patch, updated_at: new Date().toISOString() }
      : t
    );
    // Re-enforce single default constraint if is_default toggled on
    if (patch.is_default) {
      const changed = updated.find(t => t.id === id)!;
      updated = updated.map(t => {
        if (t.id === id || t.type !== changed.type) return t;
        const deptOverlap = changed.applicable_department_ids.length === 0
          ? t.applicable_department_ids.length === 0
          : changed.applicable_department_ids.some(did => t.applicable_department_ids.includes(did));
        return deptOverlap ? { ...t, is_default: false } : t;
      });
    }
    setTemplates(updated); saveTemplates(updated);
    toast.success('Template updated');
    // [JWT] PATCH /api/accounting/transaction-templates/:id
  };

  const deleteTemplate = (id: string) => {
    const t = templates.find(x => x.id === id);
    const updated = templates.filter(x => x.id !== id);
    setTemplates(updated); saveTemplates(updated);
    toast.success(`'${t?.name ?? 'Template'}' deleted`);
    // [JWT] DELETE /api/accounting/transaction-templates/:id
  };

  const toggleStatus = (id: string) => {
    const t = templates.find(x => x.id === id);
    if (!t) return;
    updateTemplate(id, { status: t.status === 'active' ? 'inactive' : 'active' });
  };

  // Stats by type
  const countByType = (type: TransactionTemplateType) =>
    templates.filter(t => t.type === type).length;

  return {
    templates,
    narrationCount: countByType("narration"),
    termsCount: countByType("terms_conditions"),
    enforcementCount: countByType("payment_enforcement"),
    createTemplate, updateTemplate, deleteTemplate, toggleStatus,
  };
}
