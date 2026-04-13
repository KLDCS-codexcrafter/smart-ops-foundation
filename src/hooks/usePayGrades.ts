/**
 * usePayGrades.ts — CRUD for Pay Grade Master
 * [JWT] GET/POST/PUT/DELETE /api/pay-hub/masters/pay-grades
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { PayGrade } from '@/types/pay-hub';
import { PAY_GRADES_KEY } from '@/types/pay-hub';

const load = (): PayGrade[] => {
  try {
    // [JWT] GET /api/pay-hub/masters/pay-grades
    const raw = localStorage.getItem(PAY_GRADES_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
};

const genCode = (level: number) => `PG-L${level}`;

const save = (items: PayGrade[]) => {
  // [JWT] PUT /api/pay-hub/masters/pay-grades
  localStorage.setItem(PAY_GRADES_KEY, JSON.stringify(items));
};

export function usePayGrades() {
  const [grades, setGrades] = useState<PayGrade[]>(load);

  const createGrade = (form: Omit<PayGrade, "id" | "code" | "created_at" | "updated_at">) => {
    const now = new Date().toISOString();
    const g: PayGrade = {
      ...form, id: `pg-${Date.now()}`,
      code: genCode(form.level),
      created_at: now, updated_at: now,
    };
    const updated = [...grades, g];
    setGrades(updated); save(updated);
    toast.success(`Grade '${g.name}' (${g.code}) created`);
    // [JWT] POST /api/pay-hub/masters/pay-grades
    return g;
  };

  const updateGrade = (id: string, patch: Partial<PayGrade>) => {
    const updated = grades.map(g =>
      g.id === id ? { ...g, ...patch, updated_at: new Date().toISOString() } : g
    );
    setGrades(updated); save(updated);
    toast.success('Pay grade updated');
    // [JWT] PATCH /api/pay-hub/masters/pay-grades/:id
  };

  const toggleStatus = (id: string) => {
    const g = grades.find(x => x.id === id);
    if (!g) return;
    updateGrade(id, { status: g.status === 'active' ? 'inactive' : 'active' });
  };

  return { grades, createGrade, updateGrade, toggleStatus };
}
