import { useState } from 'react';
import { toast } from 'sonner';
import type { ItemPacking } from '@/types/item-packing';

const KEY = 'erp_item_packings';
// [JWT] GET /api/inventory/item-packings
const load = (): ItemPacking[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function useItemPackings() {
  const [packings, setPackings] = useState<ItemPacking[]>(load());
  // [JWT] Replace with GET /api/inventory/items/:id/packings
  const save = (d: ItemPacking[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/items/:id/packings */ };

  const createPacking = (p: ItemPacking) => {
    const u = [p, ...packings]; setPackings(u); save(u);
    toast.success('Packing created');
    // [JWT] Replace with POST /api/inventory/items/:id/packings
  };

  const updatePacking = (id: string, data: Partial<ItemPacking>) => {
    const u = packings.map(x => x.id === id ? { ...x, ...data, updated_at: new Date().toISOString() } : x);
    setPackings(u); save(u);
    // [JWT] Replace with PATCH /api/inventory/items/:id/packings/:packingId
  };

  const deletePacking = (id: string) => {
    const u = packings.filter(x => x.id !== id); setPackings(u); save(u);
    toast.success('Packing deleted');
    // [JWT] Replace with DELETE /api/inventory/items/:id/packings/:packingId
  };

  const getByItemId = (itemId: string) => packings.filter(p => p.item_id === itemId);

  return { packings, createPacking, updatePacking, deletePacking, getByItemId };
}
