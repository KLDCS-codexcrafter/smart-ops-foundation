/**
 * usePayHeads.ts — CRUD + auto-seed for Pay Head Master
 * [JWT] GET/POST/PUT/DELETE /api/pay-hub/masters/pay-heads
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { PayHead, PayHeadType } from '@/types/pay-hub';
import { PAY_HEADS_KEY, getPayHeadSeeds } from '@/types/pay-hub';

const load = (): PayHead[] => {
  try {
    // [JWT] GET /api/pay-hub/masters/pay-heads
    const raw = localStorage.getItem(PAY_HEADS_KEY);
    if (raw) {
      const stored: PayHead[] = JSON.parse(raw);
      if (stored.length > 0) return stored;
    }
  } catch { /* ignore */ }
  // First load — seed 15 standard pay heads
  const seeds = getPayHeadSeeds();
  // [JWT] POST /api/pay-hub/masters/pay-heads/seed
  localStorage.setItem(PAY_HEADS_KEY, JSON.stringify(seeds));
  return seeds;
};

const genCode = (all: PayHead[]) => 'PH-' + String(all.length + 1).padStart(4, '0');

const save = (items: PayHead[]) => {
  // [JWT] PUT /api/pay-hub/masters/pay-heads
  localStorage.setItem(PAY_HEADS_KEY, JSON.stringify(items));
};

export function usePayHeads() {
  const [payHeads, setPayHeads] = useState<PayHead[]>(load);

  const createPayHead = (form: Omit<PayHead, "id" | "code" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const ph: PayHead = {
      ...form,
      id: `ph-${Date.now()}`,
      code: genCode(payHeads),
      created_at: now, updated_at: now,
    };
    const updated = [...payHeads, ph];
    setPayHeads(updated); save(updated);
    toast.success(`'${ph.name}' created`);
    // [JWT] POST /api/pay-hub/masters/pay-heads
    return ph;
  };

  const updatePayHead = (id: string, patch: Partial<PayHead>) => {
    const updated = payHeads.map(ph =>
      ph.id === id ? { ...ph, ...patch, updated_at: new Date().toISOString() } : ph
    );
    setPayHeads(updated); save(updated);
    toast.success('Pay Head updated');
    // [JWT] PATCH /api/pay-hub/masters/pay-heads/:id
  };

  const toggleStatus = (id: string) => {
    const ph = payHeads.find(x => x.id === id);
    if (!ph) return;
    updatePayHead(id, { status: ph.status === 'active' ? 'inactive' : 'active' });
  };

  const countByType = (type: PayHeadType) => payHeads.filter(p => p.type === type).length;

  return {
    payHeads,
    earningCount: countByType("earning"),
    deductionCount: countByType("deduction"),
    erContribCount: countByType("employer_contribution"),
    reimbCount: countByType("reimbursement"),
    loanCount: countByType("loan"),
    createPayHead, updatePayHead, toggleStatus,
  };
}
