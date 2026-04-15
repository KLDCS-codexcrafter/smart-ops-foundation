import { useState } from 'react';
import { toast } from 'sonner';
import type { StockGroup, StockGroupFormData } from '@/types/stock-group';

const STORAGE_KEY = 'erp_stock_groups';

export function useStockGroups() {
  const load = (): StockGroup[] => {
    // [JWT] GET /api/inventory/stock-groups
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };
  const [groups, setGroups] = useState<StockGroup[]>(load());
  // [JWT] Replace with GET /api/inventory/stock-groups

  const save = (data: StockGroup[]) => {
    // [JWT] POST /api/inventory/stock-groups
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const createGroup = (form: StockGroupFormData) => {
    const item: StockGroup = { ...form, id: `sg-${Date.now()}`, status: 'active',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const updated = [item, ...groups];
    setGroups(updated); save(updated);
    toast.success(`${form.name} created`);
    // [JWT] Replace with POST /api/inventory/stock-groups
  };

  const updateGroup = (id: string, form: StockGroupFormData) => {
    const updated = groups.map(g => g.id === id
      ? { ...g, ...form, updated_at: new Date().toISOString() } : g);
    setGroups(updated); save(updated);
    toast.success(`${form.name} updated`);
    // [JWT] Replace with PATCH /api/inventory/stock-groups/:id
  };

  const deleteGroup = (id: string) => {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated); save(updated);
    toast.success('Stock group deleted');
    // [JWT] Replace with DELETE /api/inventory/stock-groups/:id
  };

  return { groups, createGroup, updateGroup, deleteGroup };
}
