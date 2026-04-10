import { useState } from 'react';
import { toast } from 'sonner';
import type { InventoryItem } from '@/types/inventory-item';

const KEY = 'erp_inventory_items';
const load = (): InventoryItem[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function useInventoryItems() {
  const [items, setItems] = useState<InventoryItem[]>(load());
  // [JWT] Replace with GET /api/inventory/items
  const save = (d: InventoryItem[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/items */ };

  const createItem = (item: InventoryItem) => {
    const u = [item, ...items]; setItems(u); save(u);
    toast.success(`${item.name} created`);
    // [JWT] Replace with POST /api/inventory/items
  };

  const updateItem = (id: string, data: Partial<InventoryItem>) => {
    const u = items.map(x => x.id === id ? { ...x, ...data, updated_at: new Date().toISOString() } : x);
    setItems(u); save(u);
    // [JWT] Replace with PATCH /api/inventory/items/:id
  };

  const deleteItem = (id: string) => {
    const u = items.filter(x => x.id !== id); setItems(u); save(u);
    toast.success('Item deleted');
    // [JWT] Replace with DELETE /api/inventory/items/:id
  };

  return { items, createItem, updateItem, deleteItem };
}
