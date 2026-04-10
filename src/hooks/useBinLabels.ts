import { useState } from 'react';
import { toast } from 'sonner';
import type { BinLabel } from '@/types/bin-label';

const KEY = 'erp_bin_labels';
const load = (): BinLabel[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function useBinLabels() {
  const [labels, setLabels] = useState<BinLabel[]>(load());
  // [JWT] Replace with GET /api/labels/bin-labels
  const save = (d: BinLabel[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/labels/bin-labels */ };

  const createLabel = (l: BinLabel) => {
    const u = [l, ...labels]; setLabels(u); save(u);
    toast.success('Bin label created');
    // [JWT] POST /api/labels/bin-labels
  };

  const updateLabel = (id: string, data: Partial<BinLabel>) => {
    const u = labels.map(x => x.id === id ? { ...x, ...data, updated_at: new Date().toISOString() } : x);
    setLabels(u); save(u);
    // [JWT] PATCH /api/labels/bin-labels/:id
  };

  const deleteLabel = (id: string) => {
    const u = labels.filter(x => x.id !== id); setLabels(u); save(u);
    toast.success('Bin label deleted');
    // [JWT] DELETE /api/labels/bin-labels/:id
  };

  const getByGodown = (godownId: string) => labels.filter(l => l.godown_id === godownId);

  return { labels, createLabel, updateLabel, deleteLabel, getByGodown };
}
