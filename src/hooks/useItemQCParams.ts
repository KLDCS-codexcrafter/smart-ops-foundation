import { useState } from 'react';
import { toast } from 'sonner';
import type { ItemQCParam } from '@/types/item-qc-param';

const KEY = 'erp_item_qc_params';
const load = (): ItemQCParam[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function useItemQCParams() {
  const [params, setParams] = useState<ItemQCParam[]>(load());
  // [JWT] Replace with GET /api/inventory/items/:id/qc-params
  const save = (d: ItemQCParam[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/items/:id/qc-params */ };

  const createParam = (p: ItemQCParam) => {
    const u = [p, ...params]; setParams(u); save(u);
    toast.success('QC parameter added');
    // [JWT] Replace with POST /api/inventory/items/:id/qc-params
  };

  const updateParam = (id: string, data: Partial<ItemQCParam>) => {
    const u = params.map(x => x.id === id ? { ...x, ...data, updated_at: new Date().toISOString() } : x);
    setParams(u); save(u);
    // [JWT] Replace with PATCH /api/inventory/items/:id/qc-params/:paramId
  };

  const deleteParam = (id: string) => {
    const u = params.filter(x => x.id !== id); setParams(u); save(u);
    toast.success('QC parameter removed');
    // [JWT] Replace with DELETE /api/inventory/items/:id/qc-params/:paramId
  };

  const getByItemId = (itemId: string) => params.filter(p => p.item_id === itemId);

  return { params, createParam, updateParam, deleteParam, getByItemId };
}
