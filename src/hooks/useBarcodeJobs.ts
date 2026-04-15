import { useState } from 'react';
import { toast } from 'sonner';
import type { BarcodeJob } from '@/types/barcode-job';

const KEY = 'erp_barcode_jobs';
// [JWT] GET /api/inventory/barcode-jobs
const load = (): BarcodeJob[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function useBarcodeJobs() {
  const [jobs, setJobs] = useState<BarcodeJob[]>(load());
  // [JWT] Replace with GET /api/labels/barcode-jobs
  const save = (d: BarcodeJob[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/labels/barcode-jobs */ };

  const createJob = (j: BarcodeJob) => {
    const u = [j, ...jobs]; setJobs(u); save(u);
    toast.success('Barcode job created');
    // [JWT] POST /api/labels/barcode-jobs
  };

  const updateJob = (id: string, data: Partial<BarcodeJob>) => {
    const u = jobs.map(x => x.id === id ? { ...x, ...data, updated_at: new Date().toISOString() } : x);
    setJobs(u); save(u);
    // [JWT] PATCH /api/labels/barcode-jobs/:id
  };

  const deleteJob = (id: string) => {
    const u = jobs.filter(x => x.id !== id); setJobs(u); save(u);
    toast.success('Barcode job deleted');
    // [JWT] DELETE /api/labels/barcode-jobs/:id
  };

  const getByItemId = (itemId: string) => jobs.filter(j => j.item_id === itemId);

  return { jobs, createJob, updateJob, deleteJob, getByItemId };
}
