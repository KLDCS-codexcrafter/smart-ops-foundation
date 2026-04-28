/**
 * useCampaignTemplates.ts — CRUD for multi-channel campaign templates
 * [JWT] /api/salesx/campaign-templates
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { CampaignTemplate, TemplateChannelStep } from '@/types/campaign-template';
import { campaignTemplatesKey } from '@/types/campaign-template';

function ls<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) || '[]') as T[]; }
  catch { return []; }
}

export function useCampaignTemplates(entityCode: string) {
  const key = campaignTemplatesKey(entityCode);
  const [templates, setTemplates] = useState<CampaignTemplate[]>(() => ls<CampaignTemplate>(key));

  const persist = useCallback((next: CampaignTemplate[]) => {
    // [JWT] PUT /api/salesx/campaign-templates
    localStorage.setItem(key, JSON.stringify(next));
    setTemplates(next);
  }, [key]);

  const saveTemplate = useCallback((
    data: Omit<CampaignTemplate, 'id' | 'use_count' | 'created_at' | 'updated_at'> & { id?: string },
  ) => {
    const now = new Date().toISOString();
    const list = ls<CampaignTemplate>(key);
    if (data.id) {
      const idx = list.findIndex(t => t.id === data.id);
      if (idx >= 0) {
        if (list[idx].is_built_in && !data.is_built_in) {
          // user-edited a built-in: convert to custom copy
          list.push({ ...data, id: `ct-${Date.now()}`,
            is_built_in: false, use_count: 0, created_at: now, updated_at: now });
        } else {
          list[idx] = { ...list[idx], ...data, id: data.id, updated_at: now };
        }
      }
    } else {
      list.push({ ...data, id: `ct-${Date.now()}`,
        use_count: 0, created_at: now, updated_at: now });
    }
    persist(list);
    return list;
  }, [key, persist]);

  const deleteTemplate = useCallback((id: string) => {
    const list = ls<CampaignTemplate>(key);
    const t = list.find(x => x.id === id);
    if (t?.is_built_in) {
      toast.error('Built-in templates cannot be deleted'); return;
    }
    persist(list.filter(t => t.id !== id));
  }, [key, persist]);

  const incrementUseCount = useCallback((id: string) => {
    const list = ls<CampaignTemplate>(key).map(t =>
      t.id === id ? { ...t, use_count: t.use_count + 1, updated_at: new Date().toISOString() } : t);
    persist(list);
  }, [key, persist]);

  const addChannelStep = useCallback((
    templateId: string, step: Omit<TemplateChannelStep, 'id'>,
  ) => {
    const list = ls<CampaignTemplate>(key).map(t =>
      t.id === templateId
        ? { ...t, channel_steps: [...t.channel_steps, { ...step, id: `cs-${Date.now()}` }],
            updated_at: new Date().toISOString() }
        : t);
    persist(list);
  }, [key, persist]);

  const removeChannelStep = useCallback((templateId: string, stepId: string) => {
    const list = ls<CampaignTemplate>(key).map(t =>
      t.id === templateId
        ? { ...t, channel_steps: t.channel_steps.filter(s => s.id !== stepId),
            updated_at: new Date().toISOString() }
        : t);
    persist(list);
  }, [key, persist]);

  return {
    templates, saveTemplate, deleteTemplate,
    incrementUseCount, addChannelStep, removeChannelStep,
  };
}
