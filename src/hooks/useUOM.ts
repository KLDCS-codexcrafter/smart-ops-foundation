import { useState } from 'react';
import { toast } from 'sonner';
import type { UnitOfMeasure } from '@/types/uom';

const STORAGE_KEY = 'erp_uom';

export function useUOM() {
  const load = (): UnitOfMeasure[] => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };
  const [units, setUnits] = useState<UnitOfMeasure[]>(load());
  // [JWT] Replace with GET /api/inventory/uom

  const save = (data: UnitOfMeasure[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // [JWT] Replace with POST/PUT/DELETE /api/inventory/uom
  };

  const createUnit = (form: Omit<UnitOfMeasure, 'id' | 'created_at' | 'updated_at'>) => {
    const item: UnitOfMeasure = { ...form, id: `uom-${Date.now()}`,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const updated = [item, ...units];
    setUnits(updated); save(updated);
    toast.success(`${form.name} created`);
    // [JWT] Replace with POST /api/inventory/uom
  };

  const updateUnit = (id: string, form: Partial<UnitOfMeasure>) => {
    const updated = units.map(u => u.id === id
      ? { ...u, ...form, updated_at: new Date().toISOString() } : u);
    setUnits(updated); save(updated);
    toast.success('Unit updated');
    // [JWT] Replace with PATCH /api/inventory/uom/:id
  };

  const deleteUnit = (id: string) => {
    const target = units.find(u => u.id === id);
    if (target?.is_system) {
      toast.error('System UOMs cannot be deleted');
      return;
    }
    const updated = units.filter(u => u.id !== id);
    setUnits(updated); save(updated);
    toast.success('Unit deleted');
    // [JWT] Replace with DELETE /api/inventory/uom/:id
  };

  return { units, createUnit, updateUnit, deleteUnit };
}
