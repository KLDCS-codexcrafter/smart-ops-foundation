import { useState } from 'react';
import { toast } from 'sonner';
import type { LabelTemplate } from '@/types/label-template';

const KEY = 'erp_label_templates';
// [JWT] GET /api/inventory/label-templates
const load = (): LabelTemplate[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function useLabelTemplates() {
  const [templates, setTemplates] = useState<LabelTemplate[]>(load());
  // [JWT] Replace with GET /api/labels/templates
  const save = (d: LabelTemplate[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/labels/templates */ };

  const createTemplate = (t: LabelTemplate) => {
    const u = [t, ...templates]; setTemplates(u); save(u);
    toast.success(`${t.name} created`);
    // [JWT] POST /api/labels/templates
  };

  const updateTemplate = (id: string, data: Partial<LabelTemplate>) => {
    const u = templates.map(x => x.id === id ? { ...x, ...data, version: (x.version || 1) + 1, updated_at: new Date().toISOString() } : x);
    setTemplates(u); save(u);
    // [JWT] PATCH /api/labels/templates/:id
  };

  const deleteTemplate = (id: string) => {
    const u = templates.filter(x => x.id !== id); setTemplates(u); save(u);
    toast.success('Template deleted');
    // [JWT] DELETE /api/labels/templates/:id
  };

  return { templates, createTemplate, updateTemplate, deleteTemplate };
}
