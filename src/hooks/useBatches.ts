import { useState } from 'react';
import { toast } from 'sonner';
import type { Batch, BatchFormData } from '@/types/batch';

const STORAGE_KEY = 'erp_batches';

function loadBatches(): Batch[] {
  // [JWT] GET /api/inventory/batches
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveBatches(batches: Batch[]): void {
  // [JWT] POST /api/inventory/batches
  localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
}

export function useBatches() {
  const [batches, setBatches] = useState<Batch[]>(loadBatches());
  const [isLoading, setIsLoading] = useState(false);
  // [JWT] Replace with GET /api/inventory/batches

  const createBatch = (data: BatchFormData) => {
    const newBatch: Batch = {
      ...data,
      id: `batch-${Date.now()}`,
      available_quantity: data.quantity,
      total_cost: (data.quantity || 0) * 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [newBatch, ...batches];
    setBatches(updated);
    saveBatches(updated);
    toast.success('Batch created');
    // [JWT] Replace with POST /api/inventory/batches
  };

  const updateBatch = (id: string, data: Partial<BatchFormData>) => {
    const updated = batches.map(b =>
      b.id === id ? { ...b, ...data, updated_at: new Date().toISOString() } : b
    );
    setBatches(updated);
    saveBatches(updated);
    toast.success('Batch updated');
    // [JWT] Replace with PATCH /api/inventory/batches/:id
  };

  const deleteBatch = (id: string) => {
    const updated = batches.filter(b => b.id !== id);
    setBatches(updated);
    saveBatches(updated);
    toast.success('Batch deleted');
    // [JWT] Replace with DELETE /api/inventory/batches/:id
  };

  return { batches, isLoading, createBatch, updateBatch, deleteBatch };
}
