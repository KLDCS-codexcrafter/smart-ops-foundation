/**
 * usePayHubSalaryStructures.ts — CRUD for Salary Structure
 * [JWT] GET/POST/PUT/DELETE /api/pay-hub/masters/salary-structures
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { SalaryStructure } from '@/types/pay-hub';
import { SALARY_STRUCTURES_KEY } from '@/types/pay-hub';

const load = (): SalaryStructure[] => {
  try {
    // [JWT] GET /api/pay-hub/masters/salary-structures
    const raw = localStorage.getItem(SALARY_STRUCTURES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};

const genCode = (all: SalaryStructure[]) => 'SS-' + String(all.length + 1).padStart(4, '0');

const save = (items: SalaryStructure[]) => {
  // [JWT] PUT /api/pay-hub/masters/salary-structures
  localStorage.setItem(SALARY_STRUCTURES_KEY, JSON.stringify(items));
};

export function usePayHubSalaryStructures() {
  const [structures, setStructures] = useState<SalaryStructure[]>(load);

  const createStructure = (form: Omit<SalaryStructure, "id" | "code" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const ss: SalaryStructure = {
      ...form, id: `ss-${Date.now()}`,
      code: genCode(structures),
      created_at: now, updated_at: now,
    };
    const updated = [...structures, ss];
    setStructures(updated); save(updated);
    toast.success(`'${ss.name}' salary structure created`);
    // [JWT] POST /api/pay-hub/masters/salary-structures
    return ss;
  };

  const updateStructure = (id: string, patch: Partial<SalaryStructure>) => {
    const updated = structures.map(s =>
      s.id === id ? { ...s, ...patch, updated_at: new Date().toISOString() } : s
    );
    setStructures(updated); save(updated);
    toast.success('Salary structure updated');
    // [JWT] PATCH /api/pay-hub/masters/salary-structures/:id
  };

  const toggleStatus = (id: string) => {
    const s = structures.find(x => x.id === id);
    if (!s) return;
    updateStructure(id, { status: s.status === 'active' ? 'inactive' : 'active' });
  };

  return { structures, createStructure, updateStructure, toggleStatus };
}
