import { useState } from 'react';
import { toast } from 'sonner';
import type { Classification } from '@/types/classification';

const STORAGE_KEY = 'erp_classifications';

export function useClassifications() {
  const load = (): Classification[] => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };
  const [classifications, setClassifications] = useState<Classification[]>(load());
  // [JWT] Replace with GET /api/inventory/classifications

  const save = (data: Classification[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // [JWT] Replace with POST/PUT/DELETE /api/inventory/classifications
  };

  const createClassification = (form: Omit<Classification, 'id' | 'created_at' | 'updated_at'>) => {
    const item: Classification = { ...form, id: `cls-${Date.now()}`,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const updated = [item, ...classifications];
    setClassifications(updated); save(updated);
    toast.success(`${form.name} created`);
    // [JWT] Replace with POST /api/inventory/classifications
  };

  const updateClassification = (id: string, form: Partial<Classification>) => {
    const updated = classifications.map(c => c.id === id
      ? { ...c, ...form, updated_at: new Date().toISOString() } : c);
    setClassifications(updated); save(updated);
    toast.success('Classification updated');
    // [JWT] Replace with PATCH /api/inventory/classifications/:id
  };

  const deleteClassification = (id: string) => {
    const updated = classifications.filter(c => c.id !== id);
    setClassifications(updated); save(updated);
    toast.success('Classification deleted');
    // [JWT] Replace with DELETE /api/inventory/classifications/:id
  };

  return { classifications, createClassification, updateClassification, deleteClassification };
}
