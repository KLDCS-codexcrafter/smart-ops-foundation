import { useState } from 'react';
import { toast } from 'sonner';
import type { PrintJob } from '@/types/print-job';

const KEY = 'erp_print_jobs';
// [JWT] GET /api/inventory/print-jobs
const load = (): PrintJob[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function usePrintJobs() {
  const [jobs, setJobs] = useState<PrintJob[]>(load());
  // [JWT] Replace with GET /api/labels/print-jobs
  const save = (d: PrintJob[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/labels/print-jobs */ };

  const createJob = (j: PrintJob) => {
    const u = [j, ...jobs]; setJobs(u); save(u);
    toast.success('Print job created');
    // [JWT] POST /api/labels/print-jobs
  };

  const updateJob = (id: string, data: Partial<PrintJob>) => {
    const u = jobs.map(x => x.id === id ? { ...x, ...data, updated_at: new Date().toISOString() } : x);
    setJobs(u); save(u);
    // [JWT] PATCH /api/labels/print-jobs/:id
  };

  const deleteJob = (id: string) => {
    const u = jobs.filter(x => x.id !== id); setJobs(u); save(u);
    toast.success('Print job deleted');
    // [JWT] DELETE /api/labels/print-jobs/:id
  };

  const getByStatus = (status: string) => jobs.filter(j => j.status === status);

  return { jobs, createJob, updateJob, deleteJob, getByStatus };
}
