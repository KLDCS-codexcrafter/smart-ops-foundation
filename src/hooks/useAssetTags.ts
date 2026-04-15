import { useState } from 'react';
import { toast } from 'sonner';
import type { AssetTag } from '@/types/asset-tag';

const KEY = 'erp_asset_tags';
// [JWT] GET /api/inventory/asset-tags
const load = (): AssetTag[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function useAssetTags() {
  const [tags, setTags] = useState<AssetTag[]>(load());
  // [JWT] Replace with GET /api/labels/asset-tags
  const save = (d: AssetTag[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/labels/asset-tags */ };

  const createTag = (t: AssetTag) => {
    const u = [t, ...tags]; setTags(u); save(u);
    toast.success('Asset tag created');
    // [JWT] POST /api/labels/asset-tags
  };

  const updateTag = (id: string, data: Partial<AssetTag>) => {
    const u = tags.map(x => x.id === id ? { ...x, ...data, updated_at: new Date().toISOString() } : x);
    setTags(u); save(u);
    // [JWT] PATCH /api/labels/asset-tags/:id
  };

  const deleteTag = (id: string) => {
    const u = tags.filter(x => x.id !== id); setTags(u); save(u);
    toast.success('Asset tag deleted');
    // [JWT] DELETE /api/labels/asset-tags/:id
  };

  const getByItemId = (itemId: string) => tags.filter(t => t.item_id === itemId);

  return { tags, createTag, updateTag, deleteTag, getByItemId };
}
