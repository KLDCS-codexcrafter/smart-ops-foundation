import { useState } from 'react';
import { toast } from 'sonner';
import type { Godown } from '@/types/godown';

const STORAGE_KEY = 'erp_godowns';

export function useGodowns() {
  const load = (): Godown[] => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };
  const [godowns, setGodowns] = useState<Godown[]>(load());
  // [JWT] Replace with GET /api/inventory/godowns

  const save = (data: Godown[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // [JWT] Replace with POST/PUT/DELETE /api/inventory/godowns
  };

  const createGodown = (form: Omit<Godown, 'id' | 'created_at' | 'updated_at'>) => {
    const item: Godown = { ...form, id: `gd-${Date.now()}`,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const updated = [item, ...godowns];
    setGodowns(updated); save(updated);
    toast.success(`${form.name} created`);
    // [JWT] Replace with POST /api/inventory/godowns
  };

  const updateGodown = (id: string, form: Partial<Godown>) => {
    const updated = godowns.map(g => g.id === id
      ? { ...g, ...form, updated_at: new Date().toISOString() } : g);
    setGodowns(updated); save(updated);
    toast.success('Godown updated');
    // [JWT] Replace with PATCH /api/inventory/godowns/:id
  };

  const deleteGodown = (id: string) => {
    const updated = godowns.filter(g => g.id !== id);
    setGodowns(updated); save(updated);
    toast.success('Godown deleted');
    // [JWT] Replace with DELETE /api/inventory/godowns/:id
  };

  return { godowns, createGodown, updateGodown, deleteGodown };
}
