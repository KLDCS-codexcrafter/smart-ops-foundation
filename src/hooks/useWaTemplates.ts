/**
 * useWaTemplates.ts — CRUD for WhatsApp templates + send helper
 * [JWT] /api/salesx/wa-templates
 */
import { useState, useCallback } from 'react';
import type { WaTemplate, WaTemplateContext } from '@/types/wa-template';
import { waTemplatesKey, fillTemplate } from '@/types/wa-template';

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    return JSON.parse(localStorage.getItem(k) || '[]') as T[];
  } catch { return []; }
}

export function useWaTemplates(entityCode: string) {
  const key = waTemplatesKey(entityCode);
  const [templates, setTemplates] = useState<WaTemplate[]>(() => ls<WaTemplate>(key));

  const persist = useCallback((next: WaTemplate[]) => {
    // [JWT] POST /api/salesx/wa-templates
    localStorage.setItem(key, JSON.stringify(next));
    setTemplates(next);
  }, [key]);

  const saveTemplate = useCallback((
    data: Omit<WaTemplate, 'id' | 'use_count' | 'created_at' | 'updated_at'> & { id?: string },
  ) => {
    const now = new Date().toISOString();
    const list = ls<WaTemplate>(key);
    if (data.id) {
      const idx = list.findIndex(t => t.id === data.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...data, id: data.id, updated_at: now };
    } else {
      list.push({
        ...data,
        id: `wat-${Date.now()}`,
        use_count: 0,
        created_at: now, updated_at: now,
      });
    }
    persist(list);
    return list;
  }, [key, persist]);

  const deleteTemplate = useCallback((id: string) => {
    persist(ls<WaTemplate>(key).filter(t => t.id !== id));
  }, [key, persist]);

  const sendTemplate = useCallback((
    templateId: string,
    phoneNumber: string,
    ctx: WaTemplateContext,
  ): boolean => {
    const list = ls<WaTemplate>(key);
    const tpl = list.find(t => t.id === templateId);
    if (!tpl) return false;
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    if (cleaned.length < 10) return false;
    const fullNumber = cleaned.length === 10 ? `91${cleaned}` : cleaned;
    const message = fillTemplate(tpl.body, ctx);
    window.open(`https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`, '_blank');
    const updated = list.map(t =>
      t.id === templateId ? { ...t, use_count: t.use_count + 1, updated_at: new Date().toISOString() } : t,
    );
    persist(updated);
    return true;
  }, [key, persist]);

  return { templates, saveTemplate, deleteTemplate, sendTemplate };
}
