import { useState } from 'react';
import { toast } from 'sonner';
import type { ItemVendor } from '@/types/item-vendor';

const KEY = 'erp_item_vendors';
const load = (): ItemVendor[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function useItemVendors() {
  const [vendors, setVendors] = useState<ItemVendor[]>(load());
  // [JWT] Replace with GET /api/inventory/items/:id/vendors
  const save = (d: ItemVendor[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/items/:id/vendors */ };

  const createVendor = (v: ItemVendor) => {
    const u = [v, ...vendors]; setVendors(u); save(u);
    toast.success('Vendor linked');
    // [JWT] Replace with POST /api/inventory/items/:id/vendors
  };

  const updateVendor = (id: string, data: Partial<ItemVendor>) => {
    const u = vendors.map(x => x.id === id ? { ...x, ...data, updated_at: new Date().toISOString() } : x);
    setVendors(u); save(u);
    // [JWT] Replace with PATCH /api/inventory/items/:id/vendors/:vendorId
  };

  const deleteVendor = (id: string) => {
    const u = vendors.filter(x => x.id !== id); setVendors(u); save(u);
    toast.success('Vendor removed');
    // [JWT] Replace with DELETE /api/inventory/items/:id/vendors/:vendorId
  };

  const getByItemId = (itemId: string) => vendors.filter(v => v.item_id === itemId);

  return { vendors, createVendor, updateVendor, deleteVendor, getByItemId };
}
