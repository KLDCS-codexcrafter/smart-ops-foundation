/**
 * useCampaigns.ts — CRUD for marketing campaign master
 * [JWT] /api/salesx/campaigns
 */
import { useState, useCallback } from 'react';
import type { Campaign } from '@/types/campaign';
import { campaignsKey } from '@/types/campaign';

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    return JSON.parse(localStorage.getItem(k) || '[]');
  } catch { return []; }
}

export function useCampaigns(entityCode: string) {
  const key = campaignsKey(entityCode);
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => ls<Campaign>(key));

  const persist = useCallback((next: Campaign[]) => {
    // [JWT] POST /api/salesx/campaigns
    localStorage.setItem(key, JSON.stringify(next));
    setCampaigns(next);
  }, [key]);

  const saveCampaign = useCallback((data: Omit<Campaign, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
    const now = new Date().toISOString();
    const list = ls<Campaign>(key);
    if (data.id) {
      const idx = list.findIndex(c => c.id === data.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...data, id: data.id, updated_at: now };
      }
    } else {
      list.push({
        ...data,
        id: `camp-${Date.now()}`,
        created_at: now,
        updated_at: now,
      });
    }
    persist(list);
    return list;
  }, [key, persist]);

  const deleteCampaign = useCallback((id: string) => {
    persist(ls<Campaign>(key).filter(c => c.id !== id));
  }, [key, persist]);

  return { campaigns, saveCampaign, deleteCampaign };
}
