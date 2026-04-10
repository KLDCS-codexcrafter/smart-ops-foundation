import { useState } from 'react';
import { toast } from 'sonner';
import type { Brand, SubBrand } from '@/types/brand';

const BRANDS_KEY = 'erp_brands';
const SUB_BRANDS_KEY = 'erp_sub_brands';

export function useBrands() {
  const loadBrands = (): Brand[] => {
    try { return JSON.parse(localStorage.getItem(BRANDS_KEY) || '[]'); }
    catch { return []; }
  };
  const loadSubBrands = (): SubBrand[] => {
    try { return JSON.parse(localStorage.getItem(SUB_BRANDS_KEY) || '[]'); }
    catch { return []; }
  };

  const [brands, setBrands] = useState<Brand[]>(loadBrands());
  // [JWT] Replace with GET /api/inventory/brands
  const [subBrands, setSubBrands] = useState<SubBrand[]>(loadSubBrands());
  // [JWT] Replace with GET /api/inventory/sub-brands

  const saveBrands = (data: Brand[]) => {
    localStorage.setItem(BRANDS_KEY, JSON.stringify(data));
    // [JWT] Replace with POST/PUT/DELETE /api/inventory/brands
  };
  const saveSubBrands = (data: SubBrand[]) => {
    localStorage.setItem(SUB_BRANDS_KEY, JSON.stringify(data));
    // [JWT] Replace with POST/PUT/DELETE /api/inventory/sub-brands
  };

  const createBrand = (form: Omit<Brand, 'id' | 'created_at' | 'updated_at'>) => {
    const item: Brand = { ...form, id: `brand-${Date.now()}`,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const updated = [item, ...brands];
    setBrands(updated); saveBrands(updated);
    toast.success(`${form.name} created`);
    // [JWT] Replace with POST /api/inventory/brands
  };

  const updateBrand = (id: string, form: Partial<Brand>) => {
    const updated = brands.map(b => b.id === id
      ? { ...b, ...form, updated_at: new Date().toISOString() } : b);
    setBrands(updated); saveBrands(updated);
    toast.success('Brand updated');
    // [JWT] Replace with PATCH /api/inventory/brands/:id
  };

  const deleteBrand = (id: string) => {
    const updated = brands.filter(b => b.id !== id);
    setBrands(updated); saveBrands(updated);
    toast.success('Brand deleted');
    // [JWT] Replace with DELETE /api/inventory/brands/:id
  };

  const createSubBrand = (form: Omit<SubBrand, 'id' | 'created_at' | 'updated_at'>) => {
    const item: SubBrand = { ...form, id: `sub-${Date.now()}`,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const updated = [item, ...subBrands];
    setSubBrands(updated); saveSubBrands(updated);
    toast.success(`${form.name} created`);
    // [JWT] Replace with POST /api/inventory/sub-brands
  };

  const updateSubBrand = (id: string, form: Partial<SubBrand>) => {
    const updated = subBrands.map(s => s.id === id
      ? { ...s, ...form, updated_at: new Date().toISOString() } : s);
    setSubBrands(updated); saveSubBrands(updated);
    toast.success('Sub-brand updated');
    // [JWT] Replace with PATCH /api/inventory/sub-brands/:id
  };

  const deleteSubBrand = (id: string) => {
    const updated = subBrands.filter(s => s.id !== id);
    setSubBrands(updated); saveSubBrands(updated);
    toast.success('Sub-brand deleted');
    // [JWT] Replace with DELETE /api/inventory/sub-brands/:id
  };

  return { brands, subBrands, createBrand, updateBrand, deleteBrand, createSubBrand, updateSubBrand, deleteSubBrand };
}
