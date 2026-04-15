import { useState } from 'react';
import { toast } from 'sonner';
import type { RFIDTag } from '@/types/rfid-tag';

const KEY = 'erp_rfid_tags';
// [JWT] GET /api/inventory/rfid-tags
const load = (): RFIDTag[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function useRFIDTags() {
  const [tags, setTags] = useState<RFIDTag[]>(load());
  // [JWT] Replace with GET /api/rfid/tags
  const save = (d: RFIDTag[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/rfid/tags */ };

  const createTag = (t: RFIDTag) => {
    const u = [t, ...tags]; setTags(u); save(u);
    toast.success('RFID tag created');
    // [JWT] POST /api/rfid/tags
  };

  const updateTag = (id: string, data: Partial<RFIDTag>) => {
    const u = tags.map(x => x.id === id ? { ...x, ...data, updated_at: new Date().toISOString() } : x);
    setTags(u); save(u);
    // [JWT] PATCH /api/rfid/tags/:id
  };

  const deleteTag = (id: string) => {
    const u = tags.filter(x => x.id !== id); setTags(u); save(u);
    toast.success('RFID tag deleted');
    // [JWT] DELETE /api/rfid/tags/:id
  };

  const getByItem = (itemId: string) => tags.filter(t => t.item_id === itemId);

  return { tags, createTag, updateTag, deleteTag, getByItem };
}
