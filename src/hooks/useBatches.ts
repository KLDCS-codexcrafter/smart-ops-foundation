import { useState, useEffect } from 'react';
import type { Batch } from '@/types/batch';

const STORAGE_KEY = 'erp_batches';

const SEED_BATCHES: Batch[] = [
  {
    id: 'b-001', batch_number: 'BATCH-2604-0001', stock_item_id: 'si-001',
    stock_item_name: 'Paracetamol 500mg', manufacturing_date: '2026-01-15',
    expiry_date: '2028-01-15', quantity: 5000, unit: 'Tabs', status: 'active',
    notes: null, created_at: '2026-01-15T10:00:00Z', updated_at: '2026-01-15T10:00:00Z',
    lot_number: 'LOT-A220', supplier_batch_number: 'SUP-9981', qc_hold: false, godown_name: 'Warehouse A',
  },
  {
    id: 'b-002', batch_number: 'BATCH-2604-0002', stock_item_id: 'si-002',
    stock_item_name: 'Amoxicillin 250mg', manufacturing_date: '2025-11-01',
    expiry_date: '2026-05-01', quantity: 2000, unit: 'Caps', status: 'active',
    notes: 'Near expiry', created_at: '2025-11-01T10:00:00Z', updated_at: '2025-11-01T10:00:00Z',
    lot_number: null, supplier_batch_number: null, qc_hold: true, godown_name: 'Cold Store B',
  },
  {
    id: 'b-003', batch_number: 'BATCH-2604-0003', stock_item_id: 'si-003',
    stock_item_name: 'Surgical Gloves M', manufacturing_date: '2026-03-01',
    expiry_date: '2029-03-01', quantity: 10000, unit: 'Pcs', status: 'active',
    notes: null, created_at: '2026-03-01T10:00:00Z', updated_at: '2026-03-01T10:00:00Z',
    lot_number: 'LOT-G100', supplier_batch_number: 'VND-443', qc_hold: false, godown_name: null,
  },
  {
    id: 'b-004', batch_number: 'BATCH-2604-0004', stock_item_id: 'si-004',
    stock_item_name: 'Cetrizine 10mg', manufacturing_date: '2025-06-01',
    expiry_date: '2026-04-20', quantity: 0, unit: 'Tabs', status: 'consumed',
    notes: null, created_at: '2025-06-01T10:00:00Z', updated_at: '2026-04-01T10:00:00Z',
    lot_number: null, supplier_batch_number: null, qc_hold: false, godown_name: 'Warehouse A',
  },
];

export function useBatches() {
  const [batches, setBatches] = useState<Batch[]>(() => {
    // [JWT] Replace with GET /api/inventory/batches
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { /* ignore */ }
    }
    return SEED_BATCHES;
  });

  useEffect(() => {
    // [JWT] Replace with POST/PUT /api/inventory/batches
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  }, [batches]);

  const addBatch = (batch: Batch) => {
    setBatches(prev => [...prev, batch]);
  };

  const updateBatch = (id: string, data: Partial<Batch>) => {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, ...data, updated_at: new Date().toISOString() } : b));
  };

  const deleteBatch = (id: string) => {
    setBatches(prev => prev.filter(b => b.id !== id));
  };

  return { batches, addBatch, updateBatch, deleteBatch };
}
